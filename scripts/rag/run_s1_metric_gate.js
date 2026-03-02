#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const advisory = String(process.env.RAG_METRIC_GATE_ADVISORY || 'false').toLowerCase() === 'true';
const ROOT = process.cwd();
const LIVE_JSON = path.join(ROOT, 'runs', 'backend', 'rag_live_benchmark_latest.json');
const LIVE_MD = path.join(ROOT, 'docs', 'reports', 'rag_live_benchmark_latest.md');

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', cwd: process.cwd(), shell: false });
  return result.status ?? 1;
}

function copyLatest(roundLabel) {
  const roundJson = path.join(ROOT, 'runs', 'backend', `rag_live_benchmark_${roundLabel}.json`);
  const roundMd = path.join(ROOT, 'docs', 'reports', `rag_live_benchmark_${roundLabel}.md`);
  if (fs.existsSync(LIVE_JSON)) fs.copyFileSync(LIVE_JSON, roundJson);
  if (fs.existsSync(LIVE_MD)) fs.copyFileSync(LIVE_MD, roundMd);
}

const buildStatus = run(process.execPath, ['scripts/rag/build_live_benchmark_set.js']);
if (buildStatus !== 0) process.exit(buildStatus);

const liveStatus1 = run(process.execPath, ['scripts/rag/run_live_benchmark.js']);
if (liveStatus1 !== 0 && !advisory) process.exit(liveStatus1);
copyLatest('round1');

const liveStatus2 = run(process.execPath, ['scripts/rag/run_live_benchmark.js']);
if (liveStatus2 !== 0 && !advisory) process.exit(liveStatus2);
copyLatest('round2');

const stabilityStatus = run(process.execPath, ['scripts/rag/run_live_stability_summary.js']);
if (stabilityStatus !== 0 && !advisory) process.exit(stabilityStatus);

const summaryStatus = run(process.execPath, ['scripts/rag/run_s1_metric_gate_summary.js']);
if (summaryStatus !== 0 && !advisory) process.exit(summaryStatus);

process.exit(0);
