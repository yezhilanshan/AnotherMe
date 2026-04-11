from manim import *
import math
import numpy as np

config.frame_height = 8.0
config.frame_width = 14.222
config.pixel_height = 1080
config.pixel_width = 1920

class Scene132021AbODCAcbAcBe1AE2Bc3Be5CeProblem(Scene):
    def construct(self):
        self.camera.background_color = '#1a1a2e'

        # 对象注册表：同一几何元素在全流程复用
        points = {}
        point_labels = {}
        lines = {}
        objects = {}
        hidden_derived_points = []

        points['A'] = Dot(point=np.array([-6.711, -1.588, 0]), radius=0.05, color=WHITE)
        point_labels['A'] = Text('A', font_size=24, color=WHITE).next_to(points['A'], UP * 0.25)
        self.add(points['A'], point_labels['A'])
        points['B'] = Dot(point=np.array([-4.143, 1.759, 0]), radius=0.05, color=WHITE)
        point_labels['B'] = Text('B', font_size=24, color=WHITE).next_to(points['B'], UP * 0.25)
        self.add(points['B'], point_labels['B'])
        points['C'] = Dot(point=np.array([-2.486, -0.843, 0]), radius=0.05, color=WHITE)
        point_labels['C'] = Text('C', font_size=24, color=WHITE).next_to(points['C'], UP * 0.25)
        self.add(points['C'], point_labels['C'])
        points['D'] = Dot(point=np.array([-4.143, -2.652, 0]), radius=0.05, color=WHITE)
        point_labels['D'] = Text('D', font_size=24, color=WHITE).next_to(points['D'], UP * 0.25)
        self.add(points['D'], point_labels['D'])
        points['E'] = Dot(point=np.array([0.920, 2.652, 0]), radius=0.05, color=WHITE)
        point_labels['E'] = Text('E', font_size=24, color=WHITE).next_to(points['E'], UP * 0.25)
        self.add(points['E'], point_labels['E'])
        points['O'] = Dot(point=np.array([-4.734, -0.446, 0]), radius=0.05, color=WHITE)
        point_labels['O'] = Text('O', font_size=24, color=WHITE).next_to(points['O'], UP * 0.25)
        self.add(points['O'], point_labels['O'])

        if 'A' in points and 'B' in points:
            lines['seg_AB'] = always_redraw(lambda p1='A', p2='B': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_AB'])
        if 'A' in points and 'C' in points:
            lines['seg_AC'] = always_redraw(lambda p1='A', p2='C': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_AC'])
        if 'B' in points and 'C' in points:
            lines['seg_BC'] = always_redraw(lambda p1='B', p2='C': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_BC'])
        if 'B' in points and 'E' in points:
            lines['seg_BE'] = always_redraw(lambda p1='B', p2='E': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_BE'])
        if 'C' in points and 'E' in points:
            lines['seg_CE'] = always_redraw(lambda p1='C', p2='E': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_CE'])
        if 'A' in points and 'D' in points:
            lines['seg_AD'] = always_redraw(lambda p1='A', p2='D': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_AD'])
        if 'B' in points and 'D' in points:
            lines['seg_BD'] = always_redraw(lambda p1='B', p2='D': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_BD'])
        if 'C' in points and 'D' in points:
            lines['seg_CD'] = always_redraw(lambda p1='C', p2='D': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_CD'])
        if all(k in points for k in ['A', 'B', 'C']):
            objects['poly_ABC'] = always_redraw(lambda refs=['A', 'B', 'C']: Polygon(*[points[r].get_center() for r in refs], color=BLUE_E, stroke_width=3, fill_opacity=0.05))
            self.add(objects['poly_ABC'])
        if all(k in points for k in ['B', 'C', 'E']):
            objects['poly_BCE'] = always_redraw(lambda refs=['B', 'C', 'E']: Polygon(*[points[r].get_center() for r in refs], color=BLUE_E, stroke_width=3, fill_opacity=0.05))
            self.add(objects['poly_BCE'])
        if 'O' in points and 'A' in points:
            objects['circle_O'] = always_redraw(lambda c='O', r='A': Circle(radius=np.linalg.norm(points[r].get_center() - points[c].get_center()), color=BLUE_E, stroke_width=3, fill_opacity=0.05).move_to(points[c].get_center()))
            self.add(objects['circle_O'])
        if 'O' in points and 'A' in points and 'B' in points:
            objects['arc_AB'] = always_redraw(lambda c='O', s='A', e='B': Arc(radius=np.linalg.norm(points[s].get_center() - points[c].get_center()), start_angle=np.arctan2((points[s].get_center()-points[c].get_center())[1], (points[s].get_center()-points[c].get_center())[0]), angle=((np.arctan2((points[e].get_center()-points[c].get_center())[1], (points[e].get_center()-points[c].get_center())[0]) - np.arctan2((points[s].get_center()-points[c].get_center())[1], (points[s].get_center()-points[c].get_center())[0]) + 2*np.pi) % (2*np.pi)), color=BLUE_E).move_arc_center_to(points[c].get_center()))
            self.add(objects['arc_AB'])

        current_formula_group = VGroup()

        # Step 1: 分析已知条件
        self.add_sound(r'output_problem2/audio/narration_001.mp3', time_offset=0.00)
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
        formula_obj = Text('弧 AD = 弧 DC = 弧 CB', font_size=28, color=YELLOW, line_spacing=0.85)
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
        formula_obj = Text('AC ∥ BE', font_size=28, color=YELLOW, line_spacing=0.85)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=0.60)
        current_formula_group = step_formula_group
        highlight_anims = []
        highlight_anims.append(points['C'].animate.set_color(YELLOW))
        highlight_anims.append(points['D'].animate.set_color(YELLOW))
        highlight_anims.append(objects['circle_O'].animate.set_color(YELLOW))
        highlight_anims.append(lines['seg_AC'].animate.set_color(YELLOW))
        highlight_anims.append(lines['seg_AD'].animate.set_color(YELLOW))
        highlight_anims.append(lines['seg_BE'].animate.set_color(YELLOW))
        self.play(*highlight_anims, run_time=0.80)
        self.wait(12.97)
