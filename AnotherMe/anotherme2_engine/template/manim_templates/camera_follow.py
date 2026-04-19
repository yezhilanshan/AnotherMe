from manim import *
import numpy as np


class CameraFollow(MovingCameraScene):
    def construct(self):
        axes = Axes(x_range=[0, 10, 1], y_range=[-2, 2, 1], x_length=12, y_length=4)
        graph = axes.plot(lambda x: np.sin(1.2 * x), x_range=[0, 10])
        dot = Dot(axes.i2gp(0, graph), color=YELLOW)

        self.add(axes, graph, dot)
        self.play(self.camera.frame.animate.scale(0.6).move_to(dot))

        for x in [2, 4, 6, 8, 10]:
            target = axes.i2gp(x, graph)
            self.play(dot.animate.move_to(target), self.camera.frame.animate.move_to(target), run_time=0.8)
        self.wait(1)
