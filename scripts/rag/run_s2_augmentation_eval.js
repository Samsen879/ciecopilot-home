#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { executeAskAI } from '../../api/rag/lib/ask-service.js';
import { getRagConfig } from '../../api/rag/lib/config.js';
import { toRagErrorAudit } from '../../api/rag/lib/errors.js';
import {
  evaluateS2AugmentationCase,
  renderS2AugmentationEvalReport,
  summarizeS2AugmentationEval,
} from './lib/s2_augmentation_eval.js';

dotenv.config();

const ROOT = process.cwd();
const DEFAULT_DATASET_FILE = path.join(ROOT, 'data', 'eval', 'rag_s2_augmentation_eval_v1.json');
const DEFAULT_MANIFEST_FILE = path.join(ROOT, 'data', 'eval', 'rag_s2_augmentation_eval_v1_manifest.json');
const DEFAULT_CORPUS_SUMMARY_FILE = path.join(ROOT, 'runs', 'backend', 'rag_corpus_source_coverage_summary.json');
const DEFAULT_OUT_SUMMARY = path.join(ROOT, 'runs', 'backend', 'rag_s2_augmentation_eval_summary.json');
const DEFAULT_OUT_REPORT = path.join(ROOT, 'docs', 'reports', 'rag_s2_augmentation_eval_report.md');

const DEFAULT_PER_CASE_TIMEOUT_MS = 20_000;
const DEFAULT_ROUND_TIMEOUT_MS = 20 * 60 * 1000;
const DEFAULT_MAX_RETRIES = 1;
const RETRY_BACKOFF_MS = [200, 500];

function parseCliArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('-')) continue;
    const eq = token.indexOf('=');
    if (eq !== -1) {
      out[token.slice(token.startsWith('--') ? 2 : 1, eq)] = token.slice(eq + 1);
      continue;
    }
    const key = token.slice(token.startsWith('--') ? 2 : 1);
    const next = args[i + 1];
    if (next && !next.startsWith('-')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function toPositiveInt(value, fallback) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return fallback;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function isRetryableError(error) {
  const normalized = normalizeError(error);
  const code = String(normalized.code || '');
  const message = String(normalized.message || '').toLowerCase();
  if (
    code === 'REQUEST_TIMEOUT' ||
    code === 'CASE_TIMEOUT' ||
    code === 'RAG_BOUNDARY_LOOKUP_FAILED' ||
    code.startsWith('RAG_RETRIEVER_') ||
    code === 'RAG_CHAT_NETWORK_ERROR' ||
    code === 'RAG_CHAT_TIMEOUT' ||
    code === 'RAG_EMBEDDING_NETWORK_ERROR' ||
    code === 'RAG_EMBEDDING_TIMEOUT'
  ) {
    return true;
  }
  if (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('socket') ||
    message.includes('timeout') ||
    message.includes('econn') ||
    message.includes('dns')
  ) {
    return true;
  }
  return false;
}

function createAbortBundle({ parentSignal = null, timeoutMs, timeoutCode, timeoutMessage }) {
  const controller = new AbortController();
  const cleanups = [];

  const abortWith = (reason) => {
    if (!controller.signal.aborted) controller.abort(reason);
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
      .finally(() => signal.removeEventListener('abort', onAbort));
  });
}

function createTimedFetch({ signal, timeoutMs, phase }) {
  return async function timedFetch(input, init = {}) {
    const requestBundle = createAbortBundle({
      parentSignal: signal,
      timeoutMs,
      timeoutCode: 'REQUEST_TIMEOUT',
      timeoutMessage: `request timed out after ${timeoutMs}ms`,
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
      const normalized = normalizeError(requestBundle.signal.aborted ? requestBundle.signal.reason || error : error);
      normalized.benchmark_phase = phase;
      throw normalized;
    } finally {
      requestBundle.cleanup();
    }
  };
}

function createTimedSupabaseClient({ signal, timeoutMs }) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase credentials: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
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

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dataset not found: ${filePath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`Dataset must be an array: ${filePath}`);
  }
  return parsed;
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function selectCases(dataset, argv) {
  const startIndex = Math.max(Number(argv['start-index'] || 0), 0);
  const limit = argv.limit ? toPositiveInt(argv.limit, dataset.length) : dataset.length;
  const caseId = argv['case-id'] ? String(argv['case-id']).trim() : null;

  if (caseId) {
    const found = dataset.find((item) => item.case_id === caseId);
    if (!found) throw new Error(`case_id not found: ${caseId}`);
    return [found];
  }

  return dataset.slice(startIndex, startIndex + limit);
}

function createModeConfigs(baseConfig, argv) {
  const rulesOnly = toBoolean(argv['s2-rules-only'], false);
  const llmClassifierEnabled = toBoolean(argv['s2-enable-llm-classifier'], false);
  const timeoutMs = toPositiveInt(argv['s2-timeout-ms'], baseConfig?.s2?.timeoutMs || 8000);

  const s1Baseline = JSON.parse(JSON.stringify(baseConfig));
  s1Baseline.s2 = {
    ...(baseConfig?.s2 || {}),
    enabled: false,
    routeKillSwitch: false,
    routeRulesOnly: false,
    llmClassifierEnabled: false,
  };

  const s2Enabled = JSON.parse(JSON.stringify(baseConfig));
  s2Enabled.s2 = {
    ...(baseConfig?.s2 || {}),
    enabled: true,
    routeKillSwitch: false,
    routeRulesOnly: rulesOnly,
    llmClassifierEnabled,
    timeoutMs,
  };

  return {
    s1_baseline: s1Baseline,
    s2_enabled: s2Enabled,
  };
}

function buildErrorFallbackResponse({ mode, error, elapsedMs }) {
  const errorAudit = toRagErrorAudit(error, { stage: error?.benchmark_phase || 'execution' });
  const fallbackReason =
    mode === 's2_enabled'
      ? String(error?.code || '') === 'CASE_TIMEOUT'
        ? 'S2_TIMEOUT'
        : 'S2_INFRA_ERROR'
      : null;
  return {
    answer: '',
    uncertain: true,
    uncertain_reason_code: 'RETRIEVER_ERROR',
    topic_leakage_flag: false,
    topic_leakage_reason: null,
    evidence: [],
    retrieval_version: null,
    metrics: {
      evidence_traceability_rate: 0,
      cost_avg_usd_per_req: 0,
      cost_audit: null,
      retrieval_audit: {
        query_mode: 'execution_error',
        short_circuit_label: null,
        rpc_call_count: 0,
        hybrid_row_count: 0,
        dense_row_count: 0,
        lexical_row_count: 0,
        ...errorAudit,
        chat_mode: 'not_attempted',
      },
      route_audit: {
        retrieval_route: mode === 's2_enabled' ? 's2_augmentation' : 's1_default',
        route_reason: 'execution_error',
        route_stage: 'default_safe',
        route_scores: null,
        final_execution_route: 's1_default',
        fallback_triggered: mode === 's2_enabled',
        fallback_reason: fallbackReason,
        s2_hop_count: 0,
        s2_expanded_topic_count: 0,
        llm_classifier_used: false,
        llm_classifier_status: 'not_enabled',
      },
      latency_ms: elapsedMs,
    },
  };
}

async function runCaseOnce(item, { mode, modeConfig, perCaseTimeoutMs, roundSignal }) {
  const caseBundle = createAbortBundle({
    parentSignal: roundSignal,
    timeoutMs: perCaseTimeoutMs,
    timeoutCode: 'CASE_TIMEOUT',
    timeoutMessage: `case timed out after ${perCaseTimeoutMs}ms`,
  });
  const started = Date.now();

  try {
    const response = await raceWithSignal(
      executeAskAI(
        {
          query: item.query,
          syllabus_node_id: item.syllabus_node_id,
          subject_code: item.subject_code || null,
          current_topic_path: item.current_topic_path || null,
          boundary_title:
            item.metadata?.source_node_label ||
            String(item.reference_answer || '').split('.')[0]?.trim() ||
            null,
          boundary_description: item.current_topic_path || null,
          internal_debug: true,
          language: item.metadata?.language || 'en',
        },
        {
          req: {
            request_id: `${mode}-${item.case_id}`,
            auth_user: null,
          },
          config: modeConfig,
          logger: () => {},
          fetchImpl: createTimedFetch({
            signal: caseBundle.signal,
            timeoutMs: perCaseTimeoutMs,
            phase: 'ask',
          }),
          supabase: createTimedSupabaseClient({
            signal: caseBundle.signal,
            timeoutMs: perCaseTimeoutMs,
          }),
        },
      ),
      caseBundle.signal,
    );
    return {
      response,
      executionError: null,
      latencyMs: Date.now() - started,
      attempts: 1,
    };
  } catch (error) {
    const elapsedMs = Date.now() - started;
    const normalized = normalizeError(caseBundle.signal.aborted ? caseBundle.signal.reason || error : error);
    return {
      response: buildErrorFallbackResponse({
        mode,
        error: normalized,
        elapsedMs,
      }),
      executionError: normalized,
      latencyMs: elapsedMs,
      attempts: 1,
    };
  } finally {
    caseBundle.cleanup();
  }
}

async function runCaseWithRetry(item, { mode, modeConfig, perCaseTimeoutMs, roundSignal, maxRetries }) {
  let finalResult = null;
  let attempts = 0;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (roundSignal?.aborted) break;
    attempts += 1;
    const result = await runCaseOnce(item, {
      mode,
      modeConfig,
      perCaseTimeoutMs,
      roundSignal,
    });
    if (!result.executionError) {
      return {
        ...result,
        attempts,
      };
    }
    finalResult = result;
    if (!isRetryableError(result.executionError) || attempt >= maxRetries) {
      break;
    }
    const backoff = RETRY_BACKOFF_MS[Math.min(attempt, RETRY_BACKOFF_MS.length - 1)] || 500;
    await sleep(backoff);
  }

  return {
    ...(finalResult || {
      response: buildErrorFallbackResponse({
        mode,
        error: createAbortError('CASE_ABORTED', 'case aborted before execution'),
        elapsedMs: 0,
      }),
      executionError: createAbortError('CASE_ABORTED', 'case aborted before execution'),
      latencyMs: 0,
    }),
    attempts,
  };
}

async function runMode({ mode, cases, modeConfig, perCaseTimeoutMs, roundSignal, maxRetries }) {
  const rows = [];
  for (let index = 0; index < cases.length; index += 1) {
    if (roundSignal?.aborted) break;
    const item = cases[index];
    const { response, executionError, latencyMs, attempts } = await runCaseWithRetry(item, {
      mode,
      modeConfig,
      perCaseTimeoutMs,
      roundSignal,
      maxRetries,
    });
    const row = evaluateS2AugmentationCase(item, response, { mode });
    row.execution_error = executionError ? serializeError(executionError) : null;
    row.retry_attempts = attempts;
    row.latency_ms = latencyMs;
    rows.push(row);
    process.stdout.write(
      `[${mode}] [${index + 1}/${cases.length}] case_id=${item.case_id} pass=${row.case_pass} fallback=${row.route_audit?.fallback_reason || 'NONE'} latency=${latencyMs}ms\n`,
    );
  }
  return rows;
}

async function main() {
  const argv = parseCliArgs(process.argv.slice(2));
  const perCaseTimeoutMs = toPositiveInt(argv['per-case-timeout-ms'], DEFAULT_PER_CASE_TIMEOUT_MS);
  const roundTimeoutMs = toPositiveInt(argv['round-timeout-ms'], DEFAULT_ROUND_TIMEOUT_MS);
  const maxRetries = toPositiveInt(argv['max-retries'], DEFAULT_MAX_RETRIES);
  const datasetFile = argv.dataset ? path.join(ROOT, argv.dataset) : DEFAULT_DATASET_FILE;
  const manifestFile = argv.manifest ? path.join(ROOT, argv.manifest) : DEFAULT_MANIFEST_FILE;
  const corpusSummaryFile = argv['corpus-summary'] ? path.join(ROOT, argv['corpus-summary']) : DEFAULT_CORPUS_SUMMARY_FILE;
  const outSummary = argv['out-summary'] ? path.join(ROOT, argv['out-summary']) : DEFAULT_OUT_SUMMARY;
  const outReport = argv['out-report'] ? path.join(ROOT, argv['out-report']) : DEFAULT_OUT_REPORT;

  const dataset = readJsonArray(datasetFile);
  const manifest = readJsonIfExists(manifestFile);
  const corpusCoverageSummary = readJsonIfExists(corpusSummaryFile);
  const selectedCases = selectCases(dataset, argv);
  if (selectedCases.length === 0) {
    throw new Error('No selected benchmark cases');
  }

  const baseConfig = getRagConfig();
  const modeConfigs = createModeConfigs(baseConfig, argv);
  const roundBundle = createAbortBundle({
    timeoutMs: roundTimeoutMs,
    timeoutCode: 'ROUND_TIMEOUT',
    timeoutMessage: `round timed out after ${roundTimeoutMs}ms`,
  });

  const s1Rows = await runMode({
    mode: 's1_baseline',
    cases: selectedCases,
    modeConfig: modeConfigs.s1_baseline,
    perCaseTimeoutMs,
    roundSignal: roundBundle.signal,
    maxRetries,
  });
  const s2Rows = await runMode({
    mode: 's2_enabled',
    cases: selectedCases,
    modeConfig: modeConfigs.s2_enabled,
    perCaseTimeoutMs,
    roundSignal: roundBundle.signal,
    maxRetries,
  });
  const roundAborted = roundBundle.signal.aborted;
  roundBundle.cleanup();

  const runConfig = {
    script: 'scripts/rag/run_s2_augmentation_eval.js',
    dataset: toRel(datasetFile),
    manifest: toRel(manifestFile),
    corpus_coverage_summary: fs.existsSync(corpusSummaryFile) ? toRel(corpusSummaryFile) : null,
    selected_cases: selectedCases.length,
    per_case_timeout_ms: perCaseTimeoutMs,
    round_timeout_ms: roundTimeoutMs,
    max_retries: maxRetries,
    start_index: Number(argv['start-index'] || 0),
    limit: argv.limit ? Number(argv.limit) : null,
    case_id: argv['case-id'] ? String(argv['case-id']).trim() : null,
    s2_enabled: true,
    s2_route_rules_only: modeConfigs.s2_enabled?.s2?.routeRulesOnly === true,
    s2_llm_classifier_enabled: modeConfigs.s2_enabled?.s2?.llmClassifierEnabled === true,
    s2_timeout_ms: modeConfigs.s2_enabled?.s2?.timeoutMs || null,
    s2_readiness_guard_enabled: modeConfigs.s2_enabled?.s2?.readinessGuardEnabled === true,
    s2_readiness_max_topic_depth: modeConfigs.s2_enabled?.s2?.readinessMaxTopicDepth || null,
    s2_readiness_profile_path: modeConfigs.s2_enabled?.s2?.readinessProfilePath || null,
    s2_readiness_max_topic_depth_by_subject: modeConfigs.s2_enabled?.s2?.readinessMaxTopicDepthBySubject || {},
    s2_readiness_subject_allowlist: modeConfigs.s2_enabled?.s2?.readinessSubjectAllowlist || [],
    round_aborted: roundAborted,
  };

  const summary = summarizeS2AugmentationEval({
    s1Rows,
    s2Rows,
    dataset: toRel(datasetFile),
    manifest,
    runConfig,
    corpusCoverageSummary,
  });
  if (roundAborted) summary.status = 'warn';

  fs.mkdirSync(path.dirname(outSummary), { recursive: true });
  fs.mkdirSync(path.dirname(outReport), { recursive: true });
  fs.writeFileSync(outSummary, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outReport, renderS2AugmentationEvalReport(summary), 'utf8');
  process.stdout.write(`${outSummary}\n${outReport}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});

