"""Unit tests for scripts/ms/ms_persist.py.

Tests cover:
- compute_point_fingerprint: determinism, collision resistance, order independence
- compute_response_sha256: correctness, determinism
- _build_row_params: kind derivation, status, parse_flags, field defaults
- persist_rubric_points: transaction commit/rollback via mock pool

**Validates: Requirements 2.7, 3.4, 3.5, 3.6, 3.7**
"""
from __future__ import annotations

import hashlib
import json
import sys
import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch, call

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.ms_persist import (
    compute_point_fingerprint,
    compute_response_sha256,
    persist_rubric_points,
    _build_row_params,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

_JOB = {
    "job_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "storage_key": "9709/ms/q1.png",
    "paper_id": None,
    "q_number": 1,
    "subpart": None,
    "extractor_version": "v1",
    "provider": "dashscope",
    "model": "qwen-vl-max",
    "prompt_version": "ms_v1",
}

_POINT_VALID = {
    "mark_label": "M1",
    "description": "Apply chain rule correctly",
    "marks": 1,
    "depends_on_labels": [],
    "ft_mode": "none",
    "expected_answer_latex": None,
    "confidence": 0.9,
    "confidence_source": "model",
}


# ===================================================================
# compute_point_fingerprint tests
# ===================================================================


class TestComputePointFingerprint:
    """Tests for fingerprint determinism and collision resistance."""

    def test_deterministic(self):
        fp1 = compute_point_fingerprint("M1", "desc", 1, ["B1"])
        fp2 = compute_point_fingerprint("M1", "desc", 1, ["B1"])
        assert fp1 == fp2

    def test_different_label_different_fingerprint(self):
        fp1 = compute_point_fingerprint("M1", "desc", 1, [])
        fp2 = compute_point_fingerprint("A1", "desc", 1, [])
        assert fp1 != fp2

    def test_different_description_different_fingerprint(self):
        fp1 = compute_point_fingerprint("M1", "desc A", 1, [])
        fp2 = compute_point_fingerprint("M1", "desc B", 1, [])
        assert fp1 != fp2

    def test_different_marks_different_fingerprint(self):
        fp1 = compute_point_fingerprint("M1", "desc", 1, [])
        fp2 = compute_point_fingerprint("M1", "desc", 2, [])
        assert fp1 != fp2

    def test_different_deps_different_fingerprint(self):
        fp1 = compute_point_fingerprint("M1", "desc", 1, [])
        fp2 = compute_point_fingerprint("M1", "desc", 1, ["B1"])
        assert fp1 != fp2

    def test_deps_order_independent(self):
        fp1 = compute_point_fingerprint("M1", "desc", 1, ["A1", "B1"])
        fp2 = compute_point_fingerprint("M1", "desc", 1, ["B1", "A1"])
        assert fp1 == fp2

    def test_returns_64_hex_chars(self):
        fp = compute_point_fingerprint("M1", "desc", 1, [])
        assert len(fp) == 64
        assert all(c in "0123456789abcdef" for c in fp)

    def test_unicode_support(self):
        fp = compute_point_fingerprint("M1", "使用链式法则", 1, [])
        assert len(fp) == 64

    def test_matches_manual_sha256(self):
        payload = json.dumps(
            {"mark_label": "M1", "description": "d", "marks": 1, "depends_on_labels": []},
            sort_keys=True, ensure_ascii=False,
        )
        expected = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        assert compute_point_fingerprint("M1", "d", 1, []) == expected


# ===================================================================
# compute_response_sha256 tests
# ===================================================================


class TestComputeResponseSha256:
    """Tests for audit hash computation."""

    def test_deterministic(self):
        h1 = compute_response_sha256('{"a": 1}')
        h2 = compute_response_sha256('{"a": 1}')
        assert h1 == h2

    def test_different_input_different_hash(self):
        h1 = compute_response_sha256('{"a": 1}')
        h2 = compute_response_sha256('{"a": 2}')
        assert h1 != h2

    def test_returns_64_hex_chars(self):
        h = compute_response_sha256("hello")
        assert len(h) == 64

    def test_matches_manual_sha256(self):
        raw = '{"rubric_points": []}'
        expected = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        assert compute_response_sha256(raw) == expected


# ===================================================================
# _build_row_params tests
# ===================================================================


class TestBuildRowParams:
    """Tests for row parameter construction."""

    def test_valid_point_produces_draft_status(self):
        params = _build_row_params(_JOB, _POINT_VALID, 0, "run-1", "{}", "abc")
        assert params["status"] == "draft"
        assert params["kind"] == "M"
        assert params["mark_label"] == "M1"
        assert params["parse_flags"] == "{}"

    def test_invalid_label_produces_needs_review(self):
        point = {**_POINT_VALID, "mark_label": "X1"}
        params = _build_row_params(_JOB, point, 0, "run-1", "{}", "abc")
        assert params["status"] == "needs_review"
        flags = json.loads(params["parse_flags"])
        assert flags["label_invalid"] is True

    def test_prefix_only_label_produces_needs_review(self):
        point = {**_POINT_VALID, "mark_label": "M"}
        params = _build_row_params(_JOB, point, 0, "run-1", "{}", "abc")
        assert params["status"] == "needs_review"
        flags = json.loads(params["parse_flags"])
        assert flags["label_invalid"] is True

    def test_empty_label_produces_needs_review(self):
        point = {**_POINT_VALID, "mark_label": ""}
        params = _build_row_params(_JOB, point, 0, "run-1", "{}", "abc")
        assert params["status"] == "needs_review"

    def test_kind_derivation_a(self):
        point = {**_POINT_VALID, "mark_label": "A2"}
        params = _build_row_params(_JOB, point, 0, "run-1", "{}", "abc")
        assert params["kind"] == "A"

    def test_kind_derivation_b(self):
        point = {**_POINT_VALID, "mark_label": "b1"}
        params = _build_row_params(_JOB, point, 0, "run-1", "{}", "abc")
        assert params["kind"] == "B"
        assert params["mark_label"] == "B1"

    def test_invalid_ft_mode_becomes_unknown(self):
        point = {**_POINT_VALID, "ft_mode": "bad_value"}
        params = _build_row_params(_JOB, point, 0, "run-1", "{}", "abc")
        assert params["ft_mode"] == "unknown"

    def test_valid_ft_modes_preserved(self):
        for mode in ("none", "follow_through", "carried_accuracy", "unknown"):
            point = {**_POINT_VALID, "ft_mode": mode}
            params = _build_row_params(_JOB, point, 0, "run-1", "{}", "abc")
            assert params["ft_mode"] == mode

    def test_invalid_confidence_source_defaults_to_model(self):
        point = {**_POINT_VALID, "confidence_source": "invalid"}
        params = _build_row_params(_JOB, point, 0, "run-1", "{}", "abc")
        assert params["confidence_source"] == "model"

    def test_step_index_passed_through(self):
        params = _build_row_params(_JOB, _POINT_VALID, 5, "run-1", "{}", "abc")
        assert params["step_index"] == 5

    def test_job_fields_propagated(self):
        params = _build_row_params(_JOB, _POINT_VALID, 0, "run-1", "{}", "abc")
        assert params["storage_key"] == _JOB["storage_key"]
        assert params["q_number"] == _JOB["q_number"]
        assert params["extractor_version"] == _JOB["extractor_version"]
        assert params["provider"] == _JOB["provider"]
        assert params["model"] == _JOB["model"]
        assert params["prompt_version"] == _JOB["prompt_version"]

    def test_depends_on_empty_initially(self):
        params = _build_row_params(_JOB, _POINT_VALID, 0, "run-1", "{}", "abc")
        assert params["depends_on"] == []

    def test_source_is_vlm(self):
        params = _build_row_params(_JOB, _POINT_VALID, 0, "run-1", "{}", "abc")
        assert params["source"] == "vlm"

    def test_rubric_id_is_valid_uuid(self):
        params = _build_row_params(_JOB, _POINT_VALID, 0, "run-1", "{}", "abc")
        uuid.UUID(params["rubric_id"])  # raises if invalid

    def test_fingerprint_computed(self):
        params = _build_row_params(_JOB, _POINT_VALID, 0, "run-1", "{}", "abc")
        expected = compute_point_fingerprint("M1", "Apply chain rule correctly", 1, [])
        assert params["point_fingerprint"] == expected


# ===================================================================
# persist_rubric_points tests (mock DB)
# ===================================================================


def _make_mock_pool():
    """Create a mock psycopg2 connection pool."""
    pool = MagicMock()
    conn = MagicMock()
    cursor = MagicMock()
    pool.getconn.return_value = conn
    conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
    conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
    return pool, conn, cursor


class TestPersistRubricPoints:
    """Tests for the single-transaction upsert function."""

    def test_returns_done_on_success(self):
        pool, conn, cursor = _make_mock_pool()
        result = persist_rubric_points(
            pool, _JOB, [_POINT_VALID], "run-1", '{"raw": true}', "sha256hex",
        )
        assert result == "done"
        conn.commit.assert_called_once()
        pool.putconn.assert_called_with(conn)

    def test_executes_upsert_per_point(self):
        pool, conn, cursor = _make_mock_pool()
        points = [
            {**_POINT_VALID, "mark_label": "M1"},
            {**_POINT_VALID, "mark_label": "A1"},
        ]
        persist_rubric_points(pool, _JOB, points, "run-1", "{}", "sha")
        # 2 upsert calls + 1 job update = 3 execute calls
        assert cursor.execute.call_count == 3

    def test_rollback_on_db_error(self):
        pool, conn, cursor = _make_mock_pool()
        cursor.execute.side_effect = Exception("DB connection lost")

        # Need a separate conn for error marking
        err_conn = MagicMock()
        err_cursor = MagicMock()
        err_conn.cursor.return_value.__enter__ = MagicMock(return_value=err_cursor)
        err_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        pool.getconn.side_effect = [conn, err_conn]

        result = persist_rubric_points(
            pool, _JOB, [_POINT_VALID], "run-1", "{}", "sha",
        )
        assert result == "error"
        conn.rollback.assert_called_once()
        conn.commit.assert_not_called()

    def test_error_marks_job_as_error(self):
        pool, conn, cursor = _make_mock_pool()
        cursor.execute.side_effect = Exception("constraint violation")

        err_conn = MagicMock()
        err_cursor = MagicMock()
        err_conn.cursor.return_value.__enter__ = MagicMock(return_value=err_cursor)
        err_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        pool.getconn.side_effect = [conn, err_conn]

        persist_rubric_points(pool, _JOB, [_POINT_VALID], "run-1", "{}", "sha")

        # Verify the error job update was executed
        err_cursor.execute.assert_called_once()
        args = err_cursor.execute.call_args
        assert "error" in args[0][0]  # SQL contains 'error'
        assert args[0][1]["job_id"] == _JOB["job_id"]

    def test_conn_returned_to_pool_on_success(self):
        pool, conn, cursor = _make_mock_pool()
        persist_rubric_points(pool, _JOB, [_POINT_VALID], "run-1", "{}", "sha")
        pool.putconn.assert_called_with(conn)

    def test_conn_returned_to_pool_on_error(self):
        pool, conn, cursor = _make_mock_pool()
        cursor.execute.side_effect = Exception("fail")

        err_conn = MagicMock()
        err_cursor = MagicMock()
        err_conn.cursor.return_value.__enter__ = MagicMock(return_value=err_cursor)
        err_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        pool.getconn.side_effect = [conn, err_conn]

        persist_rubric_points(pool, _JOB, [_POINT_VALID], "run-1", "{}", "sha")
        # Main conn returned in finally block
        pool.putconn.assert_any_call(conn)

    def test_empty_points_list(self):
        pool, conn, cursor = _make_mock_pool()
        result = persist_rubric_points(pool, _JOB, [], "run-1", "{}", "sha")
        assert result == "done"
        # Only the job update SQL, no upserts
        assert cursor.execute.call_count == 1
        conn.commit.assert_called_once()

    def test_initial_status_is_draft_for_valid_points(self):
        pool, conn, cursor = _make_mock_pool()
        persist_rubric_points(pool, _JOB, [_POINT_VALID], "run-1", "{}", "sha")
        # Check the params passed to the first execute call (upsert)
        upsert_call = cursor.execute.call_args_list[0]
        params = upsert_call[0][1]
        assert params["status"] == "draft"
