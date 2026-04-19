from manim import *


class BasicShapes(Scene):
    def construct(self):
        title = Text("Basic Shapes Demo").scale(0.7).to_edge(UP)

        circle = Circle(radius=1.0)
        square = Square(side_length=1.8)
        triangle = Triangle().scale(1.1)

        shapes = VGroup(circle, square, triangle).arrange(RIGHT, buff=1.2).shift(DOWN * 0.3)
        labels = VGroup(
            Text("Circle").scale(0.4).next_to(circle, DOWN),
            Text("Square").scale(0.4).next_to(square, DOWN),
            Text("Triangle").scale(0.4).next_to(triangle, DOWN),
        )

        self.play(Write(title))
        self.play(LaggedStart(*[Create(m) for m in shapes], lag_ratio=0.2))
        self.play(LaggedStart(*[FadeIn(m, shift=UP * 0.2) for m in labels], lag_ratio=0.15))
        self.play(circle.animate.shift(UP * 0.5), square.animate.rotate(PI / 4), triangle.animate.set_fill(opacity=0.5))
        self.wait(1)
