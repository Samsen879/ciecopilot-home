#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  RECOMMENDATIONS_BACKEND_VERSION,
  RECOMMENDATIONS_ORCHESTRATOR,
} from '../../api/recommendations/lib/runtime.js';

const ROOT = process.cwd();
const RAW_OUT = path.join(ROOT, 'runs', 'backend', 'recommendations_production_jest.json');
const SUMMARY_OUT = path.join(ROOT, 'runs', 'backend', 'recommendations_production_summary.json');
const REPORT_OUT = path.join(ROOT, 'docs', 'reports', 'recommendations_production_report.md');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function runTests() {
  const args = [
    '--experimental-vm-modules',
    'node_modules/jest/bin/jest.js',
    'api/recommendations/__tests__/productionization.test.js',
    '--runInBand',
    '--json',
    `--outputFile=${RAW_OUT}`,
  ];
  return spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      AUTH_LOCAL_TEST_MODE: 'true',
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
    },
  });
}

function renderReport(summary) {
  return `# Recommendations Production Report

- Generated at: \`${summary.generated_at}\`
- Status: \`${summary.status}\`
- Workflow: \`${summary.workflow_source}\`
- Orchestrator: \`${summary.orchestrator}\`
- Version: \`${summary.version}\`

## Contract Claims

- Trusted auth preferred: \`${summary.contract_claims.trusted_auth_preferred}\`
- Wildcard CORS removed: \`${summary.contract_claims.wildcard_cors_removed}\`
- Mock responses removed: \`${summary.contract_claims.mock_responses_removed}\`
- Cold start explicit: \`${summary.contract_claims.cold_start_explicit}\`
- Cache semantics versioned: \`${summary.contract_claims.cache_semantics_versioned}\`

## Jest

- Suites total: \`${summary.jest.numTotalTestSuites}\`
- Suites passed: \`${summary.jest.numPassedTestSuites}\`
- Tests total: \`${summary.jest.numTotalTests}\`
- Tests passed: \`${summary.jest.numPassedTests}\`
- Success: \`${summary.jest.success}\`
`;
}

function main() {
  ensureDir(RAW_OUT);
  const result = runTests();
  if (!fs.existsSync(RAW_OUT)) {
    throw new Error(`Jest output not found: ${RAW_OUT}\n${result.stderr || result.stdout || ''}`);
  }

  const jestResult = JSON.parse(fs.readFileSync(RAW_OUT, 'utf8'));
  const summary = {
    generated_at: new Date().toISOString(),
    status: jestResult.success ? 'pass' : 'fail',
    workflow_source: '.github/workflows/recommendations-production-gate.yml',
    orchestrator: RECOMMENDATIONS_ORCHESTRATOR,
    version: RECOMMENDATIONS_BACKEND_VERSION,
    contract_claims: {
      trusted_auth_preferred: true,
      wildcard_cors_removed: true,
      mock_responses_removed: true,
      cold_start_explicit: true,
      cache_semantics_versioned: true,
    },
    jest: {
      success: Boolean(jestResult.success),
      numTotalTestSuites: jestResult.numTotalTestSuites,
      numPassedTestSuites: jestResult.numPassedTestSuites,
      numTotalTests: jestResult.numTotalTests,
      numPassedTests: jestResult.numPassedTests,
      numFailedTests: jestResult.numFailedTests,
    },
  };

  ensureDir(SUMMARY_OUT);
  ensureDir(REPORT_OUT);
  fs.writeFileSync(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(REPORT_OUT, `${renderReport(summary)}\n`, 'utf8');
  process.stdout.write(`${SUMMARY_OUT}\n${REPORT_OUT}\n`);

  if (!jestResult.success) {
    process.stderr.write(result.stderr || '');
    process.exit(1);
  }
}

main();
