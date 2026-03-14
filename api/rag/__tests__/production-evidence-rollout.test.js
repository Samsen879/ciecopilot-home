import { resolveProductionEvidenceRetrievalRollout } from '../lib/production-evidence-rollout.js';

function createOnlineGate() {
  return {
    entries: [
      {
        bundle_id: 'phase_b_pilot_ready_v1',
        subject_codes: ['9702'],
        rollout_state: 'online_enabled',
        corpus_versions: ['rag_production_evidence_pilot_20260313'],
        allowed_source_types: ['evidence_authored', 'evidence_transformed'],
      },
    ],
  };
}

describe('production evidence retrieval rollout runtime', () => {
  test('keeps evidence_reserved blocked even when a subject is online-enabled', () => {
    const result = resolveProductionEvidenceRetrievalRollout({
      retrievalConfig: {
        corpusVersions: ['rag_step3_9702_question_aware_v1'],
        excludedSourceTypes: [],
        excludedCorpusVersions: [],
        productionEvidenceRolloutEnabled: true,
        productionEvidenceRolloutGate: createOnlineGate(),
      },
      subjectCode: '9702',
    });

    expect(result.audit.active).toBe(true);
    expect(result.audit.unblocked_source_types).toEqual([
      'evidence_authored',
      'evidence_transformed',
    ]);
    expect(result.corpusVersions).toEqual([
      'rag_step3_9702_question_aware_v1',
      'rag_production_evidence_pilot_20260313',
    ]);
    expect(result.excludedSourceTypes).toEqual(['evidence_reserved']);
    expect(result.excludedCorpusVersions).toBeNull();
  });

  test('fails closed when rollout is enabled but the gate file is missing', () => {
    const result = resolveProductionEvidenceRetrievalRollout({
      retrievalConfig: {
        corpusVersions: ['rag_step3_9702_question_aware_v1'],
        excludedSourceTypes: [],
        excludedCorpusVersions: [],
        productionEvidenceRolloutEnabled: true,
        productionEvidenceRolloutGate: null,
      },
      subjectCode: '9702',
    });

    expect(result.audit.reason).toBe('rollout_gate_missing');
    expect(result.excludedSourceTypes).toEqual([
      'evidence_authored',
      'evidence_transformed',
      'evidence_reserved',
    ]);
  });

  test('fails closed when the gate matches but baseline corpus allowlist is missing', () => {
    const result = resolveProductionEvidenceRetrievalRollout({
      retrievalConfig: {
        corpusVersions: [],
        excludedSourceTypes: [],
        excludedCorpusVersions: [],
        productionEvidenceRolloutEnabled: true,
        productionEvidenceRolloutGate: createOnlineGate(),
      },
      subjectCode: '9702',
    });

    expect(result.audit.reason).toBe('baseline_corpus_versions_required');
    expect(result.corpusVersions).toBeNull();
    expect(result.excludedSourceTypes).toEqual([
      'evidence_authored',
      'evidence_transformed',
      'evidence_reserved',
    ]);
    expect(result.excludedCorpusVersions).toEqual(['rag_production_evidence_pilot_20260313']);
  });
});
