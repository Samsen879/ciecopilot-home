export const S2_FALLBACK_REASONS = Object.freeze({
  S2_TIMEOUT: 'S2_TIMEOUT',
  S2_INFRA_ERROR: 'S2_INFRA_ERROR',
  S2_EMPTY_EVIDENCE: 'S2_EMPTY_EVIDENCE',
  S2_CONTRACT_INVALID: 'S2_CONTRACT_INVALID',
  S2_MODEL_UNAVAILABLE: 'S2_MODEL_UNAVAILABLE',
  S2_ROUTE_KILL_SWITCH: 'S2_ROUTE_KILL_SWITCH',
});

const VALID_REASONS = new Set(Object.values(S2_FALLBACK_REASONS));

export function normalizeS2FallbackReason(reason) {
  const normalized = String(reason || '').trim().toUpperCase();
  if (VALID_REASONS.has(normalized)) return normalized;
  return S2_FALLBACK_REASONS.S2_INFRA_ERROR;
}

export function applyS2FallbackRouteAudit(routeAudit, { reason } = {}) {
  return {
    ...(routeAudit || {}),
    final_execution_route: 's1_default',
    fallback_triggered: true,
    fallback_reason: normalizeS2FallbackReason(reason),
  };
}
