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


class AngleTypesInParallelLines(Scene):
    def construct(self):
        l1 = Line(LEFT * 5 + UP * 1.6, RIGHT * 5 + UP * 1.6)
        l2 = Line(LEFT * 5 + DOWN * 1.6, RIGHT * 5 + DOWN * 1.6)
        t = Line(LEFT * 2.8 + DOWN * 3, RIGHT * 1.2 + UP * 3)

        self.play(Create(l1), Create(l2), Create(t))

        p1 = line_intersection(l1.get_start(), l1.get_end(), t.get_start(), t.get_end())
        p2 = line_intersection(l2.get_start(), l2.get_end(), t.get_start(), t.get_end())

        dot1 = Dot(p1)
        dot2 = Dot(p2)
        self.play(FadeIn(dot1), FadeIn(dot2))

        parallel_mark1 = MathTex(r"\parallel").move_to(LEFT * 3.8 + UP * 1.9)
        parallel_mark2 = MathTex(r"\parallel").move_to(LEFT * 3.8 + DOWN * 1.3)
        self.play(FadeIn(parallel_mark1), FadeIn(parallel_mark2))

        angle1, label1 = make_angle_mark(l1.get_right(), p1, t.get_end(), radius=0.35, color=BLUE, label_text="1")
        angle2, label2 = make_angle_mark(l2.get_right(), p2, t.get_end(), radius=0.35, color=BLUE, label_text="2")

        self.play(Create(angle1), Write(label1))
        self.play(Create(angle2), Write(label2))
        self.play(Indicate(angle1), Indicate(angle2))

        self.wait(0.5)

        angle3, label3 = make_angle_mark(t.get_start(), p1, l1.get_right(), radius=0.55, color=GREEN, label_text="3")
        angle4, label4 = make_angle_mark(l2.get_left(), p2, t.get_end(), radius=0.55, color=GREEN, label_text="4")

        self.play(Create(angle3), Write(label3))
        self.play(Create(angle4), Write(label4))
        self.play(Indicate(angle3), Indicate(angle4))

        self.wait(0.5)

        angle5, label5 = make_angle_mark(t.get_start(), p1, l1.get_left(), radius=0.8, color=YELLOW, label_text="5")
        angle6, label6 = make_angle_mark(l2.get_left(), p2, t.get_start(), radius=0.8, color=YELLOW, label_text="6")

        self.play(Create(angle5), Write(label5))
        self.play(Create(angle6), Write(label6))
        self.play(Indicate(angle5), Indicate(angle6))

        self.wait(2)
