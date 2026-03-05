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
  };
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
