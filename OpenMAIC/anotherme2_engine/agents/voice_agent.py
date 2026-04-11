"""
Voice agent: generate per-step narration audio with Edge TTS.
"""

import asyncio
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional

import edge_tts

from .base_agent import BaseAgent
from .vision_tool import VisionTool


class VoiceAgent(BaseAgent):
    """Generate narration audio for script steps."""

    SYSTEM_PROMPT = """你负责把数学讲解旁白润色成适合 TTS 播放的版本。
要求：
1. 更口语化，但不要改变数学含义。
2. 句子自然，避免过长。
3. 保留关键几何对象和结论。
4. 输出纯文本。"""

    def __init__(
        self,
        config: Dict[str, Any],
        llm: Optional[Any] = None,
        vision_tool: Optional[VisionTool] = None,
    ):
        super().__init__(config, llm)
        self.system_prompt = config.get("system_prompt", self.SYSTEM_PROMPT)
        self.voice_name = config.get("voice", "zh-CN-XiaoxiaoNeural")
        self.rate = config.get("rate", "+0%")
        self.volume = config.get("volume", "+10%")

    def process(self, state: Dict[str, Any]) -> Dict[str, Any]:
        project = state["project"]
        if getattr(project, "status", "") == "failed":
            return state

        script_steps = project.script_steps
        if not script_steps:
            state["messages"].append(
                {
                    "role": "assistant",
                    "content": "没有脚本步骤，无法生成讲解音频。",
                }
            )
            return state

        print("\n[VoiceAgent] 开始生成音频...")
        optimized_narrations = self._optimize_narrations(script_steps)

        output_dir = Path(self.config.get("output_dir", "./output")) / "audio"
        output_dir.mkdir(parents=True, exist_ok=True)

        tts_files: List[str] = []
        for i, narration in enumerate(optimized_narrations):
            audio_path = output_dir / f"narration_{i + 1:03d}.mp3"
            print(f"[VoiceAgent] 生成第 {i + 1} 段音频...")
            success = asyncio.run(self._generate_tts(narration, str(audio_path)))

            if success:
                duration = self._get_audio_duration(str(audio_path))
                if duration is None or duration <= 0:
                    print(f"[VoiceAgent] ✗ 音频 {i + 1} 文件无效，已跳过")
                    self._delete_if_exists(audio_path)
                    script_steps[i].audio_file = None
                    script_steps[i].audio_duration = None
                    continue

                tts_files.append(str(audio_path))
                script_steps[i].audio_file = str(audio_path)
                script_steps[i].audio_duration = duration
                print(f"[VoiceAgent] ✓ 音频 {i + 1} 生成成功")
            else:
                script_steps[i].audio_file = None
                script_steps[i].audio_duration = None
                print(f"[VoiceAgent] ✗ 音频 {i + 1} 生成失败")

        merged_audio = None
        if tts_files:
            merged_audio = self._merge_audio_files(tts_files, output_dir / "merged_narration.mp3")
            project.audio_merged_file = merged_audio
            if merged_audio:
                print(f"[VoiceAgent] 音频合并完成：{merged_audio}")

        project.tts_audio_files = tts_files
        state["project"] = project
        state["current_step"] = "voice_completed"
        state["messages"].append(
            {
                "role": "assistant",
                "content": f"讲解音频生成完成，共 {len(tts_files)} 段。",
            }
        )
        return state

    def _optimize_narrations(self, steps: List[Any]) -> List[str]:
        print("[VoiceAgent] 优化旁白文案...")
        narrations: List[str] = []
        for step in steps:
            user_prompt = (
                "请把下面这段几何讲解润色成适合中文 TTS 播放的旁白。\n"
                "要求：自然、清晰、不要改变数学含义、不要输出解释。\n\n"
                f"{getattr(step, 'narration', '')}"
            )
            messages = self._format_messages(
                system_prompt=self.system_prompt,
                user_prompt=user_prompt,
            )
            response_content = self._invoke_llm(messages)
            narrations.append((response_content or "").strip() or str(getattr(step, "narration", "") or "").strip())
        return narrations

    async def _generate_tts(self, text: str, output_path: str) -> bool:
        max_retries = 3
        output = Path(output_path)
        for attempt in range(max_retries):
            try:
                communicate = edge_tts.Communicate(
                    text=text,
                    voice=self.voice_name,
                    rate=self.rate,
                    volume=self.volume,
                )
                await communicate.save(str(output))
                if not self._is_valid_audio_file(output):
                    raise ValueError(f"TTS output is empty or invalid: {output}")
                return True
            except Exception as exc:
                self._delete_if_exists(output)
                if attempt < max_retries - 1:
                    print(f"Edge TTS 重试 {attempt + 1}/{max_retries}: {exc}")
                    await asyncio.sleep(1)
                else:
                    print(f"Edge TTS 最终失败: {exc}")
                    return False
        return False

    def _get_audio_duration(self, audio_path: str) -> Optional[float]:
        try:
            path = Path(audio_path)
            if not self._is_valid_audio_file(path):
                return None
            from mutagen.mp3 import MP3

            audio = MP3(str(path))
            length = getattr(audio.info, "length", None)
            return float(length) if length else None
        except Exception as exc:
            print(f"获取音频时长失败：{exc}")
            return None

    def _is_valid_audio_file(self, audio_path: Path | str) -> bool:
        try:
            path = Path(audio_path)
            if not path.exists() or path.stat().st_size <= 0:
                return False
            from mutagen.mp3 import MP3

            audio = MP3(str(path))
            return bool(getattr(audio.info, "length", 0) and audio.info.length > 0)
        except Exception:
            return False

    def _merge_audio_files(self, audio_files: List[str], output_path: Path) -> Optional[str]:
        try:
            valid_audio_files = [audio for audio in audio_files if self._is_valid_audio_file(audio)]
            if not valid_audio_files:
                return None

            list_file = output_path.with_suffix(".txt")
            with open(list_file, "w", encoding="utf-8") as handle:
                for audio_file in valid_audio_files:
                    abs_path = Path(audio_file).resolve()
                    escaped_path = str(abs_path).replace("\\", "/")
                    handle.write(f"file '{escaped_path}'\n")

            result = subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-f",
                    "concat",
                    "-safe",
                    "0",
                    "-i",
                    str(list_file),
                    "-c",
                    "copy",
                    str(output_path),
                ],
                capture_output=True,
                text=True,
                timeout=60,
            )
            self._delete_if_exists(list_file)

            if result.returncode == 0 and output_path.exists() and output_path.stat().st_size > 0:
                return str(output_path)

            print(f"ffmpeg 合并音频失败：{result.stderr}")
            self._delete_if_exists(output_path)
            return None
        except Exception as exc:
            print(f"合并音频失败：{exc}")
            self._delete_if_exists(output_path)
            return None

    def _delete_if_exists(self, path: Path) -> None:
        try:
            path.unlink(missing_ok=True)
        except Exception:
            pass
