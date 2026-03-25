import {
  RUNTIME_CORE_OWNERSHIP,
  SUBJECT_ADAPTER_OWNERSHIP,
} from '../lib/subjects/subject-adapter-contract.js';
import {
  SUBJECT_ADAPTER_DECISION,
  getSubjectAdapter,
} from '../lib/subjects/subject-adapter-registry.js';

describe('subject adapter registry', () => {
  test('freezes runtime-core-owned versus adapter-owned responsibilities', () => {
    expect(RUNTIME_CORE_OWNERSHIP).toEqual(
      expect.arrayContaining([
        'study-session lifecycle and typed active_scope_bundle persistence',
        'workspace, artifact, and review-task repositories plus immutable lineage',
        'reconciliation, idempotency, and generic learning HTTP/error envelopes',
      ]),
    );

    expect(SUBJECT_ADAPTER_OWNERSHIP).toMatchObject({
      classification: expect.arrayContaining([
        'question family/type semantics and canonical import normalization',
      ]),
      marking: expect.arrayContaining([
        'released scoring posture interpretation for subject question types',
      ]),
      mastery: expect.arrayContaining([
        'mastery signal allocation and type-versus-family promotion semantics',
      ]),
      review: expect.arrayContaining([
        'review trigger routing and subject-specific scheduling semantics',
      ]),
    });
  });

  test('9709 is runtime-enabled and 9702 is the selected next subject', () => {
    const currentAdapter = getSubjectAdapter('9709');
    const selectedNextAdapter = getSubjectAdapter('9702', { allowDisabled: true });

    expect(currentAdapter.meta).toMatchObject({
      subject_code: '9709',
      runtime_enabled: true,
    });
    expect(currentAdapter.classification.mergeCanonicalClassification).toEqual(expect.any(Function));
    expect(currentAdapter.marking.resolveReleasedScoringPosture).toEqual(expect.any(Function));
    expect(currentAdapter.mastery.buildMasteryProjection).toEqual(expect.any(Function));
    expect(currentAdapter.review.buildSchedulerSeed).toEqual(expect.any(Function));

    expect(SUBJECT_ADAPTER_DECISION).toMatchObject({
      current_runtime_subject: '9709',
      selected_next_subject: '9702',
    });
    expect(selectedNextAdapter.meta).toMatchObject({
      subject_code: '9702',
      runtime_enabled: false,
      selection_state: 'selected_next',
    });
  });

  test('disabled next-subject adapters fail explicitly instead of falling back to math defaults', () => {
    expect(() => getSubjectAdapter('9702')).toThrow(/not enabled/i);
  });
});
