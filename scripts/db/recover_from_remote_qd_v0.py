#!/usr/bin/env python3
"""Pull question_descriptions_v0 from remote Supabase and upsert into local DB."""
from __future__ import annotations

import argparse
import os
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.common.local_guard import enforce_local
from scripts.db.recover_local_after_reset import (
    DescriptionRow,
    connect,
    ensure_db_url,
    load_env,
    restore_descriptions,
    restore_jobs,
    run_cmd,
)


SESSION_RE = re.compile(r"^[swm]$", re.IGNORECASE)
DOC_TYPE_RE = re.compile(r"^(qp|ms)$", re.IGNORECASE)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Recover local qd_v0 by pulling from remote Supabase REST API")
    p.add_argument("--remote-url-env", default="SUPABASE_URL")
    p.add_argument("--remote-key-env", default="SUPABASE_SERVICE_ROLE_KEY")
    p.add_argument("--table", default="question_descriptions_v0")
    p.add_argument("--page-size", type=int, default=1000)
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--skip-v1-rebuild", action="store_true")
    p.add_argument("--allow-remote-localdb", action="store_true")
    return p.parse_args()


def fetch_remote_rows(remote_url: str, remote_key: str, table: str, page_size: int) -> list[dict[str, Any]]:
    headers = {
        "apikey": remote_key,
        "Authorization": f"Bearer {remote_key}",
    }
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        resp = requests.get(
            f"{remote_url.rstrip('/')}/rest/v1/{table}",
            params={"select": "*", "limit": str(page_size), "offset": str(offset)},
            headers=headers,
            timeout=60,
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"remote fetch failed at offset={offset}: {resp.status_code} {resp.text[:300]}")
        batch = resp.json()
        if not batch:
            break
        rows.extend(batch)
        offset += len(batch)
        if len(batch) < page_size:
            break
    return rows


def as_str(value: Any, default: str) -> str:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return default


def as_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except Exception:
        return default


def as_float_or_none(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except Exception:
        return None


def as_list_str(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(x) for x in value if x is not None]
    return []


def as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    return {}


def normalize_row(raw: dict[str, Any]) -> DescriptionRow:
    session = as_str(raw.get("session"), "s").lower()
    if not SESSION_RE.match(session):
        session = "s"

    doc_type = as_str(raw.get("doc_type"), "qp").lower()
    if not DOC_TYPE_RE.match(doc_type):
        doc_type = "qp"

    status = as_str(raw.get("status"), "error").lower()
    if status not in {"ok", "blocked", "error"}:
        status = "error"

    summary = raw.get("summary")
    if summary is not None:
        summary = str(summary)

    question_type = raw.get("question_type")
    if question_type is not None:
        question_type = str(question_type).strip() or None

    answer_form = raw.get("answer_form")
    if answer_form is not None:
        answer_form = str(answer_form).strip() or None

    return DescriptionRow(
        storage_key=as_str(raw.get("storage_key"), ""),
        sha256=as_str(raw.get("sha256"), ""),
        syllabus_code=as_str(raw.get("syllabus_code"), "0000"),
        session=session,
        year=as_int(raw.get("year"), 2000),
        doc_type=doc_type,
        paper=as_int(raw.get("paper"), 1),
        variant=as_int(raw.get("variant"), 1),
        q_number=as_int(raw.get("q_number"), 0) if raw.get("q_number") is not None else None,
        subpart=str(raw.get("subpart")).strip() if raw.get("subpart") is not None else None,
        status=status,
        confidence=as_float_or_none(raw.get("confidence")),
        summary=summary,
        question_type=question_type,
        answer_form=answer_form,
        math_expressions_latex=as_list_str(raw.get("math_expressions_latex")),
        variables=as_list_str(raw.get("variables")),
        units=as_list_str(raw.get("units")),
        leakage_flags=as_dict(raw.get("leakage_flags")),
        provider=as_str(raw.get("provider"), "unknown"),
        model=as_str(raw.get("model"), "unknown"),
        prompt_version=as_str(raw.get("prompt_version"), "unknown"),
        extractor_version=as_str(raw.get("extractor_version"), "unknown"),
        response_sha256=as_str(raw.get("response_sha256"), "0" * 64),
        raw_json=as_dict(raw.get("raw_json")) or {"source": "remote_supabase_restore"},
    )


def main() -> int:
    args = parse_args()
    load_env()
    local_db_url = ensure_db_url()
    enforce_local(args.allow_remote_localdb, env_keys=["DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"])

    remote_url = os.environ.get(args.remote_url_env)
    remote_key = os.environ.get(args.remote_key_env)
    if not remote_url or not remote_key:
        raise SystemExit(
            f"missing remote env: {args.remote_url_env} / {args.remote_key_env}. "
            "Set these and retry."
        )

    print(f"local_database={local_db_url}")
    print(f"remote_url={remote_url}")
    print(f"remote_table={args.table}")

    raw_rows = fetch_remote_rows(remote_url, remote_key, args.table, args.page_size)
    rows = [normalize_row(r) for r in raw_rows if isinstance(r, dict)]
    rows = [r for r in rows if r.storage_key and r.sha256]

    syllabus_counter = Counter(r.syllabus_code for r in rows)
    print(f"remote_rows={len(raw_rows)} normalized_rows={len(rows)}")
    print("remote_syllabus_breakdown=" + str(dict(sorted(syllabus_counter.items()))))

    if args.dry_run:
        print("dry_run=true (no writes)")
        return 0

    with connect() as conn:
        with conn.cursor() as cur:
            d_stats = restore_descriptions(cur, rows)
            print("descriptions_restore=" + str(d_stats))
            j_stats = restore_jobs(cur, rows, {})
            print("jobs_restore=" + str(j_stats))
            conn.commit()

    env = os.environ.copy()
    env["DATABASE_URL"] = local_db_url
    if not args.skip_v1_rebuild:
        run_cmd([sys.executable, "scripts/vlm/build_production_table_v1.py", "--target", "question_descriptions_v1"], env)
        run_cmd(
            [
                sys.executable,
                "scripts/vlm/publish_production_view_v1.py",
                "--source",
                "question_descriptions_v1",
                "--view",
                "question_descriptions_prod_v1",
            ],
            env,
        )

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM public.question_descriptions_v0")
            qd_v0_total = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM public.question_descriptions_v0 WHERE syllabus_code = '9709'")
            qd_v0_9709 = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM public.question_descriptions_v1")
            qd_v1_total = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM public.question_descriptions_prod_v1")
            qd_prod_total = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM public.question_descriptions_prod_v1 WHERE syllabus_code = '9709'")
            qd_prod_9709 = cur.fetchone()[0]
    print(
        "final_counts "
        f"qd_v0_total={qd_v0_total} qd_v0_9709={qd_v0_9709} "
        f"qd_v1_total={qd_v1_total} qd_prod_total={qd_prod_total} qd_prod_9709={qd_prod_9709}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
