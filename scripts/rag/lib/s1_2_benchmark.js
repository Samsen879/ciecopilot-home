import { classifyFailure, summarizeFailureClasses } from './failure-classifier.js';

export const S1_2_ADVISORY_THRESHOLDS = Object.freeze({
  topic_leakage_rate_max: 0,
  evidence_traceability_rate_min: 0.95,
  diagnostics_completeness_rate_min: 1,
});

export function p95(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(Math.ceil(sorted.length * 0.95) - 1, 0);
  return sorted[idx];
}

export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ')
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function f1Audit(prediction, reference) {
  const pred = tokenize(prediction);
  const ref = tokenize(reference);
  if (pred.length === 0 && ref.length === 0) {
    return { f1: 1, tp: 0, fp: 0, fn: 0, precision: 1, recall: 1 };
  }
  if (pred.length === 0 || ref.length === 0) {
    return {
      f1: 0,
      tp: 0,
      fp: pred.length,
      fn: ref.length,
      precision: pred.length === 0 ? 0 : 1,
      recall: ref.length === 0 ? 1 : 0,
    };
  }
  const refCount = new Map();
  for (const token of ref) refCount.set(token, (refCount.get(token) || 0) + 1);
  let overlap = 0;
  for (const token of pred) {
    const left = refCount.get(token) || 0;
    if (left > 0) {
      overlap += 1;
      refCount.set(token, left - 1);
    }
  }
  if (overlap === 0) {
    return { f1: 0, tp: 0, fp: pred.length, fn: ref.length, precision: 0, recall: 0 };
  }
  const precision = overlap / pred.length;
  const recall = overlap / ref.length;
  return {
    f1: (2 * precision * recall) / (precision + recall),
    tp: overlap,
    fp: Math.max(pred.length - overlap, 0),
    fn: Math.max(ref.length - overlap, 0),
    precision,
    recall,
  };
}

function normalizeForPhraseMatch(text) {
  return ` ${String(text || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, ' ').trim()} `;
}

export function keywordAudit(answer, expectedKeywords) {
  const keywords = Array.isArray(expectedKeywords)
    ? expectedKeywords.map((value) => String(value).trim()).filter(Boolean)
    : [];
  if (keywords.length === 0) {
    return { total_keywords: 0, hit_count: 0, hit_rate: 1, matched_keywords: [] };
  }
  const normalizedAnswer = normalizeForPhraseMatch(answer);
  const matchedKeywords = keywords.filter((keyword) => {
    const normalizedKeyword = normalizeForPhraseMatch(keyword);
    return normalizedAnswer.includes(normalizedKeyword);
  });
  return {
    total_keywords: keywords.length,
    hit_count: matchedKeywords.length,
    hit_rate: Number((matchedKeywords.length / keywords.length).toFixed(6)),
    matched_keywords: matchedKeywords,
  };
}

export function isSourceRefResolvable(sourceRef) {
  if (!sourceRef || typeof sourceRef !== 'object') return false;
  if (!sourceRef.asset_id || typeof sourceRef.asset_id !== 'string') return false;
  const hasPageNo = Number.isInteger(sourceRef.page_no) && sourceRef.page_no > 0;
  const hasQuestionId = typeof sourceRef.question_id === 'string' && sourceRef.question_id.trim().length > 0;
  return hasPageNo || hasQuestionId;
}

export function sanitizeEvidence(evidence = [], { limit = 3 } = {}) {
  return evidence.slice(0, limit).map((item) => ({
    id: item.id,
    topic_path: item.topic_path,
    snippet: String(item.snippet || '').slice(0, 180),
    score: Number(item.score || 0),
    source_type: item.source_type || 'unknown',
    source_ref: item.source_ref || null,
    rank_key: item.rank_key ?? null,
    rank_sem: item.rank_sem ?? null,
    fused_rank: item.fused_rank ?? null,
  }));
}

export function evaluateCase(item, response) {
  const evidence = Array.isArray(response.evidence) ? response.evidence : [];
  const keyword = keywordAudit(response.answer, item.expected_answer_keywords);
  const reference = f1Audit(response.answer, item.reference_answer);
  const contractFailureReasons = [];
  let casePass = false;
  let expectedBehaviorMatch = false;
  let answerQualityScore = 0;

  if (item.expected_behavior === 'uncertain') {
    expectedBehaviorMatch = Boolean(response.uncertain);
    if (!response.uncertain) {
      contractFailureReasons.push('expected_uncertain_but_answered');
    }
    if (
      item.expected_uncertain_reason_code &&
      response.uncertain_reason_code !== item.expected_uncertain_reason_code
    ) {
      contractFailureReasons.push('uncertain_reason_mismatch');
    }
    casePass = expectedBehaviorMatch && contractFailureReasons.length === 0;
    answerQualityScore = casePass ? 1 : 0;
  } else {
    expectedBehaviorMatch = !response.uncertain;
    if (response.uncertain) {
      contractFailureReasons.push('unexpected_uncertain');
    }
    if (response.topic_leakage_flag) {
      contractFailureReasons.push('topic_leakage_flagged');
    }
    if (evidence.length === 0) {
      contractFailureReasons.push('missing_evidence');
    }
    answerQualityScore = Number(((reference.f1 + keyword.hit_rate) / 2).toFixed(6));
    if (answerQualityScore < Number(item.min_answer_score || 0)) {
      contractFailureReasons.push('answer_quality_below_threshold');
    }
    casePass = contractFailureReasons.length === 0;
  }

  return {
    case_pass: casePass,
    expected_behavior_match: expectedBehaviorMatch,
    answer_quality_score: Number(answerQualityScore.toFixed(6)),
    answer_reference_f1: Number(reference.f1.toFixed(6)),
    answer_reference_audit: reference,
    answer_keyword_hit_rate: Number(keyword.hit_rate.toFixed(6)),
    answer_keyword_audit: keyword,
    contract_failure_reasons: contractFailureReasons,
  };
}

function buildBreakdown(rows, key) {
  const grouped = rows.reduce((acc, row) => {
    const bucket = String(row[key] || 'unknown');
    acc[bucket] ||= [];
    acc[bucket].push(row);
    return acc;
  }, {});

  return Object.fromEntries(
    Object.entries(grouped).map(([bucket, bucketRows]) => {
      const total = bucketRows.length || 1;
      const evidenceCount = bucketRows.reduce((sum, row) => sum + Number(row.evidence_count || 0), 0);
      const resolvableCount = bucketRows.reduce((sum, row) => sum + Number(row.resolvable_evidence_count || 0), 0);
      return [
        bucket,
        {
          total_requests: bucketRows.length,
          case_pass_rate: Number((bucketRows.filter((row) => row.case_pass).length / total).toFixed(6)),
          expected_behavior_match_rate: Number(
            (bucketRows.filter((row) => row.expected_behavior_match).length / total).toFixed(6),
          ),
          uncertain_rate: Number((bucketRows.filter((row) => row.uncertain).length / total).toFixed(6)),
          answer_quality_score: Number(
            (bucketRows.reduce((sum, row) => sum + Number(row.answer_quality_score || 0), 0) / total).toFixed(6),
          ),
          evidence_traceability_rate: Number((evidenceCount === 0 ? 1 : resolvableCount / evidenceCount).toFixed(6)),
        },
      ];
    }),
  );
}

export function summarizeS12Rows(
  rows,
  manifest,
  {
    datasetPath = 'data/eval/rag_s1_2_syllabus_qa_core_v1.json',
    manifestPath = 'data/eval/rag_s1_2_syllabus_qa_core_v1_manifest.json',
    workflowSource = '.github/workflows/rag-s1-2-benchmark.yml',
  } = {},
) {
  const total = rows.length || 1;
  const leakageCount = rows.filter((row) => row.topic_leakage_flag).length;
  const groundedRows = rows.filter((row) => row.expected_behavior === 'grounded_answer');
  const uncertainRows = rows.filter((row) => row.expected_behavior === 'uncertain');
  const evidenceCount = rows.reduce((sum, row) => sum + Number(row.evidence_count || 0), 0);
  const resolvableEvidenceCount = rows.reduce((sum, row) => sum + Number(row.resolvable_evidence_count || 0), 0);
  const latencies = rows.map((row) => Number(row.latency_ms || 0));
  const avgCost = rows.reduce((sum, row) => sum + Number(row.cost_usd || 0), 0) / total;
  const diagnosticsCompleteCount = rows.filter((row) => {
    const audit = row.retrieval_audit || {};
    return (
      Object.hasOwn(row, 'retrieval_version') &&
      Object.hasOwn(audit, 'query_mode') &&
      Object.hasOwn(audit, 'error_stage') &&
      Object.hasOwn(audit, 'error_code') &&
      Object.hasOwn(audit, 'error_details')
    );
  }).length;
  const f1Totals = rows.reduce(
    (acc, row) => {
      acc.tp += Number(row.answer_reference_audit?.tp || 0);
      acc.fp += Number(row.answer_reference_audit?.fp || 0);
      acc.fn += Number(row.answer_reference_audit?.fn || 0);
      return acc;
    },
    { tp: 0, fp: 0, fn: 0 },
  );
  const precision = f1Totals.tp + f1Totals.fp === 0 ? 1 : f1Totals.tp / (f1Totals.tp + f1Totals.fp);
  const recall = f1Totals.tp + f1Totals.fn === 0 ? 1 : f1Totals.tp / (f1Totals.tp + f1Totals.fn);
  const aggregateF1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  const metrics = {
    topic_leakage_rate: Number((leakageCount / total).toFixed(6)),
    evidence_traceability_rate: Number((evidenceCount === 0 ? 1 : resolvableEvidenceCount / evidenceCount).toFixed(6)),
    expected_behavior_match_rate: Number(
      (rows.filter((row) => row.expected_behavior_match).length / total).toFixed(6),
    ),
    grounded_case_pass_rate: Number(
      (
        (groundedRows.filter((row) => row.case_pass).length || 0) /
        (groundedRows.length || 1)
      ).toFixed(6),
    ),
    guard_contract_pass_rate: Number(
      (
        (uncertainRows.filter((row) => row.case_pass).length || 0) /
        (uncertainRows.length || 1)
      ).toFixed(6),
    ),
    overall_case_pass_rate: Number((rows.filter((row) => row.case_pass).length / total).toFixed(6)),
    answer_quality_score: Number(
      (rows.reduce((sum, row) => sum + Number(row.answer_quality_score || 0), 0) / total).toFixed(6),
    ),
    answer_reference_f1: Number(aggregateF1.toFixed(6)),
    answer_keyword_hit_rate: Number(
      (rows.reduce((sum, row) => sum + Number(row.answer_keyword_hit_rate || 0), 0) / total).toFixed(6),
    ),
    uncertain_rate: Number((rows.filter((row) => row.uncertain).length / total).toFixed(6)),
    latency_p95_ms: Number(p95(latencies).toFixed(3)),
    cost_avg_usd_per_req: Number(avgCost.toFixed(6)),
    diagnostics_completeness_rate: Number((diagnosticsCompleteCount / total).toFixed(6)),
  };

  const thresholdChecks = {
    topic_leakage_rate: metrics.topic_leakage_rate <= S1_2_ADVISORY_THRESHOLDS.topic_leakage_rate_max,
    evidence_traceability_rate:
      metrics.evidence_traceability_rate >= S1_2_ADVISORY_THRESHOLDS.evidence_traceability_rate_min,
    diagnostics_completeness_rate:
      metrics.diagnostics_completeness_rate >= S1_2_ADVISORY_THRESHOLDS.diagnostics_completeness_rate_min,
  };

  const status = Object.values(thresholdChecks).every(Boolean) ? 'pass' : 'warn';
  const uncertainReasonCounts = rows.reduce((acc, row) => {
    const key = row.uncertain_reason_code || 'NONE';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const leakageReasonCounts = rows.reduce((acc, row) => {
    const key = row.topic_leakage_reason || 'NONE';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const contractFailureReasonCounts = rows.reduce((acc, row) => {
    for (const reason of row.contract_failure_reasons || []) {
      acc[reason] = (acc[reason] || 0) + 1;
    }
    return acc;
  }, {});
  const retrievalVersionCounts = rows.reduce((acc, row) => {
    const key = row.retrieval_version || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const queryModeCounts = rows.reduce((acc, row) => {
    const key = row.retrieval_audit?.query_mode || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const errorStageCounts = rows.reduce((acc, row) => {
    const key = row.retrieval_audit?.error_stage || 'NONE';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const errorCodeCounts = rows.reduce((acc, row) => {
    const key = row.error_code || 'NONE';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const upstreamDbCodeCounts = rows.reduce((acc, row) => {
    const key = row.error_details?.db_code || 'NONE';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const rpcCallCountTotal = rows.reduce((sum, row) => sum + Number(row.retrieval_audit?.rpc_call_count || 0), 0);
  const hybridRowCountTotal = rows.reduce((sum, row) => sum + Number(row.retrieval_audit?.hybrid_row_count || 0), 0);
  const denseRowCountTotal = rows.reduce((sum, row) => sum + Number(row.retrieval_audit?.dense_row_count || 0), 0);
  const lexicalRowCountTotal = rows.reduce((sum, row) => sum + Number(row.retrieval_audit?.lexical_row_count || 0), 0);

  return {
    generated_at: new Date().toISOString(),
    dataset: datasetPath,
    manifest: manifestPath,
    benchmark_profile: manifest?.benchmark_profile || 'syllabus_qa_core_v1',
    benchmark_tier: manifest?.benchmark_tier || 'advisory',
    gold_label_source: manifest?.gold_label_source || 'unknown',
    total_requests: rows.length,
    source_node_count: manifest?.source_node_count || null,
    thresholds: S1_2_ADVISORY_THRESHOLDS,
    metrics,
    threshold_checks: thresholdChecks,
    status,
    gate_mode: 'advisory_non_blocking',
    workflow_source: workflowSource,
    dataset_manifest: manifest || null,
    query_family_breakdown: buildBreakdown(rows, 'query_family'),
    risk_family_breakdown: buildBreakdown(rows, 'risk_family'),
    expected_behavior_breakdown: buildBreakdown(rows, 'expected_behavior'),
    failure_class_breakdown: summarizeFailureClasses(rows),
    traceability_audit: {
      metric_semantics: 'evidence-level source_ref resolvability rate',
      total_evidence_count: evidenceCount,
      resolvable_evidence_count: resolvableEvidenceCount,
      unresolvable_evidence_count: Math.max(evidenceCount - resolvableEvidenceCount, 0),
      requests_with_unresolvable_source_ref: rows.filter((row) => row.source_ref_unresolvable_count > 0).length,
      requests_without_evidence: rows.filter((row) => row.evidence_count === 0).length,
    },
    leakage_audit: {
      metric_semantics: 'request-level leakage rate',
      leakage_request_count: leakageCount,
      reason_counts: leakageReasonCounts,
    },
    uncertain_audit: {
      reason_counts: uncertainReasonCounts,
    },
    contract_audit: {
      grounded_case_count: groundedRows.length,
      uncertain_case_count: uncertainRows.length,
      failure_reason_counts: contractFailureReasonCounts,
    },
    retrieval_audit: {
      retrieval_version_counts: retrievalVersionCounts,
      query_mode_counts: queryModeCounts,
      rpc_call_count_total: rpcCallCountTotal,
      hybrid_row_count_total: hybridRowCountTotal,
      dense_row_count_total: denseRowCountTotal,
      lexical_row_count_total: lexicalRowCountTotal,
      error_stage_counts: errorStageCounts,
      error_code_counts: errorCodeCounts,
      upstream_db_code_counts: upstreamDbCodeCounts,
    },
    f1_audit: {
      tp: f1Totals.tp,
      fp: f1Totals.fp,
      fn: f1Totals.fn,
      precision: Number(precision.toFixed(6)),
      recall: Number(recall.toFixed(6)),
      f1: Number(aggregateF1.toFixed(6)),
    },
    rows,
  };
}

function renderBreakdownTable(title, breakdown) {
  const lines = [
    `## ${title}`,
    '',
    '| Bucket | Requests | Case Pass Rate | Expected Behavior Match | Uncertain Rate | Traceability | Answer Quality |',
    '|---|---:|---:|---:|---:|---:|---:|',
  ];

  for (const [bucket, metrics] of Object.entries(breakdown)) {
    lines.push(
      `| ${bucket} | ${metrics.total_requests} | ${(metrics.case_pass_rate * 100).toFixed(1)}% | ${(
        metrics.expected_behavior_match_rate * 100
      ).toFixed(1)}% | ${(metrics.uncertain_rate * 100).toFixed(1)}% | ${(
        metrics.evidence_traceability_rate * 100
      ).toFixed(1)}% | ${metrics.answer_quality_score.toFixed(3)} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

export function renderS12BenchmarkReport(summary) {
  const failures = summary.rows.filter((row) => !row.case_pass);
  const topFailures = failures
    .slice()
    .sort((a, b) => Number(a.answer_quality_score || 0) - Number(b.answer_quality_score || 0))
    .slice(0, 10);

  const lines = [
    '# RAG S1.2 Coverage And Diagnostics Benchmark',
    '',
    `- Generated at: \`${summary.generated_at}\``,
    `- Status: \`${summary.status}\``,
    `- Dataset: \`${summary.dataset}\``,
    `- Manifest: \`${summary.manifest}\``,
    `- Benchmark profile: \`${summary.benchmark_profile}\``,
    `- Gate mode: \`${summary.gate_mode}\``,
    `- Total requests: \`${summary.total_requests}\``,
    '',
    '## Scope Guard',
    '',
    '- `S1.2` is advisory only and does not modify `RAG S1` required gates.',
    '- Current production default remains `b_simplified_retrieval_s1_v1`.',
    '- `S1.2` evidence does not automatically trigger `S2` or GraphRAG work.',
    '',
    '## Advisory Hard Requirements',
    '',
    `- topic_leakage_rate = \`${summary.thresholds.topic_leakage_rate_max}\``,
    `- evidence_traceability_rate >= \`${summary.thresholds.evidence_traceability_rate_min}\``,
    `- diagnostics_completeness_rate >= \`${summary.thresholds.diagnostics_completeness_rate_min}\``,
    '',
    '## Metrics',
    '',
    `- topic_leakage_rate: \`${(summary.metrics.topic_leakage_rate * 100).toFixed(2)}%\``,
    `- evidence_traceability_rate: \`${(summary.metrics.evidence_traceability_rate * 100).toFixed(2)}%\``,
    `- expected_behavior_match_rate: \`${(summary.metrics.expected_behavior_match_rate * 100).toFixed(2)}%\``,
    `- grounded_case_pass_rate: \`${(summary.metrics.grounded_case_pass_rate * 100).toFixed(2)}%\``,
    `- guard_contract_pass_rate: \`${(summary.metrics.guard_contract_pass_rate * 100).toFixed(2)}%\``,
    `- overall_case_pass_rate: \`${(summary.metrics.overall_case_pass_rate * 100).toFixed(2)}%\``,
    `- answer_quality_score: \`${summary.metrics.answer_quality_score.toFixed(4)}\``,
    `- answer_reference_f1: \`${summary.metrics.answer_reference_f1.toFixed(4)}\``,
    `- answer_keyword_hit_rate: \`${(summary.metrics.answer_keyword_hit_rate * 100).toFixed(2)}%\``,
    `- uncertain_rate: \`${(summary.metrics.uncertain_rate * 100).toFixed(2)}%\``,
    `- latency_p95_ms: \`${summary.metrics.latency_p95_ms.toFixed(2)}\``,
    `- cost_avg_usd_per_req: \`${summary.metrics.cost_avg_usd_per_req.toFixed(6)}\``,
    '',
    '## Threshold Checks',
    '',
    `- topic_leakage_rate: ${summary.threshold_checks.topic_leakage_rate ? 'PASS' : 'FAIL'}`,
    `- evidence_traceability_rate: ${summary.threshold_checks.evidence_traceability_rate ? 'PASS' : 'FAIL'}`,
    `- diagnostics_completeness_rate: ${summary.threshold_checks.diagnostics_completeness_rate ? 'PASS' : 'FAIL'}`,
    '',
    renderBreakdownTable('Query Family Breakdown', summary.query_family_breakdown).trimEnd(),
    '',
    renderBreakdownTable('Risk Family Breakdown', summary.risk_family_breakdown).trimEnd(),
    '',
    renderBreakdownTable('Expected Behavior Breakdown', summary.expected_behavior_breakdown).trimEnd(),
    '',
    '## Failure Class Breakdown',
    '',
  ];

  for (const [failureClass, count] of Object.entries(summary.failure_class_breakdown)) {
    lines.push(`- \`${failureClass}\`: \`${count}\``);
  }

  lines.push('', '## Top Failing Cases', '');

  if (topFailures.length === 0) {
    lines.push('- None');
  } else {
    for (const row of topFailures) {
      lines.push(
        `- \`${row.case_id}\` \`${row.query_family}\` \`${row.failure_class}\` score=\`${Number(
          row.answer_quality_score || 0,
        ).toFixed(3)}\` uncertain=\`${row.uncertain}\` error=\`${row.error_code || 'NONE'}\``,
      );
    }
  }

  lines.push(
    '',
    '## Decision Guard',
    '',
    '- This report is diagnostic evidence only.',
    '- Any `S2` move still requires benchmark + corpus audit joint evidence and a separate decision report.',
    '',
    '## Repro',
    '',
    '```bash',
    'node scripts/rag/build_s1_2_syllabus_qa_core_set.js',
    'node scripts/rag/run_s1_2_preflight.js',
    'node scripts/rag/run_s1_2_benchmark.js',
    '```',
    '',
  );

  return lines.join('\n');
}
