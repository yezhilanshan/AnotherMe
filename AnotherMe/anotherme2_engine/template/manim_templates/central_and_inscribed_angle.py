from manim import *
import numpy as np


def make_angle_mark(a, o, b, radius=0.45, color=YELLOW, label_text=None, clockwise=None, label_buff=0.18):
    line1 = Line(o, a)
    line2 = Line(o, b)

    v1 = a - o
    v2 = b - o
    theta1 = np.arctan2(v1[1], v1[0])
    theta2 = np.arctan2(v2[1], v2[0])
    ccw_span = (theta2 - theta1) % TAU

    if clockwise is None:
        use_clockwise = ccw_span > PI
    else:
        use_clockwise = clockwise

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


class CentralAndInscribedAngle(Scene):
    def construct(self):
        O = ORIGIN
        r = 2.6
        circle = Circle(radius=r, color=WHITE)
        self.play(Create(circle))

        A = np.array([r * np.cos(2.4), r * np.sin(2.4), 0])
        B = np.array([r * np.cos(0.55), r * np.sin(0.55), 0])
        C = np.array([r * np.cos(4.1), r * np.sin(4.1), 0])

        oa = Line(O, A, color=BLUE)
        ob = Line(O, B, color=BLUE)
        ca = Line(C, A, color=GREEN)
        cb = Line(C, B, color=GREEN)

        self.play(Create(oa), Create(ob))
        self.play(Create(ca), Create(cb))

        arc_ab = Arc(radius=r, start_angle=np.arctan2(A[1], A[0]), angle=((np.arctan2(B[1], B[0]) - np.arctan2(A[1], A[0])) % TAU), arc_center=O, color=RED)
        self.play(Create(arc_ab))

        angle_center, label_center = make_angle_mark(A, O, B, radius=0.6, color=BLUE, label_text=r"2\alpha")
        angle_inscribed, label_inscribed = make_angle_mark(A, C, B, radius=0.5, color=GREEN, label_text=r"\alpha")

        self.play(Create(angle_center), Write(label_center))
        self.play(Create(angle_inscribed), Write(label_inscribed))
        self.play(Indicate(angle_center), Indicate(angle_inscribed))
        self.wait(2)
