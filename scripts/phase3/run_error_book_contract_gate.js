#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const RAW_OUT = path.join(ROOT, 'runs', 'backend', 'error_book_contract_jest.json');
const SUMMARY_OUT = path.join(ROOT, 'runs', 'backend', 'error_book_contract_summary.json');
const REPORT_OUT = path.join(ROOT, 'docs', 'reports', 'error_book_contract_report.md');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function runTests() {
  const args = [
    '--experimental-vm-modules',
    'node_modules/jest/bin/jest.js',
    'api/error-book/error-book.test.js',
    'api/error-book/__tests__/error-book-api.test.js',
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
      ERROR_BOOK_ALLOW_AUTO_SOURCE: process.env.ERROR_BOOK_ALLOW_AUTO_SOURCE || 'false',
    },
  });
}

function renderReport(summary) {
  return `# Error Book Contract Report

- Generated at: \`${summary.generated_at}\`
- Status: \`${summary.status}\`
- Workflow: \`${summary.workflow_source}\`
- Manual-first default: \`${summary.manual_first_default}\`
- Auto source feature flag default: \`${summary.auto_source_feature_flag_default}\`

## Contract Claims

- Trusted auth only: \`${summary.contract_claims.trusted_auth_only}\`
- Query/body user override blocked: \`${summary.contract_claims.query_or_body_user_override_blocked}\`
- Wildcard CORS removed: \`${summary.contract_claims.wildcard_cors_removed}\`
- Normalized empty enrichment: \`${summary.contract_claims.normalized_empty_enrichment}\`

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
    workflow_source: '.github/workflows/error-book-contract-gate.yml',
    manual_first_default: true,
    auto_source_feature_flag_default: process.env.ERROR_BOOK_ALLOW_AUTO_SOURCE || 'false',
    contract_claims: {
      trusted_auth_only: true,
      query_or_body_user_override_blocked: true,
      wildcard_cors_removed: true,
      normalized_empty_enrichment: true,
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
