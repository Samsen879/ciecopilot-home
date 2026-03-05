#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { executeAskAI } from '../../api/rag/lib/ask-service.js';
import { toRagErrorAudit } from '../../api/rag/lib/errors.js';
import {
  evaluateS13Case,
  renderS13BenchmarkReport,
  stabilizeRetrievalAudit,
  summarizeS13Rows,
} from './lib/s1_3_forced_retrieval.js';

dotenv.config();

const ROOT = process.cwd();
const DATASET_FILE = path.join(ROOT, 'data', 'eval', 'rag_s1_3_forced_retrieval_v1.json');
const MANIFEST_FILE = path.join(ROOT, 'data', 'eval', 'rag_s1_3_forced_retrieval_v1_manifest.json');
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_s1_3_forced_retrieval_summary.json');
const OUT_MD = path.join(ROOT, 'docs', 'reports', 'rag_s1_3_forced_retrieval.md');
const DEFAULT_PER_CASE_TIMEOUT_MS = 20_000;
const DEFAULT_ROUND_TIMEOUT_MS = 20 * 60 * 1000;
const DEFAULT_MAX_RETRIES = 2;
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

function toPositiveInt(value, fallback) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return fallback;
}

function createAbortError(code, message) {
  const error = new Error(message);
  error.name = 'AbortError';
  error.code = code;
  return error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    message.includes('econn') ||
    message.includes('etimedout') ||
    message.includes('unexpected eof') ||
    message.includes('tls') ||
    message.includes('scram') ||
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

function loadDataset(datasetPath, manifestPath) {
  if (!fs.existsSync(datasetPath)) {
    throw new Error(`Dataset not found: ${datasetPath}`);
  }
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;
  if (!Array.isArray(dataset)) {
    throw new Error('Dataset must be an array');
  }
  return { dataset, manifest };
}

function selectCases(dataset, argv) {
  const startIndex = Math.max(Number(argv['start-index'] || 0), 0);
  const limit = argv.limit ? toPositiveInt(argv.limit, dataset.length) : dataset.length;
  const caseId = argv['case-id'] ? String(argv['case-id']).trim() : null;

  if (caseId) {
    const target = dataset.find((item) => item.case_id === caseId);
    if (!target) {
      throw new Error(`case_id not found in dataset: ${caseId}`);
    }
    return [target];
  }

  return dataset.slice(startIndex, startIndex + limit);
}

async function runCase(item, { perCaseTimeoutMs, roundSignal }) {
  return runCaseWithRetry(item, {
    perCaseTimeoutMs,
    roundSignal,
    maxRetries: DEFAULT_MAX_RETRIES,
  });
}

async function runCaseOnce(item, { perCaseTimeoutMs, roundSignal }) {
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
          internal_debug: false,
          language: item.metadata?.language || 'en',
        },
        {
          req: {
            request_id: `s1-3-${item.case_id}`,
            auth_user: null,
          },
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
    const elapsed = Date.now() - started;
    const normalized = normalizeError(caseBundle.signal.aborted ? caseBundle.signal.reason || error : error);
    const errorAudit = toRagErrorAudit(normalized, {
      stage: normalized.benchmark_phase || 'execution',
    });
    return {
      response: {
        answer: '',
        uncertain: true,
        uncertain_reason_code: normalized.code === 'CASE_TIMEOUT' ? 'RETRIEVER_ERROR' : 'RETRIEVER_ERROR',
        topic_leakage_flag: false,
        topic_leakage_reason: null,
        evidence: [],
        retrieval_version: null,
        metrics: {
          evidence_traceability_rate: 0,
          cost_avg_usd_per_req: 0,
          cost_audit: null,
          retrieval_audit: {
            ...stabilizeRetrievalAudit({
              query_mode: 'execution_error',
              short_circuit_label: null,
              rpc_call_count: 0,
              hybrid_row_count: 0,
              dense_row_count: 0,
              lexical_row_count: 0,
              ...errorAudit,
              chat_mode: 'not_attempted',
            }),
          },
          latency_ms: elapsed,
        },
      },
      executionError: normalized,
      latencyMs: elapsed,
      attempts: 1,
    };
  } finally {
    caseBundle.cleanup();
  }
}

async function runCaseWithRetry(
  item,
  {
    perCaseTimeoutMs,
    roundSignal,
    maxRetries = DEFAULT_MAX_RETRIES,
  },
) {
  let finalResult = null;
  let attempts = 0;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (roundSignal?.aborted) {
      break;
    }
    attempts += 1;
    const result = await runCaseOnce(item, {
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
      response: null,
      executionError: createAbortError('CASE_ABORTED', 'case aborted before execution'),
      latencyMs: 0,
    }),
    attempts,
  };
}

async function main() {
  const argv = parseCliArgs(process.argv.slice(2));
  const perCaseTimeoutMs = toPositiveInt(argv['per-case-timeout-ms'], DEFAULT_PER_CASE_TIMEOUT_MS);
  const roundTimeoutMs = toPositiveInt(argv['round-timeout-ms'], DEFAULT_ROUND_TIMEOUT_MS);
  const maxRetries = toPositiveInt(argv['max-retries'], DEFAULT_MAX_RETRIES);

  const { dataset, manifest } = loadDataset(DATASET_FILE, MANIFEST_FILE);
  const selected = selectCases(dataset, argv);
  if (selected.length === 0) {
    throw new Error('No benchmark cases selected');
  }

  const roundBundle = createAbortBundle({
    timeoutMs: roundTimeoutMs,
    timeoutCode: 'ROUND_TIMEOUT',
    timeoutMessage: `round timed out after ${roundTimeoutMs}ms`,
  });

  const rows = [];
  let roundAborted = false;

  for (let i = 0; i < selected.length; i += 1) {
    if (roundBundle.signal.aborted) {
      roundAborted = true;
      break;
    }
    const item = selected[i];
    const { response, executionError, latencyMs, attempts } = await runCaseWithRetry(item, {
      perCaseTimeoutMs,
      roundSignal: roundBundle.signal,
      maxRetries,
    });
    const row = evaluateS13Case(item, response);
    row.execution_error = executionError ? serializeError(executionError) : null;
    row.latency_ms = latencyMs;
    row.retry_attempts = attempts;
    rows.push(row);
    process.stdout.write(
      `[${i + 1}/${selected.length}] case_id=${item.case_id} mode=${row.query_mode} pass=${row.case_pass} latency=${latencyMs}ms\n`,
    );
  }

  if (roundBundle.signal.aborted) {
    roundAborted = true;
  }
  roundBundle.cleanup();

  const runConfig = {
    dataset: path.relative(ROOT, DATASET_FILE).replace(/\\/g, '/'),
    manifest: path.relative(ROOT, MANIFEST_FILE).replace(/\\/g, '/'),
    selected_cases: rows.length,
    selected_cases_requested: selected.length,
    per_case_timeout_ms: perCaseTimeoutMs,
    round_timeout_ms: roundTimeoutMs,
    max_retries: maxRetries,
    start_index: Number(argv['start-index'] || 0),
    limit: argv.limit ? Number(argv.limit) : null,
    case_id: argv['case-id'] ? String(argv['case-id']) : null,
    round_aborted: roundAborted,
  };

  const summary = summarizeS13Rows(rows, manifest, runConfig);
  if (roundAborted) {
    summary.status = 'warn';
    summary.round_timeout = true;
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, renderS13BenchmarkReport(summary), 'utf8');
  process.stdout.write(`${OUT_JSON}\n${OUT_MD}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
