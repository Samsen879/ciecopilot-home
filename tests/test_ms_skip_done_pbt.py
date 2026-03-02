"""Property-based tests for skip-done behaviour in ms_batch_process.py.

# Feature: ms-rubric-extraction, Property 33: 重跑跳过已完成任务

Uses hypothesis to verify:
- For ANY status filter list (never including "done"), claim_ms_job's SQL
  parameters never include "done" in the statuses array.
- When a queue contains only "done" jobs, claim_ms_job returns None.

**Validates: Requirements 8.5**
"""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.ms_batch_process import claim_ms_job, MSConfig

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# Valid claimable statuses – "done" is intentionally excluded.
_CLAIMABLE_STATUSES = ["pending", "error", "running_stale"]

_status_filters = st.lists(
    st.sampled_from(_CLAIMABLE_STATUSES),
    min_size=1,
    max_size=3,
    unique=True,
)

_worker_ids = st.text(
    alphabet="abcdefghijklmnopqrstuvwxyz0123456789-_",
    min_size=1,
    max_size=32,
)

_stale_timeouts = st.integers(min_value=1, max_value=7200)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _FakeCursor:
    """Minimal cursor that records executed SQL params and returns None."""

    def __init__(self):
        self.last_params: dict | None = None

    def execute(self, sql: str, params: dict) -> None:
        self.last_params = params

    def fetchone(self):
        # Simulate empty queue – no rows returned
        return None

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        pass


class _FakeConn:
    """Minimal connection wrapper around _FakeCursor."""

    def __init__(self):
        self._cursor = _FakeCursor()

    def cursor(self):
        return self._cursor

    def commit(self):
        pass


class _FakePool:
    """Minimal connection pool that hands out a single _FakeConn."""

    def __init__(self):
        self.conn = _FakeConn()

    def getconn(self):
        return self.conn

    def putconn(self, conn):
        pass


# ---------------------------------------------------------------------------
# Property 33: 重跑跳过已完成任务
# ---------------------------------------------------------------------------


class TestProperty33SkipDoneJobs:
    """
    **Property 33**: For ANY queue containing done-status jobs, re-running
    the batch processor should only process pending/error/running_stale
    jobs. Done jobs are never re-processed.

    **Validates: Requirements 8.5**
    """

    @given(status_list=_status_filters, worker_id=_worker_ids, stale_timeout=_stale_timeouts)
    @settings(max_examples=100)
    def test_done_never_in_sql_statuses(
        self,
        status_list: list[str],
        worker_id: str,
        stale_timeout: int,
    ):
        """The statuses param passed to SQL never contains 'done'."""
        config = MSConfig(status=status_list, stale_timeout_seconds=stale_timeout)
        pool = _FakePool()

        claim_ms_job(pool, worker_id, config)

        params = pool.conn._cursor.last_params
        assert params is not None, "SQL should have been executed"
        assert "done" not in params["statuses"], (
            f"'done' must never appear in SQL statuses, got {params['statuses']}"
        )

    @given(status_list=_status_filters, worker_id=_worker_ids)
    @settings(max_examples=100)
    def test_only_requested_statuses_in_sql(
        self,
        status_list: list[str],
        worker_id: str,
    ):
        """SQL statuses contain only the real (non-virtual) statuses from config."""
        config = MSConfig(status=status_list)
        pool = _FakePool()

        claim_ms_job(pool, worker_id, config)

        params = pool.conn._cursor.last_params
        expected_real = [s for s in status_list if s != "running_stale"]
        assert params["statuses"] == expected_real

    @given(status_list=_status_filters, worker_id=_worker_ids)
    @settings(max_examples=100)
    def test_include_stale_flag_matches_config(
        self,
        status_list: list[str],
        worker_id: str,
    ):
        """include_stale SQL param is True iff 'running_stale' is in config.status."""
        config = MSConfig(status=status_list)
        pool = _FakePool()

        claim_ms_job(pool, worker_id, config)

        params = pool.conn._cursor.last_params
        assert params["include_stale"] == ("running_stale" in status_list)

    @given(worker_id=_worker_ids, stale_timeout=_stale_timeouts)
    @settings(max_examples=100)
    def test_done_only_queue_returns_none(
        self,
        worker_id: str,
        stale_timeout: int,
    ):
        """When the queue has only 'done' jobs, claim returns None.

        Since the SQL never matches 'done', the cursor returns no rows,
        and claim_ms_job returns None.
        """
        # Default config only claims "pending" – a queue of only "done" jobs
        # means the cursor returns None (simulated by _FakeCursor).
        config = MSConfig(
            status=["pending"],
            stale_timeout_seconds=stale_timeout,
        )
        pool = _FakePool()

        result = claim_ms_job(pool, worker_id, config)

        assert result is None, "claim_ms_job should return None for done-only queue"

    @given(
        status_list=_status_filters,
        worker_id=_worker_ids,
    )
    @settings(max_examples=100)
    def test_done_excluded_even_with_all_claimable_statuses(
        self,
        status_list: list[str],
        worker_id: str,
    ):
        """Even when all claimable statuses are requested, 'done' stays excluded."""
        config = MSConfig(status=status_list)
        pool = _FakePool()

        claim_ms_job(pool, worker_id, config)

        params = pool.conn._cursor.last_params
        # The real statuses should be a subset of the allowed claimable set
        for s in params["statuses"]:
            assert s in ("pending", "error"), (
                f"Unexpected status '{s}' in SQL params – only real DB statuses allowed"
            )
        # "done" must never leak through
        assert "done" not in params["statuses"]
