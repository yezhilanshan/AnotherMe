from manim import *
import numpy as np


class ShortestPathByReflection(Scene):
    def construct(self):
        wall = Line(LEFT * 3.8, RIGHT * 3.8, color=BLUE)
        A = np.array([-2.0, -1.0, 0])
        B = np.array([1.6, 1.2, 0])
        B_ref = np.array([1.6, -1.2, 0])

        dot_a = Dot(A, color=YELLOW)
        dot_b = Dot(B, color=GREEN)
        dot_b_ref = Dot(B_ref, color=GREEN)

        title = MathTex(r"\text{Shortest path: } AP+PB = AB'").scale(0.7).to_edge(UP)
        wall_label = MathTex("l").scale(0.7).next_to(wall, RIGHT, buff=0.1)
        labels = VGroup(
            MathTex("A").scale(0.7).next_to(A, DOWN + LEFT, buff=0.1),
            MathTex("B").scale(0.7).next_to(B, UP + RIGHT, buff=0.1),
            MathTex("B'").scale(0.7).next_to(B_ref, DOWN + RIGHT, buff=0.1),
        )

        self.play(Create(wall), Write(wall_label), Write(title))
        self.play(FadeIn(dot_a), FadeIn(dot_b), Write(labels[0]), Write(labels[1]))

        helper = DashedLine(B, B_ref, color=GRAY)
        self.play(Create(helper), FadeIn(dot_b_ref), Write(labels[2]))

        direct_ref_line = Line(A, B_ref, color=ORANGE)
        self.play(Create(direct_ref_line))

        t = -A[1] / (B_ref[1] - A[1])
        P = A + t * (B_ref - A)
        dot_p = Dot(P, color=RED)
        label_p = MathTex("P").scale(0.7).next_to(P, DOWN, buff=0.1)
        path1 = Line(A, P, color=ORANGE, stroke_width=8)
        path2 = Line(P, B, color=ORANGE, stroke_width=8)

        self.play(FadeIn(dot_p), Write(label_p))
        self.play(TransformFromCopy(direct_ref_line, path1), TransformFromCopy(direct_ref_line, path2))
        self.play(Indicate(direct_ref_line), Indicate(path1), Indicate(path2))
        self.wait(2)
