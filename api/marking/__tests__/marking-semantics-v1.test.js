import {
  FT_MODE,
  MARKING_SEMANTICS_VERSION,
  buildUncertainReason,
  normalizeFtMode,
  normalizeUncertainReason,
} from '../lib/marking-semantics-v1.js';

describe('marking-semantics-v1', () => {
  it('exposes a non-empty semantics version', () => {
    expect(typeof MARKING_SEMANTICS_VERSION).toBe('string');
    expect(MARKING_SEMANTICS_VERSION.length).toBeGreaterThan(0);
  });

  it.each([
    ['ft', FT_MODE.FT],
    ['follow_through', FT_MODE.FT],
    ['follow-through', FT_MODE.FT],
    ['strictft', FT_MODE.STRICT_FT],
    ['strict_ft', FT_MODE.STRICT_FT],
    ['strict-follow-through', FT_MODE.STRICT_FT],
    ['off', FT_MODE.NONE],
    [null, FT_MODE.NONE],
  ])('normalizes FT mode alias %p -> %p', (rawMode, expected) => {
    expect(normalizeFtMode(rawMode)).toBe(expected);
  });

  it.each([
    ['borderline_score', 'borderline'],
    ['dependency_not_met', 'dependency_not_met'],
    ['dependency_blocked', 'dependency_not_met'],
    ['sympy_parse_fail: invalid syntax', 'parse_fail'],
    ['sampling_parse_fail: division by zero', 'parse_fail'],
    ['unknown_reason', 'other'],
  ])('normalizes uncertain reason %p -> %p', (rawReason, expected) => {
    expect(normalizeUncertainReason(rawReason)).toBe(expected);
  });

  it('builds stable uncertain_reason payload for awarded decision', () => {
    expect(buildUncertainReason('best_match', { awarded: true })).toEqual({
      is_uncertain: false,
      code: null,
      source_reason: 'best_match',
    });
  });

  it('builds stable uncertain_reason payload for uncertain decision', () => {
    expect(buildUncertainReason('borderline_score', { awarded: false })).toEqual({
      is_uncertain: true,
      code: 'borderline',
      source_reason: 'borderline_score',
    });
  });
});
