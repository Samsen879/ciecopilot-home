import fs from 'node:fs';
import { jest } from '@jest/globals';

function createSpyService(methodName, implementation) {
  return {
    async [methodName](input) {
      return implementation(input);
    },
  };
}

beforeEach(() => {
  jest.resetModules();
});

afterEach(() => {
  jest.restoreAllMocks();
});

function buildReleasedPerformanceInput(overrides = {}) {
  return {
    user_id: 'student-1',
    question_id: 'question-1',
    question_context: {
      family_id: '9709.trigonometry_manipulation_equations',
      question_type_id: '9709.trigonometry.equations',
      question_type_release_state: 'released',
      primary_topic_id: 'topic-trig-equations',
      classification_confidence: 0.93,
      confidence_band: 'high',
      candidate_rubric_refs: [
        {
          kind: 'rubric_release',
          rubric_version_id: 'trig-eq-v1',
          release_state: 'released',
        },
      ],
    },
    source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1' },
    source_mark_run_ref: { kind: 'mark_run', mark_run_id: 'mark-run-1' },
    decisions: [
      {
        awarded: true,
        awarded_marks: 2,
        alignment_confidence: 0.94,
      },
    ],
    marking_result: {
      marking_summary: {
        coverage_scope: 'question',
        local_signal_only: false,
        conservative_part_mapping: false,
        ambiguous_rubric_point_result_count: 0,
      },
    },
    uncertainty_validated: true,
    ...overrides,
  };
}

function buildPositiveTypeEffect(overrides = {}) {
  return {
    effect_key: 'mastery:positive-type',
    user_id: 'student-1',
    level: 'question_type',
    topic_id: 'topic-trig-equations',
    family_id: '9709.trigonometry_manipulation_equations',
    question_type_id: '9709.trigonometry.equations',
    mastery_state: {
      signal_direction: 'positive',
      signal_weight: 'authoritative',
      release_scope_status: 'released_scoring',
    },
    signal_summary: {
      source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1' },
      source_mark_run_ref: { kind: 'mark_run', mark_run_id: 'mark-run-1' },
      released_scope_check: {
        released_scoring: true,
        non_released_fallback: false,
      },
      mastery_evidence: {
        valid_performance_evidence: true,
        performance_evidence_kind: 'marking_performance',
        evidence_kind: 'marking_outcome',
        confidence_band: 'high',
        classification_confidence: 0.93,
        freshness_bucket: 'fresh',
      },
      mastery_guardrail_decision: {
        mastery_write_allowed: true,
        positive_mastery_allowed: true,
        valid_performance_evidence: true,
        blocked_mastery_reason_code: null,
      },
    },
    ...overrides,
  };
}

describe('mastery-orchestrator', () => {
  test.each([
    'reading',
    'browsing',
    'artifact_view',
    'raw_chat',
    'explanation_exposure',
    'classification_only',
    'non_released_fallback_diagnostic',
  ])('blocks hidden mastery writes for passive evidence kind %s', async (evidenceKind) => {
    const { buildLearningUpdateProposal } = await import('../lib/mastery/mastery-orchestrator.js');

    const proposal = buildLearningUpdateProposal(buildReleasedPerformanceInput({
      evidence_kind: evidenceKind,
    }));

    expect(proposal.guardrail_decisions).toMatchObject({
      mastery_write_allowed: false,
      valid_performance_evidence: false,
      blocked_mastery_reason_code: 'passive_or_non_performance_evidence',
    });
    expect(proposal.masteryUpdates).toEqual([]);
    expect(proposal.proposedMasteryEffects).toEqual([]);
  });

  test('materializeProposedMasteryEffect no-ops positive type mastery without released performance evidence', async () => {
    const { createMasteryOrchestrator } = await import('../lib/mastery/mastery-orchestrator.js');
    const orchestrator = createMasteryOrchestrator();

    const result = await orchestrator.materializeProposedMasteryEffect({
      effect_key: 'mastery:unsafe-positive-type',
      user_id: 'student-1',
      level: 'question_type',
      topic_id: 'topic-trig-equations',
      family_id: '9709.trigonometry_manipulation_equations',
      question_type_id: '9709.trigonometry.equations',
      mastery_state: {
        signal_direction: 'positive',
        signal_weight: 'authoritative',
        release_scope_status: 'non_released_fallback',
      },
      signal_summary: {
        source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1' },
        released_scope_check: {
          released_scoring: false,
          non_released_fallback: true,
        },
      },
    });

    expect(result).toMatchObject({
      effect_status: 'noop',
      effect_key: 'mastery:unsafe-positive-type',
      guardrail_decision: {
        mastery_write_allowed: false,
        blocked_mastery_reason_code: 'missing_released_performance_evidence',
      },
    });
  });

  test.each([
    [
      'passive evidence',
      {
        evidence_kind: 'reading',
        blocked_mastery_reason_code: 'passive_or_non_performance_evidence',
      },
    ],
    [
      'stale evidence',
      {
        freshness_bucket: 'stale',
        blocked_mastery_reason_code: 'stale_performance_evidence',
      },
    ],
    [
      'low confidence band',
      {
        confidence_band: 'low',
        classification_confidence: 0.79,
        blocked_mastery_reason_code: 'low_confidence_performance_evidence',
      },
    ],
    [
      'missing classification confidence',
      {
        classification_confidence: null,
        blocked_mastery_reason_code: 'low_confidence_performance_evidence',
      },
    ],
  ])('materializeProposedMasteryEffect no-ops positive type mastery with %s', async (
    _label,
    evidenceOverrides,
  ) => {
    const { createMasteryOrchestrator } = await import('../lib/mastery/mastery-orchestrator.js');
    const orchestrator = createMasteryOrchestrator();

    const result = await orchestrator.materializeProposedMasteryEffect(buildPositiveTypeEffect({
      effect_key: `mastery:unsafe-${_label.replace(/\s+/g, '-')}`,
      signal_summary: {
        ...buildPositiveTypeEffect().signal_summary,
        mastery_evidence: {
          ...buildPositiveTypeEffect().signal_summary.mastery_evidence,
          ...evidenceOverrides,
        },
        mastery_guardrail_decision: {
          ...buildPositiveTypeEffect().signal_summary.mastery_guardrail_decision,
          positive_mastery_allowed:
            evidenceOverrides.blocked_mastery_reason_code === undefined,
          blocked_mastery_reason_code:
            evidenceOverrides.blocked_mastery_reason_code ?? null,
        },
      },
    }));

    expect(result).toMatchObject({
      effect_status: 'noop',
      guardrail_decision: {
        mastery_write_allowed: false,
        blocked_mastery_reason_code: evidenceOverrides.blocked_mastery_reason_code,
      },
    });
  });

  test('materializeProposedMasteryEffect no-ops family-level positive mastery without full guardrail approval', async () => {
    const { createMasteryOrchestrator } = await import('../lib/mastery/mastery-orchestrator.js');
    const orchestrator = createMasteryOrchestrator();

    const result = await orchestrator.materializeProposedMasteryEffect({
      ...buildPositiveTypeEffect({
        effect_key: 'mastery:unsafe-family-positive',
        level: 'family',
        question_type_id: null,
      }),
      signal_summary: {
        ...buildPositiveTypeEffect().signal_summary,
        mastery_guardrail_decision: null,
      },
    });

    expect(result).toMatchObject({
      effect_status: 'noop',
      guardrail_decision: {
        mastery_write_allowed: false,
        blocked_mastery_reason_code: 'missing_mastery_guardrail_decision',
      },
    });
  });

  test('buildLearningUpdateProposal requires released_scope_check for positive mastery movement', async () => {
    const { buildLearningUpdateProposal } = await import('../lib/mastery/mastery-orchestrator.js');

    const proposal = buildLearningUpdateProposal(buildReleasedPerformanceInput({
      release_scope_posture: {
        release_scope_status: 'released_scoring',
        authoritative_scoring_allowed: true,
        fallback_mode: null,
        fallback_reason_code: null,
        classification_confidence: 0.93,
        learning_signal_posture: 'authoritative_scoring',
      },
    }));

    expect(proposal.guardrail_decisions).toMatchObject({
      positive_mastery_allowed: false,
      blocked_mastery_reason_code: 'released_scope_check_not_satisfied',
      released_scope_check: null,
    });
    expect(proposal.masteryUpdates).toEqual([]);
    expect(proposal.proposedMasteryEffects).toEqual([]);
  });

  test('does not re-read released-family evidence on already-authoritative learning effects', async () => {
    const readFileSpy = jest.spyOn(fs, 'readFileSync');
    const { applyLearningEffects } = await import('../lib/mastery/mastery-orchestrator.js');
    const readsAfterImport = readFileSpy.mock.calls.length;

    const reviewTaskService = createSpyService('generateTasksFromOutcome', async () => []);
    const artifactService = createSpyService('buildArtifactCandidates', async () => []);
    const reconciliationService = createSpyService('reconcileDerivedState', async ({ derivedState }) => ({
      reconciliation_run_id: 'recon-hot-path',
      status: 'completed',
      derived_state: derivedState,
    }));

    await applyLearningEffects(
      {
        user_id: 'student-1',
        question_id: 'question-1',
        question_context: {
          family_id: '9709.trigonometry_manipulation_equations',
          question_type_id: '9709.trigonometry.equations',
          question_type_release_state: 'released',
          primary_topic_id: 'topic-trig-equations',
          classification_confidence: 0.93,
          candidate_rubric_refs: [
            {
              kind: 'rubric_release',
              rubric_version_id: 'trig-eq-v1',
              release_state: 'released',
            },
          ],
        },
        decisions: [
          {
            awarded: true,
            awarded_marks: 2,
            alignment_confidence: 0.94,
          },
        ],
        uncertainty_validated: true,
        release_scope_posture: {
          release_scope_status: 'released_scoring',
          authoritative_scoring_allowed: true,
          fallback_mode: null,
          fallback_reason_code: null,
          classification_confidence: 0.93,
          learning_signal_posture: 'authoritative_scoring',
        },
      },
      {
        reviewTaskService,
        artifactService,
        reconciliationService,
      },
    );

    expect(readFileSpy.mock.calls.length).toBe(readsAfterImport);
  });
});
