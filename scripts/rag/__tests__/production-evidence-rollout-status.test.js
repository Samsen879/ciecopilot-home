import fs from 'node:fs';
import path from 'node:path';
import { buildProductionEvidenceFirstOnlineRolloutVerification } from '../lib/production-evidence-first-online-rollout-verification.js';
import {
  buildProductionEvidenceRolloutStatus,
  renderProductionEvidenceRolloutStatusReport,
} from '../lib/production-evidence-rollout-status.js';

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relPath), 'utf8'));
}

async function buildVerificationArtifact() {
  return {
    bundle_id: 'phase_b_pilot_ready_v1',
    subject_codes: ['9702'],
    path: 'runs/backend/rag_phase_b_first_online_rollout_9702.json',
    payload: await buildProductionEvidenceFirstOnlineRolloutVerification({
      rolloutGate: readJson('data/evidence/production/rollout_gate_v1.json'),
      whitelist: readJson('data/evidence/production/whitelist_v1.json'),
    }),
  };
}

describe('production evidence rollout status', () => {
  test('builds a healthy single-rollout status from the checked-in gate and verification artifacts', async () => {
    const result = buildProductionEvidenceRolloutStatus({
      rolloutGateArtifact: readJson('runs/backend/rag_phase_b_production_evidence_rollout_gate.json'),
      rolloutGate: readJson('data/evidence/production/rollout_gate_v1.json'),
      verificationArtifacts: [await buildVerificationArtifact()],
    });

    expect(result.online_bundle_ids).toEqual(['phase_b_pilot_ready_v1']);
    expect(result.online_subject_codes).toEqual(['9702']);
    expect(result.online_corpus_versions).toEqual(['rag_production_evidence_pilot_20260313']);
    expect(result.rollout_healthy).toBe(true);
    expect(result.rollback_required).toBe(false);
    expect(result.rollback_reasons).toEqual([]);
    expect(result.recommended_action).toBe('keep_online');
    expect(result.checks.target_promoted).toBe(true);
    expect(result.checks.control_blocked).toBe(true);
    expect(result.checks.evidence_reserved_blocked).toBe(true);
    expect(result.checks.s1_passed).toBe(true);
    expect(result.checks.s2_passed).toBe(true);
    expect(result.runtime_audit_contract.promoted_path).toBe('pass');
    expect(result.runtime_audit_contract.control_path).toBe('pass');
  });

  test('marks rollout unsafe when an online entry has no explicit verification artifact mapping', async () => {
    const gateArtifact = readJson('runs/backend/rag_phase_b_production_evidence_rollout_gate.json');
    gateArtifact.summary.online_bundle_ids = ['phase_b_pilot_ready_v1', 'phase_b_extra_ready_v2'];
    gateArtifact.summary.online_subject_codes = ['9702', '9231'];
    gateArtifact.summary.online_corpus_versions = [
      'rag_production_evidence_pilot_20260313',
      'rag_production_evidence_pilot_20260314',
    ];

    const rolloutGate = readJson('data/evidence/production/rollout_gate_v1.json');
    rolloutGate.entries.push({
      bundle_id: 'phase_b_extra_ready_v2',
      manifest_path: 'data/evidence/production/pilot_ready_v2/manifest.json',
      subject_scope: 'single_subject',
      subject_codes: ['9231'],
      rollout_state: 'online_enabled',
      corpus_versions: ['rag_production_evidence_pilot_20260314'],
      allowed_source_types: ['evidence_authored', 'evidence_transformed'],
    });

    const result = buildProductionEvidenceRolloutStatus({
      rolloutGateArtifact: gateArtifact,
      rolloutGate,
      verificationArtifacts: [await buildVerificationArtifact()],
    });

    expect(result.rollout_healthy).toBe(false);
    expect(result.rollback_required).toBe(true);
    expect(result.rollback_reasons).toEqual(
      expect.arrayContaining([expect.stringContaining('online_entry_missing_verification_artifact_mapping')]),
    );
    expect(result.verification_mapping.unmapped_online_entries).toHaveLength(1);
    expect(result.recommended_action).toBe('rollback_to_offline');
  });

  test('marks rollout unsafe when the verification artifact lacks explicit runtime audit excerpts', async () => {
    const verificationArtifact = await buildVerificationArtifact();
    delete verificationArtifact.payload.runtime_audit_contract;

    const result = buildProductionEvidenceRolloutStatus({
      rolloutGateArtifact: readJson('runs/backend/rag_phase_b_production_evidence_rollout_gate.json'),
      rolloutGate: readJson('data/evidence/production/rollout_gate_v1.json'),
      verificationArtifacts: [verificationArtifact],
    });

    expect(result.rollout_healthy).toBe(false);
    expect(result.rollback_required).toBe(true);
    expect(result.rollback_reasons).toEqual(
      expect.arrayContaining([expect.stringContaining('verification_artifact_missing_runtime_audit_contract')]),
    );
    expect(result.runtime_audit_contract.promoted_path).toBe('fail');
    expect(result.runtime_audit_contract.control_path).toBe('fail');
  });

  test('marks rollout unsafe when the verification artifact has no explicit entry mapping metadata', async () => {
    const verificationArtifact = await buildVerificationArtifact();
    delete verificationArtifact.bundle_id;
    delete verificationArtifact.subject_codes;

    const result = buildProductionEvidenceRolloutStatus({
      rolloutGateArtifact: readJson('runs/backend/rag_phase_b_production_evidence_rollout_gate.json'),
      rolloutGate: readJson('data/evidence/production/rollout_gate_v1.json'),
      verificationArtifacts: [verificationArtifact],
    });

    expect(result.rollout_healthy).toBe(false);
    expect(result.rollback_required).toBe(true);
    expect(result.rollback_reasons).toEqual(
      expect.arrayContaining([expect.stringContaining('online_entry_missing_verification_artifact_mapping')]),
    );
  });

  test('treats the all-offline steady state as healthy after rollback', () => {
    const gateArtifact = readJson('runs/backend/rag_phase_b_production_evidence_rollout_gate.json');
    gateArtifact.summary.online_bundle_ids = [];
    gateArtifact.summary.online_subject_codes = [];
    gateArtifact.summary.online_corpus_versions = [];
    gateArtifact.summary.offline_bundle_ids = ['phase_b_pilot_ready_v1'];

    const rolloutGate = readJson('data/evidence/production/rollout_gate_v1.json');
    rolloutGate.entries[0].rollout_state = 'offline_default';

    const result = buildProductionEvidenceRolloutStatus({
      rolloutGateArtifact: gateArtifact,
      rolloutGate,
      verificationArtifacts: [],
    });

    expect(result.online_bundle_ids).toEqual([]);
    expect(result.rollout_healthy).toBe(true);
    expect(result.rollback_required).toBe(false);
    expect(result.rollback_reasons).toEqual([]);
    expect(result.recommended_action).toBe('hold_offline');
    expect(result.runtime_audit_contract.promoted_path).toBe('not_applicable');
    expect(result.runtime_audit_contract.control_path).toBe('not_applicable');
  });

  test('renders the rollback policy and runtime audit summary', async () => {
    const result = buildProductionEvidenceRolloutStatus({
      rolloutGateArtifact: readJson('runs/backend/rag_phase_b_production_evidence_rollout_gate.json'),
      rolloutGate: readJson('data/evidence/production/rollout_gate_v1.json'),
      verificationArtifacts: [await buildVerificationArtifact()],
    });

    const report = renderProductionEvidenceRolloutStatusReport(result);

    expect(report).toContain('# Phase B Production Evidence Rollout Status');
    expect(report).toContain('rollout_healthy: `true`');
    expect(report).toContain('rollback_required: `false`');
    expect(report).toContain('recommended_action: `keep_online`');
    expect(report).toContain('runtime_audit_contract.promoted_path: `pass`');
    expect(report).toContain('runtime_audit_contract.control_path: `pass`');
  });
});
