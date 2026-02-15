"""Property-based tests for render_b3_mapping_appendix() in qc_sampler.py.

# Feature: ms-rubric-extraction, Property 35: QC 报告附录映射完整性

Verifies that the QC report Appendix A always contains the four required
B3 field mappings:
- decision.reason -> user_errors.metadata.decision_reason
- rubric_id -> user_errors.metadata.rubric_id
- run_id -> user_errors.metadata.run_id
- source_version -> user_errors.metadata.source_version

**Validates: Requirements 10.2**
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.qc_sampler import render_b3_mapping_appendix

# ---------------------------------------------------------------------------
# Required mappings (source field -> target field)
# ---------------------------------------------------------------------------

_REQUIRED_MAPPINGS = {
    "decision.reason": "user_errors.metadata.decision_reason",
    "rubric_id": "user_errors.metadata.rubric_id",
    "run_id": "user_errors.metadata.run_id",
    "source_version": "user_errors.metadata.source_version",
}


class TestProperty35AppendixMappingCompleteness:
    """Property 35: QC 报告附录映射完整性

    **Validates: Requirements 10.2**
    """

    def test_appendix_contains_all_four_source_fields(self):
        """All four B2/B1 source fields must appear in the appendix."""
        appendix = render_b3_mapping_appendix()
        for source_field in _REQUIRED_MAPPINGS:
            assert source_field in appendix, (
                f"Missing source field '{source_field}' in appendix"
            )

    def test_appendix_contains_all_four_target_fields(self):
        """All four B3 target fields must appear in the appendix."""
        appendix = render_b3_mapping_appendix()
        for target_field in _REQUIRED_MAPPINGS.values():
            assert target_field in appendix, (
                f"Missing target field '{target_field}' in appendix"
            )

    def test_appendix_contains_all_mapping_pairs(self):
        """Each source->target pair must co-exist in the appendix."""
        appendix = render_b3_mapping_appendix()
        for source, target in _REQUIRED_MAPPINGS.items():
            assert source in appendix and target in appendix, (
                f"Mapping pair '{source}' -> '{target}' incomplete in appendix"
            )

    def test_appendix_has_exactly_four_mappings(self):
        """The appendix table must contain exactly 4 data rows."""
        appendix = render_b3_mapping_appendix()
        # Count table data rows (lines with | that are not header or separator)
        lines = [
            line.strip() for line in appendix.splitlines()
            if line.strip().startswith("|")
        ]
        # Exclude header row and separator row (---|---|---)
        data_rows = [
            line for line in lines
            if not all(c in "-| " for c in line)  # skip separator
        ]
        # First data row is the header; remaining are mapping rows
        mapping_rows = data_rows[1:]  # skip header
        assert len(mapping_rows) == 4, (
            f"Expected 4 mapping rows, got {len(mapping_rows)}"
        )

    def test_appendix_is_non_empty_string(self):
        """render_b3_mapping_appendix must return a non-empty string."""
        appendix = render_b3_mapping_appendix()
        assert isinstance(appendix, str)
        assert len(appendix) > 0

    def test_appendix_contains_appendix_a_heading(self):
        """The appendix must contain an 'Appendix A' heading."""
        appendix = render_b3_mapping_appendix()
        assert "Appendix A" in appendix

    @given(st.integers(min_value=1, max_value=100))
    @settings(max_examples=100)
    def test_appendix_stable_across_repeated_calls(self, _n: int):
        """The function is deterministic: repeated calls yield identical output.

        **Validates: Requirements 10.2**
        """
        first = render_b3_mapping_appendix()
        second = render_b3_mapping_appendix()
        assert first == second, "render_b3_mapping_appendix is not deterministic"

    @given(st.integers(min_value=1, max_value=100))
    @settings(max_examples=100)
    def test_all_four_mappings_present_across_calls(self, _n: int):
        """Across many calls, all four mappings are always present.

        **Validates: Requirements 10.2**
        """
        appendix = render_b3_mapping_appendix()
        for source, target in _REQUIRED_MAPPINGS.items():
            assert source in appendix, f"Missing '{source}' in call"
            assert target in appendix, f"Missing '{target}' in call"

    def test_compatibility_note_present(self):
        """The appendix should mention the user_errors unique index caveat."""
        appendix = render_b3_mapping_appendix()
        assert "user_errors" in appendix
        assert "unique" in appendix.lower()
