from manim import *
import numpy as np

config.frame_height = 8.0
config.frame_width = 14.222
config.pixel_height = 1080
config.pixel_width = 1920

class Scene1RtAbcC90CircBc6CmAc8CmBcdBdCAbCAdcCm22AbcC90CircDAcBdBcdBd(Scene):
    def construct(self):
        self.camera.background_color = '#1a1a2e'

        # 对象注册表：同一几何元素在全流程复用
        points = {}
        point_labels = {}
        lines = {}
        objects = {}

        points['C'] = Dot(point=np.array([-6.711, -2.862, 0]), radius=0.05, color=WHITE)
        point_labels['C'] = Text('C', font_size=24, color=WHITE).next_to(points['C'], UP * 0.25)
        self.add(points['C'], point_labels['C'])
        points['B'] = Dot(point=np.array([-6.711, 2.862, 0]), radius=0.05, color=WHITE)
        point_labels['B'] = Text('B', font_size=24, color=WHITE).next_to(points['B'], UP * 0.25)
        self.add(points['B'], point_labels['B'])
        points['A'] = Dot(point=np.array([0.920, -2.862, 0]), radius=0.05, color=WHITE)
        point_labels['A'] = Text('A', font_size=24, color=WHITE).next_to(points['A'], UP * 0.25)
        self.add(points['A'], point_labels['A'])
        points['D'] = Dot(point=np.array([-3.849, -2.862, 0]), radius=0.05, color=WHITE)
        point_labels['D'] = Text('D', font_size=24, color=WHITE).next_to(points['D'], UP * 0.25)
        self.add(points['D'], point_labels['D'])
        points['C1'] = Dot(point=np.array([-6.711, -2.862, 0]), radius=0.05, color=WHITE)
        point_labels['C1'] = Text('C1', font_size=24, color=WHITE).next_to(points['C1'], UP * 0.25)
        self.add(points['C1'], point_labels['C1'])

        if 'A' in points and 'B' in points:
            lines['seg_AB'] = always_redraw(lambda p1='A', p2='B': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_AB'])
        if 'B' in points and 'C' in points:
            lines['seg_BC'] = always_redraw(lambda p1='B', p2='C': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_BC'])
        if 'A' in points and 'C' in points:
            lines['seg_AC'] = always_redraw(lambda p1='A', p2='C': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_AC'])
        if 'B' in points and 'D' in points:
            lines['seg_BD'] = always_redraw(lambda p1='B', p2='D': Line(points[p1].get_center(), points[p2].get_center(), color=GRAY, stroke_width=3))
            self.add(lines['seg_BD'])
        if 'B' in points and 'C1' in points:
            lines['seg_BC1'] = always_redraw(lambda p1='B', p2='C1': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_BC1'])
        if 'D' in points and 'C1' in points:
            lines['seg_DC1'] = always_redraw(lambda p1='D', p2='C1': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['seg_DC1'])
        if all(k in points for k in ['A', 'B', 'C']):
            objects['poly_ABC'] = always_redraw(lambda refs=['A', 'B', 'C']: Polygon(*[points[r].get_center() for r in refs], color=ORANGE, stroke_width=3, fill_opacity=0.12))
            self.add(objects['poly_ABC'])
        if all(k in points for k in ['A', 'D', 'C1']):
            objects['poly_ADC1'] = always_redraw(lambda refs=['A', 'D', 'C1']: Polygon(*[points[r].get_center() for r in refs], color=RED, stroke_width=3, fill_opacity=0.30))
            self.add(objects['poly_ADC1'])
        if 'A' in points and 'C' in points and 'B' in points:
            objects['right_C'] = always_redraw(lambda p1='A', v='C', p2='B': RightAngle(Line(points[v].get_center(), points[p1].get_center()), Line(points[v].get_center(), points[p2].get_center()), length=0.28, color=BLUE_E))
            self.add(objects['right_C'])
        if 'D' in points and 'C1' in points and 'B' in points:
            objects['ang_C1'] = always_redraw(lambda p1='D', v='C1', p2='B': Angle(Line(points[v].get_center(), points[p1].get_center()), Line(points[v].get_center(), points[p2].get_center()), radius=0.42, color=BLUE_E))
            self.add(objects['ang_C1'])

        current_formula_group = VGroup()

        # Step 1: 读题明确已知与所求
        self.add_sound(r'output/audio/narration_001.mp3', time_offset=0.00)
        highlight_anims = []
        highlight_anims.append(points['C'].animate.set_color(YELLOW))
        self.play(*highlight_anims, run_time=0.80)
        transform_anims = []
        transform_anims.append(points['C'].animate.scale(1.05).set_color(ORANGE))
        self.play(*transform_anims, run_time=0.90)
        temp_labels = VGroup()
        temp_labels.add(Text('C', font_size=24, color=GREEN).next_to(points['C'], UP * 0.25))
        if len(temp_labels) > 0:
            self.play(FadeIn(temp_labels), run_time=0.60)
            self.play(FadeOut(temp_labels), run_time=0.40)
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
        formula_obj = Text('已知：Rt△ABC，∠C=90°，BC= 6cm，AC=8cm', font_size=22, color=YELLOW, line_spacing=0.85)
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
        formula_obj = Text('目标：求△ADC\'的面积', font_size=22, color=YELLOW, line_spacing=0.85)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=1.00)
        current_formula_group = step_formula_group
        restore_anims = []
        restore_anims.append(points['C'].animate.set_color(WHITE))
        self.play(*restore_anims, run_time=0.40)
        self.wait(16.84)
