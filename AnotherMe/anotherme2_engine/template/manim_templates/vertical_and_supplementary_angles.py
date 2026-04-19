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


def make_angle_mark(a, o, b, radius=0.5, color=YELLOW, label_text=None, clockwise=None, label_buff=0.2):
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


class VerticalAndSupplementaryAngles(Scene):
    def construct(self):
        line1 = Line(LEFT * 4 + DOWN, RIGHT * 4 + UP)
        line2 = Line(LEFT * 4 + UP * 1.5, RIGHT * 4 + DOWN * 1.5)

        O = line_intersection(
            line1.get_start(), line1.get_end(),
            line2.get_start(), line2.get_end()
        )

        dot_o = Dot(O)
        label_o = MathTex("O").next_to(dot_o, DOWN)

        self.play(Create(line1), Create(line2))
        self.play(FadeIn(dot_o), Write(label_o))

        A = line1.get_end()
        C = line1.get_start()
        B = line2.get_end()
        D = line2.get_start()

        angle1, label1 = make_angle_mark(A, O, B, radius=0.6, color=BLUE, label_text="1")
        angle2, label2 = make_angle_mark(C, O, D, radius=0.6, color=BLUE, label_text="2")

        angle3, label3 = make_angle_mark(A, O, D, radius=0.95, color=GREEN, label_text="3")
        angle4, label4 = make_angle_mark(D, O, C, radius=0.95, color=GREEN, label_text="4")

        self.play(Create(angle1), Write(label1))
        self.play(Create(angle2), Write(label2))
        self.play(Indicate(angle1), Indicate(angle2))

        self.play(Create(angle3), Write(label3))
        self.play(Create(angle4), Write(label4))
        self.play(Indicate(angle3), Indicate(angle4))

        self.wait(2)
