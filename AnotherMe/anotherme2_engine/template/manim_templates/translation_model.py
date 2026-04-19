from manim import *
import numpy as np


class TranslationModel(Scene):
    def construct(self):
        A = np.array([-4.0, -1.6, 0])
        B = np.array([-1.8, -0.8, 0])
        C = np.array([-3.0, 1.2, 0])

        tri = Polygon(A, B, C, color=WHITE)
        self.play(Create(tri))

        vec = np.array([4.2, 1.3, 0])
        arrow = Arrow(
            ORIGIN + LEFT * 0.5 + DOWN * 0.3,
            ORIGIN + LEFT * 0.5 + DOWN * 0.3 + vec * 0.55,
            buff=0,
            color=YELLOW,
        )
        self.play(Create(arrow))

        tri_target = tri.copy().shift(vec)
        self.play(TransformFromCopy(tri, tri_target))

        seg_a = DashedLine(A, A + vec, color=BLUE)
        seg_b = DashedLine(B, B + vec, color=BLUE)
        seg_c = DashedLine(C, C + vec, color=BLUE)
        self.play(Create(seg_a), Create(seg_b), Create(seg_c))
        self.wait(2)
