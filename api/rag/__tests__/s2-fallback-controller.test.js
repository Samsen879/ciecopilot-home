import {
  applyS2FallbackRouteAudit,
  normalizeS2FallbackReason,
  S2_FALLBACK_REASONS,
} from '../lib/s2-fallback-controller.js';

describe('s2 fallback controller', () => {
  it('normalizes known reasons and falls back unknown reasons to infra error', () => {
    for (const reason of Object.values(S2_FALLBACK_REASONS)) {
      expect(normalizeS2FallbackReason(reason)).toBe(reason);
    }
    expect(normalizeS2FallbackReason('unknown_reason')).toBe(S2_FALLBACK_REASONS.S2_INFRA_ERROR);
  });

  it('applies fallback route audit fields', () => {
    const next = applyS2FallbackRouteAudit(
      {
        retrieval_route: 's2_augmentation',
        final_execution_route: 's2_augmentation',
        fallback_triggered: false,
        fallback_reason: null,
      },
      { reason: S2_FALLBACK_REASONS.S2_EMPTY_EVIDENCE },
    );

    expect(next.final_execution_route).toBe('s1_default');
    expect(next.fallback_triggered).toBe(true);
    expect(next.fallback_reason).toBe(S2_FALLBACK_REASONS.S2_EMPTY_EVIDENCE);
  });
});
