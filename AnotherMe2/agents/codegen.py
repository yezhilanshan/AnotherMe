"""
模板化 Manim 代码生成器。
根据 coordinate_scene + step_contexts 生成稳定、可修复的动画代码。
"""

import re
from typing import Any, Dict, List, Optional, Tuple


class TemplateCodeGenerator:
    """使用 CoordinateScene + StepContexts 生成 Manim 代码。"""

    def __init__(self, canvas_config: Dict[str, Any]):
        self.canvas_config = canvas_config
        self.prefer_mathtex = bool(canvas_config.get("prefer_mathtex", False))
        self.formula_math_font_size = int(canvas_config.get("formula_math_font_size", 28))
        self.formula_text_font_size = int(canvas_config.get("formula_text_font_size", 28))

    def generate(
        self,
        project: Any,
        coordinate_scene_data: Dict[str, Any],
        step_contexts: List[Dict[str, Any]],
    ) -> str:
        class_name = self._build_class_name(project)
        initial_scene = self._resolve_initial_scene(
            coordinate_scene_data=coordinate_scene_data,
            step_contexts=step_contexts,
        )

        point_lookup = self._scene_points(initial_scene)
        point_payload_lookup = self._point_payload_lookup(initial_scene)
        primitives = initial_scene.get("primitives", []) if isinstance(initial_scene, dict) else []
        if not point_lookup:
            raise ValueError("template codegen requires a drawable scene with concrete points")
        if not any(str(item.get("type", "")).strip().lower() == "segment" for item in primitives):
            raise ValueError("template codegen requires at least one drawable segment")
        self._validate_drawable_scene_semantics(initial_scene, point_lookup)
        display = initial_scene.get("display", {}) if isinstance(initial_scene, dict) else {}
        point_display = display.get("points", {}) if isinstance(display, dict) else {}
        primitive_display = display.get("primitives", {}) if isinstance(display, dict) else {}
        frame_height = float(self.canvas_config.get("frame_height", 8.0))
        frame_width = float(self.canvas_config.get("frame_width", 14.222))
        pixel_height = int(self.canvas_config.get("pixel_height", 1080))
        pixel_width = int(self.canvas_config.get("pixel_width", 1920))
        safe_margin = float(self.canvas_config.get("safe_margin", 0.4))
        left_panel_x_max = float(self.canvas_config.get("left_panel_x_max", 1.0))
        geometry_bbox = self._coordinate_bbox(point_lookup)
        screen_points = self._screen_point_map(
            point_lookup,
            geometry_bbox,
            frame_width,
            frame_height,
            left_panel_x_max,
            safe_margin,
        )

        step_by_id = {int(s.id): s for s in getattr(project, "script_steps", [])}
        point_ids = list(point_lookup.keys())
        hidden_derived_point_ids = {
            point_id
            for point_id, payload in point_payload_lookup.items()
            if isinstance(payload.get("derived"), dict)
        }

        code: List[str] = []
        code.append("from manim import *")
        code.append("import math")
        code.append("import os")
        code.append("import numpy as np")
        code.append("")
        code.append(f"config.frame_height = {frame_height}")
        code.append(f"config.frame_width = {frame_width}")
        code.append(f"config.pixel_height = {pixel_height}")
        code.append(f"config.pixel_width = {pixel_width}")
        code.append("")
        code.append(f"class {class_name}(Scene):")
        code.append("    def construct(self):")
        code.append("        self.camera.background_color = '#1a1a2e'")
        code.append("")
        code.append("        # 对象注册表：同一几何元素在全流程复用")
        code.append("        points = {}")
        code.append("        point_labels = {}")
        code.append("        lines = {}")
        code.append("        objects = {}")
        code.append(f"        hidden_derived_points = {repr(sorted(hidden_derived_point_ids))}")
        code.append("")

        for point_id in point_ids:
            sx, sy = screen_points.get(point_id, (0.0, 0.0))
            safe_id = self._safe_text(point_id)
            label_text = self._safe_text(
                self._point_label_text(point_id, point_display, point_payload_lookup.get(point_id))
            )
            label_dx, label_dy = self._label_offset(
                point_id,
                screen_points,
                point_display,
                point_payload_lookup.get(point_id),
            )
            point_ctor = (
                f"Dot(point=np.array([{sx:.3f}, {sy:.3f}, 0]), radius=0.05, color=WHITE)"
            )
            if point_id in hidden_derived_point_ids:
                point_ctor += ".set_opacity(0)"
            code.append(f"        points['{safe_id}'] = {point_ctor}")
            show_label = self._display_bool(point_display, point_id, "show_label", True)
            if show_label:
                label_ctor = (
                    f"Text('{label_text}', font_size=24, color=WHITE).move_to(np.array([{sx + label_dx:.3f}, {sy + label_dy:.3f}, 0]))"
                )
                if point_id in hidden_derived_point_ids:
                    label_ctor += ".set_opacity(0)"
                code.append(
                    f"        point_labels['{safe_id}'] = {label_ctor}"
                )
                code.append(f"        self.add(points['{safe_id}'], point_labels['{safe_id}'])")
            else:
                code.append(f"        self.add(points['{safe_id}'])")

        if point_ids:
            code.append("")

        for primitive in primitives:
            primitive_id = self._safe_text(str(primitive.get("id", "")))
            primitive_type = str(primitive.get("type", "")).strip().lower()
            refs = [self._safe_text(str(p)) for p in (primitive.get("points") or [])]
            color = self._manim_color_expr(self._display_value(primitive_display, primitive_id, "color"))
            fill_opacity = float(self._display_value(primitive_display, primitive_id, "fill_opacity", 0.05) or 0.05)
            line_style = str(self._display_value(primitive_display, primitive_id, "style", "solid") or "solid").strip().lower()
            stroke_width = float(self._display_value(primitive_display, primitive_id, "stroke_width", 3) or 3)
            show_primitive = self._display_bool(
                primitive_display,
                primitive_id,
                "show",
                default=(primitive_type not in {"angle", "right_angle"}),
            )
            if not show_primitive:
                continue

            if primitive_type == "segment" and len(refs) == 2:
                p1, p2 = refs
                code.append(f"        if '{p1}' in points and '{p2}' in points:")
                line_cls = "DashedLine" if line_style == "dashed" else "Line"
                code.append(
                    f"            lines['{primitive_id}'] = always_redraw(lambda p1='{p1}', p2='{p2}': "
                    f"{line_cls}(points[p1].get_center(), points[p2].get_center(), color={color}, stroke_width={stroke_width:.2f}))"
                )
                code.append(f"            self.add(lines['{primitive_id}'])")
                continue

            if primitive_type == "polygon" and len(refs) >= 3:
                refs_repr = repr(refs)
                code.append(f"        if all(k in points for k in {refs}):")
                code.append(
                    f"            objects['{primitive_id}'] = always_redraw(lambda refs={refs_repr}: "
                    f"Polygon(*[points[r].get_center() for r in refs], color={color}, stroke_width=3, fill_opacity={fill_opacity:.2f}))"
                )
                code.append(f"            self.add(objects['{primitive_id}'])")
                continue

            if primitive_type == "circle":
                center = self._safe_text(str(primitive.get("center", "")))
                radius_point = self._safe_text(str(primitive.get("radius_point", "")))
                code.append(f"        if '{center}' in points and '{radius_point}' in points:")
                code.append(
                    f"            objects['{primitive_id}'] = always_redraw(lambda c='{center}', r='{radius_point}': "
                    f"Circle(radius=np.linalg.norm(points[r].get_center() - points[c].get_center()), color={color}, stroke_width=3, fill_opacity={fill_opacity:.2f}).move_to(points[c].get_center()))"
                )
                code.append(f"            self.add(objects['{primitive_id}'])")
                continue

            if primitive_type == "arc" and len(refs) == 2:
                center = self._safe_text(str(primitive.get("center", "")))
                start_point, end_point = refs
                code.append(
                    f"        if '{center}' in points and '{start_point}' in points and '{end_point}' in points:"
                )
                code.append(
                    f"            objects['{primitive_id}'] = always_redraw(lambda c='{center}', s='{start_point}', e='{end_point}': "
                    f"Arc(radius=np.linalg.norm(points[s].get_center() - points[c].get_center()), "
                    f"start_angle=np.arctan2((points[s].get_center()-points[c].get_center())[1], (points[s].get_center()-points[c].get_center())[0]), "
                    f"angle=((np.arctan2((points[e].get_center()-points[c].get_center())[1], (points[e].get_center()-points[c].get_center())[0]) - np.arctan2((points[s].get_center()-points[c].get_center())[1], (points[s].get_center()-points[c].get_center())[0]) + 2*np.pi) % (2*np.pi)), "
                    f"color={color}).move_arc_center_to(points[c].get_center()))"
                )
                code.append(f"            self.add(objects['{primitive_id}'])")
                continue

            if primitive_type in {'angle', 'right_angle'} and len(refs) == 3:
                p1, vertex, p2 = refs
                code.append(f"        if '{p1}' in points and '{vertex}' in points and '{p2}' in points:")
                if primitive_type == "right_angle":
                    code.append(
                        f"            objects['{primitive_id}'] = always_redraw(lambda p1='{p1}', v='{vertex}', p2='{p2}': "
                        f"RightAngle(Line(points[v].get_center(), points[p1].get_center()), "
                        f"Line(points[v].get_center(), points[p2].get_center()), "
                        f"length=max(0.14, min(0.30, min(np.linalg.norm(points[p1].get_center()-points[v].get_center()), np.linalg.norm(points[p2].get_center()-points[v].get_center())) * 0.18)), "
                        f"color={color}))"
                    )
                else:
                    angle_value = primitive.get("value")
                    use_other_angle = False
                    try:
                        if angle_value is not None:
                            use_other_angle = float(angle_value) > 180.0
                    except (TypeError, ValueError):
                        use_other_angle = False
                    code.append(
                        f"            objects['{primitive_id}'] = always_redraw(lambda p1='{p1}', v='{vertex}', p2='{p2}': "
                        f"Angle(Line(points[v].get_center(), points[p1].get_center()), "
                        f"Line(points[v].get_center(), points[p2].get_center()), "
                        f"radius=max(0.18, min(0.40, min(np.linalg.norm(points[p1].get_center()-points[v].get_center()), np.linalg.norm(points[p2].get_center()-points[v].get_center())) * 0.22)), "
                        f"other_angle={str(use_other_angle)}, color={color}))"
                    )
                code.append(f"            self.add(objects['{primitive_id}'])")

        code.append("")
        code.append("        current_formula_group = VGroup()")
        code.append("")
        code.append("        def _safe_add_sound(path, time_offset=0.0):")
        code.append("            if not path:")
        code.append("                return")
        code.append("            if not os.path.exists(path):")
        code.append("                return")
        code.append("            try:")
        code.append("                if os.path.getsize(path) <= 0:")
        code.append("                    return")
        code.append("            except OSError:")
        code.append("                return")
        code.append("            try:")
        code.append("                self.add_sound(path, time_offset=time_offset)")
        code.append("            except Exception:")
        code.append("                pass")
        code.append("")

        prev_scene = initial_scene

        for ctx in step_contexts:
            plan = ctx.get("animation_plan", {})
            step_id = int(plan.get("step_id", 0))
            title = self._safe_text(str(plan.get("title", f"步骤{step_id}")))
            title = self._safe_text(self._clean_display_text(title))
            duration = self._safe_duration(plan.get("duration", 1.0), 1.0)
            focus_entities = plan.get("focus_entities", []) or []
            action_types = {
                str(a.get("type", ""))
                for a in plan.get("actions", [])
                if isinstance(a, dict)
            }
            layout = ctx.get("canvas_layout", {})
            formula_elements = layout.get("reserved_formula_elements", []) or []

            step = step_by_id.get(step_id)
            audio_file = ""
            time_offset = float(plan.get("time_offset", 0.0))
            if step and getattr(step, "audio_file", None):
                audio_file = str(step.audio_file).replace("\\", "/")

            code.append(f"        # Step {step_id}: {title}")
            if audio_file:
                code.append(
                    f"        _safe_add_sound(r'{self._safe_text(audio_file)}', time_offset={time_offset:.2f})"
                )

            used = 0.0

            if formula_elements:
                code.append("        if len(current_formula_group) > 0:")
                code.append("            self.play(FadeOut(current_formula_group), run_time=0.20)")
                code.append("        current_formula_group = VGroup()")
                used += 0.2

                code.append("        step_formula_group = VGroup()")
                for el in formula_elements:
                    raw_content = str(el.get("content", ""))
                    raw_content = self._clean_display_text(raw_content)
                    line_label = self._parse_line_length_label(raw_content)
                    display_content = raw_content
                    x = float(el.get("x", 0.7))
                    y = float(el.get("y", 0.2))
                    w = float(el.get("width", 0.25))
                    h = float(el.get("height", 0.12))
                    center_nx = x + w * 0.5
                    center_ny = y + h * 0.5
                    if line_label:
                        _, length_text = line_label
                        display_content = length_text
                    code.append(f"        block_nx = {center_nx:.6f}")
                    code.append(f"        block_ny = {center_ny:.6f}")
                    code.append(f"        block_nw = {w:.6f}")
                    code.append(f"        block_nh = {h:.6f}")
                    code.append("        block_x = -config.frame_width / 2 + block_nx * config.frame_width")
                    code.append("        block_y = config.frame_height / 2 - block_ny * config.frame_height")
                    code.append("        max_width = max(block_nw * config.frame_width - 0.30, 1.2)")
                    code.append("        max_height = max(block_nh * config.frame_height - 0.10, 0.45)")
                    wrap_width_est = max(w * frame_width - 0.30, 1.2)
                    formula_tex = self._to_mathtex(display_content) if self.prefer_mathtex else ""
                    if formula_tex:
                        content = self._safe_text(formula_tex)
                        code.append(
                            f"        formula_obj = MathTex('{content}', font_size={self.formula_math_font_size}, color=YELLOW)"
                        )
                    else:
                        wrapped = self._safe_text(self._wrap_plain_text(display_content, wrap_width_est))
                        code.append(
                            f"        formula_obj = Text('{wrapped}', font_size={self.formula_text_font_size}, color=YELLOW, line_spacing=0.85)"
                        )
                    code.append("        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))")
                    code.append("        if formula_obj.height > max_height:")
                    code.append("            formula_obj.scale_to_fit_height(max_height)")
                    code.append("        formula_obj.move_to(np.array([block_x, block_y, 0]))")
                    code.append("        step_formula_group.add(formula_obj)")
                show_time = self._safe_duration(min(0.6, duration * 0.18), 0.15)
                code.append(f"        self.play(FadeIn(step_formula_group), run_time={show_time:.2f})")
                code.append("        current_formula_group = step_formula_group")
                used += show_time

            current_scene = self._authoritative_step_scene(initial_scene, ctx)
            moved_points = self._extract_moved_points(prev_scene, current_scene)
            if moved_points:
                current_lookup = self._scene_points(current_scene)
                current_bbox = self._coordinate_bbox(current_lookup)
                current_screen_points = self._screen_point_map(
                    current_lookup,
                    current_bbox,
                    frame_width,
                    frame_height,
                    left_panel_x_max,
                    safe_margin,
                )
                move_time = self._safe_duration(min(0.8, duration * 0.3), 0.2)
                code.append("        move_anims = []")
                for point_id in moved_points:
                    sx, sy = current_screen_points.get(point_id, (0.0, 0.0))
                    safe_id = self._safe_text(point_id)
                    label_dx, label_dy = self._label_offset(
                        point_id,
                        current_screen_points,
                        point_display,
                        point_payload_lookup.get(point_id),
                    )
                    code.append(f"        if '{safe_id}' in points:")
                    if point_id in hidden_derived_point_ids:
                        code.append(
                            f"            move_anims.append(points['{safe_id}'].animate.move_to(np.array([{sx:.3f}, {sy:.3f}, 0])).set_opacity(1))"
                        )
                    else:
                        code.append(
                            f"            move_anims.append(points['{safe_id}'].animate.move_to(np.array([{sx:.3f}, {sy:.3f}, 0])))"
                        )
                    code.append(f"        if '{safe_id}' in point_labels:")
                    if point_id in hidden_derived_point_ids:
                        code.append(
                            f"            move_anims.append(point_labels['{safe_id}'].animate.move_to(np.array([{sx + label_dx:.3f}, {sy + label_dy:.3f}, 0])).set_opacity(1))"
                        )
                    else:
                        code.append(
                            f"            move_anims.append(point_labels['{safe_id}'].animate.move_to(np.array([{sx + label_dx:.3f}, {sy + label_dy:.3f}, 0])))"
                        )
                code.append("        if move_anims:")
                code.append(f"            self.play(*move_anims, run_time={move_time:.2f})")
                used += move_time

            target_infos = self._build_focus_target_infos(focus_entities, point_lookup, primitives, primitive_display)
            targets = [t["expr"] for t in target_infos]

            if targets and ("highlight" in action_types or "maintain" in action_types or "reuse_entities" in action_types):
                hi_time = self._safe_duration(min(0.8, duration * 0.35), 0.2)
                code.append("        highlight_anims = []")
                for target_expr in targets:
                    code.append(f"        highlight_anims.append({target_expr}.animate.set_color(YELLOW))")
                code.append(f"        self.play(*highlight_anims, run_time={hi_time:.2f})")
                used += hi_time

            if targets and "transform" in action_types:
                tf_time = self._safe_duration(min(0.9, duration * 0.30), 0.2)
                code.append("        transform_anims = []")
                for info in target_infos:
                    if info.get("kind") == "line":
                        code.append(
                            f"        transform_anims.append({info['expr']}.animate.set_color(ORANGE))"
                        )
                    else:
                        code.append(
                            f"        transform_anims.append({info['expr']}.animate.scale(1.05).set_color(ORANGE))"
                        )
                code.append(f"        self.play(*transform_anims, run_time={tf_time:.2f})")
                used += tf_time

            if target_infos and "label" in action_types:
                show_label_time = self._safe_duration(min(0.6, duration * 0.2), 0.15)
                hide_label_time = self._safe_duration(min(0.4, duration * 0.15), 0.1)
                code.append("        temp_labels = VGroup()")
                for info in target_infos:
                    if info.get("kind") != "point":
                        continue
                    entity = self._safe_text(info["id"])
                    code.append(
                        f"        temp_labels.add(Text('{entity}', font_size=24, color=GREEN).next_to({info['expr']}, UP * 0.25))"
                    )
                code.append("        if len(temp_labels) > 0:")
                code.append(f"            self.play(FadeIn(temp_labels), run_time={show_label_time:.2f})")
                code.append(f"            self.play(FadeOut(temp_labels), run_time={hide_label_time:.2f})")
                used += show_label_time + hide_label_time

            if targets and ("highlight" in action_types or "transform" in action_types or "maintain" in action_types):
                restore_time = self._safe_duration(min(0.4, duration * 0.15), 0.1)
                code.append("        restore_anims = []")
                for info in target_infos:
                    if info.get("kind") == "line":
                        code.append(
                            f"        restore_anims.append({info['expr']}.animate.set_color({info['default_color']}).set_stroke(width=3))"
                        )
                    else:
                        code.append(
                            f"        restore_anims.append({info['expr']}.animate.set_color({info['default_color']}))"
                        )
                code.append(f"        self.play(*restore_anims, run_time={restore_time:.2f})")
                used += restore_time

            remain = round(max(duration - used, 0.0), 2)
            if remain > 0:
                code.append(f"        self.wait({remain:.2f})")

            code.append("")
            prev_scene = current_scene if isinstance(current_scene, dict) and current_scene else prev_scene

        return "\n".join(code)

    def validate_formal_video_code(self, manim_code: str) -> Tuple[bool, str]:
        code = str(manim_code or "")
        if len(code.strip()) < 50:
            return False, "generated Manim code is empty or too short"

        debug_markers = [
            "class DataAnalysisScene",
            "Drawable Scene",
            "Semantic Graph",
            "Geometry Graph",
            "layout_mode:",
            "points: {}",
            "lines: []",
            "node_count:",
            "edge_count:",
        ]
        for marker in debug_markers:
            if marker in code:
                return False, f"generated Manim code contains debug-only marker: {marker}"

        if "points['" not in code:
            return False, "generated Manim code does not create any drawable points"

        has_geometry_container = "lines['" in code or "objects['" in code
        if not has_geometry_container:
            return False, "generated Manim code does not create drawable geometry objects"

        geometry_tokens = [
            "Dot(",
            "Line(",
            "DashedLine(",
            "Polygon(",
            "Circle(",
            "Angle(",
            "RightAngle(",
            "Arc(",
        ]
        if not any(token in code for token in geometry_tokens):
            return False, "generated Manim code is missing core geometric constructors"

        return True, ""

    def _validate_drawable_scene_semantics(
        self,
        scene: Dict[str, Any],
        point_lookup: Dict[str, List[float]],
    ) -> None:
        if not isinstance(scene, dict):
            return
        primitive_map = {
            str(item.get("id", "")).strip(): item
            for item in (scene.get("primitives") or [])
            if isinstance(item, dict) and str(item.get("id", "")).strip()
        }
        display = scene.get("display", {}) if isinstance(scene.get("display"), dict) else {}
        primitive_display = display.get("primitives", {}) if isinstance(display.get("primitives"), dict) else {}
        for primitive_id, payload in primitive_display.items():
            if not isinstance(payload, dict):
                continue
            role = str(payload.get("role", "")).strip().lower()
            style = str(payload.get("style", "")).strip().lower()
            primitive = primitive_map.get(str(primitive_id).strip())
            if not isinstance(primitive, dict):
                continue
            if str(primitive.get("type", "")).strip().lower() != "segment":
                continue
            if role == "construction" and style != "dashed":
                raise ValueError(f"construction segment {primitive_id} must use dashed style")
        for relation in scene.get("constraints", []) or []:
            if not isinstance(relation, dict):
                continue
            relation_type = str(relation.get("type", "")).strip().lower()
            entities = [str(item).strip() for item in (relation.get("entities") or []) if str(item).strip()]
            if relation_type not in {"point_in_polygon", "point_outside_polygon"} or len(entities) != 2:
                continue
            point_id, polygon_id = entities
            polygon = primitive_map.get(polygon_id)
            if point_id not in point_lookup or not isinstance(polygon, dict):
                continue
            refs = [str(item).strip() for item in (polygon.get("points") or []) if str(item).strip()]
            if len(refs) < 3 or any(ref not in point_lookup for ref in refs):
                continue
            inside = self._point_in_polygon(point_lookup[point_id], [point_lookup[ref] for ref in refs])
            if relation_type == "point_in_polygon" and not inside:
                raise ValueError(f"drawable scene violates point_in_polygon for {point_id} in {polygon_id}")
            if relation_type == "point_outside_polygon" and inside:
                raise ValueError(f"drawable scene violates point_outside_polygon for {point_id} outside {polygon_id}")

    def _point_in_polygon(
        self,
        point: List[float],
        polygon: List[List[float]],
    ) -> bool:
        x = float(point[0])
        y = float(point[1])
        inside = False
        total = len(polygon)
        if total < 3:
            return False
        for index in range(total):
            x1, y1 = float(polygon[index][0]), float(polygon[index][1])
            x2, y2 = float(polygon[(index + 1) % total][0]), float(polygon[(index + 1) % total][1])
            intersects = ((y1 > y) != (y2 > y))
            if not intersects:
                continue
            cross_x = (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-9) + x1
            if x < cross_x:
                inside = not inside
        return inside

    def _build_class_name(self, project: Any) -> str:
        source = getattr(project, "problem_text", "") or "TriangleFoldingProblem"
        letters = re.sub(r"[^A-Za-z0-9]+", " ", source).title().replace(" ", "")
        if not letters:
            letters = "TriangleFoldingProblem"
        if not letters[0].isalpha():
            letters = "Scene" + letters
        if not letters.endswith("Problem"):
            letters = letters + "Problem"
        return letters[:64]

    def _safe_text(self, text: str) -> str:
        return text.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ")

    def _safe_duration(self, value: Any, default_value: float) -> float:
        try:
            val = float(value)
            if val <= 0:
                return default_value
            return round(val, 2)
        except (ValueError, TypeError):
            return default_value

    def _to_mathtex(self, text: str) -> str:
        if not self._looks_like_formula(text):
            return ""

        latex = text.strip()
        latex = latex.replace("′", "'")
        latex = latex.replace("△", r"\triangle ")
        latex = latex.replace("×", r"\times ")
        latex = latex.replace("·", r"\cdot ")
        latex = latex.replace("≤", r"\le ")
        latex = latex.replace("≥", r"\ge ")
        latex = latex.replace("≠", r"\neq ")
        latex = latex.replace("²", "^2")
        latex = latex.replace("°", r"^{\circ}")
        latex = re.sub(r"√\(([^()]+)\)", r"\\sqrt{\1}", latex)
        latex = re.sub(r"(?<![\\A-Za-z])√([A-Za-z0-9]+)", r"\\sqrt{\1}", latex)
        latex = latex.replace("cm²", r"\\,\\mathrm{cm}^2")
        latex = re.sub(r"(?<![A-Za-z])cm\b", r"\\,\\mathrm{cm}", latex)
        latex = re.sub(r"\s+", " ", latex).strip()
        return latex

    def _wrap_plain_text(self, text: str, max_width: float) -> str:
        normalized = re.sub(r"\s+", " ", text).strip()
        if not normalized:
            return ""

        max_chars = max(8, min(22, int(max_width * 5.2)))
        lines: List[str] = []
        current = ""
        for char in normalized:
            current += char
            if len(current) >= max_chars and char not in " ,，。；：)）]】":
                lines.append(current)
                current = ""
        if current:
            lines.append(current)
        return "\n".join(lines[:4])

    def _parse_line_length_label(self, text: str) -> Optional[Tuple[str, str]]:
        candidate = text.strip()
        match = re.fullmatch(
            r"([A-Za-z]{1,3}'?)\s*=\s*(\d+(?:\.\d+)?)\s*cm\b",
            candidate,
            flags=re.IGNORECASE,
        )
        if not match:
            return None
        line_id = match.group(1).upper()
        length_val = match.group(2)
        return line_id, f"{length_val} cm"

    def _looks_like_formula(self, text: str) -> bool:
        candidate = text.strip()
        if not candidate:
            return False
        if re.search(r"[\u4e00-\u9fff]", candidate):
            return False
        return any(token in candidate for token in ["=", "+", "-", "√", "²", "×", "/", "cm", "^"])

    def _coordinate_bbox(self, point_lookup: Dict[str, List[float]]) -> Tuple[float, float, float, float]:
        if not point_lookup:
            return (0.0, 1.0, 0.0, 1.0)
        xs = [coord[0] for coord in point_lookup.values()]
        ys = [coord[1] for coord in point_lookup.values()]
        min_x = min(xs)
        max_x = max(xs)
        min_y = min(ys)
        max_y = max(ys)
        if abs(max_x - min_x) < 1e-6:
            max_x = min_x + 1.0
        if abs(max_y - min_y) < 1e-6:
            max_y = min_y + 1.0
        return (min_x, max_x, min_y, max_y)

    def _screen_point_map(
        self,
        point_lookup: Dict[str, List[float]],
        bbox: Tuple[float, float, float, float],
        frame_width: float,
        frame_height: float,
        left_panel_x_max: float,
        safe_margin: float,
    ) -> Dict[str, Tuple[float, float]]:
        result: Dict[str, Tuple[float, float]] = {}
        for point_id, coord in point_lookup.items():
            result[point_id] = self._coord_to_geometry_scene_xy(
                coord[0],
                coord[1],
                bbox,
                frame_width,
                frame_height,
                left_panel_x_max,
                safe_margin,
            )
        return result

    def _coord_to_geometry_scene_xy(
        self,
        x: float,
        y: float,
        bbox: Tuple[float, float, float, float],
        frame_width: float,
        frame_height: float,
        left_panel_x_max: float,
        safe_margin: float,
    ) -> Tuple[float, float]:
        min_x, max_x, min_y, max_y = bbox
        half_w = frame_width / 2.0
        half_h = frame_height / 2.0
        x_min_scene = -half_w + safe_margin
        x_max_scene = left_panel_x_max - safe_margin * 0.2
        y_min_scene = -half_h + safe_margin
        y_max_scene = half_h - safe_margin

        data_width = max(max_x - min_x, 1e-6)
        data_height = max(max_y - min_y, 1e-6)
        scene_width = max(x_max_scene - x_min_scene, 1e-6)
        scene_height = max(y_max_scene - y_min_scene, 1e-6)
        scale = min(scene_width / data_width, scene_height / data_height)

        data_center_x = (min_x + max_x) / 2.0
        data_center_y = (min_y + max_y) / 2.0
        scene_center_x = (x_min_scene + x_max_scene) / 2.0
        scene_center_y = (y_min_scene + y_max_scene) / 2.0

        sx = scene_center_x + (float(x) - data_center_x) * scale
        sy = scene_center_y + (float(y) - data_center_y) * scale
        return sx, sy

    def _display_bool(
        self,
        display_block: Dict[str, Any],
        entity_id: str,
        key: str,
        default: bool,
    ) -> bool:
        item = display_block.get(entity_id)
        if not isinstance(item, dict):
            return default
        return bool(item.get(key, default))

    def _display_value(
        self,
        display_block: Dict[str, Any],
        entity_id: str,
        key: str,
        default: Any = None,
    ) -> Any:
        item = display_block.get(entity_id)
        if not isinstance(item, dict):
            return default
        return item.get(key, default)

    def _manim_color_expr(self, color_name: Any, default: str = "BLUE_E") -> str:
        if color_name is None:
            return default
        name = str(color_name).strip()
        if not name:
            return default
        upper_name = name.upper()
        known_colors = {
            "WHITE", "BLUE", "BLUE_E", "GREEN", "YELLOW", "RED", "ORANGE",
            "GRAY", "GREY", "PURPLE", "TEAL", "PINK", "GOLD", "MAROON", "BLACK",
        }
        if upper_name in known_colors:
            return upper_name
        return f'"{self._safe_text(name)}"'

    def _build_focus_target_infos(
        self,
        focus_entities: List[str],
        point_lookup: Dict[str, List[float]],
        primitives: List[Dict[str, Any]],
        primitive_display: Dict[str, Any],
    ) -> List[Dict[str, str]]:
        point_ids = set(point_lookup.keys())
        primitive_kind: Dict[str, str] = {}
        primitive_color: Dict[str, str] = {}

        for primitive in primitives:
            if not isinstance(primitive, dict):
                continue
            primitive_id = str(primitive.get("id", "")).strip()
            primitive_type = str(primitive.get("type", "")).strip().lower()
            if not primitive_id:
                continue
            show_primitive = self._display_bool(
                primitive_display,
                primitive_id,
                "show",
                default=(primitive_type not in {"angle", "right_angle"}),
            )
            if not show_primitive and primitive_type in {"angle", "right_angle"}:
                continue
            primitive_kind[primitive_id] = "line" if primitive_type == "segment" else "object"
            default = "BLUE_E" if primitive_type == "segment" else "BLUE"
            primitive_color[primitive_id] = self._manim_color_expr(
                self._display_value(primitive_display, primitive_id, "color"),
                default=default,
            )

        targets: List[Dict[str, str]] = []
        for raw in focus_entities:
            entity_id = str(raw)
            safe = self._safe_text(entity_id)
            if entity_id in point_ids:
                targets.append({
                    "id": entity_id,
                    "expr": f"points['{safe}']",
                    "kind": "point",
                    "default_color": "WHITE",
                })
            elif primitive_kind.get(entity_id) == "line":
                targets.append({
                    "id": entity_id,
                    "expr": f"lines['{safe}']",
                    "kind": "line",
                    "default_color": primitive_color.get(entity_id, "BLUE_E"),
                })
            elif primitive_kind.get(entity_id) == "object":
                targets.append({
                    "id": entity_id,
                    "expr": f"objects['{safe}']",
                    "kind": "object",
                    "default_color": primitive_color.get(entity_id, "BLUE"),
                })

        deduped: List[Dict[str, str]] = []
        seen = set()
        for target in targets:
            key = target["expr"]
            if key in seen:
                continue
            seen.add(key)
            deduped.append(target)
        return deduped

    def _scene_points(self, scene: Dict[str, Any]) -> Dict[str, List[float]]:
        """从 coordinate_scene 或旧 scene_graph 中提取点坐标。"""
        result: Dict[str, List[float]] = {}
        if not isinstance(scene, dict):
            return result
        points = scene.get("points", {})
        if isinstance(points, dict):
            for pid, payload in points.items():
                if not isinstance(payload, dict):
                    continue
                coord = payload.get("coord")
                pos = coord if isinstance(coord, list) and len(coord) == 2 else payload.get("pos")
                if not isinstance(pos, list) or len(pos) != 2:
                    continue
                try:
                    result[str(pid)] = [float(pos[0]), float(pos[1])]
                except (TypeError, ValueError):
                    continue
            return result

        if isinstance(points, list):
            for item in points:
                if not isinstance(item, dict):
                    continue
                point_id = str(item.get("id", "")).strip()
                coord = item.get("coord")
                if not point_id or not isinstance(coord, list) or len(coord) != 2:
                    continue
                try:
                    result[point_id] = [float(coord[0]), float(coord[1])]
                except (TypeError, ValueError):
                    continue
        return result

    def _point_payload_lookup(self, scene: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        lookup: Dict[str, Dict[str, Any]] = {}
        if not isinstance(scene, dict):
            return lookup
        points = scene.get("points", [])
        if isinstance(points, dict):
            for point_id, payload in points.items():
                if isinstance(payload, dict):
                    lookup[str(point_id)] = payload
            return lookup
        if isinstance(points, list):
            for item in points:
                if not isinstance(item, dict):
                    continue
                point_id = str(item.get("id", "")).strip()
                if not point_id:
                    continue
                lookup[point_id] = item
        return lookup

    def _point_label_text(
        self,
        point_id: str,
        point_display: Dict[str, Any],
        payload: Optional[Dict[str, Any]],
    ) -> str:
        explicit = self._display_value(point_display, point_id, "label")
        if isinstance(explicit, str) and explicit.strip():
            return explicit.strip()

        derived = payload.get("derived") if isinstance(payload, dict) else None
        if isinstance(derived, dict) and str(derived.get("type", "")).strip().lower() == "reflect_point":
            source_id = str(derived.get("source", "")).strip()
            if source_id:
                return f"{source_id}'"

        match = re.fullmatch(r"([A-Za-z]+)1", point_id)
        if match:
            return f"{match.group(1)}'"
        return point_id

    def _label_offset(
        self,
        point_id: str,
        screen_points: Dict[str, Tuple[float, float]],
        point_display: Dict[str, Any],
        payload: Optional[Dict[str, Any]],
    ) -> Tuple[float, float]:
        explicit = str(self._display_value(point_display, point_id, "label_direction", "") or "").strip().lower()
        if explicit:
            mapping = {
                "up": (0.0, 0.28),
                "down": (0.0, -0.30),
                "left": (-0.26, 0.0),
                "right": (0.26, 0.0),
                "up_left": (-0.22, 0.24),
                "up_right": (0.22, 0.24),
                "down_left": (-0.22, -0.24),
                "down_right": (0.22, -0.24),
            }
            if explicit in mapping:
                return mapping[explicit]

        x, y = screen_points.get(point_id, (0.0, 0.0))
        if y < -1.5:
            return (0.0, -0.30)
        if y > 2.0:
            return (0.0, 0.28)
        if x < -2.4:
            return (-0.24, 0.10)
        if x > 0.5:
            return (0.24, 0.10)
        return (0.0, 0.28)

    def _extract_moved_points(
        self,
        prev_scene: Dict[str, Any],
        curr_scene: Dict[str, Any],
        eps: float = 1e-6,
    ) -> Dict[str, List[float]]:
        prev_points = self._scene_points(prev_scene)
        curr_points = self._scene_points(curr_scene)
        moved: Dict[str, List[float]] = {}
        for pid, curr_pos in curr_points.items():
            prev_pos = prev_points.get(pid)
            if prev_pos is None:
                continue
            if abs(curr_pos[0] - prev_pos[0]) > eps or abs(curr_pos[1] - prev_pos[1]) > eps:
                moved[pid] = curr_pos
        return moved

    def _authoritative_step_scene(
        self,
        base_scene: Dict[str, Any],
        ctx: Dict[str, Any],
    ) -> Dict[str, Any]:
        if not isinstance(ctx, dict):
            return base_scene
        step_scene = ctx.get("step_scene", {})
        if not isinstance(step_scene, dict):
            return base_scene
        if not bool(step_scene.get("allow_geometry_motion", False)):
            return base_scene
        candidate = step_scene.get("scene", {})
        if not isinstance(candidate, dict):
            return base_scene
        if set(self._scene_points(candidate).keys()) != set(self._scene_points(base_scene).keys()):
            return base_scene
        return candidate

    def _resolve_initial_scene(
        self,
        *,
        coordinate_scene_data: Dict[str, Any],
        step_contexts: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        base_scene = coordinate_scene_data if isinstance(coordinate_scene_data, dict) else {}
        if self._scene_points(base_scene):
            return base_scene
        for ctx in step_contexts:
            if not isinstance(ctx, dict):
                continue
            step_scene = ctx.get("step_scene", {})
            if not isinstance(step_scene, dict):
                continue
            candidate = step_scene.get("scene", {})
            if isinstance(candidate, dict) and self._scene_points(candidate):
                return candidate
        return base_scene

    def _to_mathtex(self, text: str) -> str:
        if not self._looks_like_formula(text):
            return ""

        latex = text.strip()
        replacements = {
            "脳": r"\times ",
            "路": r"\cdot ",
            "虏": "^2",
            "掳": r"^{\circ}",
            "//": r"\parallel ",
            "∠": r"\angle ",
            "△": r"\triangle ",
            "≤": r"\le ",
            "≥": r"\ge ",
            "≠": r"\neq ",
            "∵": r"\because ",
            "∴": r"\therefore ",
        }
        for source, target in replacements.items():
            latex = latex.replace(source, target)

        latex = re.sub(r"(?<![A-Za-z])cm\b", r"\\,\\mathrm{cm}", latex)
        latex = re.sub(r"\s+", " ", latex).strip()
        if not self._is_safe_mathtex_content(latex):
            return ""
        return latex

    def _looks_like_formula(self, text: str) -> bool:
        candidate = text.strip()
        if not candidate:
            return False
        if re.search(r"[\u4e00-\u9fff]", candidate):
            return False
        if self._contains_mojibake(candidate):
            return False
        formula_tokens = ["=", "+", "-", "/", "cm", "^", "//", "∠", "△", "≤", "≥", "≠"]
        return any(token in candidate for token in formula_tokens)

    def _contains_mojibake(self, text: str) -> bool:
        markers = ["鈭", "锛", "銆", "鐨", "姣", "∵", "∴"]
        return any(marker in text for marker in markers)

    def _is_safe_mathtex_content(self, text: str) -> bool:
        if not text.strip():
            return False
        if self._contains_mojibake(text):
            return False
        safe_pattern = re.compile(r"^[A-Za-z0-9\s\\{}_^=+\-*/().,:|<>\[\]]+$")
        return bool(safe_pattern.fullmatch(text))

    def _clean_display_text(self, text: str) -> str:
        cleaned = str(text or "").strip()
        if not cleaned:
            return ""
        replacements = {
            "\u922d\u71d7": "\u2220",
            "\u922d": "\u2220",
            "\u922e": "\u2220",
            "\u925b": "\u25b3",
            "\u922b": "\u25b3",
            "\u6397": "\u00b0",
            "\u865f": "^2",
            "\u8123": "\u00d7",
            "\u8def": "\u00b7",
            "\u71d7": "A",
            "\u71d8": "B",
            "\u71d9": "C",
            "\u71e9": "P",
            "\u77e8": "A",
            "\u7805": "P",
        }
        for source, target in replacements.items():
            cleaned = cleaned.replace(source, target)
        cleaned = cleaned.replace("??", "").replace("锛?", "").replace("銆?", "")
        return re.sub(r"\s+", " ", cleaned).strip()

    def _wrap_plain_text(self, text: str, max_width: float) -> str:
        normalized = re.sub(r"\s+", " ", self._clean_display_text(text)).strip()
        if not normalized:
            return ""
        max_chars = max(8, min(22, int(max_width * 5.2)))
        lines: List[str] = []
        current = ""
        for char in normalized:
            current += char
            if len(current) >= max_chars and char not in " ,，。；：!?":
                lines.append(current)
                current = ""
        if current:
            lines.append(current)
        return "\n".join(lines[:4])

    def _to_mathtex(self, text: str) -> str:
        candidate = self._clean_display_text(text)
        if not self._looks_like_formula(candidate):
            return ""
        latex = candidate
        replacements = {
            "\u2019": "'",
            "\u2032": "'",
            "\u25b3": r"\triangle ",
            "\u00d7": r"\times ",
            "\u00b7": r"\cdot ",
            "\u2264": r"\le ",
            "\u2265": r"\ge ",
            "\u2260": r"\neq ",
            "\u2220": r"\angle ",
            "\u00b0": r"^{\circ}",
        }
        for source, target in replacements.items():
            latex = latex.replace(source, target)
        latex = latex.replace("cm^2", r"\\,\\mathrm{cm}^2")
        latex = re.sub(r"(?<![A-Za-z])cm\b", r"\\,\\mathrm{cm}", latex)
        latex = re.sub(r"\s+", " ", latex).strip()
        if not self._is_safe_mathtex_content(latex):
            return ""
        return latex

    def _looks_like_formula(self, text: str) -> bool:
        candidate = self._clean_display_text(text).strip()
        if not candidate:
            return False
        if re.search(r"[\u4e00-\u9fff]", candidate):
            return False
        formula_tokens = ["=", "+", "-", "/", "cm", "^", "//", "\u2220", "\u25b3", "\u00b0"]
        return any(token in candidate for token in formula_tokens)

    def _contains_mojibake(self, text: str) -> bool:
        markers = ["\u95b3", "\u95bf", "\u95b5", "\u95bb", "\u6fee"]
        return any(marker in str(text) for marker in markers)

    def _is_safe_mathtex_content(self, text: str) -> bool:
        if not text.strip():
            return False
        if self._contains_mojibake(text):
            return False
        safe_pattern = re.compile(r"^[A-Za-z0-9\s\\{}_^=+\-*/().,:|<>\[\]']+$")
        return bool(safe_pattern.fullmatch(text))
