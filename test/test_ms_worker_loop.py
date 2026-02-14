"""Tests for Stats, ms_worker_loop, structured error logging, and main().

Covers Task 7.1 requirements: Stats thread-safe counter, worker loop
integration (claim → VLM → parse → persist), dry-run mode, SIGINT/SIGTERM
graceful shutdown, structured error logging, and summary statistics.

Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
"""
from __future__ import annotations

import json
import logging
import time
from threading import Event
from unittest.mock import MagicMock, patch

import pytest

from scripts.ms.ms_batch_process import (
    MSConfig,
    Stats,
    _log_structured_error,
    _mark_job_error,
    ms_worker_loop,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_mock_pool():
    pool = MagicMock()
    conn = MagicMock()
    cursor = MagicMock()
    pool.getconn.return_value = conn
    conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
    conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
    return pool, conn, cursor


def _make_job(job_id="job-1", storage_key="ms/test.png"):
    return {
        "job_id": job_id,
        "storage_key": storage_key,
        "sha256": "abc123",
        "paper_id": None,
        "syllabus_code": "9709",
        "session": "m",
        "year": 2023,
        "paper": 1,
        "variant": 1,
        "q_number": 1,
        "subpart": None,
        "extractor_version": "v1",
        "provider": "dashscope",
        "model": "qwen-vl-max",
        "prompt_version": "ms_v1",
        "attempts": 1,
    }


# ===================================================================
# Stats tests
# ===================================================================

class TestStats:
    def test_initial_values(self):
        s = Stats()
        assert s.total_jobs == 0
        assert s.done == 0
        assert s.error == 0
        assert s.needs_review == 0
        assert s.api_calls == 0
        assert s.input_tokens == 0
        assert s.output_tokens == 0

    def test_increment_single(self):
        s = Stats()
        s.increment("done")
        assert s.done == 1

    def test_increment_amount(self):
        s = Stats()
        s.increment("input_tokens", 500)
        assert s.input_tokens == 500

    def test_increment_multiple_fields(self):
        s = Stats()
        s.increment("total_jobs")
        s.increment("done")
        s.increment("api_calls")
        assert s.total_jobs == 1
        assert s.done == 1
        assert s.api_calls == 1

    def test_get_summary_keys(self):
        s = Stats()
        summary = s.get_summary()
        expected_keys = {
            "total_jobs", "done", "error", "needs_review",
            "api_calls", "input_tokens", "output_tokens",
            "estimated_cost", "elapsed_seconds",
        }
        assert set(summary.keys()) == expected_keys

    def test_get_summary_values_match(self):
        s = Stats()
        s.increment("total_jobs", 5)
        s.increment("done", 3)
        s.increment("error", 2)
        summary = s.get_summary()
        assert summary["total_jobs"] == 5
        assert summary["done"] == 3
        assert summary["error"] == 2

    def test_estimated_cost_calculation(self):
        s = Stats()
        s.increment("input_tokens", 1000)
        s.increment("output_tokens", 1000)
        summary = s.get_summary()
        # Default: $0.003/1K input + $0.006/1K output = $0.009
        assert summary["estimated_cost"] == pytest.approx(0.009, abs=0.001)

    def test_summary_str_contains_fields(self):
        s = Stats()
        s.increment("total_jobs", 10)
        s.increment("done", 8)
        s.increment("error", 2)
        text = s.summary_str()
        assert "Total jobs:" in text
        assert "Done:" in text
        assert "Error:" in text
        assert "10" in text
        assert "8" in text

    def test_maybe_log_progress_at_10(self, caplog):
        s = Stats()
        with caplog.at_level(logging.INFO):
            for i in range(9):
                s.increment("total_jobs")
            # At 9, no log
            assert "[progress]" not in caplog.text
            s.increment("total_jobs")
            # At 10, should log
            s.maybe_log_progress()
            assert "[progress]" in caplog.text


# ===================================================================
# _mark_job_error tests
# ===================================================================

class TestMarkJobError:
    def test_executes_update(self):
        pool, conn, cursor = _make_mock_pool()
        _mark_job_error(pool, "job-1", "some error")
        cursor.execute.assert_called_once()
        params = cursor.execute.call_args[0][1]
        assert params["job_id"] == "job-1"
        assert params["last_error"] == "some error"
        conn.commit.assert_called_once()

    def test_truncates_long_error(self):
        pool, conn, cursor = _make_mock_pool()
        long_msg = "x" * 1000
        _mark_job_error(pool, "job-1", long_msg)
        params = cursor.execute.call_args[0][1]
        assert len(params["last_error"]) == 500

    def test_conn_returned_on_exception(self):
        pool, conn, cursor = _make_mock_pool()
        cursor.execute.side_effect = Exception("db down")
        _mark_job_error(pool, "job-1", "err")
        pool.putconn.assert_called_once_with(conn)


# ===================================================================
# _log_structured_error tests
# ===================================================================

class TestLogStructuredError:
    def test_logs_json_with_required_fields(self, caplog):
        with caplog.at_level(logging.ERROR, logger="scripts.ms.ms_batch_process.errors"):
            _log_structured_error("job-1", "ms/test.png", "vlm_call_failed", "timeout")

        assert len(caplog.records) == 1
        entry = json.loads(caplog.records[0].message)
        assert entry["job_id"] == "job-1"
        assert entry["storage_key"] == "ms/test.png"
        assert entry["error_code"] == "vlm_call_failed"
        assert entry["error_message"] == "timeout"


# ===================================================================
# ms_worker_loop tests
# ===================================================================

class TestMsWorkerLoop:
    """Tests for the worker loop integration."""

    def test_stops_when_no_jobs(self):
        """Worker exits when claim returns None."""
        pool, conn, cursor = _make_mock_pool()
        config = MSConfig()
        stats = Stats()
        stop_event = Event()

        with patch("scripts.ms.ms_batch_process.claim_ms_job", return_value=None):
            ms_worker_loop("w0", config, stats, pool, None, stop_event)

        assert stats.total_jobs == 0

    def test_stops_on_stop_event(self):
        """Worker exits when stop_event is set."""
        pool, conn, cursor = _make_mock_pool()
        config = MSConfig()
        stats = Stats()
        stop_event = Event()
        stop_event.set()

        ms_worker_loop("w0", config, stats, pool, None, stop_event)
        assert stats.total_jobs == 0

    def test_stops_at_max_jobs(self):
        """Worker exits when max_jobs is reached."""
        pool, conn, cursor = _make_mock_pool()
        config = MSConfig(max_jobs=0)
        stats = Stats()
        stop_event = Event()

        ms_worker_loop("w0", config, stats, pool, None, stop_event)
        assert stats.total_jobs == 0

    def test_dry_run_skips_api_and_db(self):
        """Dry-run mode increments done without calling VLM or persist."""
        pool, conn, cursor = _make_mock_pool()
        config = MSConfig(dry_run=True, max_jobs=2)
        stats = Stats()
        stop_event = Event()

        call_count = [0]
        def fake_claim(p, wid, cfg):
            call_count[0] += 1
            if call_count[0] <= 2:
                return _make_job(f"job-{call_count[0]}")
            return None

        with patch("scripts.ms.ms_batch_process.claim_ms_job", side_effect=fake_claim):
            ms_worker_loop("w0", config, stats, pool, None, stop_event)

        assert stats.total_jobs == 2
        assert stats.done == 2
        assert stats.api_calls == 0

    def test_successful_flow(self):
        """Full claim → VLM → parse → persist flow."""
        pool, conn, cursor = _make_mock_pool()
        config = MSConfig(max_jobs=1)
        stats = Stats()
        stop_event = Event()
        client = MagicMock()

        job = _make_job()
        vlm_result = {"raw_text": '{"rubric_points":[]}', "input_tokens": 100, "output_tokens": 50}

        call_count = [0]
        def fake_claim(p, wid, cfg):
            call_count[0] += 1
            if call_count[0] == 1:
                return job
            return None

        with patch("scripts.ms.ms_batch_process.claim_ms_job", side_effect=fake_claim), \
             patch("scripts.ms.ms_vlm_call.call_ms_vlm_with_retry", return_value=vlm_result), \
             patch("scripts.ms.ms_prompt.parse_ms_response", return_value=[{"mark_label": "M1"}]), \
             patch("scripts.ms.ms_persist.compute_response_sha256", return_value="sha256abc"), \
             patch("scripts.ms.ms_persist.persist_rubric_points", return_value="done"):
            ms_worker_loop("w0", config, stats, pool, client, stop_event, run_id="run-1")

        assert stats.total_jobs == 1
        assert stats.done == 1
        assert stats.api_calls == 1
        assert stats.input_tokens == 100
        assert stats.output_tokens == 50

    def test_starts_heartbeat_loop_for_running_job(self):
        """Worker starts heartbeat background loop while a job is running."""
        pool, conn, cursor = _make_mock_pool()
        config = MSConfig(max_jobs=1)
        stats = Stats()
        stop_event = Event()
        client = MagicMock()

        job = _make_job()
        vlm_result = {"raw_text": '{"rubric_points":[]}', "input_tokens": 10, "output_tokens": 5}

        call_count = [0]

        def fake_claim(p, wid, cfg):
            call_count[0] += 1
            if call_count[0] == 1:
                return job
            return None

        with patch("scripts.ms.ms_batch_process.claim_ms_job", side_effect=fake_claim), \
             patch("scripts.ms.ms_vlm_call.call_ms_vlm_with_retry", return_value=vlm_result), \
             patch("scripts.ms.ms_prompt.parse_ms_response", return_value=[{"mark_label": "M1"}]), \
             patch("scripts.ms.ms_persist.compute_response_sha256", return_value="sha256abc"), \
             patch("scripts.ms.ms_persist.persist_rubric_points", return_value="done"), \
             patch("scripts.ms.ms_batch_process._job_heartbeat_loop") as hb_loop:
            ms_worker_loop("w0", config, stats, pool, client, stop_event, run_id="run-1")

        hb_loop.assert_called_once()
        assert stats.done == 1

    def test_vlm_call_failure_marks_error(self):
        """VLM call failure marks job as error and logs structured error."""
        pool, conn, cursor = _make_mock_pool()
        config = MSConfig(max_jobs=1)
        stats = Stats()
        stop_event = Event()
        client = MagicMock()

        call_count = [0]
        def fake_claim(p, wid, cfg):
            call_count[0] += 1
            if call_count[0] == 1:
                return _make_job()
            return None

        with patch("scripts.ms.ms_batch_process.claim_ms_job", side_effect=fake_claim), \
             patch("scripts.ms.ms_vlm_call.call_ms_vlm_with_retry", side_effect=Exception("API down")), \
             patch("scripts.ms.ms_batch_process._mark_job_error") as mock_mark:
            ms_worker_loop("w0", config, stats, pool, client, stop_event, run_id="run-1")

        assert stats.error == 1
        assert stats.total_jobs == 1
        mock_mark.assert_called_once()

    def test_parse_failure_marks_error(self):
        """Parse failure marks job as error."""
        pool, conn, cursor = _make_mock_pool()
        config = MSConfig(max_jobs=1)
        stats = Stats()
        stop_event = Event()
        client = MagicMock()

        vlm_result = {"raw_text": "not json", "input_tokens": 50, "output_tokens": 20}

        call_count = [0]
        def fake_claim(p, wid, cfg):
            call_count[0] += 1
            if call_count[0] == 1:
                return _make_job()
            return None

        with patch("scripts.ms.ms_batch_process.claim_ms_job", side_effect=fake_claim), \
             patch("scripts.ms.ms_vlm_call.call_ms_vlm_with_retry", return_value=vlm_result), \
             patch("scripts.ms.ms_prompt.parse_ms_response", return_value=None), \
             patch("scripts.ms.ms_batch_process._mark_job_error") as mock_mark:
            ms_worker_loop("w0", config, stats, pool, client, stop_event, run_id="run-1")

        assert stats.error == 1
        assert stats.api_calls == 1

    def test_persist_failure_marks_error(self):
        """Persist exception increments error counter."""
        pool, conn, cursor = _make_mock_pool()
        config = MSConfig(max_jobs=1)
        stats = Stats()
        stop_event = Event()
        client = MagicMock()

        vlm_result = {"raw_text": '{}', "input_tokens": 10, "output_tokens": 5}

        call_count = [0]
        def fake_claim(p, wid, cfg):
            call_count[0] += 1
            if call_count[0] == 1:
                return _make_job()
            return None

        with patch("scripts.ms.ms_batch_process.claim_ms_job", side_effect=fake_claim), \
             patch("scripts.ms.ms_vlm_call.call_ms_vlm_with_retry", return_value=vlm_result), \
             patch("scripts.ms.ms_prompt.parse_ms_response", return_value=[{"mark_label": "M1"}]), \
             patch("scripts.ms.ms_persist.compute_response_sha256", return_value="sha"), \
             patch("scripts.ms.ms_persist.persist_rubric_points", side_effect=Exception("db error")):
            ms_worker_loop("w0", config, stats, pool, client, stop_event, run_id="run-1")

        assert stats.error == 1

    def test_needs_review_counted(self):
        """Invalid labels increment needs_review counter after persist."""
        pool, conn, cursor = _make_mock_pool()
        config = MSConfig(max_jobs=1)
        stats = Stats()
        stop_event = Event()
        client = MagicMock()

        vlm_result = {"raw_text": '{}', "input_tokens": 10, "output_tokens": 5}
        # parse_ms_response output does not carry DB status; invalid label
        # should still be counted as a needs_review candidate.
        points = [{"mark_label": "X1"}]

        call_count = [0]
        def fake_claim(p, wid, cfg):
            call_count[0] += 1
            if call_count[0] == 1:
                return _make_job()
            return None

        with patch("scripts.ms.ms_batch_process.claim_ms_job", side_effect=fake_claim), \
             patch("scripts.ms.ms_vlm_call.call_ms_vlm_with_retry", return_value=vlm_result), \
             patch("scripts.ms.ms_prompt.parse_ms_response", return_value=points), \
             patch("scripts.ms.ms_persist.compute_response_sha256", return_value="sha"), \
             patch("scripts.ms.ms_persist.persist_rubric_points", return_value="done"):
            ms_worker_loop("w0", config, stats, pool, client, stop_event, run_id="run-1")

        assert stats.done == 1
        assert stats.needs_review == 1


# ===================================================================
# main() tests
# ===================================================================

class TestMain:
    def test_dry_run_returns_zero(self):
        """Dry-run mode prints plan and returns 0 without DB/API."""
        from scripts.ms.ms_batch_process import main
        result = main(["--dry-run"])
        assert result == 0

    def test_missing_api_key_returns_1(self):
        """Missing API key returns exit code 1."""
        from scripts.ms.ms_batch_process import main
        with patch.dict("os.environ", {}, clear=True):
            # Remove any existing keys
            import os
            env_backup = {}
            for k in ("DASHSCOPE_API_KEY", "OPENAI_API_KEY", "DATABASE_URL", "SUPABASE_DB_URL"):
                if k in os.environ:
                    env_backup[k] = os.environ.pop(k)
            try:
                result = main(["--workers", "1"])
                assert result == 1
            finally:
                os.environ.update(env_backup)
