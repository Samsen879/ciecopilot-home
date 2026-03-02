"""Tests for parse_response() in batch_process_v0.py.

Verifies JSON parsing (direct + code block extraction), default value
application, job metadata copying, and quality-based status assignment.

**Validates: Requirements 4.1, 4.2, 4.3**
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

# Ensure the project root is on sys.path so the import works
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.batch_process_v0 import parse_response


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _job(**kwargs) -> dict:
    """Return a job dict with sensible defaults, overridden by kwargs."""
    defaults = {
        "job_id": "test-001",
        "storage_key": "9709/s23/q01.png",
        "sha256": "abc123def456",
        "syllabus_code": "9709",
        "session": "s",
        "year": 2023,
        "doc_type": "qp",
        "paper": 1,
        "variant": 2,
        "q_number": 3,
        "subpart": "a",
        "extractor_version": "v0",
        "provider": "dashscope",
        "model": "qwen3-vl-flash",
        "prompt_version": "v1",
    }
    defaults.update(kwargs)
    return defaults


def _valid_vlm_output(**kwargs) -> dict:
    """Return a complete valid VLM output dict, overridden by kwargs."""
    defaults = {
        "question_type": "calculation",
        "math_expressions_latex": ["x^2 + 2x + 1 = 0"],
        "variables": ["x"],
        "units": ["m"],
        "diagram_elements": [],
        "answer_form": "exact",
        "confidence": 0.85,
        "summary": "Solve the quadratic equation for x",
    }
    defaults.update(kwargs)
    return defaults


# ---------------------------------------------------------------------------
# Test 1: Valid JSON string → returns dict with all fields
# ---------------------------------------------------------------------------

class TestValidJsonParsing:
    """Req 4.1: Try direct JSON parse first."""

    def test_valid_json_returns_dict(self):
        vlm_output = _valid_vlm_output()
        raw_text = json.dumps(vlm_output)
        result = parse_response(raw_text, _job())
        assert result is not None
        assert isinstance(result, dict)

    def test_valid_json_preserves_values(self):
        vlm_output = _valid_vlm_output(
            question_type="calculation",
            confidence=0.85,
            summary="Solve the quadratic equation for x",
        )
        raw_text = json.dumps(vlm_output)
        result = parse_response(raw_text, _job())
        assert result["question_type"] == "calculation"
        assert result["confidence"] == 0.85
        assert result["summary"] == "Solve the quadratic equation for x"

    def test_valid_json_all_vlm_fields_present(self):
        vlm_output = _valid_vlm_output()
        raw_text = json.dumps(vlm_output)
        result = parse_response(raw_text, _job())
        for key in ("question_type", "math_expressions_latex", "variables",
                     "units", "diagram_elements", "answer_form",
                     "confidence", "summary"):
            assert key in result


# ---------------------------------------------------------------------------
# Test 2: JSON in markdown code block → extracts and parses
# ---------------------------------------------------------------------------

class TestCodeBlockExtraction:
    """Req 4.1: If direct parse fails, try extracting from markdown code block."""

    def test_json_code_block_with_lang_tag(self):
        vlm_output = _valid_vlm_output()
        raw_text = f"Here is the result:\n```json\n{json.dumps(vlm_output)}\n```"
        result = parse_response(raw_text, _job())
        assert result is not None
        assert result["question_type"] == "calculation"

    def test_json_code_block_without_lang_tag(self):
        vlm_output = _valid_vlm_output()
        raw_text = f"Result:\n```\n{json.dumps(vlm_output)}\n```"
        result = parse_response(raw_text, _job())
        assert result is not None
        assert result["question_type"] == "calculation"

    def test_code_block_with_surrounding_text(self):
        vlm_output = _valid_vlm_output(summary="Find the area")
        raw_text = (
            "I analyzed the image and here is the structured output:\n\n"
            f"```json\n{json.dumps(vlm_output)}\n```\n\n"
            "Let me know if you need anything else."
        )
        result = parse_response(raw_text, _job())
        assert result is not None
        assert result["summary"] == "Find the area"


# ---------------------------------------------------------------------------
# Test 3: Invalid JSON → returns None
# ---------------------------------------------------------------------------

class TestInvalidJsonReturnsNone:
    """Req 4.3: When JSON parse completely fails → return None."""

    def test_garbage_text_returns_none(self):
        result = parse_response("this is not json at all", _job())
        assert result is None

    def test_partial_json_returns_none(self):
        result = parse_response('{"question_type": "calc', _job())
        assert result is None

    def test_invalid_code_block_returns_none(self):
        result = parse_response("```json\nnot valid json\n```", _job())
        assert result is None

    def test_json_array_returns_none(self):
        """A JSON array is not a valid VLM output dict."""
        result = parse_response('[1, 2, 3]', _job())
        assert result is None


# ---------------------------------------------------------------------------
# Test 4: Missing required fields → confidence=0.3, status=needs_review
# ---------------------------------------------------------------------------

class TestMissingFieldsNeedsReview:
    """Req 4.2: When JSON parsed but missing required fields → needs_review."""

    def test_empty_json_object_needs_review(self):
        """Empty JSON object → defaults to question_type='other', summary=None → needs_review."""
        result = parse_response("{}", _job())
        assert result is not None
        assert result["confidence"] == 0.3
        assert result["status"] == "needs_review"

    def test_missing_summary_and_type_other(self):
        vlm_output = {"question_type": "other"}
        result = parse_response(json.dumps(vlm_output), _job())
        assert result["confidence"] == 0.3
        assert result["status"] == "needs_review"

    def test_empty_summary_and_type_other(self):
        vlm_output = {"question_type": "other", "summary": ""}
        result = parse_response(json.dumps(vlm_output), _job())
        assert result["confidence"] == 0.3
        assert result["status"] == "needs_review"

    def test_whitespace_only_summary_and_type_other(self):
        vlm_output = {"question_type": "other", "summary": "   "}
        result = parse_response(json.dumps(vlm_output), _job())
        assert result["confidence"] == 0.3
        assert result["status"] == "needs_review"


# ---------------------------------------------------------------------------
# Test 5: Complete valid response → status=ok
# ---------------------------------------------------------------------------

class TestCompleteResponseStatusOk:
    """Complete valid response with strong quality signals → status=ok."""

    def test_full_response_status_ok(self):
        vlm_output = _valid_vlm_output()
        result = parse_response(json.dumps(vlm_output), _job())
        assert result["status"] == "ok"

    def test_type_other_with_summary_is_needs_review(self):
        """question_type=other should still be flagged for review."""
        vlm_output = _valid_vlm_output(
            question_type="other",
            summary="Describe the motion of the particle",
        )
        result = parse_response(json.dumps(vlm_output), _job())
        assert result["status"] == "needs_review"
        assert result["confidence"] == 0.3
        assert "question_type_other" in result["review_reasons"]

    def test_no_summary_but_non_other_type_is_needs_review(self):
        """summary missing should still be flagged even for a specific type."""
        vlm_output = {"question_type": "calculation", "answer_form": "exact"}
        result = parse_response(json.dumps(vlm_output), _job())
        assert result["status"] == "needs_review"
        assert result["confidence"] == 0.3
        assert result["review_reasons"] == ["summary_missing"]

    def test_confidence_preserved_when_ok(self):
        vlm_output = _valid_vlm_output(confidence=0.92)
        result = parse_response(json.dumps(vlm_output), _job())
        assert result["confidence"] == 0.92
        assert result["status"] == "ok"


# ---------------------------------------------------------------------------
# Test 6: Empty string → returns None
# ---------------------------------------------------------------------------

class TestEmptyInput:
    """Edge case: empty or None-like inputs."""

    def test_empty_string_returns_none(self):
        result = parse_response("", _job())
        assert result is None

    def test_whitespace_only_returns_none(self):
        result = parse_response("   \n\t  ", _job())
        assert result is None


# ---------------------------------------------------------------------------
# Test 7: Job metadata is copied to result
# ---------------------------------------------------------------------------

class TestJobMetadataCopied:
    """Job metadata fields are copied into the result dict."""

    def test_all_job_metadata_fields_copied(self):
        job = _job()
        vlm_output = _valid_vlm_output()
        result = parse_response(json.dumps(vlm_output), job)

        assert result["storage_key"] == "9709/s23/q01.png"
        assert result["sha256"] == "abc123def456"
        assert result["syllabus_code"] == "9709"
        assert result["session"] == "s"
        assert result["year"] == 2023
        assert result["doc_type"] == "qp"
        assert result["paper"] == 1
        assert result["variant"] == 2
        assert result["q_number"] == 3
        assert result["subpart"] == "a"
        assert result["extractor_version"] == "v0"
        assert result["provider"] == "dashscope"
        assert result["model"] == "qwen3-vl-flash"
        assert result["prompt_version"] == "v1"

    def test_job_metadata_with_different_values(self):
        job = _job(
            storage_key="9702/w22/q05.png",
            syllabus_code="9702",
            paper=2,
            q_number=5,
        )
        vlm_output = _valid_vlm_output()
        result = parse_response(json.dumps(vlm_output), job)
        assert result["storage_key"] == "9702/w22/q05.png"
        assert result["syllabus_code"] == "9702"
        assert result["paper"] == 2
        assert result["q_number"] == 5

    def test_missing_job_field_not_copied(self):
        """If a job field is missing, it should not appear in result."""
        job = {"job_id": "test-001"}  # minimal job, missing most fields
        vlm_output = _valid_vlm_output()
        result = parse_response(json.dumps(vlm_output), job)
        assert "storage_key" not in result
        assert "sha256" not in result


# ---------------------------------------------------------------------------
# Test 8: Default values are applied for missing optional fields
# ---------------------------------------------------------------------------

class TestDefaultValues:
    """Missing VLM output fields get default values."""

    def test_missing_question_type_defaults_to_other(self):
        vlm_output = {"summary": "Find the value of x", "confidence": 0.8}
        result = parse_response(json.dumps(vlm_output), _job())
        assert result["question_type"] == "other"

    def test_missing_math_expressions_defaults_to_empty_list(self):
        vlm_output = _valid_vlm_output()
        del vlm_output["math_expressions_latex"]
        result = parse_response(json.dumps(vlm_output), _job())
        assert result["math_expressions_latex"] == []

    def test_missing_variables_defaults_to_empty_list(self):
        vlm_output = _valid_vlm_output()
        del vlm_output["variables"]
        result = parse_response(json.dumps(vlm_output), _job())
        assert result["variables"] == []

    def test_missing_units_defaults_to_empty_list(self):
        vlm_output = _valid_vlm_output()
        del vlm_output["units"]
        result = parse_response(json.dumps(vlm_output), _job())
        assert result["units"] == []

    def test_missing_diagram_elements_defaults_to_empty_list(self):
        vlm_output = _valid_vlm_output()
        del vlm_output["diagram_elements"]
        result = parse_response(json.dumps(vlm_output), _job())
        assert result["diagram_elements"] == []

    def test_missing_answer_form_defaults_to_other(self):
        vlm_output = _valid_vlm_output()
        del vlm_output["answer_form"]
        result = parse_response(json.dumps(vlm_output), _job())
        assert result["answer_form"] == "other"

    def test_missing_confidence_defaults_to_0_5(self):
        vlm_output = _valid_vlm_output()
        del vlm_output["confidence"]
        result = parse_response(json.dumps(vlm_output), _job())
        # confidence default is 0.5, but if summary is present and type is not "other",
        # status should be "ok" and confidence stays at default
        assert result["confidence"] == 0.5

    def test_missing_summary_defaults_to_none(self):
        vlm_output = _valid_vlm_output()
        del vlm_output["summary"]
        result = parse_response(json.dumps(vlm_output), _job())
        assert result["summary"] is None
        assert result["status"] == "needs_review"
        assert result["confidence"] == 0.3

    def test_default_lists_are_independent_copies(self):
        """Each call should get independent list copies, not shared references."""
        result1 = parse_response(json.dumps({"summary": "test", "question_type": "calculation"}), _job())
        result2 = parse_response(json.dumps({"summary": "test", "question_type": "calculation"}), _job())
        result1["variables"].append("x")
        assert result2["variables"] == []
