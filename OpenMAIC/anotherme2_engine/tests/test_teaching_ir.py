import unittest

from agents.scene_graph_updater import SceneGraphUpdater
from agents.state import ScriptStep
from agents.teaching_ir import TeachingIRPlanner


class TeachingIRTests(unittest.TestCase):
    def setUp(self) -> None:
        self.planner = TeachingIRPlanner()

    def _metadata(self):
        return {
            "drawable_scene": {
                "points": [
                    {"id": "A", "coord": [0.0, 0.0]},
                    {"id": "B", "coord": [2.0, 0.0]},
                    {"id": "C", "coord": [2.0, 1.0]},
                    {"id": "D", "coord": [0.0, 1.0]},
                    {"id": "E", "coord": [1.0, 0.0]},
                    {
                        "id": "B1",
                        "coord": [0.0, 0.0],
                        "derived": {"type": "reflect_point", "source": "B", "axis": ["D", "E"]},
                    },
                ],
                "primitives": [
                    {"id": "seg_AB", "type": "segment", "points": ["A", "B"]},
                    {"id": "seg_BC", "type": "segment", "points": ["B", "C"]},
                    {"id": "seg_CD", "type": "segment", "points": ["C", "D"]},
                    {"id": "seg_DA", "type": "segment", "points": ["D", "A"]},
                    {"id": "seg_DE", "type": "segment", "points": ["D", "E"]},
                    {"id": "poly_ABCD", "type": "polygon", "points": ["A", "B", "C", "D"]},
                ],
            },
            "geometry_spec": {"templates": ["fold"]},
            "geometry_facts": {"points": ["A", "B", "C", "D", "E"], "segments": ["DE"]},
        }

    def test_build_geometry_ir_detects_fold_axis_and_images(self) -> None:
        geometry_ir = self.planner.build_geometry_ir(
            metadata=self._metadata(),
            problem_text="在菱形ABCD中，沿 DE 折叠，B 的对应点为 B'",
        )

        self.assertEqual(geometry_ir["problem_type"], "fold_transform")
        self.assertEqual(geometry_ir["transform"]["fold_axis"], "seg_DE")
        self.assertTrue(any(item.get("image") == "B1" for item in geometry_ir["transform"]["image_pairs"]))

    def test_build_teaching_ir_generates_fold_and_auxiliary_actions(self) -> None:
        geometry_ir = self.planner.build_geometry_ir(
            metadata=self._metadata(),
            problem_text="沿DE折叠后，求像点到 BC 的距离",
        )

        steps = [
            ScriptStep(
                id=1,
                title="识别条件",
                duration=2.0,
                narration="先读图并标出折叠轴 DE。",
                visual_cues=["高亮 DE"],
            ),
            ScriptStep(
                id=2,
                title="执行折叠",
                duration=3.0,
                narration="沿 DE 折叠，得到像点，再求点到 BC 的距离。",
                visual_cues=["折叠", "距离"],
            ),
        ]

        teaching_ir = self.planner.build_teaching_ir(
            steps=steps,
            geometry_ir=geometry_ir,
            metadata=self._metadata(),
            problem_text="沿DE折叠后，求像点到 BC 的距离",
        )

        step_two = teaching_ir["steps"][1]
        action_names = [item.get("action") for item in step_two["actions"]]
        self.assertIn("animate_fold", action_names)
        self.assertIn("draw_perpendicular_auxiliary", action_names)

    def test_build_teaching_ir_does_not_emit_fold_actions_without_axis(self) -> None:
        metadata = self._metadata()
        metadata["geometry_spec"] = {"templates": ["fold"]}

        geometry_ir = self.planner.build_geometry_ir(
            metadata=metadata,
            problem_text="在该图中分析关系并计算长度。",
        )
        self.assertEqual(geometry_ir["transform"]["fold_axis"], "")

        steps = [
            ScriptStep(
                id=1,
                title="分析关系",
                duration=2.0,
                narration="先观察图形关系，不做折叠。",
                visual_cues=["高亮 AB"],
            ),
            ScriptStep(
                id=2,
                title="计算长度",
                duration=2.0,
                narration="根据已知关系计算。",
                visual_cues=["距离"],
            ),
        ]

        teaching_ir = self.planner.build_teaching_ir(
            steps=steps,
            geometry_ir=geometry_ir,
            metadata=metadata,
            problem_text="在该图中分析关系并计算长度。",
        )
        action_names = [
            item.get("action")
            for step in teaching_ir["steps"]
            for item in step.get("actions", [])
        ]

        self.assertNotIn("animate_fold", action_names)
        self.assertNotIn("create_image_point", action_names)

    def test_build_geometry_ir_recovers_fold_axis_from_coordinate_scene(self) -> None:
        metadata = self._metadata()
        metadata["coordinate_scene"] = {
            "mode": "2d",
            "points": [
                {"id": "A", "coord": [0.0, 0.0]},
                {"id": "B", "coord": [2.0, 0.0]},
                {"id": "C", "coord": [2.0, 1.0]},
                {"id": "D", "coord": [0.0, 1.0]},
                {"id": "E", "coord": [1.0, 0.0]},
                {
                    "id": "B1",
                    "derived": {"type": "reflect_point", "source": "B", "axis": ["D", "E"]},
                },
            ],
            "primitives": [
                {"id": "seg_DE", "type": "segment", "points": ["D", "E"]},
            ],
            "constraints": [],
            "display": {},
            "measurements": [],
        }

        geometry_ir = self.planner.build_geometry_ir(
            metadata=metadata,
            problem_text="在图中分析对应关系并求长度。",
        )

        self.assertEqual(geometry_ir["transform"]["fold_axis"], "seg_DE")
        self.assertTrue(any(item.get("image") == "B1" for item in geometry_ir["transform"]["image_pairs"]))

    def test_build_geometry_ir_normalizes_reversed_fold_axis_token(self) -> None:
        geometry_ir = self.planner.build_geometry_ir(
            metadata=self._metadata(),
            problem_text="在图中沿 ED 折叠后求长度。",
        )

        self.assertEqual(geometry_ir["transform"]["fold_axis"], "seg_DE")

    def test_build_geometry_ir_does_not_force_fold_axis_without_fold_signals(self) -> None:
        metadata = self._metadata()
        metadata["geometry_spec"] = {"templates": []}
        metadata["problem_pattern"] = {"problem_pattern": "metric_computation", "sub_pattern": ""}
        metadata["coordinate_scene"] = {
            "mode": "2d",
            "points": [
                {"id": "A", "coord": [0.0, 0.0]},
                {"id": "B", "coord": [2.0, 0.0]},
                {"id": "D", "coord": [0.0, 1.0]},
                {"id": "E", "coord": [1.0, 0.0]},
                {
                    "id": "B1",
                    "derived": {"type": "reflect_point", "source": "B", "axis": ["D", "E"]},
                },
            ],
            "primitives": [
                {"id": "seg_DE", "type": "segment", "points": ["D", "E"]},
            ],
            "constraints": [],
            "display": {},
            "measurements": [],
        }

        geometry_ir = self.planner.build_geometry_ir(
            metadata=metadata,
            problem_text="在图中分析关系并计算长度。",
        )

        self.assertEqual(geometry_ir["transform"]["fold_axis"], "")

    def test_scene_graph_updater_maps_teaching_actions_to_operations(self) -> None:
        updater = SceneGraphUpdater()
        base_scene = self._metadata()["drawable_scene"]
        step = ScriptStep(
            id=2,
            title="执行折叠",
            duration=2.0,
            narration="沿 DE 折叠并高亮关系。",
            visual_cues=["折叠"],
        )
        teaching_step = {
            "step_id": 2,
            "focus_targets": ["seg_DE", "B"],
            "actions": [
                {"action": "highlight_fold_axis", "axis": "seg_DE"},
                {"action": "animate_fold", "axis": "seg_DE", "targets": ["B"]},
            ],
        }

        step_scene = updater.build_step_scene(
            base_scene_graph=base_scene,
            step=step,
            step_index=2,
            teaching_step=teaching_step,
        )

        operations = step_scene["operations"]
        self.assertTrue(any(item.get("type") == "highlight" for item in operations))
        self.assertTrue(
            any(
                item.get("type") == "transform" and item.get("axis") == "seg_DE"
                for item in operations
            )
        )
        self.assertTrue(step_scene.get("allow_geometry_motion", False))

    def test_teaching_ir_keeps_step_director_fields_and_required_policy(self) -> None:
        geometry_ir = self.planner.build_geometry_ir(
            metadata=self._metadata(),
            problem_text="沿DE折叠后，比较线段关系",
        )

        steps = [
            ScriptStep(
                id=1,
                title="导演脚本步骤",
                duration=2.0,
                narration="高亮DE并说明AB=BC。",
                visual_cues=["高亮 DE"],
                spoken_formulas=["AB = BC"],
                visible_segments=["DE"],
                required_actions=[{"type": "highlight_segment", "target": "DE"}],
                animation_policy="required",
            )
        ]

        teaching_ir = self.planner.build_teaching_ir(
            steps=steps,
            geometry_ir=geometry_ir,
            metadata=self._metadata(),
            problem_text="沿DE折叠后，比较线段关系",
        )
        step_payload = teaching_ir["steps"][0]

        self.assertEqual(step_payload["animation_policy"], "required")
        self.assertEqual(step_payload["spoken_formulas"], ["AB = BC"])
        self.assertEqual(step_payload["visible_segments"], ["DE"])
        action_names = [item.get("action") for item in step_payload["actions"]]
        self.assertIn("highlight_entity", action_names)
        self.assertNotIn("draw_perpendicular_auxiliary", action_names)

    def test_scene_graph_updater_respects_required_actions_and_visible_segments(self) -> None:
        updater = SceneGraphUpdater()
        base_scene = self._metadata()["drawable_scene"]
        step = ScriptStep(
            id=1,
            title="执行约束",
            duration=2.0,
            narration="虽然文字里提到折叠，但本步只高亮。",
            visual_cues=["折叠"],
        )
        teaching_step = {
            "step_id": 1,
            "focus_targets": ["seg_DE"],
            "required_actions": [{"type": "highlight_segment", "target": "DE"}],
            "visible_segments": ["DE"],
            "animation_policy": "required",
        }

        step_scene = updater.build_step_scene(
            base_scene_graph=base_scene,
            step=step,
            step_index=1,
            teaching_step=teaching_step,
        )

        operations = step_scene["operations"]
        self.assertFalse(any(item.get("type") == "transform" for item in operations))
        primitive_display = (step_scene["scene"].get("display") or {}).get("primitives") or {}
        self.assertTrue(primitive_display.get("seg_DE", {}).get("show", False))
        self.assertFalse(primitive_display.get("seg_AB", {}).get("show", True))

    def test_scene_graph_updater_auto_infers_transform_when_only_highlight_exists(self) -> None:
        updater = SceneGraphUpdater()
        base_scene = self._metadata()["drawable_scene"]
        step = ScriptStep(
            id=2,
            title="折叠步骤",
            duration=2.0,
            narration="沿 DE 折叠得到像点。",
            visual_cues=["折叠"],
        )
        teaching_step = {
            "step_id": 2,
            "focus_targets": ["seg_DE", "B1"],
            "actions": [
                {"action": "highlight_entity", "targets": ["seg_DE"]},
            ],
            "animation_policy": "auto",
        }

        step_scene = updater.build_step_scene(
            base_scene_graph=base_scene,
            step=step,
            step_index=2,
            teaching_step=teaching_step,
        )

        operations = step_scene["operations"]
        self.assertTrue(any(item.get("type") == "transform" for item in operations))
        self.assertTrue(step_scene.get("allow_geometry_motion", False))

    def test_scene_graph_updater_skips_invalid_visible_segments_whitelist(self) -> None:
        updater = SceneGraphUpdater()
        base_scene = self._metadata()["drawable_scene"]
        step = ScriptStep(
            id=1,
            title="仅高亮",
            duration=2.0,
            narration="本步只展示已有图形。",
            visual_cues=["高亮 DE"],
        )
        teaching_step = {
            "step_id": 1,
            "focus_targets": ["seg_DE"],
            "required_actions": [{"type": "highlight_segment", "target": "DE"}],
            "visible_segments": ["cm"],
            "animation_policy": "required",
        }

        step_scene = updater.build_step_scene(
            base_scene_graph=base_scene,
            step=step,
            step_index=1,
            teaching_step=teaching_step,
        )

        primitive_display = (step_scene["scene"].get("display") or {}).get("primitives") or {}
        self.assertNotIn("show", primitive_display.get("seg_AB", {}))
        self.assertNotIn("show", primitive_display.get("seg_DE", {}))

    def test_scene_graph_updater_visible_segments_accepts_reversed_segment_token(self) -> None:
        updater = SceneGraphUpdater()
        base_scene = self._metadata()["drawable_scene"]
        step = ScriptStep(
            id=1,
            title="白名单可见性",
            duration=2.0,
            narration="仅显示折叠轴。",
            visual_cues=["高亮 DE"],
        )
        teaching_step = {
            "step_id": 1,
            "focus_targets": ["seg_DE"],
            "required_actions": [{"type": "highlight_segment", "target": "DE"}],
            "visible_segments": ["ED"],
            "animation_policy": "required",
        }

        step_scene = updater.build_step_scene(
            base_scene_graph=base_scene,
            step=step,
            step_index=1,
            teaching_step=teaching_step,
        )

        primitive_display = (step_scene["scene"].get("display") or {}).get("primitives") or {}
        self.assertTrue(primitive_display.get("seg_DE", {}).get("show", False))
        self.assertFalse(primitive_display.get("seg_AB", {}).get("show", True))

    def test_scene_graph_updater_auto_does_not_transform_axis_observation_step(self) -> None:
        updater = SceneGraphUpdater()
        base_scene = self._metadata()["drawable_scene"]
        step = ScriptStep(
            id=1,
            title="识别折叠轴",
            duration=2.0,
            narration="先高亮折叠轴 DE，不执行折叠。",
            visual_cues=["高亮 折叠轴"],
        )
        teaching_step = {
            "step_id": 1,
            "focus_targets": ["seg_DE"],
            "actions": [{"action": "highlight_entity", "targets": ["seg_DE"]}],
            "animation_policy": "auto",
        }

        step_scene = updater.build_step_scene(
            base_scene_graph=base_scene,
            step=step,
            step_index=1,
            teaching_step=teaching_step,
        )

        operations = step_scene["operations"]
        self.assertFalse(any(item.get("type") == "transform" for item in operations))


if __name__ == "__main__":
    unittest.main()
