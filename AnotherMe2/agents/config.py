"""
Model and runtime configuration.
"""

import os
from typing import Any, Dict, Iterable, Union


def _read_api_key_from_env_name(env_name: Union[str, Iterable[str]]) -> str:
    if isinstance(env_name, str):
        env_names = [env_name]
    else:
        env_names = list(env_name or [])

    for name in env_names:
        name = str(name or "").strip()
        if not name:
            continue
        value = os.getenv(name, "")
        if value:
            return value
    return ""


# Fill these with your own environment variable names if you want to use
# Alibaba DashScope compatible-mode models.
DASHSCOPE_API_KEY_ENV_NAMES = ("DASHSCOPE_API_KEY", "BAILIAN_API_KEY")
TEXT_API_KEY_ENV_NAME = DASHSCOPE_API_KEY_ENV_NAMES[0]
VISION_API_KEY_ENV_NAME = DASHSCOPE_API_KEY_ENV_NAMES[0]

# DashScope OpenAI-compatible endpoint.
# Official docs:
# https://help.aliyun.com/zh/model-studio/text-generation
# https://help.aliyun.com/zh/model-studio/developer-reference/qwen-vl-compatible-with-openai
DASHSCOPE_COMPAT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

# Default text model and vision model. You can change them if needed.
TEXT_MODEL_NAME = "qwen3.5-plus"
VISION_MODEL_NAME = "qwen3-vl-plus"

# Fallback Volcengine Ark config remains available if DashScope env names are not set.
FALLBACK_ARK_API_KEY = os.getenv("ARK_API_KEY", "")
FALLBACK_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"
FALLBACK_TEXT_MODEL = "doubao-seed-2-0-pro-260215"
FALLBACK_VISION_MODEL = "doubao-1.5-vision-pro-250328"


def _text_api_key() -> str:
    return _read_api_key_from_env_name(DASHSCOPE_API_KEY_ENV_NAMES) or FALLBACK_ARK_API_KEY


def _vision_api_key() -> str:
    return _read_api_key_from_env_name(DASHSCOPE_API_KEY_ENV_NAMES) or _text_api_key()


def _text_base_url() -> str:
    return (
        DASHSCOPE_COMPAT_BASE_URL
        if _read_api_key_from_env_name(DASHSCOPE_API_KEY_ENV_NAMES)
        else FALLBACK_ARK_BASE_URL
    )


def _vision_base_url() -> str:
    if _read_api_key_from_env_name(DASHSCOPE_API_KEY_ENV_NAMES):
        return DASHSCOPE_COMPAT_BASE_URL
    return FALLBACK_ARK_BASE_URL


def _text_model() -> str:
    return TEXT_MODEL_NAME if _read_api_key_from_env_name(DASHSCOPE_API_KEY_ENV_NAMES) else FALLBACK_TEXT_MODEL


def _vision_model() -> str:
    if _read_api_key_from_env_name(DASHSCOPE_API_KEY_ENV_NAMES):
        return VISION_MODEL_NAME
    return FALLBACK_VISION_MODEL


def build_default_llm_config() -> Dict[str, Any]:
    return {
        "api_key": _text_api_key(),
        "base_url": _text_base_url(),
        "model": _text_model(),
        "temperature": 0.1,
        "max_tokens": 4096,
    }


def build_vision_model_config() -> Dict[str, Any]:
    return {
        "api_key": _vision_api_key(),
        "base_url": _vision_base_url(),
        "model": _vision_model(),
        "temperature": 0.05,
        "max_tokens": 4096,
    }


def build_voice_model_config() -> Dict[str, Any]:
    return {
        "api_key": _text_api_key(),
        "base_url": _text_base_url(),
        "model": _text_model(),
        "temperature": 0.05,
    }


def build_tts_config() -> Dict[str, Any]:
    return {
        "api_key": _text_api_key(),
        "base_url": _text_base_url(),
        "voice": "zh_female_wanwanxiao",
        "speed": 1.0,
        "pitch": 0,
        "volume": 50,
    }


DEFAULT_LLM_CONFIG = build_default_llm_config()
VISION_MODEL_CONFIG = build_vision_model_config()
VOICE_MODEL_CONFIG = build_voice_model_config()
TTS_CONFIG = build_tts_config()

VIDEO_CONFIG = {
    "output_dir": "./output",
    "resolution": "1920x1080",
    "fps": 60,
    "format": "mp4",
}

MANIM_CANVAS_CONFIG = {
    "frame_height": 8.0,
    "frame_width": 14.222,
    "pixel_height": 1080,
    "pixel_width": 1920,
    "safe_margin": 0.4,
    "left_panel_x_max": 1.0,
    "right_panel_x_min": 1.8,
}

AGENT_CONFIGS: Dict[str, Dict[str, Any]] = {
    "script": {
        "temperature": 0.1,
        "max_tokens": 4096,
        "system_prompt_file": "prompts/script_agent.txt",
    },
    "animation": {
        "temperature": 0.05,
        "max_tokens": 16384,
        "system_prompt_file": "prompts/animation_agent.txt",
        "canvas_config": MANIM_CANVAS_CONFIG,
        "layout": "left_graph_right_formula",
    },
    "voice": {
        "temperature": 0.05,
        "max_tokens": 2048,
        "system_prompt_file": "prompts/voice_agent.txt",
        "tts_config": TTS_CONFIG,
    },
    "merge": {
        "temperature": 0.05,
        "max_tokens": 1024,
        "system_prompt_file": "prompts/merge_agent.txt",
    },
    "repair": {
        "temperature": 0.0,
        "max_tokens": 2048,
        "use_llm_repair": False,
    },
    "coordinator": {
        "temperature": 0.1,
        "max_tokens": 2048,
        "system_prompt_file": "prompts/coordinator.txt",
    },
}
