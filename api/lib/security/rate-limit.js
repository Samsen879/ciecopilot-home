import {
  clearRateLimitBackendOverrideForTest,
  consumeRateLimitViaStore,
  resetRateLimitStoresForTest,
  setRateLimitBackendForTest,
} from './rate-limit-store.js';

export async function consumeRateLimit(key, { limit, windowMs }) {
  return consumeRateLimitViaStore(key, { limit, windowMs });
}

export function getClientIp(req) {
  const xff = req?.headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim();
  }
  return req?.socket?.remoteAddress || 'unknown';
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
