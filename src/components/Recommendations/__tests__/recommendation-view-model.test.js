import {
  createRecommendationsViewModel,
  deriveRecommendationsSurfaceState,
} from '../recommendation-view-model.js';

describe('recommendation view model', () => {
  it('maps stale payloads into readable cards and stale state', () => {
    const viewModel = createRecommendationsViewModel({
      data: {
        items: [
          {
            id: 'rec-1',
            recommendation_type: 'learning_path',
            target: { type: 'path', id: 'path-1' },
            title: 'Integration recovery path',
            description: 'Use this route to rebuild integration fluency.',
            scores: {
              confidence: 0.82,
              relevance: 0.79,
              priority: 0.88,
            },
            state: {
              clicked: false,
              dismissed: false,
              click_count: 0,
              impression_count: 2,
            },
            reasoning: {
              summary: 'Ranked because your weak areas and goals overlap.',
              factors: ['goal_alignment', 'difficulty_fit'],
            },
            metadata: {
              estimated_duration_minutes: 90,
              difficulty_label: 'advanced',
              published_at: '2026-03-09T00:00:00.000Z',
              candidate_terms: ['integration', 'calculus'],
            },
          },
        ],
        pagination: {
          total: 1,
          returned: 1,
        },
        filters: {
          subject_code: '9709',
          type: 'learning_path',
          min_confidence: 0.4,
        },
        generated_at: '2026-03-09T10:00:00.000Z',
        expires_at: '2026-03-10T09:00:00.000Z',
      },
      meta: {
        cached: true,
        stale: true,
        source_count: 7,
      },
    }, {
      activeType: 'learning_path',
      subjectCode: '9709',
      now: new Date('2026-03-10T12:00:00.000Z').getTime(),
    });

    expect(viewModel.summary.stale).toBe(true);
    expect(viewModel.items[0]).toEqual(expect.objectContaining({
      title: 'Integration recovery path',
      confidencePercentage: 82,
      estimatedDurationLabel: '1 小时 30 分钟',
      difficultyLabel: 'advanced',
    }));
    expect(viewModel.items[0].reasonTags.map((tag) => tag.label)).toEqual(
      expect.arrayContaining(['目标对齐', '难度匹配', 'integration']),
    );
    expect(deriveRecommendationsSurfaceState({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      viewModel,
    })).toBe('stale');
  });

  it('distinguishes auth, loading, error, and empty states', () => {
    const emptyViewModel = createRecommendationsViewModel({
      data: {
        items: [],
        pagination: {
          total: 0,
          returned: 0,
        },
        filters: {
          subject_code: '9709',
          type: 'content',
          min_confidence: 0.4,
        },
      },
      meta: {},
    }, {
      activeType: 'content',
      subjectCode: '9709',
    });

    expect(deriveRecommendationsSurfaceState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      viewModel: null,
    })).toBe('auth_required');

    expect(deriveRecommendationsSurfaceState({
      isAuthenticated: true,
      isLoading: true,
      error: null,
      viewModel: null,
    })).toBe('loading');

    expect(deriveRecommendationsSurfaceState({
      isAuthenticated: true,
      isLoading: false,
      error: new Error('boom'),
      viewModel: null,
    })).toBe('error');

    expect(deriveRecommendationsSurfaceState({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      viewModel: emptyViewModel,
    })).toBe('empty');
  });
});
