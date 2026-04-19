from manim import *
import numpy as np


class RotationModel(Scene):
    def construct(self):
        O = np.array([-0.5, -0.2, 0])
        A = np.array([2.6, -0.2, 0])
        B = np.array([2.6, 2.0, 0])

        oa = Line(O, A, color=BLUE)
        ab = Line(A, B, color=GREEN)
        ob = Line(O, B, color=WHITE)
        self.play(Create(oa), Create(ab), Create(ob))

        dot_o = Dot(O, color=YELLOW)
        dot_a = Dot(A, color=BLUE)
        dot_b = Dot(B, color=GREEN)
        self.play(FadeIn(dot_o), FadeIn(dot_a), FadeIn(dot_b))

        triangle = VGroup(Line(O, A, color=BLUE), Line(A, B, color=GREEN), Line(B, O, color=WHITE))
        rotated_triangle = triangle.copy().rotate(PI / 2, about_point=O)
        self.play(Transform(triangle, rotated_triangle))

        arc = Arc(radius=0.9, start_angle=0, angle=PI / 2, arc_center=O, color=RED)
        self.play(Create(arc))

        A2 = O + np.array([0, np.linalg.norm(A - O), 0])
        B2 = (B - O)
        B2 = np.array([-B2[1], B2[0], 0]) + O
        self.play(FadeIn(Dot(A2, color=BLUE)), FadeIn(Dot(B2, color=GREEN)))
        self.wait(2)
