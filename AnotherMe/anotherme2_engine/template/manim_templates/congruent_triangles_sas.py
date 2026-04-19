from manim import *
import numpy as np


class CongruentTrianglesSAS(Scene):
    def construct(self):
        A = np.array([-5.2, -1.2, 0])
        B = np.array([-2.2, -1.2, 0])
        C = np.array([-4.2, 1.5, 0])

        D = np.array([1.2, -1.2, 0])
        E = np.array([4.2, -1.2, 0])
        F = np.array([2.2, 1.5, 0])

        tri1 = Polygon(A, B, C, color=BLUE)
        tri2 = Polygon(D, E, F, color=GREEN)

        self.play(Create(tri1), Create(tri2))

        side_ab = Line(A, B, color=YELLOW, stroke_width=6)
        side_de = Line(D, E, color=YELLOW, stroke_width=6)
        side_ac = Line(A, C, color=ORANGE, stroke_width=6)
        side_df = Line(D, F, color=ORANGE, stroke_width=6)

        angle_a = Angle(Line(A, B), Line(A, C), radius=0.45, color=RED)
        angle_d = Angle(Line(D, E), Line(D, F), radius=0.45, color=RED)
        angle_a_label = MathTex(r"\alpha", color=RED).scale(0.8).move_to(A + np.array([0.5, 0.35, 0]))
        angle_d_label = MathTex(r"\alpha", color=RED).scale(0.8).move_to(D + np.array([0.5, 0.35, 0]))

        self.play(Create(side_ab), Create(side_de))
        self.play(Create(side_ac), Create(side_df))
        self.play(Create(angle_a), Create(angle_d), Write(angle_a_label), Write(angle_d_label))
        self.play(Indicate(tri1), Indicate(tri2))

        self.wait(2)
