from manim import *
import numpy as np


def tangent_points(center, radius, point):
    vector = point - center
    distance = np.linalg.norm(vector)
    theta = np.arctan2(vector[1], vector[0])
    phi = np.arccos(radius / distance)
    return (
        center + radius * np.array([np.cos(theta + phi), np.sin(theta + phi), 0]),
        center + radius * np.array([np.cos(theta - phi), np.sin(theta - phi), 0]),
    )


def right_angle_marker(vertex, point_a, point_b, size=0.18, color=YELLOW):
    direction_a = normalize(point_a - vertex)
    direction_b = normalize(point_b - vertex)
    return VMobject(color=color, stroke_width=4).set_points_as_corners(
        [
            vertex + direction_a * size,
            vertex + (direction_a + direction_b) * size,
            vertex + direction_b * size,
        ]
    )


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


class TangentLengthTheorem(Scene):
    def construct(self):
        center = LEFT * 1.4
        radius = 2.1
        external_point = RIGHT * 3.5 + UP * 0.3
        tangent_top, tangent_bottom = tangent_points(center, radius, external_point)

        circle = Circle(radius=radius, color=WHITE).move_to(center)
        dot_center = Dot(center, color=WHITE)
        dot_external = Dot(external_point, color=YELLOW)
        label_center = MathTex("O").scale(0.7).next_to(dot_center, DOWN + LEFT, buff=0.08)
        label_external = MathTex("P", color=YELLOW).scale(0.7).next_to(dot_external, RIGHT, buff=0.12)
        title = MathTex(r"PT_1 = PT_2").scale(0.86).to_edge(UP)

        self.play(Create(circle), FadeIn(dot_center), FadeIn(dot_external))
        self.play(Write(label_center), Write(label_external), Write(title))

        tangent_1 = Line(external_point, tangent_top, color=BLUE)
        tangent_2 = Line(external_point, tangent_bottom, color=GREEN)
        radius_1 = Line(center, tangent_top, color=GRAY)
        radius_2 = Line(center, tangent_bottom, color=GRAY)
        label_t1 = MathTex("T_1", color=BLUE).scale(0.7).next_to(tangent_top, UP, buff=0.1)
        label_t2 = MathTex("T_2", color=GREEN).scale(0.7).next_to(tangent_bottom, DOWN, buff=0.1)

        self.play(Create(tangent_1), Create(tangent_2))
        self.play(Create(radius_1), Create(radius_2), Write(label_t1), Write(label_t2))

        right_top = right_angle_marker(tangent_top, center, external_point)
        right_bottom = right_angle_marker(tangent_bottom, external_point, center)
        tick_1 = segment_tick(external_point, tangent_top)
        tick_2 = segment_tick(external_point, tangent_bottom)

        self.play(Create(right_top), Create(right_bottom))
        self.play(Create(tick_1), Create(tick_2))
        self.play(Indicate(tangent_1), Indicate(tangent_2))
        self.wait(2)
