"""
Agents package.

尽量保持轻量导入，避免仅使用局部模块时被可选依赖阻塞。
"""

from importlib import import_module


_EXPORTS = {
    "AgentState": ".state",
    "VideoProject": ".state",
    "ScriptStep": ".state",
    "CoordinateSceneCompiler": ".coordinate_scene",
    "CoordinateSceneError": ".coordinate_scene",
    "GeometryFactCompiler": ".geometry_fact_compiler",
    "BaseAgent": ".base_agent",
    "VisionTool": ".vision_tool",
    "VisionAgent": ".vision_agent",
    "ScriptAgent": ".script_agent",
    "AnimationAgent": ".animation_agent",
    "TemplateCodeGenerator": ".codegen",
    "TemplateRetriever": ".template_retriever",
    "TemplateReference": ".template_retriever",
    "AnimationPlanner": ".animation_planner",
    "TeachingIRPlanner": ".teaching_ir",
    "ProblemPatternClassifier": ".problem_pattern",
    "ActionExecutabilityChecker": ".action_executability_checker",
    "CaseReplayRecorder": ".case_replay_recorder",
    "SceneGraphUpdater": ".scene_graph_updater",
    "CanvasScene": ".canvas_scene",
    "RepairAgent": ".repair_agent",
    "VoiceAgent": ".voice_agent",
    "LearnerModelingAgent": ".learner_modeling_agent",
    "MergeAgent": ".merge_agent",
    "create_workflow": ".workflow",
    "create_default_workflow": ".workflow",
}

__all__ = list(_EXPORTS.keys())


def __getattr__(name):
    module_name = _EXPORTS.get(name)
    if module_name is None:
        raise AttributeError(f"module 'agents' has no attribute {name!r}")
    module = import_module(module_name, __name__)
    return getattr(module, name)
