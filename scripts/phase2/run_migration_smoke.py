#!/usr/bin/env python3
import json
import os
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "runs" / "backend" / "migration_smoke_summary.json"
MIGRATION_FILE = ROOT / "supabase" / "migrations" / "20260220120000_phase2_marking_contract.sql"
MIGRATION_VERSION, _, MIGRATION_NAME = MIGRATION_FILE.stem.partition("_")
DB_ENV_KEYS = ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL")
ENV_FILES = (".env.local", ".env")


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def write(payload):
    OUT.parent.mkdir(parents=True, exist_ok=True)
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
            return psycopg.connect(database_url), None
        except Exception as error:
            errors.append(f"psycopg connect failed: {str(error).strip()}")

    try:
        import psycopg2  # type: ignore
    except Exception as error:
        errors.append(f"psycopg2 import failed: {error}")
    else:
        try:
            return psycopg2.connect(database_url), None
        except Exception as error:
            errors.append(f"psycopg2 connect failed: {str(error).strip()}")

    joined = " | ".join(errors)
    lowered = joined.lower()
    if "getaddrinfo failed" in lowered or "could not translate host name" in lowered:
        joined += " | Hint: this DB host may be IPv6-only on your network; use Supabase Session/Transaction pooler (IPv4)."
    return None, joined


def main():
    checks = [
        {
            "type": "file_exists",
            "target": str(MIGRATION_FILE.relative_to(ROOT)),
            "exists": MIGRATION_FILE.exists(),
        }
    ]

    conn, reason = connect_db()
    if conn is None:
        write(
            {
                "generated_at": utc_now(),
                "status": "skipped",
                "reason": reason,
                "checks": checks,
            }
        )
        print(OUT)
        return

    try:
        with conn.cursor() as cur:
            cur.execute("select 1 as ok;")
            row = cur.fetchone()
            checks.append(
                {
                    "type": "db_connectivity",
                    "ok": bool(row and row[0] == 1),
                }
            )

            cur.execute(
                """
                select count(*)::int
                from supabase_migrations.schema_migrations
                where version = %s
                   or name = %s
                """
                ,
                (MIGRATION_VERSION, MIGRATION_NAME),
            )
            count = cur.fetchone()[0]
            checks.append(
                {
                    "type": "migration_applied",
                    "version": MIGRATION_VERSION,
                    "name": MIGRATION_NAME,
                    "applied": count > 0,
                }
            )
    finally:
        conn.close()

    all_green = all(
        (item.get("exists") if item["type"] == "file_exists" else item.get("ok") if item["type"] == "db_connectivity" else item.get("applied"))
        for item in checks
    )
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
