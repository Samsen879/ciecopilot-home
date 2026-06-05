import { LEARNING_ERROR_CODES } from '../contracts/error-contract.js';
import { LearningHttpError } from '../http/learning-http.js';
import {
  REVIEW_TASK_COMPLETION_OUTCOMES,
  hasReviewTaskCompletionEvidenceSignal,
} from './review-task-completion-evidence.js';

const REVIEW_TASK_WRITE_INTENTS = new Set(['complete', 'reschedule', 'snooze', 'reopen']);

function normalizeString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasTypedRef(value) {
  if (!isPlainObject(value) || !normalizeString(value.kind)) {
    return false;
  }

  return Object.entries(value).some(([key, refValue]) =>
    key !== 'kind' && normalizeString(refValue));
}

function buildInvalidPayload(message, details) {
  return new LearningHttpError(LEARNING_ERROR_CODES.INVALID_PAYLOAD, message, {
    status: 400,
    details,
  });
}

function normalizeIsoTimestamp(value, field) {
  const normalized = normalizeString(value);
  if (!normalized) {
    throw buildInvalidPayload(`${field} is required.`, { field });
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw buildInvalidPayload(`${field} must be a valid ISO-8601 timestamp.`, { field });
  }

  return parsed.toISOString();
}

function normalizeEvidenceRefs(value) {
  if (value === null || value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.some((item) => !hasTypedRef(item))) {
    throw buildInvalidPayload('completion_evidence.evidence_refs must be an array of typed refs.', {
      field: 'completion_evidence.evidence_refs',
    });
  }

  return value;
}

function normalizeOptionalTypedRef(value, field) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!hasTypedRef(value)) {
    throw buildInvalidPayload(`${field} must be a typed ref object.`, { field });
  }

  return value;
}

function normalizeCompletionEvidence(value) {
  if (!isPlainObject(value)) {
    throw buildInvalidPayload('completion_evidence must be an object.', {
      field: 'completion_evidence',
    });
  }

  const normalized = {
    ...value,
  };

  const summary = normalizeString(value.summary);
  const note = normalizeString(value.note);
  const observedAt = value.observed_at === undefined
    ? undefined
    : normalizeIsoTimestamp(value.observed_at, 'completion_evidence.observed_at');
  const artifactRef = normalizeOptionalTypedRef(value.artifact_ref, 'completion_evidence.artifact_ref');
  const attemptRef = normalizeOptionalTypedRef(value.attempt_ref, 'completion_evidence.attempt_ref');
  const markRunRef = normalizeOptionalTypedRef(value.mark_run_ref, 'completion_evidence.mark_run_ref');
  const evidenceRefs = normalizeEvidenceRefs(value.evidence_refs);

  if (summary) {
    normalized.summary = summary;
  }

  if (note) {
    normalized.note = note;
  }

  if (observedAt) {
    normalized.observed_at = observedAt;
  }

  if (artifactRef) {
    normalized.artifact_ref = artifactRef;
  }

  if (attemptRef) {
    normalized.attempt_ref = attemptRef;
  }

  if (markRunRef) {
    normalized.mark_run_ref = markRunRef;
  }

  if (value.evidence_refs !== undefined) {
    normalized.evidence_refs = evidenceRefs;
  }

  if (!hasReviewTaskCompletionEvidenceSignal(normalized)) {
    throw buildInvalidPayload(
      'completion_evidence must include behavioral evidence for the requested outcome.',
      { field: 'completion_evidence' },
    );
  }

  return normalized;
}

export function validateReviewTaskWritePayload(body = {}) {
  if (Object.prototype.hasOwnProperty.call(body, 'state')) {
    throw buildInvalidPayload('Review-task lifecycle writes must use explicit intents.', {
      field: 'state',
    });
  }

  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    throw buildInvalidPayload('Review-task lifecycle writes must use explicit intents.', {
      field: 'status',
    });
  }

  if (!REVIEW_TASK_WRITE_INTENTS.has(body.intent)) {
    throw buildInvalidPayload('Review-task lifecycle writes must use explicit intents.', {
      field: 'intent',
    });
  }

  if (body.intent === 'complete') {
    if (!REVIEW_TASK_COMPLETION_OUTCOMES.has(body.completion_outcome)) {
      throw buildInvalidPayload('completion_outcome must be completed, partial, skipped, or expired.', {
        field: 'completion_outcome',
      });
    }

    return {
      intent: body.intent,
      completionOutcome: body.completion_outcome,
      completionEvidence: normalizeCompletionEvidence(body.completion_evidence),
    };
  }

  if (body.intent === 'reschedule' || body.intent === 'snooze') {
    return {
      intent: body.intent,
      dueAt: normalizeIsoTimestamp(body.due_at, 'due_at'),
    };
  }

  return {
    intent: body.intent,
  };
}
