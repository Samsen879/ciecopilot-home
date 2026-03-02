import { errorResponse } from '../http/respond.js';

export function buildSecurityFailure({
  status = 500,
  code = 'internal_error',
  message = 'Internal server error.',
  details,
  hint,
} = {}) {
  return {
    status,
    code,
    message,
    ...(typeof details === 'undefined' ? {} : { details }),
    ...(typeof hint === 'undefined' ? {} : { hint }),
  };
}

export function sendSecurityFailure(res, requestId, failure) {
  return errorResponse(res, {
    status: failure.status,
    code: failure.code,
    message: failure.message,
    details: failure.details,
    hint: failure.hint,
    request_id: requestId,
  });
}
