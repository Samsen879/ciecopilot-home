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
    return f"""你是 CIE A-Level 题目结构化提取器。请阅读图片并只返回 JSON。
必须包含字段：
question_type, answer_form, confidence, summary, math_expressions_latex, variables, units, diagram_elements

约束：
1) summary 必须非空，<=180字符，只描述题目任务，不写答案。
2) question_type 仅可取：
calculation, proof, graph, definition, multiple_choice, explanation, planning, analysis, MCQ, other
3) answer_form 仅可取：
exact, approx, proof, graph, table, other
4) 若图片是空白页/仅答题线且无题干，请返回：
summary=\"blank_or_unreadable\", question_type=\"other\", answer_form=\"other\", confidence=0.1

题目上下文：
syllabus_code={row.get('syllabus_code')}
paper={row.get('paper')}
q_number={row.get('q_number')}
subpart={row.get('subpart')}
"""


def call_with_retry(client: OpenAI, image_path: Path, prompt: str, retries: int = 5) -> tuple[dict | None, str]:
    b64 = base64.b64encode(image_path.read_bytes()).decode("ascii")
    last_txt = ""
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
            last_txt = text or ""
            return parse_json(last_txt), last_txt
        except Exception:
            time.sleep((2**i) + 0.2)
    return None, last_txt


def main() -> int:
    parser = argparse.ArgumentParser(description="Attempt to recover non-ok rows in question_descriptions_v1")
    parser.add_argument("--table", default="question_descriptions_v1")
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--sleep", type=float, default=0.5)
    parser.add_argument("--mirror-v0", action="store_true", help="Also mirror updated row values into latest matching row in question_descriptions_v0")
    parser.add_argument("--out-json", default="docs/reports/vlm_error_recovery_20260208.json")
    args = parser.parse_args()

    load_env()
    api_key = os.environ.get("DASHSCOPE_API_KEY")
    if not api_key:
        raise SystemExit("DASHSCOPE_API_KEY is required")
    client = OpenAI(api_key=api_key, base_url=BASE_URL)

    report: list[dict] = []
    fixed = 0
    unresolved = 0

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                select id, storage_key, status, syllabus_code, paper, q_number, subpart, confidence, summary
                from {args.table}
                where status <> 'ok'
                order by updated_at asc, id asc
                limit %s
                """,
                (args.limit,),
            )
            rows = cur.fetchall()

            for row in rows:
                row_id, storage_key, old_status, syllabus_code, paper, q_number, subpart, old_conf, old_summary = row
                image_path = ASSETS_ROOT / storage_key
                rec = {
                    "id": str(row_id),
                    "storage_key": storage_key,
                    "old_status": old_status,
                    "old_confidence": float(old_conf) if old_conf is not None else None,
                    "old_summary": old_summary,
                }
                if not image_path.exists():
                    rec["result"] = "missing_image"
                    unresolved += 1
                    report.append(rec)
                    continue

                payload = {
                    "syllabus_code": syllabus_code,
                    "paper": paper,
                    "q_number": q_number,
                    "subpart": subpart,
                }
                data, raw_text = call_with_retry(client, image_path, build_prompt(payload))
                if not data:
                    rec["result"] = "parse_failed"
                    rec["raw_preview"] = (raw_text or "")[:300]
                    unresolved += 1
                    report.append(rec)
                    time.sleep(args.sleep)
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

                if summary and summary != "blank_or_unreadable":
                    new_status = "ok"
                    fixed += 1
                    rec["result"] = "fixed_to_ok"
                else:
                    new_status = "error"
                    unresolved += 1
                    summary = summary or "blank_or_unreadable"
                    rec["result"] = "still_unreadable"

                cur.execute(
                    f"""
                    update {args.table}
                    set status=%s,
                        summary=%s,
                        question_type=%s,
                        answer_form=%s,
                        confidence=%s,
                        raw_json=%s::jsonb,
                        updated_at=now()
                    where id=%s
                    """,
                    (new_status, summary, qt, af, conf, json.dumps(data, ensure_ascii=False), row_id),
                )
                if args.mirror_v0 and args.table == "question_descriptions_v1":
                    cur.execute(
                        """
                        with latest as (
                          select id
                          from question_descriptions_v0
                          where storage_key = %s
                          order by updated_at desc, id desc
                          limit 1
                        )
                        update question_descriptions_v0 v0
                        set status=%s,
                            summary=%s,
                            question_type=%s,
                            answer_form=%s,
                            confidence=%s,
                            raw_json=%s::jsonb,
                            updated_at=now()
                        from latest
                        where v0.id = latest.id
                        """,
                        (storage_key, new_status, summary, qt, af, conf, json.dumps(data, ensure_ascii=False)),
                    )
                rec["new_status"] = new_status
                rec["new_confidence"] = conf
                rec["new_summary"] = summary
                report.append(rec)
                time.sleep(args.sleep)

            conn.commit()

            cur.execute(f"select count(*) from {args.table} where status <> 'ok'")
            remaining = cur.fetchone()[0]

    out_path = Path(args.out_json)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(
            {
                "table": args.table,
                "processed": len(report),
                "fixed_to_ok": fixed,
                "unresolved": unresolved,
                "remaining_non_ok": remaining,
                "records": report,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"processed={len(report)} fixed_to_ok={fixed} unresolved={unresolved} remaining_non_ok={remaining}")
    print(f"written={out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
