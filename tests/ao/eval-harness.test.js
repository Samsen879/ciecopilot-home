import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from '@jest/globals';

import { runAoEvalHarness } from '../../scripts/ao/lib/eval-harness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.join(__dirname, 'fixtures', 'eval');

describe('ao eval harness', () => {
  it('runs the full fixture-backed suite reproducibly across named packs', async () => {
    const result = await runAoEvalHarness({
      projectId: 'ciecopilot-home',
      fixtureRoot: FIXTURE_ROOT,
      packNames: ['all'],
    });

    expect(result).toMatchObject({
      schema_version: 'ao.eval-harness-run.v1alpha1',
      format: 'ao_eval_harness_run',
      project_id: 'ciecopilot-home',
      pack_ids: [
        'parity',
        'policy-fail-closed',
        'resume-continuity',
        'successor-handoff',
      ],
      scenario_ids: [
        'parity-ci-failed-pr',
        'parity-approved-and-green-pr',
        'parity-orphaned-ownership',
        'policy-unknown-tool-fail-closed',
        'resume-explicit-checkpoint',
        'handoff-successor-transfer',
      ],
      summary: {
        scenario_count: 6,
        passed_scenario_count: 6,
        failed_scenario_count: 0,
        replay_stable_scenario_count: 6,
        continuity_scenario_count: 2,
        continuity_success_count: 2,
      },
    });

    expect(result.scenario_results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        scenario_id: 'parity-ci-failed-pr',
        pack_id: 'parity',
        status: 'passed',
        verification: {
          status: 'passed',
          findings: [],
        },
        replay: expect.objectContaining({
          stable: true,
          fingerprint: expect.any(String),
        }),
        continuity: {
          kind: 'none',
          status: 'not_applicable',
          outcome: 'none',
        },
        metrics: expect.objectContaining({
          controller_run_count: 1,
          execution_attempt_count: 0,
          failure_class_counts: expect.objectContaining({
            ci_failure: 1,
          }),
        }),
      }),
      expect.objectContaining({
        scenario_id: 'policy-unknown-tool-fail-closed',
        pack_id: 'policy-fail-closed',
        status: 'passed',
        metrics: expect.objectContaining({
          controller_run_count: 1,
          measurement_count: 1,
          intervened_measurement_count: 1,
          intervention_counts: expect.objectContaining({
            policy_block: 2,
          }),
          failure_class_counts: expect.objectContaining({
            policy_block: 1,
          }),
        }),
      }),
      expect.objectContaining({
        scenario_id: 'resume-explicit-checkpoint',
        pack_id: 'resume-continuity',
        status: 'passed',
        continuity: {
          kind: 'resume',
          status: 'success',
          outcome: 'explicit_resume',
        },
        metrics: expect.objectContaining({
          controller_run_count: 0,
          execution_attempt_count: 2,
          intervention_counts: expect.objectContaining({
            explicit_resume: 1,
          }),
          failure_class_counts: expect.objectContaining({
            worker_exit: 1,
          }),
        }),
      }),
      expect.objectContaining({
        scenario_id: 'handoff-successor-transfer',
        pack_id: 'successor-handoff',
        status: 'passed',
        continuity: {
          kind: 'handoff',
          status: 'success',
          outcome: 'successor_handoff',
        },
        metrics: expect.objectContaining({
          controller_run_count: 0,
          execution_attempt_count: 2,
          intervention_counts: expect.objectContaining({
            successor_handoff: 1,
          }),
          failure_class_counts: expect.objectContaining({
            worker_exit: 1,
          }),
        }),
      }),
    ]));
  });

  it('supports named pack subsets and rejects unknown pack names fail closed', async () => {
    const subset = await runAoEvalHarness({
      projectId: 'ciecopilot-home',
      fixtureRoot: FIXTURE_ROOT,
      packNames: ['resume-continuity', 'successor-handoff'],
    });

    expect(subset.pack_ids).toEqual([
      'resume-continuity',
      'successor-handoff',
    ]);
    expect(subset.scenario_ids).toEqual([
      'resume-explicit-checkpoint',
      'handoff-successor-transfer',
    ]);
    expect(subset.summary).toMatchObject({
      scenario_count: 2,
      continuity_scenario_count: 2,
      continuity_success_count: 2,
    });

    await expect(runAoEvalHarness({
      projectId: 'ciecopilot-home',
      fixtureRoot: FIXTURE_ROOT,
      packNames: ['does-not-exist'],
    })).rejects.toThrow(/unknown eval pack/i);
  });

  it('surfaces missing completion review as an explicit governance finding when a scenario requires the gate', async () => {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-eval-completion-review-'));
    const acceptanceFixture = path.join(FIXTURE_ROOT, '..', 'acceptance', 'approved-and-green-pr');

    try {
      fs.mkdirSync(path.join(fixtureRoot, 'scenarios'), { recursive: true });
      fs.writeFileSync(path.join(fixtureRoot, 'packs.json'), JSON.stringify({
        schema_version: 'ao.eval-pack-registry.v1alpha1',
        format: 'ao_eval_pack_registry',
        packs: [
          {
            pack_id: 'all',
            title: 'Completion review governance',
            scenario_ids: ['completion-review-missing'],
          },
          {
            pack_id: 'completion-review',
            title: 'Completion review governance',
            scenario_ids: ['completion-review-missing'],
          },
        ],
      }, null, 2));
      fs.writeFileSync(path.join(fixtureRoot, 'scenarios', 'completion-review-missing.json'), JSON.stringify({
        schema_version: 'ao.eval-scenario.v1alpha1',
        format: 'ao_eval_scenario',
        scenario_id: 'completion-review-missing',
        pack_id: 'completion-review',
        runner: 'controller_shadow_parity',
        title: 'Controller parity requires an independent completion review',
        acceptance_fixture: acceptanceFixture,
        task: {
          task_id: 'issue-93',
          issue_number: 93,
          title: 'Completion review governance fixture',
          branch_name: 'feat/issue-93',
          worktree_path: '/tmp/feat-issue-93',
        },
        pr_binding: {
          pr_number: 93,
          base_branch: 'main',
        },
        controller: {
          controller_id: 'default',
          mode: 'shadow',
        },
        timing: {
          created_at: '2026-04-01T10:00:00.000Z',
          run_at: '2026-04-01T10:01:00.000Z',
        },
        expected: {
          derived_trigger: 'approved_and_green',
          require_completion_review: true,
        },
      }, null, 2));

      const result = await runAoEvalHarness({
        projectId: 'ciecopilot-home',
        fixtureRoot,
        packNames: ['completion-review'],
      });

      expect(result.summary).toMatchObject({
        scenario_count: 1,
        passed_scenario_count: 0,
        failed_scenario_count: 1,
      });
      expect(result.scenario_results).toEqual([
        expect.objectContaining({
          scenario_id: 'completion-review-missing',
          status: 'failed',
          verification: {
            status: 'failed',
            findings: expect.arrayContaining([
              expect.objectContaining({
                code: 'completion_review_missing',
              }),
            ]),
          },
        }),
      ]);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
