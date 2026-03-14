import { buildProductionEvidenceGovernanceStatus } from '../lib/production-evidence-governance-status.js';

function buildArtifacts(overrides = {}) {
  return {
    runbook: { path: 'docs/reports/rag_phase_b_production_evidence_runbook_20260313.md', exists: true },
    whitelist: { path: 'data/evidence/production/whitelist_v1.json', exists: true },
    manifest_check: { path: 'runs/backend/rag_phase_b_production_evidence_seed_check.json', exists: true },
    whitelist_check: { path: 'runs/backend/rag_phase_b_production_evidence_whitelist_check.json', exists: true },
    release_gate: { path: 'runs/backend/rag_phase_b_production_evidence_release_gate.json', exists: true },
    ingest_preflight: { path: 'runs/backend/rag_phase_b_production_evidence_ingest_preflight.json', exists: true },
    ...overrides,
  };
}

describe('production evidence governance status', () => {
  test('reports governance-valid but non-release-ready seed as overall pass', () => {
    const result = buildProductionEvidenceGovernanceStatus({
      requiredArtifacts: buildArtifacts(),
      manifestCheck: { ok: true, summary: { bundle_id: 'phase_b_seed_v1' } },
      whitelistCheck: { ok: true, summary: { bundle_id: 'phase_b_seed_v1' } },
      releaseGate: { status: 'pass', release_ready: false, blocked_reasons: ['release_ready_expected_false'] },
      ingestPreflight: { status: 'blocked', ingest_permitted: false, blocked_reasons: ['ingest_not_allowed'] },
    });

    expect(result.status).toBe('pass');
    expect(result.summary.governance_valid).toBe(true);
    expect(result.summary.release_ready).toBe(false);
    expect(result.summary.ingest_permitted).toBe(false);
  });

  test('fails when required artifacts are missing', () => {
    const result = buildProductionEvidenceGovernanceStatus({
      requiredArtifacts: buildArtifacts({
        whitelist_check: { path: 'runs/backend/rag_phase_b_production_evidence_whitelist_check.json', exists: false },
      }),
      manifestCheck: { ok: true, summary: { bundle_id: 'phase_b_seed_v1' } },
      whitelistCheck: { ok: true, summary: { bundle_id: 'phase_b_seed_v1' } },
      releaseGate: { status: 'pass', release_ready: false, blocked_reasons: [] },
      ingestPreflight: { status: 'blocked', ingest_permitted: false, blocked_reasons: [] },
    });

    expect(result.status).toBe('fail');
    expect(result.blocked_reasons).toContain('required_phase_b_artifacts_missing');
  });

  test('marks governance invalid when lower gate validation fails', () => {
    const result = buildProductionEvidenceGovernanceStatus({
      requiredArtifacts: buildArtifacts(),
      manifestCheck: { ok: true, summary: { bundle_id: 'phase_b_seed_v1' } },
      whitelistCheck: { ok: false, summary: { bundle_id: 'phase_b_seed_v1' } },
      releaseGate: { status: 'fail', release_ready: false, blocked_reasons: ['bundle_not_whitelisted'] },
      ingestPreflight: { status: 'blocked', ingest_permitted: false, blocked_reasons: ['bundle_not_whitelisted'] },
    });

    expect(result.status).toBe('fail');
    expect(result.summary.governance_valid).toBe(false);
    expect(result.blocked_reasons).toContain('phase_b_governance_invalid');
  });
});
