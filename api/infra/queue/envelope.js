import { randomUUID } from 'node:crypto';
import { QueueEnvelopeError } from './errors.js';

export const ENVELOPE_REQUIRED_FIELDS = Object.freeze([
  'job_id',
  'idempotency_key',
  'trace_id',
  'attempt',
  'stage',
  'payload_version',
]);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasNumericAttempt(value) {
  return Number.isInteger(value) && value >= 0;
}

export function validateEnvelope(envelope) {
  const issues = [];

  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    issues.push('envelope must be a plain object');
    return { ok: false, issues };
  }

  if (!isNonEmptyString(envelope.job_id)) {
    issues.push('job_id must be a non-empty string');
  }
  if (!isNonEmptyString(envelope.idempotency_key)) {
    issues.push('idempotency_key must be a non-empty string');
  }
  if (!isNonEmptyString(envelope.trace_id)) {
    issues.push('trace_id must be a non-empty string');
  }
  if (!hasNumericAttempt(envelope.attempt)) {
    issues.push('attempt must be an integer >= 0');
  }
  if (!isNonEmptyString(envelope.stage)) {
    issues.push('stage must be a non-empty string');
  }
  if (!isNonEmptyString(envelope.payload_version)) {
    issues.push('payload_version must be a non-empty string');
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function normalizeEnvelope(input, options = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new QueueEnvelopeError('invalid_envelope', 'Queue envelope must be a plain object.');
  }

  const defaultStage = isNonEmptyString(options.default_stage) ? options.default_stage : 'queued';
  const defaultPayloadVersion = isNonEmptyString(options.default_payload_version)
    ? options.default_payload_version
    : 'v1';

  const envelope = {
    ...input,
    job_id: isNonEmptyString(input.job_id) ? input.job_id : `job_${randomUUID()}`,
    trace_id: isNonEmptyString(input.trace_id) ? input.trace_id : null,
    attempt: hasNumericAttempt(input.attempt) ? input.attempt : 0,
    stage: isNonEmptyString(input.stage) ? input.stage : defaultStage,
    payload_version: isNonEmptyString(input.payload_version)
      ? input.payload_version
      : defaultPayloadVersion,
  };

  if (!envelope.trace_id) {
    envelope.trace_id = envelope.job_id;
  }

  const validation = validateEnvelope(envelope);
  if (!validation.ok) {
    throw new QueueEnvelopeError(
      'invalid_envelope',
      `Queue envelope validation failed: ${validation.issues.join('; ')}`,
      { issues: validation.issues, required_fields: ENVELOPE_REQUIRED_FIELDS },
    );
  }

  return envelope;
}

