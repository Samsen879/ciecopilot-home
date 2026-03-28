import {
  RUNTIME_CORE_OWNERSHIP,
  SUBJECT_ADAPTER_CAPABILITY_POSTURES,
  SUBJECT_ADAPTER_OWNERSHIP,
} from '../lib/subjects/subject-adapter-contract.js';
import {
  SUBJECT_ADAPTER_DECISION,
  buildSubjectRuntimePosture,
  getSubjectAdapter,
  getSubjectCapabilityPosture,
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

  test('9709 is fully supported and 9702 is registered through a fallback-only boundary', () => {
    const currentAdapter = getSubjectAdapter('9709');
    const selectedNextAdapter = getSubjectAdapter('9702');

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
      runtime_enabled: true,
      selection_state: 'selected_next',
    });
    expect(getSubjectCapabilityPosture('9709', 'classification'))
      .toBe(SUBJECT_ADAPTER_CAPABILITY_POSTURES.SUPPORTED);
    expect(getSubjectCapabilityPosture('9709', 'marking'))
      .toBe(SUBJECT_ADAPTER_CAPABILITY_POSTURES.SUPPORTED);
    expect(getSubjectCapabilityPosture('9709', 'mastery'))
      .toBe(SUBJECT_ADAPTER_CAPABILITY_POSTURES.SUPPORTED);
    expect(getSubjectCapabilityPosture('9709', 'review'))
      .toBe(SUBJECT_ADAPTER_CAPABILITY_POSTURES.SUPPORTED);
    expect(getSubjectCapabilityPosture('9702', 'classification'))
      .toBe(SUBJECT_ADAPTER_CAPABILITY_POSTURES.SUPPORTED);
    expect(getSubjectCapabilityPosture('9702', 'marking'))
      .toBe(SUBJECT_ADAPTER_CAPABILITY_POSTURES.FALLBACK_ONLY);
    expect(getSubjectCapabilityPosture('9702', 'mastery'))
      .toBe(SUBJECT_ADAPTER_CAPABILITY_POSTURES.FALLBACK_ONLY);
    expect(getSubjectCapabilityPosture('9702', 'review'))
      .toBe(SUBJECT_ADAPTER_CAPABILITY_POSTURES.FALLBACK_ONLY);
  });

  test('9702 marking fails closed with explicit fallback posture instead of math scoring', () => {
    const selectedNextAdapter = getSubjectAdapter('9702');

    expect(selectedNextAdapter.marking.resolveReleasedScoringPosture({
      questionTypeId: '9702.mechanics.force_balance',
      questionTypeReleaseState: 'released',
      candidateRubricRefs: [
        {
          kind: 'rubric_release',
          rubric_version_id: '9702.mechanics.force_balance.v1',
          release_state: 'released',
        },
      ],
      uncertaintyValidated: true,
      classificationConfidence: 0.91,
    })).toMatchObject({
      authoritative_scoring_allowed: false,
      fallback_mode: 'non_released_fallback',
      fallback_reason_code: 'subject_adapter_capability_not_enabled',
      classification_confidence: 0.91,
      learning_signal_posture: 'conservative_fallback',
    });
  });

  test('9702 runtime posture is explicitly read-only for session and workspace surfaces', () => {
    expect(buildSubjectRuntimePosture('9702')).toMatchObject({
      subject_code: '9702',
      display_name: 'Physics',
      selection_state: 'selected_next',
      read_only: true,
      authoritative_scoring_allowed: false,
      release_scope_status: 'non_released_fallback',
      fallback_mode: 'non_released_fallback',
      fallback_reason_code: 'subject_adapter_capability_not_enabled',
      learning_signal_posture: 'conservative_fallback',
      supported_capabilities: ['classification'],
      fallback_capabilities: ['marking', 'mastery', 'review'],
    });
  });
});
