"""Tests for submit_result() in batch_process_v0.py.

Uses mock pool objects to verify the function:
- Calls leakage_guard with the result
- Calls compute_response_sha256 with the result
- Returns "done" for non-blocked results
- Returns "blocked" when leakage detected
- Returns "error" on DB exception
- Commits transaction on success
- Passes correct SQL parameters

Uses the same mock pool patterns as test_claim_job.py.
"""
from __future__ import annotations

import sys
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import MagicMock, patch, call

import pytest

# Ensure the project root is on sys.path so the import works
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.batch_process_v0 import (
    submit_result,
    _UPSERT_SQL,
    _UPDATE_JOB_SQL,
    _ERROR_JOB_SQL,
)


# ---------------------------------------------------------------------------
# Helpers – fake pool objects (same pattern as test_claim_job.py)
# ---------------------------------------------------------------------------

def _make_psycopg_pool():
    """Create a mock pool that behaves like psycopg v3 ConnectionPool."""
    cur = MagicMock()

    conn = MagicMock()
    conn.cursor.return_value.__enter__ = lambda s: cur
    conn.cursor.return_value.__exit__ = lambda s, *a: None

    @contextmanager
    def connection():
        yield conn

    pool = MagicMock()
    pool._driver = "psycopg"
    pool.connection = connection
    return pool, conn, cur


def _make_psycopg2_pool():
    """Create a mock pool that behaves like psycopg2 ThreadedConnectionPool."""
    cur = MagicMock()
    cur.__enter__ = lambda s: cur
    cur.__exit__ = lambda s, *a: None

    conn = MagicMock()
    conn.cursor.return_value = cur

    pool = MagicMock()
    pool._driver = "psycopg2"
    pool.getconn.return_value = conn
    return pool, conn, cur


def _make_psycopg2_pool_with_error_conn():
    """Create a psycopg2 pool where the first execute raises, but error-marking works.

    Returns (pool, main_conn, main_cur, error_conn, error_cur).
    The pool.getconn() returns main_conn first, then error_conn on second call.
    """
    # Main cursor that will raise on execute
    main_cur = MagicMock()
    main_cur.__enter__ = lambda s: main_cur
    main_cur.__exit__ = lambda s, *a: None
    main_cur.execute.side_effect = RuntimeError("connection lost")

    main_conn = MagicMock()
    main_conn.cursor.return_value = main_cur

    # Error-marking cursor (succeeds)
    error_cur = MagicMock()
    error_cur.__enter__ = lambda s: error_cur
    error_cur.__exit__ = lambda s, *a: None

    error_conn = MagicMock()
    error_conn.cursor.return_value = error_cur

    pool = MagicMock()
    pool._driver = "psycopg2"
    pool.getconn.side_effect = [main_conn, error_conn]
    return pool, main_conn, main_cur, error_conn, error_cur


# ---------------------------------------------------------------------------
# Sample data
# ---------------------------------------------------------------------------

_SAMPLE_JOB_ID = "00000000-0000-0000-0000-000000000001"

_SAMPLE_RESULT = {
    "storage_key": "9709/s23/qp_12/q01.png",
    "sha256": "a" * 64,
    "syllabus_code": "9709",
    "session": "s",
    "year": 2023,
    "doc_type": "qp",
    "paper": 1,
    "variant": 2,
    "q_number": 1,
    "subpart": None,
    "status": "ok",
    "confidence": 0.85,
    "summary": "Find the value of x",
    "question_type": "calculation",
    "answer_form": "exact",
    "math_expressions_latex": ["x^2 + 1"],
    "variables": ["x"],
    "units": [],
    "provider": "dashscope",
    "model": "qwen3-vl-flash",
    "prompt_version": "v1",
    "extractor_version": "v0",
}


def _make_blocked_result() -> dict:
    """Create a result that will trigger leakage detection (blocked)."""
    result = _SAMPLE_RESULT.copy()
    # "the answer is" triggers the answer_disclosure leakage pattern
    result["summary"] = "the answer is 42"
    return result


# ---------------------------------------------------------------------------
# Tests – leakage_guard integration
# ---------------------------------------------------------------------------

class TestSubmitResultLeakageGuard:
    """Verify submit_result calls leakage_guard with the result."""

    @patch("scripts.vlm.batch_process_v0.json_param", side_effect=lambda x: x)
    @patch("scripts.vlm.batch_process_v0.compute_response_sha256", return_value="sha_hash")
    @patch("scripts.vlm.batch_process_v0.leakage_guard")
    def test_calls_leakage_guard_with_result(self, mock_guard, mock_sha, mock_jp):
        mock_guard.return_value = (_SAMPLE_RESULT.copy(), {})
        pool, conn, cur = _make_psycopg_pool()

        submit_result(pool, _SAMPLE_JOB_ID, _SAMPLE_RESULT.copy())

        mock_guard.assert_called_once()
        call_arg = mock_guard.call_args[0][0]
        assert call_arg["storage_key"] == _SAMPLE_RESULT["storage_key"]
        assert call_arg["sha256"] == _SAMPLE_RESULT["sha256"]


# ---------------------------------------------------------------------------
# Tests – compute_response_sha256 integration
# ---------------------------------------------------------------------------

class TestSubmitResultSha256:
    """Verify submit_result calls compute_response_sha256 with the result."""

    @patch("scripts.vlm.batch_process_v0.json_param", side_effect=lambda x: x)
    @patch("scripts.vlm.batch_process_v0.leakage_guard")
    @patch("scripts.vlm.batch_process_v0.compute_response_sha256")
    def test_calls_compute_response_sha256(self, mock_sha, mock_guard, mock_jp):
        result = _SAMPLE_RESULT.copy()
        mock_guard.return_value = (result, {})
        mock_sha.return_value = "abc123"
        pool, conn, cur = _make_psycopg_pool()

        submit_result(pool, _SAMPLE_JOB_ID, result)

        mock_sha.assert_called_once_with(result)


# ---------------------------------------------------------------------------
# Tests – return values
# ---------------------------------------------------------------------------

class TestSubmitResultReturnValues:
    """Verify correct return values for different scenarios."""

    @patch("scripts.vlm.batch_process_v0.json_param", side_effect=lambda x: x)
    @patch("scripts.vlm.batch_process_v0.compute_response_sha256", return_value="sha_hash")
    @patch("scripts.vlm.batch_process_v0.leakage_guard")
    def test_returns_done_for_ok_result(self, mock_guard, mock_sha, mock_jp):
        result = _SAMPLE_RESULT.copy()
        mock_guard.return_value = (result, {})
        pool, conn, cur = _make_psycopg_pool()

        status = submit_result(pool, _SAMPLE_JOB_ID, result)

        assert status == "done"

    @patch("scripts.vlm.batch_process_v0.json_param", side_effect=lambda x: x)
    @patch("scripts.vlm.batch_process_v0.compute_response_sha256", return_value="sha_hash")
    @patch("scripts.vlm.batch_process_v0.leakage_guard")
    def test_returns_blocked_when_leakage_detected(self, mock_guard, mock_sha, mock_jp):
        result = _SAMPLE_RESULT.copy()
        blocked_result = result.copy()
        blocked_result["status"] = "blocked"
        mock_guard.return_value = (blocked_result, {"summary_answer_disclosure": True})
        pool, conn, cur = _make_psycopg_pool()

        status = submit_result(pool, _SAMPLE_JOB_ID, result)

        assert status == "blocked"

    @patch("scripts.vlm.batch_process_v0.json_param", side_effect=lambda x: x)
    @patch("scripts.vlm.batch_process_v0.compute_response_sha256", return_value="sha_hash")
    @patch("scripts.vlm.batch_process_v0.leakage_guard")
    def test_returns_error_on_db_exception(self, mock_guard, mock_sha, mock_jp):
        result = _SAMPLE_RESULT.copy()
        mock_guard.return_value = (result, {})
        pool, conn, cur = _make_psycopg2_pool()
        cur.execute.side_effect = RuntimeError("connection lost")

        # Need a separate error connection for the error-marking path
        error_cur = MagicMock()
        error_cur.__enter__ = lambda s: error_cur
        error_cur.__exit__ = lambda s, *a: None
        error_conn = MagicMock()
        error_conn.cursor.return_value = error_cur
        pool.getconn.side_effect = [conn, error_conn]

        status = submit_result(pool, _SAMPLE_JOB_ID, result)

        assert status == "error"


# ---------------------------------------------------------------------------
# Tests – transaction behaviour (psycopg v3)
# ---------------------------------------------------------------------------

class TestSubmitResultPsycopgTransaction:
    """Verify transaction commit on success with psycopg v3 pool."""

    @patch("scripts.vlm.batch_process_v0.json_param", side_effect=lambda x: x)
    @patch("scripts.vlm.batch_process_v0.compute_response_sha256", return_value="sha_hash")
    @patch("scripts.vlm.batch_process_v0.leakage_guard")
    def test_commits_on_success(self, mock_guard, mock_sha, mock_jp):
        result = _SAMPLE_RESULT.copy()
        mock_guard.return_value = (result, {})
        pool, conn, cur = _make_psycopg_pool()

        submit_result(pool, _SAMPLE_JOB_ID, result)

        conn.commit.assert_called_once()

    @patch("scripts.vlm.batch_process_v0.json_param", side_effect=lambda x: x)
    @patch("scripts.vlm.batch_process_v0.compute_response_sha256", return_value="sha_hash")
    @patch("scripts.vlm.batch_process_v0.leakage_guard")
    def test_executes_two_sql_statements(self, mock_guard, mock_sha, mock_jp):
        result = _SAMPLE_RESULT.copy()
        mock_guard.return_value = (result, {})
        pool, conn, cur = _make_psycopg_pool()

        submit_result(pool, _SAMPLE_JOB_ID, result)

        # Should execute upsert + job update in same transaction
        assert cur.execute.call_count == 2


# ---------------------------------------------------------------------------
# Tests – transaction behaviour (psycopg2)
# ---------------------------------------------------------------------------

class TestSubmitResultPsycopg2Transaction:
    """Verify transaction commit and connection return with psycopg2 pool."""

    @patch("scripts.vlm.batch_process_v0.json_param", side_effect=lambda x: x)
    @patch("scripts.vlm.batch_process_v0.compute_response_sha256", return_value="sha_hash")
    @patch("scripts.vlm.batch_process_v0.leakage_guard")
    def test_commits_on_success(self, mock_guard, mock_sha, mock_jp):
        result = _SAMPLE_RESULT.copy()
        mock_guard.return_value = (result, {})
        pool, conn, cur = _make_psycopg2_pool()

        submit_result(pool, _SAMPLE_JOB_ID, result)

        conn.commit.assert_called_once()

    @patch("scripts.vlm.batch_process_v0.json_param", side_effect=lambda x: x)
    @patch("scripts.vlm.batch_process_v0.compute_response_sha256", return_value="sha_hash")
    @patch("scripts.vlm.batch_process_v0.leakage_guard")
    def test_putconn_called_on_success(self, mock_guard, mock_sha, mock_jp):
        result = _SAMPLE_RESULT.copy()
        mock_guard.return_value = (result, {})
        pool, conn, cur = _make_psycopg2_pool()

        submit_result(pool, _SAMPLE_JOB_ID, result)

        pool.putconn.assert_called_with(conn)

    @patch("scripts.vlm.batch_process_v0.json_param", side_effect=lambda x: x)
    @patch("scripts.vlm.batch_process_v0.compute_response_sha256", return_value="sha_hash")
    @patch("scripts.vlm.batch_process_v0.leakage_guard")
    def test_putconn_called_on_db_error(self, mock_guard, mock_sha, mock_jp):
        """Connection must be returned to pool even when DB operation fails."""
        result = _SAMPLE_RESULT.copy()
        mock_guard.return_value = (result, {})

        pool, main_conn, main_cur, error_conn, error_cur = (
            _make_psycopg2_pool_with_error_conn()
        )

        submit_result(pool, _SAMPLE_JOB_ID, result)

        # Both connections should be returned to pool
        pool.putconn.assert_any_call(main_conn)
        pool.putconn.assert_any_call(error_conn)


# ---------------------------------------------------------------------------
# Tests – SQL parameters
# ---------------------------------------------------------------------------

class TestSubmitResultSqlParams:
    """Verify correct SQL parameters are passed to cursor.execute."""

    @patch("scripts.vlm.batch_process_v0.json_param", side_effect=lambda x: x)
    @patch("scripts.vlm.batch_process_v0.compute_response_sha256", return_value="sha_hash")
    @patch("scripts.vlm.batch_process_v0.leakage_guard")
    def test_upsert_payload_contains_required_fields(self, mock_guard, mock_sha, mock_jp):
        result = _SAMPLE_RESULT.copy()
        mock_guard.return_value = (result, {"some_flag": True})
        pool, conn, cur = _make_psycopg_pool()

        submit_result(pool, _SAMPLE_JOB_ID, result)

        # First execute call is the upsert
        upsert_call = cur.execute.call_args_list[0]
        sql, payload = upsert_call[0]
        assert sql == _UPSERT_SQL
        assert payload["storage_key"] == "9709/s23/qp_12/q01.png"
        assert payload["sha256"] == "a" * 64
        assert payload["syllabus_code"] == "9709"
        assert payload["provider"] == "dashscope"
        assert payload["model"] == "qwen3-vl-flash"
        assert payload["response_sha256"] == "sha_hash"

    @patch("scripts.vlm.batch_process_v0.json_param", side_effect=lambda x: x)
    @patch("scripts.vlm.batch_process_v0.compute_response_sha256", return_value="sha_hash")
    @patch("scripts.vlm.batch_process_v0.leakage_guard")
    def test_job_update_params_for_done(self, mock_guard, mock_sha, mock_jp):
        result = _SAMPLE_RESULT.copy()
        mock_guard.return_value = (result, {})
        pool, conn, cur = _make_psycopg_pool()

        submit_result(pool, _SAMPLE_JOB_ID, result)

        # Second execute call is the job status update
        job_call = cur.execute.call_args_list[1]
        sql, params = job_call[0]
        assert sql == _UPDATE_JOB_SQL
        assert params["status"] == "done"
        assert params["job_id"] == _SAMPLE_JOB_ID

    @patch("scripts.vlm.batch_process_v0.json_param", side_effect=lambda x: x)
    @patch("scripts.vlm.batch_process_v0.compute_response_sha256", return_value="sha_hash")
    @patch("scripts.vlm.batch_process_v0.leakage_guard")
    def test_job_update_params_for_blocked(self, mock_guard, mock_sha, mock_jp):
        result = _SAMPLE_RESULT.copy()
        blocked_result = result.copy()
        blocked_result["status"] = "blocked"
        mock_guard.return_value = (blocked_result, {"summary_answer_disclosure": True})
        pool, conn, cur = _make_psycopg_pool()

        submit_result(pool, _SAMPLE_JOB_ID, result)

        # Second execute call is the job status update
        job_call = cur.execute.call_args_list[1]
        sql, params = job_call[0]
        assert params["status"] == "blocked"

    @patch("scripts.vlm.batch_process_v0.json_param", side_effect=lambda x: x)
    @patch("scripts.vlm.batch_process_v0.compute_response_sha256", return_value="sha_hash")
    @patch("scripts.vlm.batch_process_v0.leakage_guard")
    def test_error_marking_sql_on_db_failure(self, mock_guard, mock_sha, mock_jp):
        """When DB fails, error-marking SQL should include the error message."""
        result = _SAMPLE_RESULT.copy()
        mock_guard.return_value = (result, {})

        pool, main_conn, main_cur, error_conn, error_cur = (
            _make_psycopg2_pool_with_error_conn()
        )

        status = submit_result(pool, _SAMPLE_JOB_ID, result)

        assert status == "error"
        # The error cursor should have executed the error-marking SQL
        error_cur.execute.assert_called_once()
        sql, params = error_cur.execute.call_args[0]
        assert sql == _ERROR_JOB_SQL
        assert params["job_id"] == _SAMPLE_JOB_ID
        assert "connection lost" in params["last_error"]
