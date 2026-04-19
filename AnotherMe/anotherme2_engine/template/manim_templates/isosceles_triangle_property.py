from manim import *
import numpy as np


class IsoscelesTriangleProperty(Scene):
    def construct(self):
        A = np.array([-3, -1.5, 0])
        B = np.array([3, -1.5, 0])
        C = np.array([0, 2.0, 0])
        D = np.array([0, -1.5, 0])

        triangle = Polygon(A, B, C, color=WHITE)
        median = DashedLine(C, D, color=BLUE)

        self.play(Create(triangle))
        side_ac = Line(A, C, color=YELLOW, stroke_width=6)
        side_bc = Line(B, C, color=YELLOW, stroke_width=6)
        self.play(Create(side_ac), Create(side_bc))

        self.play(Create(median))

        angle_a = Angle(Line(A, C), Line(A, B), radius=0.45, color=GREEN, other_angle=True)
        angle_b = Angle(Line(B, A), Line(B, C), radius=0.45, color=GREEN, other_angle=True)
        label_a = MathTex(r"\alpha", color=GREEN).scale(0.8).move_to(A + np.array([0.55, 0.35, 0]))
        label_b = MathTex(r"\alpha", color=GREEN).scale(0.8).move_to(B + np.array([-0.55, 0.35, 0]))

        self.play(Create(angle_a), Create(angle_b), Write(label_a), Write(label_b))

        right_angle = RightAngle(Line(D, A), Line(D, C), length=0.2)
        self.play(Create(right_angle))

        self.wait(2)
