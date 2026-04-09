import copy
import re
from typing import Any, Dict, List, Optional, Set


class SceneGraphUpdater:
    """根据步骤描述生成题图增量状态，保持对象引用稳定。"""

    def build_step_scene(
        self,
        base_scene_graph: Dict[str, Any],
        step: Any,
        step_index: int,
    ) -> Dict[str, Any]:
        """根据步骤描述生成题图增量状态，保持对象引用稳定。"""
        current_scene = copy.deepcopy(base_scene_graph or {})
        focus_entities = self._extract_focus_entities(current_scene, step)
        operations = self._infer_operations(step, focus_entities)
        current_scene = self._apply_operations(current_scene, operations, focus_entities, step_index)

        return {
            "step_id": step.id,
            "step_index": step_index,
            "title": step.title,
            "focus_entities": focus_entities,
            "operations": operations,
            "scene": current_scene,
        }

    def _apply_operations(
        self,
        scene_graph: Dict[str, Any],
        operations: List[Dict[str, Any]],
        focus_entities: List[str],
        step_index: int,
    ) -> Dict[str, Any]:
        """执行轻量几何更新：在 transform/fold 场景下更新点坐标，形成真实 step scene。"""
        scene = copy.deepcopy(scene_graph or {})
        points = scene.get("points") or {}
        lines = scene.get("lines") or []
        primitives = scene.get("primitives") or []

        def _point_item(pid: str) -> Optional[Dict[str, Any]]:
            if isinstance(points, dict):
                item = points.get(pid)
                return item if isinstance(item, dict) else None
            if isinstance(points, list):
                for item in points:
                    if not isinstance(item, dict):
                        continue
                    if str(item.get("id", "")).strip() == pid:
                        return item
            return None

        def _get_pos(pid: str) -> Optional[List[float]]:
            item = _point_item(pid)
            if item is None:
                return None
            pos = item.get("coord")
            if not isinstance(pos, list) or len(pos) != 2:
                pos = item.get("pos")
            if not isinstance(pos, list) or len(pos) != 2:
                return None
            try:
                return [float(pos[0]), float(pos[1])]
            except (TypeError, ValueError):
                return None

        def _set_pos(pid: str, pos: List[float]) -> None:
            x = float(pos[0])
            y = float(pos[1])
            item = _point_item(pid)
            if item is None:
                if isinstance(points, dict):
                    points[pid] = {"pos": [x, y]}
                elif isinstance(points, list):
                    points.append({"id": pid, "coord": [x, y]})
                return
            if "coord" in item or isinstance(points, list):
                item["coord"] = [x, y]
            else:
                item["pos"] = [x, y]

        def _line_points(line_id: str) -> Optional[List[str]]:
            for item in lines:
                if not isinstance(item, dict):
                    continue
                if str(item.get("id", "")) != line_id:
                    continue
                refs = item.get("points")
                if isinstance(refs, list) and len(refs) >= 2:
                    return [str(refs[0]), str(refs[1])]
            for primitive in primitives:
                if not isinstance(primitive, dict):
                    continue
                if str(primitive.get("type", "")).strip().lower() != "segment":
                    continue
                if str(primitive.get("id", "")).strip() != line_id:
                    continue
                refs = primitive.get("points")
                if isinstance(refs, list) and len(refs) >= 2:
                    return [str(refs[0]), str(refs[1])]
            return None

        def _reflect_point(point: List[float], axis_a: List[float], axis_b: List[float]) -> List[float]:
            ax, ay = axis_a
            bx, by = axis_b
            px, py = point
            vx, vy = bx - ax, by - ay
            denom = vx * vx + vy * vy
            if denom <= 1e-10:
                return point
            # 先投影到轴线，再做镜像。
            t = ((px - ax) * vx + (py - ay) * vy) / denom
            proj_x = ax + t * vx
            proj_y = ay + t * vy
            return [2 * proj_x - px, 2 * proj_y - py]

        has_transform = any(str(op.get("type", "")) == "transform" for op in operations)
        if not has_transform:
            return scene

        # 折叠轴优先级：步骤显式提到的线段 -> AD -> AB -> 第一条可用线段
        axis_pairs: List[List[str]] = []
        line_ids = {
            str(item.get("id", ""))
            for item in lines
            if isinstance(item, dict) and item.get("id")
        }
        line_ids.update(
            str(item.get("id", ""))
            for item in primitives
            if isinstance(item, dict)
            and item.get("id")
            and str(item.get("type", "")).strip().lower() == "segment"
        )
        for entity_id in focus_entities:
            if entity_id in line_ids:
                refs = _line_points(entity_id)
                if refs:
                    axis_pairs.append(refs)
        if _line_points("AD"):
            axis_pairs.append(_line_points("AD"))
        if _line_points("AB"):
            axis_pairs.append(_line_points("AB"))
        for item in lines:
            if not isinstance(item, dict):
                continue
            refs = item.get("points")
            if isinstance(refs, list) and len(refs) >= 2:
                axis_pairs.append([str(refs[0]), str(refs[1])])

        axis = None
        for pair in axis_pairs:
            if not pair:
                continue
            a = _get_pos(pair[0])
            b = _get_pos(pair[1])
            if a is not None and b is not None:
                axis = (a, b)
                break

        if axis is None:
            return scene

        axis_a, axis_b = axis

        derived_points: List[Dict[str, Any]] = []
        if isinstance(points, list):
            derived_points = [
                item for item in points
                if isinstance(item, dict) and isinstance(item.get("derived"), dict)
            ]

        # 对 derived reflect_point 做折叠更新。
        # 为避免一步跳变过大，前几步采用插值推进。
        alpha = 0.55 if step_index <= 2 else 1.0
        for item in derived_points:
            entity_id = str(item.get("id", "")).strip()
            derived = item.get("derived") or {}
            if str(derived.get("type", "")).strip().lower() != "reflect_point":
                continue
            base_id = str(derived.get("source", "")).strip()
            src = _get_pos(base_id)
            dst = _get_pos(entity_id)
            if src is None or dst is None:
                continue
            target_axis = [str(x) for x in (derived.get("axis") or [])]
            if len(target_axis) == 2:
                local_a = _get_pos(target_axis[0]) or axis_a
                local_b = _get_pos(target_axis[1]) or axis_b
            else:
                local_a, local_b = axis_a, axis_b
            reflected = _reflect_point(src, local_a, local_b)
            nx = dst[0] + (reflected[0] - dst[0]) * alpha
            ny = dst[1] + (reflected[1] - dst[1]) * alpha
            _set_pos(entity_id, [nx, ny])

        return scene

    def _extract_focus_entities(self, scene_graph: Dict[str, Any], step: Any) -> List[str]:
        """从步骤文本和视觉提示中提取可能的关注实体 ID，保持与题图对象引用一致。"""
        entity_ids = self._collect_entity_ids(scene_graph)
        text = "\n".join([step.title, step.narration, " ".join(step.visual_cues)])
        matched: List[str] = []
        upper_text = text.upper()

        for entity_id in entity_ids:
            aliases = self._entity_aliases(entity_id, scene_graph)
            for alias in aliases:
                pattern = rf"(?<![A-Z0-9_']){re.escape(alias.upper())}(?![A-Z0-9_'])"
                if re.search(pattern, upper_text):
                    matched.append(entity_id)
                    break

        if not matched:
            for cue in step.visual_cues:
                cue_upper = cue.upper()
                for entity_id in entity_ids:
                    aliases = self._entity_aliases(entity_id, scene_graph)
                    if any(alias.upper() in cue_upper for alias in aliases) and entity_id not in matched:
                        matched.append(entity_id)

        return matched

    def _infer_operations(self, step: Any, focus_entities: List[str]) -> List[Dict[str, Any]]:
        """根据步骤文本和视觉提示，推断可能的动画操作类型，保持与题图对象引用一致。"""
        cue_text = "\n".join([step.title, step.narration, " ".join(step.visual_cues)])
        visual_cue_text = " ".join(step.visual_cues or [])
        operations: List[Dict[str, Any]] = []

        if focus_entities:
            operations.append({
                "type": "reuse_entities",
                "targets": focus_entities,
                "reason": "保持题图对象复用，避免整图重画",
            })

        if any(keyword in cue_text for keyword in ["高亮", "强调", "突出"]):
            operations.append({
                "type": "highlight",
                "targets": focus_entities,
            })

        # 仅当视觉提示里明确要求标注时才加 label，避免自动出现 AB/BD/BC 噪音标签。
        if any(keyword in visual_cue_text for keyword in ["标注", "标记"]):
            operations.append({
                "type": "label",
                "targets": focus_entities,
            })

        if any(keyword in cue_text for keyword in ["折叠", "旋转", "翻折"]):
            operations.append({
                "type": "transform",
                "targets": focus_entities,
                "mode": "fold",
            })

        if not operations:
            operations.append({
                "type": "maintain",
                "targets": focus_entities,
                "reason": "保持当前题图状态，仅做轻量动画",
            })

        return operations

    def _collect_entity_ids(self, scene_graph: Dict[str, Any]) -> List[str]:
        """从题图数据中收集所有实体 ID，保持与题图对象引用一致。"""
        entity_ids: Set[str] = set()
        points = scene_graph.get("points") or {}
        if isinstance(points, dict):
            entity_ids.update(points.keys())
        elif isinstance(points, list):
            entity_ids.update(
                str(item.get("id"))
                for item in points
                if isinstance(item, dict) and item.get("id")
            )

        entity_ids.update(item.get("id") for item in scene_graph.get("lines", []) if item.get("id"))
        entity_ids.update(item.get("id") for item in scene_graph.get("objects", []) if item.get("id"))
        entity_ids.update(item.get("id") for item in scene_graph.get("angles", []) if item.get("id"))
        entity_ids.update(
            item.get("id")
            for item in scene_graph.get("primitives", [])
            if isinstance(item, dict) and item.get("id")
        )
        return sorted(entity_ids)

    def _entity_aliases(self, entity_id: str, scene_graph: Dict[str, Any]) -> List[str]:
        aliases = [entity_id]

        point_match = re.fullmatch(r"([A-Za-z]+)1", entity_id)
        if point_match:
            base = point_match.group(1)
            aliases.extend([base + "'", base + "′"])

        primitive_points = None
        for primitive in scene_graph.get("primitives", []):
            if not isinstance(primitive, dict):
                continue
            if str(primitive.get("id", "")).strip() != entity_id:
                continue
            primitive_points = [str(x) for x in (primitive.get("points") or [])]
            break

        if entity_id.startswith("seg_"):
            raw = entity_id[4:]
            aliases.append(raw)
            aliases.extend([raw.replace("1", "'"), raw.replace("1", "′")])
        elif primitive_points and len(primitive_points) == 2:
            raw = "".join(primitive_points)
            aliases.append(raw)
            aliases.extend([raw.replace("1", "'"), raw.replace("1", "′")])
        elif primitive_points and len(primitive_points) >= 3:
            raw = "".join(primitive_points)
            aliases.append(raw)
            aliases.extend([raw.replace("1", "'"), raw.replace("1", "′")])

        deduped: List[str] = []
        seen = set()
        for alias in aliases:
            normalized = str(alias).strip()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            deduped.append(normalized)
        return deduped
