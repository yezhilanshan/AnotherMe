from manim import *
import numpy as np


def make_angle_mark(a, o, b, radius=0.4, color=YELLOW, label_text=None, clockwise=None, label_buff=0.16):
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


class TangentChordAngle(Scene):
    def construct(self):
        O = ORIGIN
        r = 2.5
        circle = Circle(radius=r, color=WHITE)
        self.play(Create(circle))

        theta_t = 0.8
        theta_a = 2.35
        theta_b = 4.05
        T = np.array([r * np.cos(theta_t), r * np.sin(theta_t), 0])
        A = np.array([r * np.cos(theta_a), r * np.sin(theta_a), 0])
        B = np.array([r * np.cos(theta_b), r * np.sin(theta_b), 0])

        tangent_dir = np.array([-np.sin(theta_t), np.cos(theta_t), 0])
        tangent = Line(T - tangent_dir * 3.0, T + tangent_dir * 3.0, color=YELLOW)
        chord = Line(T, A, color=GREEN)
        inscribed1 = Line(B, T, color=BLUE)
        inscribed2 = Line(B, A, color=BLUE)
        arc_ta = Arc(radius=r, start_angle=theta_t, angle=((theta_a - theta_t) % TAU), arc_center=O, color=RED)

        self.play(Create(tangent), Create(chord))
        self.play(Create(inscribed1), Create(inscribed2))
        self.play(Create(arc_ta))

        angle_tangent, label1 = make_angle_mark(A, T, T + tangent_dir, radius=0.45, color=YELLOW, label_text=r"\alpha")
        angle_inscribed, label2 = make_angle_mark(T, B, A, radius=0.45, color=BLUE, label_text=r"\alpha")
        self.play(Create(angle_tangent), Write(label1))
        self.play(Create(angle_inscribed), Write(label2))
        self.play(Indicate(angle_tangent), Indicate(angle_inscribed))
        self.wait(2)
