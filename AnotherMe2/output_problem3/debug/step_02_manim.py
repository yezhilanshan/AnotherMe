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

        points['A'] = Dot(point=np.array([-4.781, -3.600, 0]), radius=0.05, color=WHITE)
        point_labels['A'] = Text('A', font_size=24, color=WHITE).next_to(points['A'], UP * 0.25)
        self.add(points['A'], point_labels['A'])
        points['B'] = Dot(point=np.array([-6.495, 3.600, 0]), radius=0.05, color=WHITE)
        point_labels['B'] = Text('B', font_size=24, color=WHITE).next_to(points['B'], UP * 0.25)
        self.add(points['B'], point_labels['B'])
        points['C'] = Dot(point=np.array([-1.010, 3.600, 0]), radius=0.05, color=WHITE)
        point_labels['C'] = Text('C', font_size=24, color=WHITE).next_to(points['C'], UP * 0.25)
        self.add(points['C'], point_labels['C'])
        points['D'] = Dot(point=np.array([0.705, -3.600, 0]), radius=0.05, color=WHITE)
        point_labels['D'] = Text('D', font_size=24, color=WHITE).next_to(points['D'], UP * 0.25)
        self.add(points['D'], point_labels['D'])
        points['P'] = Dot(point=np.array([-3.423, -1.008, 0]), radius=0.05, color=WHITE)
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
        if 'A' in points and 'P' in points:
            lines['seg_AP'] = always_redraw(lambda p1='A', p2='P': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_AP'])
        if 'B' in points and 'P' in points:
            lines['seg_BP'] = always_redraw(lambda p1='B', p2='P': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_BP'])
        if 'C' in points and 'P' in points:
            lines['seg_CP'] = always_redraw(lambda p1='C', p2='P': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_CP'])
        if 'D' in points and 'P' in points:
            lines['seg_DP'] = always_redraw(lambda p1='D', p2='P': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_DP'])
        if all(k in points for k in ['A', 'B', 'C', 'D']):
            objects['poly_ABCD'] = always_redraw(lambda refs=['A', 'B', 'C', 'D']: Polygon(*[points[r].get_center() for r in refs], color=BLUE_E, stroke_width=3, fill_opacity=0.05))
            self.add(objects['poly_ABCD'])

        current_formula_group = VGroup()

        # Step 1: 题目分析
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
        formula_obj = Text('已知：∠PBA = ∠PDA', font_size=28, color=YELLOW, line_spacing=0.85)
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
        formula_obj = Text('求证：∠PAB = ∠PCB', font_size=28, color=YELLOW, line_spacing=0.85)
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
        temp_labels = VGroup()
        temp_labels.add(Text('P', font_size=24, color=GREEN).next_to(points['P'], UP * 0.25))
        if len(temp_labels) > 0:
            self.play(FadeIn(temp_labels), run_time=0.60)
            self.play(FadeOut(temp_labels), run_time=0.40)
        restore_anims = []
        restore_anims.append(points['P'].animate.set_color(WHITE))
        restore_anims.append(objects['poly_ABCD'].animate.set_color(BLUE))
        self.play(*restore_anims, run_time=0.40)
        self.wait(8.02)

        # Step 2: 构造辅助图形
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
        formula_obj = Text('△ABP ≌ △DCQ', font_size=28, color=YELLOW, line_spacing=0.85)
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
        highlight_anims.append(points['D'].animate.set_color(YELLOW))
        self.play(*highlight_anims, run_time=0.80)
        self.wait(11.26)
