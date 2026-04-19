from manim import *
import numpy as np


class ChordArcRelation(Scene):
    def construct(self):
        O = ORIGIN
        r = 2.8
        circle = Circle(radius=r, color=WHITE)
        self.play(Create(circle))

        theta_a = 2.5
        theta_b = 0.65
        theta_c = 3.7
        theta_d = 5.75

        A = np.array([r * np.cos(theta_a), r * np.sin(theta_a), 0])
        B = np.array([r * np.cos(theta_b), r * np.sin(theta_b), 0])
        C = np.array([r * np.cos(theta_c), r * np.sin(theta_c), 0])
        D = np.array([r * np.cos(theta_d), r * np.sin(theta_d), 0])

        chord_ab = Line(A, B, color=BLUE)
        chord_cd = Line(C, D, color=GREEN)
        self.play(Create(chord_ab), Create(chord_cd))

        arc_ab = Arc(radius=r, start_angle=theta_a, angle=(theta_b - theta_a) % TAU, arc_center=O, color=BLUE)
        arc_cd = Arc(radius=r, start_angle=theta_c, angle=(theta_d - theta_c) % TAU, arc_center=O, color=GREEN)
        self.play(Create(arc_ab), Create(arc_cd))

        center1 = Line(O, A, color=GRAY)
        center2 = Line(O, B, color=GRAY)
        center3 = Line(O, C, color=GRAY)
        center4 = Line(O, D, color=GRAY)
        self.play(Create(center1), Create(center2), Create(center3), Create(center4))

        angle1 = Angle(center1, center2, radius=0.55, color=BLUE)
        angle2 = Angle(center3, center4, radius=0.85, color=GREEN)
        self.play(Create(angle1), Create(angle2))
        self.play(Indicate(chord_ab), Indicate(arc_ab), Indicate(angle1))
        self.play(Indicate(chord_cd), Indicate(arc_cd), Indicate(angle2))
        self.wait(2)
