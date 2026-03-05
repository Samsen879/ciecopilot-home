"""Property-based tests for compute_response_sha256() audit trail integrity.

# Feature: ms-rubric-extraction, Property 10: 审计轨迹完整性

Uses hypothesis to verify:
- Integrity: compute_response_sha256(raw_json) == hashlib.sha256(raw_json.encode("utf-8")).hexdigest()
- Determinism: same input always produces the same hash
- Sensitivity: different inputs produce different hashes

**Validates: Requirements 2.7**
"""
from __future__ import annotations

import hashlib
import sys
from pathlib import Path

from hypothesis import given, settings, assume
from hypothesis import strategies as st

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.ms_persist import compute_response_sha256

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# Arbitrary raw_json strings – realistic JSON-like content plus edge cases
_raw_json_strings = st.text(min_size=0, max_size=2000)


# ---------------------------------------------------------------------------
# Property 10: 审计轨迹完整性
# ---------------------------------------------------------------------------


class TestProperty10AuditTrailIntegrity:
    """
    **Property 10**: For ANY persisted rubric point, `response_sha256`
    should equal the SHA-256 hash of the `raw_json` content.

    **Validates: Requirements 2.7**
    """

    @given(raw_json=_raw_json_strings)
    @settings(max_examples=100)
    def test_sha256_matches_raw_json_content(self, raw_json: str):
        """compute_response_sha256(raw_json) must equal hashlib.sha256(raw_json.encode('utf-8')).hexdigest()."""
        result = compute_response_sha256(raw_json)
        expected = hashlib.sha256(raw_json.encode("utf-8")).hexdigest()
        assert result == expected, (
            f"SHA256 mismatch: got {result!r}, expected {expected!r} for input {raw_json!r}"
        )

    @given(raw_json=_raw_json_strings)
    @settings(max_examples=100)
    def test_determinism_same_input_same_hash(self, raw_json: str):
        """Calling compute_response_sha256 twice with the same input yields the same result."""
        h1 = compute_response_sha256(raw_json)
        h2 = compute_response_sha256(raw_json)
        assert h1 == h2, f"Determinism violated: {h1!r} != {h2!r}"

    @given(raw_json1=_raw_json_strings, raw_json2=_raw_json_strings)
    @settings(max_examples=100)
    def test_different_inputs_different_hashes(self, raw_json1: str, raw_json2: str):
        """Different raw_json inputs should produce different SHA-256 hashes."""
        assume(raw_json1 != raw_json2)
        h1 = compute_response_sha256(raw_json1)
        h2 = compute_response_sha256(raw_json2)
        assert h1 != h2, (
            f"Hash collision: both inputs produced {h1!r}"
        )

    @given(raw_json=_raw_json_strings)
    @settings(max_examples=100)
    def test_hash_is_64_hex_chars(self, raw_json: str):
        """The hash is always a 64-character lowercase hex string (SHA-256)."""
        h = compute_response_sha256(raw_json)
        assert len(h) == 64, f"Expected 64 chars, got {len(h)}"
        assert all(c in "0123456789abcdef" for c in h), (
            f"Non-hex character in hash: {h!r}"
        )
