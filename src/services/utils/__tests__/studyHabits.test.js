import {
  calculateDaysSinceFirstStudySession,
  calculateStudyConsistencyScore,
  calculateStudyFrequencyPerWeek
} from '../studyHabits.js';

describe('studyHabits helpers', () => {
  test('daysSinceFirst returns a positive floor value when timestamp is invalid/future', () => {
    const sessions = [{ timestamp: new Date(Date.now() + 60_000).toISOString() }];
    const days = calculateDaysSinceFirstStudySession(sessions, Date.now());
    expect(days).toBe(1);
  });

  test('studyFrequency handles zero days safely', () => {
    expect(calculateStudyFrequencyPerWeek(5, 0)).toBe(0);
  });

  test('consistencyScore uses bounded denominator and stays within [0,1]', () => {
    const now = Date.now();
    const sessions = [
      { timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString() }
    ];

    const score = calculateStudyConsistencyScore(sessions, 2.2, 30);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
