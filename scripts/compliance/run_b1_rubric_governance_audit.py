#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.common.env import load_project_env
from scripts.phase1.common import require_db_url, utc_now_iso, write_json_file
from scripts.phase1.preflight_rubric_version_audit import (
    OUTPUT_FILE as RUBRIC_AUDIT_OUTPUT_PATH,
    run_audit as run_rubric_version_audit,
)
B1_SUMMARY_PATH = PROJECT_ROOT / "runs" / "ms" / "b1_gate_summary.json"
OUTPUT_PATH = PROJECT_ROOT / "runs" / "ms" / "b1_rubric_governance_summary.json"


def _run_command(cmd: list[str]) -> dict:
    result = subprocess.run(
        cmd,
        cwd=str(PROJECT_ROOT),
        capture_output=True,
        text=True,
        timeout=300,
    )
    output = (result.stdout + result.stderr).strip()
    return {
        "command": cmd,
        "exit_code": result.returncode,
        "passed": result.returncode == 0,
        "output_tail": output[-4000:],
    }


def _load_summary() -> dict | None:
    if not B1_SUMMARY_PATH.exists():
        return None
    try:
        return json.loads(B1_SUMMARY_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def _query_ready_view_governance() -> dict:
    import psycopg2  # type: ignore

    conn = psycopg2.connect(require_db_url())
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM public.rubric_points_ready_v1;")
            ready_view_rows = cur.fetchone()[0]

            cur.execute(
                """
                SELECT COUNT(*) FROM (
                    SELECT
                        storage_key,
                        q_number,
                        COALESCE(subpart, '') AS subpart,
                        mark_label,
                        source_version
                    FROM public.rubric_points_ready_v1
                    GROUP BY 1, 2, 3, 4, 5
                    HAVING COUNT(*) > 1
                ) dup;
                """
            )
            duplicate_ready_key_count = cur.fetchone()[0]
    finally:
        conn.close()

    return {
        "ready_view_rows": ready_view_rows,
        "duplicate_ready_key_count": duplicate_ready_key_count,
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run B1 rubric governance audit")
    parser.add_argument("--seed", action="store_true", help="Seed deterministic B1 fixture data first")
    parser.add_argument(
        "--skip-gate",
        action="store_true",
        help="Do not invoke scripts/ms/b1_ci_gate.py; audit the existing DB state only",
    )
    parser.add_argument(
        "--min-ready-rows",
        type=int,
        default=1,
        help="Require at least this many ready rubric rows.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    load_project_env()

    command_results: list[dict] = []
    try:
        if args.seed:
            command_results.append(
                _run_command([sys.executable, "scripts/ms/seed_b1_gate_fixture.py"])
            )
            if not command_results[-1]["passed"]:
                summary = {
                    "generated_at_utc": utc_now_iso(),
                    "gate_pass": False,
                    "release_blocked": True,
                    "reason": "seed failed",
                    "steps": command_results,
                }
                write_json_file(OUTPUT_PATH, summary)
                return 1

        if not args.skip_gate:
            command_results.append(
                _run_command([sys.executable, "scripts/ms/b1_ci_gate.py"])
            )

        gate_summary = _load_summary()
        rubric_audit = run_rubric_version_audit(min_ready_rows=args.min_ready_rows)
        write_json_file(RUBRIC_AUDIT_OUTPUT_PATH, rubric_audit)
        view_governance = _query_ready_view_governance()
        b1_gate_pass = bool(gate_summary) and (
            bool(gate_summary.get("passed")) or gate_summary.get("result") == "passed"
        )
        governance_pass = (
            b1_gate_pass
            and bool(rubric_audit.get("gate_pass"))
            and int(view_governance.get("duplicate_ready_key_count", 0)) == 0
        )

        summary = {
            "generated_at_utc": utc_now_iso(),
            "gate_pass": governance_pass,
            "release_blocked": not governance_pass,
            "b1_gate_pass": b1_gate_pass,
            "min_ready_rows": args.min_ready_rows,
            "b1_gate_summary_path": str(B1_SUMMARY_PATH),
            "steps": command_results,
            "ready_rubric_points_rows": rubric_audit.get("ready_rubric_points_rows", 0),
            "unique_ready_questions": rubric_audit.get("unique_ready_questions", 0),
            "multi_version_question_count": rubric_audit.get("multi_version_question_count", 0),
            "version_distribution": rubric_audit.get("version_distribution", {}),
            "version_selection_impact": rubric_audit.get("version_selection_impact"),
            "ready_view_rows": view_governance.get("ready_view_rows", 0),
            "duplicate_ready_key_count": view_governance.get("duplicate_ready_key_count", 0),
        }
        write_json_file(OUTPUT_PATH, summary)

        print(f"[b1 governance] gate_pass={governance_pass}")
        print(
            "[b1 governance] ready_rows={ready_rows} ready_view_rows={ready_view_rows} duplicate_keys={duplicate_keys} multi_version_questions={multi}".format(
                ready_rows=summary["ready_rubric_points_rows"],
                ready_view_rows=summary["ready_view_rows"],
                duplicate_keys=summary["duplicate_ready_key_count"],
                multi=summary["multi_version_question_count"],
            )
        )
        print(f"[b1 governance] output={OUTPUT_PATH}")
        return 0 if governance_pass else 1
    except Exception as exc:
        summary = {
            "generated_at_utc": utc_now_iso(),
            "gate_pass": False,
            "release_blocked": True,
            "error": str(exc),
            "steps": command_results,
        }
        write_json_file(OUTPUT_PATH, summary)
        print(f"[b1 governance] error={exc}", file=sys.stderr)
        print(f"[b1 governance] output={OUTPUT_PATH}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
