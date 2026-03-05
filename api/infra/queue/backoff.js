export const DEFAULT_BACKOFF_POLICY = Object.freeze({
  base_delay_ms: 250,
  factor: 2,
  max_delay_ms: 30_000,
});

export function normalizeBackoffPolicy(input = {}) {
  const candidate = {
    ...DEFAULT_BACKOFF_POLICY,
    ...input,
  };

  const baseDelayMs = Number.isFinite(candidate.base_delay_ms) ? candidate.base_delay_ms : 250;
  const factor = Number.isFinite(candidate.factor) ? candidate.factor : 2;
  const maxDelayMs = Number.isFinite(candidate.max_delay_ms) ? candidate.max_delay_ms : 30_000;

  return {
    base_delay_ms: Math.max(1, Math.floor(baseDelayMs)),
    factor: Math.max(1, factor),
    max_delay_ms: Math.max(1, Math.floor(maxDelayMs)),
  };
}

export function calculateBackoffDelayMs(attempt, policy = DEFAULT_BACKOFF_POLICY) {
  const normalizedPolicy = normalizeBackoffPolicy(policy);
  const safeAttempt = Number.isInteger(attempt) && attempt > 0 ? attempt : 1;
  const delay = normalizedPolicy.base_delay_ms * normalizedPolicy.factor ** (safeAttempt - 1);
  return Math.min(Math.floor(delay), normalizedPolicy.max_delay_ms);
}

