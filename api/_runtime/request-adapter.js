import crypto from 'node:crypto';

const DEFAULT_BODY_LIMIT_BYTES = 1 * 1024 * 1024;

function toRequestId(headerValue) {
  if (typeof headerValue === 'string' && headerValue.trim()) {
    return headerValue.trim();
  }
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function searchParamsToObject(searchParams) {
  const out = {};
  for (const key of searchParams.keys()) {
    const values = searchParams.getAll(key);
    if (values.length <= 1) {
      out[key] = values[0];
    } else {
      out[key] = values;
    }
  }
  return out;
}

function isJsonContentType(req) {
  const contentType = req?.headers?.['content-type'] || req?.headers?.['Content-Type'];
  if (!contentType || typeof contentType !== 'string') return false;
  return contentType.toLowerCase().includes('application/json');
}

function readBody(req, limitBytes = DEFAULT_BODY_LIMIT_BYTES) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > limitBytes) {
        reject(Object.assign(new Error('Payload too large'), { status: 413, code: 'payload_too_large' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', (error) => {
      reject(error);
    });
  });
}

export function adaptRequestBasics(req) {
  const parsed = new URL(req.url || '/', 'http://localhost');
  req.path = parsed.pathname;
  req.query = searchParamsToObject(parsed.searchParams);
  req.request_id = toRequestId(req?.headers?.['x-request-id']);
  return req;
}

export async function ensureParsedJsonBody(req, { limitBytes = DEFAULT_BODY_LIMIT_BYTES } = {}) {
  if (typeof req.body !== 'undefined') return req.body;
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '')) {
    req.body = {};
    return req.body;
  }
  if (!isJsonContentType(req)) {
    req.body = {};
    return req.body;
  }
  const raw = await readBody(req, limitBytes);
  if (!raw || !raw.trim()) {
    req.body = {};
    return req.body;
  }
  try {
    req.body = JSON.parse(raw);
    return req.body;
  } catch (error) {
    throw Object.assign(new Error('Invalid JSON payload'), { status: 400, code: 'bad_json_payload' });
  }
}

