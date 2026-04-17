import { LEARNING_SIGNAL_POSTURES } from './released-scope-core.js';

export const RUNTIME_AUTHORITY_POSTURES = Object.freeze({
  DEFAULT_DURABLE: 'default_durable',
  NON_AUTHORITATIVE: 'non_authoritative',
});

export const RUNTIME_AUTHORITY_REASON_CODES = Object.freeze({
  IMPORTED_QUESTION_ATTEMPT: 'imported_question_attempt',
});

export const NON_AUTHORITATIVE_BLOCKED_MATERIALIZERS = Object.freeze([
  'authoritative_scoring_aggregate',
  'mastery',
  'review_queue',
  'stable_slot_residency',
]);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizePosture(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? clone(value)
    : {};
}

function resolveQuestionSourceKind(posture = {}, options = {}) {
  return normalizeString(
    options.questionSourceKind
    ?? options.question_source_kind
    ?? options.questionContext?.source_kind
    ?? options.question_context?.source_kind
    ?? posture.question_source_kind,
  ) || null;
}

function buildNonAuthoritativeExplanation(questionSourceKind) {
  return {
    posture: 'non_authoritative',
    summary:
      'Imported-question attempts are durable runtime inputs, but they cannot mutate authoritative product truth.',
    factors: [
      {
        code: 'question_source_kind',
        status: 'non_authoritative',
        summary:
          'Imported-question attempts stay queryable in runtime surfaces while authoritative downstream materializers remain blocked.',
        value: questionSourceKind,
      },
    ],
  };
}

export function buildRuntimeAuthorityPosture(posture = {}, options = {}) {
  const normalized = normalizePosture(posture);
  const questionSourceKind = resolveQuestionSourceKind(normalized, options);

  if (questionSourceKind === 'imported_question') {
    return {
      ...normalized,
      authoritative_scoring_allowed: false,
      fallback_reason_code:
        normalized.fallback_reason_code
        || RUNTIME_AUTHORITY_REASON_CODES.IMPORTED_QUESTION_ATTEMPT,
      learning_signal_posture: LEARNING_SIGNAL_POSTURES.CONSERVATIVE_FALLBACK,
      runtime_authority_posture: RUNTIME_AUTHORITY_POSTURES.NON_AUTHORITATIVE,
      runtime_authority_reason_code: RUNTIME_AUTHORITY_REASON_CODES.IMPORTED_QUESTION_ATTEMPT,
      blocked_materializers: [...NON_AUTHORITATIVE_BLOCKED_MATERIALIZERS],
      question_source_kind: questionSourceKind,
      explanation: buildNonAuthoritativeExplanation(questionSourceKind),
    };
  }

  return {
    ...normalized,
    runtime_authority_posture:
      normalizeString(normalized.runtime_authority_posture)
      || RUNTIME_AUTHORITY_POSTURES.DEFAULT_DURABLE,
    runtime_authority_reason_code:
      normalizeString(normalized.runtime_authority_reason_code) || null,
    blocked_materializers: normalizeArray(normalized.blocked_materializers),
    question_source_kind: questionSourceKind,
  };
}

export function extractRuntimeAuthorityPosture(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return buildRuntimeAuthorityPosture();
  }

  const posture = input.release_scope_posture
    || input.authorityPosture
    || input.authority_posture
    || input;

  return buildRuntimeAuthorityPosture(posture, input);
}

export function isNonAuthoritativeRuntimeInput(input = {}) {
  return extractRuntimeAuthorityPosture(input).runtime_authority_posture
    === RUNTIME_AUTHORITY_POSTURES.NON_AUTHORITATIVE;
}

export function buildAttemptGroundingRef(sourceAttemptRef = null, postureInput = {}) {
  if (!sourceAttemptRef || typeof sourceAttemptRef !== 'object' || Array.isArray(sourceAttemptRef)) {
    return null;
  }

  const runtimeAuthorityPosture = extractRuntimeAuthorityPosture(postureInput);
  return {
    ...clone(sourceAttemptRef),
    runtime_authority_posture: runtimeAuthorityPosture.runtime_authority_posture,
    runtime_authority_reason_code: runtimeAuthorityPosture.runtime_authority_reason_code,
    question_source_kind: runtimeAuthorityPosture.question_source_kind,
    blocked_materializers: runtimeAuthorityPosture.blocked_materializers,
  };
}

export function hasNonAuthoritativeAttemptGrounding(groundingRefs = []) {
  return normalizeArray(groundingRefs).some((groundingRef) =>
    normalizeString(groundingRef?.kind) === 'attempt'
    && normalizeString(groundingRef?.runtime_authority_posture)
      === RUNTIME_AUTHORITY_POSTURES.NON_AUTHORITATIVE);
}
