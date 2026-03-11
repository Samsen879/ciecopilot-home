import { consumeRateLimit, getClientIp } from './rate-limit.js';

function methodOwnsRateLimit(route, method) {
  const allowedMethods = route?.rateLimitMethods;
  if (!Array.isArray(allowedMethods) || allowedMethods.length === 0) {
    return Boolean(route?.rateLimit);
  }
  return allowedMethods.includes(method);
}

export function resolveRateLimitDescriptor(req, route) {
  if (!route?.rateLimit || !methodOwnsRateLimit(route, req.method)) {
    return null;
  }

  const userId = req.auth_user_id || null;
  const profile = userId ? route.rateLimit.user : route.rateLimit.ip;
  if (!profile) {
    return null;
  }

  const key = userId
    ? `u:${userId}:${route.module}`
    : `ip:${getClientIp(req)}:${route.module}`;

  return {
    profile,
    key,
    actor: userId ? 'user' : 'ip',
    policyId: route.rateLimitPolicyId || null,
    routeModule: route.module,
  };
}

export function applyRateLimitHeaders(res, route, evaluation) {
  if (!res || !evaluation?.profile || !evaluation?.result) {
    return;
  }

  const { actor, policyId, profile, result } = evaluation;
  const remaining = Number.isFinite(Number(result.remaining))
    ? Math.max(Number(result.remaining), 0)
    : 0;

  res.setHeader('X-RateLimit-Limit', String(profile.limit));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Scope', actor || 'unknown');
  if (policyId || route?.rateLimitPolicyId) {
    res.setHeader('X-RateLimit-Policy', String(policyId || route.rateLimitPolicyId));
  }
  if (result.store) {
    res.setHeader('X-RateLimit-Store', String(result.store));
  }
  if (result.degraded) {
    res.setHeader('X-RateLimit-Degraded', 'true');
  }
}

export async function applyRateLimitGuard(req, route) {
  const descriptor = resolveRateLimitDescriptor(req, route);
  if (!descriptor) {
    return null;
  }

  const result = await consumeRateLimit(descriptor.key, descriptor.profile);
  return {
    ...descriptor,
    result,
  };
}
