from manim import *
import numpy as np


class FoldMinValue(Scene):
    def construct(self):
        fold = Line(DOWN * 2.8, UP * 2.8, color=BLUE)
        A = np.array([-1.5, 0.6, 0])
        B = np.array([2.5, 1.2, 0])
        B_ref = np.array([-2.5, 1.2, 0])

        dot_a = Dot(A, color=YELLOW)
        dot_b = Dot(B, color=GREEN)
        dot_b_ref = Dot(B_ref, color=GREEN)
        label_a = MathTex("A", color=YELLOW).scale(0.8).next_to(A, UP + LEFT, buff=0.12)
        label_b = MathTex("B", color=GREEN).scale(0.8).next_to(B, UP + RIGHT, buff=0.12)
        label_b_ref = MathTex("B'", color=GREEN).scale(0.8).next_to(B_ref, DOWN + LEFT, buff=0.12)
        label_fold = MathTex("l", color=BLUE).scale(0.8).next_to(fold, UP, buff=0.1)
        title = MathTex(r"AP+PB = AB'").scale(0.8).to_edge(UP)

        self.play(Create(fold), Write(label_fold))
        self.play(FadeIn(dot_a), FadeIn(dot_b), Write(label_a), Write(label_b))
        self.play(Create(DashedLine(B, B_ref, color=GRAY)), FadeIn(dot_b_ref), Write(label_b_ref))
        self.play(Write(title))

        line_ab_ref = Line(A, B_ref, color=ORANGE, stroke_width=6)
        self.play(Create(line_ab_ref))

        t = -A[0] / (B_ref[0] - A[0])
        P = A + t * (B_ref - A)
        dot_p = Dot(P, color=RED)
        label_p = MathTex("P", color=RED).scale(0.8).next_to(P, RIGHT, buff=0.12)
        path1 = Line(A, P, color=ORANGE, stroke_width=8)
        path2 = Line(P, B, color=ORANGE, stroke_width=8)

        self.play(FadeIn(dot_p), Write(label_p))
        self.play(TransformFromCopy(line_ab_ref, path1), TransformFromCopy(line_ab_ref, path2))
        self.wait(2)
