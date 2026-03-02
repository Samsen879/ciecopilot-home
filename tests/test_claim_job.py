"""Tests for claim_job() in batch_process_v0.py.

Uses mock pool objects to verify the function handles both psycopg (v3)
and psycopg2 pool drivers correctly, builds the right SQL parameters,
and returns the expected dict or None.
"""
from __future__ import annotations

import sys
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

# Ensure the project root is on sys.path so the import works
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.batch_process_v0 import claim_job, _CLAIM_COLUMNS


# ---------------------------------------------------------------------------
# Helpers – fake pool objects
# ---------------------------------------------------------------------------

_SAMPLE_ROW = (
    "00000000-0000-0000-0000-000000000001",  # job_id
    "9709/s23/qp_12/q01.png",                # storage_key
    "abc123sha256",                           # sha256
    "9709",                                   # syllabus_code
    "s23",                                    # session
    2023,                                     # year
    "qp",                                     # doc_type
    "1",                                      # paper
    "2",                                      # variant
    "1",                                      # q_number
    None,                                     # subpart
    "v0",                                     # extractor_version
    "dashscope",                              # provider
    "qwen3-vl-flash",                         # model
    "v1",                                     # prompt_version
)


def _make_psycopg_pool(row):
    """Create a mock pool that behaves like psycopg v3 ConnectionPool."""
    cur = MagicMock()
    cur.fetchone.return_value = row

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


def _make_psycopg2_pool(row):
    """Create a mock pool that behaves like psycopg2 ThreadedConnectionPool."""
    cur = MagicMock()
    cur.fetchone.return_value = row
    cur.__enter__ = lambda s: cur
    cur.__exit__ = lambda s, *a: None

    conn = MagicMock()
    conn.cursor.return_value = cur

    pool = MagicMock()
    pool._driver = "psycopg2"
    pool.getconn.return_value = conn
    return pool, conn, cur


# ---------------------------------------------------------------------------
# Tests – psycopg (v3) driver
# ---------------------------------------------------------------------------

class TestClaimJobPsycopg:
    """Tests using the psycopg (v3) pool driver."""

    def test_returns_dict_when_row_found(self):
        pool, conn, cur = _make_psycopg_pool(_SAMPLE_ROW)

        result = claim_job(pool, "worker-1", ["pending"], 10)

        assert result is not None
        assert isinstance(result, dict)
        assert result["job_id"] == "00000000-0000-0000-0000-000000000001"
        assert result["storage_key"] == "9709/s23/qp_12/q01.png"
        assert result["syllabus_code"] == "9709"
        assert result["model"] == "qwen3-vl-flash"

    def test_returns_none_when_no_row(self):
        pool, conn, cur = _make_psycopg_pool(None)

        result = claim_job(pool, "worker-1", ["pending"], 10)

        assert result is None

    def test_passes_correct_params(self):
        pool, conn, cur = _make_psycopg_pool(None)

        claim_job(pool, "worker-42", ["blocked"], 15)

        cur.execute.assert_called_once()
        _sql, params = cur.execute.call_args[0]
        assert params["worker_id"] == "worker-42"
        assert params["statuses"] == ["blocked"]
        assert params["stale_timeout"] == 15

    def test_commits_transaction(self):
        pool, conn, cur = _make_psycopg_pool(_SAMPLE_ROW)

        claim_job(pool, "worker-1", ["pending"], 10)

        conn.commit.assert_called_once()

    def test_all_columns_present_in_result(self):
        pool, conn, cur = _make_psycopg_pool(_SAMPLE_ROW)

        result = claim_job(pool, "worker-1", ["pending"], 10)

        assert result is not None
        for col in _CLAIM_COLUMNS:
            assert col in result, f"Missing column: {col}"


# ---------------------------------------------------------------------------
# Tests – psycopg2 driver
# ---------------------------------------------------------------------------

class TestClaimJobPsycopg2:
    """Tests using the psycopg2 pool driver."""

    def test_returns_dict_when_row_found(self):
        pool, conn, cur = _make_psycopg2_pool(_SAMPLE_ROW)

        result = claim_job(pool, "worker-1", ["pending"], 10)

        assert result is not None
        assert isinstance(result, dict)
        assert result["job_id"] == "00000000-0000-0000-0000-000000000001"
        assert result["storage_key"] == "9709/s23/qp_12/q01.png"

    def test_returns_none_when_no_row(self):
        pool, conn, cur = _make_psycopg2_pool(None)

        result = claim_job(pool, "worker-1", ["pending"], 10)

        assert result is None

    def test_passes_correct_params(self):
        pool, conn, cur = _make_psycopg2_pool(None)

        claim_job(pool, "worker-99", ["pending"], 20)

        cur.execute.assert_called_once()
        _sql, params = cur.execute.call_args[0]
        assert params["worker_id"] == "worker-99"
        assert params["statuses"] == ["pending"]
        assert params["stale_timeout"] == 20

    def test_commits_transaction(self):
        pool, conn, cur = _make_psycopg2_pool(_SAMPLE_ROW)

        claim_job(pool, "worker-1", ["pending"], 10)

        conn.commit.assert_called_once()

    def test_putconn_called_after_success(self):
        pool, conn, cur = _make_psycopg2_pool(_SAMPLE_ROW)

        claim_job(pool, "worker-1", ["pending"], 10)

        pool.putconn.assert_called_once_with(conn)

    def test_putconn_called_after_error(self):
        pool, conn, cur = _make_psycopg2_pool(None)
        conn.cursor.return_value.execute.side_effect = RuntimeError("db error")
        conn.cursor.return_value.__enter__ = lambda s: conn.cursor.return_value
        conn.cursor.return_value.__exit__ = lambda s, *a: None

        with pytest.raises(RuntimeError, match="db error"):
            claim_job(pool, "worker-1", ["pending"], 10)

        # Connection must be returned to pool even on error
        pool.putconn.assert_called_once_with(conn)


# ---------------------------------------------------------------------------
# Tests – driver detection fallback
# ---------------------------------------------------------------------------

class TestClaimJobDriverDetection:
    """Tests for the _driver attribute fallback logic."""

    def test_defaults_to_psycopg2_when_no_driver_attr(self):
        """When pool has no _driver attribute, should default to psycopg2 path."""
        cur = MagicMock()
        cur.fetchone.return_value = None
        cur.__enter__ = lambda s: cur
        cur.__exit__ = lambda s, *a: None

        conn = MagicMock()
        conn.cursor.return_value = cur

        pool = MagicMock(spec=[])  # no _driver attribute
        pool.getconn = MagicMock(return_value=conn)
        pool.putconn = MagicMock()

        result = claim_job(pool, "worker-1", ["pending"], 10)

        assert result is None
        pool.getconn.assert_called_once()
        pool.putconn.assert_called_once_with(conn)
# Tests – result dict structure
# ---------------------------------------------------------------------------

class TestClaimJobResultStructure:
    """Tests verifying the returned dict has the correct structure."""

    def test_result_keys_match_columns(self):
        pool, conn, cur = _make_psycopg_pool(_SAMPLE_ROW)

        result = claim_job(pool, "worker-1", ["pending"], 10)

        assert result is not None
        assert set(result.keys()) == set(_CLAIM_COLUMNS)

    def test_result_values_match_row(self):
        pool, conn, cur = _make_psycopg_pool(_SAMPLE_ROW)

        result = claim_job(pool, "worker-1", ["pending"], 10)

        assert result is not None
        for col, val in zip(_CLAIM_COLUMNS, _SAMPLE_ROW):
            assert result[col] == val, f"Mismatch for {col}: {result[col]} != {val}"

    def test_none_subpart_preserved(self):
        pool, conn, cur = _make_psycopg_pool(_SAMPLE_ROW)

        result = claim_job(pool, "worker-1", ["pending"], 10)

        assert result is not None
        assert result["subpart"] is None
