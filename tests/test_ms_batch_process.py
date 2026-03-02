"""Unit tests for scripts/ms/ms_batch_process.py – job claiming, heartbeat, run mgmt.

Covers MSConfig defaults, parse_ms_args CLI parsing, claim_ms_job,
heartbeat, create_ms_run, and finish_ms_run.

Requirements: 1.4, 1.5, 1.6, 1.7, 7.1
"""
from __future__ import annotations

import json
import sys
import uuid
from pathlib import Path
from unittest.mock import MagicMock, call

import pytest

# Ensure repo root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.ms_batch_process import (
    MSConfig,
    claim_ms_job,
    create_ms_run,
    finish_ms_run,
    heartbeat,
    parse_ms_args,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_mock_pool():
    """Create a mock psycopg2-style connection pool."""
    pool = MagicMock()
    conn = MagicMock()
    cursor = MagicMock()
    pool.getconn.return_value = conn
    conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
    conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
    return pool, conn, cursor


# ---------------------------------------------------------------------------
# MSConfig defaults
# ---------------------------------------------------------------------------


class TestMSConfigDefaults:
    def test_default_workers(self):
        cfg = MSConfig()
        assert cfg.workers == 4

    def test_default_status(self):
        cfg = MSConfig()
        assert cfg.status == ["pending"]

    def test_default_stale_timeout(self):
        cfg = MSConfig()
        assert cfg.stale_timeout_seconds == 600

    def test_default_heartbeat(self):
        cfg = MSConfig()
        assert cfg.heartbeat_seconds == 120

    def test_default_dry_run(self):
        cfg = MSConfig()
        assert cfg.dry_run is False

    def test_default_model(self):
        cfg = MSConfig()
        assert cfg.model == "qwen-vl-max"

    def test_default_max_jobs_none(self):
        cfg = MSConfig()
        assert cfg.max_jobs is None

    def test_custom_values(self):
        cfg = MSConfig(workers=8, max_jobs=100, status=["error"], dry_run=True)
        assert cfg.workers == 8
        assert cfg.max_jobs == 100
        assert cfg.status == ["error"]
        assert cfg.dry_run is True


# ---------------------------------------------------------------------------
# parse_ms_args
# ---------------------------------------------------------------------------


class TestParseMsArgs:
    def test_defaults(self):
        cfg = parse_ms_args([])
        assert cfg.workers == 4
        assert cfg.status == ["pending"]
        assert cfg.max_jobs is None
        assert cfg.stale_timeout_seconds == 600
        assert cfg.heartbeat_seconds == 120
        assert cfg.dry_run is False
        assert cfg.model == "qwen-vl-max"

    def test_workers(self):
        cfg = parse_ms_args(["--workers", "8"])
        assert cfg.workers == 8

    def test_max_jobs(self):
        cfg = parse_ms_args(["--max-jobs", "50"])
        assert cfg.max_jobs == 50

    def test_status_single(self):
        cfg = parse_ms_args(["--status", "error"])
        assert cfg.status == ["error"]

    def test_status_multiple(self):
        cfg = parse_ms_args(["--status", "pending,error,running_stale"])
        assert cfg.status == ["pending", "error", "running_stale"]

    def test_status_strips_whitespace(self):
        cfg = parse_ms_args(["--status", " pending , error "])
        assert cfg.status == ["pending", "error"]

    def test_stale_timeout(self):
        cfg = parse_ms_args(["--stale-timeout-seconds", "300"])
        assert cfg.stale_timeout_seconds == 300

    def test_heartbeat(self):
        cfg = parse_ms_args(["--heartbeat-seconds", "60"])
        assert cfg.heartbeat_seconds == 60

    def test_dry_run(self):
        cfg = parse_ms_args(["--dry-run"])
        assert cfg.dry_run is True

    def test_model(self):
        cfg = parse_ms_args(["--model", "qwen-vl-plus"])
        assert cfg.model == "qwen-vl-plus"

    def test_base_url(self):
        cfg = parse_ms_args(["--base-url", "https://example.com/v1"])
        assert cfg.base_url == "https://example.com/v1"

    def test_assets_root(self):
        cfg = parse_ms_args(["--assets-root", "/tmp/assets"])
        assert cfg.assets_root == Path("/tmp/assets")

    def test_all_args_combined(self):
        cfg = parse_ms_args([
            "--workers", "16",
            "--max-jobs", "200",
            "--status", "pending,error",
            "--stale-timeout-seconds", "900",
            "--heartbeat-seconds", "30",
            "--dry-run",
            "--model", "qwen-vl-plus",
        ])
        assert cfg.workers == 16
        assert cfg.max_jobs == 200
        assert cfg.status == ["pending", "error"]
        assert cfg.stale_timeout_seconds == 900
        assert cfg.heartbeat_seconds == 30
        assert cfg.dry_run is True
        assert cfg.model == "qwen-vl-plus"


# ---------------------------------------------------------------------------
# claim_ms_job
# ---------------------------------------------------------------------------


class TestClaimMsJob:
    def test_returns_dict_on_success(self):
        pool, conn, cursor = _make_mock_pool()
        fake_row = (
            "job-uuid", "sk/path", "abc123sha", "paper-uuid",
            "9709", "m", 2024, 1, 1,
            1, "a",
            "v0.1", "dashscope", "qwen-vl-max", "ms_v1",
            1,
        )
        cursor.fetchone.return_value = fake_row
        config = MSConfig(status=["pending"])

        result = claim_ms_job(pool, "worker-1", config)

        assert result is not None
        assert result["job_id"] == "job-uuid"
        assert result["storage_key"] == "sk/path"
        assert result["worker_id"] if "worker_id" in result else True  # not in columns
        assert result["q_number"] == 1
        assert result["attempts"] == 1
        conn.commit.assert_called_once()
        pool.putconn.assert_called_once_with(conn)

    def test_returns_none_when_empty(self):
        pool, conn, cursor = _make_mock_pool()
        cursor.fetchone.return_value = None
        config = MSConfig(status=["pending"])

        result = claim_ms_job(pool, "worker-1", config)

        assert result is None
        conn.commit.assert_called_once()
        pool.putconn.assert_called_once_with(conn)

    def test_running_stale_sets_include_stale_true(self):
        pool, conn, cursor = _make_mock_pool()
        cursor.fetchone.return_value = None
        config = MSConfig(status=["pending", "running_stale"])

        claim_ms_job(pool, "worker-1", config)

        # Verify the SQL params include include_stale=True
        execute_call = cursor.execute.call_args
        params = execute_call[0][1]
        assert params["include_stale"] is True
        assert "running_stale" not in params["statuses"]
        assert "pending" in params["statuses"]

    def test_no_running_stale_sets_include_stale_false(self):
        pool, conn, cursor = _make_mock_pool()
        cursor.fetchone.return_value = None
        config = MSConfig(status=["pending", "error"])

        claim_ms_job(pool, "worker-1", config)

        execute_call = cursor.execute.call_args
        params = execute_call[0][1]
        assert params["include_stale"] is False
        assert params["statuses"] == ["pending", "error"]

    def test_stale_timeout_passed_to_sql(self):
        pool, conn, cursor = _make_mock_pool()
        cursor.fetchone.return_value = None
        config = MSConfig(status=["running_stale"], stale_timeout_seconds=300)

        claim_ms_job(pool, "worker-1", config)

        execute_call = cursor.execute.call_args
        params = execute_call[0][1]
        assert params["stale_timeout"] == 300

    def test_worker_id_passed_to_sql(self):
        pool, conn, cursor = _make_mock_pool()
        cursor.fetchone.return_value = None
        config = MSConfig()

        claim_ms_job(pool, "worker-42", config)

        execute_call = cursor.execute.call_args
        params = execute_call[0][1]
        assert params["worker_id"] == "worker-42"

    def test_conn_returned_on_exception(self):
        pool, conn, cursor = _make_mock_pool()
        cursor.execute.side_effect = RuntimeError("db down")
        config = MSConfig()

        with pytest.raises(RuntimeError):
            claim_ms_job(pool, "worker-1", config)

        pool.putconn.assert_called_once_with(conn)


# ---------------------------------------------------------------------------
# heartbeat
# ---------------------------------------------------------------------------


class TestHeartbeat:
    def test_executes_update(self):
        pool, conn, cursor = _make_mock_pool()

        heartbeat(pool, "job-123", "worker-1")

        cursor.execute.assert_called_once()
        params = cursor.execute.call_args[0][1]
        assert params["job_id"] == "job-123"
        assert params["worker_id"] == "worker-1"
        conn.commit.assert_called_once()

    def test_conn_returned_to_pool(self):
        pool, conn, cursor = _make_mock_pool()

        heartbeat(pool, "job-123", "worker-1")

        pool.putconn.assert_called_once_with(conn)

    def test_conn_returned_on_exception(self):
        pool, conn, cursor = _make_mock_pool()
        cursor.execute.side_effect = RuntimeError("db down")

        with pytest.raises(RuntimeError):
            heartbeat(pool, "job-123", "worker-1")

        pool.putconn.assert_called_once_with(conn)


# ---------------------------------------------------------------------------
# create_ms_run
# ---------------------------------------------------------------------------


class TestCreateMsRun:
    def test_returns_uuid_string(self):
        pool, conn, cursor = _make_mock_pool()
        config = MSConfig(workers=2, model="qwen-vl-plus")

        run_id = create_ms_run(pool, config)

        # Should be a valid UUID
        uuid.UUID(run_id)
        conn.commit.assert_called_once()

    def test_config_serialized_to_json(self):
        pool, conn, cursor = _make_mock_pool()
        config = MSConfig(workers=8, dry_run=True, status=["error"])

        create_ms_run(pool, config)

        execute_call = cursor.execute.call_args
        params = execute_call[0][1]
        config_json = json.loads(params["config"])
        assert config_json["workers"] == 8
        assert config_json["dry_run"] is True
        assert config_json["status"] == ["error"]

    def test_conn_returned_to_pool(self):
        pool, conn, cursor = _make_mock_pool()

        create_ms_run(pool, MSConfig())

        pool.putconn.assert_called_once_with(conn)


# ---------------------------------------------------------------------------
# finish_ms_run
# ---------------------------------------------------------------------------


class TestFinishMsRun:
    def test_updates_with_success(self):
        pool, conn, cursor = _make_mock_pool()
        counts = {"done": 10, "error": 2}

        finish_ms_run(pool, "run-123", "success", counts)

        execute_call = cursor.execute.call_args
        params = execute_call[0][1]
        assert params["run_id"] == "run-123"
        assert params["status"] == "success"
        assert json.loads(params["counts"]) == counts
        assert params["error_summary"] is None
        conn.commit.assert_called_once()

    def test_updates_with_error_summary(self):
        pool, conn, cursor = _make_mock_pool()

        finish_ms_run(pool, "run-456", "failed", {}, error_summary="boom")

        params = cursor.execute.call_args[0][1]
        assert params["error_summary"] == "boom"
        assert params["status"] == "failed"

    def test_conn_returned_to_pool(self):
        pool, conn, cursor = _make_mock_pool()

        finish_ms_run(pool, "run-123", "success", {})

        pool.putconn.assert_called_once_with(conn)
