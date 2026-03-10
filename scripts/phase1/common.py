#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from scripts.common.env import load_project_env

PROJECT_ROOT = Path(__file__).resolve().parents[2]
RUN_DIR = PROJECT_ROOT / "runs" / "phase1"


def load_env() -> None:
    load_project_env()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def resolve_db_url() -> str | None:
    for key in ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"):
        value = os.environ.get(key)
        if value:
            return value
    return None


def require_db_url() -> str:
    db_url = resolve_db_url()
    if db_url:
        return db_url
    raise RuntimeError(
        "DATABASE_URL (or SUPABASE_DB_URL / SUPABASE_DATABASE_URL) must be set"
    )


def write_json_file(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False, default=str) + "\n",
        encoding="utf-8",
    )


def read_json_file(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def relation_exists(cur: Any, relation_name: str) -> bool:
    cur.execute("SELECT to_regclass(%s)", (relation_name,))
    return cur.fetchone()[0] is not None
