"""QC sampler for B1 rubric extraction quality checks.

Implements stratified sampling by syllabus_code/session/paper,
computes four quality metrics, applies threshold checks, and
generates a markdown QC report with B3 field mapping appendix.

Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 10.2, 10.3
"""

from __future__ import annotations

import logging
import math
import os
import re
import sys
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_MIN_SAMPLE = 80
_SAMPLE_FRACTION = 0.05

_THRESHOLDS = {
    "mark_label_accuracy": (">=", 0.90),
    "dependency_resolution_rate": (">=", 0.95),
    "needs_review_rate": ("<=", 0.20),
    "ft_default_compliance": ("=", 1.00),
}

_MARK_LABEL_RE = re.compile(r"^[MAB][0-9]+$")

# ---------------------------------------------------------------------------
# SQL
# ---------------------------------------------------------------------------

_COUNT_READY_SQL = """
SELECT COUNT(*) FROM rubric_points WHERE status = 'ready'
"""

_STRATIFIED_SAMPLE_SQL = """
WITH strata AS (
    SELECT rp.rubric_id,
           rp.storage_key,
           rp.q_number,
           rp.subpart,
           rp.mark_label,
           rp.kind,
           rp.marks,
           rp.depends_on_labels,
           rp.depends_on,
           rp.ft_mode,
           rp.status,
           rp.confidence,
           j.syllabus_code,
           j.session,
           j.paper,
           ROW_NUMBER() OVER (
               PARTITION BY j.syllabus_code, j.session, j.paper
               ORDER BY random()
           ) AS rn,
           COUNT(*) OVER (
               PARTITION BY j.syllabus_code, j.session, j.paper
           ) AS stratum_size
      FROM rubric_points rp
      JOIN vlm_ms_jobs j
        ON rp.storage_key = j.storage_key
       AND rp.q_number    = j.q_number
       AND COALESCE(rp.subpart, '') = COALESCE(j.subpart, '')
       AND rp.extractor_version = j.extractor_version
       AND rp.provider          = j.provider
       AND rp.model             = j.model
       AND rp.prompt_version    = j.prompt_version
      WHERE rp.status = 'ready'
)
SELECT *
  FROM strata
 WHERE rn <= GREATEST(1, CEIL(stratum_size::numeric * %(fraction)s))
 ORDER BY syllabus_code, session, paper, rubric_id
"""

_COUNT_ALL_POINTS_SQL = """
SELECT COUNT(*) FROM rubric_points
"""

_COUNT_NEEDS_REVIEW_SQL = """
SELECT COUNT(*) FROM rubric_points WHERE status = 'needs_review'
"""

_STRATA_DISTRIBUTION_SQL = """
SELECT j.syllabus_code, j.session, j.paper, COUNT(*) AS cnt
  FROM rubric_points rp
  JOIN vlm_ms_jobs j
    ON rp.storage_key = j.storage_key
   AND rp.q_number    = j.q_number
   AND COALESCE(rp.subpart, '') = COALESCE(j.subpart, '')
   AND rp.extractor_version = j.extractor_version
   AND rp.provider          = j.provider
   AND rp.model             = j.model
   AND rp.prompt_version    = j.prompt_version
 WHERE rp.status = 'ready'
 GROUP BY j.syllabus_code, j.session, j.paper
 ORDER BY j.syllabus_code, j.session, j.paper
"""

# ---------------------------------------------------------------------------
# Pure functions (testable without DB)
# ---------------------------------------------------------------------------


def compute_sample_size(ready_rows: int) -> int:
    """Compute QC sample size: max(80, ceil(0.05 * ready_rows)).

    Pure function for easy testing.
    """
    if ready_rows <= 0:
        return _MIN_SAMPLE
    return max(_MIN_SAMPLE, math.ceil(_SAMPLE_FRACTION * ready_rows))


def check_thresholds(metrics: dict) -> dict:
    """Check metrics against QC thresholds.

    Returns dict with:
      - passed: bool (True only if ALL thresholds pass)
      - release_status: 'release_ok' | 'release_blocked'
      - blocked_reasons: list of failure descriptions
      - details: per-metric pass/fail info
    """
    blocked_reasons: list[str] = []
    details: dict[str, dict] = {}

    for metric_name, (op, threshold) in _THRESHOLDS.items():
        value = metrics.get(metric_name)
        if value is None:
            passed = False
            reason = f"{metric_name}: value is None"
        elif op == ">=":
            passed = value >= threshold
            reason = f"{metric_name}={value:.4f} < {threshold}" if not passed else ""
        elif op == "<=":
            passed = value <= threshold
            reason = f"{metric_name}={value:.4f} > {threshold}" if not passed else ""
        elif op == "=":
            passed = abs(value - threshold) < 1e-9
            reason = f"{metric_name}={value:.4f} != {threshold}" if not passed else ""
        else:
            passed = False
            reason = f"unknown operator '{op}'"

        details[metric_name] = {
            "value": value,
            "threshold": threshold,
            "operator": op,
            "passed": passed,
        }
        if not passed and reason:
            blocked_reasons.append(reason)

    all_passed = len(blocked_reasons) == 0
    return {
        "passed": all_passed,
        "release_status": "release_ok" if all_passed else "release_blocked",
        "blocked_reasons": blocked_reasons,
        "details": details,
    }


# ---------------------------------------------------------------------------
# B3 mapping appendix
# ---------------------------------------------------------------------------


def render_b3_mapping_appendix() -> str:
    """Generate QC report Appendix A (B3 field mapping conventions).

    Required mappings:
    - decision.reason -> user_errors.metadata.decision_reason
    - rubric_id -> user_errors.metadata.rubric_id
    - run_id -> user_errors.metadata.run_id
    - source_version -> user_errors.metadata.source_version
    """
    return """## Appendix A: B3 Field Mapping Conventions

The following mappings define how B1/B2 fields are written into B3
`user_errors.metadata` for the error-book closed loop.

| B2/B1 Field | B3 Target Field | Description |
|---|---|---|
| `decision.reason` | `user_errors.metadata.decision_reason` | Scoring decision reason |
| `rubric_id` | `user_errors.metadata.rubric_id` | Rubric point that caused the mark loss |
| `run_id` | `user_errors.metadata.run_id` | Traceable to this scoring run |
| `source_version` | `user_errors.metadata.source_version` | `extractor:provider:model:prompt` |

### Compatibility Note

The current `user_errors` table has a `(user_id, storage_key)` unique index.
If B3 adopts per-rubric-point error records, the unique strategy must be
adjusted during B3 implementation phase.
"""


# ---------------------------------------------------------------------------
# Metric computation helpers
# ---------------------------------------------------------------------------


def _compute_mark_label_accuracy(sample_rows: list[dict]) -> float:
    """mark_label_accuracy = correct_label / sampled_points.

    A label is correct if it matches ^[MAB][0-9]+$.
    """
    if not sample_rows:
        return 0.0
    correct = sum(1 for r in sample_rows if _MARK_LABEL_RE.match(r["mark_label"] or ""))
    return correct / len(sample_rows)


def _compute_dependency_resolution_rate(sample_rows: list[dict]) -> float:
    """dependency_resolution_rate = resolved_edges / total_dependency_edges.

    An edge is a single label in depends_on_labels.
    Resolved means the corresponding depends_on UUID is non-empty.
    """
    total_edges = 0
    resolved_edges = 0
    for row in sample_rows:
        labels = row.get("depends_on_labels") or []
        uuids = row.get("depends_on") or []
        total_edges += len(labels)
        resolved_edges += len(uuids)
    if total_edges == 0:
        return 1.0  # no dependencies = fully resolved
    return min(resolved_edges / total_edges, 1.0)


def _compute_needs_review_rate(total_points: int, needs_review_points: int) -> float:
    """needs_review_rate = needs_review_points / total_points."""
    if total_points == 0:
        return 0.0
    return needs_review_points / total_points


def _compute_ft_default_compliance(sample_rows: list[dict]) -> float:
    """ft_default_compliance = points_with_ft_none_without_evidence / points_without_ft_evidence.

    Points without explicit FT evidence are those where depends_on_labels
    is empty (no dependency chain suggesting follow-through).
    Among those, ft_mode should be 'none'.
    """
    without_evidence = [r for r in sample_rows if not (r.get("depends_on_labels") or [])]
    if not without_evidence:
        return 1.0  # no applicable points = compliant
    compliant = sum(1 for r in without_evidence if r.get("ft_mode") == "none")
    return compliant / len(without_evidence)


# ---------------------------------------------------------------------------
# Report rendering
# ---------------------------------------------------------------------------


def _render_report(
    metrics: dict,
    threshold_result: dict,
    sample_rows: list[dict],
    strata_dist: list[dict],
    total_points: int,
    needs_review_points: int,
    ready_rows: int,
    sample_size: int,
    append_b3_mapping: bool,
) -> str:
    """Render the QC markdown report."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    status_emoji = "✅ PASSED" if threshold_result["passed"] else "❌ FAILED"
    release = threshold_result["release_status"]

    lines: list[str] = []
    lines.append("# B1 Rubric Extraction QC Report")
    lines.append("")
    lines.append(f"**Generated**: {now}")
    lines.append(f"**Status**: {status_emoji}")
    lines.append(f"**Release Status**: `{release}`")
    lines.append("")

    # --- Sampling info ---
    lines.append("## 1. Sampling Strategy")
    lines.append("")
    lines.append("Stratified sampling by `syllabus_code / session / paper`.")
    lines.append("")
    lines.append("**Formula**:")
    lines.append("```")
    lines.append("sample_size = max(80, ceil(0.05 × ready_rows))")
    lines.append(f"             = max(80, ceil(0.05 × {ready_rows}))")
    lines.append(f"             = {sample_size}")
    lines.append("```")
    lines.append("")
    lines.append(f"- Total rubric points: {total_points}")
    lines.append(f"- Ready points: {ready_rows}")
    lines.append(f"- Needs review points: {needs_review_points}")
    lines.append(f"- Sampled points: {len(sample_rows)}")
    lines.append("")

    # --- Strata distribution ---
    lines.append("## 2. Sample Distribution by Stratum")
    lines.append("")
    lines.append("| Syllabus Code | Session | Paper | Ready Count |")
    lines.append("|---|---|---|---|")
    for s in strata_dist:
        lines.append(f"| {s['syllabus_code']} | {s['session']} | {s['paper']} | {s['cnt']} |")
    lines.append("")

    # --- Metrics ---
    lines.append("## 3. Quality Metrics")
    lines.append("")
    lines.append("### Formulas")
    lines.append("")
    lines.append("```")
    lines.append("mark_label_accuracy        = correct_label / sampled_points")
    lines.append("dependency_resolution_rate  = resolved_edges / total_dependency_edges")
    lines.append("needs_review_rate           = needs_review_points / total_points")
    lines.append("ft_default_compliance       = points_with_ft_none_without_evidence / points_without_ft_evidence")
    lines.append("```")
    lines.append("")
    lines.append("### Results")
    lines.append("")
    lines.append("| Metric | Value | Threshold | Status |")
    lines.append("|---|---|---|---|")
    for metric_name, detail in threshold_result["details"].items():
        val = detail["value"]
        val_str = f"{val:.4f}" if val is not None else "N/A"
        op = detail["operator"]
        thr = detail["threshold"]
        thr_str = f"{op} {thr:.2f}"
        status = "✅ Pass" if detail["passed"] else "❌ Fail"
        lines.append(f"| `{metric_name}` | {val_str} | {thr_str} | {status} |")
    lines.append("")

    # --- Pass/Fail conclusion ---
    lines.append("## 4. Conclusion")
    lines.append("")
    if threshold_result["passed"]:
        lines.append("All quality thresholds met. Release is **approved**.")
    else:
        lines.append("One or more thresholds failed. Release is **blocked**.")
        lines.append("")
        lines.append("### Blocked Reasons")
        lines.append("")
        for reason in threshold_result["blocked_reasons"]:
            lines.append(f"- {reason}")
    lines.append("")

    # --- Failure sample details ---
    failure_samples = _collect_failure_samples(sample_rows)
    if failure_samples:
        lines.append("## 5. Failure Sample Details")
        lines.append("")
        lines.append("| rubric_id | storage_key | q_number | subpart | mark_label | issue |")
        lines.append("|---|---|---|---|---|---|")
        for fs in failure_samples[:50]:
            lines.append(
                f"| {fs['rubric_id']} | {fs['storage_key']} | {fs['q_number']} "
                f"| {fs.get('subpart') or ''} | {fs['mark_label']} | {fs['issue']} |"
            )
        if len(failure_samples) > 50:
            lines.append(f"| ... | ... | ... | ... | ... | {len(failure_samples) - 50} more |")
        lines.append("")

    # --- Appendix ---
    if append_b3_mapping:
        lines.append(render_b3_mapping_appendix())

    return "\n".join(lines)


def _collect_failure_samples(sample_rows: list[dict]) -> list[dict]:
    """Identify individual failure samples from the sampled rows."""
    failures: list[dict] = []
    for row in sample_rows:
        issues: list[str] = []
        if not _MARK_LABEL_RE.match(row.get("mark_label") or ""):
            issues.append("invalid mark_label")
        labels = row.get("depends_on_labels") or []
        uuids = row.get("depends_on") or []
        if len(labels) > 0 and len(uuids) < len(labels):
            issues.append("unresolved dependency")
        if not (row.get("depends_on_labels") or []) and row.get("ft_mode") != "none":
            issues.append("ft_mode not 'none' without FT evidence")
        if issues:
            failures.append({
                "rubric_id": str(row["rubric_id"]),
                "storage_key": row["storage_key"],
                "q_number": row["q_number"],
                "subpart": row.get("subpart"),
                "mark_label": row.get("mark_label", ""),
                "issue": "; ".join(issues),
            })
    return failures


# ---------------------------------------------------------------------------
# Main QC function
# ---------------------------------------------------------------------------


def run_qc(
    pool: Any,
    output_path: str = "docs/reports/b1_rubric_qc_report.md",
    append_b3_mapping: bool = True,
) -> dict:
    """Stratified sampling + threshold validation.

    Sampling strategy: stratified by syllabus_code/session/paper
    Sample size: max(80, ceil(0.05 * ready_rows))

    Metrics:
    - mark_label_accuracy
    - dependency_resolution_rate
    - needs_review_rate
    - ft_default_compliance

    Report output:
    1. Main report with formulas, sample distribution, pass/fail, failure details
    2. Appendix A: B3 field mapping (decision.reason/rubric_id/run_id)
    3. If any threshold fails -> release_status='release_blocked'

    Returns {metrics, passed, release_status, blocked_reasons, appendix_written}.
    """
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            # Count ready rows
            cur.execute(_COUNT_READY_SQL)
            ready_rows = cur.fetchone()[0]

            # Count all points and needs_review
            cur.execute(_COUNT_ALL_POINTS_SQL)
            total_points = cur.fetchone()[0]

            cur.execute(_COUNT_NEEDS_REVIEW_SQL)
            needs_review_points = cur.fetchone()[0]

            # Strata distribution
            cur.execute(_STRATA_DISTRIBUTION_SQL)
            strata_cols = [desc[0] for desc in cur.description]
            strata_dist = [dict(zip(strata_cols, row)) for row in cur.fetchall()]

            # Compute target sample size
            sample_size = compute_sample_size(ready_rows)

            # Stratified sample — proportional within each stratum
            fraction = _SAMPLE_FRACTION
            if ready_rows > 0:
                # Adjust fraction so total sample ≈ sample_size
                fraction = sample_size / ready_rows
            cur.execute(_STRATIFIED_SAMPLE_SQL, {"fraction": fraction})
            sample_cols = [desc[0] for desc in cur.description]
            sample_rows = [dict(zip(sample_cols, row)) for row in cur.fetchall()]
    finally:
        pool.putconn(conn)

    logger.info(
        "QC sampling: ready=%d, total=%d, needs_review=%d, sampled=%d",
        ready_rows, total_points, needs_review_points, len(sample_rows),
    )

    # --- Compute metrics ---
    metrics = {
        "mark_label_accuracy": _compute_mark_label_accuracy(sample_rows),
        "dependency_resolution_rate": _compute_dependency_resolution_rate(sample_rows),
        "needs_review_rate": _compute_needs_review_rate(total_points, needs_review_points),
        "ft_default_compliance": _compute_ft_default_compliance(sample_rows),
    }

    # --- Threshold check ---
    threshold_result = check_thresholds(metrics)

    # --- Render report ---
    report = _render_report(
        metrics=metrics,
        threshold_result=threshold_result,
        sample_rows=sample_rows,
        strata_dist=strata_dist,
        total_points=total_points,
        needs_review_points=needs_review_points,
        ready_rows=ready_rows,
        sample_size=sample_size,
        append_b3_mapping=append_b3_mapping,
    )

    # --- Write report ---
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as fh:
        fh.write(report)
    logger.info("QC report written to %s", output_path)

    return {
        "metrics": metrics,
        "passed": threshold_result["passed"],
        "release_status": threshold_result["release_status"],
        "blocked_reasons": threshold_result["blocked_reasons"],
        "appendix_written": append_b3_mapping,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    """CLI entry point for QC sampling."""
    import argparse

    from dotenv import load_dotenv  # type: ignore

    load_dotenv()

    parser = argparse.ArgumentParser(description="B1 Rubric QC Sampler")
    parser.add_argument(
        "--output",
        default="docs/reports/b1_rubric_qc_report.md",
        help="Output report path (default: docs/reports/b1_rubric_qc_report.md)",
    )
    parser.add_argument(
        "--no-b3-appendix",
        action="store_true",
        help="Skip B3 mapping appendix in report",
    )
    parser.add_argument(
        "--enforce-thresholds",
        action="store_true",
        help="Exit with code 1 if any threshold fails",
    )
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    db_url = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        print("ERROR: DATABASE_URL or SUPABASE_DB_URL must be set", file=sys.stderr)
        return 1

    import psycopg2.pool  # type: ignore

    pool = psycopg2.pool.ThreadedConnectionPool(1, 4, db_url)

    try:
        result = run_qc(
            pool,
            output_path=args.output,
            append_b3_mapping=not args.no_b3_appendix,
        )

        print("=" * 60)
        print("B1 Rubric QC Report")
        print(f"  Passed: {result['passed']}")
        print(f"  Release Status: {result['release_status']}")
        print(f"  Metrics:")
        for k, v in result["metrics"].items():
            print(f"    {k}: {v:.4f}")
        if result["blocked_reasons"]:
            print(f"  Blocked Reasons:")
            for reason in result["blocked_reasons"]:
                print(f"    - {reason}")
        print(f"  Report: {args.output}")
        print("=" * 60)

        if args.enforce_thresholds and not result["passed"]:
            return 1
        return 0
    except Exception as exc:
        logger.error("QC sampling failed: %s", exc, exc_info=True)
        return 1
    finally:
        try:
            pool.closeall()
        except Exception:
            pass


if __name__ == "__main__":
    sys.exit(main())
