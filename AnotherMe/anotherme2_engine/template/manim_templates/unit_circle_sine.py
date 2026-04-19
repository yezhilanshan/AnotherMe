from manim import *
import numpy as np


class UnitCircleSine(Scene):
    def construct(self):
        circle = Circle(radius=1.6).shift(LEFT * 2.5)
        axes = Axes(x_range=[0, TAU, PI / 2], y_range=[-1.2, 1.2, 1], x_length=5, y_length=3).shift(RIGHT * 2)
        angle = ValueTracker(0)

        point = always_redraw(lambda: Dot(circle.point_at_angle(angle.get_value()), color=YELLOW))
        radius = always_redraw(lambda: Line(circle.get_center(), point.get_center()))
        vertical = always_redraw(lambda: DashedLine(point.get_center(), [point.get_x(), circle.get_center()[1], 0]))
        sine_dot = always_redraw(lambda: Dot(axes.c2p(angle.get_value(), np.sin(angle.get_value())), color=RED))

        self.add(circle, axes, point, radius, vertical, sine_dot)
        self.play(angle.animate.set_value(TAU), run_time=5, rate_func=linear)
        self.wait(1)
