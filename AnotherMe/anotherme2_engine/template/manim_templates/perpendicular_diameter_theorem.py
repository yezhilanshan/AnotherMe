from manim import *
import numpy as np


class PerpendicularDiameterTheorem(Scene):
    def construct(self):
        O = ORIGIN
        r = 2.8
        circle = Circle(radius=r, color=WHITE)
        self.play(Create(circle))

        theta1 = 2.45
        theta2 = 0.70
        A = np.array([r * np.cos(theta1), r * np.sin(theta1), 0])
        B = np.array([r * np.cos(theta2), r * np.sin(theta2), 0])

        chord = Line(A, B, color=BLUE)
        self.play(Create(chord))

        M = (A + B) / 2
        diameter_dir = normalize(M - O)
        P1 = O - diameter_dir * r
        P2 = O + diameter_dir * r
        diameter = Line(P1, P2, color=GREEN)
        self.play(Create(diameter))

        right_angle = RightAngle(Line(O, M), chord, length=0.18)
        self.play(Create(right_angle))

        dot_o = Dot(O, color=YELLOW)
        dot_m = Dot(M, color=RED)
        self.play(FadeIn(dot_o), FadeIn(dot_m))

        seg_am = Line(A, M, color=ORANGE, stroke_width=8)
        seg_mb = Line(M, B, color=ORANGE, stroke_width=8)
        self.play(Create(seg_am), Create(seg_mb))

        arc1 = Arc(radius=r, start_angle=theta1, angle=((np.arctan2(M[1], M[0]) - theta1) % TAU), arc_center=O, color=PURPLE)
        arc2 = Arc(radius=r, start_angle=np.arctan2(M[1], M[0]), angle=((theta2 - np.arctan2(M[1], M[0])) % TAU), arc_center=O, color=PURPLE)
        self.play(Create(arc1), Create(arc2))
        self.wait(2)
