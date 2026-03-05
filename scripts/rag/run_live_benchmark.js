#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { executeAskAI } from '../../api/rag/lib/ask-service.js';
import { S1_METRIC_THRESHOLDS } from '../../api/rag/lib/constants.js';

dotenv.config();

const ROOT = process.cwd();
const DATASET_FILE = path.join(ROOT, 'data', 'eval', 'rag_live_set_v1.json');
const MANIFEST_FILE = path.join(ROOT, 'data', 'eval', 'rag_live_set_v1_manifest.json');
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_live_benchmark_latest.json');
const OUT_MD = path.join(ROOT, 'docs', 'reports', 'rag_live_benchmark_latest.md');
const FAILURES_JSONL = path.join(ROOT, 'runs', 'backend', 'rag_live_benchmark_failures.jsonl');
const STABILITY_FILE = path.join(ROOT, 'runs', 'backend', 'rag_live_benchmark_stability.json');
const METRIC_GATE_SUMMARY_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s1_metric_gate_summary.json');
const WORKFLOW_FILE = path.join(ROOT, '.github', 'workflows', 'rag-s1-metric-gate.yml');

function parseCliArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token.startsWith('--')) {
      const eq = token.indexOf('=');
      if (eq !== -1) {
        const key = token.slice(2, eq);
        const value = token.slice(eq + 1);
        out[key] = value === '' ? true : value;
      } else {
        const key = token.slice(2);
        const next = args[i + 1];
        if (next && !next.startsWith('-')) {
          out[key] = next;
          i += 1;
        } else {
          out[key] = true;
        }
      }
    } else if (token.startsWith('-')) {
      const key = token.slice(1);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        out[key] = next;
        i += 1;
      } else {
        out[key] = true;
      }
    } else {
      if (!out._) out._ = [];
      out._.push(token);
    }
  }
  return out;
}

function toPositiveInt(value, fallback) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return fallback;
}

function toNonNegativeInt(value, fallback) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) return Math.floor(parsed);
  return fallback;
}

function toNonNegativeNumber(value, fallback) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return fallback;
}

const argv = parseCliArgs(process.argv.slice(2));
const REQUEST_TIMEOUT_MS = toPositiveInt(
  argv['per-request-timeout-ms'] || process.env.RAG_BENCHMARK_REQUEST_TIMEOUT_MS,
  15_000,
);
const CASE_TIMEOUT_MS = toPositiveInt(
  argv['case-timeout-ms'] || process.env.RAG_BENCHMARK_CASE_TIMEOUT_MS,
  12_000,
);
const ROUND_TIMEOUT_MS = toPositiveInt(
  argv['round-timeout-ms'] || process.env.RAG_BENCHMARK_ROUND_TIMEOUT_MS,
  900_000,
);
const HEARTBEAT_INTERVAL_MS = toPositiveInt(
  argv['heartbeat-interval-ms'] || process.env.RAG_BENCHMARK_HEARTBEAT_MS,
  30_000,
);
const MAX_RETRIES = toNonNegativeInt(
  argv['max-retries'] || process.env.RAG_BENCHMARK_MAX_RETRIES,
  2,
);
const CASE_TIMEOUT_COUNT_THRESHOLD = toNonNegativeInt(
  argv['case-timeout-threshold'] || process.env.RAG_BENCHMARK_CASE_TIMEOUT_THRESHOLD,
  3,
);
const NETWORK_FAILURE_RATE_THRESHOLD = toNonNegativeNumber(
  argv['network-failure-rate-threshold'] || process.env.RAG_BENCHMARK_NETWORK_FAILURE_RATE_THRESHOLD,
  0.02,
);
const START_INDEX_REQUESTED = toNonNegativeInt(argv['start-index'], 0);
const LIMIT_REQUESTED = argv.limit ? toPositiveInt(argv.limit, null) : null;
const CASE_ID_REQUESTED = argv['case-id'] ? String(argv['case-id']).trim() : null;
const RETRY_BACKOFF_MS = [200, 500];

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

function createAbortError(code, message) {
  const error = new Error(message);
  error.name = 'AbortError';
  error.code = code;
  return error;
}

function normalizeError(error) {
  if (error instanceof Error) return error;
  return new Error(String(error || 'unknown error'));
}

function serializeError(error) {
  const normalized = normalizeError(error);
  return {
    name: normalized.name || 'Error',
    code: normalized.code || null,
    message: normalized.message || String(normalized),
  };
}

function extractHttpStatus(error) {
  const normalized = normalizeError(error);
  const direct = Number(normalized.status || normalized.statusCode || normalized.httpStatus);
  if (Number.isInteger(direct) && direct >= 100 && direct <= 599) {
    return direct;
  }
  const match = String(normalized.message || '').match(/\bstatus\s+(\d{3})\b/i);
  if (match) return Number(match[1]);
  return null;
}

function inferFailurePhase(error) {
  const normalized = normalizeError(error);
  if (normalized.benchmark_phase) return normalized.benchmark_phase;
  const stack = `${normalized.stack || ''} ${normalized.message || ''}`.toLowerCase();
  if (stack.includes('json') && stack.includes('parse')) return 'parse';
  if (stack.includes('boundary-resolver') || stack.includes('@supabase') || stack.includes('curriculum_nodes')) return 'supabase';
  if (
    stack.includes('embedding-client') ||
    stack.includes('chat-client') ||
    stack.includes('_hybrid-rpc') ||
    stack.includes('ask-service')
  ) {
    return 'ask';
  }
  return 'ask';
}

function inferTimeoutKind(error) {
  const normalized = normalizeError(error);
  if (normalized.code === 'REQUEST_TIMEOUT') return 'request';
  if (normalized.code === 'CASE_TIMEOUT') return 'case';
  if (normalized.code === 'ROUND_TIMEOUT') return 'round';
  return null;
}

function inferErrorType(error) {
  const normalized = normalizeError(error);
  const message = String(normalized.message || '').toLowerCase();
  const code = String(normalized.code || '').toUpperCase();
  const httpStatus = extractHttpStatus(normalized);

  if (code === 'ROUND_TIMEOUT') return 'ROUND_TIMEOUT';
  if (code === 'CASE_TIMEOUT') return 'CASE_TIMEOUT';
  if (code === 'REQUEST_TIMEOUT') return 'REQUEST_TIMEOUT';
  if (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('socket') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('unexpected eof') ||
    message.includes('tls') ||
    message.includes('scram') ||
    message.includes('dns')
  ) {
    return 'NETWORK_FAILURE';
  }
  if (httpStatus >= 500) return 'HTTP_5XX';
  if (httpStatus >= 400) return 'HTTP_4XX';
  return 'UNKNOWN';
}

function isRetryableNetworkError(error) {
  const errorType = inferErrorType(error);
  return errorType === 'NETWORK_FAILURE' || errorType === 'REQUEST_TIMEOUT' || errorType === 'HTTP_5XX';
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function truncateStack(stack) {
  return stack ? String(stack).slice(0, 2000) : null;
}

function appendFailureEvent(event) {
  fs.mkdirSync(path.dirname(FAILURES_JSONL), { recursive: true });
  fs.appendFileSync(FAILURES_JSONL, `${JSON.stringify(event)}\n`, 'utf8');
}

function createAbortBundle({ parentSignal = null, timeoutMs, timeoutCode, timeoutMessage }) {
  const controller = new AbortController();
  const cleanups = [];

  const abortWith = (reason) => {
    if (!controller.signal.aborted) {
      controller.abort(reason);
    }
  };

  if (parentSignal) {
    if (parentSignal.aborted) {
      abortWith(parentSignal.reason || createAbortError(timeoutCode, timeoutMessage));
    } else {
      const onAbort = () => abortWith(parentSignal.reason || createAbortError(timeoutCode, timeoutMessage));
      parentSignal.addEventListener('abort', onAbort, { once: true });
      cleanups.push(() => parentSignal.removeEventListener('abort', onAbort));
    }
  }

  const timeoutId = setTimeout(() => {
    abortWith(createAbortError(timeoutCode, timeoutMessage));
  }, timeoutMs);
  cleanups.push(() => clearTimeout(timeoutId));

  return {
    signal: controller.signal,
    cleanup() {
      while (cleanups.length > 0) {
        const fn = cleanups.pop();
        try {
          fn();
        } catch {
          // noop
        }
      }
    },
  };
}

function raceWithSignal(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) {
    return Promise.reject(signal.reason || createAbortError('ABORTED', 'operation aborted'));
  }

  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason || createAbortError('ABORTED', 'operation aborted'));
    signal.addEventListener('abort', onAbort, { once: true });
    Promise.resolve(promise)
      .then(resolve, reject)
      .finally(() => {
        signal.removeEventListener('abort', onAbort);
      });
  });
}

function sleep(ms, signal = null) {
  if (!signal) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  return raceWithSignal(new Promise((resolve) => setTimeout(resolve, ms)), signal);
}

function createTimedFetch({ signal, timeoutMs, phase }) {
  return async function timedFetch(input, init = {}) {
    const requestUrl = typeof input === 'string' ? input : input?.url || null;
    const requestBundle = createAbortBundle({
      parentSignal: signal,
      timeoutMs,
      timeoutCode: 'REQUEST_TIMEOUT',
      timeoutMessage: `network request timed out after ${timeoutMs}ms`,
    });

    try {
      return await raceWithSignal(
        fetch(input, {
          ...init,
          signal: requestBundle.signal,
        }),
        requestBundle.signal,
      );
    } catch (error) {
      const enriched = normalizeError(requestBundle.signal.aborted ? requestBundle.signal.reason || error : error);
      enriched.benchmark_phase = phase;
      enriched.benchmark_url = requestUrl;
      throw enriched;
    } finally {
      requestBundle.cleanup();
    }
  };
}

function createTimedSupabaseClient({ signal, timeoutMs }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: createTimedFetch({ signal, timeoutMs, phase: 'supabase' }),
    },
  });
}

async function withRetry(
  fn,
  {
    retries = MAX_RETRIES,
    timeout = REQUEST_TIMEOUT_MS,
    signal,
    label = 'operation',
    caseContext = null,
  } = {},
) {
  let lastError = null;

  for (let attemptIndex = 0; attemptIndex <= retries; attemptIndex += 1) {
    const attempt = attemptIndex + 1;
    const attemptStartedAt = Date.now();
    const attemptBundle = createAbortBundle({
      parentSignal: signal,
      timeoutMs: timeout,
      timeoutCode: 'REQUEST_TIMEOUT',
      timeoutMessage: `${label} timed out after ${timeout}ms`,
    });

    try {
      const result = await raceWithSignal(
        fn({
          attempt,
          signal: attemptBundle.signal,
          timeoutMs: timeout,
        }),
        attemptBundle.signal,
      );
      attemptBundle.cleanup();
      return {
        result,
        attempts: attempt,
      };
    } catch (error) {
      attemptBundle.cleanup();
      const normalized = normalizeError(error);
      appendFailureEvent({
        timestamp: new Date().toISOString(),
        case_index: caseContext?.originalIndex != null ? caseContext.originalIndex + 1 : null,
        case_id: caseContext?.item?.case_id || null,
        attempt,
        phase: inferFailurePhase(normalized),
        error_name: normalized.name || 'Error',
        error_message: normalized.message || String(normalized),
        stack: truncateStack(normalized.stack),
        elapsed_ms: Date.now() - attemptStartedAt,
        timeout_kind: inferTimeoutKind(normalized),
        url: normalized.benchmark_url || null,
        http_status: extractHttpStatus(normalized),
        error_type: inferErrorType(normalized),
      });

      lastError = normalized;
      if (signal?.aborted && signal.reason?.code === 'ROUND_TIMEOUT') {
        throw signal.reason;
      }
      if (attemptIndex >= retries || !isRetryableNetworkError(normalized)) {
        throw normalized;
      }
      const delayMs = RETRY_BACKOFF_MS[Math.min(attemptIndex, RETRY_BACKOFF_MS.length - 1)] || RETRY_BACKOFF_MS.at(-1);
      await sleep(delayMs, signal);
    }
  }

  throw lastError || new Error(`${label} failed without error`);
}

function buildFallbackResponse({ latencyMs, errorType }) {
  return {
    answer: '',
    uncertain: true,
    uncertain_reason_code: 'RETRIEVER_ERROR',
    topic_leakage_flag: false,
    topic_leakage_reason: null,
    evidence: [],
    retrieval_version: null,
    metrics: {
      cost_avg_usd_per_req: 0,
      latency_ms: latencyMs,
      cost_audit: {
        formula_version: 'rag_s1_cost_v1',
        price_table_version: 'unknown',
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          embedding_tokens: 0,
        },
        call_counts: {
          embedding_calls: 0,
          chat_calls: 0,
          rerank_calls: 0,
          extra_calls: 0,
        },
        component_costs_usd: {
          chat_prompt: 0,
          chat_completion: 0,
          embedding: 0,
          rerank_or_extra_calls: 0,
          cache_saving: 0,
        },
      },
      retrieval_audit: {
        query_mode: 'benchmark_fallback',
        short_circuit_label: null,
        rpc_call_count: 0,
        hybrid_row_count: 0,
        dense_row_count: 0,
        lexical_row_count: 0,
        error_stage: 'benchmark_harness',
        error_code: errorType,
        error_status: null,
        error_message: errorType,
        error_details: null,
      },
    },
  };
}

function buildCaseRow({ caseContext, response, error, attempts, latencyMs, success }) {
  const item = caseContext.item;
  const answerF1 = f1Audit(response.answer, item.reference_answer || '');
  const evidence = Array.isArray(response.evidence) ? response.evidence : [];
  const sourceRefResolvableCount = evidence.filter((entry) => isSourceRefResolvable(entry.source_ref)).length;
  const sourceRefUnresolvableCount = Math.max(evidence.length - sourceRefResolvableCount, 0);
  const costAudit = response?.metrics?.cost_audit || null;
  const errorType = error ? inferErrorType(error) : null;

  return {
    case_id: item.case_id,
    case_index: caseContext.originalIndex + 1,
    success,
    uncertain: Boolean(response.uncertain),
    latency_ms: Number(latencyMs),
    error_type: errorType,
    error_phase: error ? inferFailurePhase(error) : null,
    attempts,
    syllabus_node_id: item.syllabus_node_id,
    current_topic_path: item.current_topic_path,
    query: item.query,
    reference_answer: item.reference_answer,
    answer: response.answer,
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
    cost_usd: Number(response?.metrics?.cost_avg_usd_per_req || 0),
    retrieval_version: response?.retrieval_version || null,
    price_table_version: costAudit?.price_table_version || null,
    cache_saving_usd: Number(costAudit?.component_costs_usd?.cache_saving || 0),
    cost_audit: costAudit,
    error: error ? serializeError(error) : null,
  };
}

async function runBenchmarkCase(caseContext, position, total, roundSignal) {
  const caseStartedAt = Date.now();
  const caseBundle = createAbortBundle({
    parentSignal: roundSignal,
    timeoutMs: CASE_TIMEOUT_MS,
    timeoutCode: 'CASE_TIMEOUT',
    timeoutMessage: `benchmark case ${caseContext.item.case_id} timed out after ${CASE_TIMEOUT_MS}ms`,
  });

  let response = null;
  let error = null;
  let attempts = 0;

  try {
    const execution = await raceWithSignal(
      withRetry(
        async ({ signal, timeoutMs }) => {
          const timedSupabase = createTimedSupabaseClient({ signal, timeoutMs });
          const timedFetch = createTimedFetch({ signal, timeoutMs, phase: 'fetch' });
          return executeAskAI(
            {
              query: caseContext.item.query,
              syllabus_node_id: caseContext.item.syllabus_node_id,
              subject_code: caseContext.item.subject_code || null,
              internal_debug: false,
            },
            {
              req: {
                request_id: `bench-${caseContext.item.case_id}`,
                auth_user: null,
              },
              logger: () => {},
              supabase: timedSupabase,
              fetchImpl: timedFetch,
            },
          );
        },
        {
          retries: MAX_RETRIES,
          timeout: REQUEST_TIMEOUT_MS,
          signal: caseBundle.signal,
          label: `case:${caseContext.item.case_id}`,
          caseContext,
        },
      ),
      caseBundle.signal,
    );

    response = execution.result;
    attempts = execution.attempts;
  } catch (caught) {
    error = normalizeError(caught);
    attempts = Math.max(attempts, MAX_RETRIES + 1);
    appendFailureEvent({
      timestamp: new Date().toISOString(),
      case_index: caseContext.originalIndex + 1,
      case_id: caseContext.item.case_id,
      attempt: attempts,
      phase: inferFailurePhase(error),
      error_name: error.name || 'Error',
      error_message: error.message || String(error),
      stack: truncateStack(error.stack),
      elapsed_ms: Date.now() - caseStartedAt,
      timeout_kind: inferTimeoutKind(error),
      url: error.benchmark_url || null,
      http_status: extractHttpStatus(error),
      error_type: inferErrorType(error),
    });
  } finally {
    caseBundle.cleanup();
  }

  const latencyMs = Date.now() - caseStartedAt;
  const finalResponse = response || buildFallbackResponse({ latencyMs, errorType: inferErrorType(error) });
  const row = buildCaseRow({
    caseContext,
    response: finalResponse,
    error,
    attempts,
    latencyMs,
    success: !error,
  });

  console.log(
    `[${position + 1}/${total}] case_id=${row.case_id} latency=${row.latency_ms}ms success=${row.success} error_type=${row.error_type || 'NONE'}`,
  );

  return row;
}

function buildRunConfig({ datasetOriginalTotal, selectedTotalCases, caseDescriptors }) {
  return {
    limit: LIMIT_REQUESTED,
    start_index_requested: START_INDEX_REQUESTED,
    start_index_base: 1,
    case_id: CASE_ID_REQUESTED,
    round_timeout_ms: ROUND_TIMEOUT_MS,
    per_request_timeout_ms: REQUEST_TIMEOUT_MS,
    case_timeout_ms: CASE_TIMEOUT_MS,
    heartbeat_interval_ms: HEARTBEAT_INTERVAL_MS,
    max_retries: MAX_RETRIES,
    retry_backoff_ms: RETRY_BACKOFF_MS,
    case_timeout_count_threshold: CASE_TIMEOUT_COUNT_THRESHOLD,
    network_failure_rate_threshold: NETWORK_FAILURE_RATE_THRESHOLD,
    dataset_original_total_cases: datasetOriginalTotal,
    selected_total_cases: selectedTotalCases,
    selected_case_ids: caseDescriptors.map((entry) => entry.item.case_id),
  };
}

function summarizeCostAudit(rows) {
  return rows.reduce(
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
}

function buildSummary({ rows, selectedCases, manifest, roundStartedAt, roundAborted, fatalError, runConfig }) {
  const total = rows.length;
  const selectedTotal = selectedCases.length;
  const leakageCount = rows.filter((row) => row.topic_leakage_flag).length;
  const traceableEvidenceCount = rows.reduce((sum, row) => sum + row.source_ref_resolvable_count, 0);
  const totalEvidenceCount = rows.reduce((sum, row) => sum + row.evidence_count, 0);
  const unresolvableEvidenceCount = rows.reduce((sum, row) => sum + row.source_ref_unresolvable_count, 0);
  const avgF1 = total === 0 ? 0 : rows.reduce((sum, row) => sum + row.answer_f1, 0) / total;
  const avgCost = total === 0 ? 0 : rows.reduce((sum, row) => sum + row.cost_usd, 0) / total;
  const latencies = rows.map((row) => row.latency_ms);
  const tpTokensTotal = rows.reduce((sum, row) => sum + row.answer_f1_tp, 0);
  const fpTokensTotal = rows.reduce((sum, row) => sum + row.answer_f1_fp, 0);
  const fnTokensTotal = rows.reduce((sum, row) => sum + row.answer_f1_fn, 0);
  const caseTimeoutCount = rows.filter((row) => row.error_type === 'CASE_TIMEOUT').length;
  const networkFailureCount = rows.filter((row) => row.error_type === 'NETWORK_FAILURE').length;
  const networkFailureRate = total === 0 ? 0 : networkFailureCount / total;

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
  const errorBreakdown = rows.reduce((acc, row) => {
    const key = row.error_type || 'NONE';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const costAudit = summarizeCostAudit(rows);

  const metrics = {
    topic_leakage_rate: total === 0 ? 0 : Number((leakageCount / total).toFixed(6)),
    answer_correctness_f1: Number(avgF1.toFixed(6)),
    evidence_traceability_rate: Number(
      (totalEvidenceCount === 0 ? 0 : traceableEvidenceCount / totalEvidenceCount).toFixed(6),
    ),
    latency_p95_ms: Number(p95(latencies).toFixed(3)),
    cost_avg_usd_per_req: Number(avgCost.toFixed(6)),
  };

  const metricThresholdChecks = {
    topic_leakage_rate: metrics.topic_leakage_rate < S1_METRIC_THRESHOLDS.topic_leakage_rate_max,
    answer_correctness_f1: metrics.answer_correctness_f1 >= S1_METRIC_THRESHOLDS.answer_correctness_f1_min,
    evidence_traceability_rate:
      metrics.evidence_traceability_rate >= S1_METRIC_THRESHOLDS.evidence_traceability_rate_min,
    latency_p95_ms: metrics.latency_p95_ms <= S1_METRIC_THRESHOLDS.latency_p95_ms_max,
    cost_avg_usd_per_req: metrics.cost_avg_usd_per_req <= S1_METRIC_THRESHOLDS.cost_avg_usd_per_req_max,
  };

  const executionChecks = {
    round_completed: total === selectedTotal && !roundAborted && !fatalError,
    case_timeout_count: caseTimeoutCount <= CASE_TIMEOUT_COUNT_THRESHOLD,
    network_failure_rate: networkFailureRate <= NETWORK_FAILURE_RATE_THRESHOLD,
    hard_watchdog: !roundAborted,
  };

  const status =
    Object.values(metricThresholdChecks).every(Boolean) &&
    Object.values(executionChecks).every(Boolean)
      ? 'pass'
      : 'fail';

  return {
    generated_at: new Date().toISOString(),
    round_started_at: roundStartedAt,
    dataset: path.relative(ROOT, DATASET_FILE).replace(/\\/g, '/'),
    benchmark_profile: manifest?.benchmark_profile || 'title_lookup_boundary_smoke_v1',
    gold_label_source: manifest?.gold_label_source || 'curriculum_nodes.title',
    total_requests: total,
    dataset_total_cases: selectedTotal,
    thresholds: S1_METRIC_THRESHOLDS,
    run_config: runConfig,
    metrics,
    threshold_checks: metricThresholdChecks,
    execution_checks: executionChecks,
    status,
    dataset_manifest: manifest,
    strata: manifest?.strata || null,
    execution: {
      request_timeout_ms: REQUEST_TIMEOUT_MS,
      case_timeout_ms: CASE_TIMEOUT_MS,
      round_timeout_ms: ROUND_TIMEOUT_MS,
      heartbeat_interval_ms: HEARTBEAT_INTERVAL_MS,
      max_retries: MAX_RETRIES,
      completed_cases: total,
      round_completed: executionChecks.round_completed,
      round_aborted: roundAborted,
      fatal_error: fatalError ? serializeError(fatalError) : null,
      success_count: rows.filter((row) => row.success).length,
      failed_case_count: rows.filter((row) => !row.success).length,
      case_timeout_count: caseTimeoutCount,
      network_failure_rate: Number(networkFailureRate.toFixed(6)),
      hard_watchdog_triggered: roundAborted,
    },
    round_timeout_ms: ROUND_TIMEOUT_MS,
    per_request_timeout_ms: REQUEST_TIMEOUT_MS,
    slowest_cases_top_k: [...rows]
      .sort((a, b) => b.latency_ms - a.latency_ms)
      .slice(0, 10)
      .map((row) => ({
        case_id: row.case_id,
        case_index: row.case_index,
        elapsed_ms: row.latency_ms,
        attempts: row.attempts,
        final_status: row.success ? 'success' : row.error_type || 'UNKNOWN',
        phase: row.error_phase,
      })),
    error_breakdown: errorBreakdown,
    failures_file: path.relative(ROOT, FAILURES_JSONL).replace(/\\/g, '/'),
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
}

function renderReport(summary) {
  const lines = [
    '# RAG Live Benchmark (S1)',
    '',
    `- Generated at: \`${summary.generated_at}\``,
    `- Dataset: \`${summary.dataset}\``,
    `- Benchmark profile: \`${summary.benchmark_profile || 'unknown'}\``,
    `- Total requests: \`${summary.total_requests}\` / \`${summary.dataset_total_cases}\``,
    `- Round completed: \`${summary.execution.round_completed}\``,
    `- Round aborted: \`${summary.execution.round_aborted}\``,
    '',
    '## Run Config',
    '',
    `- limit: \`${summary.run_config.limit ?? 'ALL'}\``,
    `- start_index_requested: \`${summary.run_config.start_index_requested}\``,
    `- case_id: \`${summary.run_config.case_id || 'ALL'}\``,
    `- round_timeout_ms: \`${summary.run_config.round_timeout_ms}\``,
    `- per_request_timeout_ms: \`${summary.run_config.per_request_timeout_ms}\``,
    `- case_timeout_ms: \`${summary.run_config.case_timeout_ms}\``,
    '',
    '## Metrics',
    '',
    `- topic_leakage_rate: \`${(summary.metrics.topic_leakage_rate * 100).toFixed(2)}%\``,
    `- answer_correctness_f1: \`${summary.metrics.answer_correctness_f1.toFixed(4)}\``,
    `- evidence_traceability_rate: \`${(summary.metrics.evidence_traceability_rate * 100).toFixed(2)}%\``,
    `- latency_p95_ms: \`${summary.metrics.latency_p95_ms.toFixed(2)}\``,
    `- cost_avg_usd_per_req: \`${summary.metrics.cost_avg_usd_per_req.toFixed(6)}\``,
    `- price_table_version: \`${summary.cost_audit.price_table_version}\``,
    '',
    '## Execution',
    '',
    `- request_timeout_ms: \`${summary.execution.request_timeout_ms}\``,
    `- case_timeout_ms: \`${summary.execution.case_timeout_ms}\``,
    `- round_timeout_ms: \`${summary.execution.round_timeout_ms}\``,
    `- max_retries: \`${summary.execution.max_retries}\``,
    `- success_count: \`${summary.execution.success_count}\``,
    `- failed_case_count: \`${summary.execution.failed_case_count}\``,
    `- error_breakdown: \`${JSON.stringify(summary.error_breakdown)}\``,
    `- failures_file: \`${summary.failures_file}\``,
    '',
    '## Threshold Checks',
    '',
    `- leakage: ${summary.threshold_checks.topic_leakage_rate ? 'PASS' : 'FAIL'}`,
    `- correctness_f1: ${summary.threshold_checks.answer_correctness_f1 ? 'PASS' : 'FAIL'}`,
    `- traceability: ${summary.threshold_checks.evidence_traceability_rate ? 'PASS' : 'FAIL'}`,
    `- latency_p95: ${summary.threshold_checks.latency_p95_ms ? 'PASS' : 'FAIL'}`,
    `- cost_avg: ${summary.threshold_checks.cost_avg_usd_per_req ? 'PASS' : 'FAIL'}`,
    `- round_completed: ${summary.execution_checks.round_completed ? 'PASS' : 'FAIL'}`,
    `- case_timeout_count: ${summary.execution_checks.case_timeout_count ? 'PASS' : 'FAIL'}`,
    `- network_failure_rate: ${summary.execution_checks.network_failure_rate ? 'PASS' : 'FAIL'}`,
    `- hard_watchdog: ${summary.execution_checks.hard_watchdog ? 'PASS' : 'FAIL'}`,
    '',
    `## Final Status: ${summary.status.toUpperCase()}`,
    '',
    '## Slowest Cases',
    '',
    ...summary.slowest_cases_top_k.map(
      (entry) =>
        `- ${entry.case_id}: ${entry.elapsed_ms}ms, attempts=${entry.attempts}, final_status=${entry.final_status}, phase=${entry.phase || 'NONE'}`,
    ),
    '',
  ];

  return lines.join('\n');
}

function writeMetricGateSummary(summary) {
  const stability = readJsonIfExists(STABILITY_FILE);
  const payload = {
    generated_at: new Date().toISOString(),
    source: path.relative(ROOT, OUT_JSON).replace(/\\/g, '/'),
    status: summary.status || 'fail',
    threshold_checks: summary.threshold_checks || {},
    execution_checks: summary.execution_checks || {},
    metrics: summary.metrics || {},
    total_requests: summary.total_requests || 0,
    benchmark_profile: summary.benchmark_profile || null,
    gold_label_source: summary.gold_label_source || null,
    strata: summary.strata || null,
    run_config: summary.run_config || null,
    round_timeout_ms: summary.round_timeout_ms,
    per_request_timeout_ms: summary.per_request_timeout_ms,
    slowest_cases_top_k: summary.slowest_cases_top_k || [],
    error_breakdown: summary.error_breakdown || {},
    failures_file: summary.failures_file || null,
    execution: summary.execution || null,
    f1_audit: summary.f1_audit || null,
    traceability_audit: summary.traceability_audit || null,
    leakage_audit: summary.leakage_audit || null,
    uncertain_audit: summary.uncertain_audit || null,
    retrieval_audit: summary.retrieval_audit || null,
    cost_audit: summary.cost_audit || null,
    required_gate_upgrade_eligible: Boolean(stability?.required_gate_upgrade_eligible),
    stability_source: stability ? path.relative(ROOT, STABILITY_FILE).replace(/\\/g, '/') : null,
    gate_mode: 'required_fail_closed',
    workflow_source: path.relative(ROOT, WORKFLOW_FILE).replace(/\\/g, '/'),
  };
  fs.mkdirSync(path.dirname(METRIC_GATE_SUMMARY_FILE), { recursive: true });
  fs.writeFileSync(METRIC_GATE_SUMMARY_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function selectCases(dataset) {
  const descriptors = dataset.map((item, originalIndex) => ({ item, originalIndex }));
  if (CASE_ID_REQUESTED) {
    const selected = descriptors.filter((entry) => entry.item.case_id === CASE_ID_REQUESTED);
    if (selected.length === 0) {
      throw new Error(`case_id not found in dataset: ${CASE_ID_REQUESTED}`);
    }
    return selected;
  }

  const startOffset = START_INDEX_REQUESTED > 0 ? Math.max(START_INDEX_REQUESTED - 1, 0) : 0;
  const sliced = descriptors.slice(startOffset);
  return LIMIT_REQUESTED ? sliced.slice(0, LIMIT_REQUESTED) : sliced;
}

async function main() {
  const roundStartedAt = new Date().toISOString();
  const rows = [];
  let dataset = [];
  let selectedCases = [];
  let manifest = null;
  let fatalError = null;

  fs.mkdirSync(path.dirname(FAILURES_JSONL), { recursive: true });
  fs.writeFileSync(FAILURES_JSONL, '', 'utf8');

  const heartbeat = setInterval(() => {
    console.log('heartbeat alive', Date.now());
  }, HEARTBEAT_INTERVAL_MS);

  const roundBundle = createAbortBundle({
    timeoutMs: ROUND_TIMEOUT_MS,
    timeoutCode: 'ROUND_TIMEOUT',
    timeoutMessage: `benchmark round timed out after ${ROUND_TIMEOUT_MS}ms`,
  });

  try {
    if (!fs.existsSync(DATASET_FILE)) {
      throw new Error(`Dataset not found: ${DATASET_FILE}`);
    }

    dataset = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf8'));
    manifest = readJsonIfExists(MANIFEST_FILE);
    if (!Array.isArray(dataset) || dataset.length < 64) {
      throw new Error('rag_live_set_v1.json must contain at least 64 cases');
    }

    selectedCases = selectCases(dataset);
    const total = selectedCases.length;

    for (let position = 0; position < total; position += 1) {
      if (roundBundle.signal.aborted) break;
      const row = await runBenchmarkCase(selectedCases[position], position, total, roundBundle.signal);
      rows.push(row);
      if (roundBundle.signal.aborted) break;
    }
  } catch (error) {
    fatalError = normalizeError(error);
  } finally {
    clearInterval(heartbeat);
    const roundAborted = Boolean(roundBundle.signal.aborted);
    roundBundle.cleanup();

    const runConfig = buildRunConfig({
      datasetOriginalTotal: dataset.length,
      selectedTotalCases: selectedCases.length,
      caseDescriptors: selectedCases,
    });

    const summary = buildSummary({
      rows,
      selectedCases,
      manifest,
      roundStartedAt,
      roundAborted,
      fatalError,
      runConfig,
    });

    fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
    fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
    fs.writeFileSync(OUT_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    fs.writeFileSync(OUT_MD, renderReport(summary), 'utf8');
    writeMetricGateSummary(summary);

    process.stdout.write(`${OUT_JSON}\n${OUT_MD}\n${METRIC_GATE_SUMMARY_FILE}\n`);
    if (summary.status !== 'pass') {
      process.exitCode = 1;
    }
  }
}

main();
