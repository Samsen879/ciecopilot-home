"""Property-based tests for compute_point_fingerprint() in ms_persist.py.

# Feature: ms-rubric-extraction, Property 12: 指纹确定性与抗碰撞

Uses hypothesis to verify:
- Determinism: same inputs always produce the same fingerprint
- Collision resistance: changing any single field produces a different fingerprint
- Order independence: depends_on_labels order does not affect the fingerprint

**Validates: Requirements 3.4**
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.ms_persist import compute_point_fingerprint

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# Mark labels: realistic M/A/B labels plus arbitrary text
_mark_labels = st.text(min_size=1, max_size=20)

# Descriptions: arbitrary non-empty text
_descriptions = st.text(min_size=1, max_size=200)

# Marks: positive integers (matching DB constraint marks > 0)
_marks = st.integers(min_value=1, max_value=100)

# Depends-on labels: list of short label strings
_dep_labels = st.lists(st.text(min_size=1, max_size=10), min_size=0, max_size=10)

# A composite strategy for a full fingerprint input tuple
_fingerprint_inputs = st.tuples(_mark_labels, _descriptions, _marks, _dep_labels)


# ---------------------------------------------------------------------------
# Property 12: 指纹确定性与抗碰撞
# ---------------------------------------------------------------------------


class TestProperty12FingerprintDeterminismAndCollisionResistance:
    """
    **Property 12**: For ANY two sets of rubric point inputs
    (mark_label, description, marks, depends_on_labels):
    - Same inputs produce the same fingerprint (determinism)
    - Changing any single field produces a different fingerprint (collision resistance)
    - depends_on_labels order does not matter (sorted internally)

    **Validates: Requirements 3.4**
    """

    @given(
        mark_label=_mark_labels,
        description=_descriptions,
        marks=_marks,
        deps=_dep_labels,
    )
    @settings(max_examples=100)
    def test_determinism_same_inputs_same_fingerprint(
        self, mark_label: str, description: str, marks: int, deps: list[str]
    ):
        """Calling compute_point_fingerprint twice with identical inputs yields the same result."""
        fp1 = compute_point_fingerprint(mark_label, description, marks, deps)
        fp2 = compute_point_fingerprint(mark_label, description, marks, deps)
        assert fp1 == fp2, f"Determinism violated: {fp1!r} != {fp2!r}"

    @given(
        mark_label=_mark_labels,
        other_label=_mark_labels,
        description=_descriptions,
        marks=_marks,
        deps=_dep_labels,
    )
    @settings(max_examples=100)
    def test_different_mark_label_different_fingerprint(
        self,
        mark_label: str,
        other_label: str,
        description: str,
        marks: int,
        deps: list[str],
    ):
        """Changing mark_label alone produces a different fingerprint."""
        assume(mark_label != other_label)
        fp1 = compute_point_fingerprint(mark_label, description, marks, deps)
        fp2 = compute_point_fingerprint(other_label, description, marks, deps)
        assert fp1 != fp2, (
            f"Collision on mark_label change: {mark_label!r} vs {other_label!r}"
        )

    @given(
        mark_label=_mark_labels,
        desc1=_descriptions,
        desc2=_descriptions,
        marks=_marks,
        deps=_dep_labels,
    )
    @settings(max_examples=100)
    def test_different_description_different_fingerprint(
        self,
        mark_label: str,
        desc1: str,
        desc2: str,
        marks: int,
        deps: list[str],
    ):
        """Changing description alone produces a different fingerprint."""
        assume(desc1 != desc2)
        fp1 = compute_point_fingerprint(mark_label, desc1, marks, deps)
        fp2 = compute_point_fingerprint(mark_label, desc2, marks, deps)
        assert fp1 != fp2, (
            f"Collision on description change: {desc1!r} vs {desc2!r}"
        )

    @given(
        mark_label=_mark_labels,
        description=_descriptions,
        marks1=_marks,
        marks2=_marks,
        deps=_dep_labels,
    )
    @settings(max_examples=100)
    def test_different_marks_different_fingerprint(
        self,
        mark_label: str,
        description: str,
        marks1: int,
        marks2: int,
        deps: list[str],
    ):
        """Changing marks alone produces a different fingerprint."""
        assume(marks1 != marks2)
        fp1 = compute_point_fingerprint(mark_label, description, marks1, deps)
        fp2 = compute_point_fingerprint(mark_label, description, marks2, deps)
        assert fp1 != fp2, (
            f"Collision on marks change: {marks1} vs {marks2}"
        )

    @given(
        mark_label=_mark_labels,
        description=_descriptions,
        marks=_marks,
        deps1=_dep_labels,
        deps2=_dep_labels,
    )
    @settings(max_examples=100)
    def test_different_depends_on_labels_different_fingerprint(
        self,
        mark_label: str,
        description: str,
        marks: int,
        deps1: list[str],
        deps2: list[str],
    ):
        """Changing depends_on_labels (after sorting) produces a different fingerprint."""
        assume(sorted(deps1) != sorted(deps2))
        fp1 = compute_point_fingerprint(mark_label, description, marks, deps1)
        fp2 = compute_point_fingerprint(mark_label, description, marks, deps2)
        assert fp1 != fp2, (
            f"Collision on deps change: {sorted(deps1)!r} vs {sorted(deps2)!r}"
        )

    @given(
        mark_label=_mark_labels,
        description=_descriptions,
        marks=_marks,
        deps=st.lists(st.text(min_size=1, max_size=10), min_size=2, max_size=10),
    )
    @settings(max_examples=100)
    def test_depends_on_labels_order_independent(
        self,
        mark_label: str,
        description: str,
        marks: int,
        deps: list[str],
    ):
        """Reordering depends_on_labels does not change the fingerprint."""
        reversed_deps = list(reversed(deps))
        fp1 = compute_point_fingerprint(mark_label, description, marks, deps)
        fp2 = compute_point_fingerprint(mark_label, description, marks, reversed_deps)
        assert fp1 == fp2, (
            f"Order sensitivity: {deps!r} vs {reversed_deps!r} produced different fingerprints"
        )

    @given(
        mark_label=_mark_labels,
        description=_descriptions,
        marks=_marks,
        deps=_dep_labels,
    )
    @settings(max_examples=100)
    def test_fingerprint_is_64_hex_chars(
        self, mark_label: str, description: str, marks: int, deps: list[str]
    ):
        """Fingerprint is always a 64-character lowercase hex string (SHA-256)."""
        fp = compute_point_fingerprint(mark_label, description, marks, deps)
        assert len(fp) == 64, f"Expected 64 chars, got {len(fp)}"
        assert all(c in "0123456789abcdef" for c in fp), (
            f"Non-hex character in fingerprint: {fp!r}"
        )
