import { evaluateCase, isSourceRefResolvable, p95, sanitizeEvidence } from './s1_2_benchmark.js';

export const S1_3_THRESHOLDS = Object.freeze({
  topic_leakage_rate_max: 0,
  evidence_traceability_rate_min: 0.95,
  retrieval_path_ratio_min: 0.7,
  short_circuit_ratio_max: 0.3,
  no_relevant_chunk_rate_max: 0.15,
  execution_error_rate_max: 0.1,
  infra_failure_rate_max: 0.1,
});

export const S1_3_RETRIEVAL_AUDIT_KEYS = Object.freeze([
  'query_mode',
  'short_circuit_label',
  'rpc_call_count',
  'hybrid_row_count',
  'dense_row_count',
  'lexical_row_count',
  'error_stage',
  'error_code',
  'error_status',
  'error_message',
  'error_details',
  'chat_mode',
]);

function toNullableString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function toNullableObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
}

export function stabilizeRetrievalAudit(rawAudit = null) {
  const source = rawAudit && typeof rawAudit === 'object' ? rawAudit : {};
  return {
    query_mode: toNullableString(source.query_mode) || 'unknown',
    short_circuit_label: toNullableString(source.short_circuit_label),
    rpc_call_count: toNonNegativeNumber(source.rpc_call_count, 0),
    hybrid_row_count: toNonNegativeNumber(source.hybrid_row_count, 0),
    dense_row_count: toNonNegativeNumber(source.dense_row_count, 0),
    lexical_row_count: toNonNegativeNumber(source.lexical_row_count, 0),
    error_stage: toNullableString(source.error_stage),
    error_code: toNullableString(source.error_code),
    error_status: Number.isFinite(Number(source.error_status)) ? Number(source.error_status) : null,
    error_message: toNullableString(source.error_message),
    error_details: toNullableObject(source.error_details),
    chat_mode: toNullableString(source.chat_mode) || 'not_attempted',
  };
}

export function hasStableRetrievalAuditShape(rawAudit = null) {
  const stable = stabilizeRetrievalAudit(rawAudit);
  return S1_3_RETRIEVAL_AUDIT_KEYS.every((key) => Object.hasOwn(stable, key));
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = String(keyFn(item) || 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function inferFailureClass(row = {}) {
  if (row.case_pass && row.uncertain && row.expected_behavior === 'uncertain') {
    return 'CONTRACTUAL_UNCERTAIN';
  }
  if (row.topic_leakage_flag) {
    return 'BOUNDARY_LEAKAGE';
  }
  if (Number(row.source_ref_unresolvable_count || 0) > 0) {
    return 'DATA_DIRTY_SOURCE_REF';
  }
  if (row.error_code === 'RAG_BOUNDARY_LOOKUP_FAILED') {
    return 'BOUNDARY_LOOKUP_FAILURE';
  }
  if (
    String(row.error_code || '').startsWith('RAG_RETRIEVER') ||
    row.error_stage === 'hybrid_rpc' ||
    (row.uncertain_reason_code === 'RETRIEVER_ERROR' && String(row.query_mode || '') !== 'short_circuit')
  ) {
    return 'RETRIEVAL_FAILURE';
  }
  if (String(row.error_code || '').startsWith('RAG_CHAT')) {
    return 'CHAT_FAILURE';
  }
  if (Number(row.evidence_count || 0) === 0 && String(row.query_mode || '') !== 'short_circuit') {
    return 'DATA_MISSING_NO_RELEVANT_CHUNK';
  }
  if (!row.case_pass) {
    return 'QUALITY_MISS';
  }
  return 'NONE';
}

function summarizeFailureClasses(rows = []) {
  return rows.reduce((acc, row) => {
    const key = row.failure_class || inferFailureClass(row);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function remediationMapFromFailureBreakdown(failureBreakdown = {}) {
  const map = [];
  if (Number(failureBreakdown.BOUNDARY_LOOKUP_FAILURE || 0) > 0) {
    map.push({
      failure_class: 'BOUNDARY_LOOKUP_FAILURE',
      remediation: 'stabilize syllabus boundary lookup path (curriculum_nodes availability + request input validation)',
    });
  }
  if (Number(failureBreakdown.DATA_MISSING_NO_RELEVANT_CHUNK || 0) > 0) {
    map.push({
      failure_class: 'DATA_MISSING_NO_RELEVANT_CHUNK',
      remediation: 'expand canonical coverage for missing source assets and strengthen topic_path mapping',
    });
  }
  if (Number(failureBreakdown.DATA_DIRTY_SOURCE_REF || 0) > 0) {
    map.push({
      failure_class: 'DATA_DIRTY_SOURCE_REF',
      remediation: 'repair source_ref contract (asset_id + page_no|question_id) and re-run ingest/backfill',
    });
  }
  if (Number(failureBreakdown.RETRIEVAL_FAILURE || 0) > 0) {
    map.push({
      failure_class: 'RETRIEVAL_FAILURE',
      remediation: 'stabilize hybrid RPC / network before retrieval strategy upgrades',
    });
  }
  if (Number(failureBreakdown.CHAT_FAILURE || 0) > 0) {
    map.push({
      failure_class: 'CHAT_FAILURE',
      remediation: 'stabilize chat generation path and retry budget for benchmark consistency',
    });
  }
  if (Number(failureBreakdown.BOUNDARY_LEAKAGE || 0) > 0) {
    map.push({
      failure_class: 'BOUNDARY_LEAKAGE',
      remediation: 'treat as release blocker and patch boundary + evidence filtering immediately',
    });
  }
  if (map.length === 0) {
    map.push({
      failure_class: 'NONE',
      remediation: 'no blocking remediation required',
    });
  }
  return map;
}

export function evaluateS13Case(item, response) {
  const evaluation = evaluateCase(item, response);
  const evidence = Array.isArray(response?.evidence) ? response.evidence : [];
  const retrievalAudit = stabilizeRetrievalAudit(response?.metrics?.retrieval_audit);
  const retrievalAuditShapeOk = hasStableRetrievalAuditShape(retrievalAudit);
  const traceableEvidenceCount = evidence.filter((entry) => isSourceRefResolvable(entry.source_ref)).length;
  const topEvidence = sanitizeEvidence(evidence, { limit: 3 });

  const row = {
    case_id: item.case_id,
    subject_code: item.subject_code || null,
    syllabus_node_id: item.syllabus_node_id || null,
    current_topic_path: item.current_topic_path || null,
    query_family: item.query_family || null,
    risk_family: item.risk_family || null,
    expected_behavior: item.expected_behavior || 'grounded_answer',
    expected_uncertain_reason_code: item.expected_uncertain_reason_code || null,
    query_mode_target: item.query_mode_target || 'retrieval',
    allow_short_circuit: Boolean(item.allow_short_circuit),
    query: item.query || '',
    reference_answer: item.reference_answer || '',
    answer: response?.answer || '',
    uncertain: Boolean(response?.uncertain),
    uncertain_reason_code: response?.uncertain_reason_code || null,
    topic_leakage_flag: Boolean(response?.topic_leakage_flag),
    topic_leakage_reason: response?.topic_leakage_reason || null,
    retrieval_version: response?.retrieval_version || null,
    query_mode: retrievalAudit?.query_mode || 'unknown',
    short_circuit_label: retrievalAudit?.short_circuit_label || null,
    retrieval_audit: retrievalAudit,
    retrieval_audit_shape_ok: retrievalAuditShapeOk,
    latency_ms: Number(response?.metrics?.latency_ms || 0),
    cost_usd: Number(response?.metrics?.cost_avg_usd_per_req || 0),
    cost_audit: response?.metrics?.cost_audit || null,
    evidence_count: evidence.length,
    resolvable_evidence_count: traceableEvidenceCount,
    source_ref_unresolvable_count: Math.max(evidence.length - traceableEvidenceCount, 0),
    top_evidence: topEvidence,
    error_stage: retrievalAudit?.error_stage || null,
    error_code: retrievalAudit?.error_code || null,
    error_details: retrievalAudit?.error_details || null,
    traceable: traceableEvidenceCount === evidence.length,
    ...evaluation,
  };
  row.failure_class = inferFailureClass(row);
  return row;
}

export function summarizeS13Rows(rows = [], manifest = null, runConfig = {}) {
  const total = rows.length || 1;
  const leakageCount = rows.filter((row) => row.topic_leakage_flag).length;
  const latencies = rows.map((row) => Number(row.latency_ms || 0));
  const evidenceCount = rows.reduce((sum, row) => sum + Number(row.evidence_count || 0), 0);
  const resolvableEvidenceCount = rows.reduce((sum, row) => sum + Number(row.resolvable_evidence_count || 0), 0);
  const shortCircuitCount = rows.filter((row) => row.query_mode === 'short_circuit').length;
  const retrievalPathCount = rows.filter((row) => row.query_mode === 'hybrid_rpc').length;
  const executionErrorCount = rows.filter((row) => row.query_mode === 'execution_error').length;
  const noRelevantChunkCount = rows.filter(
    (row) => row.failure_class === 'DATA_MISSING_NO_RELEVANT_CHUNK',
  ).length;
  const stableRetrievalAuditCount = rows.filter((row) => row.retrieval_audit_shape_ok === true).length;
  const avgCost = rows.reduce((sum, row) => sum + Number(row.cost_usd || 0), 0) / total;
  const rpcCallCountTotal = rows.reduce(
    (sum, row) => sum + Number(row.retrieval_audit?.rpc_call_count || 0),
    0,
  );
  const failureBreakdown = summarizeFailureClasses(rows);
  const infraFailureCount =
    Number(failureBreakdown.BOUNDARY_LOOKUP_FAILURE || 0) +
    Number(failureBreakdown.RETRIEVAL_FAILURE || 0) +
    Number(failureBreakdown.CHAT_FAILURE || 0);
  const errorBreakdown = countBy(rows, (row) => row.error_code || 'NONE');
  const queryModeCounts = countBy(rows, (row) => row.query_mode || 'unknown');
  const sourceTypeHitCounts = rows.reduce((acc, row) => {
    const evidence = Array.isArray(row.top_evidence) ? row.top_evidence : [];
    for (const item of evidence) {
      const key = String(item.source_type || 'unknown');
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {});

  const metrics = {
    topic_leakage_rate: Number((leakageCount / total).toFixed(6)),
    evidence_traceability_rate: Number((evidenceCount === 0 ? 1 : resolvableEvidenceCount / evidenceCount).toFixed(6)),
    retrieval_path_ratio: Number((retrievalPathCount / total).toFixed(6)),
    short_circuit_ratio: Number((shortCircuitCount / total).toFixed(6)),
    no_relevant_chunk_rate: Number((noRelevantChunkCount / total).toFixed(6)),
    execution_error_rate: Number((executionErrorCount / total).toFixed(6)),
    infra_failure_rate: Number((infraFailureCount / total).toFixed(6)),
    latency_p95_ms: Number(p95(latencies).toFixed(3)),
    cost_avg_usd_per_req: Number(avgCost.toFixed(6)),
  };

  const thresholdChecks = {
    topic_leakage_rate: metrics.topic_leakage_rate <= S1_3_THRESHOLDS.topic_leakage_rate_max,
    evidence_traceability_rate:
      metrics.evidence_traceability_rate >= S1_3_THRESHOLDS.evidence_traceability_rate_min,
    retrieval_path_ratio: metrics.retrieval_path_ratio >= S1_3_THRESHOLDS.retrieval_path_ratio_min,
    short_circuit_ratio: metrics.short_circuit_ratio <= S1_3_THRESHOLDS.short_circuit_ratio_max,
    no_relevant_chunk_rate: metrics.no_relevant_chunk_rate <= S1_3_THRESHOLDS.no_relevant_chunk_rate_max,
    execution_error_rate: metrics.execution_error_rate <= S1_3_THRESHOLDS.execution_error_rate_max,
    infra_failure_rate: metrics.infra_failure_rate <= S1_3_THRESHOLDS.infra_failure_rate_max,
  };

  const topFailingCases = rows
    .filter((row) => !row.case_pass)
    .sort((a, b) => Number(a.answer_quality_score || 0) - Number(b.answer_quality_score || 0))
    .slice(0, 20)
    .map((row) => ({
      case_id: row.case_id,
      query_family: row.query_family,
      expected_behavior: row.expected_behavior,
      query_mode: row.query_mode,
      failure_class: row.failure_class,
      uncertain_reason_code: row.uncertain_reason_code,
      error_code: row.error_code,
      source_ref_unresolvable_count: row.source_ref_unresolvable_count,
      evidence_count: row.evidence_count,
      answer_quality_score: row.answer_quality_score,
    }));

  const dataIssueCount =
    Number(failureBreakdown.DATA_MISSING_NO_RELEVANT_CHUNK || 0) +
    Number(failureBreakdown.DATA_DIRTY_SOURCE_REF || 0);
  const retrievalIssueCount = infraFailureCount;
  const qualityMissCount = Number(failureBreakdown.QUALITY_MISS || 0);
  const principalFailureDomain =
    qualityMissCount > dataIssueCount + retrievalIssueCount && metrics.retrieval_path_ratio >= 0.7
      ? 'cross_topic_global_reasoning'
      : dataIssueCount > retrievalIssueCount
      ? 'data'
      : retrievalIssueCount > dataIssueCount
        ? 'retrieval_or_infra'
        : 'mixed';

  return {
    generated_at: new Date().toISOString(),
    benchmark_profile: manifest?.benchmark_profile || 's1_3_forced_retrieval_v1',
    benchmark_tier: manifest?.benchmark_tier || 'advisory',
    dataset: runConfig.dataset || null,
    manifest: runConfig.manifest || null,
    run_config: runConfig,
    total_requests: rows.length,
    thresholds: S1_3_THRESHOLDS,
    metrics,
    threshold_checks: thresholdChecks,
    status: Object.values(thresholdChecks).every(Boolean) ? 'pass' : 'warn',
    query_mode_counts: queryModeCounts,
    retrieval_path_ratio: metrics.retrieval_path_ratio,
    short_circuit_ratio: metrics.short_circuit_ratio,
    rpc_call_count_total: rpcCallCountTotal,
    source_type_hit_counts: sourceTypeHitCounts,
    failure_class_breakdown: failureBreakdown,
    error_breakdown: errorBreakdown,
    principal_failure_domain: principalFailureDomain,
    remediation_map: remediationMapFromFailureBreakdown(failureBreakdown),
    traceability_audit: {
      total_evidence_count: evidenceCount,
      resolvable_evidence_count: resolvableEvidenceCount,
      unresolvable_evidence_count: Math.max(evidenceCount - resolvableEvidenceCount, 0),
      requests_with_unresolvable_source_ref: rows.filter((row) => row.source_ref_unresolvable_count > 0).length,
    },
    retrieval_audit_contract: {
      required_keys: S1_3_RETRIEVAL_AUDIT_KEYS,
      stable_row_count: stableRetrievalAuditCount,
      stable_row_rate: Number((stableRetrievalAuditCount / total).toFixed(6)),
    },
    leakage_audit: {
      leakage_request_count: leakageCount,
      reason_counts: countBy(rows, (row) => row.topic_leakage_reason || 'NONE'),
    },
    top_failing_cases: topFailingCases,
    rows,
  };
}

export function renderS13BenchmarkReport(summary = {}) {
  const lines = [
    '# RAG S1.3 Forced Retrieval Benchmark',
    '',
    `- Generated at: \`${summary.generated_at}\``,
    `- Status: \`${summary.status}\``,
    `- Benchmark profile: \`${summary.benchmark_profile}\``,
    `- Total requests: \`${summary.total_requests}\``,
    '',
    '## Key Metrics',
    '',
    `- topic_leakage_rate: \`${((summary.metrics?.topic_leakage_rate || 0) * 100).toFixed(2)}%\``,
    `- evidence_traceability_rate: \`${((summary.metrics?.evidence_traceability_rate || 0) * 100).toFixed(2)}%\``,
    `- retrieval_path_ratio: \`${((summary.metrics?.retrieval_path_ratio || 0) * 100).toFixed(2)}%\``,
    `- short_circuit_ratio: \`${((summary.metrics?.short_circuit_ratio || 0) * 100).toFixed(2)}%\``,
    `- no_relevant_chunk_rate: \`${((summary.metrics?.no_relevant_chunk_rate || 0) * 100).toFixed(2)}%\``,
    `- infra_failure_rate: \`${((summary.metrics?.infra_failure_rate || 0) * 100).toFixed(2)}%\``,
    `- latency_p95_ms: \`${summary.metrics?.latency_p95_ms || 0}\``,
    '',
    '## Threshold Checks',
    '',
  ];

  for (const [key, value] of Object.entries(summary.threshold_checks || {})) {
    lines.push(`- ${key}: \`${Boolean(value)}\``);
  }

  lines.push('', '## Query Mode Counts', '');
  for (const [key, value] of Object.entries(summary.query_mode_counts || {})) {
    lines.push(`- ${key}: \`${value}\``);
  }

  lines.push('', '## Failure Class Breakdown', '');
  for (const [key, value] of Object.entries(summary.failure_class_breakdown || {})) {
    lines.push(`- ${key}: \`${value}\``);
  }

  lines.push('', '## Remediation Map', '');
  for (const item of summary.remediation_map || []) {
    lines.push(`- \`${item.failure_class}\`: ${item.remediation}`);
  }

  lines.push('', '## Top Failing Cases', '');
  if (!Array.isArray(summary.top_failing_cases) || summary.top_failing_cases.length === 0) {
    lines.push('- none');
  } else {
    for (const row of summary.top_failing_cases.slice(0, 20)) {
      lines.push(
        `- case=\`${row.case_id}\` family=\`${row.query_family}\` class=\`${row.failure_class}\` mode=\`${row.query_mode}\` error=\`${row.error_code || 'NONE'}\``,
      );
    }
  }

  return `${lines.join('\n')}\n`;
}
