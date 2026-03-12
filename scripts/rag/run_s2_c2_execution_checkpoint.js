#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const SCRIPT_FILE = fileURLToPath(import.meta.url);
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_c2_execution_checkpoint.json');

const REQUIRED_INPUTS = Object.freeze({
  preflight: 'runs/backend/rag_s2_preflight.json',
  c1_checkpoint: 'runs/backend/rag_s2_c1_classifier_gate.json',
  s1_contract_gate: 'runs/backend/rag_s1_contract_gate_summary.json',
  s1_metric_gate: 'runs/backend/rag_s1_metric_gate_summary.json',
});

const CHECK_TESTS = Object.freeze([
  'api/rag/__tests__/ask-service.test.js',
  'api/rag/__tests__/s2-multi-hop-retriever.test.js',
  'api/rag/__tests__/s2-fallback-controller.test.js',
  'api/rag/__tests__/s2-boundary-contract-non-regression.test.js',
  'api/rag/__tests__/output-contract.test.js',
  'api/rag/__tests__/boundary.contract.test.js',
]);

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJsonIfExists(relPath) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return null;
  }
}

function runJestCase(testPath) {
  const result = spawnSync(
    process.execPath,
    ['--experimental-vm-modules', 'node_modules/jest/bin/jest.js', testPath, '--runInBand'],
    { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' },
  );
  return {
    test_path: testPath,
    ok: result.status === 0,
    exit_code: result.status ?? 1,
    stderr_tail: String(result.stderr || '').split('\n').slice(-20).join('\n'),
  };
}

function main() {
  const inputStatus = Object.fromEntries(
    Object.entries(REQUIRED_INPUTS).map(([name, relPath]) => [
      name,
      {
        path: relPath,
        exists: fs.existsSync(path.join(ROOT, relPath)),
      },
    ]),
  );

  const preflight = readJsonIfExists(REQUIRED_INPUTS.preflight);
  const c1 = readJsonIfExists(REQUIRED_INPUTS.c1_checkpoint);
  const s1Contract = readJsonIfExists(REQUIRED_INPUTS.s1_contract_gate);
  const s1Metric = readJsonIfExists(REQUIRED_INPUTS.s1_metric_gate);
  const testResults = CHECK_TESTS.map(runJestCase);
  const testsAllGreen = testResults.every((item) => item.ok);

  const checks = [
    {
      id: 'inputs_present',
      ok: Object.values(inputStatus).every((item) => item.exists),
      details: inputStatus,
    },
    {
      id: 'c1_checkpoint_passed',
      ok: c1?.status === 'pass' && c1?.gate?.checkpoint === 'C1',
      details: {
        status: c1?.status || null,
        checkpoint: c1?.gate?.checkpoint || null,
      },
    },
    {
      id: 's2_tests_green',
      ok: testsAllGreen,
      details: {
        tests: testResults.map((item) => ({
          test_path: item.test_path,
          ok: item.ok,
          exit_code: item.exit_code,
        })),
      },
      diagnostics: testResults
        .filter((item) => !item.ok)
        .map((item) => ({
          test_path: item.test_path,
          stderr_tail: item.stderr_tail,
        })),
    },
    {
      id: 's1_required_gates_unchanged_and_green',
      ok:
        preflight?.defaults_frozen?.required_gates_unchanged?.includes('S1 Contract Gate') === true &&
        preflight?.defaults_frozen?.required_gates_unchanged?.includes('S1 Metric Gate (Required)') === true &&
        s1Contract?.all_green === true &&
        s1Metric?.status === 'pass' &&
        s1Metric?.gate_mode === 'required_fail_closed',
      details: {
        required_gates_unchanged: preflight?.defaults_frozen?.required_gates_unchanged || [],
        s1_contract_all_green: s1Contract?.all_green ?? null,
        s1_metric_status: s1Metric?.status || null,
        s1_metric_gate_mode: s1Metric?.gate_mode || null,
      },
    },
  ];

  const failedTests = new Set(testResults.filter((item) => !item.ok).map((item) => item.test_path));
  const blockedReasons = [];
  if (
    failedTests.has('api/rag/__tests__/ask-service.test.js') ||
    failedTests.has('api/rag/__tests__/s2-fallback-controller.test.js')
  ) {
    blockedReasons.push('s2_exception_without_fallback');
  }
  if (
    failedTests.has('api/rag/__tests__/s2-boundary-contract-non-regression.test.js') ||
    failedTests.has('api/rag/__tests__/boundary.contract.test.js')
  ) {
    blockedReasons.push('s2_boundary_regression');
  }
  if (
    failedTests.has('api/rag/__tests__/output-contract.test.js') ||
    failedTests.has('api/rag/__tests__/s2-boundary-contract-non-regression.test.js')
  ) {
    blockedReasons.push('fallback_contract_regression');
  }
  if (!checks.find((item) => item.id === 's1_required_gates_unchanged_and_green')?.ok) {
    blockedReasons.push('s1_required_gate_regression');
  }
  if (!checks.find((item) => item.id === 'inputs_present')?.ok) {
    blockedReasons.push('required_inputs_missing');
  }

  const payload = {
    generated_at: new Date().toISOString(),
    stage: 'rag_s2_checkpoint_c2',
    run_config: {
      script: toRel(SCRIPT_FILE),
      required_inputs: REQUIRED_INPUTS,
      tests: CHECK_TESTS,
    },
    inputs: inputStatus,
    checks,
    status: blockedReasons.length === 0 ? 'pass' : 'fail',
    blocked_reasons: blockedReasons,
    gate: {
      checkpoint: 'C2',
      self_check_passed: blockedReasons.length === 0,
      requires_user_confirmation: true,
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${toRel(OUT_FILE)}\n`);

  if (payload.status !== 'pass') {
    process.exit(1);
  }
}

main();
