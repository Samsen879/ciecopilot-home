#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.qc_common import (
    DEFAULT_STATS_JSON,
    get_connection,
    query_all,
    query_one,
    safe_float,
    write_json,
)


def collect_stats() -> dict[str, Any]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            overview = {
                "total_records": query_one(
                    cur,
                    "SELECT COUNT(*)::bigint AS total_records FROM question_descriptions_v0",
                ).get("total_records", 0),
                "by_status": query_all(
                    cur,
                    """
                    SELECT status, COUNT(*)::bigint AS cnt
                    FROM question_descriptions_v0
                    GROUP BY status
                    ORDER BY cnt DESC, status
                    """,
                ),
                "by_syllabus": query_all(
                    cur,
                    """
                    SELECT syllabus_code, COUNT(*)::bigint AS cnt
                    FROM question_descriptions_v0
                    GROUP BY syllabus_code
                    ORDER BY syllabus_code
                    """,
                ),
            }

            question_type_dist = query_all(
                cur,
                """
                SELECT
                  syllabus_code,
                  COALESCE(question_type, 'NULL') AS question_type,
                  COUNT(*)::bigint AS cnt
                FROM question_descriptions_v0
                GROUP BY syllabus_code, COALESCE(question_type, 'NULL')
                ORDER BY syllabus_code, cnt DESC, question_type
                """,
            )

            answer_form_dist = query_all(
                cur,
                """
                SELECT
                  syllabus_code,
                  COALESCE(answer_form, 'NULL') AS answer_form,
                  COUNT(*)::bigint AS cnt
                FROM question_descriptions_v0
                GROUP BY syllabus_code, COALESCE(answer_form, 'NULL')
                ORDER BY syllabus_code, cnt DESC, answer_form
                """,
            )

            confidence_stats = query_one(
                cur,
                """
                SELECT
                  MIN(confidence)::float8 AS min_confidence,
                  MAX(confidence)::float8 AS max_confidence,
                  AVG(confidence)::float8 AS mean_confidence,
                  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY confidence)::float8 AS median_confidence,
                  STDDEV_POP(confidence)::float8 AS stddev_confidence
                FROM question_descriptions_v0
                WHERE confidence IS NOT NULL
                """,
            )

            confidence_bins = query_all(
                cur,
                """
                SELECT bucket, COUNT(*)::bigint AS cnt
                FROM (
                  SELECT
                    CASE
                      WHEN confidence >= 0.0 AND confidence < 0.3 THEN '[0.0,0.3)'
                      WHEN confidence >= 0.3 AND confidence < 0.5 THEN '[0.3,0.5)'
                      WHEN confidence >= 0.5 AND confidence < 0.7 THEN '[0.5,0.7)'
                      WHEN confidence >= 0.7 AND confidence < 0.9 THEN '[0.7,0.9)'
                      WHEN confidence >= 0.9 AND confidence <= 1.0 THEN '[0.9,1.0]'
                      ELSE 'outside_range_or_null'
                    END AS bucket
                  FROM question_descriptions_v0
                ) t
                GROUP BY bucket
                ORDER BY
                  CASE bucket
                    WHEN '[0.0,0.3)' THEN 1
                    WHEN '[0.3,0.5)' THEN 2
                    WHEN '[0.5,0.7)' THEN 3
                    WHEN '[0.7,0.9)' THEN 4
                    WHEN '[0.9,1.0]' THEN 5
                    ELSE 6
                  END
                """,
            )

            arrays = {
                "math_expressions_latex": query_one(
                    cur,
                    """
                    SELECT
                      COUNT(*)::bigint AS total_rows,
                      COUNT(*) FILTER (
                        WHERE math_expressions_latex IS NULL OR COALESCE(array_length(math_expressions_latex, 1), 0) = 0
                      )::bigint AS empty_rows,
                      AVG(array_length(math_expressions_latex, 1)::float8) FILTER (
                        WHERE math_expressions_latex IS NOT NULL AND COALESCE(array_length(math_expressions_latex, 1), 0) > 0
                      ) AS avg_len_non_empty
                    FROM question_descriptions_v0
                    """,
                ),
                "variables": query_one(
                    cur,
                    """
                    SELECT
                      COUNT(*)::bigint AS total_rows,
                      COUNT(*) FILTER (
                        WHERE variables IS NULL OR COALESCE(array_length(variables, 1), 0) = 0
                      )::bigint AS empty_rows,
                      AVG(array_length(variables, 1)::float8) FILTER (
                        WHERE variables IS NOT NULL AND COALESCE(array_length(variables, 1), 0) > 0
                      ) AS avg_len_non_empty
                    FROM question_descriptions_v0
                    """,
                ),
                "units_by_syllabus": query_all(
                    cur,
                    """
                    SELECT
                      syllabus_code,
                      COUNT(*)::bigint AS total_rows,
                      COUNT(*) FILTER (
                        WHERE units IS NULL OR COALESCE(array_length(units, 1), 0) = 0
                      )::bigint AS empty_rows,
                      AVG(array_length(units, 1)::float8) FILTER (
                        WHERE units IS NOT NULL AND COALESCE(array_length(units, 1), 0) > 0
                      ) AS avg_len_non_empty
                    FROM question_descriptions_v0
                    GROUP BY syllabus_code
                    ORDER BY syllabus_code
                    """,
                ),
                "diagram_elements": query_one(
                    cur,
                    """
                    SELECT
                      COUNT(*)::bigint AS total_rows,
                      COUNT(*) FILTER (
                        WHERE diagram_elements IS NULL OR COALESCE(array_length(diagram_elements, 1), 0) = 0
                      )::bigint AS empty_rows,
                      AVG(array_length(diagram_elements, 1)::float8) FILTER (
                        WHERE diagram_elements IS NOT NULL AND COALESCE(array_length(diagram_elements, 1), 0) > 0
                      ) AS avg_len_non_empty
                    FROM question_descriptions_v0
                    """,
                ),
            }

            anomalies = {
                "summary_null_or_empty_count": query_one(
                    cur,
                    """
                    SELECT COUNT(*)::bigint AS cnt
                    FROM question_descriptions_v0
                    WHERE summary IS NULL OR BTRIM(summary) = ''
                    """,
                ).get("cnt", 0),
                "summary_len_gt_180_count": query_one(
                    cur,
                    """
                    SELECT COUNT(*)::bigint AS cnt
                    FROM question_descriptions_v0
                    WHERE summary IS NOT NULL AND LENGTH(summary) > 180
                    """,
                ).get("cnt", 0),
                "low_confidence_records": query_all(
                    cur,
                    """
                    SELECT storage_key, summary, confidence
                    FROM question_descriptions_v0
                    WHERE confidence IS NOT NULL AND confidence < 0.3
                    ORDER BY confidence ASC, storage_key
                    """,
                ),
                "leakage_non_empty_count": query_one(
                    cur,
                    """
                    SELECT COUNT(*)::bigint AS cnt
                    FROM question_descriptions_v0
                    WHERE leakage_flags IS NOT NULL
                      AND jsonb_typeof(leakage_flags) = 'object'
                      AND leakage_flags <> '{}'::jsonb
                    """,
                ).get("cnt", 0),
                "leakage_flag_type_distribution": query_all(
                    cur,
                    """
                    SELECT key AS flag_type, COUNT(*)::bigint AS cnt
                    FROM question_descriptions_v0 q,
                         LATERAL jsonb_object_keys(
                           CASE
                             WHEN q.leakage_flags IS NULL OR jsonb_typeof(q.leakage_flags) <> 'object' THEN '{}'::jsonb
                             ELSE q.leakage_flags
                           END
                         ) key
                    GROUP BY key
                    ORDER BY cnt DESC, key
                    """,
                ),
                "blocked_records": query_all(
                    cur,
                    """
                    SELECT storage_key, summary, leakage_flags
                    FROM question_descriptions_v0
                    WHERE status = 'blocked'
                    ORDER BY storage_key
                    """,
                ),
                "question_type_other_by_syllabus": query_all(
                    cur,
                    """
                    SELECT syllabus_code, COUNT(*)::bigint AS cnt
                    FROM question_descriptions_v0
                    WHERE question_type = 'other'
                    GROUP BY syllabus_code
                    ORDER BY syllabus_code
                    """,
                ),
            }

            cross_validation = {
                "jobs_done_count": query_one(
                    cur,
                    """
                    SELECT COUNT(*)::bigint AS cnt
                    FROM vlm_jobs_v0
                    WHERE status = 'done'
                    """,
                ).get("cnt", 0),
                "descriptions_count": query_one(
                    cur,
                    """
                    SELECT COUNT(*)::bigint AS cnt
                    FROM question_descriptions_v0
                    """,
                ).get("cnt", 0),
                "done_missing_in_descriptions": query_all(
                    cur,
                    """
                    SELECT j.storage_key
                    FROM vlm_jobs_v0 j
                    LEFT JOIN question_descriptions_v0 q
                      ON q.storage_key = j.storage_key
                    WHERE j.status = 'done' AND q.storage_key IS NULL
                    ORDER BY j.storage_key
                    """,
                ),
            }

    for section in (arrays["math_expressions_latex"], arrays["variables"], arrays["diagram_elements"]):
        total = int(section.get("total_rows", 0) or 0)
        empty = int(section.get("empty_rows", 0) or 0)
        section["empty_ratio"] = (empty / total) if total else None
        section["avg_len_non_empty"] = safe_float(section.get("avg_len_non_empty"))
    for row in arrays["units_by_syllabus"]:
        total = int(row.get("total_rows", 0) or 0)
        empty = int(row.get("empty_rows", 0) or 0)
        row["empty_ratio"] = (empty / total) if total else None
        row["avg_len_non_empty"] = safe_float(row.get("avg_len_non_empty"))

    for k in ("min_confidence", "max_confidence", "mean_confidence", "median_confidence", "stddev_confidence"):
        confidence_stats[k] = safe_float(confidence_stats.get(k))
    for row in anomalies["low_confidence_records"]:
        row["confidence"] = safe_float(row.get("confidence"))

    return {
        "overview": overview,
        "field_distributions": {
            "question_type_by_syllabus": question_type_dist,
            "answer_form_by_syllabus": answer_form_dist,
            "confidence_stats": confidence_stats,
            "confidence_bins": confidence_bins,
        },
        "array_field_stats": arrays,
        "anomaly_detection": anomalies,
        "cross_validation": cross_validation,
    }


def print_stats(stats: dict[str, Any]) -> None:
    ov = stats["overview"]
    fd = stats["field_distributions"]
    arr = stats["array_field_stats"]
    an = stats["anomaly_detection"]
    cv = stats["cross_validation"]

    print("=== 1) 总体概览 ===")
    print(f"总记录数: {ov['total_records']}")
    print("按 status 分组:")
    for row in ov["by_status"]:
        print(f"  - {row['status']}: {row['cnt']}")
    print("按 syllabus_code 分组:")
    for row in ov["by_syllabus"]:
        print(f"  - {row['syllabus_code']}: {row['cnt']}")

    print("\n=== 2) 字段分布 ===")
    print("question_type x syllabus_code:")
    for row in fd["question_type_by_syllabus"]:
        print(f"  - {row['syllabus_code']} | {row['question_type']}: {row['cnt']}")
    print("answer_form x syllabus_code:")
    for row in fd["answer_form_by_syllabus"]:
        print(f"  - {row['syllabus_code']} | {row['answer_form']}: {row['cnt']}")
    cs = fd["confidence_stats"]
    print(
        "confidence统计: "
        f"min={cs['min_confidence']}, max={cs['max_confidence']}, "
        f"mean={cs['mean_confidence']}, median={cs['median_confidence']}, stddev={cs['stddev_confidence']}"
    )
    print("confidence区间分布:")
    for row in fd["confidence_bins"]:
        print(f"  - {row['bucket']}: {row['cnt']}")

    print("\n=== 3) 数组字段统计 ===")
    for key in ("math_expressions_latex", "variables", "diagram_elements"):
        s = arr[key]
        print(
            f"{key}: empty_rows={s['empty_rows']}/{s['total_rows']} ({(s['empty_ratio'] or 0)*100:.2f}%), "
            f"avg_len_non_empty={s['avg_len_non_empty']}"
        )
    print("units（按科目）:")
    for row in arr["units_by_syllabus"]:
        ratio = (row["empty_ratio"] or 0) * 100
        print(
            f"  - {row['syllabus_code']}: empty_rows={row['empty_rows']}/{row['total_rows']} ({ratio:.2f}%), "
            f"avg_len_non_empty={row['avg_len_non_empty']}"
        )

    print("\n=== 4) 异常检测 ===")
    print(f"summary NULL/空字符串: {an['summary_null_or_empty_count']}")
    print(f"summary长度>180: {an['summary_len_gt_180_count']}")
    print(f"leakage_flags 非空对象数: {an['leakage_non_empty_count']}")
    print(f"blocked 记录数: {len(an['blocked_records'])}")
    print("question_type='other' 按科目:")
    for row in an["question_type_other_by_syllabus"]:
        print(f"  - {row['syllabus_code']}: {row['cnt']}")
    print(f"低置信度记录数 (confidence<0.3): {len(an['low_confidence_records'])}")
    if an["low_confidence_records"]:
        print("低置信度记录列表 (storage_key | confidence | summary):")
        for row in an["low_confidence_records"]:
            print(f"  - {row['storage_key']} | {row['confidence']} | {row.get('summary')}")
    if an["leakage_flag_type_distribution"]:
        print("leakage flag 类型分布:")
        for row in an["leakage_flag_type_distribution"]:
            print(f"  - {row['flag_type']}: {row['cnt']}")
    if an["blocked_records"]:
        print("blocked 记录列表 (storage_key | summary | leakage_flags):")
        for row in an["blocked_records"]:
            print(f"  - {row['storage_key']} | {row.get('summary')} | {json.dumps(row.get('leakage_flags'), ensure_ascii=False)}")

    print("\n=== 5) 交叉验证 ===")
    print(f"vlm_jobs_v0 done 数: {cv['jobs_done_count']}")
    print(f"question_descriptions_v0 数: {cv['descriptions_count']}")
    print(f"done但缺失描述的记录数: {len(cv['done_missing_in_descriptions'])}")
    if cv["done_missing_in_descriptions"]:
        for row in cv["done_missing_in_descriptions"]:
            print(f"  - {row['storage_key']}")


def main() -> int:
    parser = argparse.ArgumentParser(description="VLM QC stats for question_descriptions_v0")
    parser.add_argument(
        "--output-json",
        type=Path,
        default=DEFAULT_STATS_JSON,
        help=f"Path to write stats json (default: {DEFAULT_STATS_JSON})",
    )
    args = parser.parse_args()

    stats = collect_stats()
    print_stats(stats)
    write_json(args.output_json, stats)
    print(f"\nStats JSON 已写入: {args.output_json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
