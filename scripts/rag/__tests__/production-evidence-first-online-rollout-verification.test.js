import fs from 'node:fs';
import path from 'node:path';
import {
  buildProductionEvidenceFirstOnlineRolloutVerification,
  renderProductionEvidenceFirstOnlineRolloutVerificationReport,
} from '../lib/production-evidence-first-online-rollout-verification.js';

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relPath), 'utf8'));
}

describe('production evidence first online rollout verification', () => {
  test('builds a passing focused verification payload for the promoted 9702 rollout', async () => {
    const result = await buildProductionEvidenceFirstOnlineRolloutVerification({
      rolloutGate: readJson('data/evidence/production/rollout_gate_v1.json'),
      whitelist: readJson('data/evidence/production/whitelist_v1.json'),
    });

    expect(result.status).toBe('pass');
    expect(result.gate_validation.ok).toBe(true);
    expect(result.gate_validation.summary.online_bundle_ids).toEqual(['phase_b_pilot_ready_v1']);
    expect(result.target_resolution.active).toBe(true);
    expect(result.target_resolution.corpus_versions).toEqual([
      'rag_step3_9702_question_aware_v1',
      'rag_production_evidence_pilot_20260313',
    ]);
    expect(result.target_resolution.excluded_source_types).toEqual(['evidence_reserved']);
    expect(result.control_resolution.active).toBe(false);
    expect(result.control_resolution.corpus_versions).toEqual(['rag_step3_9231_question_aware_v1']);
    expect(result.summary.target_promoted).toBe(true);
    expect(result.summary.control_blocked).toBe(true);
    expect(result.summary.evidence_reserved_blocked).toBe(true);
    expect(result.summary.s1_passed).toBe(true);
    expect(result.summary.s2_passed).toBe(true);
    expect(result.summary.rollback_ready).toBe(true);
    expect(result.runtime_audit_contract.promoted_path.status).toBe('pass');
    expect(result.runtime_audit_contract.promoted_path.route_scores.production_evidence_rollout_active).toBe(true);
    expect(result.runtime_audit_contract.promoted_path.route_scores.production_evidence_rollout_reason).toBe(
      'online_enabled_subject_match',
    );
    expect(result.runtime_audit_contract.promoted_path.route_scores.production_evidence_rollout_bundle_ids).toEqual([
      'phase_b_pilot_ready_v1',
    ]);
    expect(result.runtime_audit_contract.promoted_path.route_scores.production_evidence_rollout_corpus_versions).toEqual([
      'rag_production_evidence_pilot_20260313',
    ]);
    expect(result.runtime_audit_contract.promoted_path.route_scores.production_evidence_rollout_source_types).toEqual([
      'evidence_authored',
      'evidence_transformed',
    ]);
    expect(result.runtime_audit_contract.promoted_path.final_execution_route).toBe('s2_augmentation');
    expect(result.runtime_audit_contract.promoted_path.query_mode).toBe('s2_multi_hop');
    expect(result.runtime_audit_contract.control_path.status).toBe('pass');
    expect(result.runtime_audit_contract.control_path.route_scores.production_evidence_rollout_active).toBe(false);
    expect(result.runtime_audit_contract.control_path.route_scores.production_evidence_rollout_reason).toBe(
      'no_subject_match',
    );
    expect(result.runtime_audit_contract.control_path.route_scores.production_evidence_rollout_bundle_ids).toEqual([]);
    expect(result.runtime_audit_contract.control_path.route_scores.production_evidence_rollout_corpus_versions).toEqual([]);
    expect(result.runtime_audit_contract.control_path.route_scores.production_evidence_rollout_source_types).toEqual([]);
  });

  test('renders a markdown report with the key rollout outcomes', async () => {
    const result = await buildProductionEvidenceFirstOnlineRolloutVerification({
      rolloutGate: readJson('data/evidence/production/rollout_gate_v1.json'),
      whitelist: readJson('data/evidence/production/whitelist_v1.json'),
    });

    const report = renderProductionEvidenceFirstOnlineRolloutVerificationReport(result);

    expect(report).toContain('# Phase B First Online Rollout Verification');
    expect(report).toContain('target_subject: `9702`');
    expect(report).toContain('control_subject: `9231`');
    expect(report).toContain('target_promoted: `true`');
    expect(report).toContain('control_blocked: `true`');
    expect(report).toContain('evidence_reserved_blocked: `true`');
    expect(report).toContain('s1_passed: `true`');
    expect(report).toContain('s2_passed: `true`');
    expect(report).toContain('online_bundle_ids: `phase_b_pilot_ready_v1`');
    expect(report).toContain('online_subject_codes: `9702`');
    expect(report).toContain('online_corpus_versions: `rag_production_evidence_pilot_20260313`');
    expect(report).toContain('runtime_audit_contract.promoted_path: `pass`');
    expect(report).toContain('runtime_audit_contract.control_path: `pass`');
    expect(report).toContain('set rollout_state back to offline_default and rerun gate plus focused verification artifacts');
  });
});
