from manim import *
import numpy as np


class AreaUnderCurve(Scene):
    def construct(self):
        axes = Axes(x_range=[0, 4, 1], y_range=[0, 5, 1], x_length=7, y_length=4)
        graph = axes.plot(lambda x: x + 0.5 * np.sin(3 * x), x_range=[0, 4])
        area = axes.get_area(graph, x_range=[1, 3], opacity=0.5)
        bounds = VGroup(
            DashedLine(axes.c2p(1, 0), axes.i2gp(1, graph)),
            DashedLine(axes.c2p(3, 0), axes.i2gp(3, graph)),
        )

        self.play(Create(axes), Create(graph))
        self.play(FadeIn(area), Create(bounds))
        self.wait(1)
