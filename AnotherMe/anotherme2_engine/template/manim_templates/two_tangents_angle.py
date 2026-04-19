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


def make_angle_mark(a, o, b, radius=0.46, color=YELLOW, label_text=None, label_buff=0.16):
    line_1 = Line(o, a)
    line_2 = Line(o, b)
    angle = Angle(line_1, line_2, radius=radius, color=color)
    label = None
    if label_text is not None:
        theta_1 = np.arctan2((a - o)[1], (a - o)[0])
        theta_2 = np.arctan2((b - o)[1], (b - o)[0])
        if theta_2 < theta_1:
            theta_2 += TAU
        mid_theta = (theta_1 + theta_2) / 2
        label = MathTex(label_text, color=color).scale(0.8)
        label.move_to(o + np.array([np.cos(mid_theta), np.sin(mid_theta), 0]) * (radius + label_buff))
    return angle, label


class TwoTangentsAngle(Scene):
    def construct(self):
        center = LEFT * 1.2
        radius = 2.0
        external_point = RIGHT * 3.4 + UP * 0.25
        tangent_top, tangent_bottom = tangent_points(center, radius, external_point)

        circle = Circle(radius=radius, color=WHITE).move_to(center)
        dot_center = Dot(center, color=WHITE)
        dot_external = Dot(external_point, color=YELLOW)
        label_center = MathTex("O").scale(0.7).next_to(dot_center, DOWN + LEFT, buff=0.08)
        label_external = MathTex("P", color=YELLOW).scale(0.7).next_to(dot_external, RIGHT, buff=0.12)

        tangent_1 = Line(external_point, tangent_top, color=BLUE)
        tangent_2 = Line(external_point, tangent_bottom, color=GREEN)
        radius_1 = Line(center, tangent_top, color=GRAY)
        radius_2 = Line(center, tangent_bottom, color=GRAY)
        label_t1 = MathTex("T_1", color=BLUE).scale(0.7).next_to(tangent_top, UP, buff=0.08)
        label_t2 = MathTex("T_2", color=GREEN).scale(0.7).next_to(tangent_bottom, DOWN, buff=0.08)

        self.play(Create(circle), FadeIn(dot_center), FadeIn(dot_external))
        self.play(Write(label_center), Write(label_external))
        self.play(Create(tangent_1), Create(tangent_2))
        self.play(Create(radius_1), Create(radius_2), Write(label_t1), Write(label_t2))

        right_top = right_angle_marker(tangent_top, center, external_point)
        right_bottom = right_angle_marker(tangent_bottom, external_point, center)
        tick_1 = segment_tick(external_point, tangent_top)
        tick_2 = segment_tick(external_point, tangent_bottom)
        tangent_caption = MathTex(r"PT_1 = PT_2").scale(0.8).to_edge(UP)

        self.play(Create(right_top), Create(right_bottom))
        self.play(Create(tick_1), Create(tick_2), Write(tangent_caption))

        arc = Arc(
            radius=radius,
            start_angle=np.arctan2((tangent_bottom - center)[1], (tangent_bottom - center)[0]),
            angle=(
                np.arctan2((tangent_top - center)[1], (tangent_top - center)[0])
                - np.arctan2((tangent_bottom - center)[1], (tangent_bottom - center)[0])
            )
            % TAU,
            arc_center=center,
            color=RED,
        )
        angle_p, label_p = make_angle_mark(tangent_top, external_point, tangent_bottom, radius=0.55, color=YELLOW, label_text=r"\alpha")
        angle_o, label_o = make_angle_mark(tangent_bottom, center, tangent_top, radius=0.48, color=RED, label_text=r"\beta")
        relation = MathTex(r"\alpha + \beta = 180^\circ").scale(0.8).next_to(tangent_caption, DOWN, buff=0.18)

        self.play(Create(arc))
        self.play(Create(angle_p), Write(label_p))
        self.play(Create(angle_o), Write(label_o))
        self.play(Write(relation))
        self.play(Indicate(angle_p), Indicate(angle_o))
        self.wait(2)
