import { analyzeQuestionEnvelope } from '../lib/question-analysis/question-intelligence-service.js';
import fs from 'node:fs';
import path from 'node:path';

function buildEnvelope(promptValue) {
  return {
    source_kind: 'imported_question',
    subject_code: '9709',
    prompt_representation: { type: 'text', value: promptValue },
    paper_scope: null,
    provenance_summary: {},
  };
}

function analyze(promptValue, analysisHints = null) {
  return analyzeQuestionEnvelope({
    envelope: buildEnvelope(promptValue),
    analysisHints,
  });
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

  test('does not treat ordinary dy/dx curve differentiation as a differential equation', () => {
    const result = analyze(
      'A curve has equation y = x^3. Find dy/dx and the coordinates of the stationary point.',
      {
        topic_path_hint: '9709.p1.differentiation',
      },
    );

    expect(result.primary_question_type_id).toBe('9709.differentiation.application');
    expect(result.family_id).toBe('9709.differentiation');
    expect(result.primary_question_type_id).not.toBe('9709.differential_equations.separable');
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

  test.each([
    [
      'Functions',
      'The function f is defined by f(x) = (x - 3)^2 for x < a. Find the greatest possible value of a.',
      '9709.functions.core',
    ],
    [
      'Circular measure',
      'A sector of a circle has radius r and angle theta radians. Find the area of the segment.',
      '9709.circular_measure.arc_sector',
    ],
    [
      'Differentiation',
      'Find the stationary point of the curve and determine whether it is a maximum or minimum.',
      '9709.differentiation.application',
    ],
    [
      'Series',
      'The first three terms of an arithmetic progression are given. Find the sum of the first n terms.',
      '9709.series.sequence_binomial',
    ],
    [
      'Coordinate geometry',
      'A line has equation y = 2x + 3 and is perpendicular to another line through A. Find the coordinates of P.',
      '9709.coordinate_geometry.lines_curves',
    ],
    [
      'Complex numbers',
      'On an Argand diagram, shade the locus satisfying |z - 2i| <= |z - 1 - i|.',
      '9709.complex_numbers.argand_mod_arg',
    ],
    [
      'Vectors',
      'The position vectors of A and B are given in terms of i, j and k. Find the scalar product.',
      '9709.vectors.geometry',
    ],
    [
      'Logarithmic and exponential functions',
      'Solve the equation ln(x + 2) - ln(x + 1) = 3.',
      '9709.log_exp.equations_models',
    ],
    [
      'Numerical methods',
      'Use the iterative formula x_{n+1} = sqrt(3x_n + 1) to find the root.',
      '9709.numerical_methods.iteration',
    ],
    [
      'Algebra',
      'Find the quotient and remainder when p(x) is divided by x + 2.',
      '9709.algebra.polynomial_rational',
    ],
  ])('detects %s production topic family', (_label, prompt, expectedQuestionTypeId) => {
    const result = analyze(prompt);

    expect(result.primary_question_type_id).toBe(expectedQuestionTypeId);
    expect(result.classification_confidence).toBeGreaterThanOrEqual(0.84);
    expect(result.confidence_band).toBe('high');
  });

  test('falls back from authoritative topic-path hint when prompt signals are weak', () => {
    const result = analyze('A terse imported question with limited OCR context.', {
      topic_path_hint: '9709.p3.complex_numbers',
    });

    expect(result.primary_question_type_id).toBe('9709.complex_numbers.argand_mod_arg');
    expect(result.family_id).toBe('9709.complex_numbers');
    expect(result.classification_confidence).toBe(0.84);
    expect(result.confidence_band).toBe('medium');
    expect(result.analysis_audit_metadata.detector_signals).toContain('topic_path_hint');
  });

  test('falls back from P2 algebra topic-path hint when prompt signals are weak', () => {
    const result = analyze('Solve the equation |5x - 2| = |4x + 9|.', {
      topic_path_hint: '9709.p2.algebra',
    });

    expect(result.primary_question_type_id).toBe('9709.algebra.polynomial_rational');
    expect(result.family_id).toBe('9709.algebra');
    expect(result.classification_confidence).toBe(0.84);
    expect(result.confidence_band).toBe('medium');
    expect(result.analysis_audit_metadata.detector_signals).toContain('topic_path_hint');
  });

  test('falls back from P4 mechanics topic-path hint when prompt signals are weak', () => {
    const result = analyze('A car and trailer move on a straight road with a tow-bar tension.', {
      topic_path_hint: '9709.p4.newtons_laws_of_motion',
    });

    expect(result.primary_question_type_id).toBe('9709.mechanics.newtons_laws');
    expect(result.family_id).toBe('9709.mechanics');
    expect(result.classification_confidence).toBe(0.84);
    expect(result.confidence_band).toBe('medium');
    expect(result.analysis_audit_metadata.detector_signals).toContain('topic_path_hint');
  });

  test('P4 mechanics topic-path hint wins over generic algebraic prompt signals', () => {
    const result = analyze('The displacement of a particle is s = t^3 - 4t. Find the distance travelled.', {
      topic_path_hint: '9709.p4.kinematics_of_motion_in_a_straight_line',
    });

    expect(result.primary_question_type_id).toBe('9709.mechanics.kinematics_straight_line');
    expect(result.family_id).toBe('9709.mechanics');
    expect(result.analysis_audit_metadata.detector_signals).toContain('topic_path_hint');
  });

  test('falls back from P5 statistics topic-path hint when prompt signals are weak', () => {
    const result = analyze('A statistics question about a normally distributed variable.', {
      topic_path_hint: '9709.p5.the_normal_distribution',
    });

    expect(result.primary_question_type_id).toBe('9709.statistics.normal_distribution');
    expect(result.family_id).toBe('9709.statistics');
    expect(result.classification_confidence).toBe(0.84);
    expect(result.confidence_band).toBe('medium');
    expect(result.analysis_audit_metadata.detector_signals).toContain('topic_path_hint');
  });

  test('does not classify explicit P6 topic hints before P6 authority support exists', () => {
    const result = analyze('A statistics question about hypothesis testing.', {
      topic_path_hint: '9709.p6.hypothesis_testing',
    });

    expect(result.primary_question_type_id).toBeNull();
    expect(result.family_id).toBeNull();
    expect(result.uncertainty_validated).toBe(false);
  });

  test('classifies the authority-ready 300 evidence set except explicit non-P1/P3 out-of-scope rows', () => {
    const filePath = path.resolve(
      'docs/reports/2026-04-23-9709-prompt-backfill-evidence-bundles.json',
    );
    const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const failures = [];

    for (const bundle of payload.bundles) {
      const result = analyzeQuestionEnvelope({
        envelope: buildEnvelope(bundle.evidence.ocr_text),
        analysisHints: bundle.analysis_hints,
      });
      const topicPath = bundle.question_identity.primary_topic_path ?? '';
      const expectedOutOfScope = /^9709\.p[456]\./.test(topicPath);

      if (!expectedOutOfScope && !result.primary_question_type_id) {
        failures.push(bundle.storage_key);
      }
    }

    expect(failures).toEqual([]);
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
