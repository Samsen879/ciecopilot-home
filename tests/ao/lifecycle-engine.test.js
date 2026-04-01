import { describe, expect, it } from '@jest/globals';
import {
  createLifecyclePrScope,
  createLifecycleProjectScope,
} from '../../scripts/ao/lib/lifecycle-contracts.js';
import { createGateSnapshot } from '../../scripts/ao/lib/gate-model.js';
import { buildLifecycleReport } from '../../scripts/ao/lib/lifecycle-engine.js';
import { createCompletionReviewRecord } from '../../scripts/ao/lib/state-contracts.js';

function buildReconciliationReport(overrides = {}) {
  return {
    schema_version: 'ao.reconciliation.v1alpha1',
    report_format: 'ao_reconciliation_report',
    engine_version: 'phase1-foundation',
    observed_at: '2026-03-24T14:00:00.000Z',
    project_id: 'ciecopilot-home',
    top_status: 'healthy',
    source_health: {
      ao: 'ok',
      github: 'ok',
    },
    scope: {
      mode: 'pr',
      selected_pr_numbers: [44],
    },
    pr_assessments: [{
      pr_number: 44,
      branch_name: 'feat/issue-44',
      ownership: {
        status: 'clear',
        owner_session: 'cie-44',
        candidate_sessions: ['cie-44'],
      },
      release_readiness: {
        status: 'ready',
        basis: ['all_release_signals_clear'],
      },
    }],
    findings: [],
    ...overrides,
  };
}

function buildDoctorReport(overrides = {}) {
  return {
    schema_version: 'ao.doctor.v1alpha1',
    report_format: 'ao_doctor_report',
    engine_version: 'phase2-doctor',
    observed_at: '2026-03-24T14:00:01.000Z',
    project_id: 'ciecopilot-home',
    top_status: 'healthy',
    source_health: {
      reconciliation: 'ok',
      ao: 'ok',
      github: 'ok',
      git: 'ok',
      worktree: 'ok',
    },
    findings: [],
    suggestions: [],
    ...overrides,
  };
}

function buildReadyAssessment(overrides = {}) {
  return {
    pr_number: 44,
    branch_name: 'feat/issue-44',
    ownership: {
      status: 'clear',
      owner_session: 'cie-44',
      candidate_sessions: ['cie-44'],
    },
    release_readiness: {
      status: 'ready',
      basis: ['all_release_signals_clear'],
    },
    release_guard: {
      status: 'ready',
      head_sha: 'abc123',
      basis: ['all_release_signals_clear'],
      blocker_codes: [],
      reason_codes: ['all_release_signals_clear'],
      gates: createGateSnapshot({
        ownership: {
          state: 'open',
        },
        review: {
          state: 'open',
        },
        ci: {
          state: 'open',
        },
        mergeability: {
          state: 'open',
        },
        release: {
          state: 'open',
          reason_codes: ['all_release_signals_clear'],
        },
      }),
      truth: {
        pr_state: 'OPEN',
        is_draft: false,
        review_status: 'approved',
        ci_status: 'passing',
        mergeability: 'mergeable',
        ownership_status: 'clear',
        owner_session_name: 'cie-44',
      },
    },
    ...overrides,
  };
}

function buildControlPlaneSnapshot(completionReviews = []) {
  return {
    state: {
      completion_reviews: completionReviews,
    },
  };
}

describe('lifecycle engine', () => {
  it('keeps project mode advisory-only', () => {
    const report = buildLifecycleReport({
      scope: createLifecycleProjectScope({
        projectId: 'ciecopilot-home',
        trigger: 'manual',
      }),
      reconciliationReport: buildReconciliationReport({
        scope: {
          mode: 'project',
          selected_pr_numbers: [44, 45],
        },
      }),
      doctorReport: buildDoctorReport({
        top_status: 'warning',
      }),
    });

    expect(report.top_status).toBe('observe');
    expect(report.routing_decision.action).toBe('no_action');
    expect(report.routing_decision.authoritative).toBe(false);
    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'project_scope_advisory_only',
        origin: 'lifecycle',
      }),
    ]));
  });

  it('routes clear ownership to the current worker for worker-follow-up triggers', () => {
    const report = buildLifecycleReport({
      scope: createLifecyclePrScope({
        projectId: 'ciecopilot-home',
        prNumber: 44,
        trigger: 'ci_failed',
      }),
      reconciliationReport: buildReconciliationReport({
        pr_assessments: [{
          pr_number: 44,
          branch_name: 'feat/issue-44',
          ownership: {
            status: 'clear',
            owner_session: 'cie-44',
            candidate_sessions: ['cie-44'],
          },
          release_readiness: {
            status: 'blocked',
            basis: ['ci_blocked'],
          },
        }],
      }),
      doctorReport: buildDoctorReport(),
    });

    expect(report.top_status).toBe('hold');
    expect(report.routing_decision).toMatchObject({
      action: 'continue_current_worker',
      owner_session: 'cie-44',
      authoritative: true,
    });
    expect(report.release_decision.disposition).toBe('await_ci');
  });

  it('prefers typed CI blocker data over narrative basis strings', () => {
    const report = buildLifecycleReport({
      scope: createLifecyclePrScope({
        projectId: 'ciecopilot-home',
        prNumber: 44,
        trigger: 'ci_failed',
      }),
      reconciliationReport: buildReconciliationReport({
        pr_assessments: [{
          pr_number: 44,
          branch_name: 'feat/issue-44',
          ownership: {
            status: 'clear',
            owner_session: 'cie-44',
            candidate_sessions: ['cie-44'],
          },
          release_readiness: {
            status: 'blocked',
            basis: ['legacy_basis_should_not_drive_routing'],
            blocker_codes: ['ci_blocked'],
            gates: createGateSnapshot({
              ownership: {
                state: 'open',
              },
              review: {
                state: 'open',
              },
              ci: {
                state: 'blocked',
                blocker_codes: ['ci_blocked'],
              },
              mergeability: {
                state: 'open',
              },
              release: {
                state: 'blocked',
                blocker_codes: ['ci_blocked'],
              },
            }),
          },
        }],
      }),
      doctorReport: buildDoctorReport(),
    });

    expect(report.top_status).toBe('hold');
    expect(report.release_decision).toMatchObject({
      disposition: 'await_ci',
      authoritative: true,
    });
  });

  it('uses the typed release guard surface to derive waiting release actions', () => {
    const report = buildLifecycleReport({
      scope: createLifecyclePrScope({
        projectId: 'ciecopilot-home',
        prNumber: 44,
        trigger: 'manual',
      }),
      reconciliationReport: buildReconciliationReport({
        pr_assessments: [{
          pr_number: 44,
          branch_name: 'feat/issue-44',
          ownership: {
            status: 'clear',
            owner_session: 'cie-44',
            candidate_sessions: ['cie-44'],
          },
          release_readiness: {
            status: 'ambiguous',
            basis: ['legacy_ambiguous_basis'],
          },
          release_guard: {
            status: 'waiting',
            head_sha: 'abc123',
            basis: ['review_pending'],
            blocker_codes: [],
            gates: createGateSnapshot({
              ownership: {
                state: 'open',
              },
              review: {
                state: 'pending',
                reason_codes: ['review_pending'],
              },
              ci: {
                state: 'open',
              },
              mergeability: {
                state: 'open',
              },
              release: {
                state: 'pending',
                reason_codes: ['review_pending'],
              },
            }),
          },
        }],
      }),
      doctorReport: buildDoctorReport(),
    });

    expect(report.release_decision).toMatchObject({
      disposition: 'await_review',
      authoritative: true,
      basis: ['review_pending'],
    });
  });

  it('does not let pending CI override an already blocked typed release gate', () => {
    const report = buildLifecycleReport({
      scope: createLifecyclePrScope({
        projectId: 'ciecopilot-home',
        prNumber: 44,
        trigger: 'ci_failed',
      }),
      reconciliationReport: buildReconciliationReport({
        pr_assessments: [{
          pr_number: 44,
          branch_name: 'feat/issue-44',
          ownership: {
            status: 'clear',
            owner_session: 'cie-44',
            candidate_sessions: ['cie-44'],
          },
          release_readiness: {
            status: 'blocked',
            basis: ['legacy_basis_should_not_drive_routing'],
            blocker_codes: ['merge_conflict_blocked'],
            gates: createGateSnapshot({
              ownership: {
                state: 'open',
              },
              review: {
                state: 'open',
              },
              ci: {
                state: 'pending',
                reason_codes: ['ci_pending'],
              },
              mergeability: {
                state: 'blocked',
                blocker_codes: ['merge_conflict_blocked'],
              },
              release: {
                state: 'blocked',
                blocker_codes: ['merge_conflict_blocked'],
                reason_codes: ['ci_pending'],
              },
            }),
          },
        }],
      }),
      doctorReport: buildDoctorReport(),
    });

    expect(report.top_status).toBe('hold');
    expect(report.release_decision).toMatchObject({
      disposition: 'await_mergeability',
      basis: ['merge_conflict_blocked'],
      authoritative: true,
    });
  });

  it('routes stale ownership to restore the previous worker', () => {
    const report = buildLifecycleReport({
      scope: createLifecyclePrScope({
        projectId: 'ciecopilot-home',
        prNumber: 44,
        trigger: 'agent_exited',
      }),
      reconciliationReport: buildReconciliationReport({
        pr_assessments: [{
          pr_number: 44,
          branch_name: 'feat/issue-44',
          ownership: {
            status: 'stale',
            owner_session: 'cie-44',
            candidate_sessions: ['cie-44'],
          },
          release_readiness: {
            status: 'ambiguous',
            basis: ['stale_worker_session'],
          },
          release_guard: {
            status: 'waiting',
            head_sha: 'abc123',
            basis: ['ownership_stale'],
            blocker_codes: [],
            gates: createGateSnapshot({
              ownership: {
                state: 'pending',
                reason_codes: ['ownership_stale'],
              },
              review: {
                state: 'open',
              },
              ci: {
                state: 'open',
              },
              mergeability: {
                state: 'open',
              },
              release: {
                state: 'pending',
                reason_codes: ['ownership_stale'],
              },
            }),
          },
        }],
      }),
      doctorReport: buildDoctorReport(),
    });

    expect(report.routing_decision).toMatchObject({
      action: 'restore_existing_worker',
      owner_session: 'cie-44',
      authoritative: true,
    });
    expect(report.top_status).toBe('human_gate');
    expect(report.release_decision).toMatchObject({
      disposition: 'human_gate',
      basis: ['ownership_stale'],
      authoritative: false,
    });
  });

  it('routes orphaned ownership to successor handoff', () => {
    const report = buildLifecycleReport({
      scope: createLifecyclePrScope({
        projectId: 'ciecopilot-home',
        prNumber: 44,
        trigger: 'agent_exited',
      }),
      reconciliationReport: buildReconciliationReport({
        pr_assessments: [{
          pr_number: 44,
          branch_name: 'feat/issue-44',
          ownership: {
            status: 'orphaned',
            owner_session: null,
            candidate_sessions: [],
          },
          release_readiness: {
            status: 'blocked',
            basis: ['ownership_orphaned'],
          },
        }],
      }),
      doctorReport: buildDoctorReport(),
    });

    expect(report.top_status).toBe('handoff');
    expect(report.routing_decision.action).toBe('handoff_to_successor');
    expect(report.findings.map((finding) => finding.code)).toContain('successor_handoff_recommended');
  });

  it('human-gates ambiguous ownership', () => {
    const report = buildLifecycleReport({
      scope: createLifecyclePrScope({
        projectId: 'ciecopilot-home',
        prNumber: 44,
        trigger: 'changes_requested',
      }),
      reconciliationReport: buildReconciliationReport({
        pr_assessments: [{
          pr_number: 44,
          branch_name: 'feat/issue-44',
          ownership: {
            status: 'ambiguous',
            owner_session: null,
            candidate_sessions: ['cie-44', 'cie-44b'],
          },
          release_readiness: {
            status: 'ambiguous',
            basis: ['multiple_candidate_workers'],
          },
        }],
      }),
      doctorReport: buildDoctorReport(),
    });

    expect(report.top_status).toBe('human_gate');
    expect(report.routing_decision.action).toBe('hold_for_human');
    expect(report.findings.map((finding) => finding.code)).toContain('ownership_control_ambiguous');
  });

  it('waits on mergeability when typed gates show mergeability remains ambiguous', () => {
    const report = buildLifecycleReport({
      scope: createLifecyclePrScope({
        projectId: 'ciecopilot-home',
        prNumber: 44,
        trigger: 'merge_conflicts',
      }),
      reconciliationReport: buildReconciliationReport({
        pr_assessments: [{
          pr_number: 44,
          branch_name: 'feat/issue-44',
          ownership: {
            status: 'clear',
            owner_session: 'cie-44',
            candidate_sessions: ['cie-44'],
          },
          release_readiness: {
            status: 'ambiguous',
            basis: ['fallback_ambiguous'],
            blocker_codes: [],
            gates: createGateSnapshot({
              ownership: {
                state: 'open',
              },
              review: {
                state: 'open',
              },
              ci: {
                state: 'open',
              },
              mergeability: {
                state: 'ambiguous',
                reason_codes: ['mergeability_unknown'],
              },
              release: {
                state: 'ambiguous',
                reason_codes: ['mergeability_unknown'],
              },
            }),
          },
        }],
      }),
      doctorReport: buildDoctorReport(),
    });

    expect(report.top_status).toBe('hold');
    expect(report.release_decision).toMatchObject({
      disposition: 'await_mergeability',
      authoritative: true,
    });
  });

  it('holds when doctor blocks local control', () => {
    const report = buildLifecycleReport({
      scope: createLifecyclePrScope({
        projectId: 'ciecopilot-home',
        prNumber: 44,
        trigger: 'agent_stuck',
      }),
      reconciliationReport: buildReconciliationReport(),
      doctorReport: buildDoctorReport({
        top_status: 'blocked',
        findings: [{
          code: 'detached_head',
          severity: 'blocker',
          origin: 'doctor',
          source_area: 'git',
          subject_type: 'branch',
          subject_id: 'abc123',
          summary: 'Current repo is in detached HEAD state.',
          details: [],
          evidence_refs: [],
          suggestion_ids: [],
        }],
      }),
    });

    expect(report.top_status).toBe('hold');
    expect(report.routing_decision.action).toBe('hold_for_human');
    expect(report.findings.map((finding) => finding.code)).toContain('doctor_blocks_control');
  });

  it('human-gates when doctor remains ambiguous in PR mode', () => {
    const report = buildLifecycleReport({
      scope: createLifecyclePrScope({
        projectId: 'ciecopilot-home',
        prNumber: 44,
        trigger: 'agent_needs_input',
      }),
      reconciliationReport: buildReconciliationReport(),
      doctorReport: buildDoctorReport({
        top_status: 'ambiguous',
        findings: [{
          code: 'current_branch_mismatch',
          severity: 'ambiguous',
          origin: 'doctor',
          source_area: 'git',
          subject_type: 'branch',
          subject_id: 'feat/other-branch',
          summary: 'Current local branch does not match the expected diagnosis branch.',
          details: [],
          evidence_refs: [],
          suggestion_ids: [],
        }],
      }),
    });

    expect(report.top_status).toBe('human_gate');
    expect(report.routing_decision.action).toBe('hold_for_human');
  });

  it('holds approved-and-green PRs until an independent completion review exists', () => {
    const report = buildLifecycleReport({
      scope: createLifecyclePrScope({
        projectId: 'ciecopilot-home',
        prNumber: 44,
        trigger: 'approved_and_green',
      }),
      reconciliationReport: buildReconciliationReport({
        pr_assessments: [buildReadyAssessment()],
      }),
      doctorReport: buildDoctorReport(),
      controlPlaneSnapshot: buildControlPlaneSnapshot(),
    });

    expect(report.top_status).toBe('hold');
    expect(report.completion_review).toMatchObject({
      status: 'missing_review',
      satisfied: false,
      head_sha: 'abc123',
    });
    expect(report.release_decision).toMatchObject({
      disposition: 'await_review',
      basis: ['completion_review_missing'],
      authoritative: true,
    });
  });

  it('rejects self review as satisfying the completion-review gate', () => {
    const report = buildLifecycleReport({
      scope: createLifecyclePrScope({
        projectId: 'ciecopilot-home',
        prNumber: 44,
        trigger: 'approved_and_green',
      }),
      reconciliationReport: buildReconciliationReport({
        pr_assessments: [buildReadyAssessment()],
      }),
      doctorReport: buildDoctorReport(),
      controlPlaneSnapshot: buildControlPlaneSnapshot([
        createCompletionReviewRecord({
          review_id: 'completion-review-pr-44-self',
          task_id: 'issue-44',
          pr_number: 44,
          branch_name: 'feat/issue-44',
          head_sha: 'abc123',
          status: 'accepted',
          validity_status: 'active',
          requested_at: '2026-04-01T09:00:00.000Z',
          updated_at: '2026-04-01T09:03:00.000Z',
          reviewed_at: '2026-04-01T09:03:00.000Z',
          reviewer_session_name: 'cie-44',
          reviewer_session_id: 'cie-44',
          implementation_owner_session_name: 'cie-44',
          implementation_owner_session_id: 'cie-44',
          verdict: 'accepted',
          reason_codes: ['completion_review_accepted'],
          findings: [],
          evidence_refs: [{
            source: 'github',
            kind: 'review',
            id: 'rvw-self',
            summary: 'Self approval on the implementation branch.',
          }],
        }),
      ]),
    });

    expect(report.top_status).toBe('hold');
    expect(report.completion_review).toMatchObject({
      status: 'self_review',
      satisfied: false,
      review_id: 'completion-review-pr-44-self',
    });
    expect(report.release_decision).toMatchObject({
      disposition: 'await_review',
      basis: ['completion_review_self_review'],
      authoritative: true,
    });
  });

  it('blocks ready release posture when completion review is rejected', () => {
    const report = buildLifecycleReport({
      scope: createLifecyclePrScope({
        projectId: 'ciecopilot-home',
        prNumber: 44,
        trigger: 'approved_and_green',
      }),
      reconciliationReport: buildReconciliationReport({
        pr_assessments: [buildReadyAssessment()],
      }),
      doctorReport: buildDoctorReport(),
      controlPlaneSnapshot: buildControlPlaneSnapshot([
        createCompletionReviewRecord({
          review_id: 'completion-review-pr-44-rejected',
          task_id: 'issue-44',
          pr_number: 44,
          branch_name: 'feat/issue-44',
          head_sha: 'abc123',
          status: 'rejected',
          validity_status: 'active',
          requested_at: '2026-04-01T09:00:00.000Z',
          updated_at: '2026-04-01T09:04:00.000Z',
          reviewed_at: '2026-04-01T09:04:00.000Z',
          reviewer_session_name: 'cie-reviewer-1',
          reviewer_session_id: 'cie-reviewer-1',
          implementation_owner_session_name: 'cie-44',
          implementation_owner_session_id: 'cie-44',
          verdict: 'rejected',
          reason_codes: ['completion_review_rejected'],
          findings: [{
            code: 'needs_follow_up',
            severity: 'warning',
            summary: 'Reviewer found follow-up work.',
            details: ['A failing edge case still exists.'],
            evidence_refs: [],
          }],
          evidence_refs: [{
            source: 'github',
            kind: 'review',
            id: 'rvw-rejected',
            summary: 'Changes requested by an independent reviewer.',
          }],
        }),
      ]),
    });

    expect(report.top_status).toBe('hold');
    expect(report.completion_review).toMatchObject({
      status: 'rejected',
      satisfied: false,
      review_id: 'completion-review-pr-44-rejected',
    });
    expect(report.release_decision).toMatchObject({
      disposition: 'await_review',
      basis: ['completion_review_rejected'],
      authoritative: true,
    });
  });

  it('notifies the human when approved-and-green has an accepted independent completion review', () => {
    const report = buildLifecycleReport({
      scope: createLifecyclePrScope({
        projectId: 'ciecopilot-home',
        prNumber: 44,
        trigger: 'approved_and_green',
      }),
      reconciliationReport: buildReconciliationReport({
        pr_assessments: [buildReadyAssessment()],
      }),
      doctorReport: buildDoctorReport(),
      controlPlaneSnapshot: buildControlPlaneSnapshot([
        createCompletionReviewRecord({
          review_id: 'completion-review-pr-44-accepted',
          task_id: 'issue-44',
          pr_number: 44,
          branch_name: 'feat/issue-44',
          head_sha: 'abc123',
          status: 'accepted',
          validity_status: 'active',
          requested_at: '2026-04-01T09:00:00.000Z',
          updated_at: '2026-04-01T09:05:00.000Z',
          reviewed_at: '2026-04-01T09:05:00.000Z',
          reviewer_session_name: 'cie-reviewer-1',
          reviewer_session_id: 'cie-reviewer-1',
          implementation_owner_session_name: 'cie-44',
          implementation_owner_session_id: 'cie-44',
          verdict: 'accepted',
          reason_codes: ['completion_review_accepted'],
          findings: [],
          evidence_refs: [{
            source: 'github',
            kind: 'review',
            id: 'rvw-accepted',
            summary: 'Independent reviewer accepted the completion review.',
          }],
        }),
      ]),
    });

    expect(report.top_status).toBe('continue');
    expect(report.completion_review).toMatchObject({
      status: 'accepted',
      satisfied: true,
      review_id: 'completion-review-pr-44-accepted',
    });
    expect(report.release_decision).toMatchObject({
      disposition: 'notify_human_ready',
      authoritative: true,
    });
    expect(report.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'notify_human_ready',
        action_class: 'notify_human',
      }),
    ]));
  });

  it('allows an explicit completion-review waiver to satisfy the release gate', () => {
    const report = buildLifecycleReport({
      scope: createLifecyclePrScope({
        projectId: 'ciecopilot-home',
        prNumber: 44,
        trigger: 'approved_and_green',
      }),
      reconciliationReport: buildReconciliationReport({
        pr_assessments: [buildReadyAssessment()],
      }),
      doctorReport: buildDoctorReport(),
      controlPlaneSnapshot: buildControlPlaneSnapshot([
        createCompletionReviewRecord({
          review_id: 'completion-review-pr-44-waived',
          task_id: 'issue-44',
          pr_number: 44,
          branch_name: 'feat/issue-44',
          head_sha: 'abc123',
          status: 'waived',
          validity_status: 'active',
          requested_at: '2026-04-01T09:00:00.000Z',
          updated_at: '2026-04-01T09:06:00.000Z',
          reviewed_at: '2026-04-01T09:06:00.000Z',
          reviewer_session_name: 'operator',
          reviewer_session_id: 'operator',
          implementation_owner_session_name: 'cie-44',
          implementation_owner_session_id: 'cie-44',
          verdict: 'waived',
          reason_codes: ['completion_review_waived'],
          findings: [],
          evidence_refs: [{
            source: 'ao',
            kind: 'waiver',
            id: 'waiver-44',
            summary: 'Operator waived the independent completion review gate.',
          }],
        }),
      ]),
    });

    expect(report.top_status).toBe('continue');
    expect(report.completion_review).toMatchObject({
      status: 'waived',
      satisfied: true,
      review_id: 'completion-review-pr-44-waived',
    });
    expect(report.release_decision).toMatchObject({
      disposition: 'notify_human_ready',
      authoritative: true,
    });
  });

  it('treats bugbot review comments as a deterministic review hold', () => {
    const report = buildLifecycleReport({
      scope: createLifecyclePrScope({
        projectId: 'ciecopilot-home',
        prNumber: 44,
        trigger: 'bugbot_comments',
      }),
      reconciliationReport: buildReconciliationReport(),
      doctorReport: buildDoctorReport(),
    });

    expect(report.top_status).toBe('hold');
    expect(report.release_decision).toMatchObject({
      disposition: 'await_review',
      authoritative: true,
    });
    expect(report.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'hold_review',
        action_class: 'hold',
      }),
    ]));
  });

  it('treats failed inputs as source failure', () => {
    const report = buildLifecycleReport({
      scope: createLifecyclePrScope({
        projectId: 'ciecopilot-home',
        prNumber: 44,
        trigger: 'manual',
      }),
      reconciliationReport: buildReconciliationReport({
        source_health: {
          ao: 'failed',
          github: 'ok',
        },
      }),
      doctorReport: buildDoctorReport({
        top_status: 'source_failure',
        source_health: {
          reconciliation: 'failed',
          ao: 'ok',
          github: 'ok',
          git: 'failed',
          worktree: 'failed',
        },
      }),
    });

    expect(report.source_health).toEqual({
      reconciliation: 'failed',
      doctor: 'failed',
    });
    expect(report.top_status).toBe('source_failure');
  });
});
