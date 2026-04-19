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


class IsoscelesTrapezoid(Scene):
    def construct(self):
        A = np.array([-4.0, -1.8, 0])
        B = np.array([4.0, -1.8, 0])
        D = np.array([-2.2, 1.6, 0])
        C = np.array([2.2, 1.6, 0])

        trapezoid = Polygon(A, B, C, D, color=WHITE)
        self.play(Create(trapezoid))

        base1 = Line(A, B, color=BLUE, stroke_width=6)
        base2 = Line(D, C, color=BLUE, stroke_width=6)
        self.play(Create(base1), Create(base2))

        leg1 = Line(A, D, color=GREEN, stroke_width=6)
        leg2 = Line(B, C, color=GREEN, stroke_width=6)
        self.play(Create(leg1), Create(leg2))

        angle_a, label_a = make_angle_mark(D, A, B, radius=0.45, color=YELLOW, label_text=r"\alpha", clockwise=True)
        angle_b, label_b = make_angle_mark(A, B, C, radius=0.45, color=YELLOW, label_text=r"\alpha")
        self.play(Create(angle_a), Write(label_a))
        self.play(Create(angle_b), Write(label_b))

        diag_ac = Line(A, C, color=ORANGE)
        diag_bd = Line(B, D, color=PURPLE)
        self.play(Create(diag_ac), Create(diag_bd))
        self.play(Indicate(diag_ac), Indicate(diag_bd))
        self.wait(2)
