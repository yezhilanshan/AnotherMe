from manim import *


class UpdaterRotation(Scene):
    def construct(self):
        center = Dot()
        orbit = Circle(radius=2)
        satellite = Dot(color=RED).move_to(orbit.point_from_proportion(0))
        radius_line = always_redraw(lambda: Line(center.get_center(), satellite.get_center()))

        self.add(orbit, center, radius_line, satellite)
        self.play(Rotating(satellite, about_point=ORIGIN, angle=TAU), run_time=4, rate_func=linear)
        self.wait(1)
