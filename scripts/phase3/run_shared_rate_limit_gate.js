#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { listRoutes } from '../../api/_runtime/route-registry.js';

const ROOT = process.cwd();
const RAW_OUT = path.join(ROOT, 'runs', 'backend', 'shared_rate_limit_jest.json');
const SUMMARY_OUT = path.join(ROOT, 'runs', 'backend', 'shared_rate_limit_summary.json');
const REPORT_OUT = path.join(ROOT, 'docs', 'reports', 'shared_rate_limit_report.md');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function runTests() {
  const args = [
    '--experimental-vm-modules',
    'node_modules/jest/bin/jest.js',
    'api/__tests__/shared-rate-limit.test.js',
    '--runInBand',
    '--json',
    `--outputFile=${RAW_OUT}`,
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      AUTH_LOCAL_TEST_MODE: 'true',
      RATE_LIMIT_BACKEND: 'memory',
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
    },
  });
  return result;
}

function renderReport(summary) {
  return `# Shared Rate Limit Report

- Generated at: \`${summary.generated_at}\`
- Status: \`${summary.status}\`
- Production default backend: \`${summary.production_default_backend}\`
- Controlled degrade default: \`${summary.controlled_degrade_default}\`
- Workflow: \`${summary.workflow_source}\`

## Coverage

- Rate-limited modules: \`${summary.rate_limited_modules.join(', ')}\`
- Write-only route policies:
  - community: \`${summary.write_only_routes.community.join(', ')}\`
  - error-book: \`${summary.write_only_routes.error_book.join(', ')}\`

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
  const routes = listRoutes();
  const rateLimited = routes.filter((route) => route.hasRateLimit);
  const community = routes.find((route) => route.module === 'community');
  const errorBook = routes.find((route) => route.module === 'error-book');
  const errorBookId = routes.find((route) => route.module === 'error-book-id');

  const summary = {
    generated_at: new Date().toISOString(),
    status: jestResult.success ? 'pass' : 'fail',
    workflow_source: '.github/workflows/shared-rate-limit-gate.yml',
    production_default_backend: 'shared',
    controlled_degrade_default: true,
    rate_limited_modules: rateLimited.map((route) => route.module),
    write_only_routes: {
      community: community?.rateLimitMethods || [],
      error_book: [...new Set([...(errorBook?.rateLimitMethods || []), ...(errorBookId?.rateLimitMethods || [])])],
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
