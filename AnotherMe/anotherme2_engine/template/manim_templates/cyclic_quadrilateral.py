from manim import *
import numpy as np


def make_angle_mark(a, o, b, radius=0.38, color=YELLOW, label_text=None, clockwise=None, label_buff=0.16):
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


class CyclicQuadrilateral(Scene):
    def construct(self):
        r = 2.8
        circle = Circle(radius=r, color=WHITE)
        self.play(Create(circle))

        A = np.array([r * np.cos(2.5), r * np.sin(2.5), 0])
        B = np.array([r * np.cos(0.75), r * np.sin(0.75), 0])
        C = np.array([r * np.cos(5.45), r * np.sin(5.45), 0])
        D = np.array([r * np.cos(4.0), r * np.sin(4.0), 0])

        quad = Polygon(A, B, C, D, color=WHITE)
        self.play(Create(quad))

        angle_a, label_a = make_angle_mark(D, A, B, radius=0.42, color=BLUE, label_text=r"\alpha")
        angle_c, label_c = make_angle_mark(B, C, D, radius=0.42, color=GREEN, label_text=r"\beta")
        self.play(Create(angle_a), Write(label_a))
        self.play(Create(angle_c), Write(label_c))

        diag_ac = Line(A, C, color=YELLOW)
        diag_bd = Line(B, D, color=ORANGE)
        self.play(Create(diag_ac), Create(diag_bd))
        self.play(Indicate(angle_a), Indicate(angle_c))
        self.wait(2)
