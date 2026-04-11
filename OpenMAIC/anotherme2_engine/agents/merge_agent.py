"""
合成智能体 - 负责渲染动画并合并音视频
"""
import os
import re
import shutil
import subprocess
from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path

from .base_agent import BaseAgent
from .repair_agent import RepairAgent
from .state import VideoProject


class MergeAgent(BaseAgent):
    """合成智能体"""

    def __init__(self, config: Dict[str, Any], llm: Optional[Any] = None):
        super().__init__(config, llm)
        self.output_dir = Path(config.get("output_dir", "./output"))
        self.resolution = config.get("resolution", "1920x1080")
        self.fps = config.get("fps", 60)
        # 默认低画质以提升稳定性与调试速度（可通过配置覆盖为 -qm/-qh）
        self.manim_quality = config.get("manim_quality", "-ql")
        self.render_timeout = int(config.get("render_timeout", 900))
        self.max_repair_rounds = int(config.get("max_repair_rounds", 3))
        self.canvas_config = config.get("canvas_config", {
            "frame_height": 8.0,
            "frame_width": 14.222,
            "safe_margin": 0.4,
            "left_panel_x_max": 1.0,
            "right_panel_x_min": 1.8,
        })
        self.layout = config.get("layout", "left_graph_right_formula")
        self._last_render_error = ""
        self.repair_agent = RepairAgent(
            config={
                "use_llm_repair": False,
                "color_fallback_map": {
                    "CYAN": "BLUE",
                    "LIGHTBLUE": "BLUE",
                    "ORANGE_RED": "ORANGE",
                },
                "frame_width": self.canvas_config.get("frame_width", 14.222),
                "frame_height": self.canvas_config.get("frame_height", 8.0),
                "safe_margin": self.canvas_config.get("safe_margin", 0.4),
                "right_panel_x_min": self.canvas_config.get("right_panel_x_min", 1.8),
            },
            llm=None,
        )

    def process(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理状态，渲染动画并合并音视频

        Args:
            state: 当前状态，包含 manim_code 和 audio_files

        Returns:
            更新后的状态，包含 final_video_path
        """
        project = state["project"]
        if getattr(project, "status", "") == "failed":
            return state

        # 1. 保存 Manim 代码到文件
        print("\n[MergeAgent] 开始合成视频...")

        manim_code = state.get("metadata", {}).get("manim_code", "")
        if not manim_code:
            state["messages"].append({
                "role": "assistant",
                "content": "错误：没有 Manim 代码，无法渲染动画"
            })
            state["project"].status = "failed"
            state["project"].error_message = "没有 Manim 代码"
            return state

        # 保存代码
        self.output_dir.mkdir(parents=True, exist_ok=True)
        manim_file = self.output_dir / "math_animation.py"
        with open(manim_file, 'w', encoding='utf-8') as f:
            f.write(manim_code)
        project.manim_file_path = str(manim_file)
        print(f"[MergeAgent] Manim 代码已保存：{manim_file}")

        # 1.5 渲染前做越界/布局风险检查
        risk_warnings = self._check_layout_risks(manim_code)
        if risk_warnings:
            print("[MergeAgent] 布局风险检查发现潜在问题：")
            for w in risk_warnings:
                print(f"  - {w}")
            state["messages"].append({
                "role": "assistant",
                "content": "渲染前布局风险提示：\n- " + "\n- ".join(risk_warnings)
            })

        # 2. 渲染 Manim 动画
        video_file = self.output_dir / "animation.mp4"
        if video_file.exists():
            video_file.unlink()
        class_name = project.manim_class_name or "MathAnimation"
        print(f"[MergeAgent] 开始渲染 Manim 动画（类名: {class_name}）...")
        working_code = manim_code
        render_success = False
        render_error = ""
        for round_idx in range(self.max_repair_rounds + 1):
            render_success, render_error = self._render_manim(
                manim_file=str(manim_file),
                output_file=str(video_file),
                class_name=class_name
            )
            if render_success:
                if round_idx > 0:
                    print(f"[MergeAgent] 经过 {round_idx} 轮修复后渲染成功")
                    state["messages"].append({
                        "role": "assistant",
                        "content": f"Manim 经过 {round_idx} 轮自动修复后渲染成功"
                    })
                break

            # 最后一轮失败后直接退出
            if round_idx >= self.max_repair_rounds:
                break

            fixed_code, fixes = self.repair_agent.repair_with_error(working_code, render_error)
            if fixed_code == working_code:
                # 无可修复变化，避免死循环
                break

            print(f"[MergeAgent] 第 {round_idx + 1} 轮自动修复完成，开始重试渲染...")
            state["messages"].append({
                "role": "assistant",
                "content": (
                    f"触发第 {round_idx + 1} 轮自动修复并重试渲染；"
                    f"修复项：{'；'.join(fixes) if fixes else '基于报错未匹配到规则'}"
                )
            })
            working_code = fixed_code
            with open(manim_file, 'w', encoding='utf-8') as f:
                f.write(working_code)
            state.setdefault("metadata", {})["manim_code"] = working_code

        if not render_success:
            state["messages"].append({
                "role": "assistant",
                "content": f"警告：Manim 渲染失败，尝试继续处理音频。错误摘要：{render_error[:180]}"
            })

        # 3. 合并音视频
        audio_file = project.audio_merged_file
        if render_success and project.audio_embedded:
            # 音频已通过 self.add_sound() 嵌入 Manim 渲染结果，直接使用
            project.final_video_path = str(video_file)
            state["messages"].append({
                "role": "assistant",
                "content": f"音频已嵌入动画（add_sound），输出视频：{video_file}"
            })
        elif audio_file and os.path.exists(audio_file):
            if render_success and os.path.exists(video_file):
                # 有视频有音频，合并
                final_video = self.output_dir / "final_video.mp4"
                merge_success = self._merge_audio_video(
                    video_file=str(video_file),
                    audio_file=audio_file,
                    output_file=str(final_video)
                )
                if merge_success:
                    project.final_video_path = str(final_video)
                    state["messages"].append({
                        "role": "assistant",
                        "content": f"视频合成完成：{final_video}"
                    })
                else:
                    project.final_video_path = str(video_file)
                    state["messages"].append({
                        "role": "assistant",
                        "content": f"音频合并失败，输出无声视频：{video_file}"
                    })
            else:
                # 只有音频，输出音频文件
                state["messages"].append({
                    "role": "assistant",
                    "content": f"Manim 渲染失败，仅输出音频：{audio_file}"
                })
                project.final_video_path = audio_file
        else:
            # 只有视频
            if render_success and os.path.exists(video_file):
                project.final_video_path = str(video_file)
                state["messages"].append({
                    "role": "assistant",
                    "content": f"输出无声视频：{video_file}"
                })

        # 更新状态
        project.animation_rendered = os.path.exists(video_file)
        if project.final_video_path:
            if render_success:
                project.status = "completed"
            else:
                project.status = "completed_with_fallback"
                project.error_message = (
                    project.error_message
                    or "Manim render failed; returned audio-only fallback output."
                )
        else:
            project.status = "failed"
        if not project.final_video_path:
            project.error_message = project.error_message or "未能生成最终视频文件"
        state["project"] = project
        state["current_step"] = "merge_completed"

        return state

    def _check_layout_risks(self, manim_code: str) -> List[str]:
        """渲染前进行静态布局风险扫描，提前提示越界和左右分栏冲突。"""
        warnings: List[str] = []
        fw = float(self.canvas_config.get("frame_width", 14.222))
        fh = float(self.canvas_config.get("frame_height", 8.0))
        safe_margin = float(self.canvas_config.get("safe_margin", 0.4))
        half_w = fw / 2.0
        half_h = fh / 2.0

        if "config.frame_height" not in manim_code or "config.frame_width" not in manim_code:
            warnings.append("未检测到 config.frame_height/frame_width 显式设置，可能使用默认画幅导致布局偏移。")

        # 检查明显超界的 shift 值
        shift_pattern = re.compile(r"\.shift\(\s*(LEFT|RIGHT|UP|DOWN)\s*\*\s*([0-9]+(?:\.[0-9]+)?)")
        for direction, value_str in shift_pattern.findall(manim_code):
            value = float(value_str)
            if direction in ("LEFT", "RIGHT") and value > (half_w - safe_margin):
                warnings.append(f"检测到 shift({direction} * {value})，超过安全水平范围，可能导致元素出框。")
            if direction in ("UP", "DOWN") and value > (half_h - safe_margin):
                warnings.append(f"检测到 shift({direction} * {value})，超过安全垂直范围，可能导致元素出框。")

        # 左图右公式布局检查：文本/公式放左边属于高风险
        if self.layout == "left_graph_right_formula":
            text_left_pattern = re.compile(
                r"(?:Text|MathTex|Tex)\([^\n]*\)\s*\.\s*(?:to_edge\(LEFT|to_corner\((?:UL|DL))"
            )
            if text_left_pattern.search(manim_code):
                warnings.append("检测到 Text/MathTex/Tex 被放在左侧，可能破坏“左图右公式”布局。")

            graph_right_pattern = re.compile(
                r"(?:Polygon|Line|Dot|Circle|Square|Triangle)\([^\n]*\)\s*\.\s*(?:to_edge\(RIGHT|to_corner\((?:UR|DR))"
            )
            if graph_right_pattern.search(manim_code):
                warnings.append("检测到几何图元被放在右侧，可能与公式区重叠。")

        return warnings

    def _render_manim(self, manim_file: str, output_file: str,
                      class_name: str = "MathAnimation") -> Tuple[bool, str]:
        """
        渲染 Manim 动画

        Args:
            manim_file: Manim 代码文件路径
            output_file: 输出视频文件路径
            class_name: Manim Scene 类名

        Returns:
            (是否成功, 错误信息)
        """
        try:
            media_dir = self.output_dir / "media"
            # 用 --media_dir 控制输出目录，避免路径修得问题
            cmd = [
                "manim", self.manim_quality,
                "--format=mp4",
                "--media_dir", str(media_dir),
                manim_file,
                class_name
            ]

            print(f"执行 Manim 命令：{' '.join(cmd)}")

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=self.render_timeout
            )

            if result.returncode == 0:
                # 在 media_dir 下搜索刚生成的 mp4，复制到 output_file
                mp4_files = list(media_dir.rglob("*.mp4"))
                if mp4_files:
                    latest = max(mp4_files, key=lambda p: p.stat().st_mtime)
                    shutil.copy2(str(latest), output_file)
                    print(f"Manim 渲染成功：{output_file}")
                    return True, ""
                print("Manim 渲染成功但未找到输出文件")
                return False, "Manim 渲染成功但未找到输出文件"
            else:
                print(f"Manim 渲染失败：{result.stderr}")
                return False, result.stderr or result.stdout or "未知渲染错误"

        except subprocess.TimeoutExpired:
            print("Manim 渲染超时")
            return False, "Manim 渲染超时"
        except FileNotFoundError:
            print("未找到 manim 命令，请确保已安装")
            return False, "未找到 manim 命令"
        except Exception as e:
            print(f"Manim 渲染异常：{e}")
            return False, str(e)

    def _merge_audio_video(self, video_file: str, audio_file: str, output_file: str) -> bool:
        """
        合并视频和音频

        Args:
            video_file: 输入视频文件
            audio_file: 输入音频文件
            output_file: 输出文件

        Returns:
            是否成功
        """
        try:
            cmd = [
                "ffmpeg", "-y",
                "-i", video_file,
                "-i", audio_file,
                "-c:v", "copy",
                "-c:a", "aac",
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-shortest",
                output_file
            ]

            print(f"执行 FFmpeg 命令：{' '.join(cmd)}")

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120
            )

            if result.returncode == 0:
                print(f"音视频合并成功：{output_file}")
                return True
            else:
                print(f"FFmpeg 错误：{result.stderr}")
                return False

        except subprocess.TimeoutExpired:
            print("FFmpeg 超时")
            return False
        except FileNotFoundError:
            print("未找到 ffmpeg 命令，请确保已安装")
            return False
        except Exception as e:
            print(f"FFmpeg 异常：{e}")
            return False
