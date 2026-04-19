from manim import *
import numpy as np


class MidpointModel(Scene):
    def construct(self):
        A = np.array([-4.2, -1.8, 0])
        B = np.array([4.0, -1.8, 0])
        C = np.array([-1.0, 2.0, 0])

        triangle = Polygon(A, B, C, color=WHITE)
        title1 = MathTex(r"M,N\ \text{are midpoints}").scale(0.72).to_edge(UP)
        title2 = MathTex(r"MN\parallel AB,\qquad MN=\frac12 AB").scale(0.72).next_to(title1, DOWN, buff=0.15)
        self.play(Create(triangle))
        self.play(Write(title1), Write(title2))

        M = (A + C) / 2
        N = (B + C) / 2
        dot_m = Dot(M, color=BLUE)
        dot_n = Dot(N, color=GREEN)
        label_m = MathTex("M", color=BLUE).scale(0.8).next_to(M, LEFT, buff=0.12)
        label_n = MathTex("N", color=GREEN).scale(0.8).next_to(N, RIGHT, buff=0.12)
        self.play(FadeIn(dot_m), FadeIn(dot_n), Write(label_m), Write(label_n))

        ac_tick1 = Line(M + np.array([-0.12, 0.12, 0]), M + np.array([0.08, -0.08, 0]), color=BLUE)
        ac_tick2 = Line(M + np.array([-0.02, 0.20, 0]), M + np.array([0.18, 0.0, 0]), color=BLUE)
        bc_tick1 = Line(N + np.array([-0.16, -0.04, 0]), N + np.array([0.04, 0.16, 0]), color=GREEN)
        bc_tick2 = Line(N + np.array([-0.08, -0.14, 0]), N + np.array([0.12, 0.06, 0]), color=GREEN)
        self.play(Create(ac_tick1), Create(ac_tick2), Create(bc_tick1), Create(bc_tick2))

        mid_seg = Line(M, N, color=YELLOW, stroke_width=6)
        base = Line(A, B, color=PURPLE, stroke_width=6)
        self.play(Create(mid_seg))
        self.play(Indicate(mid_seg), Indicate(base))

        parallel_marks_top = VGroup(
            Line(M + np.array([0.0, 0.14, 0]), M + np.array([0.22, 0.14, 0]), color=YELLOW),
            Line(N + np.array([-0.22, 0.14, 0]), N + np.array([0.0, 0.14, 0]), color=YELLOW),
        )
        parallel_marks_base = VGroup(
            Line(A + np.array([2.0, 0.14, 0]), A + np.array([2.22, 0.14, 0]), color=PURPLE),
            Line(B + np.array([-2.22, 0.14, 0]), B + np.array([-2.0, 0.14, 0]), color=PURPLE),
        )
        small_tri = Polygon(M, N, C, color=BLUE, fill_opacity=0.2)
        self.play(Create(parallel_marks_top), Create(parallel_marks_base), FadeIn(small_tri))
        self.wait(2)
