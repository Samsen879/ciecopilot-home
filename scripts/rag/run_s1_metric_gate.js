#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RUNS_DIR = path.join(ROOT, 'runs', 'backend');
const REPORTS_DIR = path.join(ROOT, 'docs', 'reports');
const LIVE_JSON = path.join(RUNS_DIR, 'rag_live_benchmark_latest.json');
const LIVE_MD = path.join(REPORTS_DIR, 'rag_live_benchmark_latest.md');
const LIVE_FAILURES = path.join(RUNS_DIR, 'rag_live_benchmark_failures.jsonl');
const ORCHESTRATION_FILE = path.join(RUNS_DIR, 'rag_s1_metric_gate_orchestration.json');

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

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT, shell: false });
  return {
    status: result.status ?? 1,
    signal: result.signal ?? null,
  };
}

function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) return null;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return path.relative(ROOT, dest).replace(/\\/g, '/');
}

function copyLatest(roundLabel) {
  const roundJson = path.join(RUNS_DIR, `rag_live_benchmark_${roundLabel}.json`);
  const roundMd = path.join(REPORTS_DIR, `rag_live_benchmark_${roundLabel}.md`);
  const roundFailures = path.join(RUNS_DIR, `rag_live_benchmark_${roundLabel}_failures.jsonl`);
  return {
    json: copyIfExists(LIVE_JSON, roundJson),
    md: copyIfExists(LIVE_MD, roundMd),
    failures: copyIfExists(LIVE_FAILURES, roundFailures),
  };
}

function loadJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function buildBenchmarkArgs({ fastSmoke }) {
  if (!fastSmoke) return [];
  return ['--limit', '20', '--round-timeout-ms', '180000'];
}

function buildPayload({ fastSmoke, advisory, stageResults }) {
  const latest = loadJsonIfExists(LIVE_JSON);
  return {
    generated_at: new Date().toISOString(),
    fast_smoke: fastSmoke,
    advisory_mode: advisory,
    latest_source: fs.existsSync(LIVE_JSON) ? path.relative(ROOT, LIVE_JSON).replace(/\\/g, '/') : null,
    latest_status: latest?.status || 'missing',
    stage_results: stageResults,
  };
}

function writeOrchestration(payload) {
  fs.mkdirSync(path.dirname(ORCHESTRATION_FILE), { recursive: true });
  fs.writeFileSync(ORCHESTRATION_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function main() {
  const argv = parseCliArgs(process.argv.slice(2));
  const advisory = String(process.env.RAG_METRIC_GATE_ADVISORY || 'false').toLowerCase() === 'true';
  const fastSmoke = argv['fast-smoke'] === true || argv['fast-smoke'] === 'true';
  const benchmarkArgs = buildBenchmarkArgs({ fastSmoke });
  const stageResults = [];

  const build = run(process.execPath, ['scripts/rag/build_live_benchmark_set.js']);
  stageResults.push({
    stage: 'build_live_benchmark_set',
    command: [process.execPath, 'scripts/rag/build_live_benchmark_set.js'],
    exit_code: build.status,
    signal: build.signal,
  });

  const round1 = run(process.execPath, ['scripts/rag/run_live_benchmark.js', ...benchmarkArgs]);
  stageResults.push({
    stage: 'round1',
    command: [process.execPath, 'scripts/rag/run_live_benchmark.js', ...benchmarkArgs],
    exit_code: round1.status,
    signal: round1.signal,
    artifacts: copyLatest('round1'),
  });

  const round2 = run(process.execPath, ['scripts/rag/run_live_benchmark.js', ...benchmarkArgs]);
  stageResults.push({
    stage: 'round2',
    command: [process.execPath, 'scripts/rag/run_live_benchmark.js', ...benchmarkArgs],
    exit_code: round2.status,
    signal: round2.signal,
    artifacts: copyLatest('round2'),
  });

  const stability = run(process.execPath, ['scripts/rag/run_live_stability_summary.js']);
  stageResults.push({
    stage: 'stability',
    command: [process.execPath, 'scripts/rag/run_live_stability_summary.js'],
    exit_code: stability.status,
    signal: stability.signal,
    artifact: fs.existsSync(path.join(RUNS_DIR, 'rag_live_benchmark_stability.json'))
      ? 'runs/backend/rag_live_benchmark_stability.json'
      : null,
  });

  stageResults.push({
    stage: 'summary',
    command: [process.execPath, 'scripts/rag/run_s1_metric_gate_summary.js'],
    exit_code: null,
    signal: null,
    artifact: 'runs/backend/rag_s1_metric_gate_summary.json',
  });
  writeOrchestration(buildPayload({ fastSmoke, advisory, stageResults }));

  const summary = run(process.execPath, ['scripts/rag/run_s1_metric_gate_summary.js']);
  stageResults[stageResults.length - 1].exit_code = summary.status;
  stageResults[stageResults.length - 1].signal = summary.signal;
  writeOrchestration(buildPayload({ fastSmoke, advisory, stageResults }));
  run(process.execPath, ['scripts/rag/run_s1_metric_gate_summary.js']);

  process.stdout.write(`${ORCHESTRATION_FILE}\n`);

  const hasStageFailure = stageResults.some((stage) => stage.exit_code !== 0 && stage.exit_code !== null);
  if (hasStageFailure && !advisory && !fastSmoke) {
    process.exit(1);
  }
  process.exit(0);
}

main();
