#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from datetime import date
from pathlib import Path
from typing import Any

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.common.env import load_project_env
from scripts.vlm.db_utils import connect  # noqa: E402


def load_env() -> None:
    load_project_env()



def score_from_verdict(verdict: str | None) -> float:
    if verdict == "correct":
        return 1.0
    if verdict == "partially_correct":
        return 0.5
    return 0.0


def compute_spot_score(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"available": False}
    data = json.loads(path.read_text(encoding="utf-8"))
    records = [r for r in data.get("records", []) if r.get("review")]
    if not records:
        return {"available": True, "records": 0}
    summary = sum(score_from_verdict(r["review"].get("summary_verdict")) for r in records) / len(records)
    qtype = sum(score_from_verdict(r["review"].get("question_type_verdict")) for r in records) / len(records)
    answer_form = sum(score_from_verdict(r["review"].get("answer_form_verdict")) for r in records) / len(records)
    return {
        "available": True,
        "records": len(records),
        "summary_score": summary,
        "question_type_score": qtype,
        "answer_form_score": answer_form,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Production gate for question_descriptions_v1")
    parser.add_argument("--table", default="question_descriptions_v1")
    parser.add_argument(
        "--coverage-mode",
        choices=["jobs_done", "off"],
        default="jobs_done",
        help="Coverage check mode: jobs_done requires table total==vlm_jobs_v0 done(non-contact); off skips this check.",
    )
    parser.add_argument("--spot-json", default="docs/reports/vlm_qc_spot_check.json")
    parser.add_argument("--out-json", default="docs/reports/vlm_production_gate_v1.json")
    parser.add_argument("--out-md", default="docs/reports/vlm_production_gate_v1.md")
    args = parser.parse_args()

    load_env()
    spot = compute_spot_score(Path(args.spot_json))

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                select
                  count(*) as total,
                  count(*) filter (where summary is null or btrim(summary)='') as summary_empty,
                  count(*) filter (
                    where question_type not in ('calculation','proof','graph','definition','multiple_choice','explanation','planning','analysis','MCQ','other')
                  ) as qtype_nonstandard,
                  count(*) filter (
                    where answer_form not in ('exact','approx','proof','graph','table','other')
                  ) as answer_nonstandard,
                  count(*) filter (where storage_key ~* '/questions/contact_sheet\\.png$') as contact_sheet_rows
                from {args.table}
                """
            )
            total, summary_empty, qtype_nonstandard, answer_nonstandard, contact_sheet_rows = cur.fetchone()

            jobs_done_non_contact = None
            if args.coverage_mode == "jobs_done":
                cur.execute(
                    """
                    select count(*)
                    from vlm_jobs_v0
                    where status='done'
                      and storage_key !~* '/questions/contact_sheet\\.png$'
                    """
                )
                jobs_done_non_contact = cur.fetchone()[0]

            cur.execute(
                f"""
                select count(*)
                from (
                  select distinct storage_key
                  from {args.table}
                ) t
                """
            )
            distinct_storage_key = cur.fetchone()[0]

            cur.execute(
                f"""
                select status, count(*) as cnt
                from {args.table}
                group by status
                order by cnt desc, status
                """
            )
            by_status = [{"status": r[0], "count": int(r[1])} for r in cur.fetchall()]

            cur.execute(
                f"""
                select syllabus_code, count(*) as cnt, round(avg(confidence)::numeric, 4) as avg_conf
                from {args.table}
                group by syllabus_code
                order by syllabus_code
                """
            )
            by_syllabus = [
                {"syllabus_code": r[0], "count": int(r[1]), "avg_confidence": float(r[2]) if r[2] is not None else None}
                for r in cur.fetchall()
            ]

            cur.execute(
                f"""
                select
                  count(*) filter (where confidence >= 0.0 and confidence < 0.3),
                  count(*) filter (where confidence >= 0.3 and confidence < 0.5),
                  count(*) filter (where confidence >= 0.5 and confidence < 0.7),
                  count(*) filter (where confidence >= 0.7 and confidence < 0.9),
                  count(*) filter (where confidence >= 0.9 and confidence <= 1.0)
                from {args.table}
                """
            )
            c0, c1, c2, c3, c4 = cur.fetchone()

    if args.coverage_mode == "jobs_done":
        coverage_ok = int(distinct_storage_key) == int(jobs_done_non_contact) == int(total)
    else:
        coverage_ok = True
    summary_empty_rate = (float(summary_empty) / float(total)) if total else 1.0
    hard_pass = all(
        [
            total > 0,
            int(contact_sheet_rows) == 0,
            int(qtype_nonstandard) == 0,
            int(answer_nonstandard) == 0,
            summary_empty_rate <= 0.005,
            coverage_ok,
        ]
    )

    spot_pass = None
    if spot.get("available") and spot.get("records", 0) > 0:
        spot_pass = bool(spot["summary_score"] >= 0.85 and spot["question_type_score"] >= 0.90)

    result = {
        "date": str(date.today()),
        "table": args.table,
        "metrics": {
            "total": int(total),
            "summary_empty": int(summary_empty),
            "summary_empty_rate": summary_empty_rate,
            "qtype_nonstandard": int(qtype_nonstandard),
            "answer_nonstandard": int(answer_nonstandard),
            "contact_sheet_rows": int(contact_sheet_rows),
            "distinct_storage_key": int(distinct_storage_key),
            "jobs_done_non_contact": (int(jobs_done_non_contact) if jobs_done_non_contact is not None else None),
            "coverage_ok": coverage_ok,
            "coverage_mode": args.coverage_mode,
            "by_status": by_status,
            "by_syllabus": by_syllabus,
            "confidence_bins": {
                "[0.0,0.3)": int(c0),
                "[0.3,0.5)": int(c1),
                "[0.5,0.7)": int(c2),
                "[0.7,0.9)": int(c3),
                "[0.9,1.0]": int(c4),
            },
        },
        "spot_check": spot,
        "gate": {
            "hard_pass": hard_pass,
            "spot_pass": spot_pass,
            "final_pass": bool(hard_pass and (spot_pass is not False)),
        },
    }

    out_json = Path(args.out_json)
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [
        "# VLM 生产门禁结果（v1）",
        "",
        f"- 日期: {result['date']}",
        f"- 数据表: `{args.table}`",
        f"- 总量: {result['metrics']['total']}",
        f"- 空摘要: {result['metrics']['summary_empty']} ({result['metrics']['summary_empty_rate']:.2%})",
        f"- 非标准 question_type: {result['metrics']['qtype_nonstandard']}",
        f"- 非标准 answer_form: {result['metrics']['answer_nonstandard']}",
        f"- contact_sheet: {result['metrics']['contact_sheet_rows']}",
        f"- 覆盖一致性: {result['metrics']['coverage_ok']} (mode={result['metrics']['coverage_mode']}, table={result['metrics']['distinct_storage_key']}, jobs_done={result['metrics']['jobs_done_non_contact']})",
        f"- 硬门禁: {'PASS' if result['gate']['hard_pass'] else 'FAIL'}",
    ]
    if spot.get("available"):
        lines.extend(
            [
                f"- 抽检样本数: {spot.get('records', 0)}",
                f"- 抽检 summary 得分: {(spot.get('summary_score', 0.0) * 100):.2f}%",
                f"- 抽检 question_type 得分: {(spot.get('question_type_score', 0.0) * 100):.2f}%",
                f"- 抽检门禁: {'PASS' if (result['gate']['spot_pass'] is True) else ('FAIL' if result['gate']['spot_pass'] is False else 'N/A')}",
            ]
        )
    lines.append(f"- 最终门禁: {'PASS' if result['gate']['final_pass'] else 'FAIL'}")
    Path(args.out_md).write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(json.dumps(result["gate"], ensure_ascii=False))
    print(f"written: {args.out_json}")
    print(f"written: {args.out_md}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
