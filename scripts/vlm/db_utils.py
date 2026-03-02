"""DB helpers for VLM scripts (local Postgres via env)."""
from __future__ import annotations
import os
import sys
from typing import Any, Callable

_DRIVER = None
_JSON = None
_CONNECT: Callable[[str], Any] | None = None


def _init_driver():
    global _DRIVER, _JSON, _CONNECT
    if _DRIVER:
        return
    try:
        import psycopg  # type: ignore
        from psycopg.types.json import Json  # type: ignore
        _DRIVER = "psycopg"
        _JSON = Json
        _CONNECT = psycopg.connect
        return
    except Exception:
        pass
    try:
        import psycopg2  # type: ignore
        import psycopg2.extras  # type: ignore
        _DRIVER = "psycopg2"
        _JSON = psycopg2.extras.Json
        _CONNECT = psycopg2.connect
    except Exception:
        print("Error: psycopg or psycopg2 is required (pip install psycopg[binary] or psycopg2-binary)", file=sys.stderr)
        sys.exit(2)


def get_db_url() -> str:
    for key in ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"):
        val = os.environ.get(key)
        if val:
            return val
    print("Error: DATABASE_URL (or SUPABASE_DB_URL/SUPABASE_DATABASE_URL) is required", file=sys.stderr)
    sys.exit(2)


def connect():
    _init_driver()
    assert _CONNECT is not None
    return _CONNECT(get_db_url())


def json_param(value: Any):
    _init_driver()
    assert _JSON is not None
    return _JSON(value)