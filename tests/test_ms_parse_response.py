"""Unit tests and property-based tests for invalid JSON error handling in parse_ms_response().

# Feature: ms-rubric-extraction, Property 8: 非法 JSON 错误处理

Tests that for ANY non-valid-JSON string input, parse_ms_response returns None.

Unit tests cover specific invalid inputs:
- Empty string, None, plain text, truncated JSON, HTML, bare numbers,
  bare strings, empty objects, missing rubric_points key, empty arrays,
  non-dict items in rubric_points.

Property-based test uses hypothesis to verify the property across arbitrary
non-JSON strings.

**Validates: Requirements 2.5**
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
# Fixtures
# ---------------------------------------------------------------------------

_TEST_JOB = {
    "job_id": "test-001",
    "storage_key": "test/ms.png",
    "q_number": 1,
}

# ---------------------------------------------------------------------------
# Unit tests: specific invalid inputs
# ---------------------------------------------------------------------------


class TestInvalidJsonUnitCases:
    """Unit tests for specific invalid input cases.

    # Feature: ms-rubric-extraction, Property 8: 非法 JSON 错误处理
    # **Validates: Requirements 2.5**
    """

    def test_empty_string(self):
        """Empty string should return None."""
        assert parse_ms_response("", _TEST_JOB) is None

    def test_none_input(self):
        """None input should return None."""
        assert parse_ms_response(None, _TEST_JOB) is None

    def test_plain_text(self):
        """Plain text that is not JSON should return None."""
        assert parse_ms_response("This is not JSON", _TEST_JOB) is None

    def test_truncated_json(self):
        """Truncated JSON should return None."""
        assert parse_ms_response('{"rubric_points": [{"mark_label": "M1"', _TEST_JOB) is None

    def test_html_content(self):
        """HTML content should return None."""
        html = "<html><body><h1>Not JSON</h1></body></html>"
        assert parse_ms_response(html, _TEST_JOB) is None

    def test_bare_number(self):
        """A bare number string like '42' should return None."""
        assert parse_ms_response("42", _TEST_JOB) is None

    def test_bare_string(self):
        """A JSON string value like '"hello"' should return None."""
        assert parse_ms_response('"hello"', _TEST_JOB) is None

    def test_empty_object(self):
        """An empty JSON object '{}' should return None (no rubric_points key)."""
        assert parse_ms_response("{}", _TEST_JOB) is None

    def test_object_without_rubric_points_key(self):
        """A JSON object without 'rubric_points' key should return None."""
        assert parse_ms_response('{"other": []}', _TEST_JOB) is None

    def test_empty_rubric_points_array(self):
        """An empty rubric_points array should return None (no valid points)."""
        assert parse_ms_response('{"rubric_points": []}', _TEST_JOB) is None

    def test_rubric_points_with_non_dict_items(self):
        """rubric_points containing only non-dict items should return None."""
        assert parse_ms_response('{"rubric_points": [1, 2, 3]}', _TEST_JOB) is None


# ---------------------------------------------------------------------------
# Property-based test: arbitrary non-JSON strings
# ---------------------------------------------------------------------------


class TestProperty8InvalidJsonPBT:
    """
    **Property 8**: For ANY non-valid-JSON string input,
    parse_ms_response should return None.

    # Feature: ms-rubric-extraction, Property 8: 非法 JSON 错误处理
    # **Validates: Requirements 2.5**
    """

    @given(raw_text=st.text())
    @settings(max_examples=100)
    def test_arbitrary_non_json_returns_none(self, raw_text: str):
        """For arbitrary text that is not valid rubric JSON, parse_ms_response returns None."""
        # Filter out strings that happen to be valid rubric JSON
        try:
            parsed = json.loads(raw_text)
        except (json.JSONDecodeError, ValueError):
            # Definitely not valid JSON -> must return None
            result = parse_ms_response(raw_text, _TEST_JOB)
            assert result is None, (
                f"parse_ms_response should return None for non-JSON input, "
                f"got {result!r} for input {raw_text!r}"
            )
            return

        # It parsed as JSON — skip if it could be a valid rubric structure
        # (dict with rubric_points list of dicts, or bare list of dicts)
        if isinstance(parsed, dict):
            rp = parsed.get("rubric_points")
            if isinstance(rp, list) and len(rp) > 0 and any(isinstance(x, dict) for x in rp):
                assume(False)  # skip — this could be valid input
        elif isinstance(parsed, list):
            if len(parsed) > 0 and any(isinstance(x, dict) for x in parsed):
                assume(False)  # skip — bare array of dicts could be valid
        # For all other valid-JSON-but-not-rubric cases, should still return None
        result = parse_ms_response(raw_text, _TEST_JOB)
        assert result is None, (
            f"parse_ms_response should return None for non-rubric JSON, "
            f"got {result!r} for input {raw_text!r}"
        )
