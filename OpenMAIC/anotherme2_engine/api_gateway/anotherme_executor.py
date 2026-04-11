"""AnotherMe2 execution adapter for problem-video jobs."""

from __future__ import annotations

import shutil
import subprocess
import tempfile
import base64
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict

from .storage import ObjectStorage


@dataclass
class ProblemVideoExecutionResult:
    video_path: str
    duration_sec: float
    script_steps_count: int
    debug_bundle_path: str | None
    requirement_hint: str | None


def _probe_duration(path: str) -> float:
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        if result.returncode == 0:
            return float(result.stdout.strip() or 0.0)
    except Exception:
        return 0.0
    return 0.0


def _zip_debug_bundle(run_output_dir: Path) -> str | None:
    debug_dir = run_output_dir / "debug"
    if not debug_dir.exists():
        return None
    archive = run_output_dir / "debug_bundle"
    shutil.make_archive(str(archive), "zip", root_dir=debug_dir)
    zipped = archive.with_suffix(".zip")
    return str(zipped) if zipped.exists() else None


def _render_text_image(text: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        from PIL import Image, ImageDraw, ImageFont

        image = Image.new("RGB", (1280, 720), "white")
        draw = ImageDraw.Draw(image)
        font = ImageFont.load_default()
        normalized = (text or "").strip() or "No extracted problem text."
        lines = []
        current = ""
        for token in normalized.split():
            test = f"{current} {token}".strip()
            if len(test) > 38:
                lines.append(current)
                current = token
            else:
                current = test
        if current:
            lines.append(current)
        if not lines:
            lines = [normalized]

        y = 40
        for line in lines[:22]:
            draw.text((40, y), line, fill="black", font=font)
            y += 28

        image.save(path, format="PNG")
    except Exception:
        # Fallback to a valid 1x1 PNG to keep downstream vision flow operational.
        png_1x1 = (
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO8N7x8AAAAASUVORK5CYII="
        )
        path.write_bytes(base64.b64decode(png_1x1))


def build_requirement_from_photo(image_path: str) -> str:
    from agents.config import build_vision_model_config
    from agents.vision_tool import VisionTool

    vision = VisionTool(build_vision_model_config())
    ocr_text = (vision.extract_problem_text(image_path) or "").strip()
    geometry_hint = (vision.describe_geometry(image_path) or "").strip()
    snippet = geometry_hint[:600]
    return (
        "请基于以下学生拍题内容生成一节讲解课程，包含概念回顾、解题步骤、易错点与练习建议。\n"
        f"题目OCR：{ocr_text}\n"
        f"图形摘要：{snippet}"
    )


def run_problem_video_job(
    payload: Dict[str, Any],
    storage: ObjectStorage,
    temp_root: str,
) -> ProblemVideoExecutionResult:
    from agents.config import build_default_llm_config, build_vision_model_config
    from main import MathVideoGenerator

    workdir = Path(tempfile.mkdtemp(prefix="problem-video-", dir=temp_root))
    input_image_path = workdir / "problem_input.png"

    storage.download_file(payload["image_object_key"], str(input_image_path))

    geometry_file = payload.get("geometry_file")
    geometry_local = None
    if geometry_file:
        geometry_local = workdir / "geometry_input.json"
        storage.download_file(geometry_file, str(geometry_local))

    output_dir = workdir / "run_output"
    output_dir.mkdir(parents=True, exist_ok=True)

    generator = MathVideoGenerator(
        llm_config=build_default_llm_config(),
        vision_config=build_vision_model_config(),
    )

    final_video_path = generator.generate(
        image_path=str(input_image_path),
        problem_text=payload.get("problem_text"),
        output_dir=str(output_dir),
        geometry_file=str(geometry_local) if geometry_local else None,
        export_ggb=True,
    )

    if not final_video_path or not Path(final_video_path).exists():
        raise RuntimeError("AnotherMe2 did not produce a final video/audio artifact")

    script_steps_count = len(list((output_dir / "audio").glob("narration_*.mp3")))
    duration = _probe_duration(final_video_path)
    debug_bundle = _zip_debug_bundle(output_dir)

    requirement_hint = None
    try:
        requirement_hint = build_requirement_from_photo(str(input_image_path))
    except Exception:
        requirement_hint = None

    return ProblemVideoExecutionResult(
        video_path=final_video_path,
        duration_sec=duration,
        script_steps_count=script_steps_count,
        debug_bundle_path=debug_bundle,
        requirement_hint=requirement_hint,
    )


def synthesize_problem_image_from_text(
    text: str,
    storage: ObjectStorage,
    object_key: str,
    temp_root: str,
) -> str:
    workdir = Path(tempfile.mkdtemp(prefix="synthetic-problem-", dir=temp_root))
    image_path = workdir / "synthetic_problem.png"
    _render_text_image(text, image_path)
    storage.upload_file(str(image_path), object_key, content_type="image/png")
    return object_key


def extract_core_example_text(classroom_payload: Dict[str, Any]) -> str:
    classroom = classroom_payload.get("classroom") or classroom_payload
    scenes = classroom.get("scenes") if isinstance(classroom, dict) else None
    if not isinstance(scenes, list) or not scenes:
        return "请围绕该主题提供一个典型例题并给出分步讲解。"

    # Priority: quiz question -> first speech action -> scene title
    for scene in scenes:
        content = scene.get("content") if isinstance(scene, dict) else {}
        if isinstance(content, dict) and content.get("type") == "quiz":
            questions = content.get("questions") or []
            if questions and isinstance(questions[0], dict):
                stem = questions[0].get("stem") or questions[0].get("question")
                if stem:
                    return str(stem)

    for scene in scenes:
        actions = scene.get("actions") if isinstance(scene, dict) else []
        for action in actions or []:
            if isinstance(action, dict) and action.get("type") == "speech" and action.get("text"):
                return str(action["text"])

    first = scenes[0]
    if isinstance(first, dict) and first.get("title"):
        return str(first["title"])

    return "请围绕该主题提供一个典型例题并给出分步讲解。"

