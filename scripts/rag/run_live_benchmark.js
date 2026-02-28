#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { executeAskAI } from '../../api/rag/lib/ask-service.js';
import { S1_METRIC_THRESHOLDS } from '../../api/rag/lib/constants.js';

dotenv.config();

const ROOT = process.cwd();
const DATASET_FILE = path.join(ROOT, 'data', 'eval', 'rag_live_set_v1.json');
const MANIFEST_FILE = path.join(ROOT, 'data', 'eval', 'rag_live_set_v1_manifest.json');
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_live_benchmark_latest.json');
const OUT_MD = path.join(ROOT, 'docs', 'reports', 'rag_live_benchmark_latest.md');

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
    .map((x) => x.trim())
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
  for (const t of ref) refCount.set(t, (refCount.get(t) || 0) + 1);
  let overlap = 0;
  for (const t of pred) {
    const left = refCount.get(t) || 0;
    if (left > 0) {
      overlap += 1;
      refCount.set(t, left - 1);
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

function isSourceRefResolvable(sourceRef) {
  if (!sourceRef || typeof sourceRef !== 'object') return false;
  if (!sourceRef.asset_id || typeof sourceRef.asset_id !== 'string') return false;
  const hasPageNo = Number.isInteger(sourceRef.page_no) && sourceRef.page_no > 0;
  const hasQuestionId = typeof sourceRef.question_id === 'string' && sourceRef.question_id.trim().length > 0;
  return hasPageNo || hasQuestionId;
}

function renderReport(summary) {
  const lines = [
    '# RAG Live Benchmark (S1)',
    '',
    `- Generated at: \`${summary.generated_at}\``,
    `- Dataset: \`${summary.dataset}\``,
    `- Benchmark profile: \`${summary.benchmark_profile || 'unknown'}\``,
    `- Total requests: \`${summary.total_requests}\``,
    '',
    '## Metrics',
    '',
    `- topic_leakage_rate: \`${(summary.metrics.topic_leakage_rate * 100).toFixed(2)}%\``,
    `- answer_correctness_f1: \`${summary.metrics.answer_correctness_f1.toFixed(4)}\``,
    `- evidence_traceability_rate: \`${(summary.metrics.evidence_traceability_rate * 100).toFixed(2)}%\``,
    `- latency_p95_ms: \`${summary.metrics.latency_p95_ms.toFixed(2)}\``,
    `- cost_avg_usd_per_req: \`${summary.metrics.cost_avg_usd_per_req.toFixed(6)}\``,
    `- price_table_version: \`${summary.cost_audit.price_table_version}\``,
    `- retrieval_versions: \`${Object.keys(summary.retrieval_audit.retrieval_version_counts || {}).join(', ')}\``,
    '',
    '## Threshold Checks',
    '',
    `- leakage: ${summary.threshold_checks.topic_leakage_rate ? 'PASS' : 'FAIL'}`,
    `- correctness_f1: ${summary.threshold_checks.answer_correctness_f1 ? 'PASS' : 'FAIL'}`,
    `- traceability: ${summary.threshold_checks.evidence_traceability_rate ? 'PASS' : 'FAIL'}`,
    `- latency_p95: ${summary.threshold_checks.latency_p95_ms ? 'PASS' : 'FAIL'}`,
    `- cost_avg: ${summary.threshold_checks.cost_avg_usd_per_req ? 'PASS' : 'FAIL'}`,
    '',
    `## Final Status: ${summary.status.toUpperCase()}`,
    '',
    '## Audit Highlights',
    '',
    `- F1 token totals: tp=\`${summary.f1_audit.tp_tokens_total}\`, fp=\`${summary.f1_audit.fp_tokens_total}\`, fn=\`${summary.f1_audit.fn_tokens_total}\``,
    `- Traceability: resolvable=\`${summary.traceability_audit.resolvable_evidence_count}\`, unresolvable=\`${summary.traceability_audit.unresolvable_evidence_count}\``,
    `- Leakage reasons: \`${JSON.stringify(summary.leakage_audit.reason_counts)}\``,
    `- Cache saving USD total: \`${summary.cost_audit.cache_saving_usd_total.toFixed(6)}\``,
    '',
    '## Repro',
    '',
    '```bash',
    'node scripts/rag/build_live_benchmark_set.js',
    'node scripts/rag/run_live_benchmark.js',
    '```',
    '',
  ];
  return lines.join('\n');
}

async function main() {
  if (!fs.existsSync(DATASET_FILE)) {
    throw new Error(`Dataset not found: ${DATASET_FILE}`);
  }
  const dataset = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf8'));
  const manifest = fs.existsSync(MANIFEST_FILE)
    ? JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'))
    : null;
  if (!Array.isArray(dataset) || dataset.length < 64) {
    throw new Error('rag_live_set_v1.json must contain at least 64 cases');
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
      response = {
        answer: '',
        uncertain: true,
        uncertain_reason_code: 'RETRIEVER_ERROR',
        topic_leakage_flag: false,
        topic_leakage_reason: null,
        evidence: [],
        metrics: {
          cost_avg_usd_per_req: 0,
          latency_ms: Date.now() - started,
        },
      };
    }

    const answerF1 = f1Audit(response.answer, item.reference_answer || '');
    const evidence = Array.isArray(response.evidence) ? response.evidence : [];
    const sourceRefResolvableCount = evidence.filter((e) => isSourceRefResolvable(e.source_ref)).length;
    const sourceRefUnresolvableCount = Math.max(evidence.length - sourceRefResolvableCount, 0);
    const costAudit = response?.metrics?.cost_audit || null;

    rows.push({
      case_id: item.case_id,
      syllabus_node_id: item.syllabus_node_id,
      current_topic_path: item.current_topic_path,
      query: item.query,
      reference_answer: item.reference_answer,
      answer: response.answer,
      uncertain: response.uncertain,
      uncertain_reason_code: response.uncertain_reason_code,
      topic_leakage_flag: response.topic_leakage_flag,
      topic_leakage_reason: response.topic_leakage_reason,
      answer_f1: Number(answerF1.f1.toFixed(6)),
      answer_f1_tp: answerF1.tp,
      answer_f1_fp: answerF1.fp,
      answer_f1_fn: answerF1.fn,
      evidence_count: evidence.length,
      source_ref_resolvable_count: sourceRefResolvableCount,
      source_ref_unresolvable_count: sourceRefUnresolvableCount,
      traceable: evidence.length > 0 && sourceRefUnresolvableCount === 0,
      latency_ms: Number(response?.metrics?.latency_ms || Date.now() - started),
      cost_usd: Number(response?.metrics?.cost_avg_usd_per_req || 0),
      retrieval_version: response?.retrieval_version || null,
      price_table_version: costAudit?.price_table_version || null,
      cache_saving_usd: Number(costAudit?.component_costs_usd?.cache_saving || 0),
      cost_audit: costAudit,
      error: error ? String(error.message || error) : null,
    });
  }

  const total = rows.length;
  const leakageCount = rows.filter((r) => r.topic_leakage_flag).length;
  const traceableEvidenceCount = rows.reduce((sum, r) => sum + r.source_ref_resolvable_count, 0);
  const totalEvidenceCount = rows.reduce((sum, r) => sum + r.evidence_count, 0);
  const unresolvableEvidenceCount = rows.reduce((sum, r) => sum + r.source_ref_unresolvable_count, 0);
  const avgF1 = rows.reduce((sum, r) => sum + r.answer_f1, 0) / total;
  const avgCost = rows.reduce((sum, r) => sum + r.cost_usd, 0) / total;
  const latencies = rows.map((r) => r.latency_ms);
  const tpTokensTotal = rows.reduce((sum, r) => sum + r.answer_f1_tp, 0);
  const fpTokensTotal = rows.reduce((sum, r) => sum + r.answer_f1_fp, 0);
  const fnTokensTotal = rows.reduce((sum, r) => sum + r.answer_f1_fn, 0);
  const leakageReasonCounts = rows.reduce((acc, row) => {
    const key = row.topic_leakage_reason || 'NONE';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const uncertainReasonCounts = rows.reduce((acc, row) => {
    const key = row.uncertain_reason_code || 'NONE';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const retrievalVersionCounts = rows.reduce((acc, row) => {
    const key = row.retrieval_version || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
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
    answer_correctness_f1: Number(avgF1.toFixed(6)),
    evidence_traceability_rate: Number(
      (totalEvidenceCount === 0 ? 0 : traceableEvidenceCount / totalEvidenceCount).toFixed(6),
    ),
    latency_p95_ms: Number(p95(latencies).toFixed(3)),
    cost_avg_usd_per_req: Number(avgCost.toFixed(6)),
  };

  const thresholdChecks = {
    topic_leakage_rate: metrics.topic_leakage_rate < S1_METRIC_THRESHOLDS.topic_leakage_rate_max,
    answer_correctness_f1: metrics.answer_correctness_f1 >= S1_METRIC_THRESHOLDS.answer_correctness_f1_min,
    evidence_traceability_rate:
      metrics.evidence_traceability_rate >= S1_METRIC_THRESHOLDS.evidence_traceability_rate_min,
    latency_p95_ms: metrics.latency_p95_ms <= S1_METRIC_THRESHOLDS.latency_p95_ms_max,
    cost_avg_usd_per_req: metrics.cost_avg_usd_per_req <= S1_METRIC_THRESHOLDS.cost_avg_usd_per_req_max,
  };

  const status = Object.values(thresholdChecks).every(Boolean) ? 'pass' : 'fail';
  const summary = {
    generated_at: new Date().toISOString(),
    dataset: path.relative(ROOT, DATASET_FILE).replace(/\\/g, '/'),
    benchmark_profile: manifest?.benchmark_profile || 'title_lookup_boundary_smoke_v1',
    gold_label_source: manifest?.gold_label_source || 'curriculum_nodes.title',
    total_requests: total,
    thresholds: S1_METRIC_THRESHOLDS,
    metrics,
    threshold_checks: thresholdChecks,
    status,
    dataset_manifest: manifest,
    strata: manifest?.strata || null,
    f1_audit: {
      metric_semantics: 'macro average of per-request token F1',
      tp_tokens_total: tpTokensTotal,
      fp_tokens_total: fpTokensTotal,
      fn_tokens_total: fnTokensTotal,
    },
    traceability_audit: {
      metric_semantics: 'evidence-level source_ref resolvability rate',
      total_evidence_count: totalEvidenceCount,
      resolvable_evidence_count: traceableEvidenceCount,
      unresolvable_evidence_count: unresolvableEvidenceCount,
      requests_with_unresolvable_source_ref: rows.filter((r) => r.source_ref_unresolvable_count > 0).length,
      requests_without_evidence: rows.filter((r) => r.evidence_count === 0).length,
    },
    leakage_audit: {
      metric_semantics: 'request-level leakage rate',
      leakage_request_count: leakageCount,
      reason_counts: leakageReasonCounts,
    },
    uncertain_audit: {
      reason_counts: uncertainReasonCounts,
    },
    retrieval_audit: {
      retrieval_version_counts: retrievalVersionCounts,
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
    rows,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, renderReport(summary), 'utf8');

  process.stdout.write(`${OUT_JSON}\n${OUT_MD}\n`);
  if (status !== 'pass') process.exit(1);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
