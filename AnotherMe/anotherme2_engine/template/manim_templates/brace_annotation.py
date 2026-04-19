from manim import *


class BraceAnnotationDemo(Scene):
    def construct(self):
        line = NumberLine(x_range=[0, 6, 1], length=8)
        segment = Line(line.n2p(1), line.n2p(4))
        brace = Brace(segment, DOWN)
        text = brace.get_text("length = 3")
        dots = VGroup(Dot(line.n2p(1)), Dot(line.n2p(4)))

        self.play(Create(line))
        self.play(Create(segment), FadeIn(dots))
        self.play(GrowFromCenter(brace), Write(text))
        self.wait(1)
