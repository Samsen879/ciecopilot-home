import {
  clearRateLimitBackendOverrideForTest,
  consumeRateLimitViaStore,
  resetRateLimitStoresForTest,
  setRateLimitBackendForTest,
} from './rate-limit-store.js';

export async function consumeRateLimit(key, { limit, windowMs }) {
  return consumeRateLimitViaStore(key, { limit, windowMs });
}

function trustProxyHeaders() {
  return process.env.TRUST_PROXY === 'true' || process.env.RATE_LIMIT_TRUST_PROXY === 'true';
}

export function getClientIp(req) {
  const remoteAddress = req?.socket?.remoteAddress || 'unknown';
  const xff = req?.headers?.['x-forwarded-for'];
  if (trustProxyHeaders() && typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim();
  }
  return remoteAddress;
}

export function _resetRateLimitStoreForTest() {
  return resetRateLimitStoresForTest();
}

export function _setRateLimitBackendForTest(backend) {
  setRateLimitBackendForTest(backend);
}

export function _clearRateLimitBackendOverrideForTest() {
  clearRateLimitBackendOverrideForTest();
}
