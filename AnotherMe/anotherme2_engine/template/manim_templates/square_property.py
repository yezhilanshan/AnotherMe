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


class SquareProperty(Scene):
    def construct(self):
        A = np.array([-2.3, -2.3, 0])
        B = np.array([2.3, -2.3, 0])
        C = np.array([2.3, 2.3, 0])
        D = np.array([-2.3, 2.3, 0])

        square = Polygon(A, B, C, D, color=WHITE)
        self.play(Create(square))

        sides = VGroup(
            Line(A, B, color=BLUE, stroke_width=6),
            Line(B, C, color=BLUE, stroke_width=6),
            Line(C, D, color=BLUE, stroke_width=6),
            Line(D, A, color=BLUE, stroke_width=6),
        )
        self.play(Create(sides))

        ra = RightAngle(Line(A, B), Line(A, D), length=0.18)
        rb = RightAngle(Line(B, C), Line(B, A), length=0.18)
        rc = RightAngle(Line(C, D), Line(C, B), length=0.18)
        rd = RightAngle(Line(D, A), Line(D, C), length=0.18)
        self.play(Create(ra), Create(rb), Create(rc), Create(rd))

        diag_ac = Line(A, C, color=YELLOW)
        diag_bd = Line(B, D, color=GREEN)
        self.play(Create(diag_ac), Create(diag_bd))

        O = line_intersection(A, C, B, D)
        dot_o = Dot(O, color=RED)
        self.play(FadeIn(dot_o))

        right_angle_center = RightAngle(diag_ac, diag_bd, length=0.18)
        self.play(Create(right_angle_center))

        circle = Circle(radius=np.linalg.norm(A - O), color=PURPLE).move_to(O)
        self.play(Create(circle))
        self.wait(2)
