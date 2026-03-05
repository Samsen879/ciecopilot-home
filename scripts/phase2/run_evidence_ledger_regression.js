#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const TMP = path.join(ROOT, 'runs', 'backend', '_tmp_evidence_ledger_jest.json');
const OUT = path.join(ROOT, 'runs', 'backend', 'marking_ledger_upgrade_summary.json');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function main() {
  ensureDir(TMP);
  const cmd = process.platform === 'win32' ? 'node.exe' : 'node';
  const args = [
    '--experimental-vm-modules',
    'node_modules/jest/bin/jest.js',
    'tests/evidence-ledger',
    '--runInBand',
    '--json',
    `--outputFile=${TMP}`,
  ];

  const run = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' },
  });

  let summary = {
    generated_at: new Date().toISOString(),
    command: `${cmd} ${args.join(' ')}`,
    status: run.status === 0 ? 'pass' : 'fail',
    exit_code: run.status,
    suites_total: null,
    suites_passed: null,
    tests_total: null,
    tests_passed: null,
    failed_suites: [],
  };

  if (fs.existsSync(TMP)) {
    const json = JSON.parse(fs.readFileSync(TMP, 'utf8'));
    const failedSuites = (json.testResults || [])
      .filter((tr) => tr.status === 'failed')
      .map((tr) => tr.name);
    summary = {
      ...summary,
      suites_total: json.numTotalTestSuites ?? null,
      suites_passed: json.numPassedTestSuites ?? null,
      tests_total: json.numTotalTests ?? null,
      tests_passed: json.numPassedTests ?? null,
      failed_suites: failedSuites,
    };
  }

  ensureDir(OUT);
  fs.writeFileSync(OUT, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT}\n`);
  if (run.status !== 0) {
    process.exit(run.status || 1);
  }
}

main();

