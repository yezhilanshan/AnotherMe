from manim import *
import numpy as np


class RearrangementArea(Scene):
    def construct(self):
        A = np.array([-4.0, -1.5, 0])
        B = np.array([1.5, -1.5, 0])
        C = np.array([-1.5, 1.8, 0])
        D = np.array([-1.5, -1.5, 0])

        triangle = Polygon(A, B, C, color=WHITE, fill_opacity=0.18)
        cut_line = DashedLine(C, D, color=BLUE)
        self.play(Create(triangle))
        self.play(Create(cut_line))

        left_piece = Polygon(A, D, C, color=GREEN, fill_opacity=0.35, stroke_width=2)
        right_piece = Polygon(D, B, C, color=YELLOW, fill_opacity=0.35, stroke_width=2)
        self.play(FadeIn(left_piece), FadeIn(right_piece))

        target_rect = Polygon(np.array([1.7, -1.5, 0]), np.array([4.7, -1.5, 0]), np.array([4.7, 1.8, 0]), np.array([1.7, 1.8, 0]), color=WHITE)
        left_target = Polygon(np.array([1.7, -1.5, 0]), np.array([1.7, 1.8, 0]), np.array([3.2, 1.8, 0]), color=GREEN, fill_opacity=0.35, stroke_width=2)
        right_target = Polygon(np.array([3.2, -1.5, 0]), np.array([4.7, -1.5, 0]), np.array([3.2, 1.8, 0]), color=YELLOW, fill_opacity=0.35, stroke_width=2)

        self.play(Transform(left_piece, left_target), Transform(right_piece, right_target))
        self.play(Create(target_rect))
        self.wait(2)
