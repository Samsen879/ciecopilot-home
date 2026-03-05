"""Tests for build_prompt() in batch_process_v0.py.

Verifies that system and user prompts are correctly constructed
from job context, including JSON schema, leakage policy, pure JSON
instruction, and question context fields.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

# Ensure the project root is on sys.path so the import works
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.batch_process_v0 import build_prompt


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _job(**kwargs) -> dict:
    """Return a job dict with sensible defaults, overridden by kwargs."""
    defaults = {
        "job_id": "test-001",
        "storage_key": "9709/s23/q01.png",
        "sha256": "abc123",
        "syllabus_code": "9709",
        "paper": 1,
        "q_number": 3,
        "subpart": "a",
    }
    defaults.update(kwargs)
    return defaults


# ---------------------------------------------------------------------------
# Tests – return type and structure
# ---------------------------------------------------------------------------

class TestBuildPromptStructure:
    """build_prompt returns a (system_prompt, user_prompt) tuple of strings."""

    def test_returns_tuple_of_two_strings(self):
        result = build_prompt(_job())
        assert isinstance(result, tuple)
        assert len(result) == 2
        system_prompt, user_prompt = result
        assert isinstance(system_prompt, str)
        assert isinstance(user_prompt, str)

    def test_prompts_are_non_empty(self):
        system_prompt, user_prompt = build_prompt(_job())
        assert len(system_prompt) > 0
        assert len(user_prompt) > 0


# ---------------------------------------------------------------------------
# Tests – Req 6.1: system prompt contains JSON schema definition
# ---------------------------------------------------------------------------

class TestSystemPromptJsonSchema:
    """Req 6.1: system prompt SHALL contain JSON schema definition."""

    def test_contains_question_type_field(self):
        system_prompt, _ = build_prompt(_job())
        assert "question_type" in system_prompt

    def test_contains_math_expressions_latex_field(self):
        system_prompt, _ = build_prompt(_job())
        assert "math_expressions_latex" in system_prompt

    def test_contains_variables_field(self):
        system_prompt, _ = build_prompt(_job())
        assert "variables" in system_prompt

    def test_contains_units_field(self):
        system_prompt, _ = build_prompt(_job())
        assert "units" in system_prompt

    def test_contains_diagram_elements_field(self):
        system_prompt, _ = build_prompt(_job())
        assert "diagram_elements" in system_prompt

    def test_contains_answer_form_field(self):
        system_prompt, _ = build_prompt(_job())
        assert "answer_form" in system_prompt

    def test_contains_confidence_field(self):
        system_prompt, _ = build_prompt(_job())
        assert "confidence" in system_prompt

    def test_contains_summary_field(self):
        system_prompt, _ = build_prompt(_job())
        assert "summary" in system_prompt

    def test_contains_answer_form_values(self):
        system_prompt, _ = build_prompt(_job())
        for value in ("exact", "approx", "proof", "graph", "table", "other"):
            assert value in system_prompt

    def test_contains_question_type_values(self):
        system_prompt, _ = build_prompt(_job())
        for value in ("calculation", "proof", "graph", "definition", "multiple_choice"):
            assert value in system_prompt


# ---------------------------------------------------------------------------
# Tests – Req 6.2: system prompt includes leakage policy
# ---------------------------------------------------------------------------

class TestSystemPromptLeakagePolicy:
    """Req 6.2: system prompt SHALL include leakage policy explanation."""

    def test_no_answer_or_solution(self):
        system_prompt, _ = build_prompt(_job())
        assert "answer or solution" in system_prompt.lower()

    def test_no_mark_scheme(self):
        system_prompt, _ = build_prompt(_job())
        assert "mark scheme" in system_prompt.lower()

    def test_no_mark_allocations(self):
        system_prompt, _ = build_prompt(_job())
        assert "mark allocation" in system_prompt.lower()

    def test_only_describe_question(self):
        system_prompt, _ = build_prompt(_job())
        assert "not how to solve" in system_prompt.lower()


# ---------------------------------------------------------------------------
# Tests – Req 6.3: system prompt instructs pure JSON output
# ---------------------------------------------------------------------------

class TestSystemPromptPureJson:
    """Req 6.3: system prompt SHALL instruct model to output pure JSON only."""

    def test_mentions_pure_json(self):
        system_prompt, _ = build_prompt(_job())
        assert "pure json" in system_prompt.lower()

    def test_mentions_no_markdown(self):
        system_prompt, _ = build_prompt(_job())
        assert "no markdown" in system_prompt.lower()


# ---------------------------------------------------------------------------
# Tests – Req 6.4: user prompt includes question context
# ---------------------------------------------------------------------------

class TestUserPromptContext:
    """Req 6.4: user prompt SHALL include question context."""

    def test_includes_syllabus_code(self):
        _, user_prompt = build_prompt(_job(syllabus_code="9709"))
        assert "syllabus_code=9709" in user_prompt

    def test_includes_paper(self):
        _, user_prompt = build_prompt(_job(paper=3))
        assert "paper=3" in user_prompt

    def test_includes_q_number(self):
        _, user_prompt = build_prompt(_job(q_number=5))
        assert "q_number=5" in user_prompt

    def test_includes_subpart(self):
        _, user_prompt = build_prompt(_job(subpart="b"))
        assert "subpart=b" in user_prompt

    def test_includes_all_context_fields(self):
        _, user_prompt = build_prompt(_job(
            syllabus_code="9702", paper=2, q_number=7, subpart="c",
        ))
        assert "syllabus_code=9702" in user_prompt
        assert "paper=2" in user_prompt
        assert "q_number=7" in user_prompt
        assert "subpart=c" in user_prompt

    def test_omits_none_fields(self):
        _, user_prompt = build_prompt(_job(
            syllabus_code="9709", paper=1, q_number=None, subpart=None,
        ))
        assert "syllabus_code=9709" in user_prompt
        assert "paper=1" in user_prompt
        assert "q_number" not in user_prompt
        assert "subpart" not in user_prompt

    def test_all_none_context_still_has_instruction(self):
        _, user_prompt = build_prompt(_job(
            syllabus_code=None, paper=None, q_number=None, subpart=None,
        ))
        assert "Extract" in user_prompt
        # Should not have "Question context:" line when all fields are None
        assert "Question context" not in user_prompt

    def test_physics_syllabus_code(self):
        _, user_prompt = build_prompt(_job(syllabus_code="9702"))
        assert "syllabus_code=9702" in user_prompt

    def test_further_math_syllabus_code(self):
        _, user_prompt = build_prompt(_job(syllabus_code="9231"))
        assert "syllabus_code=9231" in user_prompt
