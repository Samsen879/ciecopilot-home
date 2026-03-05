"""Property-based tests for seed_ms_jobs() filtering logic.

# Feature: ms-rubric-extraction, Property 1: 任务种子过滤正确性

Uses hypothesis to verify:
- For ANY paper_assets dataset (with mixed asset_type values),
  seed_ms_jobs generates jobs ONLY for asset_type='ms_question_img' records,
  and the number of generated jobs equals the number of qualifying assets.

**Validates: Requirements 1.2**
"""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch, call

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.seed_ms_jobs import (
    seed_ms_jobs,
    _SELECT_MS_ASSETS_SQL,
    _INSERT_JOB_SQL,
)

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# Realistic asset_type values including the target and distractors
_ASSET_TYPES = [
    "ms_question_img",
    "qp_question_img",
    "ms_header_img",
    "qp_full_page",
    "ms_full_page",
    "answer_img",
]

# A single paper_asset row as returned by the SELECT query
# (storage_key, sha256, paper_id, syllabus_code, session, year, paper, variant, q_number, subpart)
_storage_keys = st.text(
    alphabet="abcdefghijklmnopqrstuvwxyz0123456789/_.",
    min_size=5,
    max_size=60,
)
_sha256s = st.text(alphabet="0123456789abcdef", min_size=64, max_size=64)
_paper_ids = st.uuids().map(str)
_syllabus_codes = st.sampled_from(["9702", "9709", "9231"])
_sessions = st.sampled_from(["s", "w", "m"])
_years = st.integers(min_value=2015, max_value=2025)
_papers = st.integers(min_value=1, max_value=6)
_variants = st.integers(min_value=1, max_value=3)
_q_numbers = st.integers(min_value=1, max_value=15)
_subparts = st.one_of(st.none(), st.sampled_from(["a", "b", "c", "i", "ii"]))

_asset_row = st.tuples(
    _storage_keys,
    _sha256s,
    _paper_ids,
    _syllabus_codes,
    _sessions,
    _years,
    _papers,
    _variants,
    _q_numbers,
    _subparts,
)

# A tagged asset: (asset_type, row) — asset_type is used for test logic only
_tagged_asset = st.tuples(
    st.sampled_from(_ASSET_TYPES),
    _asset_row,
)

# A mixed list of tagged assets (1–30 items)
_mixed_assets = st.lists(_tagged_asset, min_size=1, max_size=30)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_mock_connection(ms_rows: list[tuple], insert_rowcount: int = 1):
    """Build a mock DB connection.

    The SELECT cursor returns *ms_rows* (pre-filtered by the DB).
    The INSERT cursor tracks every execute() call.
    """
    conn = MagicMock()
    select_cur = MagicMock()
    select_cur.fetchall.return_value = ms_rows

    insert_cur = MagicMock()
    insert_cur.rowcount = insert_rowcount

    call_idx = [0]

    def cursor_side_effect():
        ctx = MagicMock()
        idx = call_idx[0]
        call_idx[0] += 1
        if idx == 0:
            ctx.__enter__ = MagicMock(return_value=select_cur)
        else:
            ctx.__enter__ = MagicMock(return_value=insert_cur)
        ctx.__exit__ = MagicMock(return_value=False)
        return ctx

    conn.cursor.side_effect = cursor_side_effect
    return conn, select_cur, insert_cur


# ---------------------------------------------------------------------------
# Property 1: 任务种子过滤正确性
# ---------------------------------------------------------------------------


class TestProperty1SeedFilterCorrectness:
    """
    **Property 1**: For ANY paper_assets dataset (with mixed asset_type),
    seed_ms_jobs generates jobs ONLY for asset_type='ms_question_img'
    records, and the generated job count equals the number of qualifying
    assets.

    The SQL in seed_ms_jobs.py filters via
    ``WHERE pa.asset_type = 'ms_question_img'``.
    We verify:
    1. The SELECT query contains the correct WHERE clause
    2. The number of INSERT attempts equals the number of assets returned
       by the filtered query (i.e. the DB-filtered ms_question_img rows)
    3. No non-ms_question_img assets are processed

    **Validates: Requirements 1.2**
    """

    # ---- Sub-property 1a: SQL contains correct filter ----

    def test_select_sql_filters_ms_question_img(self):
        """The SELECT SQL must contain the asset_type filter."""
        assert "asset_type = 'ms_question_img'" in _SELECT_MS_ASSETS_SQL, (
            "SELECT SQL does not filter by asset_type='ms_question_img'"
        )

    # ---- Sub-property 1b: INSERT count equals filtered asset count ----

    @given(tagged_assets=_mixed_assets)
    @settings(max_examples=100)
    def test_insert_count_equals_filtered_asset_count(
        self, tagged_assets: list[tuple[str, tuple]]
    ):
        """The number of INSERT calls equals the number of ms_question_img assets.

        We simulate the DB behaviour: the SELECT already filters, so the
        mock returns only ms_question_img rows. We then verify that
        seed_ms_jobs issues exactly that many INSERT calls.
        """
        # Separate ms_question_img rows from others
        ms_rows = [row for asset_type, row in tagged_assets if asset_type == "ms_question_img"]
        expected_count = len(ms_rows)

        conn, select_cur, insert_cur = _build_mock_connection(ms_rows, insert_rowcount=1)

        with patch("scripts.ms.seed_ms_jobs.connect", return_value=conn):
            result = seed_ms_jobs(extractor_version="v_test")

        # The total reported should match the filtered count
        assert result["total"] == expected_count, (
            f"total={result['total']} != expected ms_question_img count={expected_count}"
        )
        # inserted + skipped == total
        assert result["inserted"] + result["skipped"] == result["total"]

        # Number of INSERT execute() calls should equal the filtered count
        if expected_count > 0:
            assert insert_cur.execute.call_count == expected_count, (
                f"INSERT calls={insert_cur.execute.call_count} != expected={expected_count}"
            )
        else:
            # No ms_question_img assets → no INSERT cursor opened
            assert result["inserted"] == 0
            assert result["total"] == 0

    # ---- Sub-property 1c: Non-ms_question_img assets are never inserted ----

    @given(tagged_assets=_mixed_assets)
    @settings(max_examples=100)
    def test_non_ms_question_img_assets_never_inserted(
        self, tagged_assets: list[tuple[str, tuple]]
    ):
        """Only ms_question_img rows are passed to INSERT.

        Since the DB query filters at the SQL level, the mock SELECT
        returns only ms_question_img rows. We verify that every
        storage_key passed to INSERT belongs to an ms_question_img asset.
        """
        ms_rows = [row for asset_type, row in tagged_assets if asset_type == "ms_question_img"]
        ms_storage_keys = {row[0] for row in ms_rows}  # storage_key is index 0

        conn, select_cur, insert_cur = _build_mock_connection(ms_rows, insert_rowcount=1)

        with patch("scripts.ms.seed_ms_jobs.connect", return_value=conn):
            seed_ms_jobs(extractor_version="v_test")

        # Every INSERT call's storage_key must be from ms_question_img assets
        for call_args in insert_cur.execute.call_args_list:
            params = call_args[0][1]  # second positional arg is the params dict
            assert params["storage_key"] in ms_storage_keys, (
                f"Inserted storage_key={params['storage_key']!r} not in ms_question_img set"
            )

    # ---- Sub-property 1d: Empty ms_question_img set yields zero jobs ----

    @given(
        tagged_assets=st.lists(
            st.tuples(
                st.sampled_from([t for t in _ASSET_TYPES if t != "ms_question_img"]),
                _asset_row,
            ),
            min_size=1,
            max_size=20,
        )
    )
    @settings(max_examples=100)
    def test_no_ms_question_img_yields_zero_jobs(
        self, tagged_assets: list[tuple[str, tuple]]
    ):
        """When no ms_question_img assets exist, zero jobs are created."""
        # DB returns empty result (no ms_question_img after SQL filter)
        conn, select_cur, insert_cur = _build_mock_connection([], insert_rowcount=0)

        with patch("scripts.ms.seed_ms_jobs.connect", return_value=conn):
            result = seed_ms_jobs(extractor_version="v_test")

        assert result["total"] == 0
        assert result["inserted"] == 0
        assert result["skipped"] == 0

    # ---- Sub-property 1e: All ms_question_img assets produce jobs ----

    @given(
        tagged_assets=st.lists(
            st.tuples(
                st.just("ms_question_img"),
                _asset_row,
            ),
            min_size=1,
            max_size=20,
        )
    )
    @settings(max_examples=100)
    def test_all_ms_question_img_assets_produce_jobs(
        self, tagged_assets: list[tuple[str, tuple]]
    ):
        """When all assets are ms_question_img, all produce INSERT attempts."""
        ms_rows = [row for _, row in tagged_assets]
        expected_count = len(ms_rows)

        conn, select_cur, insert_cur = _build_mock_connection(ms_rows, insert_rowcount=1)

        with patch("scripts.ms.seed_ms_jobs.connect", return_value=conn):
            result = seed_ms_jobs(extractor_version="v_test")

        assert result["total"] == expected_count
        assert result["inserted"] == expected_count
        assert insert_cur.execute.call_count == expected_count
