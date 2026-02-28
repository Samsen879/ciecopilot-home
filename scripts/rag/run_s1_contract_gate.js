#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s1_contract_gate_summary.json');

const TESTS = [
  'api/rag/__tests__/boundary.contract.test.js',
  'api/rag/__tests__/output-contract.test.js',
  'api/rag/__tests__/weighted-rrf.test.js',
  'api/rag/__tests__/query-normalizer.test.js',
  'api/rag/__tests__/ask-service.test.js',
  'api/rag/__tests__/marking-isolation.test.js',
];

function runOne(testPath) {
  const result = spawnSync(
    process.execPath,
    ['--experimental-vm-modules', 'node_modules/jest/bin/jest.js', testPath, '--runInBand'],
    { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' },
  );
  return {
    test_path: testPath,
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function main() {
  const checks = TESTS.map(runOne);
  const allGreen = checks.every((x) => x.ok);
  const payload = {
    generated_at: new Date().toISOString(),
    all_green: allGreen,
    checks: checks.map((x) => ({
      test_path: x.test_path,
      ok: x.ok,
      status: x.status,
    })),
  };
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  if (!allGreen) {
    for (const check of checks) {
      if (!check.ok) {
        process.stderr.write(`\n[FAILED] ${check.test_path}\n`);
        process.stderr.write(check.stderr || check.stdout);
      }
    }
    process.exit(1);
  }
  process.stdout.write(`${OUT_FILE}\n`);
}

main();

