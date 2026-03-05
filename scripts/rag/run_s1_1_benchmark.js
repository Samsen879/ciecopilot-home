#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { executeAskAI } from '../../api/rag/lib/ask-service.js';
import { toRagErrorAudit } from '../../api/rag/lib/errors.js';
import { S1_METRIC_THRESHOLDS } from '../../api/rag/lib/constants.js';

dotenv.config();

const ROOT = process.cwd();
const DATASET_FILE = path.join(ROOT, 'data', 'eval', 'rag_s1_1_broader_qa_v1.json');
const MANIFEST_FILE = path.join(ROOT, 'data', 'eval', 'rag_s1_1_broader_qa_v1_manifest.json');
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_s1_1_benchmark_summary.json');
const OUT_MD = path.join(ROOT, 'docs', 'reports', 'rag_s1_1_benchmark.md');
const FAIL_ON_THRESHOLD = String(process.env.RAG_S1_1_FAIL_ON_THRESHOLD || 'false').toLowerCase() === 'true';

const S1_1_ADVISORY_THRESHOLDS = Object.freeze({
  topic_leakage_rate_max: S1_METRIC_THRESHOLDS.topic_leakage_rate_max,
  answer_quality_score_min: 0.7,
  grounded_case_pass_rate_min: 0.6,
  guard_contract_pass_rate_min: 0.5,
  overall_case_pass_rate_min: 0.55,
  answer_keyword_hit_rate_min: 0.72,
  evidence_traceability_rate_min: S1_METRIC_THRESHOLDS.evidence_traceability_rate_min,
  latency_p95_ms_max: 4500,
  cost_avg_usd_per_req_max: S1_METRIC_THRESHOLDS.cost_avg_usd_per_req_max,
});

function p95(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(Math.ceil(sorted.length * 0.95) - 1, 0);
  return sorted[idx];
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ')
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function f1Audit(prediction, reference) {
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

function keywordAudit(answer, expectedKeywords) {
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

function isSourceRefResolvable(sourceRef) {
  if (!sourceRef || typeof sourceRef !== 'object') return false;
  if (!sourceRef.asset_id || typeof sourceRef.asset_id !== 'string') return false;
  const hasPageNo = Number.isInteger(sourceRef.page_no) && sourceRef.page_no > 0;
  const hasQuestionId = typeof sourceRef.question_id === 'string' && sourceRef.question_id.trim().length > 0;
  return hasPageNo || hasQuestionId;
}

function buildBreakdown(rows, key) {
  const grouped = rows.reduce((acc, row) => {
    const bucket = String(row[key] || 'unknown');
    acc[bucket] ||= [];
    acc[bucket].push(row);
    return acc;
  }, {});

  return Object.fromEntries(
    Object.entries(grouped).map(([bucket, bucketRows]) => [
      bucket,
      {
        total_requests: bucketRows.length,
        answer_quality_score: Number(
          (bucketRows.reduce((sum, row) => sum + row.answer_quality_score, 0) / bucketRows.length).toFixed(6),
        ),
        keyword_hit_rate: Number(
          (bucketRows.reduce((sum, row) => sum + row.answer_keyword_hit_rate, 0) / bucketRows.length).toFixed(6),
        ),
        case_pass_rate: Number((bucketRows.filter((row) => row.case_pass).length / bucketRows.length).toFixed(6)),
        uncertain_rate: Number((bucketRows.filter((row) => row.uncertain).length / bucketRows.length).toFixed(6)),
      },
    ]),
  );
}

function renderBreakdownTable(title, breakdown) {
  const lines = [
    `## ${title}`,
    '',
    '| Bucket | Requests | Answer Quality | Keyword Hit Rate | Case Pass Rate | Uncertain Rate |',
    '|---|---:|---:|---:|---:|---:|',
  ];
  for (const [bucket, metrics] of Object.entries(breakdown)) {
    lines.push(
      `| ${bucket} | ${metrics.total_requests} | ${metrics.answer_quality_score.toFixed(3)} | ${(
        metrics.keyword_hit_rate * 100
      ).toFixed(1)}% | ${(metrics.case_pass_rate * 100).toFixed(1)}% | ${(metrics.uncertain_rate * 100).toFixed(
        1,
      )}% |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

function renderReport(summary) {
  const misses = summary.rows
    .filter((row) => !row.case_pass)
    .sort((a, b) => a.answer_quality_score - b.answer_quality_score)
    .slice(0, 8);

  const lines = [
    '# RAG S1.1 Broader QA Benchmark',
    '',
    `- Generated at: \`${summary.generated_at}\``,
    `- Status: \`${summary.status}\``,
    `- Dataset: \`${summary.dataset}\``,
    `- Manifest: \`${summary.manifest}\``,
    `- Benchmark profile: \`${summary.benchmark_profile}\``,
    `- Gate mode: \`${summary.gate_mode}\``,
    `- Total requests: \`${summary.total_requests}\``,
    '',
    '## Separation From RAG S1 Smoke Gate',
    '',
    '- Required S1 smoke gate stays on `title_lookup_boundary_smoke_v1` and `node scripts/rag/run_s1_metric_gate.js`.',
    '- This S1.1 benchmark uses a static broader-QA dataset and never changes the default retrieval strategy.',
    '- Workflow is advisory and non-blocking by default.',
    '',
    '## Advisory Thresholds',
    '',
    `- topic_leakage_rate <= \`${summary.thresholds.topic_leakage_rate_max}\``,
    `- answer_quality_score >= \`${summary.thresholds.answer_quality_score_min}\``,
    `- grounded_case_pass_rate >= \`${summary.thresholds.grounded_case_pass_rate_min}\``,
    `- guard_contract_pass_rate >= \`${summary.thresholds.guard_contract_pass_rate_min}\``,
    `- overall_case_pass_rate >= \`${summary.thresholds.overall_case_pass_rate_min}\``,
    `- answer_keyword_hit_rate >= \`${summary.thresholds.answer_keyword_hit_rate_min}\``,
    `- evidence_traceability_rate >= \`${summary.thresholds.evidence_traceability_rate_min}\``,
    `- latency_p95_ms <= \`${summary.thresholds.latency_p95_ms_max}\``,
    `- cost_avg_usd_per_req <= \`${summary.thresholds.cost_avg_usd_per_req_max}\``,
    '',
    '## Metrics',
    '',
    `- topic_leakage_rate: \`${(summary.metrics.topic_leakage_rate * 100).toFixed(2)}%\``,
    `- answer_quality_score: \`${summary.metrics.answer_quality_score.toFixed(4)}\``,
    `- answer_reference_f1: \`${summary.metrics.answer_reference_f1.toFixed(4)}\``,
    `- answer_keyword_hit_rate: \`${(summary.metrics.answer_keyword_hit_rate * 100).toFixed(2)}%\``,
    `- grounded_case_pass_rate: \`${(summary.metrics.grounded_case_pass_rate * 100).toFixed(2)}%\``,
    `- guard_contract_pass_rate: \`${(summary.metrics.guard_contract_pass_rate * 100).toFixed(2)}%\``,
    `- overall_case_pass_rate: \`${(summary.metrics.overall_case_pass_rate * 100).toFixed(2)}%\``,
    `- evidence_traceability_rate: \`${(summary.metrics.evidence_traceability_rate * 100).toFixed(2)}%\``,
    `- uncertain_rate: \`${(summary.metrics.uncertain_rate * 100).toFixed(2)}%\``,
    `- latency_p95_ms: \`${summary.metrics.latency_p95_ms.toFixed(2)}\``,
    `- cost_avg_usd_per_req: \`${summary.metrics.cost_avg_usd_per_req.toFixed(6)}\``,
    '',
    '## Threshold Checks',
    '',
    `- leakage: ${summary.threshold_checks.topic_leakage_rate ? 'PASS' : 'FAIL'}`,
    `- answer_quality: ${summary.threshold_checks.answer_quality_score ? 'PASS' : 'FAIL'}`,
    `- grounded_case_pass_rate: ${summary.threshold_checks.grounded_case_pass_rate ? 'PASS' : 'FAIL'}`,
    `- guard_contract_pass_rate: ${summary.threshold_checks.guard_contract_pass_rate ? 'PASS' : 'FAIL'}`,
    `- overall_case_pass_rate: ${summary.threshold_checks.overall_case_pass_rate ? 'PASS' : 'FAIL'}`,
    `- keyword_hit_rate: ${summary.threshold_checks.answer_keyword_hit_rate ? 'PASS' : 'FAIL'}`,
    `- traceability: ${summary.threshold_checks.evidence_traceability_rate ? 'PASS' : 'FAIL'}`,
    `- latency_p95: ${summary.threshold_checks.latency_p95_ms ? 'PASS' : 'FAIL'}`,
    `- cost_avg: ${summary.threshold_checks.cost_avg_usd_per_req ? 'PASS' : 'FAIL'}`,
    '',
    renderBreakdownTable('Query Style Breakdown', summary.query_style_breakdown).trimEnd(),
    '',
    renderBreakdownTable('Difficulty Breakdown', summary.difficulty_breakdown).trimEnd(),
    '',
    renderBreakdownTable('Topic Family Breakdown', summary.topic_family_breakdown).trimEnd(),
    '',
    renderBreakdownTable('Scenario Type Breakdown', summary.scenario_type_breakdown).trimEnd(),
    '',
    '## Lowest-Scoring Cases',
    '',
  ];

  if (misses.length === 0) {
    lines.push('- None');
  } else {
    for (const row of misses) {
      lines.push(
        `- \`${row.case_id}\` \`${row.query_style}\` \`${row.current_topic_path}\` score=\`${row.answer_quality_score.toFixed(
          3,
        )}\` hit_rate=\`${(row.answer_keyword_hit_rate * 100).toFixed(1)}%\` uncertain=\`${row.uncertain}\``,
      );
    }
  }

  lines.push(
    '',
    '## Repro',
    '',
    '```bash',
    'node scripts/rag/build_s1_1_broader_qa_set.js',
    'node scripts/rag/run_s1_1_benchmark.js',
    '```',
    '',
  );
  return lines.join('\n');
}

async function main() {
  if (!fs.existsSync(DATASET_FILE)) {
    throw new Error(`Dataset not found: ${DATASET_FILE}`);
  }

  const dataset = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf8'));
  const manifest = fs.existsSync(MANIFEST_FILE) ? JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8')) : null;
  if (!Array.isArray(dataset) || dataset.length < 80) {
    throw new Error('rag_s1_1_broader_qa_v1.json must contain at least 80 cases');
  }

  const rows = [];
  for (const item of dataset) {
    const started = Date.now();
    let response;
    let error = null;
    try {
      response = await executeAskAI(
        {
          query: item.query,
          syllabus_node_id: item.syllabus_node_id,
          subject_code: item.subject_code || null,
          internal_debug: false,
        },
        {
          req: {
            request_id: `bench-${item.case_id}`,
            auth_user: null,
          },
          logger: () => {},
        },
      );
    } catch (err) {
      error = err;
      const errorAudit = toRagErrorAudit(err, { stage: 'execution' });
      response = {
        answer: '',
        uncertain: true,
        uncertain_reason_code: 'RETRIEVER_ERROR',
        topic_leakage_flag: false,
        topic_leakage_reason: null,
        evidence: [],
        metrics: {
          cost_avg_usd_per_req: 0,
          retrieval_audit: {
            query_mode: 'execution_error',
            short_circuit_label: null,
            rpc_call_count: 0,
            hybrid_row_count: 0,
            dense_row_count: 0,
            lexical_row_count: 0,
            ...errorAudit,
          },
          latency_ms: Date.now() - started,
        },
      };
    }

    const referenceAudit = f1Audit(response.answer, item.reference_answer || '');
    const keywordMetrics = keywordAudit(response.answer, item.expected_answer_keywords || []);
    const evidence = Array.isArray(response.evidence) ? response.evidence : [];
    const resolvableEvidenceCount = evidence.filter((entry) => isSourceRefResolvable(entry.source_ref)).length;
    const unresolvableEvidenceCount = Math.max(evidence.length - resolvableEvidenceCount, 0);
    const answerQualityScore = Math.max(referenceAudit.f1, keywordMetrics.hit_rate);
    const minAnswerScore = Number(item.min_answer_score || 0.6);
    const costAudit = response?.metrics?.cost_audit || null;
    const retrievalAudit = response?.metrics?.retrieval_audit || null;
    const expectedBehavior = item.expected_behavior || 'grounded_answer';
    const expectedUncertainReasonCode = item.expected_uncertain_reason_code || null;
    const contractFailureReasons = [];

    if (expectedBehavior === 'grounded_answer') {
      if (response.uncertain) {
        contractFailureReasons.push('unexpected_uncertain');
      }
      if (answerQualityScore < minAnswerScore) {
        contractFailureReasons.push('answer_quality_below_threshold');
      }
    } else if (expectedBehavior === 'uncertain') {
      if (!response.uncertain) {
        contractFailureReasons.push('unexpected_grounded_answer');
      }
      if (
        expectedUncertainReasonCode &&
        response.uncertain_reason_code !== expectedUncertainReasonCode
      ) {
        contractFailureReasons.push('unexpected_uncertain_reason');
      }
    }

    rows.push({
      case_id: item.case_id,
      syllabus_node_id: item.syllabus_node_id,
      current_topic_path: item.current_topic_path,
      subject_code: item.subject_code,
      difficulty: item.difficulty,
      query_style: item.query_style,
      scenario_type: item.scenario_type || 'unknown',
      expected_behavior: expectedBehavior,
      expected_uncertain_reason_code: expectedUncertainReasonCode,
      topic_family: item.topic_family,
      query: item.query,
      reference_answer: item.reference_answer,
      expected_answer_keywords: item.expected_answer_keywords,
      answer: response.answer,
      uncertain: response.uncertain,
      uncertain_reason_code: response.uncertain_reason_code,
      topic_leakage_flag: response.topic_leakage_flag,
      topic_leakage_reason: response.topic_leakage_reason,
      answer_reference_f1: Number(referenceAudit.f1.toFixed(6)),
      answer_keyword_hit_rate: keywordMetrics.hit_rate,
      matched_keywords: keywordMetrics.matched_keywords,
      answer_quality_score: Number(answerQualityScore.toFixed(6)),
      min_answer_score: minAnswerScore,
      case_pass: contractFailureReasons.length === 0,
      contract_failure_reasons: contractFailureReasons,
      evidence_count: evidence.length,
      source_ref_resolvable_count: resolvableEvidenceCount,
      source_ref_unresolvable_count: unresolvableEvidenceCount,
      traceable: evidence.length > 0 && unresolvableEvidenceCount === 0,
      latency_ms: Number(response?.metrics?.latency_ms || Date.now() - started),
      cost_usd: Number(response?.metrics?.cost_avg_usd_per_req || 0),
      retrieval_version: response?.retrieval_version || null,
      price_table_version: costAudit?.price_table_version || null,
      cost_audit: costAudit,
      retrieval_audit: retrievalAudit,
      error_code: retrievalAudit?.error_code || error?.code || null,
      error_details: retrievalAudit?.error_details || error?.details || null,
      metadata: item.metadata || {},
      error: error ? String(error.message || error) : null,
    });
  }

  const total = rows.length;
  const leakageCount = rows.filter((row) => row.topic_leakage_flag).length;
  const errorCount = rows.filter((row) => row.error).length;
  const totalEvidenceCount = rows.reduce((sum, row) => sum + row.evidence_count, 0);
  const resolvableEvidenceCount = rows.reduce((sum, row) => sum + row.source_ref_resolvable_count, 0);
  const unresolvableEvidenceCount = rows.reduce((sum, row) => sum + row.source_ref_unresolvable_count, 0);
  const groundedRows = rows.filter((row) => row.expected_behavior === 'grounded_answer');
  const guardedRows = rows.filter((row) => row.expected_behavior === 'uncertain');
  const avgAnswerQuality = groundedRows.length
    ? groundedRows.reduce((sum, row) => sum + row.answer_quality_score, 0) / groundedRows.length
    : 0;
  const avgReferenceF1 = groundedRows.length
    ? groundedRows.reduce((sum, row) => sum + row.answer_reference_f1, 0) / groundedRows.length
    : 0;
  const avgKeywordHitRate = groundedRows.length
    ? groundedRows.reduce((sum, row) => sum + row.answer_keyword_hit_rate, 0) / groundedRows.length
    : 0;
  const overallCasePassRate = rows.filter((row) => row.case_pass).length / total;
  const groundedCasePassRate = groundedRows.length
    ? groundedRows.filter((row) => row.case_pass).length / groundedRows.length
    : 1;
  const guardContractPassRate = guardedRows.length
    ? guardedRows.filter((row) => row.case_pass).length / guardedRows.length
    : 1;
  const uncertainRate = rows.filter((row) => row.uncertain).length / total;
  const avgCost = rows.reduce((sum, row) => sum + row.cost_usd, 0) / total;
  const latencies = rows.map((row) => row.latency_ms);
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
  const retrievalModeCounts = rows.reduce((acc, row) => {
    const key = row.retrieval_audit?.query_mode || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const shortCircuitLabelCounts = rows.reduce((acc, row) => {
    const key = row.retrieval_audit?.short_circuit_label || 'NONE';
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
  const priceTableVersionCounts = rows.reduce((acc, row) => {
    const key = row.price_table_version || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const costAudit = rows.reduce(
    (acc, row) => {
      const audit = row.cost_audit || {};
      const usage = audit.usage || {};
      const calls = audit.call_counts || {};
      const componentCosts = audit.component_costs_usd || {};
      acc.prompt_tokens_total += Number(usage.prompt_tokens || 0);
      acc.completion_tokens_total += Number(usage.completion_tokens || 0);
      acc.embedding_tokens_total += Number(usage.embedding_tokens || 0);
      acc.embedding_calls_total += Number(calls.embedding_calls || 0);
      acc.chat_calls_total += Number(calls.chat_calls || 0);
      acc.rerank_calls_total += Number(calls.rerank_calls || 0);
      acc.extra_calls_total += Number(calls.extra_calls || 0);
      acc.chat_prompt_cost_usd_total += Number(componentCosts.chat_prompt || 0);
      acc.chat_completion_cost_usd_total += Number(componentCosts.chat_completion || 0);
      acc.embedding_cost_usd_total += Number(componentCosts.embedding || 0);
      acc.rerank_or_extra_calls_cost_usd_total += Number(componentCosts.rerank_or_extra_calls || 0);
      acc.cache_saving_usd_total += Number(componentCosts.cache_saving || 0);
      if (!acc.formula_version && audit.formula_version) acc.formula_version = audit.formula_version;
      return acc;
    },
    {
      formula_version: null,
      prompt_tokens_total: 0,
      completion_tokens_total: 0,
      embedding_tokens_total: 0,
      embedding_calls_total: 0,
      chat_calls_total: 0,
      rerank_calls_total: 0,
      extra_calls_total: 0,
      chat_prompt_cost_usd_total: 0,
      chat_completion_cost_usd_total: 0,
      embedding_cost_usd_total: 0,
      rerank_or_extra_calls_cost_usd_total: 0,
      cache_saving_usd_total: 0,
    },
  );

  const metrics = {
    topic_leakage_rate: Number((leakageCount / total).toFixed(6)),
    answer_quality_score: Number(avgAnswerQuality.toFixed(6)),
    answer_reference_f1: Number(avgReferenceF1.toFixed(6)),
    answer_keyword_hit_rate: Number(avgKeywordHitRate.toFixed(6)),
    grounded_case_pass_rate: Number(groundedCasePassRate.toFixed(6)),
    guard_contract_pass_rate: Number(guardContractPassRate.toFixed(6)),
    overall_case_pass_rate: Number(overallCasePassRate.toFixed(6)),
    evidence_traceability_rate: Number(
      (totalEvidenceCount === 0 ? 0 : resolvableEvidenceCount / totalEvidenceCount).toFixed(6),
    ),
    uncertain_rate: Number(uncertainRate.toFixed(6)),
    latency_p95_ms: Number(p95(latencies).toFixed(3)),
    cost_avg_usd_per_req: Number(avgCost.toFixed(6)),
  };

  const thresholdChecks = {
    topic_leakage_rate: metrics.topic_leakage_rate <= S1_1_ADVISORY_THRESHOLDS.topic_leakage_rate_max,
    answer_quality_score: metrics.answer_quality_score >= S1_1_ADVISORY_THRESHOLDS.answer_quality_score_min,
    grounded_case_pass_rate:
      metrics.grounded_case_pass_rate >= S1_1_ADVISORY_THRESHOLDS.grounded_case_pass_rate_min,
    guard_contract_pass_rate:
      metrics.guard_contract_pass_rate >= S1_1_ADVISORY_THRESHOLDS.guard_contract_pass_rate_min,
    overall_case_pass_rate:
      metrics.overall_case_pass_rate >= S1_1_ADVISORY_THRESHOLDS.overall_case_pass_rate_min,
    answer_keyword_hit_rate: metrics.answer_keyword_hit_rate >= S1_1_ADVISORY_THRESHOLDS.answer_keyword_hit_rate_min,
    evidence_traceability_rate:
      metrics.evidence_traceability_rate >= S1_1_ADVISORY_THRESHOLDS.evidence_traceability_rate_min,
    latency_p95_ms: metrics.latency_p95_ms <= S1_1_ADVISORY_THRESHOLDS.latency_p95_ms_max,
    cost_avg_usd_per_req: metrics.cost_avg_usd_per_req <= S1_1_ADVISORY_THRESHOLDS.cost_avg_usd_per_req_max,
  };

  const allThresholdsPass = Object.values(thresholdChecks).every(Boolean);
  const status = allThresholdsPass ? 'pass' : errorCount > 0 ? 'fail' : 'warn';

  const summary = {
    generated_at: new Date().toISOString(),
    dataset: path.relative(ROOT, DATASET_FILE).replace(/\\/g, '/'),
    manifest: path.relative(ROOT, MANIFEST_FILE).replace(/\\/g, '/'),
    benchmark_profile: manifest?.benchmark_profile || 'broader_qa_advisory_v1',
    benchmark_tier: manifest?.benchmark_tier || 'advisory',
    gold_label_source: manifest?.gold_label_source || 'curated curriculum_nodes title + description',
    total_requests: total,
    source_node_count: manifest?.source_node_count || null,
    thresholds: S1_1_ADVISORY_THRESHOLDS,
    metrics,
    threshold_checks: thresholdChecks,
    status,
    gate_mode: 'advisory_non_blocking',
    workflow_source: '.github/workflows/rag-s1-1-benchmark.yml',
    separation_from_s1_smoke: manifest?.separation_from_s1_smoke || null,
    dataset_manifest: manifest,
    query_style_breakdown: buildBreakdown(rows, 'query_style'),
    difficulty_breakdown: buildBreakdown(rows, 'difficulty'),
    topic_family_breakdown: buildBreakdown(rows, 'topic_family'),
    scenario_type_breakdown: buildBreakdown(rows, 'scenario_type'),
    traceability_audit: {
      metric_semantics: 'evidence-level source_ref resolvability rate',
      total_evidence_count: totalEvidenceCount,
      resolvable_evidence_count: resolvableEvidenceCount,
      unresolvable_evidence_count: unresolvableEvidenceCount,
      requests_with_unresolvable_source_ref: rows.filter((row) => row.source_ref_unresolvable_count > 0).length,
      requests_without_evidence: rows.filter((row) => row.evidence_count === 0).length,
    },
    leakage_audit: {
      metric_semantics: 'request-level leakage rate',
      leakage_request_count: leakageCount,
      reason_counts: leakageReasonCounts,
    },
    uncertain_audit: {
      error_count: errorCount,
      reason_counts: uncertainReasonCounts,
    },
    contract_audit: {
      grounded_case_count: groundedRows.length,
      guarded_case_count: guardedRows.length,
      failure_reason_counts: contractFailureReasonCounts,
    },
    retrieval_audit: {
      retrieval_version_counts: retrievalVersionCounts,
      query_mode_counts: retrievalModeCounts,
      short_circuit_label_counts: shortCircuitLabelCounts,
      rpc_call_count_total: rpcCallCountTotal,
      hybrid_row_count_total: hybridRowCountTotal,
      dense_row_count_total: denseRowCountTotal,
      lexical_row_count_total: lexicalRowCountTotal,
      error_stage_counts: errorStageCounts,
      error_code_counts: errorCodeCounts,
      upstream_db_code_counts: upstreamDbCodeCounts,
    },
    cost_audit: {
      formula_version: costAudit.formula_version || 'rag_s1_cost_v1',
      price_table_version: Object.keys(priceTableVersionCounts)[0] || 'unknown',
      price_table_version_counts: priceTableVersionCounts,
      cache_saving_usd_total: Number(costAudit.cache_saving_usd_total.toFixed(6)),
      rerank_or_extra_calls_cost_usd_total: Number(costAudit.rerank_or_extra_calls_cost_usd_total.toFixed(6)),
      token_totals: {
        prompt_tokens: costAudit.prompt_tokens_total,
        completion_tokens: costAudit.completion_tokens_total,
        embedding_tokens: costAudit.embedding_tokens_total,
      },
      call_counts: {
        embedding_calls: costAudit.embedding_calls_total,
        chat_calls: costAudit.chat_calls_total,
        rerank_calls: costAudit.rerank_calls_total,
        extra_calls: costAudit.extra_calls_total,
      },
      component_cost_totals_usd: {
        chat_prompt: Number(costAudit.chat_prompt_cost_usd_total.toFixed(6)),
        chat_completion: Number(costAudit.chat_completion_cost_usd_total.toFixed(6)),
        embedding: Number(costAudit.embedding_cost_usd_total.toFixed(6)),
        rerank_or_extra_calls: Number(costAudit.rerank_or_extra_calls_cost_usd_total.toFixed(6)),
        cache_saving: Number(costAudit.cache_saving_usd_total.toFixed(6)),
      },
    },
    recommendation: allThresholdsPass
      ? {
          decision: 'keep_advisory_monitoring',
          reason: 'All advisory thresholds are currently passing; S1 smoke gate remains unchanged.',
        }
      : {
          decision: 'investigate_before_any_gate_promotion',
          reason: 'Broader-QA coverage is advisory only and exposes quality gaps beyond the required S1 smoke gate.',
        },
    rows,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, renderReport(summary), 'utf8');

  process.stdout.write(`${OUT_JSON}\n${OUT_MD}\n`);
  if (FAIL_ON_THRESHOLD && !allThresholdsPass) process.exit(1);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
