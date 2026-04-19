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


class ParallelogramProperty(Scene):
    def construct(self):
        A = np.array([-3.6, -1.5, 0])
        B = np.array([0.4, -1.5, 0])
        D = np.array([-2.0, 1.5, 0])
        C = B + (D - A)

        quad = Polygon(A, B, C, D, color=WHITE)
        self.play(Create(quad))

        ab = Line(A, B, color=BLUE, stroke_width=6)
        cd = Line(C, D, color=BLUE, stroke_width=6)
        ad = Line(A, D, color=GREEN, stroke_width=6)
        bc = Line(B, C, color=GREEN, stroke_width=6)

        self.play(Create(ab), Create(cd))
        self.play(Create(ad), Create(bc))

        diag_ac = Line(A, C, color=YELLOW)
        diag_bd = Line(B, D, color=ORANGE)
        self.play(Create(diag_ac), Create(diag_bd))

        O = line_intersection(A, C, B, D)
        dot_o = Dot(O, color=RED)
        self.play(FadeIn(dot_o))

        ao = Line(A, O, color=YELLOW, stroke_width=8)
        oc = Line(O, C, color=YELLOW, stroke_width=8)
        bo = Line(B, O, color=ORANGE, stroke_width=8)
        od = Line(O, D, color=ORANGE, stroke_width=8)

        self.play(Transform(diag_ac.copy(), ao), Transform(diag_ac.copy(), oc))
        self.play(Transform(diag_bd.copy(), bo), Transform(diag_bd.copy(), od))
        self.wait(2)
