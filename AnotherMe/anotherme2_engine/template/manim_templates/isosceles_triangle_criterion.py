from manim import *
import numpy as np


class IsoscelesTriangleCriterion(Scene):
    def construct(self):
        A = np.array([-3.2, -1.5, 0])
        B = np.array([3.2, -1.5, 0])
        C = np.array([0.8, 1.8, 0])

        triangle = Polygon(A, B, C, color=WHITE)
        self.play(Create(triangle))

        angle_a = Angle(Line(A, C), Line(A, B), radius=0.45, color=GREEN, other_angle=True)
        angle_b = Angle(Line(B, A), Line(B, C), radius=0.45, color=GREEN, other_angle=True)
        label_a = MathTex(r"\alpha", color=GREEN).scale(0.8).move_to(A + np.array([0.55, 0.35, 0]))
        label_b = MathTex(r"\alpha", color=GREEN).scale(0.8).move_to(B + np.array([-0.55, 0.35, 0]))

        self.play(Create(angle_a), Create(angle_b), Write(label_a), Write(label_b))

        side_ac = Line(A, C, color=YELLOW, stroke_width=6)
        side_bc = Line(B, C, color=YELLOW, stroke_width=6)
        self.play(Create(side_ac), Create(side_bc))

        self.wait(2)
