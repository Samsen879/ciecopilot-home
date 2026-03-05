"""Property-based tests for parse_response() in batch_process_v0.py.

Uses hypothesis to verify:
- Property 5: Valid JSON subsets always produce valid output with correct status
- Property 6: Non-JSON strings always return None

**Validates: Requirements 3.3, 4.1, 8.1, 8.2**
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# Ensure the project root is on sys.path so the import works
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.batch_process_v0 import (
    _VLM_DEFAULTS,
    _normalize_answer_form,
    _normalize_question_type,
    _normalize_summary,
    parse_response,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_TEST_JOB = {
    "job_id": "pbt-001",
    "storage_key": "9709/s23/q01.png",
    "sha256": "abc123",
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

# All required output fields that must be present in a successful parse
_REQUIRED_OUTPUT_FIELDS = {
    "question_type",
    "math_expressions_latex",
    "variables",
    "units",
    "diagram_elements",
    "answer_form",
    "confidence",
    "summary",
    "status",
}

# Job metadata fields that should be copied into the result
_JOB_COPY_FIELDS = (
    "storage_key", "sha256", "syllabus_code", "session", "year",
    "doc_type", "paper", "variant", "q_number", "subpart",
    "extractor_version", "provider", "model", "prompt_version",
)

# ---------------------------------------------------------------------------
# Strategies for Property 5
# ---------------------------------------------------------------------------

# Individual field strategies for VLM output
_vlm_fields = {
    "question_type": st.sampled_from([
        "calculation", "proof", "graph", "definition", "multiple_choice", "other",
    ]),
    "math_expressions_latex": st.lists(
        st.text(min_size=1, max_size=30), max_size=5,
    ),
    "variables": st.lists(
        st.from_regex(r"[a-zA-Z]", fullmatch=True), max_size=5,
    ),
    "units": st.lists(
        st.sampled_from(["m", "s", "kg", "N", "J", "W", "Pa"]), max_size=5,
    ),
    "diagram_elements": st.lists(
        st.text(min_size=1, max_size=30), max_size=3,
    ),
    "answer_form": st.sampled_from([
        "exact", "approx", "proof", "graph", "table", "other",
    ]),
    "confidence": st.floats(min_value=0.0, max_value=1.0),
    "summary": st.one_of(st.none(), st.text(min_size=0, max_size=120)),
}


@st.composite
def vlm_field_subsets(draw):
    """Generate a random subset of VLM output fields with random values.

    Each field is independently included or excluded, producing dicts
    ranging from empty {} to fully populated.
    """
    result = {}
    for field_name, strategy in _vlm_fields.items():
        include = draw(st.booleans())
        if include:
            result[field_name] = draw(strategy)
    return result


# ---------------------------------------------------------------------------
# Strategies for Property 6
# ---------------------------------------------------------------------------

# Generate text that is NOT valid JSON and does NOT contain code blocks with JSON
_non_json_text_st = st.text(min_size=1, max_size=200).filter(
    lambda t: _is_non_json(t)
)


def _is_non_json(text: str) -> bool:
    """Return True if text cannot be parsed as JSON (directly or via code block)."""
    # Reject if direct JSON parse succeeds as a dict
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return False
    except (json.JSONDecodeError, TypeError, ValueError):
        pass

    # Reject if it contains a code block with valid JSON dict inside
    import re
    code_block_re = re.compile(r"```(?:json)?\s*\n(.*?)\n\s*```", re.DOTALL)
    match = code_block_re.search(text)
    if match:
        try:
            parsed = json.loads(match.group(1))
            if isinstance(parsed, dict):
                return False
        except (json.JSONDecodeError, TypeError, ValueError):
            pass

    return True


# ---------------------------------------------------------------------------
# Property 5: Valid JSON subsets always produce valid output with correct status
# ---------------------------------------------------------------------------

class TestProperty5ValidJsonSubsetsProduceValidOutput:
    """
    **Property 5**: For ANY random subset of valid VLM output fields
    serialized as JSON, parse_response ALWAYS:
    - Returns a non-None dict
    - Contains all required output fields
    - Sets status="needs_review" whenever summary is missing, question_type
      normalizes to ``other``, or answer_form normalizes to ``other``
    - Applies the same confidence clamping logic as the parser
    - Sets status="ok" otherwise

    **Validates: Requirements 3.3, 4.1, 8.1, 8.2**
    """

    @staticmethod
    def _expected_quality(fields: dict) -> tuple[list[str], float]:
        """Mirror the parser's normalization and review rules."""
        question_type, _ = _normalize_question_type(
            fields.get("question_type", _VLM_DEFAULTS["question_type"])
        )
        answer_form, _ = _normalize_answer_form(
            fields.get("answer_form", _VLM_DEFAULTS["answer_form"]),
            question_type,
        )
        summary, _ = _normalize_summary(fields.get("summary", _VLM_DEFAULTS["summary"]))

        try:
            confidence = float(fields.get("confidence", _VLM_DEFAULTS["confidence"]))
        except Exception:
            confidence = 0.3
        confidence = min(1.0, max(0.0, confidence))

        review_reasons = []
        if summary is None or (isinstance(summary, str) and summary.strip() == ""):
            review_reasons.append("summary_missing")
        if question_type == "other":
            review_reasons.append("question_type_other")
        if answer_form == "other":
            review_reasons.append("answer_form_other")

        if review_reasons:
            confidence = min(confidence, 0.3)

        return review_reasons, confidence

    @given(fields=vlm_field_subsets())
    @settings(max_examples=300)
    def test_all_required_fields_present(self, fields: dict):
        """Any valid JSON dict subset always produces output with all required fields."""
        raw_text = json.dumps(fields)
        result = parse_response(raw_text, _TEST_JOB)

        assert result is not None, (
            f"parse_response returned None for valid JSON: {raw_text}"
        )
        assert isinstance(result, dict)

        for field_name in _REQUIRED_OUTPUT_FIELDS:
            assert field_name in result, (
                f"Missing required field '{field_name}' in result for input: {fields}"
            )

    @given(fields=vlm_field_subsets())
    @settings(max_examples=300)
    def test_job_metadata_always_copied(self, fields: dict):
        """Job metadata fields are always copied into the result."""
        raw_text = json.dumps(fields)
        result = parse_response(raw_text, _TEST_JOB)

        assert result is not None
        for key in _JOB_COPY_FIELDS:
            assert key in result, f"Missing job metadata field '{key}'"
            assert result[key] == _TEST_JOB[key], (
                f"Job field '{key}' mismatch: expected {_TEST_JOB[key]}, got {result[key]}"
            )

    @given(fields=vlm_field_subsets())
    @settings(max_examples=300)
    def test_needs_review_when_quality_signals_missing(self, fields: dict):
        """Any normalized review signal should force needs_review."""
        raw_text = json.dumps(fields)
        result = parse_response(raw_text, _TEST_JOB)
        assert result is not None

        review_reasons, expected_confidence = self._expected_quality(fields)
        if review_reasons:
            assert result["status"] == "needs_review", (
                f"Expected 'needs_review' for fields={fields!r}, "
                f"got status={result['status']!r}"
            )
            assert result["confidence"] == expected_confidence, (
                f"Expected confidence={expected_confidence} for fields={fields!r}, "
                f"got {result['confidence']}"
            )

    @given(fields=vlm_field_subsets())
    @settings(max_examples=300)
    def test_status_ok_when_no_review_reasons(self, fields: dict):
        """Status is ok only when no review reason survives normalization."""
        raw_text = json.dumps(fields)
        result = parse_response(raw_text, _TEST_JOB)
        assert result is not None

        review_reasons, _ = self._expected_quality(fields)
        if not review_reasons:
            assert result["status"] == "ok", (
                f"Expected 'ok' for fields={fields!r}, got status={result['status']!r}"
            )

    @given(fields=vlm_field_subsets())
    @settings(max_examples=300)
    def test_status_is_always_ok_or_needs_review(self, fields: dict):
        """Status is always exactly one of 'ok' or 'needs_review'."""
        raw_text = json.dumps(fields)
        result = parse_response(raw_text, _TEST_JOB)
        assert result is not None
        assert result["status"] in {"ok", "needs_review"}, (
            f"Unexpected status '{result['status']}' for input: {fields}"
        )


# ---------------------------------------------------------------------------
# Property 6: Non-JSON strings always return None
# ---------------------------------------------------------------------------

class TestProperty6NonJsonAlwaysReturnsNone:
    """
    **Property 6**: For ANY string that is NOT valid JSON (and does not
    contain a code block with valid JSON), parse_response ALWAYS returns None.

    **Validates: Requirements 3.3, 4.1, 8.1, 8.2**
    """

    @given(text=_non_json_text_st)
    @settings(max_examples=300)
    def test_non_json_returns_none(self, text: str):
        """Non-JSON text always produces None."""
        result = parse_response(text, _TEST_JOB)
        assert result is None, (
            f"Expected None for non-JSON input, got {result!r} for text={text!r}"
        )

    @given(text=st.text(
        alphabet="abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+;:',.<>?/\n\t",
        min_size=1,
        max_size=200,
    ).filter(lambda t: not t.strip().startswith("{") and "```" not in t))
    @settings(max_examples=300)
    def test_plaintext_without_braces_returns_none(self, text: str):
        """Plain text not starting with '{' and without code blocks returns None."""
        result = parse_response(text, _TEST_JOB)
        assert result is None, (
            f"Expected None for plain text, got {result!r} for text={text!r}"
        )

    def test_empty_string_returns_none(self):
        """Empty string always returns None."""
        result = parse_response("", _TEST_JOB)
        assert result is None
    @staticmethod
    def _expected_quality(fields: dict) -> tuple[list[str], float]:
        """Mirror the parser's normalization and review rules."""
        question_type, _ = _normalize_question_type(
            fields.get("question_type", _VLM_DEFAULTS["question_type"])
        )
        answer_form, _ = _normalize_answer_form(
            fields.get("answer_form", _VLM_DEFAULTS["answer_form"]),
            question_type,
        )
        summary, _ = _normalize_summary(fields.get("summary", _VLM_DEFAULTS["summary"]))

        try:
            confidence = float(fields.get("confidence", _VLM_DEFAULTS["confidence"]))
        except Exception:
            confidence = 0.3
        confidence = min(1.0, max(0.0, confidence))

        review_reasons = []
        if summary is None or (isinstance(summary, str) and summary.strip() == ""):
            review_reasons.append("summary_missing")
        if question_type == "other":
            review_reasons.append("question_type_other")
        if answer_form == "other":
            review_reasons.append("answer_form_other")

        if review_reasons:
            confidence = min(confidence, 0.3)

        return review_reasons, confidence
