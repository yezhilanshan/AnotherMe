"""
Shared vision helper used by other agents.
"""

import base64
import json
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional


class VisionTool:
    """Image-analysis helper for OCR and structural geometry extraction."""

    def __init__(self, llm_config: Dict[str, Any]):
        from langchain_openai import ChatOpenAI

        self.llm = ChatOpenAI(
            api_key=llm_config.get("api_key", ""),
            base_url=llm_config.get("base_url", ""),
            model=llm_config.get("model", "doubao-1.5-vision-pro-250328"),
            temperature=llm_config.get("temperature", 0.05),
            max_tokens=llm_config.get("max_tokens", 2048),
        )
        self.max_retries = int(llm_config.get("max_retries", 3))
        self.retry_backoff_seconds = float(llm_config.get("retry_backoff_seconds", 2.0))

    def analyze_image(self, image_path: str, prompt: str) -> str:
        if not Path(image_path).exists():
            return f"错误：图片不存在 {image_path}"

        with open(image_path, "rb") as file:
            image_data = base64.b64encode(file.read()).decode()

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_data}"},
                    },
                ],
            }
        ]

        return self._invoke_llm(messages).strip()

    def extract_problem_text(self, image_path: str) -> str:
        prompt = (
            "请完整提取这张数学题图片中的所有文字内容，包括题目描述、已知条件和求解目标。"
            "直接输出识别到的文字。"
        )
        return self.analyze_image(image_path, prompt)

    def parse_geometry_scene(self, image_path: str) -> dict:
        prompt = """
请分析这张几何题图，并输出 JSON 形式的 Scene Graph。

要求识别：
1. points：点及其大致位置
2. lines：线段
3. objects：三角形、圆等图形
4. incidence：点在线上、点在图形上
5. angles：已知角
6. relations：perpendicular / parallel / equal / midpoint / collinear / point_on_circle / tangent / intersect / angle_bisector / equal_length / equal_angle
"""

        result = self.analyze_image(image_path, prompt)
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            match = re.search(r"```json\s*([\s\S]*?)\s*```", result)
            if match:
                try:
                    return json.loads(match.group(1).strip())
                except json.JSONDecodeError:
                    pass
            brace_match = re.search(r"\{[\s\S]*\}", result)
            if brace_match:
                try:
                    return json.loads(brace_match.group(0))
                except json.JSONDecodeError:
                    pass
        return {
            "points": {},
            "lines": [],
            "objects": [],
            "incidence": [],
            "angles": [],
            "relations": [],
        }

    def describe_geometry(self, image_path: str) -> str:
        prompt = (
            "请详细描述这张几何图：图形类型、点位标记、特殊标记（直角/平行/相等等）"
            "以及各边和辅助线的相对关系。"
        )
        return self.analyze_image(image_path, prompt)

    def extract_given_conditions(self, image_path: str) -> str:
        prompt = '请提取题图中的已知条件，输出 JSON 数组，如 ["条件1", "条件2"]。'
        return self.analyze_image(image_path, prompt)

    def extract_target(self, image_path: str) -> str:
        prompt = "请提取题图中的求解目标，直接输出要求解的问题。"
        return self.analyze_image(image_path, prompt)

    def _invoke_llm(self, messages: list) -> str:
        last_error: Optional[Exception] = None
        attempts = max(self.max_retries, 1)
        for attempt in range(attempts):
            try:
                response = self.llm.invoke(messages)
                return response.content
            except Exception as exc:
                last_error = exc
                if not self._is_retryable_llm_error(exc) or attempt >= attempts - 1:
                    raise
                sleep_seconds = self.retry_backoff_seconds * (2 ** attempt)
                print(
                    f"[VisionTool] LLM request hit a temporary limit; "
                    f"retrying in {sleep_seconds:.1f}s ({attempt + 1}/{attempts})"
                )
                time.sleep(sleep_seconds)
        if last_error is not None:
            raise last_error
        raise RuntimeError("VisionTool LLM invocation failed without an exception.")

    def _is_retryable_llm_error(self, exc: Exception) -> bool:
        status_code = getattr(exc, "status_code", None)
        if status_code in {408, 409, 429, 500, 502, 503, 504}:
            return True
        error_text = f"{exc.__class__.__name__}: {exc}".lower()
        retry_markers = [
            "ratelimit",
            "rate limit",
            "toomanyrequests",
            "too many requests",
            "429",
            "temporarily unavailable",
            "timeout",
            "timed out",
            "connection reset",
            "server error",
            "service unavailable",
        ]
        return any(marker in error_text for marker in retry_markers)
