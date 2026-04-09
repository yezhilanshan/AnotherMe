"""
直角三角形折叠问题动画讲解
题目：在 Rt△ABC 中，∠C = 90°, BC = 6 cm, AC = 8 cm
      将△BCD 沿 BD 折叠，使点 C 落在 AB 边的点 C'
      求△ADC' 的面积

解题思路：
1. 首先计算 AB = √(AC² + BC²) = √(64 + 36) = 10 cm
2. 折叠后 BC' = BC = 6 cm, 所以 AC' = AB - BC' = 10 - 6 = 4 cm
3. 设 CD = x, 则 AD = 8 - x, C'D = CD = x (折叠性质)
4. 在△ADC'中用余弦定理：x² = 4² + (8-x)² - 2·4·(8-x)·cos(A)
5. cos(A) = AC/AB = 8/10 = 0.8
6. 解得 x = 3, 即 CD = 3 cm, AD = 5 cm
7. △ADC' 的面积 = ½ × AD × AC' × sin(A) = ½ × 5 × 4 × 0.6 = 6 cm²
"""

from manim import *
import numpy as np

class TriangleFoldAnimation(Scene):
    def construct(self):
        # 配置
        config.background_color = "#1a1a2e"

        # 定义坐标 (放大比例)
        scale = 0.8
        C = ORIGIN
        B = UP * 6 * scale
        A = LEFT * 8 * scale
        D = LEFT * 3 * scale  # CD = 3

        # 计算 AB 长度和角度
        AB = np.sqrt(6**2 + 8**2)  # = 10
        cos_A = 8 / 10
        sin_A = 6 / 10

        # C' 在 AB 上，AC' = 4 cm
        # 从 A 沿 AB 方向走 4 cm
        AB_direction = (B - A) / np.linalg.norm(B - A)
        C_prime = A + AB_direction * 4 * scale

        # ===== 标题 =====
        title = Text("直角三角形折叠问题", font_size=36, color=YELLOW)
        title.to_edge(UP)

        self.play(Write(title))
        self.wait(0.5)

        # ===== 显示题目条件 =====
        conditions = VGroup(
            Text("已知条件:", font_size=28, color=WHITE),
            Text("  • Rt△ABC 中，∠C = 90°", font_size=24, color=LIGHT_GRAY),
            Text("  • BC = 6 cm", font_size=24, color=LIGHT_GRAY),
            Text("  • AC = 8 cm", font_size=24, color=LIGHT_GRAY),
            Text("  • 将△BCD 沿 BD 折叠", font_size=24, color=LIGHT_GRAY),
            Text("  • 点 C 落在 AB 边的点 C'", font_size=24, color=LIGHT_GRAY),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.15)
        conditions.to_edge(LEFT, buff=0.5)
        conditions.shift(UP * 0.5)

        self.play(FadeIn(conditions))
        self.wait(1)

        # ===== 绘制原始三角形 ABC =====
        triangle_ABC = Polygon(A, B, C, color=BLUE, fill_opacity=0.3)

        label_A = Text("A", font_size=28).next_to(A, DOWN + LEFT, buff=0.15)
        label_B = Text("B", font_size=28).next_to(B, UP + RIGHT, buff=0.15)
        label_C = Text("C", font_size=28).next_to(C, DOWN + RIGHT, buff=0.15)

        # 直角标记
        right_angle = Polygon(
            C, C + RIGHT * 0.4 * scale, C + RIGHT * 0.4 * scale + UP * 0.4 * scale,
            C + UP * 0.4 * scale, C,
            color=WHITE, fill_opacity=0.5
        )

        # 边长标注
        AC_label = Text("8 cm", font_size=22, color=GREEN).next_to((A + C) / 2, DOWN, buff=0.15)
        BC_label = Text("6 cm", font_size=22, color=RED).next_to((B + C) / 2, RIGHT, buff=0.15)

        self.play(
            Create(triangle_ABC),
            Create(label_A), Create(label_B), Create(label_C),
            Create(right_angle),
            FadeIn(AC_label), FadeIn(BC_label),
            run_time=2
        )
        self.wait(0.5)

        # ===== 计算 AB 长度 =====
        pythagoras = MathTex(r"AB = \sqrt{AC^2 + BC^2} = \sqrt{8^2 + 6^2} = \sqrt{64 + 36} = 10 \text{ cm}",
                            font_size=30, color=YELLOW)
        pythagoras.to_edge(RIGHT, buff=0.5)
        pythagoras.shift(UP * 2.5)

        self.play(Write(pythagoras))
        self.wait(1)

        # ===== 绘制折痕 BD 和点 D =====
        BD = DashedLine(B, D, color=ORANGE, stroke_width=3)
        label_D = Text("D", font_size=28, color=ORANGE).next_to(D, DOWN, buff=0.15)
        CD_label = Text("x", font_size=20, color=ORANGE).next_to((C + D) / 2, DOWN, buff=0.12)
        AD_label = Text("8-x", font_size=20, color=PURPLE).next_to((A + D) / 2, DOWN, buff=0.12)

        # 高亮△BCD
        triangle_BCD = Polygon(B, C, D, color=ORANGE, fill_opacity=0.4)

        self.play(
            Create(triangle_BCD),
            Create(BD),
            FadeIn(label_D),
            run_time=1.5
        )
        self.wait(0.5)

        # ===== 折叠动画 =====
        fold_instruction = Text("折叠△BCD 沿 BD...", font_size=28, color=ORANGE)
        fold_instruction.to_edge(RIGHT, buff=0.5)
        fold_instruction.shift(UP * 1.5)

        self.play(Write(fold_instruction))

        # 创建折叠动画 - △BCD 翻折到△BC'D
        triangle_BC_prime_D = Polygon(B, C_prime, D, color=GREEN, fill_opacity=0.4)

        BC_prime_label = Text("6 cm", font_size=18, color=GREEN).next_to((B + C_prime) / 2, UP + LEFT, buff=0.1)
        AC_prime_label = Text("4 cm", font_size=20, color=BLUE).next_to((A + C_prime) / 2, UP + LEFT, buff=0.12)

        self.play(
            FadeOut(triangle_BCD),
            FadeIn(triangle_BC_prime_D),
            FadeIn(BC_prime_label),
            FadeIn(AC_prime_label),
            run_time=2
        )

        # C' 点标签
        label_C_prime = Text("C'", font_size=28, color=GREEN).next_to(C_prime, UP + LEFT, buff=0.15)
        self.play(FadeIn(label_C_prime))
        self.wait(0.5)

        # ===== 折叠性质说明 =====
        fold_properties = VGroup(
            Text("折叠性质:", font_size=26, color=YELLOW),
            Text("  • BC' = BC = 6 cm", font_size=22, color=LIGHT_GRAY),
            Text("  • C'D = CD = x", font_size=22, color=LIGHT_GRAY),
            Text("  • AC' = AB - BC' = 10 - 6 = 4 cm", font_size=22, color=LIGHT_GRAY),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.12)
        fold_properties.to_edge(RIGHT, buff=0.5)
        fold_properties.shift(UP * 0.5)

        self.play(FadeIn(fold_properties))
        self.wait(1)

        # ===== 余弦定理求解 x =====
        cos_A_text = MathTex(r"\cos A = \frac{AC}{AB} = \frac{8}{10} = 0.8", font_size=28, color=WHITE)
        cos_A_text.to_edge(RIGHT, buff=0.5)
        cos_A_text.shift(DOWN * 1.5)

        self.play(Write(cos_A_text))
        self.wait(0.5)

        # 余弦定理公式
        cosine_law = MathTex(
            r"C'D^2 = AC'^2 + AD^2 - 2 \cdot AC' \cdot AD \cdot \cos A",
            font_size=26, color=WHITE
        )
        cosine_law.to_edge(RIGHT, buff=0.5)
        cosine_law.shift(DOWN * 2.2)

        self.play(Write(cosine_law))
        self.wait(0.5)

        # 代入数值
        substitute = MathTex(
            r"x^2 = 4^2 + (8-x)^2 - 2 \cdot 4 \cdot (8-x) \cdot 0.8",
            font_size=26, color=YELLOW
        )
        substitute.to_edge(RIGHT, buff=0.5)
        substitute.shift(DOWN * 2.8)

        self.play(Write(substitute))
        self.wait(1)

        # 解
        solution = MathTex(r"x = 3 \text{ cm}", font_size=30, color=GREEN)
        solution.to_edge(RIGHT, buff=0.5)
        solution.shift(DOWN * 3.4)

        self.play(Write(solution))
        self.wait(0.5)

        # 更新 AD 标签
        self.play(
            FadeOut(AD_label),
            FadeOut(CD_label),
        )

        AD_final = Text("AD = 5 cm", font_size=20, color=PURPLE).next_to((A + D) / 2, DOWN, buff=0.12)
        CD_final = Text("CD = 3 cm", font_size=20, color=ORANGE).next_to((C + D) / 2, DOWN, buff=0.12)

        self.play(FadeIn(AD_final), FadeIn(CD_final))
        self.wait(0.5)

        # ===== 计算△ADC' 面积 =====
        area_title = Text("计算△ADC' 的面积:", font_size=28, color=YELLOW)
        area_title.to_edge(RIGHT, buff=0.5)
        area_title.shift(UP * 2.8)

        # 清除之前的公式
        self.play(
            FadeOut(fold_properties),
            FadeOut(pythagoras),
            FadeOut(fold_instruction),
            FadeOut(cos_A_text),
            FadeOut(cosine_law),
            FadeOut(substitute),
            FadeOut(solution),
        )

        self.play(Write(area_title))
        self.wait(0.5)

        # sin(A)
        sin_A_text = MathTex(r"\sin A = \frac{BC}{AB} = \frac{6}{10} = 0.6", font_size=28, color=WHITE)
        sin_A_text.to_edge(RIGHT, buff=0.5)
        sin_A_text.shift(UP * 1.8)

        self.play(Write(sin_A_text))
        self.wait(0.5)

        # 面积公式
        area_formula = MathTex(
            r"S_{\triangle ADC'} = \frac{1}{2} \cdot AD \cdot AC' \cdot \sin A",
            font_size=28, color=WHITE
        )
        area_formula.to_edge(RIGHT, buff=0.5)
        area_formula.shift(UP * 0.8)

        self.play(Write(area_formula))
        self.wait(0.5)

        # 代入
        area_substitute = MathTex(
            r"S_{\triangle ADC'} = \frac{1}{2} \cdot 5 \cdot 4 \cdot 0.6",
            font_size=28, color=YELLOW
        )
        area_substitute.to_edge(RIGHT, buff=0.5)
        area_substitute.shift(DOWN * 0.2)

        self.play(Write(area_substitute))
        self.wait(0.5)

        # 结果
        area_result = MathTex(
            r"S_{\triangle ADC'} = 6 \text{ cm}^2",
            font_size=36, color=GREEN
        )
        area_result.to_edge(RIGHT, buff=0.5)
        area_result.shift(DOWN * 1.2)

        self.play(Write(area_result))
        self.wait(1)

        # ===== 高亮△ADC' =====
        triangle_ADC_prime = Polygon(A, D, C_prime, color=YELLOW, fill_opacity=0.5)

        self.play(
            FadeOut(triangle_BC_prime_D),
            FadeIn(triangle_ADC_prime),
        )
        self.wait(1)

        # ===== 最终答案 =====
        final_answer = VGroup(
            Text("最终答案:", font_size=32, color=YELLOW),
            Text("△ADC' 的面积 = 6 cm²", font_size=36, color=GREEN, weight=BOLD),
        ).arrange(DOWN, buff=0.3)
        final_answer.move_to(RIGHT * 2)

        self.play(
            FadeOut(area_title),
            FadeOut(sin_A_text),
            FadeOut(area_formula),
            FadeOut(area_substitute),
            FadeOut(area_result),
            FadeIn(final_answer),
        )
        self.wait(2)

        # ===== 结束 =====
        end_text = Text("感谢观看!", font_size=36, color=BLUE)
        end_text.move_to(ORIGIN)

        self.play(
            FadeOut(final_answer),
            FadeOut(triangle_ADC_prime),
            FadeOut(title),
            FadeOut(conditions),
            FadeOut(label_A), FadeOut(label_B), FadeOut(label_C),
            FadeOut(label_D), FadeOut(label_C_prime),
            FadeOut(right_angle),
            FadeOut(AC_label), FadeOut(BC_label),
            FadeOut(BC_prime_label), FadeOut(AC_prime_label),
            FadeOut(AD_final), FadeOut(CD_final),
            FadeOut(BD),
            Write(end_text),
            run_time=2
        )
        self.wait(1)


# 运行配置
if __name__ == "__main__":
    # 命令行运行：
    # manim -pql triangle_fold_animation.py TriangleFoldAnimation  # 低质量快速预览
    # manim -pqh triangle_fold_animation.py TriangleFoldAnimation  # 高质量渲染
    # manim -r 1920,1080 triangle_fold_animation.py TriangleFoldAnimation  # 1080p

    print("使用以下命令运行动画:")
    print("  manim -pql triangle_fold_animation.py TriangleFoldAnimation  (快速预览)")
    print("  manim -pqh triangle_fold_animation.py TriangleFoldAnimation  (高质量)")
    print("  manim -r 1920,1080 triangle_fold_animation.py TriangleFoldAnimation  (1080p)")
