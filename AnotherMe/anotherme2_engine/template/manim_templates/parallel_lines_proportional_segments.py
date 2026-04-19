from manim import *
import numpy as np


class ParallelLinesProportionalSegments(Scene):
    def construct(self):
        title = MathTex(r"DE \parallel FG \parallel AC").scale(0.9).to_edge(UP)
        formula = MathTex(r"AD:DF = CE:EG").scale(0.9).next_to(title, DOWN, buff=0.25)

        A = np.array([-4.2, -2.0, 0])
        B = np.array([-0.8, 2.2, 0])
        C = np.array([4.2, -2.0, 0])

        side_ab = Line(A, B, color=WHITE)
        side_cb = Line(C, B, color=WHITE)
        base = Line(A, C, color=WHITE)
        self.play(Write(title))
        self.play(Create(side_ab), Create(side_cb), Create(base))

        t1 = 0.35
        t2 = 0.65
        D = A + t1 * (B - A)
        E = C + t1 * (B - C)
        F = A + t2 * (B - A)
        G = C + t2 * (B - C)

        labels = VGroup(
            MathTex("A").next_to(A, DOWN),
            MathTex("B").next_to(B, UP),
            MathTex("C").next_to(C, DOWN),
            MathTex("D").next_to(D, LEFT),
            MathTex("E").next_to(E, RIGHT),
            MathTex("F").next_to(F, LEFT),
            MathTex("G").next_to(G, RIGHT),
        )
        dots = VGroup(Dot(D), Dot(E), Dot(F), Dot(G))
        self.play(FadeIn(dots), Write(labels))

        de = Line(D, E, color=BLUE, stroke_width=6)
        fg = Line(F, G, color=GREEN, stroke_width=6)
        self.play(Create(de), Create(fg))

        ad = Line(A, D, color=YELLOW, stroke_width=8)
        df = Line(D, F, color=ORANGE, stroke_width=8)
        ce = Line(C, E, color=YELLOW, stroke_width=8)
        eg = Line(E, G, color=ORANGE, stroke_width=8)

        self.play(Create(ad), Create(df))
        self.play(Create(ce), Create(eg))
        self.play(Indicate(ad), Indicate(ce))
        self.play(Indicate(df), Indicate(eg))
        self.play(Write(formula))
        self.wait(2)
