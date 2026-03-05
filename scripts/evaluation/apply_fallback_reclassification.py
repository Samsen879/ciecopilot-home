#!/usr/bin/env python3
"""Apply AI-agent reclassification of fallback questions back to question_concept_links."""
from __future__ import annotations

import argparse
import csv
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.common.env import load_project_env

from scripts.common.local_guard import enforce_local
from scripts.vlm.db_utils import connect

DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

VALID_PATHS_P1 = {
    "9709.p1.quadratics",
    "9709.p1.functions",
    "9709.p1.coordinate_geometry",
    "9709.p1.circular_measure",
    "9709.p1.trigonometry",
    "9709.p1.series",
    "9709.p1.differentiation",
    "9709.p1.integration",
}

VALID_PATHS_P3 = {
    "9709.p3.algebra",
    "9709.p3.logarithmic_and_exponential_functions",
    "9709.p3.trigonometry",
    "9709.p3.differentiation",
    "9709.p3.integration",
    "9709.p3.numerical_solution_of_equations",
    "9709.p3.vectors",
    "9709.p3.differential_equations",
    "9709.p3.complex_numbers",
}

VALID_PATHS = VALID_PATHS_P1 | VALID_PATHS_P3


def load_env() -> None:
    load_project_env()



def ensure_db_url() -> None:
    for key in ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"):
        if os.environ.get(key):
            return
    os.environ["DATABASE_URL"] = DEFAULT_LOCAL_DB_URL


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Apply fallback reclassification CSV to DB")
    parser.add_argument("--input", type=Path, required=True, help="Reclassification CSV path")
    parser.add_argument("--source", default="a1_keyword_mapper_v1", help="Link source tag")
    parser.add_argument("--dry-run", action="store_true", help="Print changes without writing")
    parser.add_argument("--allow-remote", action="store_true")
    return parser.parse_args()


def read_csv(path: Path) -> list[dict]:
    rows = []
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for i, rec in enumerate(reader, start=2):
            storage_key = (rec.get("storage_key") or "").strip()
            paper = (rec.get("paper") or "").strip()
            new_primary = (rec.get("new_primary_node_path") or "").strip()
            new_secondary = (rec.get("new_secondary_node_path") or "").strip()
            old_strategy = (rec.get("old_strategy") or "").strip()
            confidence_note = (rec.get("confidence_note") or "").strip()

            if not storage_key:
                print("WARN: row %d has empty storage_key, skipping" % i)
                continue
            if new_primary == "uncertain":
                print("SKIP: row %d storage_key=%s marked uncertain" % (i, storage_key))
                continue
            if new_primary not in VALID_PATHS:
                print("ERROR: row %d storage_key=%s invalid new_primary=%s" % (i, storage_key, new_primary))
                sys.exit(1)
            if new_secondary and new_secondary not in VALID_PATHS:
                print("ERROR: row %d storage_key=%s invalid new_secondary=%s" % (i, storage_key, new_secondary))
                sys.exit(1)

            # Validate paper-path consistency
            if paper == "1" and new_primary not in VALID_PATHS_P1:
                print("ERROR: row %d P1 question mapped to P3 path: %s" % (i, new_primary))
                sys.exit(1)
            if paper == "3" and new_primary not in VALID_PATHS_P3:
                print("ERROR: row %d P3 question mapped to P1 path: %s" % (i, new_primary))
                sys.exit(1)

            rows.append({
                "storage_key": storage_key,
                "paper": paper,
                "old_strategy": old_strategy,
                "new_primary": new_primary,
                "new_secondary": new_secondary,
                "confidence_note": confidence_note,
            })
    return rows


def apply_reclassification(rows: list[dict], source: str, dry_run: bool) -> dict:
    stats = {"updated": 0, "not_found": 0, "secondary_added": 0, "skipped": 0}

    with connect() as conn:
        with conn.cursor() as cur:
            for row in rows:
                # Find the node_id for the new primary path
                cur.execute(
                    "SELECT node_id FROM public.curriculum_nodes WHERE topic_path = %s LIMIT 1",
                    (row["new_primary"],),
                )
                result = cur.fetchone()
                if not result:
                    print("WARN: node not found for path %s" % row["new_primary"])
                    stats["not_found"] += 1
                    continue
                new_node_id = result[0]

                if dry_run:
                    print("DRY-RUN: %s -> %s (node_id=%s)" % (
                        row["storage_key"], row["new_primary"], new_node_id
                    ))
                    stats["updated"] += 1
                    continue

                # Update the primary link
                cur.execute("""
                    UPDATE public.question_concept_links
                    SET node_id = %s,
                        confidence = 0.85,
                        evidence = jsonb_build_object(
                            'strategy', 'ai_agent_reclassify',
                            'old_strategy', %s,
                            'node_path', %s,
                            'confidence_note', %s
                        ),
                        created_at = NOW()
                    WHERE storage_key = %s
                      AND source = %s
                      AND link_type = 'primary'
                """, (
                    new_node_id,
                    row["old_strategy"],
                    row["new_primary"],
                    row["confidence_note"],
                    row["storage_key"],
                    source,
                ))

                if cur.rowcount > 0:
                    stats["updated"] += 1
                else:
                    print("WARN: no primary link found for %s" % row["storage_key"])
                    stats["not_found"] += 1

                # Add secondary link if specified
                if row["new_secondary"]:
                    cur.execute(
                        "SELECT node_id FROM public.curriculum_nodes WHERE topic_path = %s LIMIT 1",
                        (row["new_secondary"],),
                    )
                    sec_result = cur.fetchone()
                    if sec_result:
                        sec_node_id = sec_result[0]
                        cur.execute("""
                            INSERT INTO public.question_concept_links
                                (storage_key, node_id, link_type, confidence, source, evidence)
                            VALUES (%s, %s, 'secondary', 0.70, %s,
                                jsonb_build_object(
                                    'strategy', 'ai_agent_reclassify',
                                    'node_path', %s
                                ))
                            ON CONFLICT (storage_key, node_id, link_type) DO UPDATE
                            SET confidence = 0.70,
                                evidence = jsonb_build_object(
                                    'strategy', 'ai_agent_reclassify',
                                    'node_path', %s
                                ),
                                created_at = NOW()
                        """, (
                            row["storage_key"],
                            sec_node_id,
                            source,
                            row["new_secondary"],
                            row["new_secondary"],
                        ))
                        stats["secondary_added"] += 1

            if not dry_run:
                conn.commit()

    return stats


def main() -> int:
    args = parse_args()
    if not args.input.exists():
        print("ERROR: input CSV not found: %s" % args.input, file=sys.stderr)
        return 2

    load_env()
    ensure_db_url()
    enforce_local(
        args.allow_remote,
        env_keys=["DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"],
    )

    rows = read_csv(args.input)
    print("loaded %d rows from %s" % (len(rows), args.input))

    if not rows:
        print("no rows to process")
        return 0

    # Check for duplicates
    keys = [r["storage_key"] for r in rows]
    if len(keys) != len(set(keys)):
        print("ERROR: duplicate storage_keys in CSV")
        return 1

    stats = apply_reclassification(rows, args.source, args.dry_run)

    print("--- results ---")
    print("updated: %d" % stats["updated"])
    print("not_found: %d" % stats["not_found"])
    print("secondary_added: %d" % stats["secondary_added"])
    if args.dry_run:
        print("(dry-run mode, no changes written)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
