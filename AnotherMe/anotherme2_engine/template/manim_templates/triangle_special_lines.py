from manim import *
import numpy as np


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


class TriangleSpecialLines(Scene):
    def construct(self):
        A = np.array([-3.6, -1.8, 0])
        B = np.array([3.0, -1.8, 0])
        C = np.array([-0.8, 2.1, 0])

        triangle = Polygon(A, B, C, color=WHITE)
        self.play(Create(triangle))
        vertex_labels = VGroup(
            MathTex("A").scale(0.8).next_to(A, DOWN + LEFT, buff=0.12),
            MathTex("B").scale(0.8).next_to(B, DOWN + RIGHT, buff=0.12),
            MathTex("C").scale(0.8).next_to(C, UP, buff=0.12),
        )
        self.play(Write(vertex_labels))

        M = (A + B) / 2
        median = DashedLine(C, M, color=BLUE)
        tick1 = Line(M + np.array([-0.18, 0.12, 0]), M + np.array([0.02, -0.08, 0]), color=BLUE)
        tick2 = Line(M + np.array([0.02, 0.12, 0]), M + np.array([0.22, -0.08, 0]), color=BLUE)
        label_m = MathTex("M", color=BLUE).scale(0.8).next_to(M, DOWN, buff=0.12)
        median_tag = MathTex(r"\mathrm{median}", color=BLUE).scale(0.62).next_to(median.get_center(), LEFT, buff=0.2)
        self.play(Create(median), Create(tick1), Create(tick2), Write(label_m), Write(median_tag))

        H = np.array([C[0], -1.8, 0])
        altitude = DashedLine(C, H, color=GREEN)
        right_angle = RightAngle(Line(H, A), Line(H, C), length=0.18)
        label_h = MathTex("H", color=GREEN).scale(0.8).next_to(H, DOWN, buff=0.12)
        altitude_tag = MathTex(r"\mathrm{altitude}", color=GREEN).scale(0.62).next_to(altitude.get_center(), RIGHT, buff=0.2)
        self.play(Create(altitude), Create(right_angle), Write(label_h), Write(altitude_tag))

        v1 = normalize(A - C)
        v2 = normalize(B - C)
        bis_dir = normalize(v1 + v2)
        t = (A[1] - C[1]) / bis_dir[1]
        P = C + t * bis_dir
        bisector = DashedLine(C, P, color=YELLOW)
        label_p = MathTex("P", color=YELLOW).scale(0.8).next_to(P, DOWN, buff=0.12)
        bisector_tag = MathTex(r"\mathrm{bisector}", color=YELLOW).scale(0.62).next_to(bisector.get_center(), RIGHT, buff=0.18)
        self.play(Create(bisector), Write(label_p), Write(bisector_tag))

        angle1, label1 = make_angle_mark(A, C, P, radius=0.45, color=YELLOW, label_text=r"\alpha")
        angle2, label2 = make_angle_mark(P, C, B, radius=0.75, color=YELLOW, label_text=r"\alpha")
        self.play(Create(angle1), Write(label1))
        self.play(Create(angle2), Write(label2))
        self.wait(2)
