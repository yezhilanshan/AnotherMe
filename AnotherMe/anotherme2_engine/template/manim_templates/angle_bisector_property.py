from manim import *
import numpy as np


def make_angle_mark(a, o, b, radius=0.4, color=YELLOW, label_text=None, clockwise=None, label_buff=0.2):
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


class AngleBisectorProperty(Scene):
    def construct(self):
        O = np.array([-2, -1, 0])
        A = np.array([2, 1.5, 0])
        B = np.array([2, -2.5, 0])

        ray_oa = Line(O, A)
        ray_ob = Line(O, B)

        self.play(Create(ray_oa), Create(ray_ob))

        dot_o = Dot(O)
        self.play(FadeIn(dot_o))

        dir1 = normalize(A - O)
        dir2 = normalize(B - O)
        bisector_dir = normalize(dir1 + dir2)
        P = O + bisector_dir * 4

        bisector = DashedLine(O, P, color=BLUE)
        self.play(Create(bisector))

        angle1, label1 = make_angle_mark(A, O, P, radius=0.6, color=GREEN, label_text=r"\alpha")
        angle2, label2 = make_angle_mark(P, O, B, radius=0.9, color=GREEN, label_text=r"\alpha")

        self.play(Create(angle1), Write(label1))
        self.play(Create(angle2), Write(label2))

        P0 = O + bisector_dir * 2.2
        foot1 = ray_oa.get_projection(P0)
        foot2 = ray_ob.get_projection(P0)

        dot_p0 = Dot(P0, color=YELLOW)

        perp1 = DashedLine(P0, foot1, color=RED)
        perp2 = DashedLine(P0, foot2, color=RED)

        right1 = RightAngle(Line(P0, foot1), ray_oa, length=0.18, quadrant=(-1, 1))
        right2 = RightAngle(ray_ob, Line(foot2, P0), length=0.18, quadrant=(1, 1))

        self.play(FadeIn(dot_p0))
        self.play(Create(perp1), Create(perp2))
        self.play(Create(right1), Create(right2))

        seg_label1 = MathTex("d_1", color=RED).scale(0.8).next_to(perp1, UP)
        seg_label2 = MathTex("d_2", color=RED).scale(0.8).next_to(perp2, RIGHT)
        self.play(Write(seg_label1), Write(seg_label2))

        self.wait(2)
