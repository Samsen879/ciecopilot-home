import { evaluateS2RouteByRules } from '../lib/s2-route-rules.js';

describe('s2 route rules', () => {
  it('routes cross-topic/global planning queries to s2_augmentation', () => {
    const decision = evaluateS2RouteByRules('请给我一个跨章节 study plan，连接两个主题并说明先修顺序。');
    expect(decision.retrieval_route).toBe('s2_augmentation');
    expect(decision.route_stage).toBe('rules');
    expect(decision.route_reason).toBe('rules_positive_signal');
    expect(decision.route_scores.rule_score).toBeGreaterThanOrEqual(2);
  });

  it('routes single-node definition lookup queries to s1_default', () => {
    const decision = evaluateS2RouteByRules(
      'Within the current node only, what is the definition of this syllabus node title?',
    );
    expect(decision.retrieval_route).toBe('s1_default');
    expect(decision.route_reason).toBe('rules_negative_signal');
    expect(decision.route_scores.rule_score).toBeLessThanOrEqual(-1);
  });

  it('defaults to s1 when rule signals are ambiguous', () => {
    const decision = evaluateS2RouteByRules('Can you explain this concept briefly?');
    expect(decision.retrieval_route).toBe('s1_default');
    expect(decision.route_reason).toBe('rules_ambiguous_default_s1');
    expect(decision.route_scores.rule_score).toBe(0);
  });

  it('falls back to s1 when positive and negative signals conflict', () => {
    const decision = evaluateS2RouteByRules(
      'Across chapters connect topics, but what is the definition?',
    );
    expect(decision.retrieval_route).toBe('s1_default');
    expect(decision.route_reason).toBe('rules_ambiguous_default_s1');
  });
});
