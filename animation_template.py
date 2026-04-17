
from manim import *
import numpy as np
import math

config.pixel_width = 1920
config.pixel_height = 1080
config.frame_width = 14.222
config.frame_height = 8.0


class RhombusFoldProblemNarrationTimedV2(Scene):
    """
    严格按用户指定的讲解分段时长控制：
    0. 开场观察题目：15s
    1. 先求高：20s
    2. 建立坐标：25s
    3. 求点 E：15s
    4. 求 BE：15s
    5. 求 C'：15s
    6. 求距离并得答案：15s
    7. 结尾总结：10s

    说明：
    每一段总时长 = 本段所有 play(run_time=...) + wait(...)
    """

    def reflect_point_across_line(self, p, a, b):
        ap = p - a
        ab = b - a
        t = np.dot(ap, ab) / np.dot(ab, ab)
        proj = a + t * ab
        return 2 * proj - p

    def right_angle_mark(self, vertex, dir1, dir2, size=0.15, color=BLACK):
        u = dir1 / np.linalg.norm(dir1)
        v = dir2 / np.linalg.norm(dir2)
        p1 = vertex + u * size
        p2 = p1 + v * size
        p3 = vertex + v * size
        return VMobject(color=color, stroke_width=2.3).set_points_as_corners([p1, p2, p3])

    def build_step(self, title, rows):
        title_obj = Text(
            title,
            font="Microsoft YaHei",
            font_size=23,
            color=BLACK,
            weight=BOLD,
        )

        body = VGroup()
        for kind, content in rows:
            if kind == "math":
                obj = MathTex(content, font_size=29, color=BLACK)
            else:
                obj = Text(
                    content,
                    font="Microsoft YaHei",
                    font_size=20,
                    color=BLACK,
                    line_spacing=0.95,
                )
            body.add(obj)

        body.arrange(DOWN, aligned_edge=LEFT, buff=0.28)
        group = VGroup(title_obj, body).arrange(DOWN, aligned_edge=LEFT, buff=0.26)

        max_width = 4.45
        if group.width > max_width:
            group.scale(max_width / group.width)

        group.move_to(np.array([4.78, 0.28, 0]))
        return group

    def replace_step(self, current_step, new_step):
        if len(current_step) == 0:
            self.play(FadeIn(new_step), run_time=0.8)
        else:
            self.play(FadeOut(current_step), run_time=0.35)
            self.play(FadeIn(new_step), run_time=0.6)
        return new_step

    def construct(self):
        self.camera.background_color = "#F7F6F3"

        # ===== 几何数据 =====
        rt5 = math.sqrt(5)
        B = np.array([-4.35, -1.95, 0.0])
        C = np.array([-0.55, -1.95, 0.0])
        A = np.array([-4.35 + 0.85 * rt5, -1.95 + 1.70 * rt5, 0.0])
        D = C + (A - B)
        E = B + np.array([0.85 * (rt5 - 1), 1.70 * (rt5 - 1), 0.0])
        F = np.array([A[0], B[1], 0.0])

        Bp = self.reflect_point_across_line(B, D, E)
        Cp = self.reflect_point_across_line(C, D, E)

        # ===== 图形对象 =====
        seg_AB = Line(A, B, color=BLACK, stroke_width=3)
        seg_BC = Line(B, C, color=BLACK, stroke_width=3)
        seg_CD = Line(C, D, color=BLACK, stroke_width=3)
        seg_DA = Line(D, A, color=BLACK, stroke_width=3)
        seg_DE = Line(D, E, color=BLUE_D, stroke_width=4)
        seg_AF = DashedLine(A, F, color=GREY_B, stroke_width=2.4)

        pts = {
            "A": Dot(A, radius=0.034, color=BLACK),
            "B": Dot(B, radius=0.034, color=BLACK),
            "C": Dot(C, radius=0.034, color=BLACK),
            "D": Dot(D, radius=0.034, color=BLACK),
            "E": Dot(E, radius=0.034, color=BLACK),
            "F": Dot(F, radius=0.028, color=GREY_B),
            "Bp": Dot(Bp, radius=0.034, color=BLACK),
            "Cp": Dot(Cp, radius=0.034, color=BLACK),
        }

        labels = {
            "A": MathTex("A", color=BLACK, font_size=26).move_to(A + np.array([-0.18, 0.24, 0])),
            "B": MathTex("B", color=BLACK, font_size=26).move_to(B + np.array([-0.14, -0.26, 0])),
            "C": MathTex("C", color=BLACK, font_size=26).move_to(C + np.array([0.15, -0.26, 0])),
            "D": MathTex("D", color=BLACK, font_size=26).move_to(D + np.array([0.20, 0.22, 0])),
            "E": MathTex("E", color=BLACK, font_size=26).move_to(E + np.array([-0.24, 0.06, 0])),
            "F": MathTex("F", color=GREY_D, font_size=22).move_to(F + np.array([0.0, -0.24, 0])),
            "Bp": MathTex("B'", color=BLACK, font_size=26).move_to(Bp + np.array([-0.28, -0.02, 0])),
            "Cp": MathTex("C'", color=BLACK, font_size=26).move_to(Cp + np.array([0.00, 0.25, 0])),
        }

        mark_5 = MathTex("AD=5", color=BLACK, font_size=26).move_to((A + D) / 2 + np.array([0, 0.25, 0]))
        tan_tag = MathTex(r"\tan B=2", color=BLACK, font_size=26).move_to(B + np.array([0.95, 0.45, 0]))

        right_F = self.right_angle_mark(F, np.array([0, 1, 0]), np.array([1, 0, 0]), size=0.16, color=GREY_B)
        right_E = self.right_angle_mark(E, B - E, Bp - E, size=0.14, color=RED_D)

        current_step = VGroup()

        # =========================================================
        # 0. 开场观察题目：严格 15s
        # 1.8 + 0.8 + 1.0 + 0.8 + 10.6 = 15.0
        # =========================================================
        self.play(
            Create(seg_AB), Create(seg_BC), Create(seg_CD), Create(seg_DA),
            run_time=1.8
        )
        self.play(Create(seg_DE), run_time=0.8)
        self.play(
            FadeIn(VGroup(pts["A"], pts["B"], pts["C"], pts["D"], pts["E"])),
            FadeIn(VGroup(labels["A"], labels["B"], labels["C"], labels["D"], labels["E"])),
            run_time=1.0
        )
        self.play(FadeIn(mark_5), FadeIn(tan_tag), run_time=0.8)

        opening_step = self.build_step(
            "观察题目",
            [
                ("text", "已知菱形 ABCD 的边长是 5"),
                ("text", "并且 tanB=2"),
                ("text", "沿 DE 折叠后，点 C 落到 C'"),
                ("text", "要求 C' 到 BC 的距离"),
            ],
        )
        current_step = self.replace_step(current_step, opening_step)
        self.wait(10.6)

        # =========================================================
        # 1. 先求高：严格 20s
        # 0.95 + 1.0 + 1.0 + 0.6 + 16.45 = 20.0
        # =========================================================
        step1 = self.build_step(
            "第1步：先求菱形的高",
            [
                ("text", "过 A 向 BC 作垂线，垂足记为 F"),
                ("math", r"\tan B=\frac{AF}{BF}=2"),
                ("text", "设 BF=x，则 AF=2x"),
                ("math", r"AB^2=AF^2+BF^2=(2x)^2+x^2=5x^2"),
                ("math", r"AF=2\sqrt5"),
            ],
        )
        current_step = self.replace_step(current_step, step1)
        self.play(Create(seg_AF), FadeIn(pts["F"]), FadeIn(labels["F"]), Create(right_F), run_time=1.0)
        self.play(Indicate(seg_AF, color=ORANGE), Indicate(seg_BC, color=ORANGE), run_time=1.0)

        af_tag = MathTex(r"AF=2\sqrt5", color=ORANGE, font_size=26).move_to((A + F) / 2 + np.array([-0.45, 0.0, 0]))
        self.play(FadeIn(af_tag), run_time=0.6)
        self.wait(16.45)

        # =========================================================
        # 2. 建立坐标：严格 25s
        # 0.95 + 0.8 + 0.9 + 22.35 = 25.0
        # =========================================================
        step2 = self.build_step(
            "第2步：建立坐标",
            [
                ("text", "取 B 为原点，令 BC 在 x 轴上"),
                ("math", r"B(0,0),\ C(5,0)"),
                ("math", r"A(\sqrt5,\ 2\sqrt5)"),
                ("math", r"D(5+\sqrt5,\ 2\sqrt5)"),
                ("math", r"AB:\ y=2x"),
            ],
        )
        current_step = self.replace_step(current_step, step2)

        coord_B = MathTex(r"(0,0)", color=BLACK, font_size=21).move_to(B + np.array([-0.46, -0.53, 0]))
        coord_C = MathTex(r"(5,0)", color=BLACK, font_size=21).move_to(C + np.array([0.46, -0.53, 0]))
        coord_A = MathTex(r"(\sqrt5,2\sqrt5)", color=BLACK, font_size=19).move_to(A + np.array([-0.05, 0.46, 0]))
        coord_D = MathTex(r"(5+\sqrt5,2\sqrt5)", color=BLACK, font_size=18).move_to(D + np.array([0.82, 0.34, 0]))

        self.play(FadeIn(coord_B), FadeIn(coord_C), run_time=0.8)
        self.play(FadeIn(coord_A), FadeIn(coord_D), run_time=0.9)
        self.wait(22.35)

        # =========================================================
        # 3. 求点 E：严格 15s
        # 0.95 + 0.8 + 0.8 + 0.7 + 11.75 = 15.0
        # =========================================================
        step3 = self.build_step(
            "第3步：求点 E 的位置",
            [
                ("text", "折叠轴 DE 平分 ∠BEB'"),
                ("math", r"\angle BEB'=90^\circ\Rightarrow \angle BED=45^\circ"),
                ("text", "又因为 E 在 AB 上，所以 BE 与 AB 共线"),
                ("math", r"k_{AB}=2,\quad k_{DE}=\frac13"),
                ("math", r"E(\sqrt5-1,\ 2\sqrt5-2)"),
            ],
        )
        current_step = self.replace_step(current_step, step3)
        self.play(Indicate(seg_AB, color=ORANGE), run_time=0.8)
        self.play(Indicate(seg_DE, color=BLUE_D), run_time=0.8)
        coord_E = MathTex(r"(\sqrt5-1,\ 2\sqrt5-2)", color=BLACK, font_size=19).move_to(E + np.array([0.42, 0.42, 0]))
        self.play(FadeIn(coord_E), run_time=0.7)
        self.wait(11.75)

        # =========================================================
        # 4. 求 BE：严格 15s
        # 0.95 + 0.7 + 0.6 + 0.3 + 12.45 = 15.0
        # =========================================================
        step4 = self.build_step(
            "第4步：先求 BE",
            [
                ("text", "因为 E 在 AB 上，所以直接用坐标求长度"),
                ("math", r"BE=\sqrt{(\sqrt5-1)^2+(2\sqrt5-2)^2}"),
                ("math", r"=5-\sqrt5"),
            ],
        )
        current_step = self.replace_step(current_step, step4)

        be_highlight = Line(B, E, color=ORANGE, stroke_width=5)
        be_tag = Text(
            "BE = 5 - √5",
            font="Microsoft YaHei",
            font_size=24,
            color=ORANGE,
            weight=BOLD,
        ).move_to((B + E) / 2 + np.array([-0.45, 0.20, 0]))
        self.play(Create(be_highlight), run_time=0.7)
        self.play(FadeIn(be_tag), run_time=0.6)
        self.play(FadeOut(be_highlight), run_time=0.3)
        self.wait(12.45)

        # =========================================================
        # 5. 求 C'：严格 15s
        # 0.95 + 0.4 + 3.0 + 0.35 + 1.0 + 0.7 + 8.6 = 15.0
        # =========================================================
        step5 = self.build_step(
            "第5步：求折叠后点 C'",
            [
                ("text", "把点 C 关于直线 DE 作对称"),
                ("math", r"DE:\ x-3y+5\sqrt5-5=0"),
                ("math", r"C(5,0)"),
                ("math", r"C'(5-\sqrt5,\ 3\sqrt5)"),
            ],
        )
        current_step = self.replace_step(current_step, step5)

        moving_B = Dot(B, radius=0.034, color=BLACK)
        moving_C = Dot(C, radius=0.034, color=BLACK)
        moving_B_label = MathTex("B", color=BLACK, font_size=26).move_to(B + np.array([-0.14, -0.26, 0]))
        moving_C_label = MathTex("C", color=BLACK, font_size=26).move_to(C + np.array([0.15, -0.26, 0]))

        moving_EB = always_redraw(lambda: Line(E, moving_B.get_center(), color=BLACK, stroke_width=3))
        moving_BC = always_redraw(lambda: Line(moving_B.get_center(), moving_C.get_center(), color=BLACK, stroke_width=3))
        moving_CD = always_redraw(lambda: Line(moving_C.get_center(), D, color=BLACK, stroke_width=3))

        self.add(moving_EB, moving_BC, moving_CD, moving_B, moving_C, moving_B_label, moving_C_label)
        self.wait(0.4)
        self.play(
            moving_B.animate.move_to(Bp),
            moving_C.animate.move_to(Cp),
            moving_B_label.animate.move_to(Bp + np.array([-0.20, -0.02, 0])),
            moving_C_label.animate.move_to(Cp + np.array([0.00, 0.22, 0])),
            run_time=3.0,
            rate_func=smooth,
        )
        self.play(
            FadeOut(moving_EB), FadeOut(moving_BC), FadeOut(moving_CD),
            FadeOut(moving_B), FadeOut(moving_C),
            FadeOut(moving_B_label), FadeOut(moving_C_label),
            run_time=0.35,
        )

        folded_edges = VGroup(
            Line(E, Bp, color=BLACK, stroke_width=3),
            Line(Bp, Cp, color=BLACK, stroke_width=3),
            Line(Cp, D, color=BLACK, stroke_width=3),
            pts["Bp"], pts["Cp"], labels["Bp"], labels["Cp"],
        )
        self.play(FadeIn(folded_edges), Create(right_E), run_time=1.0)

        coord_Cp = MathTex(r"(5-\sqrt5,\ 3\sqrt5)", color=BLACK, font_size=19).move_to(Cp + np.array([0.90, 0.10, 0]))
        self.play(FadeIn(coord_Cp), run_time=0.7)
        self.wait(8.6)

        # =========================================================
        # 6. 求距离并得答案：严格 15s
        # 0.95 + 0.8 + 0.6 + 0.8 + 11.85 = 15.0
        # =========================================================
        step6 = self.build_step(
            "第6步：求 C' 到 BC 的距离",
            [
                ("text", "因为 BC 在 x 轴上"),
                ("text", "所以距离就是 C' 的纵坐标"),
                ("math", r"d(C',BC)=|y_{C'}|=3\sqrt5"),
            ],
        )
        current_step = self.replace_step(current_step, step6)

        foot = np.array([Cp[0], B[1], 0.0])
        perp = DashedLine(Cp, foot, color=RED_D, stroke_width=3)
        dist_tag = MathTex(r"3\sqrt5", color=RED_D, font_size=26).move_to((Cp + foot) / 2 + np.array([0.40, 0.0, 0]))
        self.play(Create(perp), run_time=0.8)
        self.play(FadeIn(dist_tag), run_time=0.6)

        final_answer = VGroup(
            Text("答案：D", font="Microsoft YaHei", font_size=26, color=RED_D, weight=BOLD),
            MathTex(r"d(C',BC)=3\sqrt5", color=RED_D, font_size=30),
        ).arrange(DOWN, buff=0.16)
        final_answer.move_to(np.array([4.78, -2.52, 0]))

        self.play(FadeIn(final_answer), run_time=0.8)
        self.wait(11.85)

        # =========================================================
        # 7. 结尾总结：严格 10s
        # 0.8 + 9.2 = 10.0
        # =========================================================
        summary = Text(
            "关键：求高 → 建坐标 → 求折叠轴 → 作对称",
            font="Microsoft YaHei",
            font_size=22,
            color=GREY_D,
        ).move_to(np.array([0.25, 3.25, 0]))
        self.play(FadeIn(summary), run_time=0.8)
        self.wait(9.2)
