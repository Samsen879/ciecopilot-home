#!/usr/bin/env python3
"""Seed vlm_ms_jobs from paper_assets where asset_type='ms_question_img'.

Uses ON CONFLICT DO NOTHING for idempotent re-runs.
Supports --dry-run to preview without writing.

Requirements: 1.2, 1.3
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

# Allow running from repo root: python scripts/ms/seed_ms_jobs.py
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.db_utils import connect

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# SQL
# ---------------------------------------------------------------------------

_SELECT_MS_ASSETS_SQL = """
SELECT
    pa.storage_key,
    pa.sha256,
    pa.paper_id,
    ep.syllabus_code,
    ep.session,
    ep.year,
    ep.paper,
    ep.variant,
    pa.q_number,
    pa.subpart
FROM paper_assets pa
JOIN exam_papers ep ON ep.id = pa.paper_id
WHERE pa.asset_type = 'ms_question_img'
ORDER BY ep.syllabus_code, ep.year, ep.session, ep.paper, ep.variant, pa.q_number, pa.subpart
"""

_INSERT_JOB_SQL = """
INSERT INTO vlm_ms_jobs (
    storage_key, sha256, paper_id,
    syllabus_code, session, year, paper, variant,
    q_number, subpart,
    extractor_version, provider, model, prompt_version
) VALUES (
    %(storage_key)s, %(sha256)s, %(paper_id)s,
    %(syllabus_code)s, %(session)s, %(year)s, %(paper)s, %(variant)s,
    %(q_number)s, %(subpart)s,
    %(extractor_version)s, %(provider)s, %(model)s, %(prompt_version)s
)
ON CONFLICT (storage_key, sha256, extractor_version, provider, model, prompt_version)
DO NOTHING
"""

# ---------------------------------------------------------------------------
# Core function (importable)
# ---------------------------------------------------------------------------


def seed_ms_jobs(
    extractor_version: str,
    provider: str = "dashscope",
    model: str = "qwen-vl-max",
    prompt_version: str = "ms_v1",
    dry_run: bool = False,
) -> dict:
    """Seed vlm_ms_jobs from paper_assets. Returns {inserted, skipped, total}."""
    conn = connect()
    try:
        with conn.cursor() as cur:
            cur.execute(_SELECT_MS_ASSETS_SQL)
            assets = cur.fetchall()

        total = len(assets)

        if dry_run:
            logger.info("[DRY-RUN] Would create jobs for %d ms_question_img assets", total)
            print(f"[DRY-RUN] {total} ms_question_img assets found, 0 DB writes.")
            return {"inserted": 0, "skipped": 0, "total": total}

        inserted = 0
        with conn.cursor() as cur:
            for row in assets:
                (storage_key, sha256, paper_id, syllabus_code, session,
                 year, paper, variant, q_number, subpart) = row
                cur.execute(_INSERT_JOB_SQL, {
                    "storage_key": storage_key,
                    "sha256": sha256,
                    "paper_id": str(paper_id) if paper_id else None,
                    "syllabus_code": syllabus_code,
                    "session": session,
                    "year": year,
                    "paper": paper,
                    "variant": variant,
                    "q_number": q_number,
                    "subpart": subpart,
                    "extractor_version": extractor_version,
                    "provider": provider,
                    "model": model,
                    "prompt_version": prompt_version,
                })
                if cur.rowcount > 0:
                    inserted += 1
        conn.commit()

        skipped = total - inserted
        logger.info("Seeded %d jobs (inserted=%d, skipped=%d)", total, inserted, skipped)
        return {"inserted": inserted, "skipped": skipped, "total": total}

    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Seed vlm_ms_jobs from paper_assets (ms_question_img)",
    )
    parser.add_argument(
        "--extractor-version", type=str, required=True,
        help="Extractor version tag, e.g. 'v0.1.0'",
    )
    parser.add_argument("--provider", type=str, default="dashscope")
    parser.add_argument("--model", type=str, default="qwen-vl-max")
    parser.add_argument("--prompt-version", type=str, default="ms_v1")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no DB writes")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    result = seed_ms_jobs(
        extractor_version=args.extractor_version,
        provider=args.provider,
        model=args.model,
        prompt_version=args.prompt_version,
        dry_run=args.dry_run,
    )

    print(f"total={result['total']}  inserted={result['inserted']}  skipped={result['skipped']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
