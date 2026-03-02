"""Property-based tests for compute_response_sha256() in contracts.py.

Uses hypothesis to verify:
- Property 7a: Determinism – same input always produces same hash
- Property 7b: Hash format – always returns a 64-char lowercase hex string
- Property 7c: Volatile field exclusion – status/errors/created_at/updated_at don't affect hash
- Property 7d: Content sensitivity – different non-volatile content produces different hashes

**Validates: Requirements 4.4**
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# Ensure the project root is on sys.path so the import works
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.contracts import compute_response_sha256

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# Generate random dicts with string keys and simple values
_simple_values = st.one_of(
    st.text(max_size=50),
    st.integers(),
    st.floats(allow_nan=False, allow_infinity=False),
    st.booleans(),
    st.none(),
)

_data_dict = st.dictionaries(
    keys=st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=("L", "N"))),
    values=_simple_values,
    max_size=10,
)

# Volatile fields that should be excluded from hash computation
_VOLATILE_FIELDS = ("status", "errors", "created_at", "updated_at")

# Strategy for volatile field values
_volatile_values = st.one_of(
    st.text(max_size=50),
    st.integers(),
    st.lists(st.text(max_size=20), max_size=5),
    st.none(),
)

# 64-char lowercase hex pattern
_SHA256_PATTERN = re.compile(r"^[a-f0-9]{64}$")


# ---------------------------------------------------------------------------
# Property 7a: Determinism – same input always produces same hash
# ---------------------------------------------------------------------------

class TestProperty7aDeterminism:
    """
    **Property 7a**: For ANY dict, calling compute_response_sha256 twice
    with the same input ALWAYS produces the same hash.

    **Validates: Requirements 4.4**
    """

    @given(data=_data_dict)
    @settings(max_examples=300)
    def test_same_input_same_hash(self, data: dict):
        """Calling compute_response_sha256 twice with identical input yields identical hash."""
        hash1 = compute_response_sha256(data)
        hash2 = compute_response_sha256(data)

        assert hash1 == hash2, (
            f"Determinism violated: same input produced different hashes.\n"
            f"Input: {data}\nHash1: {hash1}\nHash2: {hash2}"
        )

    @given(data=_data_dict)
    @settings(max_examples=200)
    def test_copy_produces_same_hash(self, data: dict):
        """A shallow copy of the input dict produces the same hash."""
        copy = dict(data)
        hash_original = compute_response_sha256(data)
        hash_copy = compute_response_sha256(copy)

        assert hash_original == hash_copy, (
            f"Determinism violated: copy produced different hash.\n"
            f"Original: {data}\nCopy: {copy}\n"
            f"Hash original: {hash_original}\nHash copy: {hash_copy}"
        )


# ---------------------------------------------------------------------------
# Property 7b: Hash format – always returns a 64-char lowercase hex string
# ---------------------------------------------------------------------------

class TestProperty7bHashFormat:
    """
    **Property 7b**: For ANY dict, the result is always a 64-character
    lowercase hex string.

    **Validates: Requirements 4.4**
    """

    @given(data=_data_dict)
    @settings(max_examples=300)
    def test_hash_is_64_char_hex(self, data: dict):
        """Hash output is always a 64-character lowercase hexadecimal string."""
        result = compute_response_sha256(data)

        assert isinstance(result, str), (
            f"Expected str, got {type(result).__name__}"
        )
        assert len(result) == 64, (
            f"Expected 64 chars, got {len(result)} for input: {data}"
        )
        assert _SHA256_PATTERN.match(result), (
            f"Hash is not a valid lowercase hex string: {result!r}"
        )

    def test_empty_dict_hash_format(self):
        """Even an empty dict produces a valid 64-char hex hash."""
        result = compute_response_sha256({})
        assert isinstance(result, str)
        assert len(result) == 64
        assert _SHA256_PATTERN.match(result)


# ---------------------------------------------------------------------------
# Property 7c: Volatile field exclusion – volatile fields don't affect hash
# ---------------------------------------------------------------------------

class TestProperty7cVolatileFieldExclusion:
    """
    **Property 7c**: For ANY dict, changing only the volatile fields
    (status, errors, created_at, updated_at) does NOT change the hash.

    **Validates: Requirements 4.4**
    """

    @given(
        data=_data_dict,
        status_val=_volatile_values,
        errors_val=_volatile_values,
        created_at_val=_volatile_values,
        updated_at_val=_volatile_values,
    )
    @settings(max_examples=300)
    def test_volatile_fields_do_not_affect_hash(
        self,
        data: dict,
        status_val,
        errors_val,
        created_at_val,
        updated_at_val,
    ):
        """Adding or changing volatile fields does not change the hash."""
        # Hash without volatile fields
        base = {k: v for k, v in data.items() if k not in _VOLATILE_FIELDS}
        hash_base = compute_response_sha256(base)

        # Hash with volatile fields added
        with_volatile = dict(base)
        with_volatile["status"] = status_val
        with_volatile["errors"] = errors_val
        with_volatile["created_at"] = created_at_val
        with_volatile["updated_at"] = updated_at_val
        hash_with_volatile = compute_response_sha256(with_volatile)

        assert hash_base == hash_with_volatile, (
            f"Volatile fields affected hash!\n"
            f"Base: {base}\nWith volatile: {with_volatile}\n"
            f"Hash base: {hash_base}\nHash with volatile: {hash_with_volatile}"
        )

    @given(
        data=_data_dict,
        status1=_volatile_values,
        status2=_volatile_values,
    )
    @settings(max_examples=200)
    def test_different_status_values_same_hash(self, data: dict, status1, status2):
        """Two dicts differing only in 'status' produce the same hash."""
        d1 = dict(data)
        d1["status"] = status1
        d2 = dict(data)
        d2["status"] = status2

        assert compute_response_sha256(d1) == compute_response_sha256(d2), (
            f"Different status values produced different hashes.\n"
            f"status1={status1!r}, status2={status2!r}"
        )


# ---------------------------------------------------------------------------
# Property 7d: Content sensitivity – different non-volatile content → different hashes
# ---------------------------------------------------------------------------

class TestProperty7dContentSensitivity:
    """
    **Property 7d**: For ANY two dicts that differ in non-volatile fields,
    the hashes are different (with high probability).

    **Validates: Requirements 4.4**
    """

    @given(
        data=_data_dict,
        extra_key=st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=("L", "N"))),
        extra_value=st.one_of(st.text(min_size=1, max_size=50), st.integers()),
    )
    @settings(max_examples=300)
    def test_adding_non_volatile_key_changes_hash(self, data: dict, extra_key: str, extra_value):
        """Adding a new non-volatile key changes the hash."""
        # Ensure extra_key is not already in data and is not a volatile field
        assume(extra_key not in data)
        assume(extra_key not in _VOLATILE_FIELDS)

        hash_without = compute_response_sha256(data)

        modified = dict(data)
        modified[extra_key] = extra_value
        hash_with = compute_response_sha256(modified)

        assert hash_without != hash_with, (
            f"Adding non-volatile key '{extra_key}' did not change hash.\n"
            f"Original: {data}\nModified: {modified}"
        )

    @given(
        key=st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=("L", "N"))),
        val1=st.text(min_size=1, max_size=50),
        val2=st.text(min_size=1, max_size=50),
    )
    @settings(max_examples=300)
    def test_different_values_for_same_key_produce_different_hashes(self, key: str, val1: str, val2: str):
        """Two dicts with different values for the same non-volatile key produce different hashes."""
        assume(key not in _VOLATILE_FIELDS)
        assume(val1 != val2)

        d1 = {key: val1}
        d2 = {key: val2}

        hash1 = compute_response_sha256(d1)
        hash2 = compute_response_sha256(d2)

        assert hash1 != hash2, (
            f"Different values for key '{key}' produced same hash.\n"
            f"val1={val1!r}, val2={val2!r}\nHash: {hash1}"
        )
