#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import time
from pathlib import Path

from openai import OpenAI

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.common.env import load_project_env
from scripts.vlm.db_utils import connect  # noqa: E402


ASSETS_ROOT = Path(r"C:\Users\Samsen\cie-assets")
MODEL = "qwen3-vl-flash"
BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
CODE_BLOCK_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)

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


def load_env() -> None:
    load_project_env()



def parse_json(text: str) -> dict | None:
    if not text:
        return None
    try:
        x = json.loads(text)
        return x if isinstance(x, dict) else None
    except Exception:
        pass
    m = CODE_BLOCK_RE.search(text)
    if not m:
        return None
    try:
        x = json.loads(m.group(1))
        return x if isinstance(x, dict) else None
    except Exception:
        return None


def normalize_summary(v) -> str | None:
    if v is None:
        return None
    s = " ".join(str(v).replace("\n", " ").split()).strip()
    if not s:
        return None
    return s[:180]


def normalize_qt(v) -> str:
    if not v:
        return "other"
    s = str(v).strip()
    if s in VALID_QT:
        return s
    l = s.lower()
    if l in VALID_QT:
        return l
    if l in {"mcq", "multiple choice", "multiple-choice"}:
        return "multiple_choice"
    return "other"


def normalize_af(v, qt: str) -> str:
    if qt in {"multiple_choice", "MCQ"}:
        return "other"
    if not v:
        return "other"
    s = str(v).strip()
    if s in VALID_AF:
        return s
    l = s.lower()
    if l in VALID_AF:
        return l
    if l in {"mcq", "multiple_choice", "multiple-choice", "choice"}:
        return "other"
    if l in {"numeric", "number", "calculation"}:
        return "exact"
    return "other"


def build_prompt(row: dict) -> str:
    return f"""你是 CIE A-Level 题目结构化提取器。请读取图片并返回单个 JSON（不要 markdown）。
必须包含以下字段：
question_type, answer_form, confidence, summary, math_expressions_latex, variables, units, diagram_elements

约束：
1) summary 必须非空，且<=180字符，只描述题目要求，不给答案。
2) question_type 仅可取：
calculation, proof, graph, definition, multiple_choice, explanation, planning, analysis, MCQ, other
3) answer_form 仅可取：
exact, approx, proof, graph, table, other
4) 如果是选择题，优先 question_type=multiple_choice 且 answer_form=other

题目上下文：
syllabus_code={row.get('syllabus_code')}
paper={row.get('paper')}
q_number={row.get('q_number')}
subpart={row.get('subpart')}
"""


def call_with_retry(client: OpenAI, image_path: Path, prompt: str, retries: int = 5) -> dict | None:
    b64 = base64.b64encode(image_path.read_bytes()).decode("ascii")
    for i in range(retries):
        try:
            resp = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                            {"type": "text", "text": prompt},
                        ],
                    }
                ],
                extra_body={"enable_thinking": False},
            )
            text = resp.choices[0].message.content if resp.choices else ""
            return parse_json(text or "")
        except Exception:
            time.sleep((2**i) + 0.2)
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Fill empty summaries in question_descriptions_v1 by re-calling VLM")
    parser.add_argument("--target", default="question_descriptions_v1")
    parser.add_argument("--limit", type=int, default=200)
    parser.add_argument("--sleep", type=float, default=1.0)
    args = parser.parse_args()

    load_env()
    api_key = os.environ.get("DASHSCOPE_API_KEY")
    if not api_key:
        raise SystemExit("DASHSCOPE_API_KEY is required")

    client = OpenAI(api_key=api_key, base_url=BASE_URL)
    fixed = 0
    failed = 0
    total = 0

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                select id, storage_key, syllabus_code, paper, q_number, subpart
                from {args.target}
                where summary is null or btrim(summary)=''
                order by id
                limit %s
                """,
                (args.limit,),
            )
            rows = cur.fetchall()

            for row in rows:
                total += 1
                row_id, storage_key, syllabus_code, paper, q_number, subpart = row
                image_path = ASSETS_ROOT / storage_key
                if not image_path.exists():
                    failed += 1
                    continue
                payload = {
                    "syllabus_code": syllabus_code,
                    "paper": paper,
                    "q_number": q_number,
                    "subpart": subpart,
                }
                data = call_with_retry(client, image_path, build_prompt(payload))
                if not data:
                    failed += 1
                    continue
                summary = normalize_summary(data.get("summary"))
                qt = normalize_qt(data.get("question_type"))
                af = normalize_af(data.get("answer_form"), qt)
                conf = data.get("confidence", 0.3)
                try:
                    conf = float(conf)
                except Exception:
                    conf = 0.3
                conf = max(0.0, min(1.0, conf))
                if not summary:
                    failed += 1
                    continue
                cur.execute(
                    f"""
                    update {args.target}
                    set summary=%s,
                        question_type=%s,
                        answer_form=%s,
                        confidence=%s,
                        status=case when status='error' then 'needs_review' else status end,
                        raw_json=%s::jsonb,
                        updated_at=now()
                    where id=%s
                    """,
                    (summary, qt, af, conf, json.dumps(data, ensure_ascii=False), row_id),
                )
                fixed += 1
                time.sleep(args.sleep)
            conn.commit()

            cur.execute(
                f"""
                select
                  count(1),
                  count(1) filter (where summary is null or btrim(summary)=''),
                  count(1) filter (where question_type not in ('calculation','proof','graph','definition','multiple_choice','explanation','planning','analysis','MCQ','other')),
                  count(1) filter (where answer_form not in ('exact','approx','proof','graph','table','other')),
                  count(1) filter (where storage_key ~* '/questions/contact_sheet\\.png$')
                from {args.target}
                """
            )
            total_rows, summary_empty, qt_bad, af_bad, contact_cnt = cur.fetchone()

    print(f"processed={total} fixed={fixed} failed={failed}")
    print(f"rows={total_rows} summary_empty={summary_empty} qtype_nonstandard={qt_bad} answer_nonstandard={af_bad} contact_sheet_rows={contact_cnt}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

