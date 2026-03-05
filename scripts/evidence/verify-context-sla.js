#!/usr/bin/env node
// scripts/evidence/verify-context-sla.js
// Context API SLA verifier for Requirement 9.4 (P95 <= 200ms).
//
// Example:
//   node scripts/evidence/verify-context-sla.js \
//     --url http://localhost:3001/api/evidence/context \
//     --topic-path 9709.p1.algebra.quadratics \
//     --token <JWT> \
//     --runs 50 --warmup 5 --max-p95-ms 200

import { performance } from 'node:perf_hooks';

function parseArgs(argv) {
  const args = {
    url: null,
    topicPath: null,
    token: null,
    limit: 10,
    runs: 50,
    warmup: 5,
    maxP95Ms: 200,
    timeoutMs: 5000,
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url' && i + 1 < argv.length) args.url = argv[++i];
    else if (a.startsWith('--url=')) args.url = a.slice('--url='.length);
    else if (a === '--topic-path' && i + 1 < argv.length) args.topicPath = argv[++i];
    else if (a.startsWith('--topic-path=')) args.topicPath = a.slice('--topic-path='.length);
    else if (a === '--token' && i + 1 < argv.length) args.token = argv[++i];
    else if (a.startsWith('--token=')) args.token = a.slice('--token='.length);
    else if (a === '--limit' && i + 1 < argv.length) args.limit = toInt(argv[++i], args.limit);
    else if (a.startsWith('--limit=')) args.limit = toInt(a.slice('--limit='.length), args.limit);
    else if (a === '--runs' && i + 1 < argv.length) args.runs = toInt(argv[++i], args.runs);
    else if (a.startsWith('--runs=')) args.runs = toInt(a.slice('--runs='.length), args.runs);
    else if (a === '--warmup' && i + 1 < argv.length) args.warmup = toInt(argv[++i], args.warmup);
    else if (a.startsWith('--warmup=')) args.warmup = toInt(a.slice('--warmup='.length), args.warmup);
    else if (a === '--max-p95-ms' && i + 1 < argv.length) args.maxP95Ms = toInt(argv[++i], args.maxP95Ms);
    else if (a.startsWith('--max-p95-ms=')) args.maxP95Ms = toInt(a.slice('--max-p95-ms='.length), args.maxP95Ms);
    else if (a === '--timeout-ms' && i + 1 < argv.length) args.timeoutMs = toInt(argv[++i], args.timeoutMs);
    else if (a.startsWith('--timeout-ms=')) args.timeoutMs = toInt(a.slice('--timeout-ms='.length), args.timeoutMs);
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
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(idx, 0), sorted.length - 1)];
}

async function fetchOnce({ url, topicPath, limit, token, timeoutMs }) {
  const u = new URL(url);
  u.searchParams.set('topic_path', topicPath);
  u.searchParams.set('limit', String(limit));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();

  try {
    const res = await fetch(u, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    const elapsedMs = performance.now() - start;
    return {
      ok: res.status === 200,
      status: res.status,
      elapsedMs,
    };
  } catch (err) {
    const elapsedMs = performance.now() - start;
    return {
      ok: false,
      status: 0,
      elapsedMs,
      error: err?.message || String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const args = parseArgs(process.argv);

  const warmupResults = [];
  for (let i = 0; i < args.warmup; i++) {
    warmupResults.push(await fetchOnce(args));
  }

  const measured = [];
  for (let i = 0; i < args.runs; i++) {
    measured.push(await fetchOnce(args));
  }

  const successfulLatencies = measured
    .filter(r => r.ok)
    .map(r => r.elapsedMs);
  const failed = measured.filter(r => !r.ok);

  const p50 = percentile(successfulLatencies, 50);
  const p95 = percentile(successfulLatencies, 95);
  const p99 = percentile(successfulLatencies, 99);
  const avg = successfulLatencies.length
    ? successfulLatencies.reduce((sum, n) => sum + n, 0) / successfulLatencies.length
    : null;

  const pass = failed.length === 0
    && successfulLatencies.length === args.runs
    && p95 !== null
    && p95 <= args.maxP95Ms;

  const summary = {
    event: 'context_sla_verification',
    url: args.url,
    topic_path: args.topicPath,
    limit: args.limit,
    warmup_runs: args.warmup,
    measured_runs: args.runs,
    successful_runs: successfulLatencies.length,
    failed_runs: failed.length,
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

  console.log(JSON.stringify(summary, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(JSON.stringify({
    event: 'context_sla_verification_failed',
    error: err?.message || String(err),
    ts: new Date().toISOString(),
  }));
  process.exit(1);
});

