import fs from 'node:fs';
import path from 'node:path';
import { buildS2ReleaseGovernanceGate } from '../lib/s2_advisory_gate.js';

const ROOT = path.resolve(process.cwd());

function buildSafeHoldInputs(overrides = {}) {
  const inputs = {
    releaseDecision: {
      release_state: 'safe_advisory_hold',
      decision: 'stay_advisory_only',
      release_mode: 'advisory_only',
      effective_default_production_route: 'b_simplified_retrieval_s1_v1',
      s1_default_production_route_must_remain: 'b_simplified_retrieval_s1_v1',
      advisory_candidate_ready: false,
      default_route_promotion_ready: false,
      s2_default_route_allowed: false,
      safe_hold_ready: true,
      safe_to_merge_governance_patch: true,
      blockers: [
        {
          category: 's2_advisory_readiness',
          code: 'fallback_rate_above_threshold',
          message: 'fallback_rate must be <= 0.2, got 0.5',
        },
      ],
    },
    evalSummarySchemaCheck: {
      status: 'pass',
      eval_summary_present: true,
      schema_valid: true,
      semantic_valid: true,
    },
    advisoryGateSummary: {
      status: 'fail',
      advisory_mode: true,
      blockers: [
        {
          category: 's2_advisory_readiness',
          code: 'fallback_rate_above_threshold',
          message: 'fallback_rate must be <= 0.2, got 0.5',
        },
      ],
    },
    workflowInvariant: {
      status: 'pass',
      gate: { advisory_only: true },
    },
    s1ContractGate: { all_green: true },
    s1MetricGate: { status: 'pass', gate_mode: 'required_fail_closed' },
  };
  return {
    ...inputs,
    ...overrides,
  };
}

describe('S2 release governance gate', () => {
  test('passes safe hold when S2 readiness fails explicitly and S1 remains default', () => {
    const summary = buildS2ReleaseGovernanceGate(buildSafeHoldInputs());

    expect(summary.status).toBe('pass');
    expect(summary.safe_hold_ready).toBe(true);
    expect(summary.safe_to_merge_governance_patch).toBe(true);
    expect(summary.warning_reasons).toEqual(
      expect.arrayContaining(['s2_advisory_gate_failed_but_safe_hold_explicit']),
    );
  });

  test('fails closed when release decision attempts promotion', () => {
    const summary = buildS2ReleaseGovernanceGate(
      buildSafeHoldInputs({
        releaseDecision: {
          ...buildSafeHoldInputs().releaseDecision,
          release_state: 'promotion_attempt_blocked',
          decision: 'promote',
          release_mode: 'default_route',
          effective_default_production_route: 's2_augmentation',
          default_route_promotion_ready: true,
          safe_hold_ready: false,
        },
      }),
    );

    expect(summary.status).toBe('fail');
    expect(summary.blocked_reasons).toEqual(
      expect.arrayContaining([
        'release_decision_not_stay_advisory_only',
        'release_mode_not_advisory_only',
        'effective_default_route_not_s1',
        'default_route_promotion_ready_true',
      ]),
    );
  });

  test('fails closed when eval summary schema check is missing or invalid', () => {
    const summary = buildS2ReleaseGovernanceGate(
      buildSafeHoldInputs({
        evalSummarySchemaCheck: {
          status: 'fail',
          eval_summary_present: false,
          schema_valid: false,
          semantic_valid: false,
        },
      }),
    );

    expect(summary.status).toBe('fail');
    expect(summary.blocked_reasons).toEqual(
      expect.arrayContaining([
        'eval_summary_schema_check_not_pass',
        'eval_summary_missing',
        'eval_summary_schema_invalid',
      ]),
    );
  });

  test('fails closed when advisory workflow is no longer advisory-only', () => {
    const summary = buildS2ReleaseGovernanceGate(
      buildSafeHoldInputs({
        workflowInvariant: {
          status: 'pass',
          gate: { advisory_only: false },
        },
      }),
    );

    expect(summary.status).toBe('fail');
    expect(summary.blocked_reasons).toContain('workflow_contract_not_advisory_only');
  });

  test('required governance workflow exists with required job name', () => {
    const workflow = fs.readFileSync(
      path.join(ROOT, '.github', 'workflows', 'rag-s2-release-governance.yml'),
      'utf8',
    );

    expect(workflow).toContain('name: RAG S2 Release Governance');
    expect(workflow).toContain('name: S2 Release Governance (Required)');
    expect(workflow).toContain('node scripts/rag/run_s2_release_governance_gate.js');
  });
});
