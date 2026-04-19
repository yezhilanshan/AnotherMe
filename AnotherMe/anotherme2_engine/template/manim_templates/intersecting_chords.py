from manim import *
import numpy as np


def line_intersection(p1, p2, p3, p4):
    x1, y1, _ = p1
    x2, y2, _ = p2
    x3, y3, _ = p3
    x4, y4, _ = p4
    denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if abs(denominator) < 1e-8:
        return None
    px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denominator
    py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denominator
    return np.array([px, py, 0])


class IntersectingChords(Scene):
    def construct(self):
        O = ORIGIN
        r = 2.8
        circle = Circle(radius=r, color=WHITE)
        title = MathTex(r"PA\cdot PB = PC\cdot PD").scale(0.8).to_edge(UP)
        self.play(Create(circle))
        self.play(Write(title))

        A = np.array([r * np.cos(2.55), r * np.sin(2.55), 0])
        B = np.array([r * np.cos(0.35), r * np.sin(0.35), 0])
        C = np.array([r * np.cos(3.95), r * np.sin(3.95), 0])
        D = np.array([r * np.cos(5.35), r * np.sin(5.35), 0])

        chord_ab = Line(A, B, color=BLUE)
        chord_cd = Line(C, D, color=GREEN)
        self.play(Create(chord_ab), Create(chord_cd))

        P = line_intersection(A, B, C, D)
        dot_p = Dot(P, color=YELLOW)
        label_a = MathTex("A", color=BLUE).scale(0.8).next_to(A, UP + LEFT, buff=0.12)
        label_b = MathTex("B", color=BLUE).scale(0.8).next_to(B, UP + RIGHT, buff=0.12)
        label_c = MathTex("C", color=GREEN).scale(0.8).next_to(C, DOWN + LEFT, buff=0.12)
        label_d = MathTex("D", color=GREEN).scale(0.8).next_to(D, DOWN + RIGHT, buff=0.12)
        label_p = MathTex("P", color=YELLOW).scale(0.8).next_to(P, RIGHT, buff=0.12)
        self.play(FadeIn(dot_p), Write(label_a), Write(label_b), Write(label_c), Write(label_d), Write(label_p))

        pa = Line(P, A, color=BLUE, stroke_width=8)
        pb = Line(P, B, color=BLUE, stroke_width=8)
        pc = Line(P, C, color=GREEN, stroke_width=8)
        pd = Line(P, D, color=GREEN, stroke_width=8)

        self.play(Create(pa), Create(pb))
        self.play(Create(pc), Create(pd))
        self.play(Indicate(pa), Indicate(pb))
        self.play(Indicate(pc), Indicate(pd))
        self.wait(2)
