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
    read_json,
    safe_float,
    write_json,
)
from scripts.vlm.contracts import extract_qwen_wave1_provenance
from scripts.vlm.create_jobs_from_manifest import (
    build_manifest_jobs,
    filter_manifest_items,
    load_manifest,
)


def _load_lane_results(path: Path | None) -> list[dict[str, Any]]:
    if path is None:
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError("lane_results_json must contain a JSON array")
    return [row for row in payload if isinstance(row, dict)]


def _extract_evidence_map(evidence: list[dict[str, Any]] | None) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for entry in evidence or []:
        if not isinstance(entry, dict):
            continue
        field = entry.get("field")
        if isinstance(field, str) and field not in result:
            result[field] = entry.get("value")
    return result


def _summary_present(value: Any) -> bool:
    return isinstance(value, str) and value.strip() != ""


def _bool_bucket(value: Any) -> str:
    if value is True:
        return "true"
    if value is False:
        return "false"
    return "unknown"


def _count_labels(values: list[str]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for value in values:
        counts[value] = counts.get(value, 0) + 1
    return dict(sorted(counts.items()))


def _classify_descriptor_readiness(
    route: str | None,
    summary: str | None,
    requires_review: bool,
    failure_reason: str | None,
) -> str:
    if failure_reason:
        return "failed"
    if route in {"ocr_lane", "diagram_lane"} and _summary_present(summary) and not requires_review:
        return "descriptor_candidate"
    return "review_bucket"


def build_wave1_pilot_rows(
    manifest: dict[str, Any],
    lane_results: list[dict[str, Any]] | None = None,
    *,
    shard_id: str | None = None,
) -> list[dict[str, Any]]:
    jobs = {
        job["storage_key"]: job
        for job in build_manifest_jobs(manifest, shard_id=shard_id)
    }
    items = filter_manifest_items(manifest, shard_id=shard_id)
    results_by_key = {
        row.get("input_asset_id"): row
        for row in (lane_results or [])
        if isinstance(row.get("input_asset_id"), str)
    }
    rows: list[dict[str, Any]] = []

    for item in items:
        storage_key = item["storage_key"]
        job = jobs.get(storage_key, {})
        lane_result = results_by_key.get(storage_key, {})
        job_wave1 = extract_qwen_wave1_provenance(job) or {}
        result_wave1 = extract_qwen_wave1_provenance(lane_result) or {}
        output = lane_result.get("output") if isinstance(lane_result.get("output"), dict) else {}
        evidence = output.get("evidence") if isinstance(output.get("evidence"), list) else []
        evidence_map = _extract_evidence_map(evidence)
        warnings = result_wave1.get("warnings") or []
        summary = result_wave1.get("summary")
        diagram_present = item.get("diagram_present")
        if diagram_present is None and isinstance(evidence_map.get("diagram_present"), bool):
            diagram_present = evidence_map["diagram_present"]

        requires_review = bool(item.get("requires_review"))
        if isinstance(evidence_map.get("requires_review"), bool):
            requires_review = requires_review or evidence_map["requires_review"]
        if "requires_review" in warnings:
            requires_review = True

        lazy_attach = result_wave1.get("lazy_attach_original_image")
        if lazy_attach is None:
            lazy_attach = job_wave1.get("lazy_attach_original_image")

        expected_route = job.get("route")
        expected_lane = job.get("lane")
        route = result_wave1.get("route") or job_wave1.get("route")
        lane = result_wave1.get("lane") or job_wave1.get("lane")
        failure_reason = lane_result.get("failure_reason") or result_wave1.get("failure_reason")

        rows.append(
            {
                "storage_key": storage_key,
                "manifest_position": job.get("manifest_position"),
                "route": route,
                "lane": lane,
                "expected_route": expected_route,
                "expected_lane": expected_lane,
                "route_matches_expected": route == expected_route,
                "model": lane_result.get("model") or job.get("model"),
                "decision_reasons": list(job_wave1.get("decision_reasons") or []),
                "route_hint": item.get("route_hint"),
                "difficulty_band": item.get("difficulty_band"),
                "descriptor_required": bool(item.get("descriptor_required")),
                "gate_critical": bool(item.get("gate_critical")),
                "diagram_present": diagram_present,
                "requires_review": requires_review,
                "lazy_attach_original_image": bool(lazy_attach),
                "summary": summary,
                "warnings": list(warnings),
                "evidence": list(evidence),
                "failure_reason": failure_reason,
                "confidence": safe_float(lane_result.get("confidence")),
                "descriptor_readiness": _classify_descriptor_readiness(
                    route,
                    summary,
                    requires_review,
                    failure_reason,
                ),
            }
        )

    return rows


def summarize_wave1_pilot_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    decision_reasons: list[str] = []
    for row in rows:
        decision_reasons.extend(row.get("decision_reasons") or [])

    failure_reasons = [row["failure_reason"] for row in rows if row.get("failure_reason")]
    descriptor_required_rows = [row for row in rows if row.get("descriptor_required")]
    unexpected_review_fallbacks: dict[str, int] = {}
    route_mismatch_counts: dict[str, int] = {}

    for row in rows:
        band = row.get("difficulty_band") or "unknown"
        if row.get("route") == "review_lane" and row.get("expected_route") != "review_lane":
            unexpected_review_fallbacks[band] = unexpected_review_fallbacks.get(band, 0) + 1
        if row.get("route") != row.get("expected_route"):
            route_mismatch_counts[band] = route_mismatch_counts.get(band, 0) + 1

    return {
        "total_rows": len(rows),
        "rows_by_route": _count_labels([row["route"] for row in rows if row.get("route")]),
        "rows_by_lane": _count_labels([row["lane"] for row in rows if row.get("lane")]),
        "model_counts": _count_labels([row["model"] for row in rows if row.get("model")]),
        "decision_reasons": _count_labels(decision_reasons),
        "diagram_present": _count_labels([_bool_bucket(row.get("diagram_present")) for row in rows]),
        "requires_review": _count_labels([_bool_bucket(row.get("requires_review")) for row in rows]),
        "lazy_attach_original_image": _count_labels([_bool_bucket(row.get("lazy_attach_original_image")) for row in rows]),
        "descriptor_readiness": _count_labels([row["descriptor_readiness"] for row in rows]),
        "summary_presence": {
            "present": sum(1 for row in rows if _summary_present(row.get("summary"))),
            "missing": sum(1 for row in rows if not _summary_present(row.get("summary"))),
        },
        "descriptor_coverage": {
            "required_rows": len(descriptor_required_rows),
            "covered_rows": sum(1 for row in descriptor_required_rows if _summary_present(row.get("summary"))),
            "coverage_rate": (
                sum(1 for row in descriptor_required_rows if _summary_present(row.get("summary"))) / len(descriptor_required_rows)
                if descriptor_required_rows
                else None
            ),
        },
        "unexpected_review_fallbacks": dict(sorted(unexpected_review_fallbacks.items())),
        "route_mismatch_counts": dict(sorted(route_mismatch_counts.items())),
        "failure_reason_counts": _count_labels(failure_reasons),
    }


def _full_review_record_accepted(record: dict[str, Any]) -> bool:
    review = record.get("review")
    if not isinstance(review, dict):
        return False

    route_verdict = review.get("route_verdict")
    route_ok = route_verdict in (None, "", "appropriate", "cannot_judge")
    descriptor_ok = (
        review.get("descriptor_readiness") == "descriptor_ready"
        or review.get("review_bucket_verdict") == "correct"
    )
    return route_ok and descriptor_ok


def evaluate_wave_a_thresholds(
    rows: list[dict[str, Any]],
    thresholds: dict[str, Any],
    *,
    full_review_payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    provider_failures = sum(1 for row in rows if row.get("failure_reason"))
    unexpected_review_fallbacks = {
        band: sum(
            1
            for row in rows
            if (row.get("difficulty_band") or "unknown") == band
            and row.get("route") == "review_lane"
            and row.get("expected_route") != "review_lane"
        )
        for band in (thresholds.get("unexpected_review_lane_max") or {})
    }
    route_hint_mismatches = {
        band: sum(
            1
            for row in rows
            if (row.get("difficulty_band") or "unknown") == band
            and row.get("route") != row.get("expected_route")
        )
        for band, required in (thresholds.get("route_hint_match_required") or {}).items()
        if required
    }
    descriptor_required_rows = [row for row in rows if row.get("descriptor_required")]
    descriptor_coverage = (
        sum(1 for row in descriptor_required_rows if _summary_present(row.get("summary"))) / len(descriptor_required_rows)
        if descriptor_required_rows
        else None
    )
    full_review_records = [
        record
        for record in (full_review_payload or {}).get("records", [])
        if isinstance(record, dict)
    ]
    full_review_acceptance = (
        sum(1 for record in full_review_records if _full_review_record_accepted(record)) / len(full_review_records)
        if full_review_records
        else None
    )

    checks = [
        {
            "name": "provider_failures",
            "pass": provider_failures <= int(thresholds.get("provider_failure_max", 0)),
            "actual": provider_failures,
            "expected_max": int(thresholds.get("provider_failure_max", 0)),
        }
    ]

    for band, maximum in (thresholds.get("unexpected_review_lane_max") or {}).items():
        actual = unexpected_review_fallbacks.get(band, 0)
        checks.append(
            {
                "name": f"unexpected_review_fallbacks:{band}",
                "pass": actual <= int(maximum),
                "actual": actual,
                "expected_max": int(maximum),
            }
        )

    for band, required in (thresholds.get("route_hint_match_required") or {}).items():
        if not required:
            continue
        actual = route_hint_mismatches.get(band, 0)
        checks.append(
            {
                "name": f"route_hint_match:{band}",
                "pass": actual == 0,
                "actual": actual,
                "expected": 0,
            }
        )

    if full_review_acceptance is not None:
        checks.append(
            {
                "name": "full_review_acceptance",
                "pass": full_review_acceptance >= float(thresholds.get("full_review_min_acceptance", 1)),
                "actual": full_review_acceptance,
                "expected_min": float(thresholds.get("full_review_min_acceptance", 1)),
            }
        )

    return {
        "provider_failures": provider_failures,
        "unexpected_review_fallbacks": unexpected_review_fallbacks,
        "descriptor_coverage": descriptor_coverage,
        "full_review_acceptance": full_review_acceptance,
        "threshold_verdicts": checks,
    }


def collect_stats(
    *,
    manifest_path: Path | None = None,
    lane_results_json: Path | None = None,
    shard_id: str | None = None,
    thresholds_path: Path | None = None,
    full_review_json: Path | None = None,
) -> dict[str, Any]:
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

    stats = {
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

    if manifest_path is not None:
        manifest = load_manifest(manifest_path)
        full_review_payload = read_json(full_review_json) if full_review_json is not None else None
        wave1_rows = build_wave1_pilot_rows(
            manifest,
            _load_lane_results(lane_results_json),
            shard_id=shard_id,
        )
        stats["wave1_pilot"] = {
            "manifest_id": manifest.get("manifest_id"),
            "manifest_path": str(manifest_path),
            "lane_results_json": str(lane_results_json) if lane_results_json else None,
            "shard_id": shard_id,
            "summary": summarize_wave1_pilot_rows(wave1_rows),
            "rows": wave1_rows,
        }
        if thresholds_path is not None:
            thresholds = read_json(thresholds_path)
            stats["wave1_pilot"]["thresholds"] = evaluate_wave_a_thresholds(
                wave1_rows,
                thresholds,
                full_review_payload=full_review_payload,
            )

    return stats


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

    wave1 = stats.get("wave1_pilot")
    if wave1:
        summary = wave1["summary"]
        print("\n=== 6) Wave-1 Pilot ===")
        print(f"manifest_id: {wave1['manifest_id']}")
        print(f"pilot rows: {summary['total_rows']}")
        print("rows by route:")
        for key, value in summary["rows_by_route"].items():
            print(f"  - {key}: {value}")
        print("rows by lane:")
        for key, value in summary["rows_by_lane"].items():
            print(f"  - {key}: {value}")
        print("diagram_present:")
        for key, value in summary["diagram_present"].items():
            print(f"  - {key}: {value}")
        print("requires_review:")
        for key, value in summary["requires_review"].items():
            print(f"  - {key}: {value}")
        print("lazy_attach_original_image:")
        for key, value in summary["lazy_attach_original_image"].items():
            print(f"  - {key}: {value}")
        print("descriptor_readiness:")
        for key, value in summary["descriptor_readiness"].items():
            print(f"  - {key}: {value}")
        print(
            "summary presence: "
            f"present={summary['summary_presence']['present']}, "
            f"missing={summary['summary_presence']['missing']}"
        )
        descriptor_coverage = summary["descriptor_coverage"]
        print(
            "descriptor coverage: "
            f"covered={descriptor_coverage['covered_rows']}, "
            f"required={descriptor_coverage['required_rows']}, "
            f"rate={descriptor_coverage['coverage_rate']}"
        )
        print("unexpected review fallbacks:")
        for key, value in summary["unexpected_review_fallbacks"].items():
            print(f"  - {key}: {value}")
        thresholds_summary = wave1.get("thresholds")
        if thresholds_summary:
            print("threshold verdicts:")
            for check in thresholds_summary["threshold_verdicts"]:
                status = "pass" if check["pass"] else "fail"
                print(f"  - {check['name']}: {status}")
            if thresholds_summary["full_review_acceptance"] is not None:
                print(f"full review acceptance: {thresholds_summary['full_review_acceptance']}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="VLM QC stats for question_descriptions_v0")
    parser.add_argument(
        "--output-json",
        type=Path,
        default=DEFAULT_STATS_JSON,
        help=f"Path to write stats json (default: {DEFAULT_STATS_JSON})",
    )
    parser.add_argument("--manifest", type=Path, help="Optional pilot manifest to overlay wave-1 routing metadata.")
    parser.add_argument("--lane-results-json", type=Path, help="Optional qwen_lane_runner_v1 JSON output.")
    parser.add_argument("--shard-id", type=str, help="Optional shard filter for wave-1 pilot overlays.")
    parser.add_argument("--thresholds-json", type=Path, help="Optional Wave A threshold contract JSON.")
    parser.add_argument("--full-review-json", type=Path, help="Optional deterministic full-review JSON.")
    args = parser.parse_args(argv)

    stats = collect_stats(
        manifest_path=args.manifest,
        lane_results_json=args.lane_results_json,
        shard_id=args.shard_id,
        thresholds_path=args.thresholds_json,
        full_review_json=args.full_review_json,
    )
    print_stats(stats)
    write_json(args.output_json, stats)
    print(f"\nStats JSON 已写入: {args.output_json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
