"""Tests for worker_loop() and mark_job_status() in batch_process_v0.py.

Uses unittest.mock.patch to mock claim_job, pre_check, call_vlm_with_retry,
parse_response, submit_result, and mark_job_status so that worker_loop can
be tested in isolation without a real database or API.

Test cases:
1. Worker stops when stop_event is set
2. Worker stops when no jobs available (claim returns None)
3. Worker stops when max_jobs reached
4. Deferred job increments stats.deferred
5. File not found increments stats.error
6. Dry-run skips API call and DB submit
7. Successful flow increments stats.success
8. Parse failure increments stats.error
9. API error is caught and logged
"""
from __future__ import annotations

import sys
from pathlib import Path
from threading import Event
from unittest.mock import MagicMock, patch, call

import pytest

# Ensure the project root is on sys.path so the import works
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.batch_process_v0 import (
    worker_loop,
    mark_job_status,
    Config,
    Stats,
    _MARK_STATUS_SQL,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_config(**overrides) -> Config:
    """Create a Config with sensible test defaults."""
    defaults = dict(
        workers=1,
        status=["pending"],
        max_jobs=None,
        assets_root=Path("/fake/assets"),
        dry_run=False,
        allow_remote=False,
        stale_timeout_minutes=10,
    )
    defaults.update(overrides)
    return Config(**defaults)


def _make_stats() -> Stats:
    """Create a fresh Stats instance."""
    return Stats()


_SAMPLE_JOB = {
    "job_id": "job-001",
    "storage_key": "9709/s23/qp_12/q01.png",
    "sha256": "a" * 64,
    "syllabus_code": "9709",
    "session": "s23",
    "year": 2023,
    "doc_type": "qp",
    "paper": "1",
    "variant": "2",
    "q_number": "1",
    "subpart": None,
    "extractor_version": "v0",
    "provider": "dashscope",
    "model": "qwen3-vl-flash",
    "prompt_version": "v1",
}

_SAMPLE_RESULT = {
    "storage_key": "9709/s23/qp_12/q01.png",
    "sha256": "a" * 64,
    "status": "ok",
    "confidence": 0.85,
    "summary": "Find the value of x",
    "question_type": "calculation",
}

# Module path prefix for patching
_MOD = "scripts.vlm.batch_process_v0"


# ---------------------------------------------------------------------------
# Tests – mark_job_status
# ---------------------------------------------------------------------------

class TestMarkJobStatus:
    """Tests for the mark_job_status helper function."""

    def test_psycopg_driver_executes_sql(self):
        """mark_job_status with psycopg driver executes the correct SQL."""
        from contextlib import contextmanager

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

        mark_job_status(pool, "job-001", "error", "file_not_found")

        cur.execute.assert_called_once()
        sql, params = cur.execute.call_args[0]
        assert sql == _MARK_STATUS_SQL
        assert params["job_id"] == "job-001"
        assert params["status"] == "error"
        assert params["last_error"] == "file_not_found"
        conn.commit.assert_called_once()

    def test_psycopg2_driver_executes_sql(self):
        """mark_job_status with psycopg2 driver executes and returns conn."""
        cur = MagicMock()
        cur.__enter__ = lambda s: cur
        cur.__exit__ = lambda s, *a: None

        conn = MagicMock()
        conn.cursor.return_value = cur

        pool = MagicMock()
        pool._driver = "psycopg2"
        pool.getconn.return_value = conn

        mark_job_status(pool, "job-002", "deferred", "contact_sheet")

        cur.execute.assert_called_once()
        sql, params = cur.execute.call_args[0]
        assert params["status"] == "deferred"
        assert params["last_error"] == "contact_sheet"
        conn.commit.assert_called_once()
        pool.putconn.assert_called_once_with(conn)

    def test_none_error_msg(self):
        """mark_job_status passes None as last_error when no error_msg."""
        cur = MagicMock()
        cur.__enter__ = lambda s: cur
        cur.__exit__ = lambda s, *a: None

        conn = MagicMock()
        conn.cursor.return_value = cur

        pool = MagicMock()
        pool._driver = "psycopg2"
        pool.getconn.return_value = conn

        mark_job_status(pool, "job-003", "done")

        sql, params = cur.execute.call_args[0]
        assert params["last_error"] is None


# ---------------------------------------------------------------------------
# Tests – worker_loop
# ---------------------------------------------------------------------------

class TestWorkerLoopStopEvent:
    """Worker stops when stop_event is set."""

    @patch(f"{_MOD}.claim_job")
    def test_stops_immediately_when_stop_event_set(self, mock_claim):
        """Worker should not claim any jobs if stop_event is already set."""
        config = _make_config()
        stats = _make_stats()
        stop_event = Event()
        stop_event.set()

        worker_loop("w-1", config, stats, MagicMock(), MagicMock(), stop_event)

        mock_claim.assert_not_called()
        assert stats.total_done == 0


class TestWorkerLoopNoJobs:
    """Worker stops when no jobs available (claim returns None)."""

    @patch(f"{_MOD}.claim_job", return_value=None)
    def test_stops_when_claim_returns_none(self, mock_claim):
        """Worker should exit loop when no jobs are available."""
        config = _make_config()
        stats = _make_stats()
        stop_event = Event()

        worker_loop("w-1", config, stats, MagicMock(), MagicMock(), stop_event)

        mock_claim.assert_called_once()
        assert stats.total_done == 0


class TestWorkerLoopMaxJobs:
    """Worker stops when max_jobs reached."""

    @patch(f"{_MOD}.claim_job")
    def test_stops_when_max_jobs_reached(self, mock_claim):
        """Worker should stop claiming when total_done >= max_jobs."""
        config = _make_config(max_jobs=2)
        stats = _make_stats()
        # Pre-set stats to simulate 2 already done
        stats.success = 2
        stop_event = Event()

        worker_loop("w-1", config, stats, MagicMock(), MagicMock(), stop_event)

        mock_claim.assert_not_called()

    @patch(f"{_MOD}.mark_job_status")
    @patch(f"{_MOD}.pre_check", return_value=("deferred", None, "contact_sheet"))
    @patch(f"{_MOD}.claim_job")
    def test_stops_after_processing_max_jobs(self, mock_claim, mock_pre, mock_mark):
        """Worker processes up to max_jobs then stops."""
        config = _make_config(max_jobs=2)
        stats = _make_stats()
        stop_event = Event()

        # Return 3 jobs but max_jobs=2 should stop after 2
        mock_claim.side_effect = [
            _SAMPLE_JOB.copy(),
            _SAMPLE_JOB.copy(),
            _SAMPLE_JOB.copy(),
        ]

        worker_loop("w-1", config, stats, MagicMock(), MagicMock(), stop_event)

        assert stats.blocked == 2
        assert stats.total_done == 2


class TestWorkerLoopDeferred:
    """Contact-sheet job increments stats.blocked (mapped from deferred)."""

    @patch(f"{_MOD}.mark_job_status")
    @patch(f"{_MOD}.pre_check", return_value=("deferred", None, "contact_sheet"))
    @patch(f"{_MOD}.claim_job")
    def test_deferred_increments_stats(self, mock_claim, mock_pre, mock_mark):
        """When pre_check returns deferred, stats.blocked should increment."""
        config = _make_config()
        stats = _make_stats()
        stop_event = Event()

        # Return one job, then None to stop
        mock_claim.side_effect = [_SAMPLE_JOB.copy(), None]

        worker_loop("w-1", config, stats, MagicMock(), MagicMock(), stop_event)

        assert stats.blocked == 1
        mock_mark.assert_called_once()
        call_args = mock_mark.call_args
        assert call_args[0][1] == "job-001"
        assert call_args[0][2] == "blocked"
        assert call_args[0][3] == "contact_sheet"


class TestWorkerLoopFileNotFound:
    """File not found increments stats.error."""

    @patch(f"{_MOD}.mark_job_status")
    @patch(f"{_MOD}.pre_check", return_value=("error", None, "file_not_found"))
    @patch(f"{_MOD}.claim_job")
    def test_file_not_found_increments_error(self, mock_claim, mock_pre, mock_mark):
        """When pre_check returns error, stats.error should increment."""
        config = _make_config()
        stats = _make_stats()
        stop_event = Event()

        mock_claim.side_effect = [_SAMPLE_JOB.copy(), None]

        worker_loop("w-1", config, stats, MagicMock(), MagicMock(), stop_event)

        assert stats.error == 1
        # Verify mark_job_status was called with error status
        mock_mark.assert_called_once()
        call_args = mock_mark.call_args
        assert call_args[0][2] == "error"
        assert call_args[0][3] == "file_not_found"


class TestWorkerLoopDryRun:
    """Dry-run skips API call and DB submit."""

    @patch(f"{_MOD}.submit_result")
    @patch(f"{_MOD}.call_vlm_with_retry")
    @patch(f"{_MOD}.pre_check")
    @patch(f"{_MOD}.claim_job")
    def test_dry_run_skips_api_and_submit(
        self, mock_claim, mock_pre, mock_vlm, mock_submit,
    ):
        """In dry-run mode, API call and submit should not be called."""
        config = _make_config(dry_run=True)
        stats = _make_stats()
        stop_event = Event()

        mock_claim.side_effect = [_SAMPLE_JOB.copy(), None]
        mock_pre.return_value = ("ok", Path("/fake/assets/q01.png"), None)

        worker_loop("w-1", config, stats, MagicMock(), MagicMock(), stop_event)

        mock_vlm.assert_not_called()
        mock_submit.assert_not_called()
        assert stats.success == 1


class TestWorkerLoopSuccessFlow:
    """Successful flow increments stats.success."""

    @patch(f"{_MOD}.submit_result", return_value="done")
    @patch(f"{_MOD}.parse_response", return_value=_SAMPLE_RESULT.copy())
    @patch(f"{_MOD}.call_vlm_with_retry", return_value=('{"ok": true}', 100, 50))
    @patch(f"{_MOD}.pre_check")
    @patch(f"{_MOD}.claim_job")
    def test_success_increments_stats(
        self, mock_claim, mock_pre, mock_vlm, mock_parse, mock_submit,
    ):
        """Full successful flow should increment success and token counts."""
        config = _make_config()
        stats = _make_stats()
        stop_event = Event()

        mock_claim.side_effect = [_SAMPLE_JOB.copy(), None]
        mock_pre.return_value = ("ok", Path("/fake/assets/q01.png"), None)

        worker_loop("w-1", config, stats, MagicMock(), MagicMock(), stop_event)

        assert stats.success == 1
        assert stats.api_calls == 1
        assert stats.input_tokens == 100
        assert stats.output_tokens == 50

    @patch(f"{_MOD}.submit_result", return_value="blocked")
    @patch(f"{_MOD}.parse_response", return_value=_SAMPLE_RESULT.copy())
    @patch(f"{_MOD}.call_vlm_with_retry", return_value=('{"ok": true}', 100, 50))
    @patch(f"{_MOD}.pre_check")
    @patch(f"{_MOD}.claim_job")
    def test_blocked_result_increments_blocked(
        self, mock_claim, mock_pre, mock_vlm, mock_parse, mock_submit,
    ):
        """When submit_result returns 'blocked', stats.blocked should increment."""
        config = _make_config()
        stats = _make_stats()
        stop_event = Event()

        mock_claim.side_effect = [_SAMPLE_JOB.copy(), None]
        mock_pre.return_value = ("ok", Path("/fake/assets/q01.png"), None)

        worker_loop("w-1", config, stats, MagicMock(), MagicMock(), stop_event)

        assert stats.blocked == 1


class TestWorkerLoopParseFailure:
    """Parse failure increments stats.error."""

    @patch(f"{_MOD}.mark_job_status")
    @patch(f"{_MOD}.parse_response", return_value=None)
    @patch(f"{_MOD}.call_vlm_with_retry", return_value=("not json", 100, 50))
    @patch(f"{_MOD}.pre_check")
    @patch(f"{_MOD}.claim_job")
    def test_parse_failure_increments_error(
        self, mock_claim, mock_pre, mock_vlm, mock_parse, mock_mark,
    ):
        """When parse_response returns None, stats.error should increment."""
        config = _make_config()
        stats = _make_stats()
        stop_event = Event()

        mock_claim.side_effect = [_SAMPLE_JOB.copy(), None]
        mock_pre.return_value = ("ok", Path("/fake/assets/q01.png"), None)

        worker_loop("w-1", config, stats, MagicMock(), MagicMock(), stop_event)

        assert stats.error == 1
        assert mock_vlm.call_count == 2
        assert mock_parse.call_count == 2
        assert stats.api_calls == 2
        # Verify mark_job_status was called with parse_failed
        mock_mark.assert_called_once()
        call_args = mock_mark.call_args
        assert call_args[0][2] == "error"
        assert call_args[0][3] == "parse_failed"


class TestWorkerLoopApiError:
    """API error is caught and logged."""

    @patch(f"{_MOD}._error_logger")
    @patch(f"{_MOD}.call_vlm_with_retry", side_effect=RuntimeError("API timeout"))
    @patch(f"{_MOD}.pre_check")
    @patch(f"{_MOD}.claim_job")
    def test_api_error_caught_and_logged(
        self, mock_claim, mock_pre, mock_vlm, mock_logger,
    ):
        """When call_vlm_with_retry raises, error should be caught and logged."""
        config = _make_config()
        stats = _make_stats()
        stop_event = Event()

        mock_claim.side_effect = [_SAMPLE_JOB.copy(), None]
        mock_pre.return_value = ("ok", Path("/fake/assets/q01.png"), None)

        worker_loop("w-1", config, stats, MagicMock(), MagicMock(), stop_event)

        assert stats.error == 1
        mock_logger.error.assert_called_once()
        # Verify the error message contains the worker id and exception info
        log_args = mock_logger.error.call_args
        assert "w-1" in str(log_args)
