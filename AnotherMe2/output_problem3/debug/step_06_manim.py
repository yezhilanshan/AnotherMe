from manim import *
import math
import numpy as np

config.frame_height = 8.0
config.frame_width = 14.222
config.pixel_height = 1080
config.pixel_width = 1920

class PAbcdPbaPdaPabPcbProblem(Scene):
    def construct(self):
        self.camera.background_color = '#1a1a2e'

        # 对象注册表：同一几何元素在全流程复用
        points = {}
        point_labels = {}
        lines = {}
        objects = {}
        hidden_derived_points = []

        points['A'] = Dot(point=np.array([-2.895, 3.600, 0]), radius=0.05, color=WHITE)
        point_labels['A'] = Text('A', font_size=24, color=WHITE).next_to(points['A'], UP * 0.25)
        self.add(points['A'], point_labels['A'])
        points['B'] = Dot(point=np.array([0.705, 0.000, 0]), radius=0.05, color=WHITE)
        point_labels['B'] = Text('B', font_size=24, color=WHITE).next_to(points['B'], UP * 0.25)
        self.add(points['B'], point_labels['B'])
        points['C'] = Dot(point=np.array([-2.895, -3.600, 0]), radius=0.05, color=WHITE)
        point_labels['C'] = Text('C', font_size=24, color=WHITE).next_to(points['C'], UP * 0.25)
        self.add(points['C'], point_labels['C'])
        points['D'] = Dot(point=np.array([-6.495, 0.000, 0]), radius=0.05, color=WHITE)
        point_labels['D'] = Text('D', font_size=24, color=WHITE).next_to(points['D'], UP * 0.25)
        self.add(points['D'], point_labels['D'])
        points['P'] = Dot(point=np.array([-5.821, 2.250, 0]), radius=0.05, color=WHITE)
        point_labels['P'] = Text('P', font_size=24, color=WHITE).next_to(points['P'], UP * 0.25)
        self.add(points['P'], point_labels['P'])

        if 'A' in points and 'B' in points:
            lines['seg_AB'] = always_redraw(lambda p1='A', p2='B': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_AB'])
        if 'B' in points and 'C' in points:
            lines['seg_BC'] = always_redraw(lambda p1='B', p2='C': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_BC'])
        if 'C' in points and 'D' in points:
            lines['seg_CD'] = always_redraw(lambda p1='C', p2='D': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_CD'])
        if 'D' in points and 'A' in points:
            lines['seg_DA'] = always_redraw(lambda p1='D', p2='A': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_DA'])
        if 'P' in points and 'A' in points:
            lines['seg_PA'] = always_redraw(lambda p1='P', p2='A': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_PA'])
        if 'P' in points and 'B' in points:
            lines['seg_PB'] = always_redraw(lambda p1='P', p2='B': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_PB'])
        if 'P' in points and 'C' in points:
            lines['seg_PC'] = always_redraw(lambda p1='P', p2='C': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_PC'])
        if 'P' in points and 'D' in points:
            lines['seg_PD'] = always_redraw(lambda p1='P', p2='D': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_PD'])
        if all(k in points for k in ['A', 'B', 'C', 'D']):
            objects['poly_ABCD'] = always_redraw(lambda refs=['A', 'B', 'C', 'D']: Polygon(*[points[r].get_center() for r in refs], color=BLUE_E, stroke_width=3, fill_opacity=0.05))
            self.add(objects['poly_ABCD'])

        current_formula_group = VGroup()

        # Step 1: 题目分析与已知条件
        self.add_sound(r'output_problem3/audio/narration_001.mp3', time_offset=0.00)
        if len(current_formula_group) > 0:
            self.play(FadeOut(current_formula_group), run_time=0.20)
        current_formula_group = VGroup()
        step_formula_group = VGroup()
        block_nx = 0.810000
        block_ny = 0.120000
        block_nw = 0.300000
        block_nh = 0.080000
        block_x = -config.frame_width / 2 + block_nx * config.frame_width
        block_y = config.frame_height / 2 - block_ny * config.frame_height
        max_width = max(block_nw * config.frame_width - 0.30, 1.2)
        max_height = max(block_nh * config.frame_height - 0.10, 0.45)
        formula_obj = MathTex('\\angle PBA = \\angle PDA', font_size=28, color=YELLOW)
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
        formula_obj = Text('已知：ABCD 为平行四边形', font_size=28, color=YELLOW, line_spacing=0.85)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=0.60)
        current_formula_group = step_formula_group
        highlight_anims = []
        highlight_anims.append(points['P'].animate.set_color(YELLOW))
        highlight_anims.append(objects['poly_ABCD'].animate.set_color(YELLOW))
        self.play(*highlight_anims, run_time=0.80)
        self.wait(14.58)

        # Step 2: 辅助线构造：平移变换
        self.add_sound(r'output_problem3/audio/narration_002.mp3', time_offset=0.00)
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
        formula_obj = Text('向量 PQ = 向量 AD', font_size=28, color=YELLOW, line_spacing=0.85)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        block_nx = 0.810000
        block_ny = 0.450000
        block_nw = 0.300000
        block_nh = 0.080000
        block_x = -config.frame_width / 2 + block_nx * config.frame_width
        block_y = config.frame_height / 2 - block_ny * config.frame_height
        max_width = max(block_nw * config.frame_width - 0.30, 1.2)
        max_height = max(block_nh * config.frame_height - 0.10, 0.45)
        formula_obj = Text('构造：平移 △PAB 至 △QDC', font_size=28, color=YELLOW, line_spacing=0.85)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=0.60)
        current_formula_group = step_formula_group
        highlight_anims = []
        highlight_anims.append(points['P'].animate.set_color(YELLOW))
        highlight_anims.append(lines['seg_PA'].animate.set_color(YELLOW))
        highlight_anims.append(lines['seg_PB'].animate.set_color(YELLOW))
        self.play(*highlight_anims, run_time=0.80)
        self.wait(14.34)

        # Step 3: 证明四边形 PBCQ 为平行四边形
        self.add_sound(r'output_problem3/audio/narration_003.mp3', time_offset=0.00)
        if len(current_formula_group) > 0:
            self.play(FadeOut(current_formula_group), run_time=0.20)
        current_formula_group = VGroup()
        step_formula_group = VGroup()
        block_nx = 0.810000
        block_ny = 0.560000
        block_nw = 0.300000
        block_nh = 0.080000
        block_x = -config.frame_width / 2 + block_nx * config.frame_width
        block_y = config.frame_height / 2 - block_ny * config.frame_height
        max_width = max(block_nw * config.frame_width - 0.30, 1.2)
        max_height = max(block_nh * config.frame_height - 0.10, 0.45)
        formula_obj = MathTex('PQ \\parallel AD \\parallel BC', font_size=28, color=YELLOW)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        block_nx = 0.810000
        block_ny = 0.670000
        block_nw = 0.300000
        block_nh = 0.080000
        block_x = -config.frame_width / 2 + block_nx * config.frame_width
        block_y = config.frame_height / 2 - block_ny * config.frame_height
        max_width = max(block_nw * config.frame_width - 0.30, 1.2)
        max_height = max(block_nh * config.frame_height - 0.10, 0.45)
        formula_obj = MathTex('PQ = AD = BC', font_size=28, color=YELLOW)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        block_nx = 0.810000
        block_ny = 0.780000
        block_nw = 0.300000
        block_nh = 0.080000
        block_x = -config.frame_width / 2 + block_nx * config.frame_width
        block_y = config.frame_height / 2 - block_ny * config.frame_height
        max_width = max(block_nw * config.frame_width - 0.30, 1.2)
        max_height = max(block_nh * config.frame_height - 0.10, 0.45)
        formula_obj = Text('∴ 四边形 PBCQ 是平行四边形', font_size=28, color=YELLOW, line_spacing=0.85)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=0.60)
        current_formula_group = step_formula_group
        highlight_anims = []
        highlight_anims.append(lines['seg_BC'].animate.set_color(YELLOW))
        self.play(*highlight_anims, run_time=0.80)
        self.wait(12.01)

        # Step 4: 角度转换与推导
        self.add_sound(r'output_problem3/audio/narration_004.mp3', time_offset=0.00)
        if len(current_formula_group) > 0:
            self.play(FadeOut(current_formula_group), run_time=0.20)
        current_formula_group = VGroup()
        step_formula_group = VGroup()
        block_nx = 0.810000
        block_ny = 0.120000
        block_nw = 0.300000
        block_nh = 0.080000
        block_x = -config.frame_width / 2 + block_nx * config.frame_width
        block_y = config.frame_height / 2 - block_ny * config.frame_height
        max_width = max(block_nw * config.frame_width - 0.30, 1.2)
        max_height = max(block_nh * config.frame_height - 0.10, 0.45)
        formula_obj = Text('∠PAB = ∠QDC (平移性质)', font_size=28, color=YELLOW, line_spacing=0.85)
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
        formula_obj = MathTex('PC \\parallel QB', font_size=28, color=YELLOW)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=0.60)
        current_formula_group = step_formula_group
        highlight_anims = []
        highlight_anims.append(lines['seg_PC'].animate.set_color(YELLOW))
        self.play(*highlight_anims, run_time=0.80)
        self.wait(17.14)

        # Step 5: 得出结论
        self.add_sound(r'output_problem3/audio/narration_005.mp3', time_offset=0.00)
        if len(current_formula_group) > 0:
            self.play(FadeOut(current_formula_group), run_time=0.20)
        current_formula_group = VGroup()
        step_formula_group = VGroup()
        block_nx = 0.810000
        block_ny = 0.120000
        block_nw = 0.300000
        block_nh = 0.080000
        block_x = -config.frame_width / 2 + block_nx * config.frame_width
        block_y = config.frame_height / 2 - block_ny * config.frame_height
        max_width = max(block_nw * config.frame_width - 0.30, 1.2)
        max_height = max(block_nh * config.frame_height - 0.10, 0.45)
        formula_obj = MathTex('\\angle QDC = \\angle PCB', font_size=28, color=YELLOW)
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
        formula_obj = Text('∴ ∠PAB = ∠PCB', font_size=28, color=YELLOW, line_spacing=0.85)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=0.60)
        current_formula_group = step_formula_group
        highlight_anims = []
        highlight_anims.append(points['A'].animate.set_color(YELLOW))
        highlight_anims.append(points['B'].animate.set_color(YELLOW))
        highlight_anims.append(points['C'].animate.set_color(YELLOW))
        highlight_anims.append(points['P'].animate.set_color(YELLOW))
        highlight_anims.append(lines['seg_PC'].animate.set_color(YELLOW))
        highlight_anims.append(lines['seg_AB'].animate.set_color(YELLOW))
        highlight_anims.append(lines['seg_PA'].animate.set_color(YELLOW))
        highlight_anims.append(points['D'].animate.set_color(YELLOW))
        self.play(*highlight_anims, run_time=0.80)
        self.wait(10.06)

        # Step 6: 总结
        self.add_sound(r'output_problem3/audio/narration_006.mp3', time_offset=0.00)
        if len(current_formula_group) > 0:
            self.play(FadeOut(current_formula_group), run_time=0.20)
        current_formula_group = VGroup()
        step_formula_group = VGroup()
        block_nx = 0.810000
        block_ny = 0.120000
        block_nw = 0.300000
        block_nh = 0.080000
        block_x = -config.frame_width / 2 + block_nx * config.frame_width
        block_y = config.frame_height / 2 - block_ny * config.frame_height
        max_width = max(block_nw * config.frame_width - 0.30, 1.2)
        max_height = max(block_nh * config.frame_height - 0.10, 0.45)
        formula_obj = Text('解题关键：平移构造', font_size=28, color=YELLOW, line_spacing=0.85)
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
        formula_obj = Text('证毕', font_size=28, color=YELLOW, line_spacing=0.85)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=0.60)
        current_formula_group = step_formula_group
        highlight_anims = []
        highlight_anims.append(points['A'].animate.set_color(YELLOW))
        highlight_anims.append(points['D'].animate.set_color(YELLOW))
        highlight_anims.append(points['C'].animate.set_color(YELLOW))
        self.play(*highlight_anims, run_time=0.80)
        self.wait(15.99)
