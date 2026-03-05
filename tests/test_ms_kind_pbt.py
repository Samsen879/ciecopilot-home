"""Property-based tests for derive_kind() in ms_prompt.py.

# Feature: ms-rubric-extraction, Property 11: kind 推导正确性

Uses hypothesis to verify:
- For ANY mark_label, if the first letter (stripped+uppercased) is M/A/B then
  kind equals that letter and valid is True; if the first letter is not in
  M/A/B then valid is False.

**Validates: Requirements 3.2**
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.ms_prompt import derive_kind

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

_VALID_PREFIXES = ("M", "A", "B")

# Valid mark labels: M/A/B followed by one or more digits, optionally padded
_valid_mark_labels = st.sampled_from(list(_VALID_PREFIXES)).flatmap(
    lambda prefix: st.integers(min_value=1, max_value=99).map(
        lambda n: f"{prefix}{n}"
    )
)

# Add optional whitespace padding around valid labels
_padded_valid_labels = _valid_mark_labels.flatmap(
    lambda label: st.tuples(
        st.text(alphabet=" \t", min_size=0, max_size=3),
        st.text(alphabet=" \t", min_size=0, max_size=3),
    ).map(lambda pads: f"{pads[0]}{label}{pads[1]}")
)

# Lowercase variants of valid labels
_lowercase_valid_labels = _valid_mark_labels.map(str.lower)

# Invalid labels: start with a letter NOT in M/A/B
_invalid_first_chars = st.sampled_from(
    [c for c in "CDEFGHIJKLNOPQRSTUVWXYZ"]
)
_invalid_labels = _invalid_first_chars.flatmap(
    lambda ch: st.text(min_size=0, max_size=10).map(lambda rest: ch + rest)
)

# Arbitrary text that may or may not be valid
_arbitrary_text = st.text(min_size=0, max_size=50)


# ---------------------------------------------------------------------------
# Property 11: kind 推导正确性
# ---------------------------------------------------------------------------


class TestProperty11KindDerivation:
    """
    **Property 11**: For ANY mark_label, if the first letter (after strip
    and upper) is M/A/B then kind equals that letter and valid is True;
    if the first letter is not in M/A/B, valid is False; if empty, kind
    is '?' and valid is False.

    **Validates: Requirements 3.2**
    """

    @given(label=_padded_valid_labels)
    @settings(max_examples=100)
    def test_valid_mab_labels_return_correct_kind(self, label: str):
        """Valid M/A/B labels (with optional whitespace) yield correct kind and valid=True."""
        kind, valid = derive_kind(label)
        expected_first = label.strip().upper()[0]

        assert expected_first in _VALID_PREFIXES
        assert kind == expected_first, f"Expected kind={expected_first!r}, got {kind!r} for {label!r}"
        assert valid is True, f"Expected valid=True for {label!r}"

    @given(label=_lowercase_valid_labels)
    @settings(max_examples=100)
    def test_lowercase_labels_normalised_correctly(self, label: str):
        """Lowercase m/a/b labels are uppercased and treated as valid."""
        kind, valid = derive_kind(label)
        expected_first = label.strip().upper()[0]

        assert kind == expected_first
        assert valid is True, f"Expected valid=True for lowercase {label!r}"

    @given(label=_invalid_labels)
    @settings(max_examples=100)
    def test_invalid_first_char_returns_valid_false(self, label: str):
        """Labels starting with non-M/A/B letter return valid=False."""
        kind, valid = derive_kind(label)
        expected_first = label.strip().upper()[0]

        assert valid is False, f"Expected valid=False for {label!r}"
        assert kind == expected_first, f"Expected kind={expected_first!r}, got {kind!r}"

    @given(ws=st.text(alphabet=" \t\n\r", min_size=0, max_size=5))
    @settings(max_examples=100)
    def test_empty_or_whitespace_only_returns_question_mark(self, ws: str):
        """Empty strings or whitespace-only strings yield ('?', False)."""
        kind, valid = derive_kind(ws)

        assert kind == "?", f"Expected kind='?' for whitespace-only {ws!r}, got {kind!r}"
        assert valid is False, f"Expected valid=False for whitespace-only {ws!r}"

    @given(label=_arbitrary_text)
    @settings(max_examples=100)
    def test_return_type_always_tuple_str_bool(self, label: str):
        """derive_kind always returns (str, bool) regardless of input."""
        result = derive_kind(label)

        assert isinstance(result, tuple), f"Expected tuple, got {type(result)}"
        assert len(result) == 2, f"Expected 2-tuple, got length {len(result)}"
        assert isinstance(result[0], str), f"kind should be str, got {type(result[0])}"
        assert isinstance(result[1], bool), f"valid should be bool, got {type(result[1])}"

    @given(label=_arbitrary_text)
    @settings(max_examples=100)
    def test_valid_true_iff_first_char_in_mab(self, label: str):
        """valid is True if and only if the stripped+uppercased first char is M/A/B."""
        kind, valid = derive_kind(label)
        stripped = label.strip().upper()

        if not stripped:
            assert valid is False
            assert kind == "?"
        elif stripped[0] in _VALID_PREFIXES:
            assert valid is True, f"Expected valid=True for {label!r} (first={stripped[0]})"
            assert kind == stripped[0]
        else:
            assert valid is False, f"Expected valid=False for {label!r} (first={stripped[0]})"
            assert kind == stripped[0]
