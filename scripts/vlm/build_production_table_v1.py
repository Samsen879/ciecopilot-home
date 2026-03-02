#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.common.env import load_project_env
from scripts.vlm.db_utils import connect, json_param  # noqa: E402


VALID_QT = {
    "calculation",
    "proof",
    "graph",
    "definition",
    "multiple_choice",
    "explanation",
    "planning",
    "analysis",
    "MCQ",
    "other",
}
VALID_AF = {"exact", "approx", "proof", "graph", "table", "other"}

QT_ALIASES = {
    "mcq": "multiple_choice",
    "multiple choice": "multiple_choice",
    "multiple-choice": "multiple_choice",
    "contact_sheet": "other",
    "contact sheet": "other",
    "not_a_question": "other",
    "unknown": "other",
    "calculus": "calculation",
    "mechanics": "calculation",
    "statistics": "analysis",
}

AF_ALIASES = {
    "numeric": "exact",
    "number": "exact",
    "calculation": "exact",
    "mcq": "other",
    "multiple_choice": "other",
    "multiple-choice": "other",
    "choice": "other",
}


def normalize_qt(v: str | None) -> str:
    if not v:
        return "other"
    raw = v.strip()
    if raw in VALID_QT:
        return raw
    l = raw.lower()
    if l in VALID_QT:
        return l
    if l in QT_ALIASES:
        return QT_ALIASES[l]
    return "other"


def normalize_af(v: str | None, qt: str) -> str:
    if qt in {"multiple_choice", "MCQ"}:
        return "other"
    if not v:
        return "other"
    raw = v.strip()
    if raw in VALID_AF:
        return raw
    l = raw.lower()
    if l in VALID_AF:
        return l
    if l in AF_ALIASES:
        return AF_ALIASES[l]
    return "other"


def load_env() -> None:
    load_project_env()



def main() -> int:
    parser = argparse.ArgumentParser(description="Build normalized production table question_descriptions_v1")
    parser.add_argument("--target", default="question_descriptions_v1")
    args = parser.parse_args()

    load_env()
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(f"create table if not exists {args.target} (like question_descriptions_v0 including all)")
            cur.execute(f"truncate table {args.target}")

            cur.execute(
                """
                select distinct on (storage_key)
                  storage_key, sha256, syllabus_code, session, year, doc_type, paper, variant,
                  q_number, subpart, status, confidence, summary, question_type, answer_form,
                  math_expressions_latex, variables, units, diagram_elements, leakage_flags,
                  provider, model, prompt_version, extractor_version, response_sha256, raw_json
                from question_descriptions_v0
                where storage_key !~* '/questions/contact_sheet\\.png$'
                order by storage_key, updated_at desc, id desc
                """
            )
            rows = cur.fetchall()

            insert_sql = f"""
                insert into {args.target} (
                  storage_key, sha256, syllabus_code, session, year, doc_type, paper, variant,
                  q_number, subpart, status, confidence, summary, question_type, answer_form,
                  math_expressions_latex, variables, units, diagram_elements, leakage_flags,
                  provider, model, prompt_version, extractor_version, response_sha256, raw_json,
                  created_at, updated_at
                ) values (
                  %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                  now(),now()
                )
                on conflict (storage_key, sha256, extractor_version, provider, model, prompt_version)
                do update set
                  status = excluded.status,
                  confidence = excluded.confidence,
                  summary = excluded.summary,
                  question_type = excluded.question_type,
                  answer_form = excluded.answer_form,
                  math_expressions_latex = excluded.math_expressions_latex,
                  variables = excluded.variables,
                  units = excluded.units,
                  diagram_elements = excluded.diagram_elements,
                  leakage_flags = excluded.leakage_flags,
                  response_sha256 = excluded.response_sha256,
                  raw_json = excluded.raw_json,
                  updated_at = now()
            """

            batch = []
            for r in rows:
                r = list(r)
                qt = normalize_qt(r[13])
                af = normalize_af(r[14], qt)
                r[13] = qt
                r[14] = af
                # psycopg needs explicit JSON adapters for dict payloads.
                r[19] = json_param(r[19]) if r[19] is not None else None
                r[25] = json_param(r[25]) if r[25] is not None else None
                if r[12] is not None:
                    summary = " ".join(str(r[12]).replace("\n", " ").split()).strip()
                    r[12] = summary[:180] if summary else None
                batch.append(tuple(r))
            cur.executemany(insert_sql, batch)

            cur.execute(
                f"""
                select
                  count(1),
                  count(1) filter (where summary is null or btrim(summary)=''),
                  count(1) filter (where question_type not in ('calculation','proof','graph','definition','multiple_choice','explanation','planning','analysis','MCQ','other')),
                  count(1) filter (where answer_form not in ('exact','approx','proof','graph','table','other'))
                from {args.target}
                """
            )
            total, summary_empty, qtype_nonstandard, answer_nonstandard = cur.fetchone()
            print(f"target={args.target}")
            print(f"total={total}")
            print(f"summary_empty={summary_empty}")
            print(f"qtype_nonstandard={qtype_nonstandard}")
            print(f"answer_nonstandard={answer_nonstandard}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
