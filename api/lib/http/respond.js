const DEFAULT_CONTENT_TYPE = 'application/json; charset=utf-8';

export function ensureResponseHelpers(res) {
  if (typeof res.status !== 'function') {
    res.status = function status(code) {
      this.statusCode = Number(code) || 200;
      return this;
    };
  }

  if (typeof res.json !== 'function') {
    res.json = function json(payload) {
      if (!this.headersSent) {
        this.setHeader('Content-Type', DEFAULT_CONTENT_TYPE);
      }
      const body = payload === undefined ? null : payload;
      this.end(JSON.stringify(body));
      return this;
    };
  }

  if (typeof res.send !== 'function') {
    res.send = function send(payload) {
      if (payload === undefined || payload === null) {
        this.end();
        return this;
      }
      if (typeof payload === 'object' && !Buffer.isBuffer(payload)) {
        return this.json(payload);
      }
      this.end(payload);
      return this;
    };
  }

  return res;
}

export function ok(res, data, extra = {}) {
  ensureResponseHelpers(res);
  return res.status(200).json({
    ...(data ?? {}),
    ...extra,
  });
}

export function errorResponse(
  res,
  {
    status = 500,
    code = 'internal_error',
    message = 'Internal server error',
    request_id = null,
    details,
    hint,
  } = {},
) {
  ensureResponseHelpers(res);
  const payload = {
    code,
    message,
    request_id,
  };
  if (typeof details !== 'undefined') payload.details = details;
  if (typeof hint !== 'undefined') payload.hint = hint;
  return res.status(status).json(payload);
}

