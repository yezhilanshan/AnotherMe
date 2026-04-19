# 数学解题视频生成系统 - 进度文档

> 阅读说明：这份文档是给 AI 助手看的工作日志。每次开始工作前先读这里。

---

## 整体架构

```
problem.png
    │
    ▼
[VisionAgent]        → 识别题目、生成 SceneGraph + GeometryGraph → metadata
    │
    ▼
[ScriptAgent]        → 消费 scene_graph，生成分步解题脚本       → project.script_steps
    │
    ▼
[VoiceAgent]         → 脚本 → TTS → 音频文件，写入 step.audio_file / audio_duration
    │
    ▼
[AnimationAgent]     → 4层子流水线 → 模板优先生成 Manim 代码      → metadata["manim_code"]
    │  ┌─────────────────────────────────────────────────────┐
    │  │ Layer 1: SceneGraphUpdater   每步提取焦点实体 + 操作  │
    │  │ Layer 2: AnimationPlanner    生成结构化动画计划       │
    │  │ Layer 3: CanvasScene         公式区布局管理（防重叠） │
    │  │ Layer 4: Template Codegen    结构化生成 + LLM 回退   │
    │  └─────────────────────────────────────────────────────┘
    ▼
[RepairAgent]        → 规则修复常见 Manim 语法/运行时错误
    │
    ▼
[MergeAgent]         → 渲染 Manim → 合并音视频 → 最终 MP4
```

---

## ✅ 已完成

### 基础设施
| 文件 | 状态 | 说明 |
|------|------|------|
| `agents/state.py` | ✅ | `AgentState`, `VideoProject`, `ScriptStep` TypedDict；`metadata` 为 agent 间共享字典 |
| `agents/base_agent.py` | ✅ | 基类，封装 `_format_messages`、`_extract_code_block` |
| `agents/config.py` | ✅ | 默认 LLM/视觉模型配置 |
| `agents/workflow.py` | ✅ | LangGraph 工作流，入口为 **vision** 节点，顺序：vision→script→voice→animation→repair→merge |
| `requirements.txt` | ✅ | 新增 `networkx>=3.0` |

### VisionAgent（第一个节点）
文件：`agents/vision_agent.py` + `agents/vision_tool.py`

- ✅ `analyze_image(image_path, prompt)` — 通用图像分析（修复了缺失方法）
- ✅ `parse_geometry_scene()` — 返回结构化 SceneGraph JSON，3级回退解析（防 LLM 输出乱码）
- ✅ `_build_geometry_graph_payload()` — 从 SceneGraph 构建 GeometryGraph（networkx）并序列化
- ✅ 产出写入 `metadata["scene_graph"]` 和 `metadata["geometry_graph"]`
- ✅ `VisionTool.describe_geometry()` — 修复了运行时缺失方法崩溃

### ScriptAgent
文件：`agents/script_agent.py`

- ✅ 优先读取 `metadata["scene_graph"]` 和 `metadata["geometry_graph"]` 作为上下文
- ✅ `describe_geometry()` 仅作回退（无 SceneGraph 时）

### 4层动画子流水线

#### Layer 1: SceneGraph 更新器
文件：`agents/scene_graph_updater.py`（新建）

- ✅ `SceneGraphUpdater.build_step_scene(base_scene_graph, step, step_index)`
  - 从步骤文本中正则匹配实体 ID（`focus_entities`）
  - 推断操作类型：highlight / label / transform / maintain
  - 返回 `{step_id, step_index, title, focus_entities, operations, scene}`

#### Layer 2: 动画规划器
文件：`agents/animation_planner.py`（新建）

- ✅ `AnimationPlanner.plan_step(step, step_scene, time_offset)`
  - 提取公式项（`formula_items`）
  - 检测是否应重置公式区（关键词："接下来/总结/最终"）
  - 生成动作列表：add_sound / focus_entities / show_formula / align_audio_duration
  - 生成 `codegen_notes`（对象复用提示）
  - 返回 `{step_id, title, duration, time_offset, focus_entities, formula_items, actions, codegen_notes}`

#### Layer 3: 画布布局管理器
文件：`agents/canvas_scene.py`（完全重写，原为存根）

- ✅ `CanvasElement` dataclass — 布局元素（id, kind, content, area, x, y, width, height）
- ✅ `FormulaLayoutManager.place_formula()` — 从上到下顺序放置公式，超出区域抛 `ValueError`
- ✅ `CanvasScene.reserve_step_formula_blocks()` — 为每步分配公式块，支持 `reset_formula_area=True` 清空重排
- ✅ `CanvasScene.get_layout_snapshot()` — 返回当前所有元素的可序列化快照
- 布局区域定义：几何区 `[0.02, 0.05, 0.58, 0.95]`，公式区 `[0.66, 0.08, 0.96, 0.92]`

#### Layer 4: Template Codegen 集成
文件：`agents/codegen.py` + `agents/animation_agent.py`

- ✅ `__init__` 实例化 `SceneGraphUpdater` 和 `AnimationPlanner`
- ✅ `_prepare_animation_context()` — 串行执行三层，返回 `step_contexts` 列表
- ✅ `_generate_template_code_iteratively()` — **按步骤循环执行 Layer1→Layer2→Layer3，并在每步后触发一次模板代码生成（累计到当前步）**
- ✅ `_layout_step_canvas()` — 调用 Canvas 布局，溢出时自动 reset 重排
- ✅ 新增 `TemplateCodeGenerator.generate(project, scene_graph_data, step_contexts)`：
    - 读取 `scene_graph` 构建对象注册表（points / lines / objects）
    - 生成固定 `construct()` 骨架与每步代码块（add_sound / highlight / transform / label / 公式显示 / wait 对齐）
    - 所有 `run_time` 统一格式化为合法浮点，避免 `0.01.5` 类语法错误
- ✅ 修复模板文字覆盖：
    - 公式定位改为使用 `CanvasElement` 中心点（`x + width/2`, `y + height/2`）
    - `current_formula_group` 改为累计管理，`reset` 时可一次性淡出全部旧公式
- ✅ 默认优先模板生成，失败自动回退 LLM 生成（不中断主流程）
- ✅ 模板路径已从“一次性终态生成”改为“逐步循环生成”（每步都经历四层流水线）
- ✅ `metadata["manim_codegen_mode"]` 记录实际模式：`template_iterative` 或 `llm`
- ✅ `metadata["animation_step_codegen_snapshots"]` 记录每步累计代码长度与上下文快照
- ✅ `metadata["animation_step_contexts"]` 存储结构化上下文供调试
- ✅ Prompt 禁止多小数点 `run_time`（如 `run_time=0.01.5`）

### RepairAgent
文件：`agents/repair_agent.py`

- ✅ `repair_with_error(code, error)` — 错误驱动定向修复
- ✅ 规则 A：裸 Mobject 参数 → FadeIn(Mobject)
- ✅ 规则 B：未定义颜色常量 → 安全颜色映射
- ✅ 规则 C：`run_time<=0` → `run_time=0.01`
- ✅ 规则 D：`Point(location=[...])` → 隐藏 Dot
- ✅ 规则 E（新增）：**SyntaxError → 修复多小数点畸形浮点**（`run_time=0.01.5` → `run_time=1.5`）
- ✅ `_normalize_invalid_run_time` 优先处理多小数点，防止单轮修复越改越坏
- ✅ 渲染前硬校验：对黄色公式 `Text(...).move_to(np.array([x,y,0]))` 做坐标钳制
    - x 钳制到右侧公式区（`x >= right_panel_x_min`）
    - y 钳制到画面安全边距内（`[-half_h+safe_margin, half_h-safe_margin]`）

### MergeAgent
文件：`agents/merge_agent.py`

- ✅ 渲染质量默认 `-ql`（低画质，快速，调试用）
- ✅ 渲染超时 900 秒
- ✅ 最多 3 轮自动修复重试
- ✅ 渲染命令：`python -m manim -ql --format=mp4 --media_dir output\media output\math_animation.py <ClassName>`

### GeometryGraph
文件：`agents/graph_builder.py`

- ✅ `GeometryGraph.to_payload()` — networkx 图序列化为 `{nodes, edges, stats}` dict

---

## ❌ 尚未实现（下一步工作）

### 已完成（本轮）

1. 公式区坐标硬校验 + 自动钳制
- 落地点：`RepairAgent._clamp_formula_text_positions()`
- 生效时机：渲染前规则修复阶段（`_apply_rule_based_fixes`）

2. 模板动作覆盖扩展
- 落地点：`TemplateCodeGenerator.generate()`
- 新增动作：`transform` / `label` / `restore color`
- 颜色恢复策略：步骤末尾按对象类型恢复默认色（点 WHITE、线 BLUE_E、面 BLUE）

---

### 优先级 MEDIUM

#### 3. 调试数据 Dump
**目标**：`metadata["animation_step_contexts"]` 写入 `output/debug/step_N_context.json`，方便排查每步规划结果是否正确。

实现位置：`animation_agent.py` 的 `process()` 末尾，或 MergeAgent 渲染前。

#### 4. RepairAgent LLM 修复
目前 `use_llm_repair=False`（关闭），规则修复不到的错误会直接失败。
可以考虑：规则修复 3 轮后仍失败 → 启用 LLM 修复（需要把完整代码 + 报错传给 LLM）。

实现位置：`merge_agent.py` 的修复循环末尾。

---

### 优先级 LOW

#### 5. 渲染质量配置化入口
目前质量固定在 workflow 配置里，用户无法从命令行指定。
增加 `main.py` 的 `--quality` 参数，透传到 `MergeAgent.manim_quality`。

#### 6. 端到端测试
成功的手动测试记录：
- `FoldGeometryProblem.mp4` 已于 2026/3/16 22:36:49 成功渲染（低质量，约 30s 动画）
- 命令：`python -m manim -ql --format=mp4 --media_dir output\media output\math_animation.py FoldGeometryProblem`

需要补充的测试：
- 全流程自动化测试（`python main.py --image problem.png`）
- 观察 step_contexts 是否正确反映每步焦点实体
- 观察公式布局是否不重叠

---

## 关键文件速查

| 文件 | 核心类 / 函数 | 备注 |
|------|--------------|------|
| `agents/workflow.py` | `create_default_workflow()` | 工作流入口，节点顺序定义 |
| `agents/vision_agent.py` | `VisionAgent.process()` | 第一节点，产出 scene_graph / geometry_graph |
| `agents/vision_tool.py` | `VisionTool.describe_geometry()` | 通用图像描述，修复了方法缺失 |
| `agents/script_agent.py` | `ScriptAgent.process()` | 优先读 metadata["scene_graph"] |
| `agents/animation_agent.py` | `_prepare_animation_context()` | 4层子流水线入口，约第 300 行附近 |
| `agents/codegen.py` | `TemplateCodeGenerator.generate()` | 模板化代码生成（默认优先） |
| `agents/scene_graph_updater.py` | `SceneGraphUpdater.build_step_scene()` | Layer 1 |
| `agents/animation_planner.py` | `AnimationPlanner.plan_step()` | Layer 2 |
| `agents/canvas_scene.py` | `CanvasScene.reserve_step_formula_blocks()` | Layer 3 |
| `agents/repair_agent.py` | `repair_with_error()` + `_clamp_formula_text_positions()` | 含多小数点修复 + 公式区坐标钳制 |
| `agents/merge_agent.py` | `_render_manim()` | 调 manim，质量 -ql，timeout 900s |
| `agents/graph_builder.py` | `GeometryGraph.to_payload()` | networkx 图 → dict |

---

## metadata 关键字段

```python
state["metadata"] = {
    "scene_graph":            dict,   # VisionAgent 产出，结构化几何信息
    "scene_graph_json":       str,    # 同上，JSON 字符串形式
    "geometry_graph":         dict,   # networkx 图序列化 {nodes, edges, stats}
    "geometry_graph_json":    str,    # 同上，JSON 字符串形式
    "manim_code":             str,    # AnimationAgent 产出，Manim Python 代码
    "manim_codegen_mode":     str,    # template_iterative 或 llm
    "animation_step_contexts": list,  # 每步的 {step_scene, animation_plan, canvas_layout}
}
```

---

## 常见问题 & 解决记录

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| `VisionAgent.analyze_image` AttributeError | 方法未定义 | 在 VisionAgent 中添加该方法 |
| `VisionTool.describe_geometry` AttributeError | 方法未定义 | 在 VisionTool 中添加该方法 |
| Manim 渲染超时 | 默认高画质 + 复杂场景 | 改 `-ql`，timeout 900s |
| `run_time=0.01.5` SyntaxError | LLM 生成了多小数点浮点 | RepairAgent 规则E + prompt 明确禁止 |
| RepairAgent 越修越坏 | 正则把 `0` 替换为 `0.01`，导致 `0.01.5`→`0.01.01.5` | `_normalize_invalid_run_time` 优先处理多小数点 |
| 模板生成后公式文字覆盖 | 公式用左上角定位 + 公式组引用被覆盖导致 reset 不彻底 | 使用中心点定位 + `current_formula_group.add(*step_formula_group)` 累计管理 |
| `parse_geometry_scene` JSON 解析失败 | LLM 输出不是纯 JSON | 3 级回退：直接 parse → 提取 ```json 块 → 提取 {...} |

---

## 运行方式

```powershell
# 完整流程
conda run -n langchain python main.py --image problem.png

# 手动渲染（调试用，已知可以成功）
C:\anaconda\envs\langchain\python.exe -m manim -ql --format=mp4 --media_dir output\media output\math_animation.py <ClassName>

# 静态检查
C:\anaconda\envs\langchain\python.exe -c "import agents"
```
