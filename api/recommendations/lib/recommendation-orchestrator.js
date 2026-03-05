import { recommendationEngine, VALID_RECOMMENDATION_TYPES } from '../algorithm-engine.js';

export async function orchestrateRecommendationGeneration({
  userId,
  subjectCode,
  type,
  requestedCount,
  minConfidence,
} = {}) {
  if (!VALID_RECOMMENDATION_TYPES.has(type)) {
    const error = new Error('Unsupported recommendation type.');
    error.status = 400;
    error.code = 'invalid_recommendation_type';
    error.details = {
      allowed: Array.from(VALID_RECOMMENDATION_TYPES),
    };
    throw error;
  }

  return recommendationEngine.generateRecommendations({
    userId,
    subjectCode,
    type,
    limit: requestedCount,
    minConfidence,
  });
}
