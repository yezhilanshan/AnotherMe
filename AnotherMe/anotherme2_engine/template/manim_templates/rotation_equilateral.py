from manim import *
import numpy as np


def segment_tick(point_a, point_b, tick_size=0.14, color=YELLOW):
    midpoint = (point_a + point_b) / 2
    direction = normalize(point_b - point_a)
    normal = np.array([-direction[1], direction[0], 0])
    return Line(
        midpoint - normal * tick_size / 2,
        midpoint + normal * tick_size / 2,
        color=color,
        stroke_width=4,
    )


class RotationEquilateral(Scene):
    def construct(self):
        A = np.array([-2.8, -1.6, 0])
        B = np.array([1.0, -1.6, 0])
        C = np.array(
            [
                A[0] + (B[0] - A[0]) * np.cos(PI / 3) - (B[1] - A[1]) * np.sin(PI / 3),
                A[1] + (B[0] - A[0]) * np.sin(PI / 3) + (B[1] - A[1]) * np.cos(PI / 3),
                0,
            ]
        )

        base = Line(A, B, color=WHITE, stroke_width=6)
        dot_a = Dot(A, color=WHITE)
        dot_b = Dot(B, color=WHITE)
        label_a = MathTex("A").scale(0.7).next_to(A, DOWN + LEFT, buff=0.08)
        label_b = MathTex("B").scale(0.7).next_to(B, DOWN + RIGHT, buff=0.08)
        title = MathTex(r"\text{Rotate }\overline{AB}\text{ about }A\text{ by }60^\circ").scale(0.74).to_edge(UP)

        self.play(Create(base), FadeIn(dot_a), FadeIn(dot_b))
        self.play(Write(label_a), Write(label_b), Write(title))

        rotating_side = base.copy().set_color(BLUE)
        arc = Arc(radius=0.9, start_angle=0, angle=PI / 3, arc_center=A, color=RED)
        self.play(Create(arc))
        self.play(Rotate(rotating_side, angle=PI / 3, about_point=A))

        dot_c = Dot(C, color=BLUE)
        label_c = MathTex("C", color=BLUE).scale(0.7).next_to(C, UP, buff=0.08)
        side_bc = Line(B, C, color=GREEN, stroke_width=6)
        triangle = Polygon(A, B, C, color=YELLOW, fill_opacity=0.12)
        relation = MathTex(r"AB = AC = BC").scale(0.82).next_to(title, DOWN, buff=0.16)

        self.play(FadeIn(dot_c), Write(label_c))
        self.play(Create(side_bc))
        self.play(Create(triangle), Write(relation))

        tick_ab = segment_tick(A, B)
        tick_ac = segment_tick(A, C)
        tick_bc = segment_tick(B, C)
        self.play(Create(tick_ab), Create(tick_ac), Create(tick_bc))
        self.play(Indicate(base), Indicate(rotating_side), Indicate(side_bc))
        self.wait(2)
