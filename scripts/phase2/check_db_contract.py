#!/usr/bin/env python3
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qsl, quote, urlencode, urlsplit, urlunsplit


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "runs" / "backend" / "db_contract_summary.json"
DB_ENV_KEYS = ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL")
DB_POOLER_ENV_KEYS = ("DATABASE_POOLER_URL", "SUPABASE_DB_POOLER_URL", "SUPABASE_POOLER_URL")
SUPABASE_URL_ENV_KEYS = ("SUPABASE_URL",)
SUPABASE_POOLER_REGION_ENV = "SUPABASE_POOLER_REGION"
ENV_FILES = (".env.local", ".env")
SUPABASE_DB_HOST_RE = re.compile(r"^db\.([a-z0-9]+)\.supabase\.co$", re.IGNORECASE)


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


def load_env_values() -> dict[str, str]:
    keys = DB_ENV_KEYS + DB_POOLER_ENV_KEYS + SUPABASE_URL_ENV_KEYS + (SUPABASE_POOLER_REGION_ENV,)
    values: dict[str, str] = {}

    for key in keys:
        value = os.getenv(key)
        if value:
            values[key] = value

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
            if key not in keys or key in values:
                continue
            value = _strip_wrapping_quotes(raw_value.strip())
            if value:
                values[key] = value
    return values


def first_present(values: dict[str, str], keys: tuple[str, ...]) -> str | None:
    for key in keys:
        value = values.get(key)
        if value:
            return value
    return None


def _strip_bracket_wrapped_password(password: str | None) -> str | None:
    if not password:
        return password
    if password.startswith("[") and password.endswith("]") and len(password) >= 2:
        return password[1:-1]
    return password


def safe_urlsplit(raw_url: str):
    try:
        return urlsplit(raw_url)
    except ValueError:
        patched = re.sub(r":\[([^\]]+)\]@", r":\1@", raw_url, count=1)
        try:
            return urlsplit(patched)
        except ValueError:
            return None


def _build_pg_url(
    base_parts,
    *,
    username: str | None,
    password: str | None,
    host: str,
    port: int | None,
    query_items: list[tuple[str, str]] | None = None,
) -> str:
    safe_host = host
    if ":" in safe_host and not safe_host.startswith("["):
        safe_host = f"[{safe_host}]"

    auth = ""
    if username:
        auth = quote(username, safe="")
        if password is not None:
            auth = f"{auth}:{quote(password, safe='')}"
        auth = f"{auth}@"

    query = base_parts.query if query_items is None else urlencode(query_items, doseq=True)
    return urlunsplit(
        (
            base_parts.scheme or "postgresql",
            f"{auth}{safe_host}{f':{port}' if port else ''}",
            base_parts.path or "/postgres",
            query,
            base_parts.fragment,
        )
    )


def normalize_database_url(raw_url: str) -> str:
    value = _strip_wrapping_quotes(raw_url.strip())
    parts = safe_urlsplit(value)
    if parts is None or not parts.scheme or not parts.hostname:
        return value
    return _build_pg_url(
        parts,
        username=parts.username,
        password=_strip_bracket_wrapped_password(parts.password),
        host=parts.hostname,
        port=parts.port,
    )


def extract_project_ref_from_supabase_url(supabase_url: str | None) -> str | None:
    if not supabase_url:
        return None
    try:
        host = (urlsplit(supabase_url).hostname or "").strip().lower()
    except Exception:
        return None
    if not host.endswith(".supabase.co"):
        return None
    project_ref = host.split(".")[0]
    return project_ref or None


def derive_supabase_pooler_url(
    database_url: str | None,
    *,
    supabase_url: str | None,
    region: str | None,
) -> str | None:
    if not database_url:
        return None

    parts = safe_urlsplit(database_url)
    if parts is None or not parts.scheme:
        return None

    project_ref: str | None = None
    host = (parts.hostname or "").strip().lower()
    match = SUPABASE_DB_HOST_RE.match(host)
    if match:
        project_ref = match.group(1)
    if not project_ref:
        project_ref = extract_project_ref_from_supabase_url(supabase_url)
    if not project_ref:
        return None

    username = parts.username or "postgres"
    if "." not in username:
        username = f"{username}.{project_ref}"

    query_items = parse_qsl(parts.query, keep_blank_values=True)
    has_sslmode = any(k.lower() == "sslmode" for k, _ in query_items)
    if not has_sslmode:
        query_items.append(("sslmode", "require"))

    resolved_region = (region or "").strip() or "us-east-1"
    return _build_pg_url(
        parts,
        username=username,
        password=_strip_bracket_wrapped_password(parts.password),
        host=f"aws-0-{resolved_region}.pooler.supabase.com",
        port=6543,
        query_items=query_items,
    )


def build_database_url_candidates() -> list[str]:
    values = load_env_values()
    direct_url = first_present(values, DB_ENV_KEYS)
    pooler_url = first_present(values, DB_POOLER_ENV_KEYS)
    supabase_url = first_present(values, SUPABASE_URL_ENV_KEYS)
    region = values.get(SUPABASE_POOLER_REGION_ENV)

    candidates: list[str] = []
    seen: set[str] = set()

    def push(url: str | None) -> None:
        if not url:
            return
        normalized = normalize_database_url(url)
        if not normalized or normalized in seen:
            return
        seen.add(normalized)
        candidates.append(normalized)

    push(pooler_url)
    push(direct_url)
    push(derive_supabase_pooler_url(direct_url, supabase_url=supabase_url, region=region))

    if candidates:
        os.environ["DATABASE_URL"] = candidates[0]
    return candidates


def redact_db_url(database_url: str) -> str:
    parts = safe_urlsplit(database_url)
    if parts is None:
        return "<invalid-db-url>"
    host = parts.hostname or "<unknown-host>"
    port = f":{parts.port}" if parts.port else ""
    user = parts.username or "<unknown-user>"
    path = parts.path or ""
    return f"{parts.scheme or 'postgresql'}://{user}@{host}{port}{path}"


def connect_db():
    candidates = build_database_url_candidates()
    if not candidates:
        return None, "DATABASE_URL (or SUPABASE_DB_URL / SUPABASE_DATABASE_URL) is not set"

    drivers = []
    import_errors = []
    try:
        import psycopg  # type: ignore
    except Exception as error:
        import_errors.append(f"psycopg import failed: {error}")
    else:
        drivers.append(("psycopg", psycopg))

    try:
        import psycopg2  # type: ignore
    except Exception as error:
        import_errors.append(f"psycopg2 import failed: {error}")
    else:
        drivers.append(("psycopg2", psycopg2))

    if not drivers:
        return None, " | ".join(import_errors)

    errors = []
    for candidate in candidates:
        for driver_name, driver in drivers:
            try:
                conn = driver.connect(candidate)
                os.environ["DATABASE_URL"] = candidate
                return conn, None
            except Exception as error:
                errors.append(
                    f"{driver_name} connect failed ({redact_db_url(candidate)}): {str(error).strip()}"
                )

    joined = " | ".join(import_errors + errors)
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
