const TOPIC_PATH_FORMAT_REGEX = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;
const PLACEHOLDER_REGEX = /(tbd|todo|lorem|placeholder|n\/a|pending|待补充|待完善|占位)/i;

const QUALITY_THRESHOLDS = {
  critical_rate_max: 0.005,
  benchmark_critical_open_items_max: 0,
};

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function readManualSampleEntries(manualSample = null) {
  if (!manualSample) return [];
  if (Array.isArray(manualSample)) return manualSample;
  if (Array.isArray(manualSample?.items)) return manualSample.items;
  return [];
}

function asItem(issue) {
  return {
    node_id: issue.node_id || null,
    topic_path: issue.topic_path || null,
    issue_type: issue.issue_type || 'unknown_issue',
    severity: issue.severity || 'minor',
    source: issue.source || 'auto_rule',
    message: issue.message || '',
    benchmark_covered: Boolean(issue.benchmark_covered),
    status: issue.status || 'open',
    evidence: issue.evidence || null,
  };
}

export function auditCurriculumNodes(rows = [], manualSample = null) {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const issues = [];
  const topicPathMap = new Map();

  for (const row of normalizedRows) {
    const nodeId = String(row?.node_id || '').trim();
    const topicPath = normalizeText(row?.topic_path);
    const title = normalizeText(row?.title);
    const description = normalizeText(row?.description);

    if (!nodeId) {
      issues.push(
        asItem({
          node_id: null,
          topic_path: topicPath || null,
          issue_type: 'missing_node_id',
          severity: 'critical',
          source: 'auto_rule',
          message: 'row has no node_id',
          evidence: { row },
        }),
      );
      continue;
    }

    if (!topicPath) {
      issues.push(
        asItem({
          node_id: nodeId,
          topic_path: null,
          issue_type: 'missing_topic_path',
          severity: 'critical',
          source: 'auto_rule',
          message: 'topic_path is empty',
        }),
      );
    } else {
      if (!TOPIC_PATH_FORMAT_REGEX.test(topicPath)) {
        issues.push(
          asItem({
            node_id: nodeId,
            topic_path: topicPath,
            issue_type: 'invalid_topic_path_format',
            severity: 'critical',
            source: 'auto_rule',
            message: 'topic_path contains unsupported characters (only letters, digits, underscore, dot are allowed)',
          }),
        );
      }
      if (topicPath.toLowerCase() === 'unmapped') {
        issues.push(
          asItem({
            node_id: nodeId,
            topic_path: topicPath,
            issue_type: 'topic_path_unmapped',
            severity: 'critical',
            source: 'auto_rule',
            message: 'topic_path is unmapped',
          }),
        );
      }
      if (topicPath !== topicPath.toLowerCase()) {
        issues.push(
          asItem({
            node_id: nodeId,
            topic_path: topicPath,
            issue_type: 'topic_path_case_drift',
            severity: 'minor',
            source: 'auto_rule',
            message: 'topic_path is not lowercase-normalized',
          }),
        );
      }
      const seen = topicPathMap.get(topicPath) || [];
      seen.push(nodeId);
      topicPathMap.set(topicPath, seen);
    }

    if (!title) {
      issues.push(
        asItem({
          node_id: nodeId,
          topic_path: topicPath || null,
          issue_type: 'missing_title',
          severity: 'major',
          source: 'auto_rule',
          message: 'title is empty',
        }),
      );
    } else {
      if (title.length < 3) {
        issues.push(
          asItem({
            node_id: nodeId,
            topic_path: topicPath || null,
            issue_type: 'title_too_short',
            severity: 'minor',
            source: 'auto_rule',
            message: 'title length < 3',
          }),
        );
      }
      if (title.length > 160) {
        issues.push(
          asItem({
            node_id: nodeId,
            topic_path: topicPath || null,
            issue_type: 'title_too_long',
            severity: 'minor',
            source: 'auto_rule',
            message: 'title length > 160',
          }),
        );
      }
      if (PLACEHOLDER_REGEX.test(title)) {
        issues.push(
          asItem({
            node_id: nodeId,
            topic_path: topicPath || null,
            issue_type: 'title_placeholder_noise',
            severity: 'major',
            source: 'auto_rule',
            message: 'title contains placeholder/noisy token',
          }),
        );
      }
    }

    if (!description) {
      issues.push(
        asItem({
          node_id: nodeId,
          topic_path: topicPath || null,
          issue_type: 'missing_description',
          severity: 'major',
          source: 'auto_rule',
          message: 'description is empty',
        }),
      );
    } else {
      if (description.length > 1200) {
        issues.push(
          asItem({
            node_id: nodeId,
            topic_path: topicPath || null,
            issue_type: 'description_too_long',
            severity: 'minor',
            source: 'auto_rule',
            message: 'description length > 1200',
          }),
        );
      }
      if (PLACEHOLDER_REGEX.test(description)) {
        issues.push(
          asItem({
            node_id: nodeId,
            topic_path: topicPath || null,
            issue_type: 'description_placeholder_noise',
            severity: 'major',
            source: 'auto_rule',
            message: 'description contains placeholder/noisy token',
          }),
        );
      }
    }
  }

  for (const [topicPath, nodeIds] of topicPathMap.entries()) {
    if (nodeIds.length <= 1) continue;
    for (const nodeId of nodeIds) {
      issues.push(
        asItem({
          node_id: nodeId,
          topic_path: topicPath,
          issue_type: 'duplicate_topic_path',
          severity: 'critical',
          source: 'auto_rule',
          message: `topic_path duplicated across ${nodeIds.length} nodes`,
          evidence: { duplicate_node_ids: nodeIds },
        }),
      );
    }
  }

  const manualItems = readManualSampleEntries(manualSample)
    .map((item) =>
      asItem({
        node_id: item.node_id || null,
        topic_path: item.topic_path || null,
        issue_type: item.issue_type || 'manual_review_issue',
        severity: item.severity || 'minor',
        source: 'manual_sample',
        message: item.review_note || item.message || 'manual review issue',
        benchmark_covered: Boolean(item.benchmark_covered),
        status: item.status || 'open',
        evidence: item.evidence || null,
      }),
    )
    .filter((item) => item.node_id || item.topic_path);

  const allIssues = [...issues, ...manualItems];
  const anomalyCounts = {};
  const severityCounts = { critical: 0, major: 0, minor: 0 };
  for (const issue of allIssues) {
    anomalyCounts[issue.issue_type] = (anomalyCounts[issue.issue_type] || 0) + 1;
    if (issue.severity in severityCounts) {
      severityCounts[issue.severity] += 1;
    } else {
      severityCounts.minor += 1;
    }
  }

  const totalRows = normalizedRows.length;
  const totalCritical = severityCounts.critical || 0;
  const criticalRate = totalRows > 0 ? totalCritical / totalRows : 0;
  const criticalOpenItems = allIssues.filter(
    (item) => item.severity === 'critical' && item.status !== 'fixed',
  );
  const benchmarkCriticalOpenItems = criticalOpenItems.filter((item) =>
    item.benchmark_covered === true,
  );

  const summary = {
    generated_at: new Date().toISOString(),
    table: 'curriculum_nodes',
    sample_strategy: {
      auto_rules: 'full_scan',
      manual_sample_limit: 50,
      manual_sample_timebox: '1_business_day',
      manual_sample_source: 'runs/backend/rag_curriculum_nodes_manual_samples.json',
    },
    thresholds: QUALITY_THRESHOLDS,
    totals: {
      total_nodes: totalRows,
      total_issues: allIssues.length,
      auto_rule_issues: issues.length,
      manual_sample_issues: manualItems.length,
    },
    anomaly_counts: anomalyCounts,
    severity_counts: severityCounts,
    rates: {
      critical_rate: Number(criticalRate.toFixed(6)),
    },
    threshold_checks: {
      critical_rate_lte_0_5_percent:
        Number(criticalRate.toFixed(6)) <= QUALITY_THRESHOLDS.critical_rate_max,
      benchmark_critical_open_items_zero:
        benchmarkCriticalOpenItems.length <= QUALITY_THRESHOLDS.benchmark_critical_open_items_max,
    },
    critical_open_items: criticalOpenItems.slice(0, 200),
    benchmark_critical_open_items: benchmarkCriticalOpenItems.slice(0, 200),
    repair_items: allIssues.slice(0, 2000),
  };

  return summary;
}

export function renderCurriculumNodesQualityReport(summary) {
  const lines = [
    '# RAG S1.3 Curriculum Nodes Quality Audit',
    '',
    `- Generated at: \`${summary.generated_at}\``,
    `- Table: \`${summary.table}\``,
    `- Total nodes: \`${summary.totals.total_nodes}\``,
    `- Total issues: \`${summary.totals.total_issues}\``,
    `- Critical rate: \`${(summary.rates.critical_rate * 100).toFixed(3)}%\``,
    `- Threshold check (critical <= 0.5%): \`${summary.threshold_checks.critical_rate_lte_0_5_percent}\``,
    `- Threshold check (benchmark critical open items == 0): \`${summary.threshold_checks.benchmark_critical_open_items_zero}\``,
    '',
    '## Severity Counts',
    '',
  ];

  for (const [key, value] of Object.entries(summary.severity_counts || {})) {
    lines.push(`- ${key}: \`${value}\``);
  }

  lines.push('', '## Top Anomaly Counts', '');
  const topAnomalies = Object.entries(summary.anomaly_counts || {}).sort((a, b) => b[1] - a[1]);
  if (topAnomalies.length === 0) {
    lines.push('- none');
  } else {
    for (const [key, value] of topAnomalies.slice(0, 20)) {
      lines.push(`- ${key}: \`${value}\``);
    }
  }

  lines.push('', '## Critical Open Items (Top 20)', '');
  const critical = Array.isArray(summary.critical_open_items) ? summary.critical_open_items : [];
  if (critical.length === 0) {
    lines.push('- none');
  } else {
    for (const item of critical.slice(0, 20)) {
      lines.push(
        `- node=\`${item.node_id || 'null'}\` path=\`${item.topic_path || 'null'}\` issue=\`${item.issue_type}\` source=\`${item.source}\` status=\`${item.status}\``,
      );
    }
  }

  return `${lines.join('\n')}\n`;
}
