#!/usr/bin/env python3
"""Seed minimal ready data for B1 gate execution in CI.

This script is intentionally deterministic and idempotent:
- Applies the B1 migration SQL.
- Upserts one `vlm_ms_jobs` record.
- Upserts one `rubric_points` record in `status='ready'`.

The fixture guarantees QC/contract checks execute on non-empty ready data.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIGRATION_PATH = ROOT / "supabase/migrations/20260214120000_b1_rubric_extraction.sql"
sys.path.insert(0, str(ROOT))

from scripts.ms.ms_persist import compute_point_fingerprint


def _db_url() -> str | None:
    return os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")


def main() -> int:
    db_url = _db_url()
    if not db_url:
        print("ERROR: DATABASE_URL or SUPABASE_DB_URL must be set", file=sys.stderr)
        return 1
    if not MIGRATION_PATH.exists():
        print(f"ERROR: Migration file not found: {MIGRATION_PATH}", file=sys.stderr)
        return 1

    try:
        import psycopg2  # type: ignore
    except Exception as exc:
        print(f"ERROR: psycopg2 import failed: {exc}", file=sys.stderr)
        return 1

    storage_key = "ci/fixtures/ms_q1.png"
    sha256 = "ci_fixture_sha256"
    extractor_version = "v1"
    provider = "dashscope"
    model = "qwen-vl-max"
    prompt_version = "ms_v1"
    q_number = 1
    subpart = None

    point = {
        "mark_label": "M1",
        "description": "CI fixture mark point",
        "marks": 1,
        "depends_on_labels": [],
        "ft_mode": "none",
        "expected_answer_latex": None,
        "confidence": 1.0,
    }
    raw_json = json.dumps({"rubric_points": [point]}, ensure_ascii=False)
    response_sha256 = hashlib.sha256(raw_json.encode("utf-8")).hexdigest()
    point_fingerprint = compute_point_fingerprint(
        point["mark_label"],
        point["description"],
        point["marks"],
        point["depends_on_labels"],
    )

    conn = None
    try:
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            cur.execute(MIGRATION_PATH.read_text(encoding="utf-8"))

            cur.execute(
                """
                INSERT INTO vlm_ms_jobs (
                    storage_key, sha256, paper_id,
                    syllabus_code, session, year, paper, variant,
                    q_number, subpart,
                    extractor_version, provider, model, prompt_version,
                    status, attempts
                ) VALUES (
                    %(storage_key)s, %(sha256)s, NULL,
                    '9709', 'm', 2026, 1, 1,
                    %(q_number)s, %(subpart)s,
                    %(extractor_version)s, %(provider)s, %(model)s, %(prompt_version)s,
                    'done', 1
                )
                ON CONFLICT (storage_key, sha256, extractor_version, provider, model, prompt_version)
                DO UPDATE SET status='done', updated_at=now()
                """,
                {
                    "storage_key": storage_key,
                    "sha256": sha256,
                    "q_number": q_number,
                    "subpart": subpart,
                    "extractor_version": extractor_version,
                    "provider": provider,
                    "model": model,
                    "prompt_version": prompt_version,
                },
            )

            cur.execute(
                """
                INSERT INTO rubric_points (
                    rubric_id, storage_key, paper_id, q_number, subpart, step_index,
                    mark_label, kind, description, marks,
                    depends_on_labels, depends_on, ft_mode, expected_answer_latex,
                    confidence, confidence_source, status, parse_flags,
                    source, run_id, extractor_version, provider, model, prompt_version,
                    raw_json, response_sha256, point_fingerprint
                ) VALUES (
                    %(rubric_id)s, %(storage_key)s, NULL, %(q_number)s, %(subpart)s, 0,
                    'M1', 'M', %(description)s, 1,
                    '{}'::text[], '{}'::uuid[], 'none', NULL,
                    1.0, 'model', 'ready', '{}'::jsonb,
                    'vlm', NULL, %(extractor_version)s, %(provider)s, %(model)s, %(prompt_version)s,
                    %(raw_json)s::jsonb, %(response_sha256)s, %(point_fingerprint)s
                )
                ON CONFLICT (
                    storage_key, q_number, COALESCE(subpart, ''),
                    point_fingerprint, extractor_version, provider, model, prompt_version
                )
                DO UPDATE SET
                    status='ready',
                    mark_label='M1',
                    kind='M',
                    description=EXCLUDED.description,
                    marks=1,
                    depends_on='{}'::uuid[],
                    ft_mode='none',
                    confidence=1.0,
                    confidence_source='model',
                    parse_flags='{}'::jsonb,
                    raw_json=EXCLUDED.raw_json,
                    response_sha256=EXCLUDED.response_sha256,
                    updated_at=now()
                """,
                {
                    "rubric_id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "b1-gate-fixture-rubric")),
                    "storage_key": storage_key,
                    "q_number": q_number,
                    "subpart": subpart,
                    "description": point["description"],
                    "extractor_version": extractor_version,
                    "provider": provider,
                    "model": model,
                    "prompt_version": prompt_version,
                    "raw_json": raw_json,
                    "response_sha256": response_sha256,
                    "point_fingerprint": point_fingerprint,
                },
            )

        conn.commit()
        print("B1 gate fixture seeded successfully.")
        return 0
    except Exception as exc:
        if conn is not None:
            try:
                conn.rollback()
            except Exception:
                pass
        print(f"ERROR: Failed to seed B1 gate fixture: {exc}", file=sys.stderr)
        return 1
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass


if __name__ == "__main__":
    raise SystemExit(main())
