"""
Check and repair teaching actions before animation execution.
"""

from __future__ import annotations

import copy
from typing import Any, Dict, List, Set, Tuple


class ActionExecutabilityChecker:
    """Validate teaching IR action dependencies and apply safe repairs."""

    def check_and_repair(
        self,
        *,
        teaching_ir: Dict[str, Any],
        geometry_ir: Dict[str, Any],
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        ir = copy.deepcopy(teaching_ir if isinstance(teaching_ir, dict) else {})
        steps = ir.get("steps") if isinstance(ir.get("steps"), list) else []

        entities = self._collect_entities(geometry_ir)
        fold_axis = str(geometry_ir.get("transform", {}).get("fold_axis", "")).strip()

        issues: List[Dict[str, Any]] = []
        repaired = 0

        for step_index, step in enumerate(steps):
            if not isinstance(step, dict):
                continue
            step_id = self._safe_step_id(step.get("step_id"), step_index + 1)
            actions = step.get("actions") if isinstance(step.get("actions"), list) else []

            for action_index, action in enumerate(actions):
                if not isinstance(action, dict):
                    issues.append(
                        {
                            "type": "invalid_action_payload",
                            "step_id": step_id,
                            "action_index": action_index,
                            "message": "action must be an object",
                        }
                    )
                    continue

                action_name = str(action.get("action", "")).strip()
                if not action_name:
                    issues.append(
                        {
                            "type": "missing_action_name",
                            "step_id": step_id,
                            "action_index": action_index,
                            "message": "missing action name",
                        }
                    )
                    continue

                if action_name in {"highlight_fold_axis", "animate_fold"}:
                    axis = str(action.get("axis", "")).strip()
                    if not axis and fold_axis:
                        action["axis"] = fold_axis
                        repaired += 1
                    elif not axis:
                        issues.append(
                            {
                                "type": "missing_axis",
                                "step_id": step_id,
                                "action_index": action_index,
                                "message": "fold action is missing axis",
                            }
                        )
                    elif not self._entity_exists(axis, entities):
                        issues.append(
                            {
                                "type": "unknown_axis",
                                "step_id": step_id,
                                "action_index": action_index,
                                "message": f"axis {axis} does not exist in geometry entities",
                            }
                        )

                if action_name == "create_image_point":
                    source = str(action.get("from", "")).strip()
                    target = str(action.get("to", "")).strip()
                    if source and not self._entity_exists(source, entities):
                        issues.append(
                            {
                                "type": "missing_dependency",
                                "step_id": step_id,
                                "action_index": action_index,
                                "message": f"source point {source} does not exist",
                            }
                        )
                    if target:
                        entities["points"].add(target)

                if action_name == "draw_perpendicular_auxiliary":
                    from_point = str(action.get("from", "")).strip()
                    to_line = str(action.get("to_line", "")).strip()
                    new_point = str(action.get("new_point", "")).strip()

                    if from_point and not self._entity_exists(from_point, entities):
                        issues.append(
                            {
                                "type": "missing_dependency",
                                "step_id": step_id,
                                "action_index": action_index,
                                "message": f"point {from_point} is referenced before creation",
                            }
                        )

                    if to_line and not self._entity_exists(to_line, entities):
                        issues.append(
                            {
                                "type": "missing_dependency",
                                "step_id": step_id,
                                "action_index": action_index,
                                "message": f"line {to_line} is referenced before creation",
                            }
                        )

                    if new_point:
                        entities["points"].add(new_point)

                if action_name in {"highlight_entity", "highlight_relation"}:
                    targets = [str(item).strip() for item in (action.get("targets") or []) if str(item).strip()]
                    if not targets:
                        issues.append(
                            {
                                "type": "empty_targets",
                                "step_id": step_id,
                                "action_index": action_index,
                                "message": "highlight action has no targets",
                            }
                        )
                    else:
                        unknown = [item for item in targets if not self._entity_exists(item, entities)]
                        if unknown:
                            issues.append(
                                {
                                    "type": "unknown_targets",
                                    "step_id": step_id,
                                    "action_index": action_index,
                                    "message": f"targets not found: {', '.join(unknown)}",
                                }
                            )

        status = "pass"
        if issues and repaired:
            status = "repaired"
        elif issues:
            status = "needs_repair"
        elif repaired:
            status = "repaired"

        report = {
            "checker_version": "v1",
            "status": status,
            "issue_count": len(issues),
            "repaired_action_count": repaired,
            "issues": issues,
        }
        return ir, report

    def _collect_entities(self, geometry_ir: Dict[str, Any]) -> Dict[str, Set[str]]:
        points = {str(item).strip() for item in (geometry_ir.get("points") or []) if str(item).strip()}

        segment_ids = set()
        segment_labels = set()
        for item in geometry_ir.get("segments", []) or []:
            if isinstance(item, dict):
                segment_id = str(item.get("id", "")).strip()
                segment_label = str(item.get("label", "")).strip()
                if segment_id:
                    segment_ids.add(segment_id)
                if segment_label:
                    segment_labels.add(segment_label)
            else:
                token = str(item).strip()
                if token:
                    segment_ids.add(token)

        shapes = {
            str(item.get("id", "")).strip()
            for item in (geometry_ir.get("shapes") or [])
            if isinstance(item, dict) and str(item.get("id", "")).strip()
        }

        return {
            "points": points,
            "segments": segment_ids,
            "segment_labels": segment_labels,
            "shapes": shapes,
        }

    def _entity_exists(self, token: str, entities: Dict[str, Set[str]]) -> bool:
        value = str(token).strip()
        return bool(
            value
            and (
                value in entities["points"]
                or value in entities["segments"]
                or value in entities["segment_labels"]
                or value in entities["shapes"]
            )
        )

    def _safe_step_id(self, raw: Any, fallback: int) -> int:
        if isinstance(raw, int):
            return raw
        try:
            return int(raw)
        except (TypeError, ValueError):
            return fallback
