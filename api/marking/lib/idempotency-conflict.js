// api/marking/lib/idempotency-conflict.js
// Shared helpers for detecting and surfacing request/run idempotency conflicts.

export class IdempotencyConflictError extends Error {
  constructor(message = 'Idempotency conflict.', details = {}) {
    super(message);
    this.name = 'IdempotencyConflictError';
    this.status = 409;
    this.code = 'idempotency_conflict';
    this.details = details;
  }
}

function normalizeForStableJson(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForStableJson(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalizeForStableJson(value[key]);
        return acc;
      }, {});
  }

  return value ?? null;
}

export function stableJsonFingerprint(value) {
  return JSON.stringify(normalizeForStableJson(value));
}

export function isIdempotencyConflictError(error) {
  return error instanceof IdempotencyConflictError
    || error?.name === 'IdempotencyConflictError'
    || error?.code === 'idempotency_conflict';
}
