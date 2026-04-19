from manim import *
import numpy as np


class FoldModel(Scene):
    def construct(self):
        fold_line = Line(LEFT * 4.5, RIGHT * 4.5, color=BLUE)
        self.play(Create(fold_line))

        A = np.array([-2.8, -1.5, 0])
        B = np.array([-1.0, -0.4, 0])
        C = np.array([0.8, -1.3, 0])
        tri = Polygon(A, B, C, color=WHITE, fill_opacity=0.15)
        self.play(Create(tri))

        A2 = np.array([A[0], -A[1], 0])
        B2 = np.array([B[0], -B[1], 0])
        C2 = np.array([C[0], -C[1], 0])

        helper1 = DashedLine(A, A2, color=GRAY)
        helper2 = DashedLine(B, B2, color=GRAY)
        helper3 = DashedLine(C, C2, color=GRAY)
        self.play(Create(helper1), Create(helper2), Create(helper3))

        folded = Polygon(A2, B2, C2, color=GREEN, fill_opacity=0.15)
        self.play(Transform(tri, folded))
        self.wait(2)
