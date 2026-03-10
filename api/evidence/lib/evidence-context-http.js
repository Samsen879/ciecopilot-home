import { ensureResponseHelpers } from '../../lib/http/respond.js';

export function sendContextError(
  req,
  res,
  {
    status = 500,
    code = 'internal_error',
    message = 'Internal server error',
    details,
  } = {},
) {
  ensureResponseHelpers(res);
  return res.status(status).json({
    error: message,
    code,
    message,
    request_id: req?.request_id || null,
    ...(typeof details === 'undefined' ? {} : { details }),
  });
}

export function sendContextJson(res, payload, status = 200) {
  ensureResponseHelpers(res);
  return res.status(status).json(payload);
}
