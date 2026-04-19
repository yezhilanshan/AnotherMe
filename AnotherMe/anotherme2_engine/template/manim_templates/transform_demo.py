from manim import *


class TransformDemo(Scene):
    def construct(self):
        title = Text("Transform Demo").scale(0.7).to_edge(UP)
        square = Square(side_length=2)
        circle = Circle(radius=1.1)
        star = Star(n=5).scale(1.3)

        self.play(Write(title))
        self.play(Create(square))
        self.play(Transform(square, circle))
        self.play(ReplacementTransform(square, star))
        self.play(star.animate.rotate(PI).scale(0.8))
        self.wait(1)
