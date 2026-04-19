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


def make_angle_mark(a, o, b, radius=0.4, color=YELLOW, label_text=None, clockwise=None, label_buff=0.18):
    line1 = Line(o, a)
    line2 = Line(o, b)
    v1 = a - o
    v2 = b - o
    theta1 = np.arctan2(v1[1], v1[0])
    theta2 = np.arctan2(v2[1], v2[0])
    ccw_span = (theta2 - theta1) % TAU
    use_clockwise = ccw_span > PI if clockwise is None else clockwise
    angle = Angle(line1, line2, radius=radius, color=color, other_angle=use_clockwise)
    label = None
    if label_text is not None:
        if use_clockwise:
            if theta2 >= theta1:
                theta2 -= TAU
        else:
            if theta2 < theta1:
                theta2 += TAU
        mid_theta = (theta1 + theta2) / 2
        label = MathTex(label_text, color=color).scale(0.8)
        label.move_to(o + np.array([np.cos(mid_theta), np.sin(mid_theta), 0]) * (radius + label_buff))
    return angle, label


class SimilarTrianglesAA(Scene):
    def construct(self):
        A = np.array([-4.8, -1.8, 0])
        B = np.array([1.6, -1.8, 0])
        C = np.array([-2.2, 2.1, 0])

        scale = 0.42
        shift = np.array([5.0, 0.0, 0])
        D = shift + scale * A
        E = shift + scale * B
        F = shift + scale * C

        tri_big = Polygon(A, B, C, color=WHITE)
        tri_small = Polygon(D, E, F, color=BLUE)
        self.play(Create(tri_big), FadeIn(tri_small))

        angle_a, label_a = make_angle_mark(C, A, B, radius=0.45, color=GREEN, label_text=r"\alpha")
        angle_d, label_d = make_angle_mark(F, D, E, radius=0.26, color=GREEN, label_text=r"\alpha")
        angle_c, label_c = make_angle_mark(B, C, A, radius=0.45, color=YELLOW, label_text=r"\beta")
        angle_f, label_f = make_angle_mark(E, F, D, radius=0.26, color=YELLOW, label_text=r"\beta")

        self.play(Create(angle_a), Write(label_a), Create(angle_d), Write(label_d))
        self.play(Indicate(angle_a), Indicate(angle_d))
        self.play(Create(angle_c), Write(label_c), Create(angle_f), Write(label_f))
        self.play(Indicate(angle_c), Indicate(angle_f))

        labels = VGroup(
            MathTex("A").next_to(A, DOWN),
            MathTex("B").next_to(B, DOWN),
            MathTex("C").next_to(C, UP),
            MathTex("D").next_to(D, DOWN),
            MathTex("E").next_to(E, DOWN),
            MathTex("F").next_to(F, UP),
        )
        formula = MathTex(r"\triangle ABC \sim \triangle DEF").scale(0.9).to_edge(UP)
        self.play(Write(labels))
        self.play(Write(formula))
        self.wait(2)
