from manim import *
import numpy as np


class ThreeDSurfaceDemo(ThreeDScene):
    def construct(self):
        axes = ThreeDAxes()
        surface = Surface(
            lambda u, v: np.array([u, v, np.sin(u) * np.cos(v)]),
            u_range=[-3, 3],
            v_range=[-3, 3],
            resolution=(24, 24),
        )

        self.set_camera_orientation(phi=65 * DEGREES, theta=-45 * DEGREES)
        self.play(Create(axes))
        self.play(Create(surface), run_time=2)
        self.begin_ambient_camera_rotation(rate=0.2)
        self.wait(3)
        self.stop_ambient_camera_rotation()
