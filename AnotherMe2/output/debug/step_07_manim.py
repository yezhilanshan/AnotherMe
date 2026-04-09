from manim import *
import numpy as np

config.frame_height = 8.0
config.frame_width = 14.222
config.pixel_height = 1080
config.pixel_width = 1920

class Scene1RtTriangleAbcAngleC90CircBc6CmAc8CmTriangleBcdBdCAbCTriang(Scene):
    def construct(self):
        self.camera.background_color = '#1a1a2e'

        # 对象注册表：同一几何元素在全流程复用
        # 坐标系统：C 为直角顶点，AC 水平，BC 垂直
        # AC = 8cm, BC = 6cm, AB = 10cm (勾股定理)
        # D 在 AC 上，DC = 3cm (解题结果)
        # C' 在 AB 上，BC' = BC = 6cm, AC' = 4cm
        points = {}
        point_labels = {}
        lines = {}
        objects = {}

        # 坐标计算：让图形居中显示，比例 1cm = 0.6 单位
        scale = 0.6
        C_center = np.array([1, -1.5, 0])  # 向左下移动
        points['C'] = Dot(point=C_center, radius=0.05, color=WHITE)
        points['A'] = Dot(point=C_center + np.array([-8 * scale, 0, 0]), radius=0.05, color=WHITE)
        points['B'] = Dot(point=C_center + np.array([0, 6 * scale, 0]), radius=0.05, color=WHITE)
        points['D'] = Dot(point=C_center + np.array([-3 * scale, 0, 0]), radius=0.05, color=WHITE)  # DC = 3cm
        # C' 在 AB 上，AC' = 4cm, AB = 10cm, 所以 C' = A + 0.4 * (B - A)
        C_prime_pos = points['A'].get_center() + 0.4 * (points['B'].get_center() - points['A'].get_center())
        points['C\''] = Dot(point=C_prime_pos, radius=0.05, color=WHITE)

        # 添加标签
        point_labels['A'] = Text('A', font_size=24, color=WHITE).next_to(points['A'], DOWN * 0.3)
        point_labels['B'] = Text('B', font_size=24, color=WHITE).next_to(points['B'], UR * 0.3)
        point_labels['C'] = Text('C', font_size=24, color=WHITE).next_to(points['C'], DR * 0.3)
        point_labels['C\''] = Text('C\'', font_size=20, color=WHITE).next_to(points['C\''], UL * 0.2)
        point_labels['D'] = Text('D', font_size=24, color=WHITE).next_to(points['D'], DOWN * 0.3)

        for p in ['A', 'B', 'C', 'C\'', 'D']:
            self.add(points[p], point_labels[p])

        # 创建线段 - 只创建题目中实际存在的线段
        # 原始三角形 ABC 的边
        lines['AB'] = Line(points['A'].get_center(), points['B'].get_center(), color=BLUE_E, stroke_width=3)
        lines['BC'] = Line(points['B'].get_center(), points['C'].get_center(), color=BLUE_E, stroke_width=3)
        lines['AC'] = Line(points['A'].get_center(), points['C'].get_center(), color=BLUE_E, stroke_width=3)
        # 折叠线 BD
        lines['BD'] = Line(points['B'].get_center(), points['D'].get_center(), color=BLUE_E, stroke_width=3)
        # 折叠后形成的线段
        lines['BC\''] = Line(points['B'].get_center(), points['C\''].get_center(), color=BLUE_E, stroke_width=3)
        lines['DC\''] = Line(points['D'].get_center(), points['C\''].get_center(), color=BLUE_E, stroke_width=3)
        lines['AC\''] = Line(points['A'].get_center(), points['C\''].get_center(), color=BLUE_E, stroke_width=3)

        for line in lines.values():
            self.add(line)

        # 直角标记在 C 点
        right_angle = RightAngle(lines['AC'], lines['BC'], length=0.4, color=WHITE)
        self.add(right_angle)

        # 三角形填充（可选，用于高亮）
        objects['triangle_ABC'] = Polygon(
            points['A'].get_center(), points['B'].get_center(), points['C'].get_center(),
            color=BLUE, stroke_width=0, fill_opacity=0.1
        )
        objects['triangle_BCD'] = Polygon(
            points['B'].get_center(), points['C'].get_center(), points['D'].get_center(),
            color=GREEN, stroke_width=0, fill_opacity=0.1
        )
        objects['triangle_ADC\''] = Polygon(
            points['A'].get_center(), points['D'].get_center(), points['C\''].get_center(),
            color=YELLOW, stroke_width=0, fill_opacity=0.15
        )
        self.add(objects['triangle_ABC'], objects['triangle_BCD'], objects['triangle_ADC\''])

        current_formula_group = VGroup()

        # Step 1: 梳理题目已知条件
        self.add_sound(r'output/audio/narration_001.mp3', time_offset=0.00)
        highlight_anims = []
        highlight_anims.append(lines['AB'].animate.set_color(YELLOW))
        highlight_anims.append(lines['AC'].animate.set_color(YELLOW))
        highlight_anims.append(lines['BC'].animate.set_color(YELLOW))
        highlight_anims.append(lines['BD'].animate.set_color(YELLOW))
        highlight_anims.append(points['C'].animate.set_color(YELLOW))
        highlight_anims.append(points['C\''].animate.set_color(YELLOW))
        self.play(*highlight_anims, run_time=0.80)
        transform_anims = []
        transform_anims.append(lines['AB'].animate.set_color(ORANGE))
        transform_anims.append(lines['AC'].animate.set_color(ORANGE))
        transform_anims.append(lines['BC'].animate.set_color(ORANGE))
        transform_anims.append(lines['BD'].animate.set_color(ORANGE))
        transform_anims.append(points['C'].animate.scale(1.05).set_color(ORANGE))
        transform_anims.append(points['C\''].animate.scale(1.05).set_color(ORANGE))
        self.play(*transform_anims, run_time=0.90)
        temp_labels = VGroup()
        temp_labels.add(Text('AB', font_size=24, color=GREEN).next_to(lines['AB'], LEFT * 0.3))
        temp_labels.add(Text('AC', font_size=24, color=GREEN).next_to(lines['AC'], DOWN * 0.3))
        temp_labels.add(Text('BC', font_size=24, color=GREEN).next_to(lines['BC'], RIGHT * 0.3))
        temp_labels.add(Text('BD', font_size=24, color=GREEN).next_to(lines['BD'], DR * 0.3))
        temp_labels.add(Text('C', font_size=24, color=GREEN).next_to(points['C'], DR * 0.3))
        temp_labels.add(Text('C\'', font_size=24, color=GREEN).next_to(points['C\''], UL * 0.3))
        self.play(FadeIn(temp_labels), run_time=0.60)
        self.play(FadeOut(temp_labels), run_time=0.40)
        if len(current_formula_group) > 0:
            self.play(FadeOut(current_formula_group), run_time=0.20)
        current_formula_group = VGroup()
        step_formula_group = VGroup()
        block_nx = 0.750000
        block_ny = 0.100000
        block_nw = 0.350000
        block_nh = 0.100000
        block_x = -config.frame_width / 2 + block_nx * config.frame_width
        block_y = config.frame_height / 2 - block_ny * config.frame_height
        max_width = max(block_nw * config.frame_width - 0.30, 1.2)
        max_height = max(block_nh * config.frame_height - 0.10, 0.45)
        formula_obj = Text('已知：Rt△ABC，∠C=90°，BC= 6cm，AC=8cm', font_size=28, color=YELLOW, line_spacing=0.85)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        block_nx = 0.810000
        block_ny = 0.230000
        block_nw = 0.300000
        block_nh = 0.080000
        block_x = -config.frame_width / 2 + block_nx * config.frame_width
        block_y = config.frame_height / 2 - block_ny * config.frame_height
        max_width = max(block_nw * config.frame_width - 0.30, 1.2)
        max_height = max(block_nh * config.frame_height - 0.10, 0.45)
        formula_obj = Text('△BCD 沿 BD 折叠，C 对应 AB 上的 C\'点，求 S△ADC\'', font_size=28, color=YELLOW, line_spacing=0.85)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=1.00)
        current_formula_group = step_formula_group
        restore_anims = []
        restore_anims.append(lines['AB'].animate.set_color(BLUE_E).set_stroke(width=3))
        restore_anims.append(lines['AC'].animate.set_color(BLUE_E).set_stroke(width=3))
        restore_anims.append(lines['BC'].animate.set_color(BLUE_E).set_stroke(width=3))
        restore_anims.append(lines['BD'].animate.set_color(BLUE_E).set_stroke(width=3))
        restore_anims.append(points['C'].animate.set_color(WHITE))
        restore_anims.append(points['C\''].animate.set_color(WHITE))
        self.play(*restore_anims, run_time=0.40)
        self.wait(18.48)

        # Step 2: 利用勾股定理求 AB 长
        self.add_sound(r'output/audio/narration_002.mp3', time_offset=22.78)
        highlight_anims = []
        highlight_anims.append(lines['AB'].animate.set_color(YELLOW))
        highlight_anims.append(lines['AC'].animate.set_color(YELLOW))
        highlight_anims.append(lines['BC'].animate.set_color(YELLOW))
        self.play(*highlight_anims, run_time=0.80)
        if len(current_formula_group) > 0:
            self.play(FadeOut(current_formula_group), run_time=0.20)
        current_formula_group = VGroup()
        step_formula_group = VGroup()
        block_nx = 0.810000
        block_ny = 0.340000
        block_nw = 0.300000
        block_nh = 0.080000
        block_x = -config.frame_width / 2 + block_nx * config.frame_width
        block_y = config.frame_height / 2 - block_ny * config.frame_height
        max_width = max(block_nw * config.frame_width - 0.30, 1.2)
        max_height = max(block_nh * config.frame_height - 0.10, 0.45)
        formula_obj = MathTex('AB=\\sqrt{AC^2+BC^2}=\\sqrt{8^2+6^2}=\\sqrt{100}=10\\,\\mathrm{cm}', font_size=32, color=YELLOW)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=1.00)
        current_formula_group = step_formula_group
        restore_anims = []
        restore_anims.append(lines['AB'].animate.set_color(BLUE_E).set_stroke(width=3))
        restore_anims.append(lines['AC'].animate.set_color(BLUE_E).set_stroke(width=3))
        restore_anims.append(lines['BC'].animate.set_color(BLUE_E).set_stroke(width=3))
        self.play(*restore_anims, run_time=0.40)
        self.wait(8.64)

        # Step 3: 利用折叠性质推导 AC' 长度
        self.add_sound(r'output/audio/narration_003.mp3', time_offset=33.82)
        highlight_anims = []
        highlight_anims.append(lines['AB'].animate.set_color(YELLOW))
        highlight_anims.append(lines['AC'].animate.set_color(YELLOW))
        highlight_anims.append(lines['AC\''].animate.set_color(YELLOW))
        highlight_anims.append(lines['BC'].animate.set_color(YELLOW))
        highlight_anims.append(lines['BC\''].animate.set_color(YELLOW))
        self.play(*highlight_anims, run_time=0.80)
        transform_anims = []
        transform_anims.append(lines['AB'].animate.set_color(ORANGE))
        transform_anims.append(lines['AC'].animate.set_color(ORANGE))
        transform_anims.append(lines['AC\''].animate.set_color(ORANGE))
        transform_anims.append(lines['BC'].animate.set_color(ORANGE))
        transform_anims.append(lines['BC\''].animate.set_color(ORANGE))
        self.play(*transform_anims, run_time=0.90)
        temp_labels = VGroup()
        temp_labels.add(Text('AB', font_size=24, color=GREEN).next_to(lines['AB'], LEFT * 0.3))
        temp_labels.add(Text('AC', font_size=24, color=GREEN).next_to(lines['AC'], DOWN * 0.3))
        temp_labels.add(Text('AC\'', font_size=24, color=GREEN).next_to(lines['AC\''], LEFT * 0.3))
        temp_labels.add(Text('BC', font_size=24, color=GREEN).next_to(lines['BC'], RIGHT * 0.3))
        temp_labels.add(Text('BC\'', font_size=24, color=GREEN).next_to(lines['BC\''], UR * 0.3))
        self.play(FadeIn(temp_labels), run_time=0.60)
        self.play(FadeOut(temp_labels), run_time=0.40)
        if len(current_formula_group) > 0:
            self.play(FadeOut(current_formula_group), run_time=0.20)
        current_formula_group = VGroup()
        step_formula_group = VGroup()
        block_nx = 0.810000
        block_ny = 0.450000
        block_nw = 0.300000
        block_nh = 0.080000
        block_x = -config.frame_width / 2 + block_nx * config.frame_width
        block_y = config.frame_height / 2 - block_ny * config.frame_height
        max_width = max(block_nw * config.frame_width - 0.30, 1.2)
        max_height = max(block_nh * config.frame_height - 0.10, 0.45)
        formula_obj = MathTex('AC\'=AB-BC\'=10-6=4\\,\\mathrm{cm}', font_size=32, color=YELLOW)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        block_nx = 0.810000
        block_ny = 0.560000
        block_nw = 0.300000
        block_nh = 0.080000
        block_x = -config.frame_width / 2 + block_nx * config.frame_width
        block_y = config.frame_height / 2 - block_ny * config.frame_height
        max_width = max(block_nw * config.frame_width - 0.30, 1.2)
        max_height = max(block_nh * config.frame_height - 0.10, 0.45)
        formula_obj = Text('折叠性质：BC\'=BC=6cm', font_size=28, color=YELLOW, line_spacing=0.85)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=1.00)
        current_formula_group = step_formula_group
        restore_anims = []
        restore_anims.append(lines['AB'].animate.set_color(BLUE_E).set_stroke(width=3))
        restore_anims.append(lines['AC'].animate.set_color(BLUE_E).set_stroke(width=3))
        restore_anims.append(lines['AC\''].animate.set_color(BLUE_E).set_stroke(width=3))
        restore_anims.append(lines['BC'].animate.set_color(BLUE_E).set_stroke(width=3))
        restore_anims.append(lines['BC\''].animate.set_color(BLUE_E).set_stroke(width=3))
        self.play(*restore_anims, run_time=0.40)
        self.wait(9.38)

        # Step 4: 设未知数列勾股方程 - 在 Rt△ADC' 中应用勾股定理
        self.add_sound(r'output/audio/narration_004.mp3', time_offset=47.50)
        highlight_anims = []
        highlight_anims.append(lines['AC\''].animate.set_color(YELLOW))
        highlight_anims.append(lines['DC\''].animate.set_color(YELLOW))
        highlight_anims.append(points['D'].animate.set_color(YELLOW))
        self.play(*highlight_anims, run_time=0.80)
        transform_anims = []
        transform_anims.append(lines['AC\''].animate.set_color(ORANGE))
        transform_anims.append(lines['DC\''].animate.set_color(ORANGE))
        transform_anims.append(points['D'].animate.scale(1.05).set_color(ORANGE))
        self.play(*transform_anims, run_time=0.90)
        temp_labels = VGroup()
        temp_labels.add(Text('AC\'', font_size=24, color=GREEN).next_to(lines['AC\''], LEFT * 0.3))
        temp_labels.add(Text('D', font_size=24, color=GREEN).next_to(points['D'], DOWN * 0.3))
        temp_labels.add(Text('DC\'', font_size=24, color=GREEN).next_to(lines['DC\''], UL * 0.3))
        self.play(FadeIn(temp_labels), run_time=0.60)
        self.play(FadeOut(temp_labels), run_time=0.40)
        if len(current_formula_group) > 0:
            self.play(FadeOut(current_formula_group), run_time=0.20)
        current_formula_group = VGroup()
        step_formula_group = VGroup()
        block_nx = 0.750000
        block_ny = 0.100000
        block_nw = 0.350000
        block_nh = 0.100000
        block_x = -config.frame_width / 2 + block_nx * config.frame_width
        block_y = config.frame_height / 2 - block_ny * config.frame_height
        max_width = max(block_nw * config.frame_width - 0.30, 1.2)
        max_height = max(block_nh * config.frame_height - 0.10, 0.45)
        formula_obj = Text('设 DC=x cm，则 DC\'=x cm，AD=(8-x)cm', font_size=28, color=YELLOW, line_spacing=0.85)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        block_nx = 0.810000
        block_ny = 0.230000
        block_nw = 0.300000
        block_nh = 0.080000
        block_x = -config.frame_width / 2 + block_nx * config.frame_width
        block_y = config.frame_height / 2 - block_ny * config.frame_height
        max_width = max(block_nw * config.frame_width - 0.30, 1.2)
        max_height = max(block_nh * config.frame_height - 0.10, 0.45)
        formula_obj = MathTex('Rt\\triangle ADC\': (8-x)^2 = 4^2 + x^2', font_size=32, color=YELLOW)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=1.00)
        current_formula_group = step_formula_group
        restore_anims = []
        restore_anims.append(lines['AC\''].animate.set_color(BLUE_E).set_stroke(width=3))
        restore_anims.append(lines['DC\''].animate.set_color(BLUE_E).set_stroke(width=3))
        restore_anims.append(points['D'].animate.set_color(WHITE))
        self.play(*restore_anims, run_time=0.40)
        self.wait(24.84)

        # Step 5: 解方程求 DC 长度
        self.add_sound(r'output/audio/narration_005.mp3', time_offset=76.63)
        if len(current_formula_group) > 0:
            self.play(FadeOut(current_formula_group), run_time=0.20)
        current_formula_group = VGroup()
        step_formula_group = VGroup()
        block_nx = 0.750000
        block_ny = 0.320000
        block_nw = 0.350000
        block_nh = 0.100000
        block_x = -config.frame_width / 2 + block_nx * config.frame_width
        block_y = config.frame_height / 2 - block_ny * config.frame_height
        max_width = max(block_nw * config.frame_width - 0.30, 1.2)
        max_height = max(block_nh * config.frame_height - 0.10, 0.45)
        formula_obj = MathTex('64-16x+x^2=16+x^2 \\rightarrow 16x=48 \\rightarrow x=3', font_size=32, color=YELLOW)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=1.00)
        current_formula_group = step_formula_group
        self.wait(15.91)

        # Step 6: 计算△ADC' 的面积
        self.add_sound(r'output/audio/narration_006.mp3', time_offset=93.74)
        highlight_anims = []
        highlight_anims.append(lines['AC\''].animate.set_color(YELLOW))
        highlight_anims.append(lines['DC\''].animate.set_color(YELLOW))
        self.play(*highlight_anims, run_time=0.80)
        if len(current_formula_group) > 0:
            self.play(FadeOut(current_formula_group), run_time=0.20)
        current_formula_group = VGroup()
        step_formula_group = VGroup()
        block_nx = 0.810000
        block_ny = 0.450000
        block_nw = 0.300000
        block_nh = 0.080000
        block_x = -config.frame_width / 2 + block_nx * config.frame_width
        block_y = config.frame_height / 2 - block_ny * config.frame_height
        max_width = max(block_nw * config.frame_width - 0.30, 1.2)
        max_height = max(block_nh * config.frame_height - 0.10, 0.45)
        formula_obj = MathTex('S_{\\triangle ADC\'}=\\frac{1}{2}\\times AC\'\\times DC\'=\\frac{1}{2}\\times 4\\times 3=6\\,\\mathrm{cm}^2', font_size=32, color=YELLOW)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=1.00)
        current_formula_group = step_formula_group
        restore_anims = []
        restore_anims.append(lines['AC\''].animate.set_color(BLUE_E).set_stroke(width=3))
        restore_anims.append(lines['DC\''].animate.set_color(BLUE_E).set_stroke(width=3))
        self.play(*restore_anims, run_time=0.40)
        self.wait(9.46)

        # Step 7: 最终答案
        self.add_sound(r'output/audio/narration_007.mp3', time_offset=105.60)
        if len(current_formula_group) > 0:
            self.play(FadeOut(current_formula_group), run_time=0.20)
        current_formula_group = VGroup()
        step_formula_group = VGroup()
        block_nx = 0.750000
        block_ny = 0.100000
        block_nw = 0.350000
        block_nh = 0.100000
        block_x = -config.frame_width / 2 + block_nx * config.frame_width
        block_y = config.frame_height / 2 - block_ny * config.frame_height
        max_width = max(block_nw * config.frame_width - 0.30, 1.2)
        max_height = max(block_nh * config.frame_height - 0.10, 0.45)
        formula_obj = Text('答案：6 cm²', font_size=22, color=YELLOW, line_spacing=0.85)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=1.00)
        current_formula_group = step_formula_group
        self.wait(2.83)
