export const RATE_LIMIT_POLICIES = Object.freeze({
  rag_ai_default_v1: {
    policyId: 'rag_ai_default_v1',
    user: { limit: 10, windowMs: 60_000, burstLimit: 10, keyMode: 'user' },
    ip: { limit: 5, windowMs: 60_000, burstLimit: 5, keyMode: 'ip' },
  },
  community_write_v1: {
    policyId: 'community_write_v1',
    user: { limit: 20, windowMs: 60_000, burstLimit: 20, keyMode: 'user' },
    ip: { limit: 10, windowMs: 60_000, burstLimit: 10, keyMode: 'ip' },
  },
  error_book_write_v1: {
    policyId: 'error_book_write_v1',
    user: { limit: 12, windowMs: 60_000, burstLimit: 12, keyMode: 'user' },
    ip: { limit: 6, windowMs: 60_000, burstLimit: 6, keyMode: 'ip' },
  },
});

export function getRateLimitPolicy(id) {
  return RATE_LIMIT_POLICIES[id] || null;
}
