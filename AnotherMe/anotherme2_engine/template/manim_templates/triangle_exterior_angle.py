from manim import *
import numpy as np


def make_angle_mark(a, o, b, radius=0.35, color=YELLOW, label_text=None, clockwise=None, label_buff=0.18):
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

    angle = Angle(
        line1,
        line2,
        radius=radius,
        color=color,
        other_angle=use_clockwise
    )

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
        label.move_to(
            o + np.array([np.cos(mid_theta), np.sin(mid_theta), 0]) * (radius + label_buff)
        )

    return angle, label


class TriangleExteriorAngle(Scene):
    def construct(self):
        A = np.array([-3, -1.3, 0])
        B = np.array([1.2, -1.3, 0])
        C = np.array([-0.8, 2.0, 0])
        D = np.array([4.0, -1.3, 0])

        triangle = Polygon(A, B, C, color=WHITE)
        extension = Line(B, D, color=RED)

        self.play(Create(triangle))
        self.play(Create(extension))

        angle_a, label_a = make_angle_mark(C, A, B, radius=0.42, color=BLUE, label_text=r"\alpha")
        angle_c, label_c = make_angle_mark(B, C, A, radius=0.42, color=GREEN, label_text=r"\beta")
        ext_angle, label_ext = make_angle_mark(C, B, D, radius=0.65, color=YELLOW, label_text=r"\theta")

        self.play(Create(angle_a), Write(label_a))
        self.play(Create(angle_c), Write(label_c))
        self.play(Create(ext_angle), Write(label_ext))

        self.play(Indicate(angle_a), Indicate(angle_c), Indicate(ext_angle))

        self.wait(2)
