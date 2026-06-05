import { describe, expect, it } from '@jest/globals';
import { buildDecisionChainReport, buildDecisionChainStagePlan } from '../../scripts/ao/lib/decision-chain.js';
import { createDecisionChainScope } from '../../scripts/ao/lib/decision-chain-contracts.js';

describe('decision chain report', () => {
  it('marks PR-scoped chains as authoritative and requires all three stages', () => {
    const scope = createDecisionChainScope({
      projectId: 'ciecopilot-home',
      prNumber: 44,
      trigger: 'ci_failed',
    });

    expect(buildDecisionChainStagePlan({ scope })).toEqual([
      expect.objectContaining({
        stage: 'reconcile',
        required: true,
        authority: 'authoritative',
        scope_mode: 'pr',
      }),
      expect.objectContaining({
        stage: 'doctor',
        required: true,
        authority: 'diagnose_only',
        scope_mode: 'pr',
      }),
      expect.objectContaining({
        stage: 'lifecycle',
        required: true,
        authority: 'authoritative',
        scope_mode: 'pr',
      }),
    ]);
  });

  it('marks project-scoped manual chains as advisory with optional doctor/lifecycle stages', () => {
    const scope = createDecisionChainScope({
      projectId: 'ciecopilot-home',
      trigger: 'manual',
    });

    expect(buildDecisionChainStagePlan({ scope })).toEqual([
      expect.objectContaining({
        stage: 'reconcile',
        required: true,
        authority: 'advisory',
      }),
      expect.objectContaining({
        stage: 'doctor',
        required: false,
        authority: 'advisory',
      }),
      expect.objectContaining({
        stage: 'lifecycle',
        required: false,
        authority: 'advisory',
      }),
    ]);
  });

  it('normalizes blocking reasons, next actions, and next commands into one report', () => {
    const scope = createDecisionChainScope({
      projectId: 'ciecopilot-home',
      prNumber: 44,
      trigger: 'approved_and_green',
    });

    const report = buildDecisionChainReport({
      scope,
      reconciliationReport: {
        observed_at: '2026-04-03T10:00:00.000Z',
        top_status: 'healthy',
        automation_disposition: 'continue',
        findings: [],
      },
      doctorReport: {
        observed_at: '2026-04-03T10:00:01.000Z',
        top_status: 'warning',
        findings: [
          {
            code: 'dirty_worktree',
            severity: 'warning',
            origin: 'doctor',
            summary: 'Worktree is dirty.',
          },
        ],
        suggestions: [
          {
            id: 'git_status',
            action_class: 'git_check',
            summary: 'Inspect git status.',
            commands: ['git status --short'],
            rationale: 'Dirty worktree needs confirmation.',
          },
        ],
      },
      lifecycleReport: {
        observed_at: '2026-04-03T10:00:02.000Z',
        top_status: 'continue',
        routing_decision: {
          action: 'continue_current_worker',
          reason_codes: ['ownership_clear'],
          authoritative: true,
        },
        release_decision: {
          disposition: 'auto_merge_ready_pr',
          basis: ['ready_for_auto_merge'],
          authoritative: true,
        },
        findings: [
          {
            code: 'release_ready_human_notification',
            severity: 'info',
            origin: 'lifecycle',
            summary: 'PR appears ready for explicit human notification.',
          },
        ],
        actions: [
          {
            id: 'auto_merge_ready_pr',
            action_class: 'merge_pr',
            summary: 'Merge the release-ready AO-managed PR.',
            commands: [
              'gh pr view 44 --json number,state,headRefOid,reviewDecision,mergeStateStatus,isDraft,statusCheckRollup,url',
              'gh pr merge 44 --squash --delete-branch',
            ],
            rationale: 'Release gates are clear and AO auto-merge is enabled by default.',
          },
        ],
      },
    });

    expect(report).toMatchObject({
      schema_version: 'ao.decision-chain.v1alpha1',
      report_format: 'ao_decision_chain_report',
      contract_status: 'authoritative_pr_chain',
      top_status: 'continue',
      automation_disposition: 'continue',
      key_findings: [
        expect.objectContaining({
          stage: 'doctor',
          code: 'dirty_worktree',
          severity: 'warning',
        }),
      ],
      blocking_reasons: [
        expect.objectContaining({
          stage: 'doctor',
          code: 'dirty_worktree',
        }),
      ],
      next_actions: [
        expect.objectContaining({
          stage: 'doctor',
          id: 'git_status',
        }),
        expect.objectContaining({
          stage: 'lifecycle',
          id: 'auto_merge_ready_pr',
        }),
      ],
      next_commands: [
        'git status --short',
        'gh pr view 44 --json number,state,headRefOid,reviewDecision,mergeStateStatus,isDraft,statusCheckRollup,url',
        'gh pr merge 44 --squash --delete-branch',
      ],
    });
  });
});
