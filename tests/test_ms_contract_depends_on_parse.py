"""Regression tests for depends_on parsing in contract validator."""
from __future__ import annotations

import sys
import uuid
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.contract_validator import _normalize_depends_on, validate_b2_contract


_READY_COLUMNS = [
    "rubric_id", "storage_key", "q_number", "subpart",
    "mark_label", "description", "kind", "depends_on", "marks",
    "source_version",
]


def _build_mock_pool(rows: list[tuple]):
    pool = MagicMock()
    conn = MagicMock()
    cursor = MagicMock()

    pool.getconn.return_value = conn
    conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
    conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
    cursor.description = [(c, None, None, None, None, None, None) for c in _READY_COLUMNS]
    cursor.fetchall.return_value = rows
    return pool


def test_normalize_depends_on_handles_pg_empty_array_literal():
    assert _normalize_depends_on("{}") == []


def test_normalize_depends_on_handles_pg_array_literal_with_values():
    a = str(uuid.uuid4())
    b = str(uuid.uuid4())
    assert _normalize_depends_on("{" + a + "," + b + "}") == [a, b]


def test_contract_validator_accepts_pg_empty_array_literal():
    rid = str(uuid.uuid4())
    rows = [(
        rid,
        "ci/fixture.png",
        1,
        None,
        "M1",
        "desc",
        "M",
        "{}",  # psycopg2 can return uuid[] as string literal
        1,
        "v1:dashscope:qwen-vl-max:ms_v1",
    )]
    pool = _build_mock_pool(rows)
    result = validate_b2_contract(pool)
    assert result["valid"] is True
    assert result["failures"] == []
