from manim import *
import numpy as np


class TangentProperty(Scene):
    def construct(self):
        O = ORIGIN
        r = 2.4
        circle = Circle(radius=r, color=WHITE)
        title = MathTex(r"OT \perp \text{tangent at } T").scale(0.8).to_edge(UP)
        self.play(Create(circle))
        self.play(Write(title))

        theta = 0.9
        T = np.array([r * np.cos(theta), r * np.sin(theta), 0])
        radius = Line(O, T, color=BLUE)
        self.play(Create(radius))

        tangent_dir = np.array([-np.sin(theta), np.cos(theta), 0])
        tangent = Line(T - tangent_dir * 3.2, T + tangent_dir * 3.2, color=GREEN)
        self.play(Create(tangent))

        tangent_ray = Line(T, T + tangent_dir, color=GREEN)
        right_angle = RightAngle(Line(T, O), tangent_ray, length=0.18)
        dot_t = Dot(T, color=YELLOW)
        dot_o = Dot(O, color=BLUE)
        label_t = MathTex("T").scale(0.8).next_to(T, UP, buff=0.1)
        label_o = MathTex("O").scale(0.8).next_to(O, DOWN + LEFT, buff=0.1)
        self.play(FadeIn(dot_t), FadeIn(dot_o), Write(label_t), Write(label_o))
        self.play(Create(right_angle))

        A = T + tangent_dir * 2.0
        B = T - tangent_dir * 2.0
        seg_ta = Line(T, A, color=YELLOW, stroke_width=8)
        seg_tb = Line(T, B, color=YELLOW, stroke_width=8)
        label_a = MathTex("A", color=YELLOW).scale(0.8).next_to(A, UP + LEFT, buff=0.1)
        label_b = MathTex("B", color=YELLOW).scale(0.8).next_to(B, DOWN + RIGHT, buff=0.1)
        self.play(Create(seg_ta), Create(seg_tb), Write(label_a), Write(label_b))
        self.wait(2)
