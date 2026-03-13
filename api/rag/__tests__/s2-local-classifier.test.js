import { classifyS2RouteByLocalModel, tokenizeRouteQuery } from '../lib/s2-local-classifier.js';

describe('s2 local classifier', () => {
  it('tokenizes mixed-language query into normalized tokens', () => {
    const tokens = tokenizeRouteQuery('请给我 Cross-Topic study plan, with prerequisite chain!');
    expect(tokens).toEqual(expect.arrayContaining(['请给我', 'cross', 'topic', 'study', 'plan', 'with', 'prerequisite', 'chain']));
  });

  it('routes to s2_augmentation when probability is above s2 threshold', () => {
    const decision = classifyS2RouteByLocalModel('cross topic study plan', {
      model: {
        model_version: 'test_model_v1',
        prior_log_odds: 0,
        thresholds: { s2_min_prob: 0.7, s1_max_prob: 0.35 },
        token_log_odds: {
          cross: 1.2,
          topic: 1.1,
          study: 0.8,
          plan: 0.7,
        },
      },
    });

    expect(decision.available).toBe(true);
    expect(decision.retrieval_route).toBe('s2_augmentation');
    expect(decision.route_reason).toBe('local_classifier_positive');
    expect(decision.route_stage).toBe('local_classifier');
    expect(decision.route_scores.p_s2).toBeGreaterThanOrEqual(0.7);
  });

  it('routes to s1_default when probability is below s1 threshold', () => {
    const decision = classifyS2RouteByLocalModel('node title definition', {
      model: {
        model_version: 'test_model_v1',
        prior_log_odds: -0.5,
        thresholds: { s2_min_prob: 0.7, s1_max_prob: 0.35 },
        token_log_odds: {
          node: -1.2,
          title: -1.0,
          definition: -1.3,
        },
      },
    });

    expect(decision.available).toBe(true);
    expect(decision.retrieval_route).toBe('s1_default');
    expect(decision.route_reason).toBe('local_classifier_negative');
    expect(decision.route_scores.p_s2).toBeLessThanOrEqual(0.35);
  });

  it('returns unavailable decision when model is missing or invalid', () => {
    const decision = classifyS2RouteByLocalModel('any query', {
      model: null,
      modelPath: 'runs/backend/__definitely_missing_model__.json',
    });

    expect(decision.available).toBe(false);
    expect(decision.retrieval_route).toBe('s1_default');
    expect(decision.route_reason).toBe('local_classifier_unavailable_default_s1');
    expect(decision.route_stage).toBe('default_safe');
  });
});
