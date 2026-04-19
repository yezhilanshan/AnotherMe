from manim import *
import numpy as np


class TranslationParallelogram(Scene):
    def construct(self):
        A = np.array([-4.2, -1.6, 0])
        B = np.array([-1.5, -1.6, 0])
        D = np.array([-2.9, 1.0, 0])
        shift_vector = D - A
        C = B + shift_vector

        dot_a = Dot(A, color=WHITE)
        dot_b = Dot(B, color=WHITE)
        dot_d = Dot(D, color=WHITE)
        label_a = MathTex("A").scale(0.7).next_to(A, DOWN + LEFT, buff=0.08)
        label_b = MathTex("B").scale(0.7).next_to(B, DOWN + RIGHT, buff=0.08)
        label_d = MathTex("D").scale(0.7).next_to(D, UP + LEFT, buff=0.08)

        segment_ab = Line(A, B, color=WHITE, stroke_width=6)
        segment_ad = Arrow(A, D, buff=0, color=BLUE)
        title = MathTex(r"\overrightarrow{AD}\ \text{translates}\ \overline{AB}\ \text{to}\ \overline{DC}").scale(0.72).to_edge(UP)

        self.play(FadeIn(dot_a), FadeIn(dot_b), FadeIn(dot_d))
        self.play(Write(label_a), Write(label_b), Write(label_d))
        self.play(Create(segment_ab), Create(segment_ad), Write(title))

        moved_segment = segment_ab.copy().set_color(BLUE)
        self.play(moved_segment.animate.shift(shift_vector))

        dot_c = Dot(C, color=YELLOW)
        label_c = MathTex("C", color=YELLOW).scale(0.7).next_to(C, UP + RIGHT, buff=0.08)
        helper_b = DashedLine(B, C, color=GRAY)
        helper_a = DashedLine(A, D, color=GRAY)
        side_bc = Line(B, C, color=GREEN, stroke_width=6)
        side_cd = Line(D, C, color=BLUE, stroke_width=6)
        shape = Polygon(A, B, C, D, color=YELLOW, fill_opacity=0.12)
        relation = MathTex(r"\overrightarrow{BC}=\overrightarrow{AD}").scale(0.76).next_to(title, DOWN, buff=0.18)

        self.play(Create(helper_a), Create(helper_b))
        self.play(FadeIn(dot_c), Write(label_c))
        self.play(Create(side_bc), Create(side_cd))
        self.play(Create(shape), Write(relation))
        self.play(Indicate(moved_segment), Indicate(side_cd), Indicate(side_bc))
        self.wait(2)
