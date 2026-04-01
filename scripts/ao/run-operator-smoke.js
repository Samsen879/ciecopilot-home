#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  CONTROL_PLANE_LATEST_VERSION,
  createCompletionReviewRecord,
  createControlPlaneSchema,
  createEmptyControlPlaneState,
} from './lib/state-contracts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PROJECT_ID = 'ciecopilot-home';
const tempDirs = [];

const SCENARIOS = {
  'ci-failed-pr': {
    fixtureRoot: path.join(ROOT, 'tests', 'ao', 'fixtures', 'acceptance', 'ci-failed-pr'),
    steps: [
      {
        label: 'reconcile',
        script: 'scripts/ao-reconcile.js',
        args: ['--pr', '92', '--strict'],
        expectExitCode: 11,
        expectStdoutContains: [
          'top_status: blocked',
          'automation_disposition: pause',
          'ownership_summary: PR #92 clear via cie-92',
          'release_readiness_summary: PR #92 blocked',
        ],
      },
      {
        label: 'doctor',
        script: 'scripts/ao-doctor.js',
        args: ['--pr', '92', '--strict'],
        expectExitCode: 21,
        expectStdoutContains: [
          'top_status: blocked',
          'reconciliation_top_status: blocked',
          'current_branch: feat/issue-92',
        ],
      },
      {
        label: 'lifecycle',
        script: 'scripts/ao-lifecycle.js',
        args: ['--pr', '92', '--trigger', 'ci_failed', '--strict'],
        expectExitCode: 31,
        expectStdoutContains: [
          'top_status: hold',
          'routing: continue_current_worker owner=cie-92 authoritative=true',
          'release: await_ci authoritative=true',
        ],
      },
    ],
  },
  'approved-and-green-pr': {
    fixtureRoot: path.join(ROOT, 'tests', 'ao', 'fixtures', 'acceptance', 'approved-and-green-pr'),
    setupContext() {
      return {
        acceptedReviewRepoRoot: createAcceptedReviewRepo({
          prNumber: 93,
          branchName: 'feat/issue-93',
          headSha: '93abc0',
          implementationOwnerSessionName: 'cie-93',
          reviewerSessionName: 'cie-reviewer-93',
        }),
      };
    },
    steps: [
      {
        label: 'reconcile',
        script: 'scripts/ao-reconcile.js',
        args: ['--pr', '93', '--strict'],
        expectExitCode: 0,
        expectStdoutContains: [
          'top_status: healthy',
          'automation_disposition: continue',
          'ownership_summary: PR #93 clear via cie-93',
          'release_readiness_summary: PR #93 ready',
        ],
      },
      {
        label: 'doctor',
        script: 'scripts/ao-doctor.js',
        args: ['--pr', '93', '--strict'],
        expectExitCode: 0,
        expectStdoutContains: [
          'top_status: healthy',
          'reconciliation_top_status: healthy',
          'current_branch: feat/issue-93',
        ],
      },
      {
        label: 'lifecycle',
        script: 'scripts/ao-lifecycle.js',
        args: ['--pr', '93', '--trigger', 'approved_and_green', '--strict'],
        expectExitCode: 31,
        expectStdoutContains: [
          'top_status: hold',
          'routing: continue_current_worker owner=cie-93 authoritative=true',
          'release: await_review authoritative=true',
          'completion_review_missing',
        ],
      },
      {
        label: 'lifecycle-accepted-review',
        script: 'scripts/ao-lifecycle.js',
        args: ['--pr', '93', '--trigger', 'approved_and_green', '--strict'],
        cwdKey: 'acceptedReviewRepoRoot',
        expectExitCode: 0,
        expectStdoutContains: [
          'top_status: continue',
          'routing: continue_current_worker owner=cie-93 authoritative=true',
          'release: notify_human_ready authoritative=true',
        ],
      },
    ],
  },
};

function parseArgs(argv) {
  const options = {
    scenario: 'ci-failed-pr',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--scenario') {
      options.scenario = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!SCENARIOS[options.scenario]) {
    throw new Error(`Unknown scenario: ${options.scenario}`);
  }

  return options;
}

function renderHelp() {
  return [
    'Usage: node scripts/ao/run-operator-smoke.js [options]',
    '',
    'Options:',
    '  --scenario <name>       Smoke scenario. Default: ci-failed-pr',
    '  -h, --help              Show help',
    '',
    `Available scenarios: ${Object.keys(SCENARIOS).join(', ')}`,
  ].join('\n');
}

function createTempRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-operator-smoke-'));
  tempDirs.push(repoRoot);
  fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
  return repoRoot;
}

function createAcceptedReviewRepo({
  prNumber,
  branchName,
  headSha,
  implementationOwnerSessionName,
  reviewerSessionName,
} = {}) {
  const repoRoot = createTempRepo();
  const stateRoot = path.join(repoRoot, '.ao-control-plane', PROJECT_ID);
  const schemaPath = path.join(stateRoot, 'schema.json');
  const statePath = path.join(stateRoot, 'state.json');
  const recordedAt = '2026-03-29T07:10:00.000Z';
  const schema = createControlPlaneSchema({
    project_id: PROJECT_ID,
    current_version: CONTROL_PLANE_LATEST_VERSION,
    latest_version: CONTROL_PLANE_LATEST_VERSION,
    created_at: recordedAt,
    updated_at: recordedAt,
    applied_migrations: [],
  });
  const state = createEmptyControlPlaneState({
    project_id: PROJECT_ID,
    created_at: recordedAt,
    updated_at: recordedAt,
  });

  state.completion_reviews.push(createCompletionReviewRecord({
    review_id: `completion-review-pr-${prNumber}-accepted`,
    pr_number: prNumber,
    branch_name: branchName,
    head_sha: headSha,
    status: 'accepted',
    validity_status: 'active',
    requested_at: recordedAt,
    updated_at: recordedAt,
    reviewed_at: recordedAt,
    reviewer_session_name: reviewerSessionName,
    reviewer_session_id: reviewerSessionName,
    implementation_owner_session_name: implementationOwnerSessionName,
    implementation_owner_session_id: implementationOwnerSessionName,
    verdict: 'accepted',
    reason_codes: ['completion_review_accepted'],
    findings: [],
    evidence_refs: [{
      source: 'github',
      kind: 'review',
      id: 'completion-review-93',
      summary: 'Independent completion review accepted the PR head.',
    }],
  }));

  fs.mkdirSync(stateRoot, { recursive: true });
  fs.writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`, 'utf8');
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  return repoRoot;
}

function cleanupTempDirs() {
  while (tempDirs.length) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
}

function runStep(step, fixtureRoot, context = {}) {
  const stepCwd = step.cwdKey ? context[step.cwdKey] : ROOT;
  const scriptPath = path.join(ROOT, step.script);
  const result = spawnSync(process.execPath, [scriptPath, ...step.args], {
    cwd: stepCwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      AO_FIXTURE_ROOT: fixtureRoot,
    },
  });

  const stdout = String(result.stdout ?? '');
  const stderr = String(result.stderr ?? '');
  const exitCode = result.status ?? 1;

  if (exitCode !== step.expectExitCode) {
    throw new Error([
      `${step.label} exit code mismatch: expected ${step.expectExitCode}, received ${exitCode}`,
      stdout.trim(),
      stderr.trim(),
    ].filter(Boolean).join('\n'));
  }

  for (const fragment of step.expectStdoutContains) {
    if (!stdout.includes(fragment)) {
      throw new Error([
        `${step.label} output missing expected fragment: ${fragment}`,
        stdout.trim(),
      ].filter(Boolean).join('\n'));
    }
  }

  return stdout.trim();
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(renderHelp());
    process.exit(0);
  }

  const scenario = SCENARIOS[options.scenario];
  const context = scenario.setupContext ? scenario.setupContext() : {};

  try {
    console.log(`ao smoke scenario: ${options.scenario}`);
    console.log(`fixture_root: ${scenario.fixtureRoot}`);

    for (const step of scenario.steps) {
      const summary = runStep(step, scenario.fixtureRoot, context);
      console.log('');
      console.log(`## ${step.label}`);
      console.log(summary);
    }
  } finally {
    cleanupTempDirs();
  }
} catch (error) {
  cleanupTempDirs();
  console.error(error.message);
  process.exitCode = 1;
}
