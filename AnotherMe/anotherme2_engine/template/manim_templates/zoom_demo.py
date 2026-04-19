from manim import *


class ZoomDemo(ZoomedScene):
    def __init__(self, **kwargs):
        super().__init__(zoom_factor=0.3, zoomed_display_height=3, zoomed_display_width=3, **kwargs)

    def construct(self):
        plane = NumberPlane()
        dot = Dot([1.2, 0.8, 0])
        tiny = Star(n=5).scale(0.15).move_to(dot)

        self.add(plane, dot, tiny)
        self.activate_zooming()
        self.play(self.zoomed_camera.frame.animate.move_to(dot).scale(0.7))
        self.play(dot.animate.shift(LEFT + DOWN * 0.5), tiny.animate.rotate(PI))
        self.wait(1)
