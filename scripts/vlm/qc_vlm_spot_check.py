#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import os
import random
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from openai import OpenAI

from scripts.vlm.qc_common import (
    DEFAULT_SPOT_CHECK_JSON,
    get_connection,
    query_all,
    safe_float,
    today_str,
    write_json,
)


ASSETS_ROOT = Path(r"C:\Users\Samsen\cie-assets")
MODEL = "qwen3-vl-flash"
BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
TARGET_SYLLABUS = ["9709", "9231", "9702"]
SAMPLE_PER_SYLLABUS = 15
BAND_TARGET = 5
SLEEP_SECONDS = 1.0

JSON_BLOCK_REPLACEMENTS = ("```json", "```")


def make_prompt(row: dict[str, Any]) -> str:
    return f"""你是一个 CIE A-Level 考试题目的质量审核员。我会给你一张题目截图和一份已有的结构化提取结果。
请对比图片内容和提取结果，对以下字段逐一评分（correct / partially_correct / incorrect / cannot_judge）：

已有提取结果：
- summary: {row.get("summary")}
- question_type: {row.get("question_type")}
- answer_form: {row.get("answer_form")}
- math_expressions_latex: {row.get("math_expressions_latex")}
- variables: {row.get("variables")}
- units: {row.get("units")}

请以 JSON 格式返回评审结果，不要输出其他内容：
{{
  "summary_verdict": "correct|partially_correct|incorrect",
  "summary_comment": "简短说明",
  "question_type_verdict": "correct|partially_correct|incorrect",
  "answer_form_verdict": "correct|partially_correct|incorrect",
  "math_latex_verdict": "correct|partially_correct|incorrect|cannot_judge",
  "variables_verdict": "correct|partially_correct|incorrect|cannot_judge",
  "units_verdict": "correct|partially_correct|incorrect|cannot_judge",
  "overall_quality": "good|acceptable|poor",
  "issues": ["issue1", "issue2"]
}}"""


def parse_json_response(text: str) -> dict[str, Any] | None:
    if not text:
        return None
    candidate = text.strip()
    try:
        return json.loads(candidate)
    except Exception:
        pass
    for marker in JSON_BLOCK_REPLACEMENTS:
        candidate = candidate.replace(marker, "")
    candidate = candidate.strip()
    try:
        return json.loads(candidate)
    except Exception:
        return None


def is_rate_limit_error(exc: Exception) -> bool:
    if getattr(exc, "status_code", None) == 429:
        return True
    body = str(exc).lower()
    return "429" in body or "rate limit" in body


def call_vlm_with_retry(client: OpenAI, image_path: Path, prompt: str, max_retries: int = 5) -> dict[str, Any]:
    image_bytes = image_path.read_bytes()
    b64 = base64.b64encode(image_bytes).decode("ascii")
    last_exc: Exception | None = None

    for attempt in range(max_retries):
        try:
            resp = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "user", "content": [{"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}, {"type": "text", "text": prompt}]}
                ],
                extra_body={"enable_thinking": False},
            )
            content = resp.choices[0].message.content if resp.choices else ""
            parsed = parse_json_response(content or "")
            if parsed is None:
                return {"parse_failed": True, "raw_text": content}
            return {"parse_failed": False, "result": parsed, "raw_text": content}
        except Exception as exc:
            if not is_rate_limit_error(exc):
                raise
            last_exc = exc
            delay = (2 ** attempt) + random.random()
            time.sleep(delay)

    raise last_exc if last_exc else RuntimeError("Unknown retry failure")


def sample_for_syllabus(cur, syllabus_code: str, table: str) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    selected_keys: set[str] = set()
    bands = [
        ("high", "confidence > 0.8"),
        ("mid", "confidence >= 0.5 AND confidence <= 0.8"),
        ("low", "confidence < 0.5"),
    ]

    for band_name, where_clause in bands:
        rows = query_all(
            cur,
            f"""
            SELECT storage_key, syllabus_code, confidence, summary, question_type, answer_form,
                   math_expressions_latex, variables, units
            FROM {table}
            WHERE syllabus_code = %(syllabus)s
              AND confidence IS NOT NULL
              AND storage_key !~* '/questions/contact_sheet\\.png$'
              AND {where_clause}
            ORDER BY RANDOM()
            LIMIT %(lim)s
            """,
            {"syllabus": syllabus_code, "lim": BAND_TARGET},
        )
        for row in rows:
            row["sample_band"] = band_name
            if row["storage_key"] not in selected_keys:
                selected.append(row)
                selected_keys.add(row["storage_key"])

    if len(selected) < SAMPLE_PER_SYLLABUS:
        top_up = query_all(
            cur,
            f"""
            SELECT storage_key, syllabus_code, confidence, summary, question_type, answer_form,
                   math_expressions_latex, variables, units
            FROM {table}
            WHERE syllabus_code = %(syllabus)s
              AND confidence IS NOT NULL
              AND storage_key !~* '/questions/contact_sheet\\.png$'
              AND storage_key <> ALL(%(picked)s)
            ORDER BY RANDOM()
            LIMIT %(lim)s
            """,
            {
                "syllabus": syllabus_code,
                "picked": list(selected_keys) if selected_keys else [""],
                "lim": SAMPLE_PER_SYLLABUS - len(selected),
            },
        )
        for row in top_up:
            row["sample_band"] = "top_up"
            if row["storage_key"] not in selected_keys:
                selected.append(row)
                selected_keys.add(row["storage_key"])

    return selected[:SAMPLE_PER_SYLLABUS]


def compute_aggregates(records: list[dict[str, Any]]) -> dict[str, Any]:
    verdict_fields = [
        "summary_verdict",
        "question_type_verdict",
        "answer_form_verdict",
        "math_latex_verdict",
        "variables_verdict",
        "units_verdict",
    ]
    allowed = ["correct", "partially_correct", "incorrect", "cannot_judge"]

    overall = {}
    for vf in verdict_fields:
        cnt = Counter()
        for r in records:
            if not r.get("review"):
                continue
            v = r["review"].get(vf)
            if v:
                cnt[v] += 1
        overall[vf] = {k: cnt.get(k, 0) for k in allowed}

    def score_of(v: str | None) -> float:
        if v == "correct":
            return 1.0
        if v == "partially_correct":
            return 0.5
        if v == "incorrect":
            return 0.0
        return 0.0

    subject_scores: dict[str, dict[str, Any]] = {}
    band_scores: dict[str, dict[str, Any]] = {}

    by_subject = defaultdict(list)
    by_band = defaultdict(list)
    for r in records:
        if r.get("review"):
            by_subject[r["syllabus_code"]].append(r)
            by_band[r.get("sample_band", "unknown")].append(r)

    for subject, recs in by_subject.items():
        s = {"count": len(recs)}
        for vf in verdict_fields:
            vals = [score_of(x["review"].get(vf)) for x in recs]
            s[f"{vf}_score"] = (sum(vals) / len(vals)) if vals else None
        subject_scores[subject] = s

    for band, recs in by_band.items():
        s = {"count": len(recs)}
        for vf in verdict_fields:
            vals = [score_of(x["review"].get(vf)) for x in recs]
            s[f"{vf}_score"] = (sum(vals) / len(vals)) if vals else None
        band_scores[band] = s

    poor_cases = [
        {
            "storage_key": r["storage_key"],
            "syllabus_code": r["syllabus_code"],
            "confidence": r["confidence"],
            "summary": r.get("summary"),
            "review": r.get("review"),
        }
        for r in records
        if r.get("review", {}).get("overall_quality") == "poor"
    ]

    return {
        "field_verdict_counts": overall,
        "by_syllabus_scores": subject_scores,
        "by_confidence_band_scores": band_scores,
        "poor_cases": poor_cases,
    }


def run_spot_check(table: str = "question_descriptions_v0") -> dict[str, Any]:
    api_key = os.environ.get("DASHSCOPE_API_KEY")
    if not api_key:
        raise RuntimeError("DASHSCOPE_API_KEY is required (loaded from .env or environment)")

    with get_connection() as conn:
        with conn.cursor() as cur:
            sampled = []
            for syllabus in TARGET_SYLLABUS:
                sampled.extend(sample_for_syllabus(cur, syllabus, table))

    client = OpenAI(api_key=api_key, base_url=BASE_URL)
    results: list[dict[str, Any]] = []

    for idx, row in enumerate(sampled, start=1):
        storage_key = row["storage_key"]
        image_path = ASSETS_ROOT / storage_key
        base_row = {
            "index": idx,
            "storage_key": storage_key,
            "syllabus_code": row["syllabus_code"],
            "confidence": safe_float(row.get("confidence")),
            "sample_band": row.get("sample_band"),
            "summary": row.get("summary"),
            "question_type": row.get("question_type"),
            "answer_form": row.get("answer_form"),
            "math_expressions_latex": row.get("math_expressions_latex") or [],
            "variables": row.get("variables") or [],
            "units": row.get("units") or [],
        }
        if not image_path.exists():
            base_row["error"] = "image_not_found"
            base_row["image_path"] = str(image_path)
            results.append(base_row)
            continue

        prompt = make_prompt(row)
        try:
            call_result = call_vlm_with_retry(client, image_path, prompt)
            if call_result.get("parse_failed"):
                base_row["error"] = "review_parse_failed"
                base_row["raw_text"] = call_result.get("raw_text")
            else:
                base_row["review"] = call_result["result"]
        except Exception as exc:
            base_row["error"] = f"api_error: {exc}"

        results.append(base_row)
        time.sleep(SLEEP_SECONDS)

    aggregates = compute_aggregates(results)
    return {
        "date": today_str(),
        "table": table,
        "model": MODEL,
        "assets_root": str(ASSETS_ROOT),
        "sample_size": len(results),
        "records": results,
        "aggregates": aggregates,
    }


def print_summary(data: dict[str, Any]) -> None:
    print("=== VLM 辅助抽检 ===")
    print(f"日期: {data['date']}")
    print(f"模型: {data['model']}")
    print(f"样本量: {data['sample_size']}")

    ok = sum(1 for r in data["records"] if r.get("review"))
    err = len(data["records"]) - ok
    print(f"成功评审: {ok}")
    print(f"失败/缺失: {err}")

    print("字段 verdict 计数:")
    for field, counts in data["aggregates"]["field_verdict_counts"].items():
        print(
            f"  - {field}: correct={counts.get('correct',0)}, "
            f"partially_correct={counts.get('partially_correct',0)}, "
            f"incorrect={counts.get('incorrect',0)}, cannot_judge={counts.get('cannot_judge',0)}"
        )

    poor_cases = data["aggregates"]["poor_cases"]
    print(f"overall_quality=poor 数量: {len(poor_cases)}")
    for case in poor_cases:
        print(f"  - {case['storage_key']} | {case['syllabus_code']} | conf={case['confidence']}")


def main() -> int:
    parser = argparse.ArgumentParser(description="VLM spot-check for question_descriptions table")
    parser.add_argument(
        "--table",
        type=str,
        default="question_descriptions_v0",
        help="Source table for sampling (default: question_descriptions_v0)",
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        default=DEFAULT_SPOT_CHECK_JSON,
        help=f"Path to write spot-check json (default: {DEFAULT_SPOT_CHECK_JSON})",
    )
    args = parser.parse_args()

    data = run_spot_check(args.table)
    print_summary(data)
    write_json(args.output_json, data)
    print(f"\nSpot-check JSON 已写入: {args.output_json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
