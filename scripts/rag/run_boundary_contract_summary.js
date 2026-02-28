#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_boundary_contract_summary.json');

function runJest(testPath) {
  const result = spawnSync(
    process.execPath,
    ['--experimental-vm-modules', 'node_modules/jest/bin/jest.js', testPath, '--runInBand'],
    { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' },
  );
  return {
    test_path: testPath,
    status: result.status ?? 1,
    ok: result.status === 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function main() {
  const runs = [
    runJest('api/rag/__tests__/boundary.contract.test.js'),
  ];
  const allGreen = runs.every((x) => x.ok);

  const payload = {
    generated_at: new Date().toISOString(),
    all_green: allGreen,
    checks: runs.map((x) => ({
      test_path: x.test_path,
      ok: x.ok,
      status: x.status,
    })),
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  if (!allGreen) {
    process.stderr.write(runs.map((x) => x.stderr || x.stdout).join('\n'));
    process.exit(1);
  }
  process.stdout.write(`${OUT_FILE}\n`);
}

main();

