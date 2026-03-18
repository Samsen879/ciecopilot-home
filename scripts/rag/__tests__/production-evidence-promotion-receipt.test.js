import {
  buildProductionEvidencePromotionReceipt,
  renderProductionEvidencePromotionReceiptReport,
} from '../lib/production-evidence-promotion-receipt.js';

describe('production evidence promotion receipt', () => {
  test('records rollback guidance and rollout gate untouched semantics', () => {
    const receipt = buildProductionEvidencePromotionReceipt({
      generatedAt: '2026-03-18T11:00:00.000Z',
      mode: 'dry-run',
      sourceCandidate: {
        bundle_id: 'phase_d_gap_fill_candidate_9231_v1',
        manifest_path: 'tmp/review_candidates/phase_d_gap_fill_candidate_9231_v1/manifest.json',
      },
      targetBundle: {
        bundle_id: 'phase_e_pilot_ready_9231_v1',
        manifest_path: 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json',
        bundle_dir: 'data/evidence/production/phase_e_pilot_ready_9231_v1',
        subject_codes: ['9231'],
      },
      whitelistUpdate: {
        path: 'data/evidence/production/whitelist_v1.json',
        changed: true,
        replayed: false,
      },
      approvedCorpusVersions: ['rag_production_evidence_pilot_9231_20260318'],
      validation: {
        manifest_valid: true,
        whitelist_valid: true,
        release_ready: true,
        ingest_permitted: true,
      },
      rolloutGatePath: 'data/evidence/production/rollout_gate_v1.json',
      receiptPath: 'docs/reports/receipts/phase_e_promotion_9231_v1.json',
      receiptMdPath: 'docs/reports/receipts/phase_e_promotion_9231_v1.md',
    });

    expect(receipt.rollout_gate).toEqual({
      touched: false,
      path: 'data/evidence/production/rollout_gate_v1.json',
    });
    expect(receipt.validation).toMatchObject({
      manifest_valid: true,
      whitelist_valid: true,
      release_ready: true,
      ingest_permitted: true,
    });
    expect(receipt.rollback_guidance.paths).toEqual(
      expect.arrayContaining([
        'data/evidence/production/phase_e_pilot_ready_9231_v1',
        'data/evidence/production/whitelist_v1.json',
        'docs/reports/receipts/phase_e_promotion_9231_v1.json',
      ]),
    );
  });

  test('renders a concise markdown receipt report', () => {
    const receipt = buildProductionEvidencePromotionReceipt({
      generatedAt: '2026-03-18T11:00:00.000Z',
      mode: 'proposal-only',
      sourceCandidate: {
        bundle_id: 'phase_d_gap_fill_candidate_9231_v1',
        manifest_path: 'tmp/review_candidates/phase_d_gap_fill_candidate_9231_v1/manifest.json',
      },
      targetBundle: {
        bundle_id: 'phase_e_pilot_ready_9231_v1',
        manifest_path: 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json',
        bundle_dir: 'data/evidence/production/phase_e_pilot_ready_9231_v1',
        subject_codes: ['9231'],
      },
      whitelistUpdate: {
        path: 'data/evidence/production/whitelist_v1.json',
        changed: false,
        replayed: true,
      },
      approvedCorpusVersions: ['rag_production_evidence_pilot_9231_20260318'],
      validation: {
        manifest_valid: true,
        whitelist_valid: true,
        release_ready: true,
        ingest_permitted: true,
      },
      rolloutGatePath: 'data/evidence/production/rollout_gate_v1.json',
      receiptPath: 'docs/reports/receipts/phase_e_promotion_9231_v1.json',
      receiptMdPath: 'docs/reports/receipts/phase_e_promotion_9231_v1.md',
    });

    const report = renderProductionEvidencePromotionReceiptReport(receipt);

    expect(report).toContain('# Production Evidence Promotion Receipt');
    expect(report).toContain('phase_e_pilot_ready_9231_v1');
    expect(report).toContain('rollout_gate_touched');
    expect(report).toContain('rollback_guidance');
  });
});
