from manim import *
import numpy as np


def make_angle_mark(a, o, b, radius=0.35, color=YELLOW, label_text=None, clockwise=None, label_buff=0.16):
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


class CircleTangentComposite(Scene):
    def construct(self):
        O = ORIGIN
        r = 2.5
        circle = Circle(radius=r, color=WHITE)
        title = MathTex(r"\angle ATO=\alpha,\ \angle AOT=2\alpha").scale(0.8).to_edge(UP)
        self.play(Create(circle))
        self.play(Write(title))

        theta_t = 0.8
        T = np.array([r * np.cos(theta_t), r * np.sin(theta_t), 0])
        theta_a = 2.4
        A = np.array([r * np.cos(theta_a), r * np.sin(theta_a), 0])

        radius = Line(O, T, color=BLUE)
        radius_oa = Line(O, A, color=BLUE)
        chord = Line(T, A, color=GREEN)
        dot_o = Dot(O, color=BLUE)
        dot_t = Dot(T, color=YELLOW)
        dot_a = Dot(A, color=GREEN)
        label_o = MathTex("O", color=BLUE).scale(0.8).next_to(O, DOWN + LEFT, buff=0.12)
        label_t = MathTex("T", color=YELLOW).scale(0.8).next_to(T, RIGHT, buff=0.12)
        label_a = MathTex("A", color=GREEN).scale(0.8).next_to(A, UP + LEFT, buff=0.12)
        self.play(
            Create(radius),
            Create(radius_oa),
            Create(chord),
            FadeIn(dot_o),
            FadeIn(dot_t),
            FadeIn(dot_a),
            Write(label_o),
            Write(label_t),
            Write(label_a),
        )

        tangent_dir = np.array([-np.sin(theta_t), np.cos(theta_t), 0])
        tangent = Line(T - tangent_dir * 3.2, T + tangent_dir * 3.2, color=YELLOW)
        self.play(Create(tangent))

        tangent_ray = Line(T, T + tangent_dir, color=YELLOW)
        right_angle = RightAngle(Line(T, O), tangent_ray, length=0.18)
        self.play(Create(right_angle))

        angle1, label1 = make_angle_mark(A, T, T + tangent_dir, radius=0.45, color=YELLOW, label_text=r"\alpha")
        angle2, label2 = make_angle_mark(A, O, T, radius=0.55, color=BLUE, label_text=r"2\alpha")
        self.play(Create(angle1), Write(label1))
        self.play(Create(angle2), Write(label2))
        self.play(Indicate(angle1), Indicate(angle2))
        self.wait(2)
