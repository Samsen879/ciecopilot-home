#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.qc_common import (
    DEFAULT_REPORT_MD,
    DEFAULT_SPOT_CHECK_JSON,
    DEFAULT_STATS_JSON,
    read_json,
    today_str,
)


def pct(num: int | float, den: int | float) -> str:
    if not den:
        return "0.00%"
    return f"{(float(num) / float(den) * 100):.2f}%"


def md_table(headers: list[str], rows: list[list[Any]]) -> str:
    lines = []
    lines.append("| " + " | ".join(headers) + " |")
    lines.append("|" + "|".join(["---"] * len(headers)) + "|")
    for row in rows:
        lines.append("| " + " | ".join(str(x) for x in row) + " |")
    return "\n".join(lines)


def field_accuracy(spot: dict[str, Any], field: str) -> tuple[float, int]:
    records = [r for r in spot.get("records", []) if r.get("review")]
    if not records:
        return (0.0, 0)
    correct = 0.0
    for r in records:
        v = r["review"].get(field)
        if v == "correct":
            correct += 1.0
        elif v == "partially_correct":
            correct += 0.5
    return (correct / len(records), len(records))


def build_report(stats: dict[str, Any], spot: dict[str, Any]) -> str:
    overview = stats["overview"]
    fd = stats["field_distributions"]
    arr = stats["array_field_stats"]
    an = stats["anomaly_detection"]
    cv = stats["cross_validation"]
    agg = spot.get("aggregates", {})

    summary_acc, summary_n = field_accuracy(spot, "summary_verdict")
    qtype_acc, qtype_n = field_accuracy(spot, "question_type_verdict")
    summary_ok = summary_acc >= 0.85
    qtype_ok = qtype_acc >= 0.90

    qtype_rows = [[x["syllabus_code"], x["question_type"], x["cnt"]] for x in fd["question_type_by_syllabus"]]
    answer_rows = [[x["syllabus_code"], x["answer_form"], x["cnt"]] for x in fd["answer_form_by_syllabus"]]
    conf_rows = [[x["bucket"], x["cnt"]] for x in fd["confidence_bins"]]
    low_conf_rows = [[x["storage_key"], x.get("confidence"), x.get("summary")] for x in an["low_confidence_records"]]
    blocked_rows = [[x["storage_key"], x.get("summary"), x.get("leakage_flags")] for x in an["blocked_records"]]
    leakage_rows = [[x["flag_type"], x["cnt"]] for x in an["leakage_flag_type_distribution"]]
    missing_rows = [[x["storage_key"]] for x in cv["done_missing_in_descriptions"]]

    fv = agg.get("field_verdict_counts", {})
    verdict_rows = []
    for field, data in fv.items():
        verdict_rows.append(
            [field, data.get("correct", 0), data.get("partially_correct", 0), data.get("incorrect", 0), data.get("cannot_judge", 0)]
        )

    by_subject_rows = []
    for sub, data in sorted(agg.get("by_syllabus_scores", {}).items()):
        by_subject_rows.append(
            [
                sub,
                data.get("count", 0),
                f"{(data.get('summary_verdict_score', 0) or 0)*100:.2f}%",
                f"{(data.get('question_type_verdict_score', 0) or 0)*100:.2f}%",
                f"{(data.get('answer_form_verdict_score', 0) or 0)*100:.2f}%",
            ]
        )

    by_band_rows = []
    for band, data in sorted(agg.get("by_confidence_band_scores", {}).items()):
        by_band_rows.append(
            [
                band,
                data.get("count", 0),
                f"{(data.get('summary_verdict_score', 0) or 0)*100:.2f}%",
                f"{(data.get('question_type_verdict_score', 0) or 0)*100:.2f}%",
                f"{(data.get('answer_form_verdict_score', 0) or 0)*100:.2f}%",
            ]
        )

    poor_case_rows = []
    for case in agg.get("poor_cases", []):
        poor_case_rows.append(
            [
                case["storage_key"],
                case["syllabus_code"],
                case.get("confidence"),
                case.get("summary"),
                case.get("review", {}).get("issues", []),
            ]
        )

    lines: list[str] = []
    lines.append("# VLM 提取数据质量报告 (QC Report)")
    lines.append("")
    lines.append(f"**日期**: {today_str()}")
    lines.append("**数据表**: question_descriptions_v0")
    lines.append(f"**总记录数**: {overview['total_records']}")
    lines.append("**VLM 模型**: qwen3-vl-flash")
    lines.append("")
    lines.append("## 1. 总体概览")
    lines.append(f"- 总记录数: {overview['total_records']}")
    lines.append("- 按 status 分组:")
    for row in overview["by_status"]:
        lines.append(f"  - {row['status']}: {row['cnt']}")
    lines.append("- 按 syllabus_code 分组:")
    for row in overview["by_syllabus"]:
        lines.append(f"  - {row['syllabus_code']}: {row['cnt']}")
    lines.append("")
    lines.append("## 2. 字段分布")
    lines.append("### 2.1 question_type 分布")
    lines.append(md_table(["syllabus_code", "question_type", "count"], qtype_rows))
    lines.append("")
    lines.append("### 2.2 answer_form 分布")
    lines.append(md_table(["syllabus_code", "answer_form", "count"], answer_rows))
    lines.append("")
    lines.append("### 2.3 confidence 分布")
    cs = fd["confidence_stats"]
    lines.append(
        f"- 统计量: min={cs.get('min_confidence')}, max={cs.get('max_confidence')}, "
        f"mean={cs.get('mean_confidence')}, median={cs.get('median_confidence')}, stddev={cs.get('stddev_confidence')}"
    )
    lines.append(md_table(["bucket", "count"], conf_rows))
    lines.append("")
    lines.append("## 3. 数组字段统计")
    lines.append("- math_expressions_latex:")
    me = arr["math_expressions_latex"]
    lines.append(
        f"  - 空数组占比: {me['empty_rows']}/{me['total_rows']} ({pct(me['empty_rows'], me['total_rows'])}), "
        f"非空平均元素数: {me['avg_len_non_empty']}"
    )
    lines.append("- variables:")
    va = arr["variables"]
    lines.append(
        f"  - 空数组占比: {va['empty_rows']}/{va['total_rows']} ({pct(va['empty_rows'], va['total_rows'])}), "
        f"非空平均元素数: {va['avg_len_non_empty']}"
    )
    lines.append("- units（按科目）:")
    units_rows = []
    for r in arr["units_by_syllabus"]:
        units_rows.append(
            [
                r["syllabus_code"],
                r["empty_rows"],
                r["total_rows"],
                pct(r["empty_rows"], r["total_rows"]),
                r["avg_len_non_empty"],
            ]
        )
    lines.append(md_table(["syllabus", "empty_rows", "total_rows", "empty_ratio", "avg_len_non_empty"], units_rows))
    lines.append("- diagram_elements:")
    dg = arr["diagram_elements"]
    lines.append(
        f"  - 空数组占比: {dg['empty_rows']}/{dg['total_rows']} ({pct(dg['empty_rows'], dg['total_rows'])}), "
        f"非空平均元素数: {dg['avg_len_non_empty']}"
    )
    lines.append("")
    lines.append("## 4. 异常检测")
    lines.append("### 4.1 缺失/异常 summary")
    lines.append(f"- summary 为 NULL 或空字符串: {an['summary_null_or_empty_count']}")
    lines.append(f"- summary 长度 > 180 字符: {an['summary_len_gt_180_count']}")
    lines.append("")
    lines.append("### 4.2 低置信度记录")
    lines.append(f"- confidence < 0.3 记录数: {len(low_conf_rows)}")
    if low_conf_rows:
        lines.append(md_table(["storage_key", "confidence", "summary"], low_conf_rows))
    else:
        lines.append("- 无")
    lines.append("")
    lines.append("### 4.3 泄漏标记分布")
    lines.append(f"- leakage_flags 非空对象记录数: {an['leakage_non_empty_count']}")
    if leakage_rows:
        lines.append(md_table(["flag_type", "count"], leakage_rows))
    else:
        lines.append("- 无")
    lines.append("")
    lines.append("### 4.4 blocked 记录")
    lines.append(f"- blocked 记录数: {len(blocked_rows)}")
    if blocked_rows:
        lines.append(md_table(["storage_key", "summary", "leakage_flags"], blocked_rows))
    else:
        lines.append("- 无")
    lines.append("")
    lines.append("### 4.5 未分类记录 (question_type=other)")
    other_rows = [[x["syllabus_code"], x["cnt"]] for x in an["question_type_other_by_syllabus"]]
    if other_rows:
        lines.append(md_table(["syllabus_code", "count"], other_rows))
    else:
        lines.append("- 无")
    lines.append("")
    lines.append("## 5. 交叉验证")
    lines.append(f"- vlm_jobs_v0 (status='done') 记录数: {cv['jobs_done_count']}")
    lines.append(f"- question_descriptions_v0 记录数: {cv['descriptions_count']}")
    lines.append(f"- done 但描述缺失记录数: {len(missing_rows)}")
    if missing_rows:
        lines.append(md_table(["missing_storage_key"], missing_rows))
    else:
        lines.append("- 无缺失")
    lines.append("")
    lines.append("## 6. VLM 辅助抽检结果")
    lines.append("### 6.1 总体准确率")
    lines.append(md_table(["字段", "correct", "partially_correct", "incorrect", "cannot_judge"], verdict_rows))
    lines.append("")
    lines.append("### 6.2 按科目准确率")
    if by_subject_rows:
        lines.append(md_table(["syllabus", "sample_count", "summary_score", "question_type_score", "answer_form_score"], by_subject_rows))
    else:
        lines.append("- 无有效抽检数据")
    lines.append("")
    lines.append("### 6.3 按置信度区间准确率")
    if by_band_rows:
        lines.append(md_table(["confidence_band", "sample_count", "summary_score", "question_type_score", "answer_form_score"], by_band_rows))
    else:
        lines.append("- 无有效抽检数据")
    lines.append("")
    lines.append("### 6.4 典型问题案例")
    if poor_case_rows:
        lines.append(md_table(["storage_key", "syllabus", "confidence", "summary", "issues"], poor_case_rows))
    else:
        lines.append("- 无 overall_quality=poor 案例")
    lines.append("")
    lines.append("## 7. 结论与建议")
    lines.append(
        f"- summary 准确率(按 correct=1, partially=0.5): {summary_acc*100:.2f}% "
        f"({'达标' if summary_ok else '未达标'}，阈值 85%，样本数 {summary_n})"
    )
    lines.append(
        f"- question_type 准确率(按 correct=1, partially=0.5): {qtype_acc*100:.2f}% "
        f"({'达标' if qtype_ok else '未达标'}，阈值 90%，样本数 {qtype_n})"
    )
    lines.append("- 数据质量判定: " + ("达标" if (summary_ok and qtype_ok) else "需改进"))
    lines.append("- 系统性问题观察:")
    if agg.get("poor_cases"):
        lines.append("  - 存在 poor 级别样本，建议优先复盘这些记录的提示词和字段映射。")
    else:
        lines.append("  - 未发现明显系统性失真，但仍建议对低置信度样本持续抽检。")
    lines.append("- 改进建议:")
    lines.append("  - 对 confidence<0.5 的记录增加二次审核流程（人工或第二模型复审）。")
    lines.append("  - 对 question_type='other' 的样本进行聚类分析，补充分类标签定义与示例。")
    lines.append("  - 对 leakage_flags 命中样本加入专门的 prompt 约束与回归测试。")
    lines.append("")

    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate markdown QC report from stats and spot-check outputs")
    parser.add_argument("--stats-json", type=Path, default=DEFAULT_STATS_JSON)
    parser.add_argument("--spot-check-json", type=Path, default=DEFAULT_SPOT_CHECK_JSON)
    parser.add_argument("--output-md", type=Path, default=DEFAULT_REPORT_MD)
    args = parser.parse_args()

    stats = read_json(args.stats_json)
    spot = read_json(args.spot_check_json)
    report = build_report(stats, spot)

    args.output_md.parent.mkdir(parents=True, exist_ok=True)
    with open(args.output_md, "w", encoding="utf-8") as f:
        f.write(report)

    print(f"QC 报告已生成: {args.output_md}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
