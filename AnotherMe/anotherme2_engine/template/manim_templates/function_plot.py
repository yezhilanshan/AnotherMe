from manim import *
import numpy as np


class FunctionPlot(Scene):
    def construct(self):
        axes = Axes(
            x_range=[-4, 4, 1],
            y_range=[-2, 2, 1],
            x_length=8,
            y_length=4,
            axis_config={"include_numbers": True},
        )
        sin_graph = axes.plot(lambda x: np.sin(x), x_range=[-4, 4])
        cos_graph = axes.plot(lambda x: np.cos(x), x_range=[-4, 4])
        labels = VGroup(
            axes.get_graph_label(sin_graph, MathTex("\sin x"), x_val=3),
            axes.get_graph_label(cos_graph, MathTex("\cos x"), x_val=2),
        )

        self.play(Create(axes))
        self.play(Create(sin_graph), Create(cos_graph))
        self.play(Write(labels))
        self.wait(1)
