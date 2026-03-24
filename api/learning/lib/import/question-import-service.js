import { LEARNING_ERROR_CODES } from '../contracts/error-contract.js';
import { resolveReleasedScoringPosture } from '../contracts/released-scope.js';
import { LearningHttpError } from '../http/learning-http.js';
import {
  getCanonicalQuestionType,
  insertImportedQuestion,
} from '../repositories/question-registry-repository.js';
import { validateQuestionImportInput } from '../validators/question-import-validator.js';

const IDEMPOTENT_QUESTION_IMPORTS = new Map();

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function cloneJson(value) {
  if (typeof value === 'undefined') {
    return null;
  }

  return JSON.parse(JSON.stringify(value));
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeJson(entry));
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonicalizeJson(value[key]);
        return acc;
      }, {});
  }

  return value ?? null;
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  promise.catch(() => {});
  return { promise, resolve, reject };
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeString(entry))
    .filter(Boolean);
}

function normalizeObjectOrNull(value) {
  return isPlainObject(value) ? cloneJson(value) : null;
}

function normalizeObjectOrEmpty(value) {
  return isPlainObject(value) ? cloneJson(value) : {};
}

function normalizeClassificationConfidence(value) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCandidateRubricRefs(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => isPlainObject(entry))
    .map((entry) => cloneJson(entry));
}

function normalizeClassification(body = {}) {
  const rawClassification = isPlainObject(body.classification) ? body.classification : {};

  return {
    primary_topic_id: normalizeNullableString(
      rawClassification.primary_topic_id ?? body.primary_topic_id,
    ),
    secondary_topic_ids: normalizeStringArray(
      rawClassification.secondary_topic_ids ?? body.secondary_topic_ids,
    ),
    family_id: normalizeNullableString(rawClassification.family_id ?? body.family_id),
    primary_question_type_id: normalizeNullableString(
      rawClassification.primary_question_type_id ?? body.primary_question_type_id,
    ),
    secondary_question_type_ids: normalizeStringArray(
      rawClassification.secondary_question_type_ids ?? body.secondary_question_type_ids,
    ),
    variant_tags: normalizeStringArray(rawClassification.variant_tags ?? body.variant_tags),
    classification_source:
      normalizeNullableString(rawClassification.classification_source) || 'imported_question',
    classification_confidence: normalizeClassificationConfidence(
      rawClassification.classification_confidence,
    ),
    candidate_rubric_refs: normalizeCandidateRubricRefs(rawClassification.candidate_rubric_refs),
    uncertainty_validated:
      typeof rawClassification.uncertainty_validated === 'boolean'
        ? rawClassification.uncertainty_validated
        : false,
    uncertainty_posture: normalizeObjectOrNull(rawClassification.uncertainty_posture),
  };
}

function normalizeQuestionImportBody(body = {}) {
  const validated = validateQuestionImportInput(body);

  return {
    ...validated.normalized,
    paper_scope: normalizeObjectOrNull(body.paper_scope),
    provenance_summary: normalizeObjectOrEmpty(body.provenance_summary),
    classification: normalizeClassification(body),
  };
}

function mergeCanonicalClassification(classification, canonicalQuestionType) {
  return {
    ...classification,
    family_id: canonicalQuestionType?.family_id ?? classification.family_id,
    primary_question_type_id:
      canonicalQuestionType?.question_type_id ?? classification.primary_question_type_id,
  };
}

function idempotencyKeyForQuestionImport(userId, requestPath, headerValue) {
  const normalizedUserId = normalizeNullableString(userId);
  const normalizedPath = normalizeNullableString(requestPath) || '/api/learning/questions/import';
  const normalizedHeaderValue = normalizeNullableString(headerValue);

  if (!normalizedUserId || !normalizedHeaderValue) {
    return null;
  }

  return `${normalizedUserId}:${normalizedPath}:${normalizedHeaderValue}`;
}

function normalizedIdempotencyPayload(payload) {
  return JSON.stringify(canonicalizeJson(payload));
}

function createIdempotencyConflictError() {
  return new LearningHttpError(
    LEARNING_ERROR_CODES.IDEMPOTENCY_CONFLICT,
    'Idempotency key was replayed with a different payload.',
  );
}

async function maybeReplayQuestionImport(cacheKey, normalizedPayload) {
  if (!cacheKey) {
    return null;
  }

  while (true) {
    const cached = IDEMPOTENT_QUESTION_IMPORTS.get(cacheKey);
    if (!cached) {
      return null;
    }

    if (cached.normalizedPayload !== normalizedPayload) {
      throw createIdempotencyConflictError();
    }

    if (cached.state === 'pending') {
      try {
        const response = await cached.deferred.promise;
        return cloneJson(response);
      } catch (error) {
        const current = IDEMPOTENT_QUESTION_IMPORTS.get(cacheKey);
        if (current === cached) {
          IDEMPOTENT_QUESTION_IMPORTS.delete(cacheKey);
        }
        throw error;
      }
    }

    return cloneJson(cached.response);
  }
}

function reserveQuestionImport(cacheKey, normalizedPayload) {
  if (!cacheKey) {
    return { reservation: null, replay: null };
  }

  const existing = IDEMPOTENT_QUESTION_IMPORTS.get(cacheKey);
  if (existing) {
    if (existing.normalizedPayload !== normalizedPayload) {
      throw createIdempotencyConflictError();
    }

    return {
      reservation: null,
      replay: existing,
    };
  }

  const reservation = {
    normalizedPayload,
    state: 'pending',
    response: null,
    deferred: createDeferred(),
  };
  IDEMPOTENT_QUESTION_IMPORTS.set(cacheKey, reservation);
  return {
    reservation,
    replay: null,
  };
}

function rememberQuestionImport(cacheKey, reservation, response) {
  if (!cacheKey || !reservation) {
    return;
  }

  const clonedResponse = cloneJson(response);
  reservation.state = 'fulfilled';
  reservation.response = clonedResponse;
  reservation.deferred.resolve(clonedResponse);
}

function releaseQuestionImportReservation(cacheKey, reservation, error) {
  if (!cacheKey || !reservation) {
    return;
  }

  if (IDEMPOTENT_QUESTION_IMPORTS.get(cacheKey) === reservation) {
    IDEMPOTENT_QUESTION_IMPORTS.delete(cacheKey);
  }

  reservation.deferred.reject(error);
}

export function __resetQuestionImportIdempotencyCache() {
  IDEMPOTENT_QUESTION_IMPORTS.clear();
}

export async function importQuestion(client, {
  userId,
  requestPath = '/api/learning/questions/import',
  body,
  idempotencyKey = null,
} = {}) {
  const normalizedUserId = normalizeNullableString(userId);
  if (!normalizedUserId) {
    throw new LearningHttpError(
      LEARNING_ERROR_CODES.AUTH_REQUIRED,
      'Authentication required.',
    );
  }

  const normalizedInput = normalizeQuestionImportBody(body);
  const cacheKey = idempotencyKeyForQuestionImport(
    normalizedUserId,
    requestPath,
    idempotencyKey,
  );
  const normalizedPayload = normalizedIdempotencyPayload(normalizedInput);
  const reserved = reserveQuestionImport(cacheKey, normalizedPayload);
  if (reserved.replay) {
    const replay = await maybeReplayQuestionImport(cacheKey, normalizedPayload);
    if (replay) {
      return replay;
    }
  }

  const reservation = reserved.reservation;

  try {
    const canonicalQuestionType = await getCanonicalQuestionType(client, {
      subjectCode: normalizedInput.subject_code,
      questionTypeId: normalizedInput.classification.primary_question_type_id,
    });
    const classification = mergeCanonicalClassification(
      normalizedInput.classification,
      canonicalQuestionType,
    );
    const scoringScopePosture = resolveReleasedScoringPosture({
      questionTypeId: classification.primary_question_type_id,
      questionTypeReleaseState: canonicalQuestionType?.release_state ?? null,
      candidateRubricRefs: classification.candidate_rubric_refs,
      uncertaintyValidated: classification.uncertainty_validated,
      uncertaintyPosture: classification.uncertainty_posture,
      classificationConfidence: classification.classification_confidence,
    });

    const question = await insertImportedQuestion(client, {
      source_kind: normalizedInput.source_kind,
      subject_code: normalizedInput.subject_code,
      prompt_representation: normalizedInput.prompt_representation,
      paper_scope: normalizedInput.paper_scope,
      provenance_summary: normalizedInput.provenance_summary,
      release_scope_status: scoringScopePosture.release_scope_status,
      classification,
    });

    const response = {
      question,
      scoring_scope_posture: scoringScopePosture,
    };

    rememberQuestionImport(cacheKey, reservation, response);
    return response;
  } catch (error) {
    releaseQuestionImportReservation(cacheKey, reservation, error);
    throw error;
  }
}
