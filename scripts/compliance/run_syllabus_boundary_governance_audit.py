#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import psycopg2  # type: ignore

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.phase1.common import utc_now_iso, write_json_file
OUTPUT_PATH = PROJECT_ROOT / "runs" / "backend" / "syllabus_boundary_governance_summary.json"


def _database_url() -> str:
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]

    host = os.environ.get("PGHOST") or os.environ.get("TEST_DB_HOST") or "localhost"
    port = os.environ.get("PGPORT") or os.environ.get("TEST_DB_PORT") or "5432"
    user = os.environ.get("PGUSER") or os.environ.get("TEST_DB_USER") or "postgres"
    password = os.environ.get("PGPASSWORD") or os.environ.get("TEST_DB_PASSWORD") or "postgres"
    database = os.environ.get("PGDATABASE") or os.environ.get("TEST_DB_NAME") or "postgres"
    return f"postgresql://{user}:{password}@{host}:{port}/{database}"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run syllabus-boundary governance audit")
    parser.add_argument("--min-curriculum-nodes", type=int, default=30)
    parser.add_argument("--min-distinct-syllabuses", type=int, default=3)
    parser.add_argument("--min-chunks", type=int, default=100)
    parser.add_argument("--min-unmapped-chunks", type=int, default=10)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        conn = psycopg2.connect(_database_url())
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM public.curriculum_nodes;")
                curriculum_nodes = cur.fetchone()[0]

                cur.execute("SELECT COUNT(DISTINCT syllabus_code) FROM public.curriculum_nodes;")
                distinct_syllabuses = cur.fetchone()[0]

                cur.execute("SELECT COUNT(*) FROM public.chunks;")
                chunks_total = cur.fetchone()[0]

                cur.execute("SELECT COUNT(*) FROM public.chunks WHERE topic_path = 'unmapped'::ltree;")
                unmapped_chunks = cur.fetchone()[0]

                cur.execute(
                    """
                    SELECT COUNT(*) FROM (
                        SELECT syllabus_code, topic_path::text
                        FROM public.curriculum_nodes
                        GROUP BY 1, 2
                        HAVING COUNT(*) > 1
                    ) dup;
                    """
                )
                duplicate_curriculum_node_count = cur.fetchone()[0]

                cur.execute(
                    """
                    SELECT COUNT(*)
                    FROM public.chunks
                    WHERE topic_path <> 'unmapped'::ltree
                      AND COALESCE(syllabus_code, '') <> split_part(topic_path::text, '.', 1);
                    """
                )
                mapped_chunk_syllabus_mismatch_count = cur.fetchone()[0]

                cur.execute(
                    """
                    SELECT COUNT(*)
                    FROM pg_proc p
                    JOIN pg_namespace n ON n.oid = p.pronamespace
                    WHERE n.nspname = 'public'
                      AND p.proname = 'hybrid_search_v2';
                    """
                )
                hybrid_search_v2_count = cur.fetchone()[0]

                cur.execute(
                    """
                    SELECT pg_get_functiondef(p.oid)
                    FROM pg_proc p
                    JOIN pg_namespace n ON n.oid = p.pronamespace
                    WHERE n.nspname = 'public'
                      AND p.proname = 'hybrid_search_v2'
                    LIMIT 1;
                    """
                )
                row = cur.fetchone()
                function_def = row[0] if row else ""

                cur.execute(
                    """
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'chunks'
                      AND column_name IN ('syllabus_code', 'topic_path', 'node_id', 'fts')
                    ORDER BY column_name;
                    """
                )
                chunk_columns = [r[0] for r in cur.fetchall()]
        finally:
            conn.close()

        required_columns = {"syllabus_code", "topic_path", "node_id", "fts"}
        rpc_guard_checks = {
            "current_topic_path_required": "current_topic_path required" in function_def,
            "unknown_topic_path_guard": "unknown current_topic_path" in function_def,
            "ltree_subtree_filter": "<@" in function_def,
            "unmapped_exclusion": "unmapped" in function_def,
        }
        gate_pass = (
            curriculum_nodes >= args.min_curriculum_nodes
            and distinct_syllabuses >= args.min_distinct_syllabuses
            and chunks_total >= args.min_chunks
            and unmapped_chunks >= args.min_unmapped_chunks
            and duplicate_curriculum_node_count == 0
            and mapped_chunk_syllabus_mismatch_count == 0
            and hybrid_search_v2_count >= 1
            and required_columns.issubset(set(chunk_columns))
            and all(rpc_guard_checks.values())
        )

        summary = {
            "generated_at_utc": utc_now_iso(),
            "gate_pass": gate_pass,
            "release_blocked": not gate_pass,
            "curriculum_nodes": curriculum_nodes,
            "distinct_syllabuses": distinct_syllabuses,
            "chunks_total": chunks_total,
            "unmapped_chunks": unmapped_chunks,
            "duplicate_curriculum_node_count": duplicate_curriculum_node_count,
            "mapped_chunk_syllabus_mismatch_count": mapped_chunk_syllabus_mismatch_count,
            "hybrid_search_v2_count": hybrid_search_v2_count,
            "chunk_columns_present": chunk_columns,
            "rpc_guard_checks": rpc_guard_checks,
            "thresholds": {
                "min_curriculum_nodes": args.min_curriculum_nodes,
                "min_distinct_syllabuses": args.min_distinct_syllabuses,
                "min_chunks": args.min_chunks,
                "min_unmapped_chunks": args.min_unmapped_chunks,
            },
        }
        write_json_file(OUTPUT_PATH, summary)

        print(f"[syllabus governance] gate_pass={gate_pass}")
        print(
            "[syllabus governance] curriculum_nodes={nodes} syllabuses={syllabuses} chunks={chunks} unmapped={unmapped} mismatches={mismatches}".format(
                nodes=curriculum_nodes,
                syllabuses=distinct_syllabuses,
                chunks=chunks_total,
                unmapped=unmapped_chunks,
                mismatches=mapped_chunk_syllabus_mismatch_count,
            )
        )
        print(f"[syllabus governance] output={OUTPUT_PATH}")
        return 0 if gate_pass else 1
    except Exception as exc:
        summary = {
            "generated_at_utc": utc_now_iso(),
            "gate_pass": False,
            "release_blocked": True,
            "error": str(exc),
        }
        write_json_file(OUTPUT_PATH, summary)
        print(f"[syllabus governance] error={exc}", file=sys.stderr)
        print(f"[syllabus governance] output={OUTPUT_PATH}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
