from manim import *
import math
import numpy as np

config.frame_height = 8.0
config.frame_width = 14.222
config.pixel_height = 1080
config.pixel_width = 1920

class Abp60PqPbqPqcApb150Problem(Scene):
    def construct(self):
        self.camera.background_color = '#1a1a2e'

        # 对象注册表：同一几何元素在全流程复用
        points = {}
        point_labels = {}
        lines = {}
        objects = {}
        hidden_derived_points = []

        points['A'] = Dot(point=np.array([-3.843, 3.600, 0]), radius=0.05, color=WHITE)
        point_labels['A'] = Text('A', font_size=24, color=WHITE).move_to(np.array([-3.843, 3.880, 0]))
        self.add(points['A'], point_labels['A'])
        points['B'] = Dot(point=np.array([-6.053, -0.821, 0]), radius=0.05, color=WHITE)
        point_labels['B'] = Text('B', font_size=24, color=WHITE).move_to(np.array([-6.293, -0.721, 0]))
        self.add(points['B'], point_labels['B'])
        points['C'] = Dot(point=np.array([0.262, -0.821, 0]), radius=0.05, color=WHITE)
        point_labels['C'] = Text('C', font_size=24, color=WHITE).move_to(np.array([0.262, -0.541, 0]))
        self.add(points['C'], point_labels['C'])
        points['P'] = Dot(point=np.array([-3.388, 1.478, 0]), radius=0.05, color=WHITE)
        point_labels['P'] = Text('P', font_size=24, color=WHITE).move_to(np.array([-3.628, 1.578, 0]))
        self.add(points['P'], point_labels['P'])
        points['Q'] = Dot(point=np.array([-2.300, -3.600, 0]), radius=0.05, color=WHITE)
        point_labels['Q'] = Text('Q', font_size=24, color=WHITE).move_to(np.array([-2.300, -3.900, 0]))
        self.add(points['Q'], point_labels['Q'])

        if 'A' in points and 'B' in points:
            lines['seg_AB'] = always_redraw(lambda p1='A', p2='B': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3.00))
            self.add(lines['seg_AB'])
        if 'B' in points and 'P' in points:
            lines['seg_BP'] = always_redraw(lambda p1='B', p2='P': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3.00))
            self.add(lines['seg_BP'])
        if 'P' in points and 'A' in points:
            lines['seg_PA'] = always_redraw(lambda p1='P', p2='A': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3.00))
            self.add(lines['seg_PA'])
        if 'P' in points and 'Q' in points:
            lines['seg_PQ'] = always_redraw(lambda p1='P', p2='Q': DashedLine(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3.00))
            self.add(lines['seg_PQ'])
        if 'Q' in points and 'B' in points:
            lines['seg_QB'] = always_redraw(lambda p1='Q', p2='B': DashedLine(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3.00))
            self.add(lines['seg_QB'])
        if 'Q' in points and 'C' in points:
            lines['seg_QC'] = always_redraw(lambda p1='Q', p2='C': DashedLine(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3.00))
            self.add(lines['seg_QC'])
        if 'B' in points and 'C' in points:
            lines['seg_BC'] = always_redraw(lambda p1='B', p2='C': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3.00))
            self.add(lines['seg_BC'])
        if all(k in points for k in ['A', 'B', 'P']):
            objects['poly_ABP'] = always_redraw(lambda refs=['A', 'B', 'P']: Polygon(*[points[r].get_center() for r in refs], color=BLUE_E, stroke_width=3, fill_opacity=0.05))
            self.add(objects['poly_ABP'])
        if all(k in points for k in ['P', 'B', 'Q']):
            objects['poly_PBQ'] = always_redraw(lambda refs=['P', 'B', 'Q']: Polygon(*[points[r].get_center() for r in refs], color=BLUE_E, stroke_width=3, fill_opacity=0.05))
            self.add(objects['poly_PBQ'])
        if all(k in points for k in ['P', 'Q', 'C']):
            objects['poly_PQC'] = always_redraw(lambda refs=['P', 'Q', 'C']: Polygon(*[points[r].get_center() for r in refs], color=BLUE_E, stroke_width=3, fill_opacity=0.05))
            self.add(objects['poly_PQC'])
        if 'C' in points and 'P' in points:
            lines['seg_CP'] = always_redraw(lambda p1='C', p2='P': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3.00))
            self.add(lines['seg_CP'])
        if all(k in points for k in ['A', 'B', 'C']):
            objects['poly_ABC'] = always_redraw(lambda refs=['A', 'B', 'C']: Polygon(*[points[r].get_center() for r in refs], color=BLUE_E, stroke_width=3, fill_opacity=0.05))
            self.add(objects['poly_ABC'])
        if 'A' in points and 'C' in points:
            lines['seg_AC'] = always_redraw(lambda p1='A', p2='C': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3.00))
            self.add(lines['seg_AC'])

        current_formula_group = VGroup()

        # Step 1: 题目分析
        self.add_sound(r'output_problem4/audio/narration_001.mp3', time_offset=0.00)
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
        formula_obj = Text('求：∠APB 的度数', font_size=28, color=YELLOW, line_spacing=0.85)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=0.60)
        current_formula_group = step_formula_group
        highlight_anims = []
        highlight_anims.append(points['P'].animate.set_color(YELLOW))
        highlight_anims.append(objects['poly_ABC'].animate.set_color(YELLOW))
        self.play(*highlight_anims, run_time=0.80)
        self.wait(5.02)
