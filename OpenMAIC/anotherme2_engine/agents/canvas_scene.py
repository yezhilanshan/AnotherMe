from dataclasses import dataclass, asdict
from typing import Dict, List, Optional


@dataclass
class CanvasElement:
    id: str
    kind: str
    content: str
    area: str
    x: float
    y: float
    width: float
    height: float
    order: int = 0
    visible: bool = True


class FormulaLayoutManager:
    """管理右侧公式区布局，避免公式互相覆盖。"""

    def __init__(self, formula_area: List[float], vertical_gap: float = 0.03):
        self.formula_area = formula_area
        self.vertical_gap = vertical_gap

    def place_formula(
        self,
        existing_elements: List[CanvasElement],
        element_id: str,
        content: str,
        preferred_height: float = 0.08,
    ) -> CanvasElement:
        left, top, right, bottom = self.formula_area
        used_bottom = top
        formula_elements = [e for e in existing_elements if e.area == "formula" and e.visible]
        if formula_elements:
            used_bottom = max(e.y + e.height for e in formula_elements) + self.vertical_gap

        height = min(preferred_height, max(bottom - used_bottom, 0.06))
        if used_bottom + height > bottom:
            raise ValueError("公式区空间不足，请清空旧公式或减少显示内容")

        return CanvasElement(
            id=element_id,
            kind="formula",
            content=content,
            area="formula",
            x=left,
            y=used_bottom,
            width=right - left,
            height=height,
            order=len(formula_elements),
        )


class CanvasScene:
    """用于几何区/公式区布局管理，并输出稳定布局快照。"""

    def __init__(self):
        self.elements: Dict[str, CanvasElement] = {}
        self.geometry_area = [0.02, 0.05, 0.58, 0.95]
        self.formula_area = [0.66, 0.08, 0.96, 0.92]
        self.formula_layout = FormulaLayoutManager(self.formula_area)

    def add_element(self, element: CanvasElement) -> None:
        self.elements[element.id] = element

    def delete_element(self, element_id: str) -> None:
        if element_id in self.elements:
            del self.elements[element_id]

    def clear_formula_elements(self) -> None:
        for element_id in [e.id for e in self.elements.values() if e.area == "formula"]:
            del self.elements[element_id]

    def reserve_formula_block(
        self,
        element_id: str,
        content: str,
        preferred_height: float = 0.08,
    ) -> CanvasElement:
        element = self.formula_layout.place_formula(
            existing_elements=list(self.elements.values()),
            element_id=element_id,
            content=content,
            preferred_height=preferred_height,
        )
        self.add_element(element)
        return element

    def reserve_step_formula_blocks(
        self,
        step_id: int,
        formula_items: List[str],
        reset_formula_area: bool = False,
    ) -> List[CanvasElement]:
        """为每个步骤预留公式区块，避免后续更新公式时位置变化导致的视觉跳动。"""
        if reset_formula_area:
            self.clear_formula_elements()

        elements: List[CanvasElement] = []
        for index, item in enumerate(formula_items, start=1):
            safe_item = item.strip() or f"step_{step_id}_formula_{index}"
            element_id = f"step_{step_id}_formula_{index}"
            elements.append(self.reserve_formula_block(element_id, safe_item))
        return elements

    def get_layout_snapshot(self) -> Dict[str, object]:
        """返回当前布局快照，供动画渲染使用。"""
        return {
            "geometry_area": self.geometry_area,
            "formula_area": self.formula_area,
            "elements": [asdict(element) for element in self.elements.values()],
        }

    def get_formula_snapshot(self) -> List[Dict[str, object]]:
        return [
            asdict(element)
            for element in self.elements.values()
            if element.area == "formula"
        ]
