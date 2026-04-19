from manim import *
import numpy as np


class AxialSymmetryModel(Scene):
    def construct(self):
        axis = DashedLine(UP * 3.2, DOWN * 3.2, color=BLUE)
        self.play(Create(axis))

        A = np.array([-3.4, 1.4, 0])
        B = np.array([-1.4, 1.9, 0])
        C = np.array([-2.1, -1.3, 0])
        tri = Polygon(A, B, C, color=WHITE)
        self.play(Create(tri))

        A2 = np.array([3.4, 1.4, 0])
        B2 = np.array([1.4, 1.9, 0])
        C2 = np.array([2.1, -1.3, 0])

        helper1 = DashedLine(A, A2, color=GRAY)
        helper2 = DashedLine(B, B2, color=GRAY)
        helper3 = DashedLine(C, C2, color=GRAY)
        self.play(Create(helper1), Create(helper2), Create(helper3))

        mid1 = Dot((A + A2) / 2, color=YELLOW)
        mid2 = Dot((B + B2) / 2, color=YELLOW)
        mid3 = Dot((C + C2) / 2, color=YELLOW)
        self.play(FadeIn(mid1), FadeIn(mid2), FadeIn(mid3))

        reflected = tri.copy().apply_matrix(np.array([[-1, 0, 0], [0, 1, 0], [0, 0, 1]])).set_color(GREEN)
        self.play(Transform(tri, reflected))
        self.wait(2)
