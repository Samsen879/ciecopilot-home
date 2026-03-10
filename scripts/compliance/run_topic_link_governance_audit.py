#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.common.env import load_project_env
from scripts.phase1.common import require_db_url, utc_now_iso, write_json_file

SUMMARY_PATH = PROJECT_ROOT / "runs" / "a1" / "a1_gate_summary.json"
OUTPUT_PATH = PROJECT_ROOT / "runs" / "a1" / "a1_topic_link_governance_summary.json"


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
    if not SUMMARY_PATH.exists():
        return None
    try:
        return json.loads(SUMMARY_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def _load_csv_storage_keys(input_csv: Path) -> list[str]:
    with input_csv.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        return [row["storage_key"] for row in reader if row.get("storage_key")]


def _query_audits(input_csv: Path) -> dict:
    import psycopg2  # type: ignore

    storage_keys = _load_csv_storage_keys(input_csv)
    conn = psycopg2.connect(require_db_url())
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*)
                FROM public.question_concept_links qcl
                LEFT JOIN public.curriculum_nodes cn ON cn.node_id = qcl.node_id
                WHERE qcl.link_type = 'primary'
                  AND qcl.node_id IS NOT NULL
                  AND cn.node_id IS NULL;
                """
            )
            broken_primary_link_count = cur.fetchone()[0]

            cur.execute(
                """
                SELECT COUNT(*)
                FROM public.question_concept_links qcl
                LEFT JOIN public.question_descriptions_prod_v1 qd
                  ON qd.storage_key = qcl.storage_key
                WHERE qcl.link_type = 'primary'
                  AND qd.storage_key IS NULL;
                """
            )
            stale_asset_link_count = cur.fetchone()[0]

            cur.execute(
                """
                SELECT COUNT(*)
                FROM (
                    SELECT storage_key
                    FROM public.question_descriptions_prod_v1
                    GROUP BY storage_key
                    HAVING COUNT(*) > 1
                ) dup;
                """
            )
            duplicate_question_description_storage_key_count = cur.fetchone()[0]

            cur.execute(
                """
                SELECT COUNT(*)
                FROM (
                    SELECT storage_key
                    FROM public.question_concept_links
                    WHERE link_type = 'primary'
                    GROUP BY storage_key
                    HAVING COUNT(*) > 1
                ) dup;
                """
            )
            duplicate_primary_link_storage_key_count = cur.fetchone()[0]

            cur.execute(
                """
                SELECT COALESCE(source, '__NULL__') AS source, COUNT(*) AS cnt
                FROM public.question_concept_links
                WHERE link_type = 'primary'
                GROUP BY 1
                ORDER BY cnt DESC;
                """
            )
            source_distribution = {row[0]: row[1] for row in cur.fetchall()}

            if storage_keys:
                cur.execute(
                    """
                    SELECT COUNT(*)
                    FROM unnest(%s::text[]) AS audit(storage_key)
                    LEFT JOIN public.question_concept_links qcl
                      ON qcl.storage_key = audit.storage_key
                     AND qcl.link_type = 'primary'
                    WHERE qcl.storage_key IS NULL;
                    """,
                    (storage_keys,),
                )
                missing_primary_links_for_audit_sample = cur.fetchone()[0]
            else:
                missing_primary_links_for_audit_sample = 0
    finally:
        conn.close()

    return {
        "broken_primary_link_count": broken_primary_link_count,
        "stale_asset_link_count": stale_asset_link_count,
        "duplicate_question_description_storage_key_count": duplicate_question_description_storage_key_count,
        "duplicate_primary_link_storage_key_count": duplicate_primary_link_storage_key_count,
        "missing_primary_links_for_audit_sample": missing_primary_links_for_audit_sample,
        "primary_link_source_distribution": source_distribution,
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run A1 topic-link governance audit")
    parser.add_argument(
        "--input",
        type=Path,
        default=PROJECT_ROOT / "tests" / "fixtures" / "a1_gate_audit_sample.csv",
        help="Audit CSV consumed by the A1 quality gate",
    )
    parser.add_argument(
        "--source",
        default="a1_keyword_mapper_v1",
        help="question_concept_links.source value expected by the A1 gate",
    )
    parser.add_argument("--seed", action="store_true", help="Seed deterministic A1 fixture data first")
    parser.add_argument("--allow-remote", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    load_project_env()

    command_results: list[dict] = []
    try:
        if args.seed:
            command_results.append(
                _run_command([sys.executable, "scripts/evaluation/seed_a1_gate_fixture.py"])
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

        gate_cmd = [
            sys.executable,
            "scripts/evaluation/run_a1_quality_gate.py",
            "--input",
            str(args.input),
            "--source",
            args.source,
        ]
        if args.allow_remote:
            gate_cmd.append("--allow-remote")
        command_results.append(_run_command(gate_cmd))

        gate_summary = _load_summary()
        try:
            audits = _query_audits(args.input)
        except Exception as exc:
            audits = {"audit_query_error": str(exc)}
        gate_pass = bool(gate_summary and gate_summary.get("gate_pass"))
        governance_pass = gate_pass and "audit_query_error" not in audits and all(
            int(audits.get(name, 0)) == 0
            for name in (
                "broken_primary_link_count",
                "stale_asset_link_count",
                "duplicate_question_description_storage_key_count",
                "duplicate_primary_link_storage_key_count",
                "missing_primary_links_for_audit_sample",
            )
        )

        summary = {
            "generated_at_utc": utc_now_iso(),
            "gate_pass": governance_pass,
            "release_blocked": not governance_pass,
            "input_csv": str(args.input),
            "source": args.source,
            "a1_gate_pass": gate_pass,
            "a1_gate_summary_path": str(SUMMARY_PATH),
            "steps": command_results,
            **audits,
        }
        write_json_file(OUTPUT_PATH, summary)

        print(f"[a1 governance] gate_pass={governance_pass}")
        print(
            "[a1 governance] broken={broken} stale={stale} duplicate={duplicate} missing_sample={missing}".format(
                broken=summary.get("broken_primary_link_count", 0),
                stale=summary.get("stale_asset_link_count", 0),
                duplicate=summary.get("duplicate_primary_link_storage_key_count", 0),
                missing=summary.get("missing_primary_links_for_audit_sample", 0),
            )
        )
        print(f"[a1 governance] output={OUTPUT_PATH}")
        return 0 if governance_pass else 1
    except Exception as exc:
        summary = {
            "generated_at_utc": utc_now_iso(),
            "gate_pass": False,
            "release_blocked": True,
            "input_csv": str(args.input),
            "source": args.source,
            "steps": command_results,
            "error": str(exc),
        }
        write_json_file(OUTPUT_PATH, summary)
        print(f"[a1 governance] error={exc}", file=sys.stderr)
        print(f"[a1 governance] output={OUTPUT_PATH}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
