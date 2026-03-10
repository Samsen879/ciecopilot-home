#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.common.env import load_project_env
from scripts.phase1.common import require_db_url, utc_now_iso, write_json_file

OUTPUT_PATH = PROJECT_ROOT / "runs" / "compliance" / "syllabus_boundary_preflight.json"
BASELINE_SCHEMA = PROJECT_ROOT / "tests" / "fixtures" / "baseline-schema.sql"
SUPABASE_SHIMS = PROJECT_ROOT / "tests" / "fixtures" / "supabase-shims.sql"
SEED_SQL = PROJECT_ROOT / "tests" / "fixtures" / "syllabus_boundary_seed.sql"
REQUIRED_MIGRATIONS = [
    PROJECT_ROOT / "supabase" / "migrations" / "20251223000100_enable_ltree.sql",
    PROJECT_ROOT / "supabase" / "migrations" / "20251223000200_chunks_add_topic_path_fts.sql",
    PROJECT_ROOT / "supabase" / "migrations" / "20251223000300_create_curriculum_nodes.sql",
    PROJECT_ROOT / "supabase" / "migrations" / "20251223000400_rpc_hybrid_search_v2.sql",
]


def _check(name: str, passed: bool, detail: str, extra: dict | None = None) -> dict:
    payload = {
        "name": name,
        "status": "pass" if passed else "fail",
        "detail": detail,
    }
    if extra:
        payload["extra"] = extra
    return payload


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _strip_sql_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    return re.sub(r"--.*$", "", text, flags=re.MULTILINE)


def _run_file_checks() -> list[dict]:
    checks: list[dict] = []
    required_files = [BASELINE_SCHEMA, SUPABASE_SHIMS, SEED_SQL, *REQUIRED_MIGRATIONS]
    missing = [str(path.relative_to(PROJECT_ROOT)) for path in required_files if not path.exists()]
    checks.append(
        _check(
            "required_files_exist",
            not missing,
            "all required fixture and migration files present" if not missing else ", ".join(missing),
        )
    )
    if missing:
        return checks

    baseline = _strip_sql_comments(_read(BASELINE_SCHEMA))
    forbidden_patterns = {
        "topic_path": "topic_path",
        "syllabus_code": "syllabus_code",
        "create_curriculum_nodes": "create table public.curriculum_nodes",
        "create_curriculum_nodes_if_not_exists": "create table if not exists public.curriculum_nodes",
    }
    baseline_lower = baseline.lower()
    offending = [name for name, pattern in forbidden_patterns.items() if pattern in baseline_lower]
    checks.append(
        _check(
            "baseline_schema_is_pre_boundary",
            not offending,
            "baseline schema excludes boundary columns" if not offending else ", ".join(offending),
        )
    )

    migration2 = _read(REQUIRED_MIGRATIONS[1])
    checks.append(
        _check(
            "chunks_migration_adds_boundary_columns",
            all(token in migration2 for token in ("syllabus_code", "topic_path", "fts")),
            "chunks migration adds syllabus_code, topic_path, and fts",
        )
    )

    migration3 = _read(REQUIRED_MIGRATIONS[2])
    checks.append(
        _check(
            "curriculum_nodes_migration_has_canonical_guards",
            all(token in migration3 for token in ("chk_topic_path_canonical", "chk_topic_path_not_unmapped")),
            "curriculum_nodes migration enforces canonical non-unmapped paths",
        )
    )

    migration4 = _read(REQUIRED_MIGRATIONS[3])
    checks.append(
        _check(
            "rpc_migration_enforces_topic_boundary",
            all(token in migration4 for token in ("p_topic_path", "c.topic_path <@ p_topic_path", "c.topic_path <> 'unmapped'::ltree")),
            "hybrid_search_v2 requires topic_path and excludes unmapped content",
        )
    )

    seed_sql = _read(SEED_SQL)
    syllabus_codes = sorted(set(re.findall(r"'(97\d{2}|9231)'", seed_sql)))
    checks.append(
        _check(
            "seed_sql_covers_expected_syllabuses",
            syllabus_codes == ["9231", "9702", "9709"],
            ",".join(syllabus_codes),
            {"syllabus_codes": syllabus_codes},
        )
    )
    checks.append(
        _check(
            "seed_sql_contains_unmapped_rows",
            "'unmapped'" in seed_sql,
            "seed includes unmapped fixture rows",
        )
    )
    return checks


def _run_db_checks() -> list[dict]:
    import psycopg2  # type: ignore

    checks: list[dict] = []
    conn = psycopg2.connect(require_db_url())
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'chunks';
                """
            )
            chunk_columns = {row[0] for row in cur.fetchall()}
            required_columns = {"syllabus_code", "topic_path", "node_id", "fts"}
            missing_columns = sorted(required_columns - chunk_columns)
            checks.append(
                _check(
                    "db_chunks_boundary_columns_present",
                    not missing_columns,
                    "chunks columns present" if not missing_columns else ", ".join(missing_columns),
                )
            )

            cur.execute(
                """
                SELECT to_regprocedure(
                    'public.hybrid_search_v2(text, vector(1536), ltree, integer, integer, integer, real, real, integer)'
                );
                """
            )
            rpc_present = cur.fetchone()[0] is not None
            checks.append(
                _check(
                    "db_hybrid_search_v2_present",
                    rpc_present,
                    "hybrid_search_v2 present" if rpc_present else "missing hybrid_search_v2",
                )
            )

            cur.execute("SELECT COUNT(*) FROM public.curriculum_nodes;")
            curriculum_node_count = cur.fetchone()[0]
            checks.append(
                _check(
                    "db_curriculum_nodes_seeded",
                    curriculum_node_count >= 30,
                    f"curriculum_nodes={curriculum_node_count}",
                )
            )

            cur.execute("SELECT COUNT(*) FROM public.chunks;")
            chunk_count = cur.fetchone()[0]
            checks.append(
                _check(
                    "db_chunks_seeded",
                    chunk_count >= 100,
                    f"chunks={chunk_count}",
                )
            )

            cur.execute(
                """
                SELECT COUNT(*)
                FROM public.curriculum_nodes
                WHERE split_part(topic_path::text, '.', 1) <> syllabus_code;
                """
            )
            node_root_mismatch_count = cur.fetchone()[0]
            checks.append(
                _check(
                    "db_curriculum_node_roots_match_syllabus",
                    node_root_mismatch_count == 0,
                    f"node_root_mismatch_count={node_root_mismatch_count}",
                )
            )

            cur.execute(
                """
                SELECT COUNT(*)
                FROM public.chunks
                WHERE topic_path <> 'unmapped'::ltree
                  AND split_part(topic_path::text, '.', 1) <> syllabus_code;
                """
            )
            chunk_root_mismatch_count = cur.fetchone()[0]
            checks.append(
                _check(
                    "db_chunk_roots_match_syllabus",
                    chunk_root_mismatch_count == 0,
                    f"chunk_root_mismatch_count={chunk_root_mismatch_count}",
                )
            )

            cur.execute(
                """
                SELECT COUNT(*)
                FROM public.chunks
                WHERE topic_path = 'unmapped'::ltree;
                """
            )
            unmapped_chunk_count = cur.fetchone()[0]
            checks.append(
                _check(
                    "db_unmapped_chunk_population",
                    unmapped_chunk_count >= 10,
                    f"unmapped_chunk_count={unmapped_chunk_count}",
                )
            )
    finally:
        conn.close()
    return checks


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run syllabus boundary preflight checks")
    parser.add_argument(
        "--db-check",
        action="store_true",
        help="Also validate the currently configured database state",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    load_project_env()

    checks = _run_file_checks()
    if args.db_check:
        checks.extend(_run_db_checks())

    gate_pass = all(check["status"] == "pass" for check in checks)
    summary = {
        "generated_at_utc": utc_now_iso(),
        "db_check_enabled": args.db_check,
        "gate_pass": gate_pass,
        "release_blocked": not gate_pass,
        "checks": checks,
    }
    write_json_file(OUTPUT_PATH, summary)

    print(f"[syllabus preflight] gate_pass={gate_pass}")
    print(f"[syllabus preflight] output={OUTPUT_PATH}")
    return 0 if gate_pass else 1


if __name__ == "__main__":
    sys.exit(main())
