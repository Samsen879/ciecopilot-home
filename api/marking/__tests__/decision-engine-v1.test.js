// Tests for api/marking/lib/decision-engine-v1.js
// Covers: Jaccard scoring, dependency validation, fail-safe, compat mode, decisions output

import {
  runDecisionEngine,
  SCORING_ENGINE_VERSION,
  normalize,
  tokenize,
  jaccard,
  validateDependencies,
  findBestMatch,
} from '../lib/decision-engine-v1.js';

// ── Test fixtures ───────────────────────────────────────────────────────────

function makeRubricPoint(overrides = {}) {
  return {
    rubric_id: 'rp-001',
    mark_label: 'M1',
    kind: 'M',
    description: 'Use the quadratic formula correctly',
    marks: 1,
    depends_on: [],
    ...overrides,
  };
}

function makeStep(overrides = {}) {
  return {
    step_id: 's1',
    text: 'Apply the quadratic formula x = (-b ± sqrt(b²-4ac)) / 2a',
    ...overrides,
  };
}

// ── Text processing (ported from v0) ────────────────────────────────────────

describe('normalize', () => {
  it('lowercases and strips non-alphanumeric chars', () => {
    expect(normalize('Hello WORLD!')).toBe('hello world');
  });

  it('handles empty/null input', () => {
    expect(normalize('')).toBe('');
    expect(normalize(null)).toBe('');
    expect(normalize(undefined)).toBe('');
  });

  it('preserves math operators', () => {
    expect(normalize('x + y = z')).toBe('x + y = z');
  });
});

describe('tokenize', () => {
  it('splits into alphanumeric tokens', () => {
    expect(tokenize('x = 2a + 3b')).toEqual(['x', '2a', '3b']);
  });

  it('returns empty array for empty input', () => {
    expect(tokenize('')).toEqual([]);
  });
});

describe('jaccard', () => {
  it('returns 1 for identical sets', () => {
    expect(jaccard(['a', 'b'], ['a', 'b'])).toBe(1);
  });

  it('returns 0 for disjoint sets', () => {
    expect(jaccard(['a', 'b'], ['c', 'd'])).toBe(0);
  });

  it('returns 0 when either set is empty', () => {
    expect(jaccard([], ['a'])).toBe(0);
    expect(jaccard(['a'], [])).toBe(0);
  });

  it('computes correct partial overlap', () => {
    // {a,b,c} ∩ {b,c,d} = {b,c}, union = {a,b,c,d} = 4
    expect(jaccard(['a', 'b', 'c'], ['b', 'c', 'd'])).toBe(0.5);
  });
});

// ── findBestMatch ───────────────────────────────────────────────────────────

describe('findBestMatch', () => {
  it('returns the step with highest Jaccard score', () => {
    const rp = makeRubricPoint({ description: 'quadratic formula' });
    const steps = [
      makeStep({ step_id: 's1', text: 'something unrelated about physics' }),
      makeStep({ step_id: 's2', text: 'use the quadratic formula' }),
    ];
    const result = findBestMatch(rp, steps);
    expect(result.step_id).toBe('s2');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('returns null step_id and 0 confidence when no steps', () => {
    const rp = makeRubricPoint();
    const result = findBestMatch(rp, []);
    expect(result.step_id).toBeNull();
    expect(result.confidence).toBe(0);
  });
});

// ── validateDependencies ────────────────────────────────────────────────────

describe('validateDependencies', () => {
  it('returns empty map for points with no dependencies', () => {
    const points = [makeRubricPoint({ rubric_id: 'a', depends_on: [] })];
    const errors = validateDependencies(points);
    expect(errors.size).toBe(0);
  });

  it('returns empty map for valid dependency references', () => {
    const points = [
      makeRubricPoint({ rubric_id: 'a', depends_on: [] }),
      makeRubricPoint({ rubric_id: 'b', depends_on: ['a'] }),
    ];
    const errors = validateDependencies(points);
    expect(errors.size).toBe(0);
  });

  it('flags missing dependency references', () => {
    const points = [
      makeRubricPoint({ rubric_id: 'a', depends_on: ['nonexistent'] }),
    ];
    const errors = validateDependencies(points);
    expect(errors.get('a')).toBe('dependency_error');
  });

  it('flags circular dependencies', () => {
    const points = [
      makeRubricPoint({ rubric_id: 'a', depends_on: ['b'] }),
      makeRubricPoint({ rubric_id: 'b', depends_on: ['a'] }),
    ];
    const errors = validateDependencies(points);
    // At least one should be flagged
    expect(errors.size).toBeGreaterThanOrEqual(1);
    const reasons = [...errors.values()];
    expect(reasons).toContain('dependency_error');
  });

  it('flags self-referencing dependency', () => {
    const points = [
      makeRubricPoint({ rubric_id: 'a', depends_on: ['a'] }),
    ];
    const errors = validateDependencies(points);
    expect(errors.get('a')).toBe('dependency_error');
  });
});


// ── runDecisionEngine: decisions[] output ────────────────────────────────────

describe('runDecisionEngine — decisions output', () => {
  it('returns decisions[] with stable v1 public fields by default', () => {
    const rubric_points = [
      makeRubricPoint({ rubric_id: 'rp-001', mark_label: 'M1', marks: 1 }),
      makeRubricPoint({ rubric_id: 'rp-002', mark_label: 'A1', marks: 1, description: 'correct answer' }),
    ];
    const student_steps = [
      makeStep({ step_id: 's1', text: 'use the quadratic formula correctly' }),
      makeStep({ step_id: 's2', text: 'correct answer is x = 5' }),
    ];

    const { decisions } = runDecisionEngine({ student_steps, rubric_points });

    expect(decisions).toHaveLength(2);
    for (const d of decisions) {
      expect(d).toHaveProperty('rubric_id');
      expect(d).toHaveProperty('mark_label');
      expect(d).toHaveProperty('reason');
      expect(d).toHaveProperty('awarded');
      expect(d).toHaveProperty('awarded_marks');
      expect(typeof d.awarded).toBe('boolean');
      expect(typeof d.awarded_marks).toBe('number');
      expect(d).not.toHaveProperty('uncertain_reason');
      expect(Object.keys(d).every((k) => !k.startsWith('_'))).toBe(true);
    }
  });

  it('includes uncertain_reason when include_uncertain_reason=true', () => {
    const rubric_points = [
      makeRubricPoint({ rubric_id: 'rp-001', description: 'alpha beta gamma', marks: 2 }),
    ];
    const student_steps = [
      makeStep({ step_id: 's1', text: 'alpha beta gamma' }),
    ];

    const { decisions } = runDecisionEngine({
      student_steps,
      rubric_points,
      options: { include_uncertain_reason: true },
    });

    expect(decisions[0].uncertain_reason).toEqual({
      is_uncertain: false,
      code: null,
      source_reason: 'best_match',
    });
  });

  it('awards marks when confidence is above threshold + margin', () => {
    // Use identical text to guarantee high Jaccard score
    const rubric_points = [
      makeRubricPoint({ rubric_id: 'rp-001', description: 'alpha beta gamma', marks: 2 }),
    ];
    const student_steps = [
      makeStep({ step_id: 's1', text: 'alpha beta gamma' }),
    ];

    const { decisions } = runDecisionEngine({ student_steps, rubric_points });
    expect(decisions[0].awarded).toBe(true);
    expect(decisions[0].awarded_marks).toBe(2);
    expect(decisions[0].reason).toBe('best_match');
  });

  it('marks below_threshold when confidence is low', () => {
    const rubric_points = [
      makeRubricPoint({ rubric_id: 'rp-001', description: 'integration by parts', marks: 1 }),
    ];
    const student_steps = [
      makeStep({ step_id: 's1', text: 'the weather is sunny today' }),
    ];

    const { decisions } = runDecisionEngine({ student_steps, rubric_points });
    expect(decisions[0].awarded).toBe(false);
    expect(decisions[0].awarded_marks).toBe(0);
    expect(decisions[0].reason).toBe('below_threshold');
  });

  it('returns empty decisions[] when rubric_points is empty', () => {
    const { decisions } = runDecisionEngine({
      student_steps: [makeStep()],
      rubric_points: [],
    });
    expect(decisions).toEqual([]);
  });

  it('preserves rubric_points ordering in decisions', () => {
    const rubric_points = [
      makeRubricPoint({ rubric_id: 'rp-A', mark_label: 'M1' }),
      makeRubricPoint({ rubric_id: 'rp-B', mark_label: 'A1' }),
      makeRubricPoint({ rubric_id: 'rp-C', mark_label: 'B1' }),
    ];
    const student_steps = [makeStep()];

    const { decisions } = runDecisionEngine({ student_steps, rubric_points });
    expect(decisions.map((d) => d.rubric_id)).toEqual(['rp-A', 'rp-B', 'rp-C']);
  });
});

// ── runDecisionEngine: dependency handling ───────────────────────────────────

describe('runDecisionEngine — dependency handling', () => {
  it('marks dependent point as dependency_not_met when dependency is not awarded', () => {
    const rubric_points = [
      makeRubricPoint({
        rubric_id: 'rp-M1',
        mark_label: 'M1',
        description: 'integration by parts method',
        marks: 1,
        depends_on: [],
      }),
      makeRubricPoint({
        rubric_id: 'rp-A1',
        mark_label: 'A1',
        description: 'correct final answer from integration',
        marks: 1,
        depends_on: ['rp-M1'],
      }),
    ];
    // Student text doesn't match M1 at all
    const student_steps = [
      makeStep({ step_id: 's1', text: 'the weather is sunny today' }),
    ];

    const { decisions } = runDecisionEngine({ student_steps, rubric_points });
    const m1 = decisions.find((d) => d.rubric_id === 'rp-M1');
    const a1 = decisions.find((d) => d.rubric_id === 'rp-A1');

    expect(m1.awarded).toBe(false);
    expect(a1.awarded).toBe(false);
    expect(a1.reason).toBe('dependency_not_met');
  });

  it('marks dependency_error for missing dependency references', () => {
    const rubric_points = [
      makeRubricPoint({
        rubric_id: 'rp-001',
        depends_on: ['nonexistent-id'],
        marks: 1,
      }),
    ];
    const student_steps = [makeStep({ text: 'quadratic formula' })];

    const { decisions } = runDecisionEngine({ student_steps, rubric_points });
    expect(decisions[0].awarded).toBe(false);
    expect(decisions[0].reason).toBe('dependency_error');
    expect(decisions[0].awarded_marks).toBe(0);
  });

  it('marks dependency_error for circular dependencies', () => {
    const rubric_points = [
      makeRubricPoint({ rubric_id: 'a', depends_on: ['b'], marks: 1 }),
      makeRubricPoint({ rubric_id: 'b', depends_on: ['a'], marks: 1 }),
    ];
    const student_steps = [makeStep({ text: 'quadratic formula' })];

    const { decisions } = runDecisionEngine({ student_steps, rubric_points });
    const reasons = decisions.map((d) => d.reason);
    expect(reasons).toContain('dependency_error');
    // All circular points should not be awarded
    for (const d of decisions) {
      if (d.reason === 'dependency_error') {
        expect(d.awarded).toBe(false);
        expect(d.awarded_marks).toBe(0);
      }
    }
  });
});

// ── runDecisionEngine: compat_mode=v0 ───────────────────────────────────────

describe('runDecisionEngine — compat_mode=v0', () => {
  it('includes alignments[] when compat_mode is v0', () => {
    const rubric_points = [makeRubricPoint()];
    const student_steps = [makeStep()];

    const result = runDecisionEngine({
      student_steps,
      rubric_points,
      options: { compat_mode: 'v0' },
    });

    expect(result).toHaveProperty('alignments');
    expect(Array.isArray(result.alignments)).toBe(true);
    expect(result.alignments).toHaveLength(1); // one per student step
  });

  it('does not include alignments[] when compat_mode is not v0', () => {
    const rubric_points = [makeRubricPoint()];
    const student_steps = [makeStep()];

    const result = runDecisionEngine({ student_steps, rubric_points });
    expect(result.alignments).toBeUndefined();
  });

  it('alignment has stable v0 shape by default', () => {
    const rubric_points = [makeRubricPoint({ rubric_id: 'rp-001', mark_label: 'M1' })];
    const student_steps = [makeStep({ step_id: 's1' })];

    const { alignments } = runDecisionEngine({
      student_steps,
      rubric_points,
      options: { compat_mode: 'v0' },
    });

    const a = alignments[0];
    expect(a).toHaveProperty('step_id', 's1');
    expect(a).toHaveProperty('status');
    expect(a).toHaveProperty('confidence');
    expect(a).toHaveProperty('rubric_id');
    expect(a).toHaveProperty('mark_label');
    expect(a).toHaveProperty('reason');
    expect(a).not.toHaveProperty('uncertain_reason');
    expect(typeof a.confidence).toBe('number');
    expect(['aligned', 'uncertain']).toContain(a.status);
  });

  it('alignment includes uncertain_reason when explicitly enabled', () => {
    const rubric_points = [makeRubricPoint({ rubric_id: 'rp-001', mark_label: 'M1' })];
    const student_steps = [makeStep({ step_id: 's1' })];

    const { alignments } = runDecisionEngine({
      student_steps,
      rubric_points,
      options: { compat_mode: 'v0', include_uncertain_reason: true },
    });

    expect(alignments[0]).toHaveProperty('uncertain_reason');
  });

  it('alignment returns no_rubric_points when rubric is empty', () => {
    const { alignments } = runDecisionEngine({
      student_steps: [makeStep()],
      rubric_points: [],
      options: { compat_mode: 'v0' },
    });

    expect(alignments[0].reason).toBe('no_rubric_points');
    expect(alignments[0].confidence).toBe(0);
    expect(alignments[0].rubric_id).toBeNull();
  });
});

// ── runDecisionEngine: custom thresholds ────────────────────────────────────

describe('runDecisionEngine — custom thresholds', () => {
  it('respects custom min_confidence', () => {
    // With very high threshold, nothing should be awarded
    const rubric_points = [makeRubricPoint({ description: 'alpha beta' })];
    const student_steps = [makeStep({ text: 'alpha beta gamma delta' })];

    const { decisions } = runDecisionEngine({
      student_steps,
      rubric_points,
      options: { min_confidence: 0.99, uncertain_margin: 0.01 },
    });

    expect(decisions[0].awarded).toBe(false);
  });

  it('respects custom uncertain_margin for borderline scoring', () => {
    // With 0 margin, anything at or above threshold is awarded
    const rubric_points = [makeRubricPoint({ description: 'alpha beta gamma' })];
    const student_steps = [makeStep({ text: 'alpha beta gamma' })];

    const { decisions } = runDecisionEngine({
      student_steps,
      rubric_points,
      options: { min_confidence: 0.01, uncertain_margin: 0 },
    });

    expect(decisions[0].awarded).toBe(true);
    expect(decisions[0].reason).toBe('best_match');
  });
});

// ── SCORING_ENGINE_VERSION ──────────────────────────────────────────────────

describe('SCORING_ENGINE_VERSION', () => {
  it('exports the correct version string', () => {
    expect(SCORING_ENGINE_VERSION).toBe('b2_smart_mark_engine_v1');
  });
});
