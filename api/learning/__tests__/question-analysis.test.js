import {
  buildQuestionAnalysisResult,
} from '../lib/question-analysis/analysis-result-contract.js';
import {
  buildLowConfidencePosture,
} from '../lib/question-analysis/low-confidence-posture.js';
import {
  normalizeQuestionEnvelope,
} from '../lib/question-analysis/question-envelope-contract.js';
import {
  resolveCandidateRubricRefs,
} from '../lib/question-analysis/candidate-rubric-ref-resolver.js';
import {
  QuestionAnalysisValidationError,
  validateQuestionAnalysisResult,
  validateQuestionEnvelope,
} from '../lib/question-analysis/runtime-validator.js';

describe('question-analysis foundation', () => {
  test('normalizeQuestionEnvelope keeps the contract source-agnostic while normalizing imported-question input', () => {
    const envelope = normalizeQuestionEnvelope({
      source_kind: 'imported_question',
      subject_code: '9709',
      prompt_representation: {
        type: 'text',
        value: ' Solve 2sin(x)=1 for 0<=x<=360. ',
      },
      provenance_summary: {
        intake_mode: 'manual_paste',
      },
    });

    expect(validateQuestionEnvelope(envelope)).toEqual(
      expect.objectContaining({
        source_kind: 'imported_question',
        subject_code: '9709',
        prompt_representation: expect.objectContaining({
          type: 'text',
        }),
        provenance_summary: {
          intake_mode: 'manual_paste',
        },
      }),
    );
  });

  test('buildQuestionAnalysisResult derives seeded rubric refs, confidence band, and low-confidence audit posture for pilot types', () => {
    const envelope = normalizeQuestionEnvelope({
      source_kind: 'imported_question',
      subject_code: '9709',
      prompt_representation: {
        type: 'text',
        value: 'Find the value of integral of (2x+1)(x^2+x)^4 dx.',
      },
      provenance_summary: {
        import_source: 'manual_paste',
      },
    });

    const result = buildQuestionAnalysisResult({
      envelope,
      classification: {
        primary_question_type_id: '9709.integration.application',
        classification_confidence: 0.77,
        uncertainty_validated: true,
        analysis_provenance_kind: 'real',
      },
    });

    expect(result).toMatchObject({
      family_id: '9709.integration_techniques',
      primary_question_type_id: '9709.integration.application',
      confidence_band: 'low',
      low_confidence_posture: expect.objectContaining({
        posture: 'low_confidence',
        authoritative_scoring_allowed: false,
        fallback_reason_code: 'low_classification_confidence',
      }),
      candidate_rubric_refs: [
        expect.objectContaining({
          kind: 'rubric_release',
          rubric_set_id: '9709.integration.application',
          release_state: 'released',
        }),
      ],
      analysis_audit_metadata: expect.objectContaining({
        low_confidence_posture: expect.objectContaining({
          posture: 'low_confidence',
          authoritative_scoring_allowed: false,
        }),
      }),
    });
    expect(validateQuestionAnalysisResult(result)).toEqual(result);
  });

  test('buildLowConfidencePosture is null when the confidence band is not low', () => {
    expect(
      buildLowConfidencePosture({
        classificationConfidence: 0.86,
        confidenceBand: 'high',
      }),
    ).toBeNull();
  });

  test('resolveCandidateRubricRefs prefers provided refs over seeded pilot defaults', () => {
    const providedRefs = [
      {
        kind: 'rubric_release',
        rubric_set_id: '9709.integration.application',
        rubric_version_id: 'custom-integration-v2',
        scope_level: 'question_type',
        release_state: 'released',
      },
    ];

    expect(
      resolveCandidateRubricRefs({
        questionTypeId: '9709.integration.application',
        providedRefs,
      }),
    ).toEqual(providedRefs);
  });

  test('validateQuestionAnalysisResult rejects unknown confidence bands', () => {
    expect(() =>
      validateQuestionAnalysisResult({
        primary_question_type_id: '9709.trigonometry.identities',
        confidence_band: 'borderline',
      }),
    ).toThrow(QuestionAnalysisValidationError);
  });
});
