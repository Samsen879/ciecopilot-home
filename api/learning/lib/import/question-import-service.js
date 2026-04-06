import { randomUUID } from 'node:crypto';
import { LEARNING_ERROR_CODES } from '../contracts/error-contract.js';
import { resolveInlineReleasedScoringPosture } from '../contracts/released-scope-core.js';
import { LearningHttpError } from '../http/learning-http.js';
import {
  getCanonicalReleasedScopeContext,
  getQuestionById,
  insertImportedQuestion,
} from '../repositories/question-registry-repository.js';
import {
  getSubjectAdapter,
} from '../subjects/subject-adapter-registry.js';
import {
  deleteLearningRequestIdempotencyReservation,
  finalizeLearningRequestIdempotency,
  getLearningRequestIdempotency,
  reserveLearningRequestIdempotency,
  setLearningRequestIdempotencyResourceRef,
} from '../repositories/request-idempotency-repository.js';
import { validateQuestionImportInput } from '../validators/question-import-validator.js';

const IDEMPOTENCY_POLL_ATTEMPTS = 10;
const IDEMPOTENCY_POLL_INTERVAL_MS = 250;
const IDEMPOTENCY_ABANDONED_AGE_MS = 5 * 60 * 1000;
const FROZEN_PILOT_FAMILY_ID = '9709.trigonometry_manipulation_equations';
const RELEASED_STATE = 'released';
const COMPAT_RUNTIME_TOPIC_ALIAS_BY_QUESTION_TYPE = Object.freeze({
  '9709.trigonometry.equations': new Set(['topic-trig-equations']),
  '9709.trigonometry.identities': new Set(['topic-trig-identities']),
});

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

function isUuidString(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim(),
  );
}

function normalizeCompatibleRuntimeTopicId(value, questionTypeId) {
  const normalizedTopicId = normalizeNullableString(value);
  if (!normalizedTopicId) {
    return null;
  }

  if (isUuidString(normalizedTopicId)) {
    return normalizedTopicId;
  }

  const normalizedQuestionTypeId = normalizeNullableString(questionTypeId);
  const aliases = COMPAT_RUNTIME_TOPIC_ALIAS_BY_QUESTION_TYPE[normalizedQuestionTypeId];
  if (aliases?.has(normalizedTopicId)) {
    return null;
  }

  return normalizedTopicId;
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

function createIdempotencyConflictError() {
  return new LearningHttpError(
    LEARNING_ERROR_CODES.IDEMPOTENCY_CONFLICT,
    'Idempotency key was replayed with a different payload.',
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPendingReservationAbandoned(row) {
  if (row?.status !== 'pending') {
    return false;
  }

  const createdAt = Date.parse(row.created_at || '');
  if (!Number.isFinite(createdAt)) {
    return false;
  }

  return (Date.now() - createdAt) >= IDEMPOTENCY_ABANDONED_AGE_MS;
}

function isReleasedPilotRegistryContext({
  canonicalQuestionType,
  canonicalQuestionFamily,
} = {}) {
  const familyId = normalizeNullableString(canonicalQuestionFamily?.family_id);
  const questionTypeFamilyId = normalizeNullableString(canonicalQuestionType?.family_id);
  const familySubjectCode = normalizeNullableString(canonicalQuestionFamily?.subject_code);
  const questionTypeSubjectCode = normalizeNullableString(canonicalQuestionType?.subject_code);
  const familyReleaseState = normalizeString(canonicalQuestionFamily?.release_state).toLowerCase();
  const questionTypeReleaseState = normalizeString(canonicalQuestionType?.release_state).toLowerCase();

  return Boolean(
    familyId
    && familyId === FROZEN_PILOT_FAMILY_ID
    && questionTypeFamilyId === FROZEN_PILOT_FAMILY_ID
    && familySubjectCode
    && familySubjectCode === questionTypeSubjectCode
    && familyReleaseState === RELEASED_STATE
    && questionTypeReleaseState === RELEASED_STATE
  );
}

function mergeCanonicalClassification({
  subjectCode,
  classification,
  canonicalQuestionType,
  canonicalQuestionFamily,
} = {}) {
  const adapter = getSubjectAdapter(subjectCode);
  const mergedClassification = adapter.classification.mergeCanonicalClassification({
    classification,
    canonicalQuestionType,
  });

  return {
    ...mergedClassification,
    family_id:
      canonicalQuestionFamily?.family_id
      ?? canonicalQuestionType?.family_id
      ?? mergedClassification.family_id
      ?? null,
  };
}

export async function resolveReleasedScoringPosture(client, {
  subjectCode,
  classification,
} = {}) {
  const normalizedSubjectCode = normalizeNullableString(subjectCode);
  const normalizedClassification = isPlainObject(classification) ? cloneJson(classification) : {};
  const canonicalContext = await getCanonicalReleasedScopeContext(client, {
    subjectCode: normalizedSubjectCode,
    questionTypeId: normalizedClassification.primary_question_type_id ?? null,
  });
  const canonicalQuestionType = canonicalContext?.questionType ?? null;
  const canonicalQuestionFamily = canonicalContext?.family ?? null;
  const mergedClassification = mergeCanonicalClassification({
    subjectCode: normalizedSubjectCode,
    classification: normalizedClassification,
    canonicalQuestionType,
    canonicalQuestionFamily,
  });
  const scoringScopePosture = resolveInlineReleasedScoringPosture({
    questionTypeId: mergedClassification.primary_question_type_id,
    questionTypeReleaseState: canonicalQuestionType?.release_state ?? null,
    candidateRubricRefs: mergedClassification.candidate_rubric_refs,
    uncertaintyValidated: mergedClassification.uncertainty_validated,
    uncertaintyPosture: mergedClassification.uncertainty_posture,
    classificationConfidence: mergedClassification.classification_confidence,
    isPilotQuestionType: isReleasedPilotRegistryContext({
      canonicalQuestionType,
      canonicalQuestionFamily,
    }),
  });

  return {
    classification: mergedClassification,
    canonicalQuestionType,
    canonicalQuestionFamily,
    scoringScopePosture,
  };
}

async function buildQuestionImportResponse(client, {
  question,
  requestPayload,
} = {}) {
  const requestClassification = isPlainObject(requestPayload?.classification)
    ? requestPayload.classification
    : {};
  const { scoringScopePosture } = await resolveReleasedScoringPosture(client, {
    subjectCode: question?.subject_code ?? requestPayload?.subject_code ?? null,
    classification: {
      ...requestClassification,
      family_id: question?.family_id ?? requestClassification.family_id ?? null,
      primary_question_type_id:
        question?.primary_question_type_id
        ?? requestClassification.primary_question_type_id
        ?? null,
    },
  });

  return {
    question,
    scoring_scope_posture: scoringScopePosture,
  };
}

async function maybeRecoverQuestionImportResponse(client, { row } = {}) {
  const questionId = row?.resource_ref?.kind === 'question'
    ? normalizeNullableString(row.resource_ref.question_id)
    : null;

  if (!questionId) {
    return null;
  }

  const question = await getQuestionById(client, { questionId });
  if (!question) {
    return null;
  }

  return buildQuestionImportResponse(client, {
    question,
    requestPayload: row.request_payload ?? {},
  });
}

async function resolveQuestionImportReplay(client, {
  userId,
  requestPath,
  idempotencyKey,
  row,
} = {}) {
  let current = row;

  for (let attempt = 0; attempt < IDEMPOTENCY_POLL_ATTEMPTS; attempt += 1) {
    if (current?.status === 'completed' && isPlainObject(current.response_payload)) {
      return cloneJson(current.response_payload);
    }

    const recovered = await maybeRecoverQuestionImportResponse(client, { row: current });
    if (recovered) {
      await finalizeLearningRequestIdempotency(client, {
        userId,
        requestPath,
        idempotencyKey,
        responsePayload: recovered,
      });
      return recovered;
    }

    if (attempt < IDEMPOTENCY_POLL_ATTEMPTS - 1) {
      await sleep(IDEMPOTENCY_POLL_INTERVAL_MS);
      current = await getLearningRequestIdempotency(client, {
        userId,
        requestPath,
        idempotencyKey,
      });
    }
  }

  const latest = await getLearningRequestIdempotency(client, {
    userId,
    requestPath,
    idempotencyKey,
  });

  if (latest?.status === 'completed' && isPlainObject(latest.response_payload)) {
    return cloneJson(latest.response_payload);
  }

  const recovered = await maybeRecoverQuestionImportResponse(client, { row: latest });
  if (recovered) {
    await finalizeLearningRequestIdempotency(client, {
      userId,
      requestPath,
      idempotencyKey,
      responsePayload: recovered,
    });
    return recovered;
  }

  if (latest && isPendingReservationAbandoned(latest)) {
    await deleteLearningRequestIdempotencyReservation(client, {
      userId,
      requestPath,
      idempotencyKey,
    });
    return null;
  }

  throw new Error('Learning question import request is still pending.');
}

async function performQuestionImport(client, {
  normalizedInput,
  questionId = null,
} = {}) {
  const {
    classification,
    scoringScopePosture,
  } = await resolveReleasedScoringPosture(client, {
    subjectCode: normalizedInput.subject_code,
    classification: normalizedInput.classification,
  });
  classification.primary_topic_id = normalizeCompatibleRuntimeTopicId(
    classification.primary_topic_id,
    classification.primary_question_type_id,
  );

  const question = await insertImportedQuestion(client, {
    question_id: questionId,
    source_kind: normalizedInput.source_kind,
    subject_code: normalizedInput.subject_code,
    prompt_representation: normalizedInput.prompt_representation,
    paper_scope: normalizedInput.paper_scope,
    provenance_summary: normalizedInput.provenance_summary,
    release_scope_status: scoringScopePosture.release_scope_status,
    classification,
  });

  return {
    question,
    scoring_scope_posture: scoringScopePosture,
  };
}

export function __resetQuestionImportIdempotencyCache() {
  return undefined;
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
  const normalizedIdempotencyKey = normalizeNullableString(idempotencyKey);

  if (!normalizedIdempotencyKey) {
    return performQuestionImport(client, {
      normalizedInput,
    });
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const reservation = await reserveLearningRequestIdempotency(client, {
      userId: normalizedUserId,
      requestPath,
      idempotencyKey: normalizedIdempotencyKey,
      requestKind: 'import_learning_question',
      requestPayload: normalizedInput,
    });

    if (reservation.state === 'conflict') {
      throw createIdempotencyConflictError();
    }

    if (reservation.state === 'replay') {
      const replay = await resolveQuestionImportReplay(client, {
        userId: normalizedUserId,
        requestPath,
        idempotencyKey: normalizedIdempotencyKey,
        row: reservation.row,
      });

      if (replay) {
        return replay;
      }

      continue;
    }

    const questionId = randomUUID();

    await setLearningRequestIdempotencyResourceRef(client, {
      userId: normalizedUserId,
      requestPath,
      idempotencyKey: normalizedIdempotencyKey,
      resourceRef: {
        kind: 'question',
        question_id: questionId,
      },
    });

    const response = await performQuestionImport(client, {
      normalizedInput,
      questionId,
    });

    await finalizeLearningRequestIdempotency(client, {
      userId: normalizedUserId,
      requestPath,
      idempotencyKey: normalizedIdempotencyKey,
      responsePayload: response,
    });

    return response;
  }

  throw new Error('Unable to reacquire abandoned question import reservation.');
}
