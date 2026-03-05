/**
 * Pure helpers for study-habit analytics.
 * Keep these functions side-effect free so they can be tested in Node env.
 */

export function calculateDaysSinceFirstStudySession(studySessions, nowMs = Date.now()) {
  if (!Array.isArray(studySessions) || studySessions.length === 0) {
    return 0;
  }

  const oldestSession = studySessions[studySessions.length - 1];
  const oldestMs = new Date(oldestSession.timestamp).getTime();
  const elapsedDays = (nowMs - oldestMs) / (1000 * 60 * 60 * 24);

  return Number.isFinite(elapsedDays) && elapsedDays > 0 ? elapsedDays : 1;
}

export function calculateStudyFrequencyPerWeek(sessionCount, daysSinceFirst) {
  if (!sessionCount || !daysSinceFirst) {
    return 0;
  }

  return Math.round((sessionCount / daysSinceFirst) * 7 * 10) / 10;
}

export function calculateStudyConsistencyScore(studySessions, daysSinceFirst, windowDays = 30) {
  if (!Array.isArray(studySessions) || studySessions.length === 0) {
    return 0;
  }

  const dailyStudy = {};
  studySessions.forEach((session) => {
    const date = new Date(session.timestamp).toDateString();
    dailyStudy[date] = true;
  });

  const studyDays = Object.keys(dailyStudy).length;
  const totalDays = Math.min(windowDays, Math.max(1, Math.ceil(daysSinceFirst || windowDays)));

  return Math.round((studyDays / totalDays) * 100) / 100;
}
