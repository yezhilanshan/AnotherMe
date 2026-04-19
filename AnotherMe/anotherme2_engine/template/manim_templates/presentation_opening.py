from manim import *


class PresentationOpening(Scene):
    def construct(self):
        title = Text("My Manim Presentation").scale(0.9)
        subtitle = Text("Clean opening template").scale(0.45).next_to(title, DOWN)
        line = Line(LEFT * 3, RIGHT * 3).next_to(subtitle, DOWN, buff=0.4)
        bullets = VGroup(
            Text("• Topic introduction").scale(0.4),
            Text("• Core method").scale(0.4),
            Text("• Result showcase").scale(0.4),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.25).next_to(line, DOWN, buff=0.5)

        self.play(FadeIn(title, shift=UP * 0.4))
        self.play(FadeIn(subtitle))
        self.play(Create(line))
        self.play(LaggedStart(*[FadeIn(item, shift=RIGHT * 0.2) for item in bullets], lag_ratio=0.2))
        self.wait(1)
