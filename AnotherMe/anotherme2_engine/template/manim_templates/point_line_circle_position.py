from manim import *
import numpy as np


def right_angle_marker(vertex, point_a, point_b, size=0.16, color=YELLOW):
    direction_a = normalize(point_a - vertex)
    direction_b = normalize(point_b - vertex)
    return VMobject(color=color, stroke_width=4).set_points_as_corners(
        [
            vertex + direction_a * size,
            vertex + (direction_a + direction_b) * size,
            vertex + direction_b * size,
        ]
    )


class PointLineCirclePosition(Scene):
    def construct(self):
        left_center = LEFT * 3.4
        right_center = RIGHT * 3.1
        radius = 1.55

        point_panel = Circle(radius=radius, color=WHITE).move_to(left_center)
        line_panel = Circle(radius=radius, color=WHITE).move_to(right_center)
        title_left = MathTex(r"\text{Point and Circle}").scale(0.72).next_to(point_panel, UP, buff=0.35)
        title_right = MathTex(r"\text{Line and Circle}").scale(0.72).next_to(line_panel, UP, buff=0.35)

        self.play(Create(point_panel), Create(line_panel))
        self.play(Write(title_left), Write(title_right))

        inside_point = left_center + np.array([0.45, 0.25, 0])
        on_point = left_center + np.array([radius, 0.0, 0])
        outside_point = left_center + np.array([2.2, 0.95, 0])

        dot_inside = Dot(inside_point, color=GREEN)
        dot_on = Dot(on_point, color=YELLOW)
        dot_outside = Dot(outside_point, color=RED)
        label_inside = MathTex("P", color=GREEN).scale(0.7).next_to(inside_point, UP, buff=0.08)
        label_on = MathTex("Q", color=YELLOW).scale(0.7).next_to(on_point, RIGHT, buff=0.08)
        label_outside = MathTex("R", color=RED).scale(0.7).next_to(outside_point, RIGHT, buff=0.08)
        text_inside = MathTex(r"\text{inside}").scale(0.62).next_to(dot_inside, DOWN, buff=0.22)
        text_on = MathTex(r"\text{on}").scale(0.62).next_to(dot_on, DOWN, buff=0.22)
        text_outside = MathTex(r"\text{outside}").scale(0.62).next_to(dot_outside, DOWN, buff=0.22)

        self.play(FadeIn(dot_inside), FadeIn(dot_on), FadeIn(dot_outside))
        self.play(Write(label_inside), Write(label_on), Write(label_outside))
        self.play(Write(text_inside), Write(text_on), Write(text_outside))

        secant = Line(right_center + LEFT * 2.0, right_center + RIGHT * 2.0, color=BLUE)
        secant_a = Dot(right_center + LEFT * radius, color=BLUE)
        secant_b = Dot(right_center + RIGHT * radius, color=BLUE)
        tangent_contact = right_center + UP * radius
        tangent = Line(tangent_contact + LEFT * 2.0, tangent_contact + RIGHT * 2.0, color=GREEN)
        external = Line(right_center + UP * 2.35 + LEFT * 2.0, right_center + UP * 2.35 + RIGHT * 2.0, color=RED)
        radius_to_tangent = Line(right_center, tangent_contact, color=GRAY)
        right_mark = right_angle_marker(tangent_contact, right_center, tangent_contact + RIGHT, color=YELLOW)
        text_secant = MathTex(r"\text{secant}").scale(0.6).next_to(secant, DOWN, buff=0.15)
        text_tangent = MathTex(r"\text{tangent}").scale(0.6).next_to(tangent, UP, buff=0.15)
        text_external = MathTex(r"\text{outside}").scale(0.6).next_to(external, UP, buff=0.15)

        self.play(Create(secant), FadeIn(secant_a), FadeIn(secant_b))
        self.play(Write(text_secant))
        self.play(Create(tangent), Create(radius_to_tangent), Create(right_mark))
        self.play(Write(text_tangent))
        self.play(Create(external))
        self.play(Write(text_external))
        self.wait(2)
