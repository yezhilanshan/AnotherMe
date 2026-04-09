import unittest

from agents.coordinate_scene import CoordinateSceneCompiler, CoordinateSceneError
from agents.codegen import TemplateCodeGenerator


class CoordinateSceneCompilerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.compiler = CoordinateSceneCompiler()

    def test_validate_coordinate_scene_resolves_reflected_point(self) -> None:
        coordinate_scene = {
            "mode": "2d",
            "points": [
                {"id": "C", "coord": [0, 0]},
                {"id": "B", "coord": [0, 6]},
                {"id": "A", "coord": [8, 0]},
                {"id": "D", "coord": [3, 0]},
                {"id": "C1", "derived": {"type": "reflect_point", "source": "C", "axis": ["B", "D"]}},
            ],
            "primitives": [
                {"id": "seg_AB", "type": "segment", "points": ["A", "B"]},
                {"id": "seg_BC", "type": "segment", "points": ["B", "C"]},
                {"id": "seg_AC", "type": "segment", "points": ["A", "C"]},
                {"id": "seg_BD", "type": "segment", "points": ["B", "D"]},
                {"id": "seg_BC1", "type": "segment", "points": ["B", "C1"]},
                {"id": "seg_DC1", "type": "segment", "points": ["D", "C1"]},
                {"id": "poly_ABC", "type": "polygon", "points": ["A", "B", "C"]},
                {"id": "poly_ADC1", "type": "polygon", "points": ["A", "D", "C1"]},
                {"id": "right_C", "type": "right_angle", "points": ["A", "C", "B"]},
            ],
            "constraints": [
                {"type": "point_on_segment", "entities": ["D", "seg_AC"]},
                {"type": "perpendicular", "entities": ["seg_AC", "seg_BC"]},
                {"type": "collinear", "entities": ["A", "D", "C"]},
                {"type": "equal_length", "entities": ["seg_BC", "seg_BC1"]},
            ],
            "display": {},
            "measurements": [
                {"type": "length", "entities": ["B", "C"], "value": 6},
                {"type": "length", "entities": ["A", "C"], "value": 8},
                {"type": "length", "entities": ["C", "D"], "value": 3},
                {"type": "angle", "entities": ["A", "C", "B"], "value": 90},
            ],
        }

        report = self.compiler.validate_coordinate_scene(coordinate_scene)
        self.assertTrue(report["is_valid"])
        point_lookup = {item["id"]: item["coord"] for item in report["resolved_scene"]["points"]}
        self.assertEqual(point_lookup["C1"], [4.8, 2.4])

    def test_normalize_geometry_spec_canonicalizes_prime_label(self) -> None:
        spec = {
            "templates": ["right_triangle"],
            "points": [{"id": "A"}, {"id": "B"}, {"id": "C"}, {"id": "C'"}],
            "primitives": [{"type": "segment", "points": ["A", "C'"]}],
            "constraints": [],
            "measurements": [],
        }
        normalized = self.compiler.normalize_geometry_spec(spec)
        point_ids = [item["id"] for item in normalized["points"]]
        self.assertIn("C1", point_ids)
        self.assertEqual(normalized["display"]["points"]["C1"]["label"], "C'")

    def test_solve_right_triangle_geometry_spec(self) -> None:
        spec = {
            "templates": ["right_triangle"],
            "roles": {"right_vertex": "C", "horizontal_point": "A", "vertical_point": "B"},
            "points": [{"id": "A"}, {"id": "B"}, {"id": "C"}],
            "primitives": [{"id": "poly_ABC", "type": "polygon", "points": ["A", "B", "C"]}],
            "constraints": [{"type": "perpendicular", "entities": ["seg_AC", "seg_BC"]}],
            "measurements": [
                {"type": "length", "entities": ["A", "C"], "value": 8},
                {"type": "length", "entities": ["B", "C"], "value": 6},
            ],
        }
        scene = self.compiler.compile(geometry_spec=spec)
        point_lookup = {item["id"]: item["coord"] for item in scene["points"]}
        self.assertEqual(point_lookup["C"], [0.0, 0.0])
        self.assertEqual(point_lookup["A"], [8.0, 0.0])
        self.assertEqual(point_lookup["B"], [0.0, 6.0])

    def test_solve_rectangle_geometry_spec(self) -> None:
        spec = {
            "templates": ["rectangle"],
            "points": [{"id": "A"}, {"id": "B"}, {"id": "C"}, {"id": "D"}],
            "primitives": [{"id": "poly_ABCD", "type": "polygon", "points": ["A", "B", "C", "D"]}],
            "constraints": [
                {"type": "parallel", "entities": ["seg_AB", "seg_CD"]},
                {"type": "parallel", "entities": ["seg_BC", "seg_AD"]},
                {"type": "perpendicular", "entities": ["seg_AB", "seg_BC"]},
            ],
            "measurements": [
                {"type": "length", "entities": ["A", "B"], "value": 10},
                {"type": "length", "entities": ["B", "C"], "value": 4},
            ],
        }
        scene = self.compiler.compile(geometry_spec=spec)
        point_lookup = {item["id"]: item["coord"] for item in scene["points"]}
        self.assertEqual(point_lookup["A"], [0.0, 0.0])
        self.assertEqual(point_lookup["B"], [10.0, 0.0])
        self.assertEqual(point_lookup["C"], [10.0, 4.0])
        self.assertEqual(point_lookup["D"], [0.0, 4.0])

    def test_solve_circle_geometry_spec(self) -> None:
        spec = {
            "templates": ["circle_basic"],
            "points": [{"id": "O"}, {"id": "A"}, {"id": "B"}],
            "primitives": [{"id": "circle_OA", "type": "circle", "center": "O", "radius_point": "A"}],
            "constraints": [{"type": "point_on_circle", "entities": ["B", "circle_OA"]}],
            "measurements": [{"type": "length", "entities": ["O", "A"], "value": 5}],
        }
        scene = self.compiler.compile(geometry_spec=spec)
        report = self.compiler.validate_coordinate_scene(scene)
        self.assertTrue(report["is_valid"])
        point_lookup = {item["id"]: item["coord"] for item in report["resolved_scene"]["points"]}
        self.assertAlmostEqual(point_lookup["A"][0], 5.0, places=6)
        self.assertAlmostEqual(point_lookup["A"][1], 0.0, places=6)

    def test_point_on_segment_without_measurement_fails_conservatively(self) -> None:
        spec = {
            "templates": ["right_triangle"],
            "points": [{"id": "A"}, {"id": "B"}, {"id": "C"}, {"id": "D"}],
            "primitives": [
                {"id": "poly_ABC", "type": "polygon", "points": ["A", "B", "C"]},
                {"id": "seg_AC", "type": "segment", "points": ["A", "C"]},
            ],
            "constraints": [{"type": "point_on_segment", "entities": ["D", "seg_AC"]}],
            "measurements": [
                {"type": "length", "entities": ["A", "C"], "value": 8},
                {"type": "length", "entities": ["B", "C"], "value": 6},
            ],
        }
        with self.assertRaises(CoordinateSceneError):
            self.compiler.compile(geometry_spec=spec)


class TemplateCodeGeneratorTests(unittest.TestCase):
    def test_codegen_uses_circle_primitive(self) -> None:
        generator = TemplateCodeGenerator(
            {
                "frame_height": 8.0,
                "frame_width": 14.222,
                "pixel_height": 1080,
                "pixel_width": 1920,
                "safe_margin": 0.4,
                "left_panel_x_max": 1.0,
            }
        )
        coordinate_scene = {
            "mode": "2d",
            "points": [
                {"id": "O", "coord": [0, 0]},
                {"id": "A", "coord": [5, 0]},
                {"id": "B", "coord": [0, 5]},
            ],
            "primitives": [
                {"id": "circle_OA", "type": "circle", "center": "O", "radius_point": "A"},
                {"id": "seg_AB", "type": "segment", "points": ["A", "B"]},
            ],
            "constraints": [{"type": "point_on_circle", "entities": ["B", "circle_OA"]}],
            "display": {},
            "measurements": [{"type": "length", "entities": ["O", "A"], "value": 5}],
        }
        project = type("Project", (), {"problem_text": "circle", "script_steps": []})()
        code = generator.generate(project, coordinate_scene, [])
        self.assertIn("Circle(radius=np.linalg.norm", code)
        self.assertIn("lines['seg_AB']", code)


if __name__ == "__main__":
    unittest.main()
