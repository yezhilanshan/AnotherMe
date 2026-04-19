from manim import *
import numpy as np


class AxialSymmetryFold(Scene):
    def construct(self):
        axis = DashedLine(UP * 3.2, DOWN * 3.2, color=BLUE)
        self.play(Create(axis))

        A = np.array([-3.2, 1.4, 0])
        B = np.array([-1.2, 1.9, 0])
        C = np.array([-2.0, -1.2, 0])
        triangle = Polygon(A, B, C, color=WHITE)
        self.play(Create(triangle))

        A_ref = np.array([3.2, 1.4, 0])
        B_ref = np.array([1.2, 1.9, 0])
        C_ref = np.array([2.0, -1.2, 0])
        reflected = Polygon(A_ref, B_ref, C_ref, color=GREEN)

        mid_a = Dot((A + A_ref) / 2, color=YELLOW)
        mid_b = Dot((B + B_ref) / 2, color=YELLOW)
        mid_c = Dot((C + C_ref) / 2, color=YELLOW)
        seg_a = DashedLine(A, A_ref, color=GRAY)
        seg_b = DashedLine(B, B_ref, color=GRAY)
        seg_c = DashedLine(C, C_ref, color=GRAY)

        self.play(Create(seg_a), Create(seg_b), Create(seg_c))
        self.play(FadeIn(mid_a), FadeIn(mid_b), FadeIn(mid_c))

        fold_target = triangle.copy().apply_matrix(np.array([[-1, 0, 0], [0, 1, 0], [0, 0, 1]]))
        self.play(Transform(triangle, fold_target.set_color(GREEN)))
        self.play(FadeIn(reflected))
        self.wait(2)
