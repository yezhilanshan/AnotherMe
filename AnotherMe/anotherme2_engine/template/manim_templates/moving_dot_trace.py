from manim import *


class MovingDotTrace(Scene):
    def construct(self):
        plane = NumberPlane()
        path = Circle(radius=2)
        dot = Dot(path.point_from_proportion(0), color=YELLOW)
        trace = TracedPath(dot.get_center, stroke_width=4)

        self.add(plane, path, trace, dot)
        self.play(MoveAlongPath(dot, path), run_time=4, rate_func=linear)
        self.wait(1)
