from manim import *
import numpy as np


class RightTriangleMidpointProperty(Scene):
    def construct(self):
        C = np.array([-2.4, -1.8, 0])
        A = np.array([-2.4, 1.8, 0])
        B = np.array([2.8, -1.8, 0])
        M = (A + B) / 2

        triangle = Polygon(A, B, C, color=WHITE)
        right_angle = RightAngle(Line(C, A), Line(C, B), length=0.22)

        self.play(Create(triangle))
        self.play(Create(right_angle))

        midpoint = Dot(M, color=YELLOW)
        self.play(FadeIn(midpoint))

        seg_ma = Line(M, A, color=BLUE)
        seg_mb = Line(M, B, color=BLUE)
        seg_mc = Line(M, C, color=BLUE)

        self.play(Create(seg_ma), Create(seg_mb))
        self.play(Create(seg_mc))

        circle = Circle(radius=np.linalg.norm(A - M), color=GREEN).move_to(M)
        self.play(Create(circle))

        dot_a = Dot(A, color=WHITE)
        dot_b = Dot(B, color=WHITE)
        dot_c = Dot(C, color=WHITE)
        self.play(Indicate(dot_a), Indicate(dot_b), Indicate(dot_c))
        self.wait(2)
