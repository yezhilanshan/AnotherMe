"""
Compile loose geometry facts into the project's geometry_spec schema.
"""

from __future__ import annotations

import copy
import re
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


class GeometryFactCompiler:
    """Normalize permissive fact payloads into a stable geometry_spec."""

    CONSTRAINT_TYPES = {
        "point_on_segment",
        "point_on_circle",
        "point_in_polygon",
        "point_outside_polygon",
        "collinear",
        "perpendicular",
        "parallel",
        "midpoint",
        "equal_length",
        "intersect",
    }

    MEASUREMENT_TYPES = {"length", "angle", "ratio"}

    def compile(
        self,
        geometry_facts: Optional[Dict[str, Any]],
        *,
        problem_text: str = "",
    ) -> Dict[str, Any]:
        facts = copy.deepcopy(geometry_facts or {})
        roles = self._normalize_roles(
            facts.get("roles")
            or facts.get("point_roles")
            or facts.get("point_role_map")
            or {}
        )
        confidence = self._coerce_float(
            facts.get("confidence", facts.get("fact_confidence", 0.0)),
            default=0.0,
        )
        ambiguities = self._ordered_unique(
            str(item).strip()
            for item in (facts.get("ambiguities") or [])
            if str(item).strip()
        )

        point_order: List[str] = []
        point_set: set[str] = set()
        primitives: List[Dict[str, Any]] = []
        constraints: List[Dict[str, Any]] = []
        measurements: List[Dict[str, Any]] = []

        def register_point(raw: Any) -> str:
            point_id = self._normalize_point_id(raw)
            if not point_id:
                return ""
            if point_id not in point_set:
                point_set.add(point_id)
                point_order.append(point_id)
            return point_id

        for point in self._iter_points(facts.get("points")):
            register_point(point)
        for value in roles.values():
            register_point(value)

        segment_points: Dict[str, Tuple[str, str]] = {}
        circle_ids_by_center: Dict[str, str] = {}

        for raw_segment in facts.get("segments") or []:
            compiled = self._compile_segment_primitive(raw_segment, register_point)
            if compiled is None:
                continue
            primitives.append(compiled)
            refs = compiled.get("points") or []
            if len(refs) == 2:
                segment_points[str(compiled["id"])] = (str(refs[0]), str(refs[1]))

        for raw_polygon in facts.get("polygons") or []:
            compiled = self._compile_polygon_primitive(raw_polygon, register_point)
            if compiled is not None:
                primitives.append(compiled)

        for raw_circle in facts.get("circles") or []:
            compiled, point_constraints = self._compile_circle_primitive(
                raw_circle,
                register_point,
            )
            if compiled is None:
                continue
            primitives.append(compiled)
            center = str(compiled.get("center", "")).strip()
            if center:
                circle_ids_by_center[center] = str(compiled["id"])
            constraints.extend(point_constraints)

        for raw_arc in facts.get("arcs") or []:
            compiled = self._compile_arc_primitive(
                raw_arc,
                register_point,
                circle_ids_by_center,
            )
            if compiled is not None:
                primitives.append(compiled)

        for raw_angle in facts.get("angles") or []:
            compiled = self._compile_angle_primitive(raw_angle, register_point, right_angle=False)
            if compiled is not None:
                primitives.append(compiled)

        for raw_angle in facts.get("right_angles") or []:
            compiled = self._compile_angle_primitive(raw_angle, register_point, right_angle=True)
            if compiled is not None:
                primitives.append(compiled)

        for raw_primitive in facts.get("primitives") or []:
            primitive_type = str((raw_primitive or {}).get("type", "")).strip().lower()
            if not primitive_type:
                continue
            if primitive_type == "segment":
                compiled = self._compile_segment_primitive(raw_primitive, register_point)
                if compiled is not None:
                    primitives.append(compiled)
                    refs = compiled.get("points") or []
                    if len(refs) == 2:
                        segment_points[str(compiled["id"])] = (str(refs[0]), str(refs[1]))
                continue
            if primitive_type == "polygon":
                compiled = self._compile_polygon_primitive(raw_primitive, register_point)
                if compiled is not None:
                    primitives.append(compiled)
                continue
            if primitive_type == "circle":
                compiled, point_constraints = self._compile_circle_primitive(
                    raw_primitive,
                    register_point,
                )
                if compiled is not None:
                    primitives.append(compiled)
                    center = str(compiled.get("center", "")).strip()
                    if center:
                        circle_ids_by_center[center] = str(compiled["id"])
                    constraints.extend(point_constraints)
                continue
            if primitive_type == "arc":
                compiled = self._compile_arc_primitive(
                    raw_primitive,
                    register_point,
                    circle_ids_by_center,
                )
                if compiled is not None:
                    primitives.append(compiled)
                continue
            if primitive_type in {"angle", "right_angle"}:
                compiled = self._compile_angle_primitive(
                    raw_primitive,
                    register_point,
                    right_angle=(primitive_type == "right_angle"),
                )
                if compiled is not None:
                    primitives.append(compiled)
                continue
            if primitive_type in self.CONSTRAINT_TYPES:
                compiled = self._compile_relation(
                    raw_primitive,
                    primitive_type=primitive_type,
                    register_point=register_point,
                    segment_points=segment_points,
                    circle_ids_by_center=circle_ids_by_center,
                )
                if compiled is not None:
                    constraints.append(compiled)
                continue
            if primitive_type in self.MEASUREMENT_TYPES:
                compiled = self._compile_measurement(
                    raw_primitive,
                    measurement_type=primitive_type,
                    register_point=register_point,
                    segment_points=segment_points,
                )
                if compiled is not None:
                    measurements.append(compiled)

        relation_items = list(facts.get("relations") or []) + list(facts.get("constraints") or [])
        for raw_relation in relation_items:
            relation_type = str((raw_relation or {}).get("type", "")).strip().lower()
            if relation_type not in self.CONSTRAINT_TYPES:
                continue
            compiled = self._compile_relation(
                raw_relation,
                primitive_type=relation_type,
                register_point=register_point,
                segment_points=segment_points,
                circle_ids_by_center=circle_ids_by_center,
            )
            if compiled is not None:
                constraints.append(compiled)

        for raw_measurement in facts.get("measurements") or []:
            measurement_type = str((raw_measurement or {}).get("type", "")).strip().lower()
            if measurement_type not in self.MEASUREMENT_TYPES:
                continue
            compiled = self._compile_measurement(
                raw_measurement,
                measurement_type=measurement_type,
                register_point=register_point,
                segment_points=segment_points,
            )
            if compiled is not None:
                measurements.append(compiled)

        self._ensure_polygon_edges(
            primitives=primitives,
            register_point=register_point,
            segment_points=segment_points,
        )
        constraints.extend(
            self._infer_constraints_from_text(
                facts=facts,
                register_point=register_point,
                primitives=primitives,
                segment_points=segment_points,
            )
        )

        templates = self._ordered_unique(
            str(item).strip().lower()
            for item in (facts.get("templates") or [])
            if str(item).strip()
        )

        if "circle" in {str(item.get("type", "")).strip().lower() for item in primitives}:
            templates.append("circle_basic")
        if problem_text and ("折叠" in problem_text or "翻折" in problem_text):
            templates.append("fold")

        constraints = self._sanitize_constraints(
            constraints=constraints,
            primitives=primitives,
            measurements=measurements,
        )
        measurements = self._sanitize_measurements(measurements)
        display = self._infer_display(
            facts=facts,
            primitives=primitives,
            segment_points=segment_points,
        )
        primitive_types = {str(item.get("type", "")).strip().lower() for item in primitives}

        if "circle" in primitive_types and any(
            str(item.get("type", "")).strip().lower() == "parallel"
            for item in constraints
        ):
            templates = ["circle_parallel_extension", *templates]
        if "circle" in primitive_types:
            templates.append("circle_basic")
        templates = self._ordered_unique(templates)

        return {
            "templates": templates,
            "confidence": confidence,
            "ambiguities": ambiguities,
            "roles": roles,
            "points": point_order,
            "primitives": self._dedupe_objects(primitives),
            "constraints": self._dedupe_objects(constraints),
            "measurements": self._dedupe_objects(measurements),
            "display": display,
        }

    def _compile_segment_primitive(self, raw: Any, register_point) -> Optional[Dict[str, Any]]:
        endpoints = self._extract_segment_endpoints(raw)
        if len(endpoints) != 2:
            return None
        refs = [register_point(item) for item in endpoints]
        if not refs[0] or not refs[1] or refs[0] == refs[1]:
            return None
        primitive_id = self._primitive_id(raw, "seg_" + "".join(refs))
        return {"id": primitive_id, "type": "segment", "points": refs}

    def _compile_polygon_primitive(self, raw: Any, register_point) -> Optional[Dict[str, Any]]:
        refs = [register_point(item) for item in self._extract_polygon_points(raw)]
        refs = [item for item in refs if item]
        if len(refs) < 3:
            return None
        primitive_id = self._primitive_id(raw, "poly_" + "".join(refs))
        return {"id": primitive_id, "type": "polygon", "points": refs}

    def _compile_circle_primitive(
        self,
        raw: Any,
        register_point,
    ) -> Tuple[Optional[Dict[str, Any]], List[Dict[str, Any]]]:
        if not isinstance(raw, dict):
            return None, []
        center = register_point(raw.get("center") or raw.get("origin"))
        radius_point = register_point(raw.get("radius_point"))
        if not center:
            return None, []

        circle_id = self._primitive_id(raw, f"circle_{center}")
        point_constraints: List[Dict[str, Any]] = []
        circle_points = self._extract_point_list(
            raw.get("points_on_circle")
            or raw.get("points")
            or raw.get("on_points")
        )
        for point in circle_points:
            point_id = register_point(point)
            if not point_id or point_id == center:
                continue
            if not radius_point:
                radius_point = point_id
            point_constraints.append(
                {"type": "point_on_circle", "entities": [point_id, circle_id]}
            )

        payload = {"id": circle_id, "type": "circle", "center": center}
        if radius_point:
            payload["radius_point"] = radius_point
        return payload, point_constraints

    def _compile_arc_primitive(
        self,
        raw: Any,
        register_point,
        circle_ids_by_center: Dict[str, str],
    ) -> Optional[Dict[str, Any]]:
        if not isinstance(raw, dict):
            return None
        center = register_point(raw.get("center"))
        if not center:
            circle_ref = str(raw.get("circle", "")).strip()
            if circle_ref in circle_ids_by_center:
                center = circle_ref
        endpoints = self._extract_arc_endpoints(raw)
        refs = [register_point(item) for item in endpoints]
        refs = [item for item in refs if item]
        if len(refs) != 2:
            return None
        payload = {
            "id": self._primitive_id(raw, "arc_" + "".join(refs)),
            "type": "arc",
            "points": refs,
        }
        if center:
            payload["center"] = center
        circle_ref = str(raw.get("circle", "")).strip()
        if circle_ref:
            payload["circle"] = circle_ref
        return payload

    def _compile_angle_primitive(
        self,
        raw: Any,
        register_point,
        *,
        right_angle: bool,
    ) -> Optional[Dict[str, Any]]:
        refs = [register_point(item) for item in self._extract_angle_points(raw)]
        refs = [item for item in refs if item]
        if len(refs) != 3:
            return None
        primitive_type = "right_angle" if right_angle else "angle"
        payload = {
            "id": self._primitive_id(raw, "ang_" + "".join(refs)),
            "type": primitive_type,
            "points": refs,
        }
        value = raw.get("value") if isinstance(raw, dict) else None
        if value is None and not right_angle:
            return None
        if value is not None and not right_angle:
            payload["value"] = value
        return payload

    def _compile_relation(
        self,
        raw: Any,
        *,
        primitive_type: str,
        register_point,
        segment_points: Dict[str, Tuple[str, str]],
        circle_ids_by_center: Dict[str, str],
    ) -> Optional[Dict[str, Any]]:
        if not isinstance(raw, dict):
            return None
        entities: List[str] = []

        if primitive_type == "point_on_segment":
            point_id = register_point(raw.get("point") or raw.get("entity"))
            raw_segment = raw.get("segment") or raw.get("line") or raw.get("line_id")
            polygon_ref = self._normalize_polygon_interior_ref(raw_segment)
            polygon_exterior_ref = self._normalize_polygon_exterior_ref(raw_segment)
            if point_id and polygon_ref:
                entities = [point_id, polygon_ref]
                primitive_type = "point_in_polygon"
            elif point_id and polygon_exterior_ref:
                entities = [point_id, polygon_exterior_ref]
                primitive_type = "point_outside_polygon"
            else:
                segment_ref = self._normalize_segment_ref(
                    raw_segment,
                    register_point=register_point,
                    segment_points=segment_points,
                )
                entities = [point_id, segment_ref]
        elif primitive_type == "point_on_circle":
            point_id = register_point(raw.get("point") or raw.get("entity"))
            circle_ref = self._normalize_circle_ref(
                raw.get("circle") or raw.get("circle_id") or raw.get("center"),
                circle_ids_by_center,
            )
            entities = [point_id, circle_ref]
        elif primitive_type == "midpoint":
            midpoint = register_point(raw.get("point") or raw.get("midpoint"))
            segment_ref = self._normalize_segment_ref(
                raw.get("segment") or raw.get("line"),
                register_point=register_point,
                segment_points=segment_points,
            )
            entities = [midpoint, segment_ref]
        elif primitive_type == "collinear":
            entities = [register_point(item) for item in self._extract_point_list(raw)]
        elif primitive_type in {"parallel", "perpendicular", "equal_length"}:
            entities = self._extract_binary_segment_relation_entities(
                raw,
                register_point=register_point,
                segment_points=segment_points,
            )
        elif primitive_type == "intersect":
            point_id = register_point(raw.get("point") or raw.get("intersection"))
            segment_entities = self._extract_binary_segment_relation_entities(
                raw,
                register_point=register_point,
                segment_points=segment_points,
            )
            if point_id and len(segment_entities) >= 2:
                entities = [point_id, segment_entities[0], segment_entities[1]]
            else:
                entities = self._extract_relation_entities(
                    raw,
                    register_point=register_point,
                    segment_points=segment_points,
                )
        else:
            entities = [
                self._normalize_generic_entity(item, register_point, segment_points)
                for item in (raw.get("entities") or [])
            ]

        entities = [item for item in entities if item]
        if len(entities) < 2:
            return None
        return {"type": primitive_type, "entities": entities}

    def _compile_measurement(
        self,
        raw: Any,
        *,
        measurement_type: str,
        register_point,
        segment_points: Dict[str, Tuple[str, str]],
    ) -> Optional[Dict[str, Any]]:
        if not isinstance(raw, dict):
            return None
        value = raw.get("value")
        if value is None:
            return None

        if measurement_type == "length":
            entities = [
                register_point(item)
                for item in self._extract_segment_endpoints(
                    raw.get("segment")
                    or raw.get("line")
                    or raw.get("entities")
                    or raw
                )
            ]
        elif measurement_type == "angle":
            entities = [register_point(item) for item in self._extract_angle_points(raw)]
        elif measurement_type == "ratio":
            entities = self._extract_relation_entities(
                raw,
                register_point=register_point,
                segment_points=segment_points,
            )
        else:
            entities = [
                self._normalize_generic_entity(item, register_point, segment_points)
                for item in (raw.get("entities") or [])
            ]

        entities = [item for item in entities if item]
        if not entities:
            return None
        return {"type": measurement_type, "entities": entities, "value": value}

    def _extract_relation_entities(
        self,
        raw: Dict[str, Any],
        *,
        register_point,
        segment_points: Dict[str, Tuple[str, str]],
    ) -> List[str]:
        entities: List[str] = []
        for pair in (("segment1", "segment2"), ("line1", "line2"), ("object1", "object2")):
            first = raw.get(pair[0])
            second = raw.get(pair[1])
            if first and second:
                for item in (first, second):
                    entity = self._normalize_generic_entity(item, register_point, segment_points)
                    if entity:
                        entities.append(entity)
                if entities:
                    return entities
        for key in ("entities", "items", "lines", "segments", "objects"):
            value = raw.get(key)
            if not value:
                continue
            for item in value:
                entity = self._normalize_generic_entity(item, register_point, segment_points)
                if entity:
                    entities.append(entity)
            if entities:
                return entities
        return entities

    def _extract_binary_segment_relation_entities(
        self,
        raw: Dict[str, Any],
        *,
        register_point,
        segment_points: Dict[str, Tuple[str, str]],
    ) -> List[str]:
        entities = self._extract_relation_entities(
            raw,
            register_point=register_point,
            segment_points=segment_points,
        )
        if len(entities) >= 2:
            return entities[:2]
        direct_pairs = [
            raw.get("segment1"),
            raw.get("segment2"),
            raw.get("line1"),
            raw.get("line2"),
        ]
        normalized: List[str] = []
        for item in direct_pairs:
            entity = self._normalize_generic_entity(item, register_point, segment_points)
            if entity:
                normalized.append(entity)
        return normalized[:2]

    def _normalize_polygon_interior_ref(self, raw: Any) -> str:
        value = str(raw or "").strip()
        if not value:
            return ""
        match = re.fullmatch(r"interior_of_([A-Za-z]\d*'*[A-Za-z]\d*'*[A-Za-z]\d*'*(?:[A-Za-z]\d*'*)+)", value)
        if not match:
            return ""
        polygon_token = match.group(1).replace(" ", "")
        points = re.findall(r"[A-Za-z]\d*'*", polygon_token)
        if len(points) < 3 or "".join(points) != polygon_token:
            return ""
        normalized = [self._normalize_point_id(point) for point in points]
        normalized = [point for point in normalized if point]
        if len(normalized) < 3:
            return ""
        return "poly_" + "".join(normalized)

    def _normalize_polygon_exterior_ref(self, raw: Any) -> str:
        value = str(raw or "").strip()
        if not value:
            return ""
        match = re.fullmatch(r"(?:outside|exterior)_of_([A-Za-z]\d*'*[A-Za-z]\d*'*[A-Za-z]\d*'*(?:[A-Za-z]\d*'*)+)", value)
        if not match:
            return ""
        polygon_token = match.group(1).replace(" ", "")
        points = re.findall(r"[A-Za-z]\d*'*", polygon_token)
        if len(points) < 3 or "".join(points) != polygon_token:
            return ""
        normalized = [self._normalize_point_id(point) for point in points]
        normalized = [point for point in normalized if point]
        if len(normalized) < 3:
            return ""
        return "poly_" + "".join(normalized)

    def _normalize_generic_entity(
        self,
        raw: Any,
        register_point,
        segment_points: Dict[str, Tuple[str, str]],
    ) -> str:
        segment_ref = self._normalize_segment_ref(
            raw,
            register_point=register_point,
            segment_points=segment_points,
        )
        if segment_ref:
            return segment_ref
        return register_point(raw)

    def _normalize_segment_ref(
        self,
        raw: Any,
        *,
        register_point,
        segment_points: Dict[str, Tuple[str, str]],
    ) -> str:
        if raw is None:
            return ""
        if isinstance(raw, str):
            value = raw.strip()
            if not value:
                return ""
            if value in segment_points:
                return value
            if value.startswith("seg_"):
                return value
            endpoints = self._split_segment_token(value)
            if len(endpoints) == 2:
                first = register_point(endpoints[0])
                second = register_point(endpoints[1])
                if first and second and first != second:
                    for segment_id, refs in segment_points.items():
                        if set(refs) == {first, second}:
                            return segment_id
                    return f"seg_{first}{second}"
            return value
        if isinstance(raw, (list, tuple)):
            endpoints = [register_point(item) for item in raw]
            endpoints = [item for item in endpoints if item]
            if len(endpoints) == 2 and endpoints[0] != endpoints[1]:
                for segment_id, refs in segment_points.items():
                    if set(refs) == {endpoints[0], endpoints[1]}:
                        return segment_id
                return f"seg_{endpoints[0]}{endpoints[1]}"
        if isinstance(raw, dict):
            endpoints = [register_point(item) for item in self._extract_segment_endpoints(raw)]
            endpoints = [item for item in endpoints if item]
            if len(endpoints) == 2 and endpoints[0] != endpoints[1]:
                for segment_id, refs in segment_points.items():
                    if set(refs) == {endpoints[0], endpoints[1]}:
                        return segment_id
                return f"seg_{endpoints[0]}{endpoints[1]}"
            raw_id = str(raw.get("id", "")).strip()
            if raw_id:
                return raw_id
        return ""

    def _normalize_circle_ref(
        self,
        raw: Any,
        circle_ids_by_center: Dict[str, str],
    ) -> str:
        value = str(raw or "").strip()
        if not value:
            return ""
        if value in circle_ids_by_center:
            return circle_ids_by_center[value]
        return value

    def _extract_segment_endpoints(self, raw: Any) -> List[str]:
        if isinstance(raw, str):
            return self._split_segment_token(raw)
        if isinstance(raw, (list, tuple)):
            return [str(item).strip() for item in raw if str(item).strip()]
        if not isinstance(raw, dict):
            return []
        for key in ("points", "endpoints", "segment", "line", "vertices", "entities"):
            value = raw.get(key)
            if value is None:
                continue
            if isinstance(value, str):
                split = self._split_segment_token(value)
                if split:
                    return split
            if isinstance(value, (list, tuple)):
                result = [str(item).strip() for item in value if str(item).strip()]
                if result:
                    return result
        return []

    def _extract_arc_endpoints(self, raw: Any) -> List[str]:
        if not isinstance(raw, dict):
            return []
        points = self._extract_point_list(
            raw.get("points")
            or raw.get("endpoints")
            or [raw.get("start"), raw.get("end")]
        )
        if len(points) >= 2:
            return [points[0], points[-1]]
        return []

    def _extract_angle_points(self, raw: Any) -> List[str]:
        if isinstance(raw, dict):
            vertex = str(raw.get("vertex", "")).strip()
            sides = raw.get("sides")
            if vertex and isinstance(sides, (list, tuple)) and len(sides) == 2:
                refs: List[str] = []
                for side in sides:
                    side_token = str(side).strip()
                    if self._normalize_point_id(side_token) and side_token != vertex:
                        refs.append(side_token)
                        continue
                    endpoints = self._extract_segment_endpoints(side)
                    for endpoint in endpoints:
                        if endpoint != vertex:
                            refs.append(endpoint)
                            break
                if len(refs) == 2:
                    return [refs[0], vertex, refs[1]]
        return self._extract_point_list(raw)

    def _extract_polygon_points(self, raw: Any) -> List[str]:
        if isinstance(raw, str):
            token = self._strip_polygon_markers(raw)
            refs = re.findall(r"[A-Za-z]\d*'*", token)
            if len(refs) >= 3 and "".join(refs) == token:
                return refs
        return self._extract_point_list(raw)

    def _extract_point_list(self, raw: Any) -> List[str]:
        if raw is None:
            return []
        if isinstance(raw, str):
            token = raw.strip()
            if not token:
                return []
            if "," in token:
                return [item.strip() for item in token.split(",") if item.strip()]
            return [token]
        if isinstance(raw, (list, tuple)):
            result: List[str] = []
            for item in raw:
                if isinstance(item, dict):
                    point_id = item.get("id") or item.get("name") or item.get("label")
                    if point_id:
                        result.append(str(point_id).strip())
                else:
                    value = str(item).strip()
                    if value:
                        result.append(value)
            return result
        if isinstance(raw, dict):
            for key in ("points", "vertices", "entities", "items"):
                value = raw.get(key)
                if value:
                    return self._extract_point_list(value)
            point_id = raw.get("id") or raw.get("name") or raw.get("label")
            if point_id:
                return [str(point_id).strip()]
        return []

    def _iter_points(self, raw: Any) -> Iterable[str]:
        if raw is None:
            return []
        if isinstance(raw, dict):
            return [str(key).strip() for key in raw.keys() if str(key).strip()]
        if isinstance(raw, (list, tuple)):
            items: List[str] = []
            for item in raw:
                if isinstance(item, dict):
                    point_id = item.get("id") or item.get("name") or item.get("label")
                    if point_id:
                        items.append(str(point_id).strip())
                else:
                    value = str(item).strip()
                    if value:
                        items.append(value)
            return items
        return [str(raw).strip()] if str(raw).strip() else []

    def _normalize_roles(self, raw_roles: Dict[str, Any]) -> Dict[str, str]:
        roles: Dict[str, str] = {}
        if not isinstance(raw_roles, dict):
            return roles
        for raw_key, raw_value in raw_roles.items():
            key = str(raw_key).strip().lower().replace(" ", "_")
            value = self._normalize_point_id(raw_value)
            if key and value:
                roles[key] = value
        return roles

    def _normalize_point_id(self, raw: Any) -> str:
        value = str(raw or "").strip()
        if not value:
            return ""
        value = value.replace(" ", "")
        if value.startswith("seg_") or value.startswith("circle_") or value.startswith("arc_"):
            return ""
        if re.fullmatch(r"[A-Za-z]", value):
            return value.upper()
        if re.fullmatch(r"[A-Za-z]\d+", value):
            return value[0].upper() + value[1:]
        if re.fullmatch(r"[A-Za-z]'+", value):
            return value[0].upper() + value[1:]
        if re.fullmatch(r"[A-Za-z]\d+'*", value):
            return value[0].upper() + value[1:]
        return ""

    def _split_segment_token(self, value: str) -> List[str]:
        token = str(value or "").strip().replace(" ", "")
        if not token:
            return []
        if token.startswith("seg_"):
            token = token[4:]
        parts = re.findall(r"[A-Za-z]\d*'*", token)
        if len(parts) == 2 and "".join(parts) == token:
            return parts
        return []

    def _primitive_id(self, raw: Any, fallback: str) -> str:
        if isinstance(raw, dict):
            raw_id = str(raw.get("id", "")).strip()
            if raw_id:
                return raw_id.replace(" ", "_")
        return fallback.replace(" ", "_")

    def _coerce_float(self, value: Any, *, default: float) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    def _ordered_unique(self, items: Iterable[str]) -> List[str]:
        result: List[str] = []
        seen: set[str] = set()
        for item in items:
            if item in seen:
                continue
            seen.add(item)
            result.append(item)
        return result

    def _dedupe_objects(self, items: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
        result: List[Dict[str, Any]] = []
        seen: set[Tuple[str, str]] = set()
        for item in items:
            signature = (
                str(item.get("type", "")).strip().lower(),
                repr(sorted(item.items(), key=lambda pair: pair[0])),
            )
            if signature in seen:
                continue
            seen.add(signature)
            result.append(item)
        return result

    def _sanitize_constraints(
        self,
        *,
        constraints: Sequence[Dict[str, Any]],
        primitives: Sequence[Dict[str, Any]],
        measurements: Sequence[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        primitive_map = {
            str(item.get("id", "")).strip(): item
            for item in primitives
            if isinstance(item, dict) and item.get("id")
        }
        circle_members: Dict[str, set[str]] = {}
        for constraint in constraints:
            if str(constraint.get("type", "")).strip().lower() != "point_on_circle":
                continue
            entities = [str(item).strip() for item in (constraint.get("entities") or [])]
            if len(entities) == 2 and entities[0] and entities[1]:
                circle_members.setdefault(entities[1], set()).add(entities[0])

        sanitized: List[Dict[str, Any]] = []
        for constraint in constraints:
            relation_type = str(constraint.get("type", "")).strip().lower()
            entities = [str(item).strip() for item in (constraint.get("entities") or []) if str(item).strip()]
            if not entities:
                continue

            if relation_type == "equal_length" and len(entities) > 2:
                anchor = entities[0]
                for other in entities[1:]:
                    if other != anchor:
                        sanitized.append({"type": "equal_length", "entities": [anchor, other]})
                continue

            if relation_type == "collinear":
                unique_entities = list(dict.fromkeys(entities))
                if len(unique_entities) != 3:
                    continue
                if self._points_on_same_circle(unique_entities, circle_members):
                    continue
                if self._points_form_triangle_polygon(unique_entities, primitive_map):
                    continue
                if self._conflicts_with_angle_measurement(
                    relation_type,
                    unique_entities,
                    primitive_map,
                    measurements,
                ):
                    continue
                sanitized.append({"type": "collinear", "entities": unique_entities})
                continue

            if relation_type in {"point_on_segment", "midpoint"}:
                if len(entities) != 2:
                    continue
                point_id, segment_id = entities
                endpoints = self._segment_from_primitive(segment_id, primitive_map)
                if endpoints is None or point_id in endpoints:
                    continue
                if self._point_lies_on_same_circle_as_segment(point_id, endpoints, circle_members):
                    continue
                if self._conflicts_with_angle_measurement(
                    relation_type,
                    [point_id, segment_id],
                    primitive_map,
                    measurements,
                ):
                    continue
                sanitized.append({"type": relation_type, "entities": [point_id, segment_id]})
                continue

            if relation_type == "point_in_polygon":
                if len(entities) != 2:
                    continue
                point_id, polygon_id = entities
                primitive = primitive_map.get(polygon_id)
                if not primitive or str(primitive.get("type", "")).strip().lower() != "polygon":
                    continue
                refs = [str(item).strip() for item in (primitive.get("points") or []) if str(item).strip()]
                if point_id in refs or len(refs) < 3:
                    continue
                sanitized.append({"type": relation_type, "entities": [point_id, polygon_id]})
                continue

            if relation_type == "point_outside_polygon":
                if len(entities) != 2:
                    continue
                point_id, polygon_id = entities
                primitive = primitive_map.get(polygon_id)
                if not primitive or str(primitive.get("type", "")).strip().lower() != "polygon":
                    continue
                refs = [str(item).strip() for item in (primitive.get("points") or []) if str(item).strip()]
                if point_id in refs or len(refs) < 3:
                    continue
                sanitized.append({"type": relation_type, "entities": [point_id, polygon_id]})
                continue

            if relation_type in {"parallel", "perpendicular", "equal_length"}:
                if len(entities) != 2:
                    continue
                if not all(self._segment_from_primitive(item, primitive_map) for item in entities):
                    continue
                sanitized.append({"type": relation_type, "entities": entities})
                continue

            if relation_type == "intersect":
                if len(entities) != 3:
                    continue
                if not all(self._segment_from_primitive(item, primitive_map) for item in entities[:2]):
                    continue
                sanitized.append({"type": relation_type, "entities": entities})
                continue

            if relation_type == "point_on_circle" and len(entities) == 2:
                sanitized.append({"type": relation_type, "entities": entities})

        return sanitized

    def _conflicts_with_angle_measurement(
        self,
        relation_type: str,
        entities: Sequence[str],
        primitive_map: Dict[str, Dict[str, Any]],
        measurements: Sequence[Dict[str, Any]],
    ) -> bool:
        angle_measurements = [
            item
            for item in measurements
            if str(item.get("type", "")).strip().lower() == "angle"
        ]
        if not angle_measurements:
            return False

        if relation_type == "point_on_segment" and len(entities) == 2:
            point_id, segment_id = entities
            endpoints = self._segment_from_primitive(segment_id, primitive_map)
            if endpoints is None:
                return False
            return self._has_non_straight_angle_measurement(
                point_id,
                endpoints[0],
                endpoints[1],
                angle_measurements,
            )

        if relation_type == "collinear" and len(entities) == 3:
            a, b, c = entities
            candidates = ((a, b, c), (b, a, c), (c, a, b))
            return any(
                self._has_non_straight_angle_measurement(vertex, first, second, angle_measurements)
                for vertex, first, second in candidates
            )

        return False

    def _has_non_straight_angle_measurement(
        self,
        vertex: str,
        first: str,
        second: str,
        measurements: Sequence[Dict[str, Any]],
    ) -> bool:
        pair = {str(first).strip(), str(second).strip()}
        for item in measurements:
            entities = [str(entity).strip() for entity in (item.get("entities") or []) if str(entity).strip()]
            if len(entities) != 3:
                continue
            if entities[1] != vertex:
                continue
            if {entities[0], entities[2]} != pair:
                continue
            try:
                value = float(item.get("value"))
            except (TypeError, ValueError):
                continue
            if abs(value - 180.0) > 1e-2 and value > 1e-2:
                return True
        return False

    def _sanitize_measurements(
        self,
        measurements: Sequence[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        sanitized: List[Dict[str, Any]] = []
        for measurement in measurements:
            measurement_type = str(measurement.get("type", "")).strip().lower()
            entities = [str(item).strip() for item in (measurement.get("entities") or []) if str(item).strip()]
            value = measurement.get("value")
            if value is None:
                continue
            if measurement_type == "length" and len(entities) != 2:
                continue
            if measurement_type == "angle" and len(entities) != 3:
                continue
            if measurement_type == "ratio" and len(entities) < 2:
                continue
            if len(set(entities)) != len(entities):
                continue
            sanitized.append({"type": measurement_type, "entities": entities, "value": value})
        return sanitized

    def _segment_from_primitive(
        self,
        segment_id: str,
        primitive_map: Dict[str, Dict[str, Any]],
    ) -> Optional[Tuple[str, str]]:
        primitive = primitive_map.get(segment_id)
        if not primitive or str(primitive.get("type", "")).strip().lower() != "segment":
            return None
        refs = [str(item).strip() for item in (primitive.get("points") or []) if str(item).strip()]
        if len(refs) != 2:
            return None
        return refs[0], refs[1]

    def _points_on_same_circle(
        self,
        points: Sequence[str],
        circle_members: Dict[str, set[str]],
    ) -> bool:
        point_set = set(points)
        for members in circle_members.values():
            if point_set.issubset(members):
                return True
        return False

    def _points_form_triangle_polygon(
        self,
        points: Sequence[str],
        primitive_map: Dict[str, Dict[str, Any]],
    ) -> bool:
        point_set = set(points)
        if len(point_set) != 3:
            return False
        for primitive in primitive_map.values():
            if str(primitive.get("type", "")).strip().lower() != "polygon":
                continue
            refs = [str(item).strip() for item in (primitive.get("points") or []) if str(item).strip()]
            if len(refs) == 3 and set(refs) == point_set:
                return True
        return False

    def _strip_polygon_markers(self, raw: Any) -> str:
        token = str(raw or "").strip().replace(" ", "")
        if not token:
            return ""
        token = re.sub(r"^(?:△|▲|▵|三角形|triangle|tri)\s*", "", token, flags=re.IGNORECASE)
        token = token.lstrip("鈻砅矨")
        return token

    def _ensure_polygon_edges(
        self,
        *,
        primitives: List[Dict[str, Any]],
        register_point,
        segment_points: Dict[str, Tuple[str, str]],
    ) -> None:
        existing_pairs = {frozenset(points) for points in segment_points.values() if len(points) == 2}
        additions: List[Dict[str, Any]] = []
        for primitive in primitives:
            if str(primitive.get("type", "")).strip().lower() != "polygon":
                continue
            refs = [register_point(item) for item in (primitive.get("points") or [])]
            refs = [item for item in refs if item]
            if len(refs) < 3:
                continue
            for index, start in enumerate(refs):
                end = refs[(index + 1) % len(refs)]
                pair = frozenset((start, end))
                if len(pair) != 2 or pair in existing_pairs:
                    continue
                segment_id = f"seg_{start}{end}"
                additions.append({"id": segment_id, "type": "segment", "points": [start, end]})
                segment_points[segment_id] = (start, end)
                existing_pairs.add(pair)
        primitives.extend(additions)

    def _infer_constraints_from_text(
        self,
        *,
        facts: Dict[str, Any],
        register_point,
        primitives: Sequence[Dict[str, Any]],
        segment_points: Dict[str, Tuple[str, str]],
    ) -> List[Dict[str, Any]]:
        primitive_map = {
            str(item.get("id", "")).strip(): item
            for item in primitives
            if isinstance(item, dict) and item.get("id")
        }
        constraints: List[Dict[str, Any]] = []
        seen: set[Tuple[str, Tuple[str, ...]]] = set()

        def push(relation_type: str, entities: List[str]) -> None:
            signature = (relation_type, tuple(entities))
            if signature in seen:
                return
            seen.add(signature)
            constraints.append({"type": relation_type, "entities": entities})

        def add_equilateral_constraints(raw_text: str) -> None:
            for triangle_points in self._extract_triangle_tokens(raw_text):
                if len(triangle_points) != 3:
                    continue
                a, b, c = [register_point(item) for item in triangle_points]
                if not a or not b or not c:
                    continue
                seg_ab = self._normalize_segment_ref([a, b], register_point=register_point, segment_points=segment_points)
                seg_bc = self._normalize_segment_ref([b, c], register_point=register_point, segment_points=segment_points)
                seg_ca = self._normalize_segment_ref([c, a], register_point=register_point, segment_points=segment_points)
                if seg_ab and seg_bc:
                    push("equal_length", [seg_ab, seg_bc])
                if seg_bc and seg_ca:
                    push("equal_length", [seg_bc, seg_ca])

        for measurement in facts.get("measurements") or []:
            if not isinstance(measurement, dict):
                continue
            text_blob = " ".join(
                str(measurement.get(key, "")).strip()
                for key in ("description", "name", "implied_by")
                if str(measurement.get(key, "")).strip()
            )
            if self._mentions_equilateral(text_blob):
                add_equilateral_constraints(text_blob)

        for text_blob in [str(facts.get("problem_text", "")).strip(), str(facts.get("source_text", "")).strip()]:
            if self._mentions_equilateral(text_blob):
                add_equilateral_constraints(text_blob)

        return constraints

    def _infer_display(
        self,
        *,
        facts: Dict[str, Any],
        primitives: Sequence[Dict[str, Any]],
        segment_points: Dict[str, Tuple[str, str]],
    ) -> Dict[str, Any]:
        display: Dict[str, Any] = {"points": {}, "primitives": {}}
        segment_lookup = {
            frozenset(points): segment_id
            for segment_id, points in segment_points.items()
            if len(points) == 2
        }
        construction_segments: set[str] = set()
        sources = [str(item).strip() for item in (facts.get("ambiguities") or []) if str(item).strip()]
        sources.extend(
            str(item.get("description", "")).strip()
            for item in (facts.get("measurements") or [])
            if isinstance(item, dict) and str(item.get("description", "")).strip()
        )
        for text in sources:
            if not self._mentions_construction(text):
                continue
            for first, second in self._construction_segment_tokens(text):
                segment_id = segment_lookup.get(frozenset((first, second)))
                if segment_id:
                    construction_segments.add(segment_id)

        explicit_display = facts.get("display")
        if isinstance(explicit_display, dict):
            if isinstance(explicit_display.get("points"), dict):
                display["points"].update(copy.deepcopy(explicit_display["points"]))
            if isinstance(explicit_display.get("primitives"), dict):
                display["primitives"].update(copy.deepcopy(explicit_display["primitives"]))

        for primitive in primitives:
            primitive_id = str(primitive.get("id", "")).strip()
            if not primitive_id:
                continue
            primitive_type = str(primitive.get("type", "")).strip().lower()
            payload = display["primitives"].setdefault(primitive_id, {})
            if primitive_type == "segment":
                payload.setdefault("style", "solid")
                payload.setdefault("role", "interior_link")
            elif primitive_type == "polygon":
                payload.setdefault("role", "polygon")
        for segment_id in construction_segments:
            payload = display["primitives"].setdefault(segment_id, {})
            payload["style"] = "dashed"
            payload["role"] = "construction"

        return display

    def _mentions_equilateral(self, text: str) -> bool:
        lowered = str(text or "").lower()
        return "正三角形" in lowered or "equilateral" in lowered

    def _mentions_construction(self, text: str) -> bool:
        lowered = str(text or "").lower()
        return any(token in lowered for token in ("dashed", "construction", "虚线", "辅助线"))

    def _extract_triangle_tokens(self, text: str) -> List[List[str]]:
        tokens: List[List[str]] = []
        normalized = self._strip_polygon_markers(text)
        for match in re.finditer(r"(?:△|▲|▵|triangle\s*)([A-Za-z]\d*'*[A-Za-z]\d*'*[A-Za-z]\d*'*)", str(text or ""), flags=re.IGNORECASE):
            refs = re.findall(r"[A-Za-z]\d*'*", match.group(1))
            if len(refs) == 3:
                tokens.append(refs)
        if not tokens:
            refs = re.findall(r"[A-Za-z]\d*'*", normalized)
            if len(refs) == 3:
                tokens.append(refs)
        return tokens

    def _extract_segment_tokens(self, text: str) -> List[Tuple[str, str]]:
        result: List[Tuple[str, str]] = []
        pattern = re.compile(r"(?<![A-Za-z0-9'])([A-Za-z]\d*'*[A-Za-z]\d*'*)(?![A-Za-z0-9'])")
        for match in pattern.finditer(str(text or "")):
            token = match.group(1)
            refs = self._split_segment_token(token)
            if len(refs) == 2:
                first = self._normalize_point_id(refs[0])
                second = self._normalize_point_id(refs[1])
                if first and second and first != second:
                    result.append((first, second))
        return result

    def _construction_segment_tokens(self, text: str) -> List[Tuple[str, str]]:
        content = str(text or "")
        for match in re.finditer(
            r"(?:construction|虚线|辅助线)[^()（）]*[\(（]([^()（）]+)[\)）]",
            content,
            flags=re.IGNORECASE,
        ):
            tokens = self._extract_segment_tokens(match.group(1))
            if tokens:
                return tokens
        return []

    def _point_lies_on_same_circle_as_segment(
        self,
        point_id: str,
        endpoints: Tuple[str, str],
        circle_members: Dict[str, set[str]],
    ) -> bool:
        for members in circle_members.values():
            if point_id in members and endpoints[0] in members and endpoints[1] in members:
                return True
        return False

    def _construction_segment_tokens(self, text: str) -> List[Tuple[str, str]]:
        content = str(text or "")
        scoped_patterns = [
            r"(?:construction|辅助线|虚线)[^()（）]*[\(（]([^()（）]+)[\)）]",
            r"(?:dashed(?:\s+lines?)?\s+for\s+)([^.;:]+)",
            r"(?:construction(?:\s+lines?)?\s+for\s+)([^.;:]+)",
            r"(?:虚线|辅助线)[^。；;:：]*",
        ]
        for pattern in scoped_patterns:
            for match in re.finditer(pattern, content, flags=re.IGNORECASE):
                candidate = match.group(1) if match.lastindex else match.group(0)
                tokens = self._extract_segment_tokens(candidate)
                if tokens:
                    return tokens
        return []

    def _mentions_construction(self, text: str) -> bool:
        lowered = str(text or "").lower()
        keywords = ("dashed", "construction", "虚线", "辅助线")
        return any(keyword in lowered for keyword in keywords)
