from manim import *
import numpy as np


class FoldShortestPath(Scene):
    def construct(self):
        fold_line = Line(LEFT * 5.2, RIGHT * 5.2, color=BLUE)
        A = np.array([-3.6, -1.8, 0])
        B = np.array([3.1, 1.7, 0])
        B_reflected = np.array([3.1, -1.7, 0])

        dot_a = Dot(A, color=YELLOW)
        dot_b = Dot(B, color=GREEN)
        dot_b_ref = Dot(B_reflected, color=GREEN)
        label_a = MathTex("A").scale(0.7).next_to(A, DOWN + LEFT, buff=0.08)
        label_b = MathTex("B", color=GREEN).scale(0.7).next_to(B, UP + RIGHT, buff=0.08)
        label_b_ref = MathTex("B'", color=GREEN).scale(0.7).next_to(B_reflected, DOWN + RIGHT, buff=0.08)
        title = MathTex(r"\text{Reflect }B\text{ to }B'\text{ across the fold}").scale(0.76).to_edge(UP)

        self.play(Create(fold_line), Write(title))
        self.play(FadeIn(dot_a), FadeIn(dot_b), Write(label_a), Write(label_b))

        reflect_helper = DashedLine(B, B_reflected, color=GRAY)
        self.play(Create(reflect_helper))
        self.play(FadeIn(dot_b_ref), Write(label_b_ref))

        straight_path = Line(A, B_reflected, color=ORANGE, stroke_width=6)
        self.play(Create(straight_path))

        parameter = -A[1] / (B_reflected[1] - A[1])
        P = A + parameter * (B_reflected - A)
        dot_p = Dot(P, color=RED)
        label_p = MathTex("P", color=RED).scale(0.7).next_to(P, UP, buff=0.08)
        path_ap = Line(A, P, color=ORANGE, stroke_width=8)
        path_pb = Line(P, B, color=ORANGE, stroke_width=8)
        relation = MathTex(r"AP + PB = AB'").scale(0.8).next_to(title, DOWN, buff=0.18)

        self.play(FadeIn(dot_p), Write(label_p))
        self.play(TransformFromCopy(straight_path, path_ap), TransformFromCopy(straight_path, path_pb))
        self.play(Write(relation))
        self.play(Indicate(straight_path), Indicate(path_ap), Indicate(path_pb))
        self.wait(2)
