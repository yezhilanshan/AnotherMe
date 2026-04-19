from manim import *
import numpy as np


class MovingPointArea(Scene):
    def construct(self):
        A = np.array([-4.0, -2.0, 0])
        B = np.array([4.0, -2.0, 0])
        C = np.array([-1.2, 2.0, 0])

        base = Line(A, B, color=WHITE)
        side1 = Line(A, C, color=WHITE)
        side2 = Line(C, B, color=WHITE)
        self.play(Create(base), Create(side1), Create(side2))

        tracker = ValueTracker(0.15)

        def point_p():
            return A + tracker.get_value() * (B - A)

        dot_p = always_redraw(lambda: Dot(point_p(), color=YELLOW))
        seg_cp = always_redraw(lambda: Line(C, point_p(), color=BLUE))

        tri_left = always_redraw(
            lambda: Polygon(A, point_p(), C, color=GREEN, fill_opacity=0.35, stroke_width=0)
        )
        tri_right = always_redraw(
            lambda: Polygon(point_p(), B, C, color=RED, fill_opacity=0.25, stroke_width=0)
        )

        self.play(FadeIn(tri_left), FadeIn(tri_right))
        self.play(FadeIn(dot_p), Create(seg_cp))
        self.play(tracker.animate.set_value(0.85), run_time=3)
        self.play(tracker.animate.set_value(0.35), run_time=2)
        self.wait(2)
