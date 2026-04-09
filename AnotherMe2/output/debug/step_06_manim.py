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
        points = {}
        point_labels = {}
        lines = {}
        objects = {}

        points['A'] = Dot(point=np.array([-5.309, -3.402, 0]), radius=0.05, color=WHITE)
        point_labels['A'] = Text('A', font_size=24, color=WHITE).next_to(points['A'], UP * 0.25)
        self.add(points['A'], point_labels['A'])
        points['B'] = Dot(point=np.array([0.152, 1.080, 0]), radius=0.05, color=WHITE)
        point_labels['B'] = Text('B', font_size=24, color=WHITE).next_to(points['B'], UP * 0.25)
        self.add(points['B'], point_labels['B'])
        points['C'] = Dot(point=np.array([0.460, -3.024, 0]), radius=0.05, color=WHITE)
        point_labels['C'] = Text('C', font_size=24, color=WHITE).next_to(points['C'], UP * 0.25)
        self.add(points['C'], point_labels['C'])
        points['C\''] = Dot(point=np.array([-3.618, 0.481, 0]), radius=0.05, color=WHITE)
        point_labels['C\''] = Text('C\'', font_size=24, color=WHITE).next_to(points['C\''], UP * 0.25)
        self.add(points['C\''], point_labels['C\''])
        points['D'] = Dot(point=np.array([-1.699, -3.024, 0]), radius=0.05, color=WHITE)
        point_labels['D'] = Text('D', font_size=24, color=WHITE).next_to(points['D'], UP * 0.25)
        self.add(points['D'], point_labels['D'])

        if 'A' in points and 'B' in points:
            lines['AB'] = always_redraw(lambda p1='A', p2='B': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['AB'])
        if 'B' in points and 'C' in points:
            lines['BC'] = always_redraw(lambda p1='B', p2='C': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['BC'])
        if 'A' in points and 'C' in points:
            lines['AC'] = always_redraw(lambda p1='A', p2='C': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['AC'])
        if 'B' in points and 'D' in points:
            lines['BD'] = always_redraw(lambda p1='B', p2='D': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['BD'])
        if 'D' in points and 'C\'' in points:
            lines['DC\''] = always_redraw(lambda p1='D', p2='C\'': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['DC\''])
        if 'A' in points and 'C\'' in points:
            lines['AC\''] = always_redraw(lambda p1='A', p2='C\'': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['AC\''])
        if 'B' in points and 'C\'' in points:
            lines['BC\''] = always_redraw(lambda p1='B', p2='C\'': Line(points[p1].get_center(), points[p2].get_center(), color=BLUE_E, stroke_width=3))
            self.add(lines['BC\''])

        if all(k in points for k in ['A', 'B', 'C']):
            objects['triangle_ABC'] = always_redraw(lambda refs=['A', 'B', 'C']: Polygon(*[points[r].get_center() for r in refs], color=BLUE, stroke_width=3, fill_opacity=0.05))
            self.add(objects['triangle_ABC'])
        if all(k in points for k in ['B', 'C', 'D']):
            objects['triangle_BCD'] = always_redraw(lambda refs=['B', 'C', 'D']: Polygon(*[points[r].get_center() for r in refs], color=BLUE, stroke_width=3, fill_opacity=0.05))
            self.add(objects['triangle_BCD'])
        if all(k in points for k in ['A', 'D', "C\\'"]):
            objects['triangle_ADC\''] = always_redraw(lambda refs=['A', 'D', "C\\'"]: Polygon(*[points[r].get_center() for r in refs], color=BLUE, stroke_width=3, fill_opacity=0.05))
            self.add(objects['triangle_ADC\''])
        if all(k in points for k in ['B', "C\\'", 'D']):
            objects['triangle_BC\'D'] = always_redraw(lambda refs=['B', "C\\'", 'D']: Polygon(*[points[r].get_center() for r in refs], color=BLUE, stroke_width=3, fill_opacity=0.05))
            self.add(objects['triangle_BC\'D'])

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
        temp_labels.add(Text('AB', font_size=24, color=GREEN).next_to(lines['AB'], UP * 0.25))
        temp_labels.add(Text('AC', font_size=24, color=GREEN).next_to(lines['AC'], UP * 0.25))
        temp_labels.add(Text('BC', font_size=24, color=GREEN).next_to(lines['BC'], UP * 0.25))
        temp_labels.add(Text('BD', font_size=24, color=GREEN).next_to(lines['BD'], UP * 0.25))
        temp_labels.add(Text('C', font_size=24, color=GREEN).next_to(points['C'], UP * 0.25))
        temp_labels.add(Text('C\'', font_size=24, color=GREEN).next_to(points['C\''], UP * 0.25))
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
        formula_obj = Text('△BCD沿BD折叠，C对应AB上的C\'点 ，求S△ADC\'', font_size=22, color=YELLOW, line_spacing=0.85)
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

        # Step 2: 利用勾股定理求AB长
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
        formula_obj = MathTex('AB=\\sqrt{AC^2+BC^2}=\\sqrt{8^2+6^2}=\\sqrt{100}=10\\,\\mathrm{cm}', font_size=30, color=YELLOW)
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

        # Step 3: 利用折叠性质推导AC\'长度
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
        temp_labels.add(Text('AB', font_size=24, color=GREEN).next_to(lines['AB'], UP * 0.25))
        temp_labels.add(Text('AC', font_size=24, color=GREEN).next_to(lines['AC'], UP * 0.25))
        temp_labels.add(Text('AC\'', font_size=24, color=GREEN).next_to(lines['AC\''], UP * 0.25))
        temp_labels.add(Text('BC', font_size=24, color=GREEN).next_to(lines['BC'], UP * 0.25))
        temp_labels.add(Text('BC\'', font_size=24, color=GREEN).next_to(lines['BC\''], UP * 0.25))
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
        formula_obj = MathTex('AC\'=AB-BC\'=10-6=4\\,\\mathrm{cm}', font_size=30, color=YELLOW)
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
        formula_obj = Text('折叠性质：BC\'=BC=6cm', font_size=22, color=YELLOW, line_spacing=0.85)
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

        # Step 4: 设未知数列勾股方程
        self.add_sound(r'output/audio/narration_004.mp3', time_offset=47.50)
        highlight_anims = []
        highlight_anims.append(lines['AC'].animate.set_color(YELLOW))
        highlight_anims.append(lines['AC\''].animate.set_color(YELLOW))
        highlight_anims.append(points['C'].animate.set_color(YELLOW))
        highlight_anims.append(points['D'].animate.set_color(YELLOW))
        highlight_anims.append(lines['DC\''].animate.set_color(YELLOW))
        self.play(*highlight_anims, run_time=0.80)
        transform_anims = []
        transform_anims.append(lines['AC'].animate.set_color(ORANGE))
        transform_anims.append(lines['AC\''].animate.set_color(ORANGE))
        transform_anims.append(points['C'].animate.scale(1.05).set_color(ORANGE))
        transform_anims.append(points['D'].animate.scale(1.05).set_color(ORANGE))
        transform_anims.append(lines['DC\''].animate.set_color(ORANGE))
        self.play(*transform_anims, run_time=0.90)
        temp_labels = VGroup()
        temp_labels.add(Text('AC', font_size=24, color=GREEN).next_to(lines['AC'], UP * 0.25))
        temp_labels.add(Text('AC\'', font_size=24, color=GREEN).next_to(lines['AC\''], UP * 0.25))
        temp_labels.add(Text('C', font_size=24, color=GREEN).next_to(points['C'], UP * 0.25))
        temp_labels.add(Text('D', font_size=24, color=GREEN).next_to(points['D'], UP * 0.25))
        temp_labels.add(Text('DC\'', font_size=24, color=GREEN).next_to(lines['DC\''], UP * 0.25))
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
        formula_obj = Text('Rt△ADC\'中：(8-x)²=4² +  x²', font_size=22, color=YELLOW, line_spacing=0.85)
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
        formula_obj = Text('设DC=x cm，则DC\'=x cm，A D=(8-x)cm', font_size=22, color=YELLOW, line_spacing=0.85)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=1.00)
        current_formula_group = step_formula_group
        restore_anims = []
        restore_anims.append(lines['AC'].animate.set_color(BLUE_E).set_stroke(width=3))
        restore_anims.append(lines['AC\''].animate.set_color(BLUE_E).set_stroke(width=3))
        restore_anims.append(points['C'].animate.set_color(WHITE))
        restore_anims.append(points['D'].animate.set_color(WHITE))
        restore_anims.append(lines['DC\''].animate.set_color(BLUE_E).set_stroke(width=3))
        self.play(*restore_anims, run_time=0.40)
        self.wait(24.84)

        # Step 5: 解方程求DC长度
        self.add_sound(r'output/audio/narration_005.mp3', time_offset=76.63)
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
        formula_obj = MathTex('64-16x+x^2=16+x^2 → 16x=48 → x=3', font_size=30, color=YELLOW)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=1.00)
        current_formula_group = step_formula_group
        self.wait(15.91)

        # Step 6: 计算△ADC\'的面积
        self.add_sound(r'output/audio/narration_006.mp3', time_offset=93.74)
        highlight_anims = []
        highlight_anims.append(lines['AC'].animate.set_color(YELLOW))
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
        formula_obj = MathTex('S\\triangle ADC\'=½\\times AC\'\\times DC\'=½\\times 4\\times 3=6\\,\\mathrm{cm}^2', font_size=30, color=YELLOW)
        formula_obj.scale_to_fit_width(min(formula_obj.width, max_width))
        if formula_obj.height > max_height:
            formula_obj.scale_to_fit_height(max_height)
        formula_obj.move_to(np.array([block_x, block_y, 0]))
        step_formula_group.add(formula_obj)
        self.play(FadeIn(step_formula_group), run_time=1.00)
        current_formula_group = step_formula_group
        restore_anims = []
        restore_anims.append(lines['AC'].animate.set_color(BLUE_E).set_stroke(width=3))
        restore_anims.append(lines['AC\''].animate.set_color(BLUE_E).set_stroke(width=3))
        restore_anims.append(lines['DC\''].animate.set_color(BLUE_E).set_stroke(width=3))
        self.play(*restore_anims, run_time=0.40)
        self.wait(9.46)
