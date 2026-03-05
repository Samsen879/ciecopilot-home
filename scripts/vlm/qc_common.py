#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.common.env import load_project_env

from scripts.vlm.db_utils import connect


PROJECT_ROOT = Path(__file__).resolve().parents[2]
REPORTS_DIR = PROJECT_ROOT / "docs" / "reports"
DEFAULT_STATS_JSON = REPORTS_DIR / "vlm_qc_stats.json"
DEFAULT_SPOT_CHECK_JSON = REPORTS_DIR / "vlm_qc_spot_check.json"
DEFAULT_REPORT_MD = REPORTS_DIR / "vlm_qc_report.md"


def load_env_from_project() -> None:
    load_project_env()



def ensure_database_url() -> None:
    if "DATABASE_URL" not in os.environ:
        print("Error: DATABASE_URL is required.", file=sys.stderr)
        print(
            'PowerShell example: $env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"',
            file=sys.stderr,
        )
        sys.exit(2)


def ensure_reports_dir() -> None:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def query_all(cur, sql: str, params: dict[str, Any] | tuple[Any, ...] | None = None) -> list[dict[str, Any]]:
    cur.execute(sql, params)
    cols = [c[0] for c in cur.description]
    rows = cur.fetchall()
    return [dict(zip(cols, row)) for row in rows]


def query_one(cur, sql: str, params: dict[str, Any] | tuple[Any, ...] | None = None) -> dict[str, Any]:
    rows = query_all(cur, sql, params)
    if not rows:
        return {}
    return rows[0]


def safe_float(v: Any) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except Exception:
        return None


def today_str() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def write_json(path: Path, data: Any) -> None:
    ensure_reports_dir()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def read_json(path: Path) -> Any:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def get_connection():
    load_env_from_project()
    ensure_database_url()
    return connect()
