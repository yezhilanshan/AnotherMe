from manim import *
import numpy as np


class HomothetyModel(Scene):
    def construct(self):
        center = np.array([-3.6, -1.9, 0])
        A = np.array([-2.4, -1.1, 0])
        B = np.array([-1.4, 0.2, 0])
        C = np.array([-2.9, 1.1, 0])
        scale_factor = 1.6

        A2 = center + scale_factor * (A - center)
        B2 = center + scale_factor * (B - center)
        C2 = center + scale_factor * (C - center)

        dot_center = Dot(center, color=YELLOW)
        triangle_small = Polygon(A, B, C, color=WHITE, fill_opacity=0.08)
        label_center = MathTex("O", color=YELLOW).scale(0.7).next_to(center, DOWN + LEFT, buff=0.08)
        label_a = MathTex("A").scale(0.7).next_to(A, DOWN, buff=0.08)
        label_b = MathTex("B").scale(0.7).next_to(B, RIGHT, buff=0.08)
        label_c = MathTex("C").scale(0.7).next_to(C, UP, buff=0.08)
        title = MathTex(r"\text{Homothety with center }O").scale(0.76).to_edge(UP)

        self.play(FadeIn(dot_center), Create(triangle_small))
        self.play(Write(label_center), Write(label_a), Write(label_b), Write(label_c), Write(title))

        ray_a = DashedLine(center, A2, color=GRAY)
        ray_b = DashedLine(center, B2, color=GRAY)
        ray_c = DashedLine(center, C2, color=GRAY)
        self.play(Create(ray_a), Create(ray_b), Create(ray_c))

        triangle_large = Polygon(A2, B2, C2, color=BLUE, fill_opacity=0.08)
        label_a2 = MathTex("A'", color=BLUE).scale(0.7).next_to(A2, DOWN, buff=0.1)
        label_b2 = MathTex("B'", color=BLUE).scale(0.7).next_to(B2, RIGHT, buff=0.1)
        label_c2 = MathTex("C'", color=BLUE).scale(0.7).next_to(C2, UP, buff=0.1)
        relation = MathTex(r"OA' = 1.6\,OA").scale(0.78).next_to(title, DOWN, buff=0.18)

        self.play(TransformFromCopy(triangle_small, triangle_large))
        self.play(Write(label_a2), Write(label_b2), Write(label_c2), Write(relation))
        self.play(Indicate(triangle_small), Indicate(triangle_large))
        self.wait(2)
