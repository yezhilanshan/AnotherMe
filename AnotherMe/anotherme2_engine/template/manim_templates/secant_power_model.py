from manim import *
import numpy as np


class SecantPowerModel(Scene):
    def construct(self):
        title = MathTex(r"PB \cdot PA = PD \cdot PC").scale(0.9).to_edge(UP)
        O = np.array([0.8, 0.0, 0])
        r = 2.3
        circle = Circle(radius=r, color=WHITE).move_to(O)
        self.play(Write(title))
        self.play(Create(circle))

        P = np.array([-4.0, 0.6, 0])
        dot_p = Dot(P, color=YELLOW)
        self.play(FadeIn(dot_p))

        def secant_intersections(P, direction, O, r):
            d = direction / np.linalg.norm(direction)
            f = P - O
            a = np.dot(d, d)
            b = 2 * np.dot(f, d)
            c = np.dot(f, f) - r * r
            disc = b * b - 4 * a * c
            s1 = (-b - np.sqrt(disc)) / (2 * a)
            s2 = (-b + np.sqrt(disc)) / (2 * a)
            X1 = P + s1 * d
            X2 = P + s2 * d
            return (X1, X2) if s1 < s2 else (X2, X1)

        dir1 = np.array([1.0, 0.24, 0])
        dir2 = np.array([1.0, -0.18, 0])

        secant1 = Line(P, P + normalize(dir1) * 8.0, color=BLUE)
        secant2 = Line(P, P + normalize(dir2) * 8.0, color=GREEN)
        self.play(Create(secant1), Create(secant2))

        B, A = secant_intersections(P, dir1, O, r)
        D, C = secant_intersections(P, dir2, O, r)

        points = {
            "A": A,
            "B": B,
            "C": C,
            "D": D,
            "P": P,
        }
        point_dots = VGroup(*[Dot(pt, color=WHITE if name != "P" else YELLOW) for name, pt in points.items()])
        point_labels = VGroup(
            MathTex("A").next_to(A, RIGHT),
            MathTex("B").next_to(B, UP),
            MathTex("C").next_to(C, RIGHT),
            MathTex("D").next_to(D, DOWN),
            MathTex("P").next_to(P, LEFT),
        )
        self.play(FadeIn(point_dots), Write(point_labels))

        whole_pa = Line(P, A, color=BLUE, stroke_width=6)
        whole_pc = Line(P, C, color=GREEN, stroke_width=6)
        seg_pb = Line(P, B, color=YELLOW, stroke_width=10)
        seg_pd = Line(P, D, color=ORANGE, stroke_width=10)

        label_pb = MathTex("PB", color=YELLOW).scale(0.7).next_to(seg_pb.get_center(), UP, buff=0.1)
        label_pa = MathTex("PA", color=BLUE).scale(0.7).next_to(whole_pa.get_center(), DOWN, buff=0.14)
        label_pd = MathTex("PD", color=ORANGE).scale(0.7).next_to(seg_pd.get_center(), DOWN, buff=0.1)
        label_pc = MathTex("PC", color=GREEN).scale(0.7).next_to(whole_pc.get_center(), UP, buff=0.14)

        self.play(Create(whole_pa), Create(whole_pc))
        self.play(Create(seg_pb), Create(seg_pd))
        self.play(Write(label_pb), Write(label_pa), Write(label_pd), Write(label_pc))
        self.play(Indicate(seg_pb), Indicate(whole_pa))
        self.play(Indicate(seg_pd), Indicate(whole_pc))
        self.wait(2)
