"""
动画智能体 - 负责生成 Manim 动画代码
直接使用视觉工具分析图片，获取图形信息
"""
import json
import re
from pathlib import Path
from typing import Dict, Any, Optional, List
from langchain_core.messages import HumanMessage, SystemMessage

from .base_agent import BaseAgent
from .state import VideoProject, ScriptStep
from .vision_tool import VisionTool
from .canvas_scene import CanvasScene
from .scene_graph_updater import SceneGraphUpdater
from .animation_planner import AnimationPlanner
from .codegen import TemplateCodeGenerator


class AnimationAgent(BaseAgent):
    """动画智能体"""

    SYSTEM_PROMPT = """你是一个专业的 Manim 动画工程师，专门制作数学解题动画。

你的任务是根据视频脚本和题目图片分析，生成完整的 Manim 动画代码。

要求：
1. 【强制】代码必须完整输出，绝对不能截断、省略或用省略号代替任何部分
2. 【强制】所有字符串必须正确闭合，所有括号、引号必须成对出现
3. 使用 Manim Community Edition 语法
4. 颜色搭配美观，适合教育视频
5. 背景色使用深色系 (#1a1a2e 或类似)
6. 不要使用 `font` 参数设置字体（会报错）
7. 优先使用 `Text` 而不是 `Tex`，避免 LaTeX 依赖问题
8. 不要设置全局字体配置
9. Text 内容中避免过长的字符串，超过 20 字的文本请拆分成多行
10. 【强制】run_time 必须是合法 Python 浮点数，例如 run_time=1.5，绝对不能写成 run_time=0.01.5 或 run_time=1.5.0 等多小数点形式

【音画同步要求 - 最重要】：
10. 每个步骤开头必须调用 self.add_sound(r"音频绝对路径", time_offset=0)
    示例：self.add_sound(r"D:/output/audio/narration_001.mp3", time_offset=0)
    说明：这里的 add_sound 放在“当前步骤真正开始执行的位置”，所以 time_offset 应该相对于当前步骤起点，而不是全局累计秒数
11. 每步内所有动画 run_time 之和 + self.wait() 时长，必须严格等于该步骤的音频时长
    - 在步骤末尾加 self.wait(剩余时间) 来对齐，剩余时间 = 音频时长 - 所有动画run_time之和
    - 若剩余时间 <= 0 则不加 wait()
12. 脚本中已列出每步的音频时长；若代码按步骤顺序生成，则每步 add_sound 的 time_offset 固定为 0

输出格式（只输出代码块，不要任何解释）：
```python
# 完整的 Manim 代码
```
"""

    def __init__(self, config: Dict[str, Any], llm: Optional[Any] = None,
                 vision_tool: Optional[VisionTool] = None):
        super().__init__(config, llm)
        self.system_prompt = config.get("system_prompt", self.SYSTEM_PROMPT)
        self.vision_tool = vision_tool
        self.scene_graph_updater = SceneGraphUpdater()
        self.animation_planner = AnimationPlanner()
        self.use_template_codegen = bool(config.get("use_template_codegen", True))
        self.canvas_config = config.get("canvas_config", {
            "frame_height": 8.0,
            "frame_width": 14.222,
            "pixel_height": 1080,
            "pixel_width": 1920,
            "safe_margin": 0.4,
            "left_panel_x_max": 1.0,
            "right_panel_x_min": 1.8,
        })
        self.layout = config.get("layout", "left_graph_right_formula")
        self.output_dir = Path(config.get("output_dir", "./output"))
        self.template_codegen = TemplateCodeGenerator(self.canvas_config)

    def process(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理状态，生成 Manim 动画代码
        直接使用视觉工具分析图片获取图形细节
        """
        project = state["project"]
        if getattr(project, "status", "") == "failed":
            return state
        script_steps = project.script_steps
        image_path = project.problem_image

        if not script_steps:
            state["messages"].append({
                "role": "assistant",
                "content": "错误：没有脚本步骤，无法生成动画"
            })
            return state

        # 构建提示词
        script_description = self._format_script_for_prompt(script_steps)

        # 明确区分语义层与绘图层：动画只能消费 drawable_scene。
        metadata = state.get("metadata", {})
        coordinate_scene_data = metadata.get("coordinate_scene")
        drawable_scene_data = metadata.get("drawable_scene")
        geometry_spec_data = metadata.get("geometry_spec")
        semantic_graph_data = metadata.get("semantic_graph") or metadata.get("scene_graph")
        geometry_graph_data = metadata.get("geometry_graph")
        coordinate_scene_text = ""
        drawable_scene_text = ""
        geometry_spec_text = ""
        semantic_graph_text = ""
        geometry_graph_text = ""
        if coordinate_scene_data:
            coordinate_scene_text = self._format_scene_graph_for_prompt(coordinate_scene_data)
        if drawable_scene_data:
            drawable_scene_text = self._format_scene_graph_for_prompt(drawable_scene_data)
        if geometry_spec_data:
            geometry_spec_text = self._format_scene_graph_for_prompt(geometry_spec_data)
        if semantic_graph_data:
            semantic_graph_text = self._format_scene_graph_for_prompt(semantic_graph_data)
        if geometry_graph_data:
            geometry_graph_text = self._format_scene_graph_for_prompt(geometry_graph_data)
        known_entities_text = ", ".join(
            self._collect_known_entities(drawable_scene_data, semantic_graph_data)
        )

        step_contexts: List[Dict[str, Any]] = []
        step_codegen_snapshots: List[Dict[str, Any]] = []
        step_contexts_text = ""
        drawable_scene_presentable = self._has_drawable_geometry(drawable_scene_data)

        manim_code = ""
        codegen_mode = ""

        if self.use_template_codegen and drawable_scene_presentable:
            try:
                manim_code, step_contexts, step_codegen_snapshots = self._generate_template_code_iteratively(
                    project=project,
                    steps=script_steps,
                    coordinate_scene_data=drawable_scene_data,
                )
                is_valid, validation_error = self.template_codegen.validate_formal_video_code(manim_code)
                if not is_valid:
                    raise ValueError(validation_error)
                step_contexts_text = self._format_scene_graph_for_prompt(step_contexts)
                codegen_mode = "template_iterative"
                print(f"\n[AnimationAgent] 模板迭代 Codegen 生成长度：{len(manim_code)}")
            except Exception as exc:
                print(f"\n[AnimationAgent] 模板 Codegen 失败，回退 LLM：{exc}")
                state["messages"].append({
                    "role": "assistant",
                    "content": f"模板 Codegen 失败，自动回退 LLM 生成：{exc}"
                })

        if not step_contexts and drawable_scene_presentable:
            step_contexts = self._prepare_animation_context(script_steps, drawable_scene_data)
        if not step_contexts_text:
            step_contexts_text = self._format_scene_graph_for_prompt(step_contexts)

        # 回退：若无语义图，再调用视觉工具描述图形
        geometry_details = ""
        if not semantic_graph_text and image_path and self.vision_tool:
            geometry_details = self.vision_tool.describe_geometry(image_path)

        canvas_instructions = self._build_canvas_instructions()

        # 最终回退：如果之前的 codegen 失败了，就直接调用 LLM 生成代码
        if not manim_code and not drawable_scene_presentable:
            return self._fail_with_geometry_error(
                state,
                "缺少有效 drawable geometry，未生成正式视频脚本；调试信息已保存到 debug/。",
                "missing valid drawable geometry for formal video generation",
            )

        if not manim_code:
            user_prompt = f"""请根据以下视频脚本生成 Manim 动画代码：

视频脚本（含音频同步信息）：
{script_description}

题目图片分析：
{geometry_details}

Coordinate Scene（几何真源，优先用于构图与对象复用）：
{coordinate_scene_text}

Drawable Scene（动画唯一允许直接消费的绘图层；若为 schematic 则仅表示示意布局）：
{drawable_scene_text}

Geometry Spec（视觉识别出的结构草图，仅作辅助参考）：
{geometry_spec_text}

Semantic Graph（语义层，仅供关系与实体理解，不要把它当成坐标真值）：
{semantic_graph_text}

Geometry Graph（节点/边关系图，用于对象复用与关系约束）：
{geometry_graph_text}

逐步动画计划（SceneGraph 更新 -> Planner -> CanvasScene）：
{step_contexts_text}

画布与布局约束：
{canvas_instructions}

当前允许直接引用的实体：
{known_entities_text}

【强制要求】：
- 必须输出完整的 Python 代码，从第一行到最后一行，不得截断
- 所有字符串必须正确闭合（引号成对）
- 所有括号必须成对出现
- 不得使用 "..." 或 "# 省略" 代替任何代码
- 每步开头必须插入 self.add_sound(r"音频路径", time_offset=0)，因为 add_sound 是相对当前步骤起点的
- 每步的动画 run_time 总和 + self.wait() 必须严格等于该步骤的★音频时长
- 图形要与题目图片中的几何关系一致
- 如果提供了 Coordinate Scene：必须优先使用其中的点坐标和 primitive 定义，不要自行发明点位
- 如果提供了 Drawable Scene：它是动画唯一允许直接消费的绘图层，先构建初始题图骨架并复用已有对象，在后续步骤中只做高亮、标注、变换，不要每步从头重画
- 如果提供了 Semantic Graph：它只用于理解实体和关系，不要把它当成坐标真值
- 如果提供了 Geometry Graph：尽量以节点/边 ID 作为对象命名依据，保持同一几何元素在各步骤中是同一对象实例"""

            # 调用 LLM
            messages = self._format_messages(
                system_prompt=self.system_prompt,
                user_prompt=user_prompt
            )

            manim_code = self._invoke_llm(messages)
            codegen_mode = "llm"

            print(f"\n[AnimationAgent] LLM 响应长度：{len(manim_code)}")

            # 提取代码块
            manim_code = self._extract_code_block(manim_code)

            print(f"[AnimationAgent] 提取后代码长度：{len(manim_code)}")
            print(f"[AnimationAgent] 代码前 50 行：{manim_code[:200]}...")

        # 验证代码是否有效
        if not manim_code or len(manim_code) < 50:
            print("[AnimationAgent] 错误：提取的代码太短，流程中止")
            state["messages"].append({
                "role": "assistant",
                "content": "错误：生成的 Manim 代码无效，流程中止"
            })
            state["project"].status = "failed"
            state["project"].error_message = "LLM 生成的 Manim 代码无效或过短"
            return state

        # 从代码中解析 Scene 类名
        class_match = re.search(r'class\s+(\w+)\s*\([^)]*Scene[^)]*\)', manim_code)
        class_name = class_match.group(1) if class_match else "MathAnimation"

        # 更新项目状态
        project.manim_class_name = class_name
        project.manim_file_path = "math_animation.py"
        project.audio_embedded = True  # 音频已通过 add_sound 嵌入 Manim 渲染结果

        state["project"] = project
        state["current_step"] = "animation_completed"
        state["messages"].append({
            "role": "assistant",
            "content": f"Manim 代码生成完成，类名：{project.manim_class_name}"
        })

        # 存储完整的 manim 代码到 metadata
        if "metadata" not in state:
            state["metadata"] = {}
        state["metadata"]["manim_code"] = manim_code
        state["metadata"]["animation_step_contexts"] = step_contexts
        state["metadata"]["manim_codegen_mode"] = codegen_mode
        if step_codegen_snapshots:
            state["metadata"]["animation_step_codegen_snapshots"] = step_codegen_snapshots

        return state

    def _prepare_animation_context(
        self,
        steps: List[ScriptStep],
        coordinate_scene_data: Optional[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """串行执行 scene graph 更新、动画规划、布局生成，供 codegen 使用。"""
        canvas_scene = CanvasScene()
        contexts: List[Dict[str, Any]] = []
        cumulative = 0.0
        running_scene = self._build_animation_base_scene(coordinate_scene_data)

        for index, step in enumerate(steps, start=1):
            step_scene = self.scene_graph_updater.build_step_scene(
                base_scene_graph=running_scene,
                step=step,
                step_index=index,
            )
            running_scene = step_scene.get("scene", running_scene)
            plan = self.animation_planner.plan_step(step, step_scene, cumulative)
            layout = self._layout_step_canvas(canvas_scene, plan)

            contexts.append({
                "step_id": step.id,
                "title": step.title,
                "step_scene": step_scene,
                "animation_plan": plan,
                "canvas_layout": layout,
            })

            cumulative += plan["duration"]

        return contexts

    def _generate_template_code_iteratively(
        self,
        project: VideoProject,
        steps: List[ScriptStep],
        coordinate_scene_data: Optional[Dict[str, Any]],
    ) -> tuple[str, List[Dict[str, Any]], List[Dict[str, Any]]]:
        """逐步执行 Layer1/2/3，并在每步后生成累计代码快照。"""
        canvas_scene = CanvasScene()
        cumulative = 0.0
        contexts: List[Dict[str, Any]] = []
        snapshots: List[Dict[str, Any]] = []
        manim_code = ""

        base_coordinate_scene = self._build_animation_base_scene(coordinate_scene_data)
        running_scene = base_coordinate_scene

        for index, step in enumerate(steps, start=1):
            step_scene = self.scene_graph_updater.build_step_scene(
                base_scene_graph=running_scene,
                step=step,
                step_index=index,
            )
            running_scene = step_scene.get("scene", running_scene)
            plan = self.animation_planner.plan_step(step, step_scene, cumulative)
            layout = self._layout_step_canvas(canvas_scene, plan)

            ctx = {
                "step_id": step.id,
                "title": step.title,
                "step_scene": step_scene,
                "animation_plan": plan,
                "canvas_layout": layout,
            }
            contexts.append(ctx)

            # 每步都做一次累计代码生成，确保链路是“逐步构建”而不是一次性拼装。
            manim_code = self.template_codegen.generate(
                project=project,
                coordinate_scene_data=base_coordinate_scene,
                step_contexts=contexts,
            )

            snapshots.append({
                "step_id": step.id,
                "code_length": len(manim_code),
                "debug_code_path": self._export_step_debug_code(index, manim_code),
                "context": ctx,
            })

            cumulative += plan["duration"]

        return manim_code, contexts, snapshots

    def _build_animation_base_scene(
        self,
        coordinate_scene_data: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """构建动画初始题图：折叠后的派生点先停留在源点，真正移动由 step updater 完成。"""
        base_scene = json.loads(json.dumps(coordinate_scene_data or {}))
        points = base_scene.get("points", [])
        if not isinstance(points, list):
            return base_scene

        point_lookup = {
            str(item.get("id", "")).strip(): item
            for item in points
            if isinstance(item, dict) and item.get("id")
        }
        for item in points:
            if not isinstance(item, dict):
                continue
            derived = item.get("derived")
            if not isinstance(derived, dict):
                continue
            if str(derived.get("type", "")).strip().lower() != "reflect_point":
                continue
            source_id = str(derived.get("source", "")).strip()
            source_item = point_lookup.get(source_id)
            source_coord = source_item.get("coord") if isinstance(source_item, dict) else None
            if isinstance(source_coord, list) and len(source_coord) == 2:
                item["coord"] = [float(source_coord[0]), float(source_coord[1])]
        return base_scene

    def _export_step_debug_code(self, step_index: int, manim_code: str) -> str:
        """将每步累计生成代码导出到 output/debug，便于检查循环生成链路。"""
        debug_dir = self.output_dir / "debug"
        debug_dir.mkdir(parents=True, exist_ok=True)
        file_path = debug_dir / f"step_{step_index:02d}_manim.py"
        file_path.write_text(manim_code, encoding="utf-8")
        return str(file_path)

    def _layout_step_canvas(self, canvas_scene: CanvasScene, plan: Dict[str, Any]) -> Dict[str, Any]:
        """根据 planner 输出给当前步骤分配公式区布局。"""
        formula_items = plan.get("formula_items", []) # 从计划中获取当前步骤需要展示的公式列表
        reserved_elements = []
        if formula_items:
            # 调用分局器分配位置
            try:
                reserved_elements = canvas_scene.reserve_step_formula_blocks(
                    step_id=plan["step_id"],
                    formula_items=formula_items,
                    reset_formula_area=plan.get("reset_formula_area", False),
                )
            except ValueError:
                # 公式区不足时清空重排，保证当前步骤有可用布局
                reserved_elements = canvas_scene.reserve_step_formula_blocks(
                    step_id=plan["step_id"],
                    formula_items=formula_items,
                    reset_formula_area=True,
                )

        return {
            "reserved_formula_elements": [
                {
                    "id": element.id,
                    "content": element.content,
                    "x": element.x,
                    "y": element.y,
                    "width": element.width,
                    "height": element.height,
                }
                for element in reserved_elements
            ],
            "snapshot": canvas_scene.get_layout_snapshot(),
        }

    def _format_script_for_prompt(self, steps: list) -> str:
        """将脚本格式化为提示词，包含音频同步信息"""
        lines = []
        cumulative = 0.0
        for step in steps:
            # 优先使用 TTS 实测时长，没有则用脚本预估时长
            dur = float(step.audio_duration) if step.audio_duration else float(step.duration)
            audio_path = (
                str(Path(step.audio_file).resolve()).replace("\\", "/")
                if step.audio_file else None
            )
            lines.append(f"步骤 {step.id}: {step.title}")
            lines.append(f"  本步骤在全片中的累计开始秒（仅作参考）：{cumulative:.2f}")
            lines.append("  add_sound time_offset（相对当前步骤起点）：0.00")
            if audio_path:
                lines.append(f"  音频文件路径：{audio_path}")
            lines.append(f"=此步骤动画总时长必须恰好为 {dur:.2f} 秒（所有run_time + wait()之和）")
            lines.append(f"  旁白：{step.narration}")
            lines.append(f"  视觉：{', '.join(step.visual_cues)}")
            if getattr(step, "on_screen_texts", None):
                display_items = [
                    str(item.get("text", "")).strip()
                    for item in step.on_screen_texts
                    if isinstance(item, dict) and str(item.get("text", "")).strip()
                ]
                if display_items:
                    lines.append(f"  屏幕文字：{' | '.join(display_items)}")
            lines.append("")
            cumulative += dur
        lines.append(f"所有步骤累计总时长：{cumulative:.2f} 秒")
        return "\n".join(lines)

    def _build_canvas_instructions(self) -> str:
        """构建画布尺寸与布局约束，显式告诉模型避免越界"""
        """只是提供一段提示词"""
        cfg = self.canvas_config
        return (
            f"- 必须在代码中设置: config.frame_height={cfg['frame_height']}, "
            f"config.frame_width={cfg['frame_width']}, "
            f"config.pixel_height={cfg['pixel_height']}, "
            f"config.pixel_width={cfg['pixel_width']}\n"
            f"- 安全边距至少 {cfg['safe_margin']}，所有元素必须留在可见区域内，不得超出画布\n"
            f"- 布局模式: {self.layout}\n"
            f"- 左侧图形区: x <= {cfg['left_panel_x_max']}，几何图形与点线标注都放左侧\n"
            f"- 右侧文字区: x >= {cfg['right_panel_x_min']}，可放公式和描述性文字\n"
            "- 右侧文字区使用 VGroup(...).arrange(DOWN, aligned_edge=LEFT) 并固定在右侧，避免与图形重叠"
        )

    def _format_scene_graph_for_prompt(self, scene_graph: Dict[str, Any]) -> str:
        """将 scene graph 序列化为提示词文本。"""
        try:
            return json.dumps(scene_graph, ensure_ascii=False, indent=2)
        except Exception:
            return str(scene_graph)

    def _extract_code_block(self, text: str) -> str:
        """从响应中提取代码块"""
        text = text.strip()

        # 方法 1: 正则提取 ```python 块
        code_pattern = r'```python\s*([\s\S]*?)\s*```'
        match = re.search(code_pattern, text)
        if match:
            code = match.group(1).strip()
            # 递归清理可能嵌套的代码块
            if code.startswith('```'):
                return self._extract_code_block(code)
            return code

        # 方法 2: 提取 ``` 块（不带语言标记）
        code_pattern = r'```\s*([\s\S]*?)\s*```'
        match = re.search(code_pattern, text)
        if match:
            code = match.group(1).strip()
            if code.startswith('```'):
                return self._extract_code_block(code)
            return code

        # 方法 3: 暴力清理 - 删除所有 ``` 行
        lines = text.split('\n')
        cleaned_lines = [l for l in lines if not l.strip().startswith('```')]
        cleaned = '\n'.join(cleaned_lines).strip()

        # 检查是否包含有效的 Python 代码
        if cleaned.startswith('from manim') or cleaned.startswith('import manim'):
            return cleaned

        # 返回清理后的结果
        return cleaned

    def _collect_known_entities(
        self,
        drawable_scene: Optional[Dict[str, Any]],
        semantic_graph: Optional[Dict[str, Any]],
    ) -> List[str]:
        entity_ids = set()
        for source in (drawable_scene or {}, semantic_graph or {}):
            points = source.get("points") or {}
            if isinstance(points, dict):
                entity_ids.update(str(item) for item in points.keys())
            elif isinstance(points, list):
                entity_ids.update(
                    str(item.get("id"))
                    for item in points
                    if isinstance(item, dict) and item.get("id")
                )

            for bucket in ("lines", "objects", "angles", "primitives"):
                for item in source.get(bucket, []) or []:
                    if isinstance(item, dict) and item.get("id"):
                        entity_ids.add(str(item.get("id")))

        return sorted(item for item in entity_ids if item)

    def _has_drawable_geometry(self, drawable_scene: Optional[Dict[str, Any]]) -> bool:
        if not isinstance(drawable_scene, dict):
            return False
        points = drawable_scene.get("points")
        if isinstance(points, dict):
            has_points = any(
                isinstance(payload, dict) and (payload.get("coord") or payload.get("pos"))
                for payload in points.values()
            )
        elif isinstance(points, list):
            has_points = any(
                isinstance(payload, dict) and payload.get("coord")
                for payload in points
            )
        else:
            has_points = False
        if not has_points:
            return False
        primitives = drawable_scene.get("primitives") or []
        return any(
            isinstance(item, dict)
            and str(item.get("type", "")).strip().lower() == "segment"
            for item in primitives
        )

    def _scene_point_ids(self, scene: Optional[Dict[str, Any]]) -> set[str]:
        if not isinstance(scene, dict):
            return set()
        points = scene.get("points")
        if isinstance(points, dict):
            return {str(key) for key in points.keys() if str(key).strip()}
        if isinstance(points, list):
            return {
                str(item.get("id"))
                for item in points
                if isinstance(item, dict) and str(item.get("id", "")).strip()
            }
        return set()

    def _normalize_step_scene_geometry(
        self,
        base_scene: Optional[Dict[str, Any]],
        step_scene: Optional[Dict[str, Any]],
        *,
        step_index: int,
    ) -> Dict[str, Any]:
        base_scene_dict = base_scene if isinstance(base_scene, dict) else {}
        if not isinstance(step_scene, dict):
            if self._has_drawable_geometry(base_scene_dict):
                return {"scene": json.loads(json.dumps(base_scene_dict)), "allow_geometry_motion": False}
            raise ValueError(f"step {step_index} has no valid scene payload")

        candidate = step_scene.get("scene")
        if not isinstance(candidate, dict) or not self._has_drawable_geometry(candidate):
            if self._has_drawable_geometry(base_scene_dict):
                normalized = dict(step_scene)
                normalized["scene"] = json.loads(json.dumps(base_scene_dict))
                normalized["allow_geometry_motion"] = False
                return normalized
            raise ValueError(f"step {step_index} lost all drawable geometry")

        base_point_ids = self._scene_point_ids(base_scene_dict)
        candidate_point_ids = self._scene_point_ids(candidate)
        if base_point_ids and not base_point_ids.issubset(candidate_point_ids):
            raise ValueError(
                f"step {step_index} scene dropped base geometry points: "
                f"{sorted(base_point_ids - candidate_point_ids)}"
            )
        return step_scene

    def _ensure_presentable_video_code(self, manim_code: str) -> None:
        is_valid, error_message = self.template_codegen.validate_formal_video_code(manim_code)
        if not is_valid:
            raise ValueError(error_message)

    def _fail_with_geometry_error(
        self,
        state: Dict[str, Any],
        message: str,
        error_message: str,
    ) -> Dict[str, Any]:
        if "messages" not in state:
            state["messages"] = []
        state["messages"].append({"role": "assistant", "content": message})
        project = state.get("project")
        if project is not None:
            project.status = "failed"
            project.error_message = error_message
            state["project"] = project
        state["current_step"] = "animation_failed"
        return state

    def process(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Generate formal Manim lecture-video code from validated geometry only."""
        project = state["project"]
        if getattr(project, "status", "") == "failed":
            return state

        script_steps = project.script_steps
        image_path = project.problem_image
        if not script_steps:
            state["messages"].append({
                "role": "assistant",
                "content": "缺少讲解脚本步骤，无法生成正式讲解视频。",
            })
            return state

        metadata = state.get("metadata", {})
        coordinate_scene_data = metadata.get("coordinate_scene")
        drawable_scene_data = metadata.get("drawable_scene")
        geometry_spec_data = metadata.get("geometry_spec")
        semantic_graph_data = metadata.get("semantic_graph") or metadata.get("scene_graph")
        geometry_graph_data = metadata.get("geometry_graph")

        coordinate_scene_text = self._format_scene_graph_for_prompt(coordinate_scene_data) if coordinate_scene_data else ""
        drawable_scene_text = self._format_scene_graph_for_prompt(drawable_scene_data) if drawable_scene_data else ""
        geometry_spec_text = self._format_scene_graph_for_prompt(geometry_spec_data) if geometry_spec_data else ""
        semantic_graph_text = self._format_scene_graph_for_prompt(semantic_graph_data) if semantic_graph_data else ""
        geometry_graph_text = self._format_scene_graph_for_prompt(geometry_graph_data) if geometry_graph_data else ""
        known_entities_text = ", ".join(self._collect_known_entities(drawable_scene_data, semantic_graph_data))
        script_description = self._format_script_for_prompt(script_steps)

        drawable_scene_presentable = self._has_drawable_geometry(drawable_scene_data)
        step_contexts: List[Dict[str, Any]] = []
        step_codegen_snapshots: List[Dict[str, Any]] = []
        step_contexts_text = ""
        manim_code = ""
        codegen_mode = ""

        if self.use_template_codegen and drawable_scene_presentable:
            try:
                manim_code, step_contexts, step_codegen_snapshots = self._generate_template_code_iteratively(
                    project=project,
                    steps=script_steps,
                    coordinate_scene_data=drawable_scene_data,
                )
                self._ensure_presentable_video_code(manim_code)
                step_contexts_text = self._format_scene_graph_for_prompt(step_contexts)
                codegen_mode = "template_iterative"
            except Exception as exc:
                print(f"\n[AnimationAgent] template codegen failed, considering constrained LLM fallback: {exc}")
                state["messages"].append({
                    "role": "assistant",
                    "content": f"模板 codegen 未通过正式视频校验，将尝试受约束的 LLM 生成：{exc}",
                })
                manim_code = ""

        if not step_contexts and drawable_scene_presentable:
            step_contexts = self._prepare_animation_context(script_steps, drawable_scene_data)
        if not step_contexts_text:
            step_contexts_text = self._format_scene_graph_for_prompt(step_contexts)

        geometry_details = ""
        if not semantic_graph_text and image_path and self.vision_tool:
            geometry_details = self.vision_tool.describe_geometry(image_path)

        if not manim_code and not drawable_scene_presentable:
            return self._fail_with_geometry_error(
                state,
                "缺少有效 drawable geometry，未生成正式视频脚本；调试信息已保存到 debug/。",
                "missing valid drawable geometry for formal video generation",
            )

        if not manim_code:
            canvas_instructions = self._build_canvas_instructions()
            user_prompt = f"""请生成正式的 Manim 几何讲解视频代码。

脚本步骤：
{script_description}

图形补充描述：
{geometry_details}

Coordinate Scene:
{coordinate_scene_text}

Drawable Scene:
{drawable_scene_text}

Geometry Spec:
{geometry_spec_text}

Semantic Graph:
{semantic_graph_text}

Geometry Graph:
{geometry_graph_text}

Step Contexts:
{step_contexts_text}

Canvas Instructions:
{canvas_instructions}

Known Entities:
{known_entities_text}

强约束：
- 这是面向学生的正式讲解视频，不是调试页，不是数据分析页。
- 严禁把 Drawable Scene、Semantic Graph、Geometry Graph、layout_mode、points: {{}}、lines: [] 这类调试信息直接画到视频里。
- 必须绘制真实几何对象，至少包含可见的点和线；不能只用 Text、Rectangle、VGroup 做信息卡片。
- 如果你引用新的几何对象，它必须来自已有 drawable scene 或当前步骤的显式构造。
- 输出必须是可运行的 Python Manim 代码，不要附加解释文字。"""
            messages = self._format_messages(
                system_prompt=self.system_prompt,
                user_prompt=user_prompt,
            )
            manim_code = self._extract_code_block(self._invoke_llm(messages))
            try:
                self._ensure_presentable_video_code(manim_code)
            except Exception as exc:
                return self._fail_with_geometry_error(
                    state,
                    "生成结果不是正式几何讲解视频脚本，已拒绝写入；调试信息已保存到 debug/。",
                    str(exc),
                )
            codegen_mode = "llm"

        if not manim_code or len(manim_code) < 50:
            return self._fail_with_geometry_error(
                state,
                "未生成有效的正式 Manim 视频脚本。",
                "failed to generate valid formal Manim code",
            )

        class_match = re.search(r"class\s+(\w+)\s*\([^)]*Scene[^)]*\)", manim_code)
        class_name = class_match.group(1) if class_match else "MathAnimation"

        project.manim_class_name = class_name
        project.manim_file_path = "math_animation.py"
        project.audio_embedded = True

        state["project"] = project
        state["current_step"] = "animation_completed"
        state["messages"].append({
            "role": "assistant",
            "content": f"正式 Manim 讲解脚本已生成：{project.manim_class_name}",
        })

        if "metadata" not in state:
            state["metadata"] = {}
        state["metadata"]["manim_code"] = manim_code
        state["metadata"]["animation_step_contexts"] = step_contexts
        state["metadata"]["manim_codegen_mode"] = codegen_mode
        if step_codegen_snapshots:
            state["metadata"]["animation_step_codegen_snapshots"] = step_codegen_snapshots

        return state

    def _prepare_animation_context(
        self,
        steps: List[ScriptStep],
        coordinate_scene_data: Optional[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        canvas_scene = CanvasScene()
        contexts: List[Dict[str, Any]] = []
        cumulative = 0.0
        running_scene = self._build_animation_base_scene(coordinate_scene_data)

        for index, step in enumerate(steps, start=1):
            raw_step_scene = self.scene_graph_updater.build_step_scene(
                base_scene_graph=running_scene,
                step=step,
                step_index=index,
            )
            step_scene = self._normalize_step_scene_geometry(
                running_scene,
                raw_step_scene,
                step_index=index,
            )
            running_scene = step_scene.get("scene", running_scene)
            plan = self.animation_planner.plan_step(step, step_scene, cumulative)
            layout = self._layout_step_canvas(canvas_scene, plan)

            contexts.append({
                "step_id": step.id,
                "title": step.title,
                "step_scene": step_scene,
                "animation_plan": plan,
                "canvas_layout": layout,
            })
            cumulative += plan["duration"]

        return contexts

    def _generate_template_code_iteratively(
        self,
        project: VideoProject,
        steps: List[ScriptStep],
        coordinate_scene_data: Optional[Dict[str, Any]],
    ) -> tuple[str, List[Dict[str, Any]], List[Dict[str, Any]]]:
        canvas_scene = CanvasScene()
        cumulative = 0.0
        contexts: List[Dict[str, Any]] = []
        snapshots: List[Dict[str, Any]] = []
        manim_code = ""

        base_coordinate_scene = self._build_animation_base_scene(coordinate_scene_data)
        running_scene = base_coordinate_scene

        for index, step in enumerate(steps, start=1):
            raw_step_scene = self.scene_graph_updater.build_step_scene(
                base_scene_graph=running_scene,
                step=step,
                step_index=index,
            )
            step_scene = self._normalize_step_scene_geometry(
                running_scene,
                raw_step_scene,
                step_index=index,
            )
            running_scene = step_scene.get("scene", running_scene)
            plan = self.animation_planner.plan_step(step, step_scene, cumulative)
            layout = self._layout_step_canvas(canvas_scene, plan)

            ctx = {
                "step_id": step.id,
                "title": step.title,
                "step_scene": step_scene,
                "animation_plan": plan,
                "canvas_layout": layout,
            }
            contexts.append(ctx)

            manim_code = self.template_codegen.generate(
                project=project,
                coordinate_scene_data=base_coordinate_scene,
                step_contexts=contexts,
            )
            self._ensure_presentable_video_code(manim_code)
            snapshots.append({
                "step_id": step.id,
                "code_length": len(manim_code),
                "debug_code_path": self._export_step_debug_code(index, manim_code),
                "context": ctx,
            })
            cumulative += plan["duration"]

        return manim_code, contexts, snapshots
