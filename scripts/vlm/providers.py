"""
VLM provider abstraction for run_extraction_v0.py
"""
from __future__ import annotations
from abc import ABC, abstractmethod
import json
from pathlib import Path
import re
from typing import Any

from scripts.vlm.qwen_openai_client_v1 import call_qwen_openai_v1

class RetryableError(Exception):
    """Error that should trigger retry with backoff."""
    pass

class VLMProvider(ABC):
    name: str = "base"
    model: str = "unknown"
    
    @abstractmethod
    def generate(self, image_path: Path) -> dict:
        pass

class MockProvider(VLMProvider):
    """Mock provider for testing - generates deterministic output."""
    name = "mock"
    model = "mock-v1"
    
    def generate(self, image_path: Path) -> dict:
        stem = image_path.stem
        q_number, subpart = None, None
        m = re.match(r"^q(\d{1,2})([a-z])?(?:_([ivx]+))?$", stem, re.I)
        if m:
            q_number = int(m.group(1))
            if m.group(2):
                subpart = m.group(2).lower()
                if m.group(3):
                    subpart += f"_{m.group(3).lower()}"
        return {
            "question_type": "calculation",
            "math_expressions_latex": [r"\int_0^1 x^2 dx"],
            "variables": ["x", "y"],
            "units": ["m", "s"],
            "diagram_elements": [],
            "q_number": q_number,
            "subpart": subpart,
            "answer_form": "exact",
            "confidence": 0.85,
            "summary": f"Mock extraction for {stem}",
        }


class WindowsHostQwenProvider(VLMProvider):
    """Qwen provider that sends requests through the Windows host wrapper."""

    name = "windows-qwen"

    def __init__(
        self,
        model: str = "qwen3.6-plus",
        lane: str | None = None,
        prompt_template_id: str | None = None,
        prompt_template_version: str = "v1",
    ):
        self.model = model
        self.lane = lane
        self.prompt_template_id = prompt_template_id
        self.prompt_template_version = prompt_template_version

    def generate(self, image_path: Path) -> dict:
        response = call_qwen_openai_v1({
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": self._build_prompt_text(),
                        },
                        {
                            "type": "image_path",
                            "image_path": str(image_path),
                        },
                    ],
                }
            ],
            "max_tokens": self._max_tokens(),
            "temperature": 0,
            "enable_thinking": False,
            "response_format": {"type": "json_object"},
        })
        raw_content = response["choices"][0]["message"]["content"]
        try:
            parsed = json.loads(raw_content)
        except json.JSONDecodeError as error:
            raise ValueError(
                "Windows-host Qwen provider did not return a valid JSON object"
            ) from error
        if not isinstance(parsed, dict):
            raise ValueError("Windows-host Qwen provider did not return a valid JSON object")
        return self._normalize_result(parsed)

    def _build_prompt_text(self) -> str:
        if self.lane == "ocr":
            return (
                "Return a single JSON object only. "
                "This is an OCR and document-surface extraction task. "
                "Do not infer topic, syllabus, or solution steps. "
                "Include keys ocr_text, formula_latex_list, subquestion_blocks, layout_hints, ocr_confidence. "
                "Use the exact visible text for ocr_text. "
                "Use arrays for list-like fields and a number for ocr_confidence. "
                "Keep ocr_text concise but complete enough to preserve the question stem and subparts. "
                "If a field is not visible, return an empty string only for ocr_text and otherwise return [] or 0. "
                "Do not include markdown fences or explanation."
            )
        if self.lane == "diagram":
            return (
                "Return a single JSON object only. "
                "This is a diagram and spatial extraction task. "
                "Do not infer topic, syllabus, or solution steps. "
                "Include keys diagram_present, diagram_type, diagram_elements, axes_labels, "
                "curve_point_annotations, shape_relations, object_grounding, spatial_evidence, diagram_confidence. "
                "Use false for diagram_present when no meaningful diagram is visible. "
                "Use [] for list fields, an empty string for diagram_type when unknown, and 0 for diagram_confidence. "
                "Do not include markdown fences or explanation."
            )
        if self.lane == "review":
            return (
                "Return a single JSON object only. "
                "This is a multimodal extraction-plus-review task. "
                "Do not assign final topic, syllabus, or answer. "
                "First extract visible evidence, then report whether downstream review is still needed. "
                "Include keys ocr_text, formula_latex_list, subquestion_blocks, layout_hints, "
                "diagram_present, diagram_elements, spatial_evidence, "
                "requires_review, review_reasons, ambiguity_flags, review_summary, review_confidence. "
                "Use the exact visible text for ocr_text. "
                "Use null for diagram_present when the image is too ambiguous to decide. "
                "Set requires_review true only when the image has visual ambiguity, legibility risk, diagram complexity, "
                "or layout issues that likely need downstream review. "
                "Use [] for list fields, an empty string for ocr_text/review_summary when nothing useful can be said, and 0 for review_confidence. "
                "Do not include markdown fences or explanation."
            )
        return (
            "Return a single JSON object only. "
            "Include keys question_type, math_expressions_latex, variables, "
            "units, diagram_elements, answer_form, confidence, summary. "
            "Do not include any markdown fences or explanation."
        )

    def _normalize_result(self, parsed: dict[str, Any]) -> dict[str, Any]:
        if self.lane == "ocr":
            return {
                "ocr_text": _normalize_text(parsed.get("ocr_text")),
                "formula_latex_list": _normalize_string_list(parsed.get("formula_latex_list")),
                "subquestion_blocks": _normalize_string_list(parsed.get("subquestion_blocks")),
                "layout_hints": _normalize_string_list(parsed.get("layout_hints")),
                "symbol_inventory": _normalize_string_list(parsed.get("symbol_inventory")),
                "table_blocks": _normalize_object_list(parsed.get("table_blocks")),
                "line_boxes": _normalize_object_list(parsed.get("line_boxes")),
                "ocr_confidence": _normalize_float(parsed.get("ocr_confidence")),
            }
        if self.lane == "diagram":
            return {
                "diagram_present": _normalize_bool(parsed.get("diagram_present")),
                "diagram_type": _normalize_text(parsed.get("diagram_type")),
                "diagram_elements": _normalize_string_list(parsed.get("diagram_elements")),
                "axes_labels": _normalize_string_list(parsed.get("axes_labels")),
                "curve_point_annotations": _normalize_string_list(parsed.get("curve_point_annotations")),
                "shape_relations": _normalize_string_list(parsed.get("shape_relations")),
                "object_grounding": _normalize_object_list(parsed.get("object_grounding")),
                "spatial_evidence": _normalize_string_list(parsed.get("spatial_evidence")),
                "diagram_confidence": _normalize_float(parsed.get("diagram_confidence")),
            }
        if self.lane == "review":
            return {
                "ocr_text": _normalize_text(parsed.get("ocr_text")),
                "formula_latex_list": _normalize_string_list(parsed.get("formula_latex_list")),
                "subquestion_blocks": _normalize_string_list(parsed.get("subquestion_blocks")),
                "layout_hints": _normalize_string_list(parsed.get("layout_hints")),
                "diagram_present": _normalize_nullable_bool(parsed.get("diagram_present")),
                "diagram_elements": _normalize_string_list(parsed.get("diagram_elements")),
                "spatial_evidence": _normalize_string_list(parsed.get("spatial_evidence")),
                "requires_review": _normalize_bool(parsed.get("requires_review")),
                "review_reasons": _normalize_string_list(parsed.get("review_reasons")),
                "ambiguity_flags": _normalize_string_list(parsed.get("ambiguity_flags")),
                "review_summary": _normalize_text(parsed.get("review_summary")),
                "review_confidence": _normalize_float(parsed.get("review_confidence")),
            }
        return parsed

    def _max_tokens(self) -> int:
        if self.lane in {"ocr", "review"}:
            return 768
        return 512


def _normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        parts = [str(item).strip() for item in value if str(item).strip()]
        return "\n".join(parts)
    return str(value).strip()


def _normalize_string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        stripped = value.strip()
        return [stripped] if stripped else []
    if not isinstance(value, list):
        return []
    out: list[str] = []
    for item in value:
        if item is None:
            continue
        stripped = str(item).strip()
        if stripped:
            out.append(stripped)
    return out


def _normalize_object_list(value: Any) -> list[dict[str, Any]]:
    if value is None:
        return []
    if isinstance(value, dict):
        return [value]
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def _normalize_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes", "y"}:
            return True
        if lowered in {"false", "0", "no", "n", ""}:
            return False
    return False


def _normalize_nullable_bool(value: Any) -> bool | None:
    if value is None:
        return None
    if isinstance(value, str) and not value.strip():
        return None
    if isinstance(value, str) and value.strip().lower() == "null":
        return None
    return _normalize_bool(value)


def _normalize_float(value: Any) -> float:
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return 0.0


def get_provider(
    name: str,
    model: str = None,
    lane: str | None = None,
    prompt_template_id: str | None = None,
    prompt_template_version: str = "v1",
) -> VLMProvider:
    """Get provider by name. Use 'mock' for testing, 'auto' falls back to mock."""
    if name in ("mock", "auto"):
        return MockProvider()
    if name == "windows-qwen":
        return WindowsHostQwenProvider(
            model=model or "qwen3.6-plus",
            lane=lane,
            prompt_template_id=prompt_template_id,
            prompt_template_version=prompt_template_version,
        )
    raise ValueError(f"Unknown provider: {name}. Available: mock, auto, windows-qwen")
