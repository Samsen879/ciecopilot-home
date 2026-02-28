const DEFAULT_SENSITIVE_KEYS = [
  'authorization',
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'apikey',
  'password',
  'secret',
  'key',
  'code',
];

function shouldMaskKey(key, sensitiveKeys) {
  const lower = String(key || '').toLowerCase();
  return sensitiveKeys.some((s) => lower.includes(s));
}

export function maskValue(value) {
  if (value === null || typeof value === 'undefined') return value;
  if (typeof value !== 'string') return '[REDACTED]';
  if (value.length <= 8) return '***';
  return `${value.slice(0, 3)}***${value.slice(-2)}`;
}

export function redact(value, sensitiveKeys = DEFAULT_SENSITIVE_KEYS) {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, sensitiveKeys));
  }
  if (value && typeof value === 'object') {
    const next = {};
    for (const [k, v] of Object.entries(value)) {
      if (shouldMaskKey(k, sensitiveKeys)) {
        next[k] = maskValue(v);
      } else {
        next[k] = redact(v, sensitiveKeys);
      }
    }
    return next;
  }
  return value;
}

export function safeLog(level, message, meta = {}) {
  const payload = {
    level,
    message,
    ...redact(meta),
  };
  const serialized = JSON.stringify(payload);
  if (level === 'error') {
    console.error(serialized);
    return;
  }
  if (level === 'warn') {
    console.warn(serialized);
    return;
  }
  console.log(serialized);
}

