import { evaluateCase, isSourceRefResolvable, p95, sanitizeEvidence } from './s1_2_benchmark.js';

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

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = String(keyFn(item) || 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function stabilizeRouteAudit(rawAudit) {
  const source = rawAudit && typeof rawAudit === 'object' ? rawAudit : {};
  return {
    retrieval_route: toNullableString(source.retrieval_route) || 's1_default',
    route_reason: toNullableString(source.route_reason),
    route_stage: toNullableString(source.route_stage) || 'default_safe',
    route_scores: source.route_scores && typeof source.route_scores === 'object' ? source.route_scores : null,
    final_execution_route: toNullableString(source.final_execution_route) || 's1_default',
    fallback_triggered: Boolean(source.fallback_triggered),
    fallback_reason: toNullableString(source.fallback_reason),
    s2_hop_count: toNonNegativeNumber(source.s2_hop_count, 0),
    s2_expanded_topic_count: toNonNegativeNumber(source.s2_expanded_topic_count, 0),
    llm_classifier_used: Boolean(source.llm_classifier_used),
    llm_classifier_status: toNullableString(source.llm_classifier_status),
  };
}

function stabilizeRetrievalAudit(rawAudit) {
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
    error_details: source.error_details && typeof source.error_details === 'object' ? source.error_details : null,
    chat_mode: toNullableString(source.chat_mode) || 'not_attempted',
  };
}

function inferDependencyStatus(row) {
  const llmStatus = String(row?.route_audit?.llm_classifier_status || 'not_enabled');
  const fallbackReason = String(row?.route_audit?.fallback_reason || '');
  if (fallbackReason === 'S2_MODEL_UNAVAILABLE') return 'degraded';
  if (llmStatus === 'upstream_ok') return 'enabled';
  if (llmStatus === 'upstream_error' || llmStatus === 'parse_error') return 'degraded';
  return 'skipped';
}

function inferFailureClass(row) {
  if (row.topic_leakage_flag) return 'BOUNDARY_LEAKAGE';
  if (row.route_audit?.fallback_triggered) return 'S2_FALLBACK';
  if (row.uncertain && row.expected_behavior !== 'uncertain') return 'UNEXPECTED_UNCERTAIN';
  if (!row.case_pass) return 'QUALITY_MISS';
  return 'NONE';
}

export function evaluateS2AugmentationCase(item, response, { mode }) {
  const evaluation = evaluateCase(item, response);
  const evidence = Array.isArray(response?.evidence) ? response.evidence : [];
  const routeAudit = stabilizeRouteAudit(response?.metrics?.route_audit);
  const retrievalAudit = stabilizeRetrievalAudit(response?.metrics?.retrieval_audit);
  const traceableEvidenceCount = evidence.filter((entry) => isSourceRefResolvable(entry.source_ref)).length;

  const row = {
    mode,
    case_id: item.case_id,
    subject_code: item.subject_code || null,
    syllabus_node_id: item.syllabus_node_id || null,
    current_topic_path: item.current_topic_path || null,
    target_slice: item.target_slice || 'unknown',
    query_family: item.query_family || null,
    risk_family: item.risk_family || null,
    expected_behavior: item.expected_behavior || 'grounded_answer',
    query: item.query || '',
    reference_answer: item.reference_answer || '',
    answer: response?.answer || '',
    uncertain: Boolean(response?.uncertain),
    uncertain_reason_code: response?.uncertain_reason_code || null,
    topic_leakage_flag: Boolean(response?.topic_leakage_flag),
    topic_leakage_reason: response?.topic_leakage_reason || null,
    retrieval_version: response?.retrieval_version || null,
    route_audit: routeAudit,
    retrieval_audit: retrievalAudit,
    latency_ms: Number(response?.metrics?.latency_ms || 0),
    cost_usd: Number(response?.metrics?.cost_avg_usd_per_req || 0),
    cost_audit: response?.metrics?.cost_audit || null,
    evidence_count: evidence.length,
    resolvable_evidence_count: traceableEvidenceCount,
    source_ref_unresolvable_count: Math.max(evidence.length - traceableEvidenceCount, 0),
    top_evidence: sanitizeEvidence(evidence, { limit: 3 }),
    traceable: traceableEvidenceCount === evidence.length,
    ...evaluation,
  };
  row.failure_class = inferFailureClass(row);
  row.dependency_status = inferDependencyStatus(row);
  return row;
}

function summarizeMode(rows) {
  const total = rows.length || 1;
  const evidenceTotal = rows.reduce((sum, row) => sum + Number(row.evidence_count || 0), 0);
  const traceableTotal = rows.reduce((sum, row) => sum + Number(row.resolvable_evidence_count || 0), 0);
  const s2RoutedCount = rows.filter((row) => row.route_audit?.retrieval_route === 's2_augmentation').length;
  const fallbackCount = rows.filter(
    (row) => row.route_audit?.retrieval_route === 's2_augmentation' && row.route_audit?.fallback_triggered,
  ).length;

  return {
    total_requests: rows.length,
    case_pass_rate: Number((rows.filter((row) => row.case_pass).length / total).toFixed(6)),
    answer_quality_score: Number((average(rows.map((row) => row.answer_quality_score || 0))).toFixed(6)),
    uncertain_rate: Number((rows.filter((row) => row.uncertain).length / total).toFixed(6)),
    topic_leakage_rate: Number((rows.filter((row) => row.topic_leakage_flag).length / total).toFixed(6)),
    evidence_traceability_rate: Number((evidenceTotal === 0 ? 1 : traceableTotal / evidenceTotal).toFixed(6)),
    latency_p95_ms: Number(p95(rows.map((row) => Number(row.latency_ms || 0))).toFixed(3)),
    cost_avg_usd_per_req: Number((average(rows.map((row) => row.cost_usd || 0))).toFixed(6)),
    retrieval_route_counts: countBy(rows, (row) => row.route_audit?.retrieval_route || 'unknown'),
    final_execution_route_counts: countBy(rows, (row) => row.route_audit?.final_execution_route || 'unknown'),
    query_mode_counts: countBy(rows, (row) => row.retrieval_audit?.query_mode || 'unknown'),
    fallback_reason_counts: countBy(
      rows.filter((row) => row.route_audit?.fallback_triggered),
      (row) => row.route_audit?.fallback_reason || 'UNKNOWN',
    ),
    s2_empty_evidence_reason_counts: countBy(
      rows.filter((row) => row.route_audit?.fallback_reason === 'S2_EMPTY_EVIDENCE'),
      (row) => row.route_audit?.route_scores?.s2_empty_evidence_reason || 'unknown',
    ),
    dependency_status_counts: countBy(rows, (row) => row.dependency_status || 'unknown'),
    s2_routed_request_count: s2RoutedCount,
    s2_fallback_count: fallbackCount,
    fallback_rate: Number((s2RoutedCount === 0 ? 0 : fallbackCount / s2RoutedCount).toFixed(6)),
  };
}

function summarizeSliceDelta(s1Rows, s2Rows) {
  const targetSlices = [...new Set([...s1Rows.map((row) => row.target_slice), ...s2Rows.map((row) => row.target_slice)])];
  const out = {};
  for (const slice of targetSlices) {
    const s1Slice = s1Rows.filter((row) => row.target_slice === slice);
    const s2Slice = s2Rows.filter((row) => row.target_slice === slice);
    const s1Avg = average(s1Slice.map((row) => row.answer_quality_score || 0));
    const s2Avg = average(s2Slice.map((row) => row.answer_quality_score || 0));
    const s1Pass = average(s1Slice.map((row) => (row.case_pass ? 1 : 0)));
    const s2Pass = average(s2Slice.map((row) => (row.case_pass ? 1 : 0)));
    const s2RoutedCount = s2Slice.filter((row) => row.route_audit?.retrieval_route === 's2_augmentation').length;
    const s2FallbackCount = s2Slice.filter(
      (row) => row.route_audit?.retrieval_route === 's2_augmentation' && row.route_audit?.fallback_triggered,
    ).length;

    out[slice] = {
      total_requests: s2Slice.length,
      s1_quality_score: Number(s1Avg.toFixed(6)),
      s2_quality_score: Number(s2Avg.toFixed(6)),
      quality_delta: Number((s2Avg - s1Avg).toFixed(6)),
      s1_case_pass_rate: Number(s1Pass.toFixed(6)),
      s2_case_pass_rate: Number(s2Pass.toFixed(6)),
      case_pass_rate_delta: Number((s2Pass - s1Pass).toFixed(6)),
      s2_fallback_rate: Number((s2RoutedCount === 0 ? 0 : s2FallbackCount / s2RoutedCount).toFixed(6)),
    };
  }
  return out;
}

function summarizeTopFailingCases(s1Rows, s2Rows, limit = 20) {
  const s1Map = new Map(s1Rows.map((row) => [row.case_id, row]));
  return s2Rows
    .map((row) => {
      const baseline = s1Map.get(row.case_id) || null;
      const qualityDelta = Number((Number(row.answer_quality_score || 0) - Number(baseline?.answer_quality_score || 0)).toFixed(6));
      return {
        case_id: row.case_id,
        target_slice: row.target_slice,
        query_family: row.query_family,
        s2_case_pass: row.case_pass,
        s2_failure_class: row.failure_class,
        s2_fallback_triggered: Boolean(row.route_audit?.fallback_triggered),
        s2_fallback_reason: row.route_audit?.fallback_reason || null,
        s2_route_stage: row.route_audit?.route_stage || null,
        s2_retrieval_route: row.route_audit?.retrieval_route || null,
        s2_final_execution_route: row.route_audit?.final_execution_route || null,
        s2_answer_quality_score: Number(row.answer_quality_score || 0),
        s1_answer_quality_score: Number(baseline?.answer_quality_score || 0),
        quality_delta_vs_s1: qualityDelta,
        s2_uncertain_reason_code: row.uncertain_reason_code || null,
        s2_error_code: row.retrieval_audit?.error_code || null,
      };
    })
    .filter((row) => !row.s2_case_pass || row.s2_fallback_triggered || row.s2_failure_class !== 'NONE')
    .sort((left, right) => {
      if (left.s2_case_pass !== right.s2_case_pass) return left.s2_case_pass ? 1 : -1;
      if (left.s2_fallback_triggered !== right.s2_fallback_triggered) return left.s2_fallback_triggered ? -1 : 1;
      if (left.quality_delta_vs_s1 !== right.quality_delta_vs_s1) {
        return left.quality_delta_vs_s1 - right.quality_delta_vs_s1;
      }
      return left.case_id.localeCompare(right.case_id);
    })
    .slice(0, limit);
}

function summarizeReadinessRouting(rows) {
  const total = rows.length || 1;
  const blocked = rows.filter(
    (row) =>
      row.route_audit?.route_stage === 'readiness_guard' &&
      row.route_audit?.route_reason === 's2_readiness_guard_default_s1',
  );
  return {
    readiness_guard_block_count: blocked.length,
    readiness_guard_block_rate: Number((blocked.length / total).toFixed(6)),
    readiness_guard_reason_counts: countBy(
      blocked,
      (row) => row.route_audit?.route_scores?.readiness_guard_reason || 'unknown',
    ),
    readiness_effective_depth_source_counts: countBy(
      blocked,
      (row) => row.route_audit?.route_scores?.readiness_effective_depth_source || 'unknown',
    ),
  };
}

function pickPrimaryCorpusVersion(corpusVersionCounts = {}) {
  const entries = Object.entries(corpusVersionCounts || {});
  if (entries.length === 0) return null;
  entries.sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0));
  return entries[0][0];
}

export function summarizeS2AugmentationEval({
  s1Rows,
  s2Rows,
  dataset = null,
  manifest = null,
  runConfig = {},
  corpusCoverageSummary = null,
}) {
  const s1Summary = summarizeMode(s1Rows);
  const s2Summary = summarizeMode(s2Rows);
  const perSlice = summarizeSliceDelta(s1Rows, s2Rows);
  const readinessRouting = summarizeReadinessRouting(s2Rows);
  const qualityDeltaOverall =
    Number(
      (
        average(s2Rows.map((row) => row.answer_quality_score || 0)) -
        average(s1Rows.map((row) => row.answer_quality_score || 0))
      ).toFixed(6),
    );
  const casePassDeltaOverall =
    Number(
      (
        average(s2Rows.map((row) => (row.case_pass ? 1 : 0))) -
        average(s1Rows.map((row) => (row.case_pass ? 1 : 0)))
      ).toFixed(6),
    );

  const corpusVersionCounts = corpusCoverageSummary?.corpus_version_counts || {};
  const summary = {
    generated_at: new Date().toISOString(),
    benchmark_profile: manifest?.benchmark_profile || 's2_augmentation_eval_v1',
    benchmark_tier: manifest?.benchmark_tier || 'advisory',
    dataset,
    manifest: runConfig?.manifest || null,
    run_config: runConfig,
    inputs: {
      dataset,
      manifest: runConfig?.manifest || null,
      corpus_coverage_summary: runConfig?.corpus_coverage_summary || null,
    },
    total_requests: s2Rows.length,
    route_counts: s2Summary.retrieval_route_counts,
    retrieval_route_counts: s2Summary.retrieval_route_counts,
    readiness_guard_block_count: readinessRouting.readiness_guard_block_count,
    readiness_guard_block_rate: readinessRouting.readiness_guard_block_rate,
    readiness_guard_reason_counts: readinessRouting.readiness_guard_reason_counts,
    readiness_effective_depth_source_counts: readinessRouting.readiness_effective_depth_source_counts,
    fallback_reason_counts: s2Summary.fallback_reason_counts,
    s2_empty_evidence_reason_counts: s2Summary.s2_empty_evidence_reason_counts,
    fallback_rate: s2Summary.fallback_rate,
    topic_leakage_rate: s2Summary.topic_leakage_rate,
    evidence_traceability_rate: s2Summary.evidence_traceability_rate,
    target_slice_quality_vs_s1: qualityDeltaOverall,
    target_slice_case_pass_vs_s1: casePassDeltaOverall,
    target_slice_quality_vs_s1_by_slice: perSlice,
    corpus_version: pickPrimaryCorpusVersion(corpusVersionCounts),
    corpus_version_counts: corpusVersionCounts,
    dependency_status_counts: s2Summary.dependency_status_counts,
    route_audit: {
      s1_baseline: {
        retrieval_route_counts: s1Summary.retrieval_route_counts,
        final_execution_route_counts: s1Summary.final_execution_route_counts,
        query_mode_counts: s1Summary.query_mode_counts,
      },
      s2_enabled: {
        retrieval_route_counts: s2Summary.retrieval_route_counts,
        final_execution_route_counts: s2Summary.final_execution_route_counts,
        query_mode_counts: s2Summary.query_mode_counts,
        readiness_guard_block_count: readinessRouting.readiness_guard_block_count,
        readiness_guard_block_rate: readinessRouting.readiness_guard_block_rate,
        readiness_guard_reason_counts: readinessRouting.readiness_guard_reason_counts,
        fallback_reason_counts: s2Summary.fallback_reason_counts,
        s2_empty_evidence_reason_counts: s2Summary.s2_empty_evidence_reason_counts,
      },
    },
    mode_summaries: {
      s1_baseline: s1Summary,
      s2_enabled: s2Summary,
    },
    top_failing_cases: summarizeTopFailingCases(s1Rows, s2Rows, 20),
    status: s2Rows.some((row) => row.execution_error)
      ? 'warn'
      : 'pass',
    rows: {
      s1_baseline: s1Rows,
      s2_enabled: s2Rows,
    },
  };
  return summary;
}

export function renderS2AugmentationEvalReport(summary = {}) {
  const lines = [
    '# RAG S2 Augmentation Eval Report',
    '',
    `- Generated at: \`${summary.generated_at || 'unknown'}\``,
    `- Status: \`${summary.status || 'unknown'}\``,
    `- Benchmark profile: \`${summary.benchmark_profile || 'unknown'}\``,
    `- Dataset: \`${summary.dataset || 'unknown'}\``,
    `- Total requests: \`${summary.total_requests || 0}\``,
    '',
    '## Key Metrics',
    '',
    `- fallback_rate: \`${summary.fallback_rate ?? 0}\``,
    `- topic_leakage_rate: \`${summary.topic_leakage_rate ?? 0}\``,
    `- evidence_traceability_rate: \`${summary.evidence_traceability_rate ?? 0}\``,
    `- target_slice_quality_vs_s1: \`${summary.target_slice_quality_vs_s1 ?? 0}\``,
    `- target_slice_case_pass_vs_s1: \`${summary.target_slice_case_pass_vs_s1 ?? 0}\``,
    `- readiness_guard_block_rate: \`${summary.readiness_guard_block_rate ?? 0}\``,
    '',
    '## Route Counts',
    '',
  ];

  for (const [key, value] of Object.entries(summary.route_counts || {})) {
    lines.push(`- ${key}: \`${value}\``);
  }

  lines.push('', '## Fallback Reason Counts', '');
  const fallbackEntries = Object.entries(summary.fallback_reason_counts || {});
  if (fallbackEntries.length === 0) {
    lines.push('- none');
  } else {
    for (const [key, value] of fallbackEntries) {
      lines.push(`- ${key}: \`${value}\``);
    }
  }

  lines.push('', '## S2 Empty Evidence Breakdown', '');
  const emptyEvidenceEntries = Object.entries(summary.s2_empty_evidence_reason_counts || {});
  if (emptyEvidenceEntries.length === 0) {
    lines.push('- none');
  } else {
    for (const [key, value] of emptyEvidenceEntries) {
      lines.push(`- ${key}: \`${value}\``);
    }
  }

  lines.push('', '## Readiness Guard Breakdown', '');
  lines.push(`- readiness_guard_block_count: \`${summary.readiness_guard_block_count ?? 0}\``);
  lines.push(`- readiness_guard_block_rate: \`${summary.readiness_guard_block_rate ?? 0}\``);
  const readinessReasonEntries = Object.entries(summary.readiness_guard_reason_counts || {});
  if (readinessReasonEntries.length === 0) {
    lines.push('- readiness_guard_reason_counts: none');
  } else {
    for (const [key, value] of readinessReasonEntries) {
      lines.push(`- readiness_guard_reason/${key}: \`${value}\``);
    }
  }

  lines.push('', '## Target Slice Delta', '');
  for (const [slice, delta] of Object.entries(summary.target_slice_quality_vs_s1_by_slice || {})) {
    lines.push(
      `- ${slice}: quality_delta=\`${delta.quality_delta}\` pass_rate_delta=\`${delta.case_pass_rate_delta}\` s2_fallback_rate=\`${delta.s2_fallback_rate}\``,
    );
  }

  lines.push('', '## Dependency Status', '');
  for (const [status, count] of Object.entries(summary.dependency_status_counts || {})) {
    lines.push(`- ${status}: \`${count}\``);
  }

  lines.push('', '## Top Failing Cases', '');
  const topFailing = Array.isArray(summary.top_failing_cases) ? summary.top_failing_cases : [];
  if (topFailing.length === 0) {
    lines.push('- none');
  } else {
    for (const row of topFailing.slice(0, 20)) {
      lines.push(
        `- case=\`${row.case_id}\` slice=\`${row.target_slice}\` class=\`${row.s2_failure_class}\` fallback=\`${row.s2_fallback_reason || 'NONE'}\` delta_vs_s1=\`${row.quality_delta_vs_s1}\``,
      );
    }
  }

  lines.push('', '## Inputs', '');
  lines.push(`- dataset: \`${summary.inputs?.dataset || 'unknown'}\``);
  lines.push(`- manifest: \`${summary.inputs?.manifest || 'unknown'}\``);
  lines.push(`- corpus_coverage_summary: \`${summary.inputs?.corpus_coverage_summary || 'unknown'}\``);
  lines.push('');

  return `${lines.join('\n')}\n`;
}
