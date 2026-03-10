#!/usr/bin/env node

import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { validateEvidenceContextPayload } from '../../api/evidence/lib/evidence-context-contract.js';

export function parseArgs(argv) {
  const args = {
    url: null,
    topicPath: null,
    token: null,
    limit: 10,
    runs: 50,
    warmup: 5,
    maxP95Ms: 200,
    timeoutMs: 5000,
    requireContract: true,
  };

  for (let i = 2; i < argv.length; i++) {
    const value = argv[i];
    if (value === '--url' && i + 1 < argv.length) args.url = argv[++i];
    else if (value.startsWith('--url=')) args.url = value.slice('--url='.length);
    else if (value === '--topic-path' && i + 1 < argv.length) args.topicPath = argv[++i];
    else if (value.startsWith('--topic-path=')) args.topicPath = value.slice('--topic-path='.length);
    else if (value === '--token' && i + 1 < argv.length) args.token = argv[++i];
    else if (value.startsWith('--token=')) args.token = value.slice('--token='.length);
    else if (value === '--limit' && i + 1 < argv.length) args.limit = toInt(argv[++i], args.limit);
    else if (value.startsWith('--limit=')) args.limit = toInt(value.slice('--limit='.length), args.limit);
    else if (value === '--runs' && i + 1 < argv.length) args.runs = toInt(argv[++i], args.runs);
    else if (value.startsWith('--runs=')) args.runs = toInt(value.slice('--runs='.length), args.runs);
    else if (value === '--warmup' && i + 1 < argv.length) args.warmup = toInt(argv[++i], args.warmup);
    else if (value.startsWith('--warmup=')) args.warmup = toInt(value.slice('--warmup='.length), args.warmup);
    else if (value === '--max-p95-ms' && i + 1 < argv.length) args.maxP95Ms = toInt(argv[++i], args.maxP95Ms);
    else if (value.startsWith('--max-p95-ms=')) args.maxP95Ms = toInt(value.slice('--max-p95-ms='.length), args.maxP95Ms);
    else if (value === '--timeout-ms' && i + 1 < argv.length) args.timeoutMs = toInt(argv[++i], args.timeoutMs);
    else if (value.startsWith('--timeout-ms=')) args.timeoutMs = toInt(value.slice('--timeout-ms='.length), args.timeoutMs);
    else if (value === '--require-contract' && i + 1 < argv.length) args.requireContract = toBoolean(argv[++i], args.requireContract);
    else if (value.startsWith('--require-contract=')) args.requireContract = toBoolean(value.slice('--require-contract='.length), args.requireContract);
  }

  if (!args.url || !args.topicPath || !args.token) {
    throw new Error('Missing required args: --url, --topic-path, --token');
  }
  if (args.runs < 1) throw new Error('--runs must be >= 1');
  if (args.warmup < 0) throw new Error('--warmup must be >= 0');
  if (args.limit < 1) throw new Error('--limit must be >= 1');
  if (args.timeoutMs < 1) throw new Error('--timeout-ms must be >= 1');

  return args;
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback) {
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return fallback;
}

export function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(index, 0), sorted.length - 1)];
}

export function validateMeasurementPayload(payload) {
  const result = validateEvidenceContextPayload(payload);
  return result.ok
    ? { ok: true, errors: [] }
    : { ok: false, errors: result.errors };
}

async function fetchOnce({ url, topicPath, limit, token, timeoutMs, requireContract }, fetchImpl = fetch) {
  const requestUrl = new URL(url);
  requestUrl.searchParams.set('topic_path', topicPath);
  requestUrl.searchParams.set('limit', String(limit));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();

  try {
    const response = await fetchImpl(requestUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    const elapsedMs = performance.now() - start;
    const rawBody = await response.text();
    let payload = null;

    if (rawBody) {
      try {
        payload = JSON.parse(rawBody);
      } catch (error) {
        return {
          ok: false,
          status: response.status,
          elapsedMs,
          error: 'response_body_not_json',
          details: error?.message || String(error),
        };
      }
    }

    if (response.status === 200 && requireContract) {
      const contract = validateMeasurementPayload(payload);
      if (!contract.ok) {
        return {
          ok: false,
          status: response.status,
          elapsedMs,
          error: 'response_contract_invalid',
          details: contract.errors,
        };
      }
    }

    return {
      ok: response.status === 200,
      status: response.status,
      elapsedMs,
      payload,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      elapsedMs: performance.now() - start,
      error: error?.message || String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

export function buildSummary(args, measured) {
  const successfulLatencies = measured
    .filter((result) => result.ok)
    .map((result) => result.elapsedMs);
  const failed = measured.filter((result) => !result.ok);

  const p50 = percentile(successfulLatencies, 50);
  const p95 = percentile(successfulLatencies, 95);
  const p99 = percentile(successfulLatencies, 99);
  const avg = successfulLatencies.length
    ? successfulLatencies.reduce((sum, latency) => sum + latency, 0) / successfulLatencies.length
    : null;

  const pass = failed.length === 0
    && successfulLatencies.length === args.runs
    && p95 !== null
    && p95 <= args.maxP95Ms;

  return {
    event: 'context_sla_verification',
    url: args.url,
    topic_path: args.topicPath,
    limit: args.limit,
    warmup_runs: args.warmup,
    measured_runs: args.runs,
    successful_runs: successfulLatencies.length,
    failed_runs: failed.length,
    require_contract: args.requireContract,
    latency_ms: {
      p50,
      p95,
      p99,
      avg,
      max: successfulLatencies.length ? Math.max(...successfulLatencies) : null,
      min: successfulLatencies.length ? Math.min(...successfulLatencies) : null,
    },
    sla: {
      metric: 'p95_ms',
      threshold: args.maxP95Ms,
      pass,
    },
    failures: failed.slice(0, 5),
    ts: new Date().toISOString(),
  };
}

export async function main(argv = process.argv, { fetchImpl = fetch, logger = console } = {}) {
  const args = parseArgs(argv);

  for (let i = 0; i < args.warmup; i++) {
    await fetchOnce(args, fetchImpl);
  }

  const measured = [];
  for (let i = 0; i < args.runs; i++) {
    measured.push(await fetchOnce(args, fetchImpl));
  }

  const summary = buildSummary(args, measured);
  logger.log(JSON.stringify(summary, null, 2));
  return summary.sla.pass ? 0 : 1;
}

const isDirectExecution =
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectExecution) {
  main().then((exitCode) => {
    process.exit(exitCode);
  }).catch((error) => {
    console.error(JSON.stringify({
      event: 'context_sla_verification_failed',
      error: error?.message || String(error),
      ts: new Date().toISOString(),
    }));
    process.exit(1);
  });
}
