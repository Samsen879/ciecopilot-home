import { normalizeRecommendationContractBatch } from '../lib/recommendation-orchestrator.js';

describe('recommendation orchestrator contract normalization', () => {
  it('dedupes legacy items and strips unstable metadata fields', () => {
    const normalized = normalizeRecommendationContractBatch([
      {
        recommendation_type: 'content',
        target_type: 'paper',
        target_id: 'paper-1',
        title: '  Vectors practice  ',
        description: '  Focus on vector geometry. ',
        confidence_score: 1.7,
        relevance_score: 0.82,
        priority_score: -0.2,
        reasoning: {
          summary: '  Ranked for vector weakness. ',
          factors: ['goal_alignment', 'goal_alignment', 'difficulty_fit'],
        },
        metadata: {
          source_type: 'paper',
          source_id: 'paper-1',
          source_row: {
            title: 'should not leak',
            internal_only: true,
          },
          candidate_terms: ['vectors', ' vectors ', 'geometry'],
          difficulty_label: 'advanced',
          estimated_duration: '45 min',
        },
      },
      {
        recommendation_type: 'content',
        target_type: 'paper',
        target_id: 'paper-1',
        title: 'Duplicate row should be removed',
        confidence_score: 0.95,
      },
    ], {
      fallbackType: 'content',
      minConfidence: 0.4,
    });

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toEqual(expect.objectContaining({
      recommendation_type: 'content',
      target: {
        type: 'paper',
        id: 'paper-1',
      },
      title: 'Vectors practice',
      description: 'Focus on vector geometry.',
      scores: {
        confidence: 1,
        relevance: 0.82,
        priority: 0,
      },
      reasoning: {
        summary: 'Ranked for vector weakness.',
        factors: ['goal_alignment', 'difficulty_fit'],
      },
      metadata: expect.objectContaining({
        source_type: 'paper',
        source_id: 'paper-1',
        difficulty_label: 'advanced',
        estimated_duration_minutes: 45,
        candidate_terms: ['vectors', 'geometry'],
      }),
    }));
    expect(normalized[0].metadata.source_row).toBeUndefined();
  });

  it('falls back to baseline reasoning and filters items without usable targets', () => {
    const normalized = normalizeRecommendationContractBatch([
      {
        recommendation_type: 'topic',
        target_type: 'topic',
        target_id: '',
        title: 'Ignored',
        confidence_score: 0.9,
      },
      {
        recommendation_type: 'topic',
        target_type: 'topic',
        target_id: 'topic-7',
        title: 'Trig identities',
        confidence_score: 0.61,
        reasoning: null,
        metadata: null,
      },
    ], {
      fallbackType: 'topic',
      minConfidence: 0.4,
    });

    expect(normalized).toHaveLength(1);
    expect(normalized[0].reasoning).toEqual({
      summary: 'Recommendation ranked from profile fit and learning history.',
      factors: ['profile_baseline'],
    });
    expect(normalized[0].metadata).toEqual(expect.objectContaining({
      source_type: 'topic',
      source_id: 'topic-7',
    }));
  });
});
