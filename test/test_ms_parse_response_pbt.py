"""Property-based tests for parse_ms_response() in ms_prompt.py.

# Feature: ms-rubric-extraction, Property 6: 响应解析完整性

Uses hypothesis to verify:
- For ANY valid rubric points JSON (with or without markdown code block wrapping),
  parse_ms_response extracts all required fields (mark_label, description, marks,
  depends_on_labels, ft_mode), and the result is equivalent to parsing bare JSON.

**Validates: Requirements 2.2, 2.3**
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.ms_prompt import parse_ms_response

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_TEST_JOB = {
    "job_id": "pbt-ms-001",
    "storage_key": "9709/s23/ms_q01.png",
    "sha256": "deadbeef",
    "syllabus_code": "9709",
    "session": "s",
    "year": 2023,
    "paper": 1,
    "variant": 2,
    "q_number": 3,
    "subpart": "a",
    "extractor_version": "v1",
    "provider": "dashscope",
    "model": "qwen-vl-max",
    "prompt_version": "ms_v1",
}

_REQUIRED_FIELDS = {"mark_label", "description", "marks", "depends_on_labels", "ft_mode"}

_ALL_OUTPUT_FIELDS = {
    "mark_label", "description", "marks", "depends_on_labels",
    "ft_mode", "expected_answer_latex", "confidence", "confidence_source",
}

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

_mark_labels = st.sampled_from(["M1", "A1", "B1", "M2", "A2", "B2", "M3", "A3", "B3"])
_ft_modes = st.sampled_from(["none", "follow_through", "carried_accuracy"])
_dep_labels = st.lists(st.sampled_from(["M1", "A1", "B1"]), max_size=3)


@st.composite
def rubric_point(draw):
    """Generate a single valid rubric point dict."""
    return {
        "mark_label": draw(_mark_labels),
        "description": draw(st.text(min_size=5, max_size=100)),
        "marks": draw(st.integers(min_value=1, max_value=10)),
        "depends_on_labels": draw(_dep_labels),
        "ft_mode": draw(_ft_modes),
        "expected_answer_latex": draw(st.one_of(st.none(), st.text(min_size=1, max_size=50))),
        "confidence": draw(st.floats(min_value=0.0, max_value=1.0)),
    }


@st.composite
def rubric_points_list(draw):
    """Generate a non-empty list of valid rubric points."""
    return draw(st.lists(rubric_point(), min_size=1, max_size=5))


# ---------------------------------------------------------------------------
# Property 6: 响应解析完整性
# ---------------------------------------------------------------------------


class TestProperty6ResponseParseCompleteness:
    """
    **Property 6**: For ANY valid rubric points JSON (with or without
    markdown code block wrapping), parse_ms_response extracts all required
    fields (mark_label, description, marks, depends_on_labels, ft_mode),
    and the result from code-block wrapped JSON is equivalent to parsing
    bare JSON.

    **Validates: Requirements 2.2, 2.3**
    """

    @given(points=rubric_points_list())
    @settings(max_examples=100)
    def test_bare_json_extracts_all_required_fields(self, points: list[dict]):
        """Bare JSON object with rubric_points always extracts all required fields."""
        raw_text = json.dumps({"rubric_points": points})
        result = parse_ms_response(raw_text, _TEST_JOB)

        assert result is not None, f"parse_ms_response returned None for valid JSON"
        assert len(result) == len(points), (
            f"Expected {len(points)} points, got {len(result)}"
        )

        for i, parsed_pt in enumerate(result):
            for field in _REQUIRED_FIELDS:
                assert field in parsed_pt, (
                    f"Missing required field '{field}' in point {i}"
                )

    @given(points=rubric_points_list())
    @settings(max_examples=100)
    def test_bare_json_extracts_all_output_fields(self, points: list[dict]):
        """Bare JSON always produces points with all output fields."""
        raw_text = json.dumps({"rubric_points": points})
        result = parse_ms_response(raw_text, _TEST_JOB)

        assert result is not None
        for i, parsed_pt in enumerate(result):
            for field in _ALL_OUTPUT_FIELDS:
                assert field in parsed_pt, (
                    f"Missing output field '{field}' in point {i}"
                )

    @given(points=rubric_points_list())
    @settings(max_examples=100)
    def test_code_block_wrapped_json_equivalent_to_bare(self, points: list[dict]):
        """Markdown code-block wrapped JSON produces the same result as bare JSON."""
        payload = json.dumps({"rubric_points": points})

        bare_result = parse_ms_response(payload, _TEST_JOB)
        wrapped_text = f"```json\n{payload}\n```"
        wrapped_result = parse_ms_response(wrapped_text, _TEST_JOB)

        assert bare_result is not None
        assert wrapped_result is not None
        assert len(bare_result) == len(wrapped_result), (
            f"Length mismatch: bare={len(bare_result)}, wrapped={len(wrapped_result)}"
        )

        for i, (bare_pt, wrapped_pt) in enumerate(zip(bare_result, wrapped_result)):
            for field in _REQUIRED_FIELDS:
                assert bare_pt[field] == wrapped_pt[field], (
                    f"Field '{field}' mismatch at point {i}: "
                    f"bare={bare_pt[field]!r}, wrapped={wrapped_pt[field]!r}"
                )

    @given(points=rubric_points_list())
    @settings(max_examples=100)
    def test_code_block_without_lang_tag_equivalent(self, points: list[dict]):
        """Code block without 'json' language tag also parses equivalently."""
        payload = json.dumps({"rubric_points": points})

        bare_result = parse_ms_response(payload, _TEST_JOB)
        wrapped_text = f"```\n{payload}\n```"
        wrapped_result = parse_ms_response(wrapped_text, _TEST_JOB)

        assert bare_result is not None
        assert wrapped_result is not None
        assert len(bare_result) == len(wrapped_result)

        for i, (bare_pt, wrapped_pt) in enumerate(zip(bare_result, wrapped_result)):
            for field in _REQUIRED_FIELDS:
                assert bare_pt[field] == wrapped_pt[field]

    @given(points=rubric_points_list())
    @settings(max_examples=100)
    def test_mark_label_normalised_to_uppercase(self, points: list[dict]):
        """mark_label is always stripped and uppercased in output."""
        raw_text = json.dumps({"rubric_points": points})
        result = parse_ms_response(raw_text, _TEST_JOB)

        assert result is not None
        for i, parsed_pt in enumerate(result):
            label = parsed_pt["mark_label"]
            assert label == label.strip().upper(), (
                f"mark_label not normalised at point {i}: {label!r}"
            )

    @given(points=rubric_points_list())
    @settings(max_examples=100)
    def test_ft_mode_always_valid_enum(self, points: list[dict]):
        """ft_mode is always one of the valid enum values."""
        valid_ft = {"none", "follow_through", "carried_accuracy", "unknown"}
        raw_text = json.dumps({"rubric_points": points})
        result = parse_ms_response(raw_text, _TEST_JOB)

        assert result is not None
        for i, parsed_pt in enumerate(result):
            assert parsed_pt["ft_mode"] in valid_ft, (
                f"Invalid ft_mode at point {i}: {parsed_pt['ft_mode']!r}"
            )

    @given(points=rubric_points_list())
    @settings(max_examples=100)
    def test_confidence_in_valid_range(self, points: list[dict]):
        """confidence is always in [0.0, 1.0] range."""
        raw_text = json.dumps({"rubric_points": points})
        result = parse_ms_response(raw_text, _TEST_JOB)

        assert result is not None
        for i, parsed_pt in enumerate(result):
            conf = parsed_pt["confidence"]
            assert 0.0 <= conf <= 1.0, (
                f"confidence out of range at point {i}: {conf}"
            )

    @given(points=rubric_points_list())
    @settings(max_examples=100)
    def test_confidence_source_set_correctly(self, points: list[dict]):
        """confidence_source is 'model' when confidence provided, 'heuristic' otherwise."""
        raw_text = json.dumps({"rubric_points": points})
        result = parse_ms_response(raw_text, _TEST_JOB)

        assert result is not None
        for i, (orig, parsed_pt) in enumerate(zip(points, result)):
            if orig.get("confidence") is not None:
                assert parsed_pt["confidence_source"] == "model", (
                    f"Expected 'model' at point {i} since confidence was provided"
                )
            else:
                assert parsed_pt["confidence_source"] == "heuristic", (
                    f"Expected 'heuristic' at point {i} since confidence was missing"
                )

    @given(points=rubric_points_list())
    @settings(max_examples=100)
    def test_bare_array_also_parsed(self, points: list[dict]):
        """A bare JSON array (without rubric_points wrapper) is also accepted."""
        raw_text = json.dumps(points)
        result = parse_ms_response(raw_text, _TEST_JOB)

        assert result is not None, "parse_ms_response returned None for bare array"
        assert len(result) == len(points)

        for i, parsed_pt in enumerate(result):
            for field in _REQUIRED_FIELDS:
                assert field in parsed_pt
