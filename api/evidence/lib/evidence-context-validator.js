const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export class EvidenceContextValidationError extends Error {
  constructor(message, { status = 400, code = 'bad_request', details } = {}) {
    super(message);
    this.name = 'EvidenceContextValidationError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function parseQuery(reqUrl) {
  try {
    const u = new URL(reqUrl || '', 'http://localhost');
    return u.searchParams;
  } catch {
    return new URLSearchParams();
  }
}

function pickFirstValue(value) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function readQueryValue(req, key) {
  if (req?.query && Object.prototype.hasOwnProperty.call(req.query, key)) {
    return pickFirstValue(req.query[key]);
  }
  return parseQuery(req?.url).get(key);
}

function normalizeTopicPath(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeLimit(value) {
  const parsed = Number.parseInt(String(value ?? DEFAULT_LIMIT), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

export function parseEvidenceContextRequest(req = {}) {
  const topicPath = normalizeTopicPath(readQueryValue(req, 'topic_path'));
  if (!topicPath) {
    throw new EvidenceContextValidationError('topic_path query parameter is required.', {
      code: 'bad_request',
      details: { field: 'topic_path' },
    });
  }

  return {
    topic_path: topicPath,
    limit: normalizeLimit(readQueryValue(req, 'limit')),
  };
}
