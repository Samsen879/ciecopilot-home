#!/usr/bin/env python3
"""Audit report generation based on periodic_audit_sop.md and audit_queries.md."""
from __future__ import annotations
import argparse
import json
import sys
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Literal

ReportType = Literal["daily", "weekly", "monthly"]

@dataclass
class QueryResult:
    query_id: str
    name: str
    sql: str
    result: dict | list | None
    error: str | None

@dataclass
class AuditReport:
    report_type: ReportType
    generated_at: str
    period_start: str
    period_end: str
    summary: dict
    query_results: list[QueryResult]

# 20 audit queries from audit_queries.md
AUDIT_QUERIES: list[tuple[str, str, str]] = [
    # Daily monitoring
    ("Q1", "Today's leakage events", """
SELECT event_type, event_severity, COUNT(*) as count
FROM vlm_audit_logs_v0
WHERE created_at >= CURRENT_DATE
  AND event_type IN ('leakage_detected', 'leakage_blocked')
GROUP BY event_type, event_severity
ORDER BY count DESC"""),
    
    ("Q2", "Past 7 days risk trend", """
SELECT DATE(created_at) as date, risk_level, COUNT(*) as count, AVG(risk_score) as avg_score
FROM vlm_audit_logs_v0
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND risk_level IS NOT NULL
GROUP BY DATE(created_at), risk_level
ORDER BY date DESC, risk_level"""),
    
    ("Q3", "High risk records", """
SELECT log_id, storage_key, risk_score, triggered_rules, affected_fields, created_at
FROM vlm_audit_logs_v0
WHERE risk_score >= 7.0 AND created_at >= CURRENT_DATE - INTERVAL '24 hours'
ORDER BY risk_score DESC LIMIT 50"""),
    
    ("Q4", "Rule trigger frequency", """
SELECT unnest(triggered_rules) as rule_name, COUNT(*) as trigger_count
FROM vlm_audit_logs_v0
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' AND triggered_rules IS NOT NULL
GROUP BY rule_name ORDER BY trigger_count DESC"""),
    
    ("Q5", "Pending review queue", """
SELECT l.log_id, l.storage_key, l.risk_score, l.triggered_rules, l.created_at, l.event_severity
FROM vlm_audit_logs_v0 l
LEFT JOIN vlm_audit_reviews_v0 r ON l.log_id = r.log_id
WHERE l.event_type = 'manual_review_required' AND r.review_id IS NULL
ORDER BY l.risk_score DESC, l.created_at ASC"""),
    
    # Compliance audit
    ("Q6", "Monthly compliance overview", """
SELECT COUNT(*) as total_extractions,
       COUNT(*) FILTER (WHERE risk_level = 'ok') as ok_count,
       COUNT(*) FILTER (WHERE risk_level = 'warning') as warning_count,
       COUNT(*) FILTER (WHERE risk_level = 'blocked') as blocked_count,
       ROUND(100.0 * COUNT(*) FILTER (WHERE risk_level = 'blocked') / NULLIF(COUNT(*), 0), 2) as blocked_rate,
       ROUND(AVG(risk_score), 2) as avg_risk_score
FROM vlm_audit_logs_v0
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) AND event_type = 'extraction_complete'"""),
    
    ("Q7", "Risk distribution by subject", """
SELECT SPLIT_PART(storage_key, '/', 1) as syllabus_code, COUNT(*) as total,
       COUNT(*) FILTER (WHERE risk_level = 'blocked') as blocked,
       ROUND(AVG(risk_score), 2) as avg_score
FROM vlm_audit_logs_v0
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY SPLIT_PART(storage_key, '/', 1) ORDER BY blocked DESC"""),
    
    ("Q8", "Copyright risk events", """
SELECT log_id, storage_key, triggered_rules, risk_score, created_at
FROM vlm_audit_logs_v0
WHERE triggered_rules && ARRAY['mark_scheme_ref', 'examiner_report', 'copyright_notice', 'marking_scheme_variant']
  AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY created_at DESC"""),
    
    ("Q9", "PII leak events", """
SELECT log_id, storage_key, triggered_rules, affected_fields, created_at
FROM vlm_audit_logs_v0
WHERE triggered_rules && ARRAY['pii_email', 'pii_candidate']
  AND created_at >= DATE_TRUNC('quarter', CURRENT_DATE)
ORDER BY created_at DESC"""),
    
    ("Q10", "Review completion rate", """
SELECT DATE_TRUNC('week', l.created_at) as week,
       COUNT(DISTINCT l.log_id) as total_reviews_required,
       COUNT(DISTINCT r.log_id) as reviews_completed,
       ROUND(100.0 * COUNT(DISTINCT r.log_id) / NULLIF(COUNT(DISTINCT l.log_id), 0), 2) as completion_rate
FROM vlm_audit_logs_v0 l
LEFT JOIN vlm_audit_reviews_v0 r ON l.log_id = r.log_id
WHERE l.event_type = 'manual_review_required' AND l.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('week', l.created_at) ORDER BY week DESC"""),
    
    # Investigation
    ("Q11", "Asset audit trail", """
SELECT log_id, event_type, event_severity, risk_score, triggered_rules, actor, created_at
FROM vlm_audit_logs_v0
WHERE storage_key = $1 ORDER BY created_at ASC"""),
    
    ("Q12", "Run events", """
SELECT log_id, storage_key, event_type, event_severity, risk_score, created_at
FROM vlm_audit_logs_v0
WHERE run_id = $1 ORDER BY created_at ASC"""),
    
    ("Q13", "Rule trigger details", """
SELECT log_id, storage_key, affected_fields, leakage_flags, risk_score, created_at
FROM vlm_audit_logs_v0
WHERE $1 = ANY(triggered_rules) AND created_at >= $2 AND created_at < $3
ORDER BY created_at DESC LIMIT 100"""),
    
    ("Q14", "Status override history", """
SELECT l.log_id, l.storage_key, l.created_at as override_time,
       r.reviewer, r.original_status, r.new_status, r.review_reason
FROM vlm_audit_logs_v0 l
JOIN vlm_audit_reviews_v0 r ON l.log_id = r.log_id
WHERE l.event_type = 'status_override' AND l.created_at >= $1
ORDER BY l.created_at DESC"""),
    
    ("Q15", "False positive analysis", """
SELECT unnest(triggered_rules) as rule_name, COUNT(*) as total_triggers,
       COUNT(*) FILTER (WHERE r.review_action = 'approve') as false_positives,
       ROUND(100.0 * COUNT(*) FILTER (WHERE r.review_action = 'approve') / NULLIF(COUNT(*), 0), 2) as false_positive_rate
FROM vlm_audit_logs_v0 l
JOIN vlm_audit_reviews_v0 r ON l.log_id = r.log_id
WHERE l.created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY rule_name HAVING COUNT(*) >= 10 ORDER BY false_positive_rate DESC"""),
    
    # Performance
    ("Q16", "Extraction latency", """
WITH extraction_pairs AS (
    SELECT storage_key,
           MIN(created_at) FILTER (WHERE event_type = 'extraction_start') as start_time,
           MIN(created_at) FILTER (WHERE event_type = 'extraction_complete') as end_time
    FROM vlm_audit_logs_v0
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY storage_key
)
SELECT DATE(start_time) as date, COUNT(*) as extractions,
       AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avg_duration_sec,
       MAX(EXTRACT(EPOCH FROM (end_time - start_time))) as max_duration_sec
FROM extraction_pairs WHERE end_time IS NOT NULL
GROUP BY DATE(start_time) ORDER BY date DESC"""),
    
    ("Q17", "Audit log growth", """
SELECT DATE(created_at) as date, COUNT(*) as log_count
FROM vlm_audit_logs_v0
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at) ORDER BY date DESC"""),
    
    # Export
    ("Q18", "Compliance report export", """
SELECT l.log_id, l.storage_key, l.event_type, l.event_severity, l.risk_score, l.risk_level,
       l.triggered_rules, l.created_at, r.reviewer, r.review_action, r.reviewed_at
FROM vlm_audit_logs_v0 l
LEFT JOIN vlm_audit_reviews_v0 r ON l.log_id = r.log_id
WHERE l.created_at >= $1 AND l.created_at < $2
ORDER BY l.created_at ASC"""),
    
    ("Q19", "High risk asset list", """
SELECT DISTINCT ON (storage_key) storage_key, sha256, MAX(risk_score) as max_risk_score,
       MAX(created_at) as last_event_time
FROM vlm_audit_logs_v0
WHERE risk_level = 'blocked' AND created_at >= DATE_TRUNC('quarter', CURRENT_DATE)
GROUP BY storage_key, sha256 ORDER BY storage_key, max_risk_score DESC"""),
    
    ("Q20", "Reviewer workload", """
SELECT reviewer, COUNT(*) as total_reviews,
       COUNT(*) FILTER (WHERE review_action = 'approve') as approvals,
       COUNT(*) FILTER (WHERE review_action = 'reject') as rejections,
       COUNT(*) FILTER (WHERE review_action = 'escalate') as escalations,
       AVG(EXTRACT(EPOCH FROM (reviewed_at - l.created_at))) / 3600 as avg_response_hours
FROM vlm_audit_reviews_v0 r
JOIN vlm_audit_logs_v0 l ON r.log_id = l.log_id
WHERE r.reviewed_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY reviewer ORDER BY total_reviews DESC"""),
]


class AuditReportGenerator:
    """Generate audit reports."""
    
    def __init__(self, dry_run: bool = False, db_url: str | None = None):
        self.dry_run = dry_run
        self.db_url = db_url
        self.conn = None
    
    def _get_period(self, report_type: ReportType) -> tuple[datetime, datetime]:
        """Get period start and end based on report type."""
        now = datetime.now()
        if report_type == "daily":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=1)
        elif report_type == "weekly":
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=7)
        else:  # monthly
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if now.month == 12:
                end = start.replace(year=now.year + 1, month=1)
            else:
                end = start.replace(month=now.month + 1)
        return start, end
    
    def _execute_query(self, query_id: str, name: str, sql: str) -> QueryResult:
        """Execute a single query."""
        if self.dry_run:
            return QueryResult(query_id, name, sql.strip(), None, "Dry run mode")
        
        # In production, this would connect to the database
        # For now, return mock data
        return QueryResult(query_id, name, sql.strip(), {"note": "Requires DB connection"}, None)
    
    def generate(self, report_type: ReportType) -> AuditReport:
        """Generate audit report."""
        period_start, period_end = self._get_period(report_type)
        
        # Select queries based on report type
        if report_type == "daily":
            query_ids = ["Q1", "Q3", "Q5"]
        elif report_type == "weekly":
            query_ids = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q10"]
        else:  # monthly
            query_ids = [q[0] for q in AUDIT_QUERIES]  # All queries
        
        results = []
        for qid, name, sql in AUDIT_QUERIES:
            if qid in query_ids:
                results.append(self._execute_query(qid, name, sql))
        
        summary = {
            "report_type": report_type,
            "queries_executed": len(results),
            "queries_with_errors": sum(1 for r in results if r.error),
        }
        
        return AuditReport(
            report_type=report_type,
            generated_at=datetime.now().isoformat(),
            period_start=period_start.isoformat(),
            period_end=period_end.isoformat(),
            summary=summary,
            query_results=results,
        )


def format_markdown(report: AuditReport) -> str:
    """Format report as Markdown."""
    lines = [
        f"# VLM Audit Report ({report.report_type.capitalize()})",
        "",
        f"**Generated**: {report.generated_at}",
        f"**Period**: {report.period_start} to {report.period_end}",
        "",
        "## Summary",
        "",
        f"- Report Type: {report.report_type}",
        f"- Queries Executed: {report.summary['queries_executed']}",
        f"- Queries with Errors: {report.summary['queries_with_errors']}",
        "",
        "## Query Results",
        "",
    ]
    
    for r in report.query_results:
        lines.append(f"### {r.query_id}: {r.name}")
        lines.append("")
        lines.append("```sql")
        lines.append(r.sql)
        lines.append("```")
        lines.append("")
        if r.error:
            lines.append(f"**Error**: {r.error}")
        elif r.result:
            lines.append(f"**Result**: {json.dumps(r.result, indent=2)}")
        lines.append("")
    
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Generate audit reports")
    parser.add_argument("--type", choices=["daily", "weekly", "monthly"], default="daily", help="Report type")
    parser.add_argument("--format", choices=["json", "markdown"], default="markdown", help="Output format")
    parser.add_argument("--output", "-o", type=Path, help="Output file (default: stdout)")
    parser.add_argument("--dry-run", action="store_true", help="Skip actual DB queries")
    parser.add_argument("--db-url", help="Database connection URL")
    args = parser.parse_args()
    
    generator = AuditReportGenerator(dry_run=args.dry_run, db_url=args.db_url)
    report = generator.generate(args.type)
    
    if args.format == "json":
        output = json.dumps(asdict(report), indent=2)
    else:
        output = format_markdown(report)
    
    if args.output:
        args.output.write_text(output)
        print(f"Report written to {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
