from manim import *
import numpy as np


def line_intersection(p1, p2, p3, p4):
    x1, y1, _ = p1
    x2, y2, _ = p2
    x3, y3, _ = p3
    x4, y4, _ = p4
    denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if abs(denominator) < 1e-8:
        return None
    px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denominator
    py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denominator
    return np.array([px, py, 0])


class RectangleProperty(Scene):
    def construct(self):
        A = np.array([-3.2, -1.8, 0])
        B = np.array([3.2, -1.8, 0])
        C = np.array([3.2, 1.8, 0])
        D = np.array([-3.2, 1.8, 0])

        rect = Polygon(A, B, C, D, color=WHITE)
        self.play(Create(rect))

        ra = RightAngle(Line(A, B), Line(A, D), length=0.18)
        rb = RightAngle(Line(B, C), Line(B, A), length=0.18)
        rc = RightAngle(Line(C, D), Line(C, B), length=0.18)
        rd = RightAngle(Line(D, A), Line(D, C), length=0.18)
        self.play(Create(ra), Create(rb), Create(rc), Create(rd))

        diag_ac = Line(A, C, color=BLUE)
        diag_bd = Line(B, D, color=GREEN)
        self.play(Create(diag_ac), Create(diag_bd))

        O = line_intersection(A, C, B, D)
        dot_o = Dot(O, color=YELLOW)
        self.play(FadeIn(dot_o))

        ac1 = Line(A, O, color=BLUE, stroke_width=8)
        ac2 = Line(O, C, color=BLUE, stroke_width=8)
        bd1 = Line(B, O, color=GREEN, stroke_width=8)
        bd2 = Line(O, D, color=GREEN, stroke_width=8)
        self.play(Transform(diag_ac.copy(), ac1), Transform(diag_ac.copy(), ac2))
        self.play(Transform(diag_bd.copy(), bd1), Transform(diag_bd.copy(), bd2))
        self.wait(2)
