#!/usr/bin/env python3
import json
import os
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "runs" / "backend" / "db_contract_summary.json"
DB_ENV_KEYS = ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL")
ENV_FILES = (".env.local", ".env")


REQUIRED_COLUMNS = [
    ("rubric_points", "is_cao"),
    ("rubric_points", "symbolic_rule"),
    ("rubric_points", "accuracy_policy"),
    ("mark_decisions", "alignment_confidence"),
    ("mark_decisions", "evidence_spans"),
]


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def ensure_out_dir():
    OUT.parent.mkdir(parents=True, exist_ok=True)


def write(payload):
    ensure_out_dir()
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _strip_wrapping_quotes(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        return value[1:-1]
    return value


def load_database_url() -> str | None:
    for key in DB_ENV_KEYS:
        value = os.getenv(key)
        if value:
            os.environ["DATABASE_URL"] = value
            return value

    for env_file in ENV_FILES:
        path = ROOT / env_file
        if not path.exists():
            continue
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, raw_value = line.split("=", 1)
            key = key.strip()
            if key not in DB_ENV_KEYS:
                continue
            value = _strip_wrapping_quotes(raw_value.strip())
            if value:
                os.environ["DATABASE_URL"] = value
                return value
    return None


def connect_db():
    database_url = load_database_url()
    if not database_url:
        return None, "DATABASE_URL (or SUPABASE_DB_URL / SUPABASE_DATABASE_URL) is not set"

    errors = []
    try:
        import psycopg  # type: ignore
    except Exception as error:
        errors.append(f"psycopg import failed: {error}")
    else:
        try:
            conn = psycopg.connect(database_url)
            return conn, None
        except Exception as error:
            errors.append(f"psycopg connect failed: {str(error).strip()}")

    try:
        import psycopg2  # type: ignore
    except Exception as error:
        errors.append(f"psycopg2 import failed: {error}")
    else:
        try:
            conn = psycopg2.connect(database_url)
            return conn, None
        except Exception as error:
            errors.append(f"psycopg2 connect failed: {str(error).strip()}")

    joined = " | ".join(errors)
    lowered = joined.lower()
    if "getaddrinfo failed" in lowered or "could not translate host name" in lowered:
        joined += " | Hint: this DB host may be IPv6-only on your network; use Supabase Session/Transaction pooler (IPv4)."
    return None, joined


def main():
    conn, reason = connect_db()
    if conn is None:
        write(
            {
                "generated_at": utc_now(),
                "status": "skipped",
                "reason": reason,
                "checks": [],
            }
        )
        print(OUT)
        return

    checks = []
    try:
        with conn.cursor() as cur:
            for table, column in REQUIRED_COLUMNS:
                cur.execute(
                    """
                    select 1
                    from information_schema.columns
                    where table_schema='public'
                      and table_name=%s
                      and column_name=%s
                    limit 1
                    """,
                    (table, column),
                )
                exists = cur.fetchone() is not None
                checks.append(
                    {
                        "type": "column",
                        "table": table,
                        "column": column,
                        "exists": exists,
                    }
                )

            cur.execute(
                """
                select 1
                from pg_proc p
                join pg_namespace n on n.oid = p.pronamespace
                where n.nspname='public'
                  and p.proname='insert_mark_decisions'
                limit 1
                """
            )
            checks.append(
                {
                    "type": "rpc",
                    "name": "insert_mark_decisions",
                    "exists": cur.fetchone() is not None,
                }
            )
    finally:
        conn.close()

    all_green = all(item.get("exists") for item in checks)
    write(
        {
            "generated_at": utc_now(),
            "status": "pass" if all_green else "fail",
            "checks": checks,
        }
    )
    print(OUT)


if __name__ == "__main__":
    main()
