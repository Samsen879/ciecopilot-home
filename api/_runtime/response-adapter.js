import { ensureResponseHelpers } from '../lib/http/respond.js';

export function adaptResponse(res, requestId) {
  ensureResponseHelpers(res);
  if (!res.getHeader('Content-Type')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  if (requestId) {
    res.setHeader('X-Request-Id', requestId);
  }
  return res;
}

