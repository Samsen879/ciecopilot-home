import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';

import {
  CONTROL_PLANE_LATEST_VERSION,
  createCompletionReviewRecord,
  createControlPlaneSchema,
  createEmptyControlPlaneState,
} from '../../scripts/ao/lib/state-contracts.js';

const mockSpawnSync = jest.fn();
const mockExistsSync = jest.fn();
const mockStatSync = jest.fn();

jest.unstable_mockModule('node:child_process', () => ({
  spawnSync: mockSpawnSync,
}));

jest.unstable_mockModule('node:fs', async () => {
  const actual = await jest.requireActual('node:fs');
  return {
    ...actual,
    existsSync: mockExistsSync,
    statSync: mockStatSync,
  };
});

const { runCli: runReconcileCli } = await import('../../scripts/ao-reconcile.js');
const { runCli: runDoctorCli } = await import('../../scripts/ao-doctor.js');
const { runCli: runLifecycleCli } = await import('../../scripts/ao-lifecycle.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.join(__dirname, 'fixtures', 'acceptance');
const PROJECT_ID = 'ciecopilot-home';
const ORIGINAL_CWD = process.cwd();
const tempDirs = [];

const SCENARIOS = {
  'clean-pr-continuity': {
    prNumber: 91,
    fixtureDir: path.join(FIXTURE_ROOT, 'clean-pr-continuity'),
    githubFixture: 'github-pr-91.json',
    currentBranch: 'feat/issue-91',
    headSha: '910abc',
  },
  'ci-failed-pr': {
    prNumber: 92,
    fixtureDir: path.join(FIXTURE_ROOT, 'ci-failed-pr'),
    githubFixture: 'github-pr-92.json',
    currentBranch: 'feat/issue-92',
    headSha: 'abc123',
  },
  'approved-and-green-pr': {
    prNumber: 93,
    fixtureDir: path.join(FIXTURE_ROOT, 'approved-and-green-pr'),
    githubFixture: 'github-pr-93.json',
    currentBranch: 'feat/issue-93',
    headSha: '93abc0',
  },
  'orphaned-ownership': {
    prNumber: 94,
    fixtureDir: path.join(FIXTURE_ROOT, 'orphaned-ownership'),
    githubFixture: 'github-pr-94.json',
    currentBranch: 'feat/issue-94',
    headSha: '94abc0',
  },
  'stale-worker-ownership': {
    prNumber: 95,
    fixtureDir: path.join(FIXTURE_ROOT, 'stale-worker-ownership'),
    githubFixture: 'github-pr-95.json',
    currentBranch: 'feat/issue-95',
    headSha: '95abc0',
  },
  'ambiguous-cross-source-disagreement': {
    prNumber: 96,
    fixtureDir: path.join(FIXTURE_ROOT, 'ambiguous-cross-source-disagreement'),
    githubFixture: 'github-pr-96.json',
    currentBranch: 'feat/issue-96',
    headSha: '96abc0',
  },
};

let activeScenario = null;
let activeRepoRoot = null;

function fixture(name) {
  return fs.readFileSync(path.join(activeScenario.fixtureDir, name), 'utf8');
}

function success(stdout) {
  return {
    status: 0,
    stdout,
    stderr: '',
  };
}

function useScenario(name) {
  activeScenario = SCENARIOS[name];
  activeRepoRoot = null;
  if (!activeScenario) {
    throw new Error(`Unknown scenario: ${name}`);
  }

  mockSpawnSync.mockImplementation((command, args) => {
    if (command === 'ao') {
      expect(args).toEqual(['status', '-p', 'ciecopilot-home', '--json']);
      return success(fixture('ao-status.json'));
    }

    if (command === 'gh') {
      expect(args).toEqual([
        'pr',
        'view',
        String(activeScenario.prNumber),
        '--json',
        'number,state,headRefName,headRefOid,reviewDecision,mergeStateStatus,isDraft,statusCheckRollup,url,reviews',
      ]);
      return success(fixture(activeScenario.githubFixture));
    }

    if (command === 'git' && args[0] === 'rev-parse' && args[1] === '--show-toplevel') {
      return success(`${activeRepoRoot ?? '/home/samsen/code/ciecopilot-home'}\n`);
    }
    if (command === 'git' && args[0] === 'branch' && args[1] === '--show-current') {
      return success(`${activeScenario.currentBranch}\n`);
    }
    if (command === 'git' && args[0] === 'rev-parse' && args[1] === 'HEAD') {
      return success(`${activeScenario.headSha}\n`);
    }
    if (command === 'git' && args[0] === 'rev-parse' && args[1] === '--abbrev-ref') {
      return success(`origin/${activeScenario.currentBranch}\n`);
    }
    if (command === 'git' && args[0] === 'status') {
      return success(`## ${activeScenario.currentBranch}...origin/${activeScenario.currentBranch}\n`);
    }

    throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
  });
}

function createTempRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-lifecycle-acceptance-'));
  tempDirs.push(repoRoot);
  fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
  return repoRoot;
}

function seedAcceptedCompletionReview({
  repoRoot,
  prNumber,
  branchName,
  headSha,
  implementationOwnerSessionName,
  reviewerSessionName,
} = {}) {
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
}

describe('ao lifecycle acceptance', () => {
  beforeEach(() => {
    mockSpawnSync.mockReset();
    mockExistsSync.mockReset();
    mockStatSync.mockReset();
    mockExistsSync.mockReturnValue(false);
  });

  afterEach(() => {
    activeRepoRoot = null;
    process.chdir(ORIGINAL_CWD);
    while (tempDirs.length) {
      fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
    }
  });

  it('keeps clean continuity visible while release readiness stays ambiguous on review-pending PRs', async () => {
    useScenario('clean-pr-continuity');
    const stdout = [];

    const result = await runReconcileCli(['--pr', '91', '--json', '--strict'], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(12);
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      top_status: 'ambiguous',
      automation_disposition: 'human_gate',
      pr_assessments: [
        {
          pr_number: 91,
          ownership: {
            status: 'clear',
            owner_session: 'cie-91',
          },
          release_readiness: {
            status: 'ambiguous',
            basis: ['review_pending'],
          },
        },
      ],
    });
  });

  it('blocks orphaned PRs in reconcile and preserves the finding through doctor', async () => {
    useScenario('orphaned-ownership');
    const reconcileStdout = [];
    const doctorStdout = [];

    const reconcileResult = await runReconcileCli(['--pr', '94', '--json', '--strict'], {
      writeStdout: (text) => reconcileStdout.push(text),
      writeStderr: () => {},
    });
    const doctorResult = await runDoctorCli(['--pr', '94', '--json', '--strict'], {
      writeStdout: (text) => doctorStdout.push(text),
      writeStderr: () => {},
    });

    expect(reconcileResult.exitCode).toBe(11);
    expect(JSON.parse(reconcileStdout.join(''))).toMatchObject({
      top_status: 'blocked',
      pr_assessments: [
        {
          pr_number: 94,
          ownership: {
            status: 'orphaned',
          },
        },
      ],
      findings: expect.arrayContaining([
        expect.objectContaining({
          code: 'orphan_open_pr',
        }),
      ]),
    });

    expect(doctorResult.exitCode).toBe(21);
    expect(JSON.parse(doctorStdout.join(''))).toMatchObject({
      top_status: 'blocked',
      reconciliation_summary: {
        top_status: 'blocked',
      },
      findings: expect.arrayContaining([
        expect.objectContaining({
          code: 'orphan_open_pr',
          origin: 'reconciliation',
        }),
      ]),
    });
  });

  it('flags ambiguous AO and GitHub branch disagreement at reconcile time', async () => {
    useScenario('ambiguous-cross-source-disagreement');
    const stdout = [];

    const result = await runReconcileCli(['--pr', '96', '--json', '--strict'], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(12);
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      top_status: 'ambiguous',
      pr_assessments: [
        {
          pr_number: 96,
          ownership: {
            status: 'ambiguous',
            reason: 'branch_mismatch_with_github',
          },
        },
      ],
      findings: expect.arrayContaining([
        expect.objectContaining({
          code: 'ao_github_branch_disagreement',
        }),
      ]),
    });
    expect(JSON.parse(stdout.join('')).findings.map((finding) => finding.code)).not.toContain('multiple_candidate_workers');
  });

  it('keeps worker continuity and CI hold classification under realistic ci_failed inputs', async () => {
    useScenario('ci-failed-pr');
    const stdout = [];

    const result = await runLifecycleCli(['--pr', '92', '--trigger', 'ci_failed', '--json', '--strict'], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(31);
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      top_status: 'hold',
      routing_decision: {
        action: 'continue_current_worker',
        owner_session: 'cie-92',
        target_pr_number: 92,
        authoritative: true,
      },
      release_decision: {
        disposition: 'await_ci',
        authoritative: true,
      },
    });
  });

  it('routes orphaned ownership to successor handoff even when doctor carries reconciliation blockers', async () => {
    useScenario('orphaned-ownership');
    const stdout = [];

    const result = await runLifecycleCli(['--pr', '94', '--trigger', 'agent_exited', '--json', '--strict'], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(32);
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      top_status: 'handoff',
      routing_decision: {
        action: 'handoff_to_successor',
        owner_session: null,
        target_pr_number: 94,
        authoritative: true,
      },
    });
  });

  it('restores stale ownership instead of losing continuity entirely', async () => {
    useScenario('stale-worker-ownership');
    const stdout = [];

    const result = await runLifecycleCli(['--pr', '95', '--trigger', 'agent_exited', '--json', '--strict'], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(33);
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      top_status: 'human_gate',
      routing_decision: {
        action: 'restore_existing_worker',
        owner_session: 'cie-95',
        target_pr_number: 95,
        authoritative: true,
      },
      release_decision: {
        disposition: 'human_gate',
      },
    });
  });

  it('holds approved-and-green PRs at await_review when completion review is missing', async () => {
    useScenario('approved-and-green-pr');
    const stdout = [];

    const result = await runLifecycleCli(['--pr', '93', '--trigger', 'approved_and_green', '--json', '--strict'], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(31);
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      top_status: 'hold',
      routing_decision: {
        action: 'continue_current_worker',
        owner_session: 'cie-93',
        target_pr_number: 93,
        authoritative: true,
      },
      release_decision: {
        disposition: 'await_review',
        authoritative: true,
        basis: ['completion_review_missing'],
      },
      completion_review: {
        status: 'missing_review',
        satisfied: false,
      },
    });
  });

  it('notifies the human only when approved-and-green is truly clear end to end', async () => {
    useScenario('approved-and-green-pr');
    const stdout = [];
    const repoRoot = createTempRepo();

    activeRepoRoot = repoRoot;
    process.chdir(repoRoot);
    mockExistsSync.mockImplementation((targetPath) => fs.existsSync(targetPath));
    mockStatSync.mockImplementation((targetPath) => fs.statSync(targetPath));
    seedAcceptedCompletionReview({
      repoRoot,
      prNumber: 93,
      branchName: activeScenario.currentBranch,
      headSha: activeScenario.headSha,
      implementationOwnerSessionName: 'cie-93',
      reviewerSessionName: 'cie-reviewer-93',
    });

    const result = await runLifecycleCli(['--pr', '93', '--trigger', 'approved_and_green', '--json', '--strict'], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      top_status: 'continue',
      routing_decision: {
        action: 'continue_current_worker',
        owner_session: 'cie-93',
        target_pr_number: 93,
        authoritative: true,
      },
      release_decision: {
        disposition: 'notify_human_ready',
        authoritative: true,
      },
      completion_review: {
        review_id: 'completion-review-pr-93-accepted',
        status: 'accepted',
        satisfied: true,
        reviewer_distinct: true,
        reviewer_session_name: 'cie-reviewer-93',
        implementation_owner_session_name: 'cie-93',
        head_sha: '93abc0',
      },
    });
  });
});
