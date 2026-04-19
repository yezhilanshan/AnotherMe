from manim import *
import numpy as np


class HomothetyScaling(Scene):
    def construct(self):
        O = np.array([-4.4, -2.4, 0])
        A = np.array([-2.8, -1.5, 0])
        B = np.array([-1.4, -0.1, 0])
        C = np.array([-3.4, 1.1, 0])

        triangle = Polygon(A, B, C, color=WHITE)
        center = Dot(O, color=YELLOW)
        label_o = MathTex("O", color=YELLOW).scale(0.8).next_to(O, DOWN + LEFT, buff=0.12)
        title1 = MathTex(r"\text{Homothety with center } O").scale(0.74).to_edge(UP)
        title2 = MathTex(r"A',B',C' \text{ lie on } OA,OB,OC").scale(0.74).next_to(title1, DOWN, buff=0.12)
        self.play(FadeIn(center), Create(triangle))
        self.play(Write(label_o), Write(title1), Write(title2))

        oa = DashedLine(O, A, color=GRAY)
        ob = DashedLine(O, B, color=GRAY)
        oc = DashedLine(O, C, color=GRAY)
        labels = VGroup(
            MathTex("A").scale(0.8).next_to(A, DOWN, buff=0.1),
            MathTex("B").scale(0.8).next_to(B, RIGHT, buff=0.1),
            MathTex("C").scale(0.8).next_to(C, UP, buff=0.1),
        )
        self.play(Create(oa), Create(ob), Create(oc), Write(labels))

        k = 1.7
        A2 = O + k * (A - O)
        B2 = O + k * (B - O)
        C2 = O + k * (C - O)
        triangle_large = Polygon(A2, B2, C2, color=BLUE)
        label_a2 = MathTex("A'", color=BLUE).scale(0.8).next_to(A2, DOWN, buff=0.12)
        label_b2 = MathTex("B'", color=BLUE).scale(0.8).next_to(B2, RIGHT, buff=0.12)
        label_c2 = MathTex("C'", color=BLUE).scale(0.8).next_to(C2, UP, buff=0.12)

        self.play(TransformFromCopy(triangle, triangle_large))
        self.play(Write(label_a2), Write(label_b2), Write(label_c2))

        oa2 = DashedLine(O, A2, color=BLUE)
        ob2 = DashedLine(O, B2, color=BLUE)
        oc2 = DashedLine(O, C2, color=BLUE)
        self.play(Create(oa2), Create(ob2), Create(oc2))
        self.wait(2)
