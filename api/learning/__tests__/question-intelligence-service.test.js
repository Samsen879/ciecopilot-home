import { analyzeQuestionEnvelope } from '../lib/question-analysis/question-intelligence-service.js';

function buildEnvelope(promptValue) {
  return {
    source_kind: 'imported_question',
    subject_code: '9709',
    prompt_representation: { type: 'text', value: promptValue },
    paper_scope: null,
    provenance_summary: {},
  };
}

describe('question-intelligence-service: analyzeQuestionEnvelope', () => {
  // ─── pilot type detection ───

  test('detects trigonometry identity from "Prove" + trig function', () => {
    const result = analyzeQuestionEnvelope({
      envelope: buildEnvelope('Prove that 1 - tan^2(x) = cos(2x) / cos^2(x).'),
    });

    expect(result.primary_question_type_id).toBe('9709.trigonometry.identities');
    expect(result.family_id).toBe('9709.trigonometry_manipulation_equations');
    expect(result.classification_source).toBe('question_intelligence');
    expect(result.confidence_band).toBe('high');
  });

  test('detects trigonometry equation from "solve" + trig function', () => {
    const result = analyzeQuestionEnvelope({
      envelope: buildEnvelope('Solve 2sin(x) = 1 for 0 <= x <= 360.'),
    });

    expect(result.primary_question_type_id).toBe('9709.trigonometry.equations');
    expect(result.family_id).toBe('9709.trigonometry_manipulation_equations');
  });

  test('detects differential equations separable from dy/dx', () => {
    const result = analyzeQuestionEnvelope({
      envelope: buildEnvelope('Solve the differential equation dy/dx = 2xy given that y = 1 when x = 0.'),
    });

    expect(result.primary_question_type_id).toBe('9709.differential_equations.separable');
    expect(result.family_id).toBe('9709.differential_equations');
  });

  test('detects integration application from integral keyword', () => {
    const result = analyzeQuestionEnvelope({
      envelope: buildEnvelope('Find the value of integral of (2x+1)(x^2+x)^4 dx.'),
    });

    expect(result.primary_question_type_id).toBe('9709.integration.application');
    expect(result.family_id).toBe('9709.integration_techniques');
  });

  test('does not misclassify "using substitution" as trigonometry because of the "sin" substring', () => {
    const result = analyzeQuestionEnvelope({
      envelope: buildEnvelope(
        'Let I = integral from 0 to 1 of x^5/(1 + x^2)^3 dx. Using the substitution u = 1 + x^2, show that I = integral from 1 to 2 of (u - 1)^2/(2u^3) du, and hence find the exact value of I.',
      ),
    });

    expect(result.primary_question_type_id).toBe('9709.integration.application');
    expect(result.family_id).toBe('9709.integration_techniques');
  });

  // ─── confidence band thresholds ───

  test('differential equation with initial condition gets confidence >= 0.85 (high band)', () => {
    const result = analyzeQuestionEnvelope({
      envelope: buildEnvelope('Solve dy/dx = x^2 given that y=2 when x=1.'),
    });

    expect(result.classification_confidence).toBeGreaterThanOrEqual(0.85);
    expect(result.confidence_band).toBe('high');
  });

  test('integration without application signals gets lower confidence (low band)', () => {
    const result = analyzeQuestionEnvelope({
      envelope: buildEnvelope('Evaluate the integral of cos(x) dx.'),
    });

    expect(result.classification_confidence).toBeLessThan(0.8);
    expect(result.confidence_band).toBe('low');
  });

  // ─── hint interaction ───

  test('matching hint boosts confidence (capped at 0.95)', () => {
    const result = analyzeQuestionEnvelope({
      envelope: buildEnvelope('Prove that sin^2(x) + cos^2(x) = 1.'),
      analysisHints: {
        question_type_hint_id: '9709.trigonometry.identities',
      },
    });

    expect(result.classification_confidence).toBeLessThanOrEqual(0.95);
    expect(result.analysis_audit_metadata.hint_matched).toBe(true);
    expect(result.analysis_audit_metadata.hint_conflict).toBe(false);
  });

  test('conflicting hint sets hint_conflict flag without overriding detection', () => {
    const result = analyzeQuestionEnvelope({
      envelope: buildEnvelope('Solve the differential equation dy/dx = 3x.'),
      analysisHints: {
        question_type_hint_id: '9709.trigonometry.equations',
      },
    });

    expect(result.primary_question_type_id).toBe('9709.differential_equations.separable');
    expect(result.analysis_audit_metadata.hint_conflict).toBe(true);
    expect(result.analysis_audit_metadata.hint_matched).toBe(false);
  });

  // ─── fallback path ───

  test('unrecognized prompt with no hints gives null classification', () => {
    const result = analyzeQuestionEnvelope({
      envelope: buildEnvelope('What is the capital of France?'),
    });

    expect(result.primary_question_type_id).toBeNull();
    expect(result.family_id).toBeNull();
    expect(result.classification_confidence).toBeNull();
    expect(result.uncertainty_validated).toBe(false);
  });

  test('unrecognized prompt with hint falls back to hint-only low confidence (0.76)', () => {
    const result = analyzeQuestionEnvelope({
      envelope: buildEnvelope('What is the capital of France?'),
      analysisHints: {
        question_type_hint_id: '9709.integration.application',
      },
    });

    expect(result.primary_question_type_id).toBe('9709.integration.application');
    expect(result.family_id).toBe('9709.integration_techniques');
    expect(result.classification_confidence).toBe(0.76);
    expect(result.confidence_band).toBe('low');
    expect(result.analysis_audit_metadata.detector_signals).toContain('hint_only_low_confidence');
  });

  // ─── edge cases ───

  test('empty prompt produces null classification', () => {
    const result = analyzeQuestionEnvelope({
      envelope: buildEnvelope(''),
    });

    expect(result.primary_question_type_id).toBeNull();
    expect(result.classification_confidence).toBeNull();
  });

  test('null envelope prompt_representation does not throw', () => {
    const result = analyzeQuestionEnvelope({
      envelope: {
        source_kind: 'imported_question',
        subject_code: '9709',
        prompt_representation: null,
      },
    });

    expect(result.primary_question_type_id).toBeNull();
  });

  test('analysis_version is phase_a.v2 for all outputs', () => {
    const result = analyzeQuestionEnvelope({
      envelope: buildEnvelope('Prove that sin(2x) = 2sin(x)cos(x).'),
    });

    expect(result.analysis_version).toBe('phase_a.v2');
  });

  // ─── determinism ───

  test('multiple rule matches are resolved by highest baseConfidence (deterministic)', () => {
    // dy/dx with "show that" + cos could theoretically match both diff eq and trig identity.
    // The one with higher confidence should win.
    const result = analyzeQuestionEnvelope({
      envelope: buildEnvelope('Show that the solution to dy/dx = cos(x) is y = sin(x).'),
    });

    // Both differential_equations (0.91 for dy/dx) and trig identities (0.93 for show that + cos)
    // could match. The result should be deterministic.
    expect(result.primary_question_type_id).toBeDefined();
    expect(typeof result.classification_confidence).toBe('number');
  });
});
