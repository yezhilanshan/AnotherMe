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


class RhombusProperty(Scene):
    def construct(self):
        A = np.array([-3.6, 0.0, 0])
        B = np.array([0.0, -2.2, 0])
        C = np.array([3.6, 0.0, 0])
        D = np.array([0.0, 2.2, 0])

        rhombus = Polygon(A, B, C, D, color=WHITE)
        self.play(Create(rhombus))

        ab = Line(A, B, color=BLUE, stroke_width=6)
        bc = Line(B, C, color=BLUE, stroke_width=6)
        cd = Line(C, D, color=BLUE, stroke_width=6)
        da = Line(D, A, color=BLUE, stroke_width=6)
        self.play(Create(ab), Create(bc), Create(cd), Create(da))

        diag_ac = Line(A, C, color=YELLOW)
        diag_bd = Line(B, D, color=GREEN)
        self.play(Create(diag_ac), Create(diag_bd))

        right_angle = RightAngle(diag_ac, diag_bd, length=0.18)
        self.play(Create(right_angle))

        angle1, label1 = make_angle_mark(D, A, C, radius=0.42, color=ORANGE, label_text=r"\alpha")
        angle2, label2 = make_angle_mark(C, A, B, radius=0.72, color=ORANGE, label_text=r"\alpha")
        self.play(Create(angle1), Write(label1))
        self.play(Create(angle2), Write(label2))
        self.wait(2)
