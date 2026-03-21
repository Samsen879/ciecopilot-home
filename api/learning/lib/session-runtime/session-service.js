import { insertSession, getSession } from '../repositories/session-repository.js';
import { resolveCreateSessionAnchor } from './session-anchor-resolution.js';
import { createSessionHandoffStub } from './session-handoff.js';

const VALID_SESSION_MODES = new Set([
  'learn_concept',
  'guided_solve',
  'timed_practice',
  'post_mortem_review',
  'spaced_review',
]);

const VALID_ANCHOR_KINDS = new Set([
  'concept',
  'question',
  'review_task',
  'artifact',
  'workspace_slot',
]);

const VALID_WORKSPACE_SLOT_KEYS = new Set([
  'overview_map',
  'core_method_derivation',
  'canonical_worked_example',
  'common_traps',
  'my_notes',
  'review_queue',
]);

const LEARNING_ERROR_SPECS = {
  auth_required: { status: 401, message: 'Authentication required.' },
  auth_forbidden: { status: 403, message: 'Authenticated user cannot access this resource.' },
  invalid_payload: { status: 400, message: 'Invalid request payload.' },
  invalid_anchor_kind: { status: 400, message: 'Anchor kind is invalid.' },
  invalid_anchor_ref: { status: 400, message: 'Anchor ref is invalid.' },
  anchor_target_not_found: { status: 404, message: 'Anchor target not found.' },
  unsupported_mode_for_anchor: {
    status: 409,
    message: 'This mode is not allowed for the anchor kind.',
  },
  session_not_found: { status: 404, message: 'Learning session not found.' },
  session_state_conflict: { status: 409, message: 'Learning session state conflict.' },
  question_not_found: { status: 404, message: 'Question not found.' },
  workspace_not_found: { status: 404, message: 'Workspace not found.' },
  artifact_not_found: { status: 404, message: 'Artifact not found.' },
  artifact_state_conflict: { status: 409, message: 'Artifact state conflict.' },
  idempotency_conflict: {
    status: 409,
    message: 'Idempotency key was replayed with a different payload.',
  },
  internal_error: { status: 500, message: 'Internal server error.' },
};

const IDEMPOTENT_CREATE_SESSIONS = new Map();

function normalizeString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeNullableString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  if (typeof value === 'undefined') {
    return null;
  }
  return JSON.parse(JSON.stringify(value));
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

function createLearningError(code, {
  status,
  message,
  details = {},
} = {}) {
  const spec = LEARNING_ERROR_SPECS[code] || LEARNING_ERROR_SPECS.internal_error;
  const error = new Error(message || spec.message);
  error.code = code;
  error.status = status || spec.status;
  error.retryable = false;
  error.details = details;
  return error;
}

function makeQuestionRef(questionId) {
  return questionId ? { kind: 'question', question_id: questionId } : null;
}

function makeQuestionTypeRef(questionTypeId) {
  return questionTypeId
    ? { kind: 'question_type', question_type_id: questionTypeId }
    : null;
}

function makeTopicRef(topicId, topicPath) {
  return topicId || topicPath
    ? { kind: 'topic', topic_id: topicId ?? null, topic_path: topicPath ?? null }
    : null;
}

function normalizeSessionBundle({
  sessionGoal,
  mode,
  anchorKind,
  anchorRef,
  currentQuestionId,
  currentQuestionTypeId,
  canonicalHome,
} = {}) {
  return {
    primary_topic_id: canonicalHome?.topic_id ?? null,
    primary_topic_path: canonicalHome?.topic_path ?? null,
    secondary_topics_in_scope: [],
    allowed_prerequisites: [],
    paper_context: null,
    mode,
    session_goal: sessionGoal ?? null,
    current_anchor_kind: anchorKind,
    current_anchor_ref: anchorRef,
    current_question_ref: makeQuestionRef(currentQuestionId),
    current_question_type_ref: makeQuestionTypeRef(currentQuestionTypeId),
  };
}

function featureFlags() {
  return {
    learning_runtime_enabled: true,
    session_create_read_enabled: true,
  };
}

function buildAnchorValidity(anchorKind, anchorRef, canonicalHome) {
  return {
    ok: true,
    anchor_kind: anchorKind,
    anchor_ref: anchorRef,
    canonical_home_topic_ref: makeTopicRef(
      canonicalHome?.topic_id ?? null,
      canonicalHome?.topic_path ?? null,
    ),
  };
}

function buildCanonicalHomeContext(anchorKind, canonicalHome) {
  return {
    source_anchor_kind: anchorKind,
    topic_ref: makeTopicRef(canonicalHome?.topic_id ?? null, canonicalHome?.topic_path ?? null),
  };
}

function normalizeStoredBundle(session) {
  const bundle = isPlainObject(session?.active_scope_bundle) ? session.active_scope_bundle : {};
  return {
    primary_topic_id: bundle.primary_topic_id ?? null,
    primary_topic_path: bundle.primary_topic_path ?? null,
    secondary_topics_in_scope: Array.isArray(bundle.secondary_topics_in_scope)
      ? bundle.secondary_topics_in_scope
      : [],
    allowed_prerequisites: Array.isArray(bundle.allowed_prerequisites)
      ? bundle.allowed_prerequisites
      : [],
    paper_context: bundle.paper_context ?? null,
    mode: bundle.mode ?? session?.mode ?? null,
    session_goal: bundle.session_goal ?? session?.session_goal ?? null,
    current_anchor_kind: bundle.current_anchor_kind ?? session?.current_anchor_kind ?? null,
    current_anchor_ref: bundle.current_anchor_ref ?? session?.current_anchor_ref ?? null,
    current_question_ref:
      bundle.current_question_ref ?? makeQuestionRef(session?.current_question_id ?? null),
    current_question_type_ref:
      bundle.current_question_type_ref ??
      makeQuestionTypeRef(session?.current_question_type_id ?? null),
  };
}

function normalizeSessionResponse(session) {
  return {
    ...session,
    active_scope_bundle: normalizeStoredBundle(session),
  };
}

function assertRequiredString(value, field) {
  const normalized = normalizeString(value);
  if (!normalized) {
    throw createLearningError('invalid_payload', {
      message: `${field} is required.`,
      details: { field },
    });
  }
  return normalized;
}

function validateAnchorRef(anchorKind, anchorRef) {
  if (!isPlainObject(anchorRef)) {
    throw createLearningError('invalid_payload', {
      message: 'anchor_ref must be an object.',
      details: { field: 'anchor_ref' },
    });
  }

  if (anchorRef.kind !== anchorKind) {
    throw createLearningError('invalid_payload', {
      message: 'anchor_ref.kind must match anchor_kind.',
      details: { field: 'anchor_ref.kind' },
    });
  }

  if (anchorKind === 'concept') {
    if (!normalizeString(anchorRef.topic_id) || !normalizeString(anchorRef.topic_path)) {
      throw createLearningError('invalid_payload', {
        message: 'concept anchors require topic_id and topic_path.',
        details: { field: 'anchor_ref' },
      });
    }
    return;
  }

  if (anchorKind === 'question' && !normalizeString(anchorRef.question_id)) {
    throw createLearningError('invalid_payload', {
      message: 'question anchors require question_id.',
      details: { field: 'anchor_ref.question_id' },
    });
  }

  if (anchorKind === 'review_task' && !normalizeString(anchorRef.review_task_id)) {
    throw createLearningError('invalid_payload', {
      message: 'review_task anchors require review_task_id.',
      details: { field: 'anchor_ref.review_task_id' },
    });
  }

  if (anchorKind === 'artifact' && !normalizeString(anchorRef.artifact_id)) {
    throw createLearningError('invalid_payload', {
      message: 'artifact anchors require artifact_id.',
      details: { field: 'anchor_ref.artifact_id' },
    });
  }

  if (anchorKind === 'workspace_slot') {
    if (!normalizeString(anchorRef.workspace_id) || !normalizeString(anchorRef.slot_key)) {
      throw createLearningError('invalid_payload', {
        message: 'workspace_slot anchors require workspace_id and slot_key.',
        details: { field: 'anchor_ref' },
      });
    }
    if (!VALID_WORKSPACE_SLOT_KEYS.has(anchorRef.slot_key)) {
      throw createLearningError('invalid_payload', {
        message: 'workspace_slot slot_key is invalid.',
        details: { field: 'anchor_ref.slot_key' },
      });
    }
  }
}

function validateCreateSessionPayload(body = {}) {
  if (!isPlainObject(body)) {
    throw createLearningError('invalid_payload', {
      message: 'Request body must be an object.',
    });
  }

  const subjectCode = assertRequiredString(body.subject_code, 'subject_code');
  const mode = assertRequiredString(body.mode, 'mode');

  if (!VALID_SESSION_MODES.has(mode)) {
    throw createLearningError('invalid_payload', {
      message: 'mode is invalid.',
      details: { field: 'mode' },
    });
  }

  const anchorKind = assertRequiredString(body.anchor_kind, 'anchor_kind');
  if (!VALID_ANCHOR_KINDS.has(anchorKind)) {
    throw createLearningError('invalid_anchor_kind', {
      details: { field: 'anchor_kind' },
    });
  }

  const currentQuestionId = normalizeNullableString(body.current_question_id);
  const currentQuestionTypeId = normalizeNullableString(body.current_question_type_id);
  const sessionGoal = normalizeNullableString(body.session_goal);
  const anchorRef = cloneJson(body.anchor_ref);

  validateAnchorRef(anchorKind, anchorRef);

  if (anchorKind === 'concept') {
    if (mode !== 'learn_concept') {
      throw createLearningError('unsupported_mode_for_anchor');
    }
    if (currentQuestionId !== null) {
      throw createLearningError('invalid_payload', {
        message: 'concept anchors cannot declare current_question_id on create.',
        details: { field: 'current_question_id' },
      });
    }
  }

  if (anchorKind === 'question') {
    if (!['guided_solve', 'timed_practice', 'post_mortem_review'].includes(mode)) {
      throw createLearningError('unsupported_mode_for_anchor');
    }
    if (currentQuestionId !== anchorRef.question_id) {
      throw createLearningError('invalid_payload', {
        message: 'question anchors require current_question_id to match the anchor.',
        details: { field: 'current_question_id' },
      });
    }
  }

  if (anchorKind === 'review_task' && mode !== 'spaced_review') {
    throw createLearningError('unsupported_mode_for_anchor');
  }

  if (anchorKind === 'artifact' &&
      !['learn_concept', 'spaced_review', 'post_mortem_review'].includes(mode)) {
    throw createLearningError('unsupported_mode_for_anchor');
  }

  if (anchorKind === 'workspace_slot') {
    if (!['learn_concept', 'spaced_review'].includes(mode)) {
      throw createLearningError('unsupported_mode_for_anchor');
    }
    if (mode === 'spaced_review' && anchorRef.slot_key !== 'review_queue') {
      throw createLearningError('unsupported_mode_for_anchor');
    }
  }

  return {
    subjectCode,
    mode,
    sessionGoal,
    anchorKind,
    anchorRef,
    currentQuestionId,
    currentQuestionTypeId,
  };
}

function idempotencyKeyForCreateSession(userId, requestPath, headerValue) {
  const key = normalizeNullableString(headerValue);
  if (!key) return null;
  return `${userId}:${requestPath}:${key}`;
}

function normalizedIdempotencyPayload(payload) {
  return JSON.stringify(canonicalizeJson(payload));
}

async function maybeReplayCreateSession(client, userId, cacheKey, normalizedPayload) {
  if (!cacheKey) return null;
  while (true) {
    const cached = IDEMPOTENT_CREATE_SESSIONS.get(cacheKey);
    if (!cached) return null;

    if (cached.normalizedPayload !== normalizedPayload) {
      throw createLearningError('idempotency_conflict');
    }

    if (cached.state === 'pending') {
      try {
        const response = await cached.deferred.promise;
        return cloneJson(response);
      } catch (error) {
        const current = IDEMPOTENT_CREATE_SESSIONS.get(cacheKey);
        if (current === cached) {
          IDEMPOTENT_CREATE_SESSIONS.delete(cacheKey);
        }
        throw error;
      }
    }

    const cachedSessionId = cached.response?.session?.session_id ?? null;
    if (cachedSessionId) {
      const session = await getSession(client, {
        sessionId: cachedSessionId,
        userId,
      });
      if (session) {
        return cloneJson(cached.response);
      }
    }

    if (IDEMPOTENT_CREATE_SESSIONS.get(cacheKey) === cached) {
      IDEMPOTENT_CREATE_SESSIONS.delete(cacheKey);
    }
  }
}

function reserveCreateSession(cacheKey, normalizedPayload) {
  if (!cacheKey) return null;
  const reservation = {
    normalizedPayload,
    state: 'pending',
    response: null,
    deferred: createDeferred(),
  };
  IDEMPOTENT_CREATE_SESSIONS.set(cacheKey, reservation);
  return reservation;
}

function rememberCreateSession(cacheKey, reservation, response) {
  if (!cacheKey || !reservation) return;
  const clonedResponse = cloneJson(response);
  reservation.state = 'fulfilled';
  reservation.response = clonedResponse;
  reservation.deferred.resolve(clonedResponse);
}

function releaseCreateSessionReservation(cacheKey, reservation, error) {
  if (!cacheKey || !reservation) return;
  if (IDEMPOTENT_CREATE_SESSIONS.get(cacheKey) === reservation) {
    IDEMPOTENT_CREATE_SESSIONS.delete(cacheKey);
  }
  reservation.deferred.reject(error);
}

export function sendLearningError(req, res, code, overrides = {}) {
  const spec = LEARNING_ERROR_SPECS[code] || LEARNING_ERROR_SPECS.internal_error;
  const status = overrides.status || spec.status;
  const message = overrides.message || spec.message;
  const details = overrides.details || {};
  return res.status(status).json({
    error: {
      code,
      message,
      retryable: false,
      details,
    },
    request_id: req?.request_id || null,
  });
}

export function sendLearningReservedResponse(req, res, {
  status = 202,
  payload = {},
} = {}) {
  return res.status(status).json({
    request_id: req?.request_id || null,
    reserved: true,
    feature_flags: featureFlags(),
    ...payload,
  });
}

export async function createLearningSession(client, {
  userId,
  requestPath = '/api/learning/sessions',
  body,
  idempotencyKey = null,
} = {}) {
  const normalized = validateCreateSessionPayload(body);
  const cacheKey = idempotencyKeyForCreateSession(userId, requestPath, idempotencyKey);
  const normalizedPayload = normalizedIdempotencyPayload(normalized);
  const replay = await maybeReplayCreateSession(
    client,
    userId,
    cacheKey,
    normalizedPayload,
  );
  if (replay) {
    return replay;
  }

  const reservation = reserveCreateSession(cacheKey, normalizedPayload);

  try {
    const resolvedAnchor = await resolveCreateSessionAnchor(client, {
      userId,
      subjectCode: normalized.subjectCode,
      anchorKind: normalized.anchorKind,
      anchorRef: normalized.anchorRef,
      currentQuestionId: normalized.currentQuestionId,
      currentQuestionTypeId: normalized.currentQuestionTypeId,
    });

    const activeScopeBundle = normalizeSessionBundle({
      sessionGoal: normalized.sessionGoal,
      mode: normalized.mode,
      anchorKind: normalized.anchorKind,
      anchorRef: normalized.anchorRef,
      currentQuestionId: resolvedAnchor.currentQuestionId,
      currentQuestionTypeId: resolvedAnchor.currentQuestionTypeId,
      canonicalHome: resolvedAnchor.canonicalHome,
    });

    const session = await insertSession(client, {
      user_id: userId,
      subject_code: normalized.subjectCode,
      session_goal: normalized.sessionGoal,
      mode: normalized.mode,
      active_scope_bundle: activeScopeBundle,
      current_anchor_kind: normalized.anchorKind,
      current_anchor_ref: normalized.anchorRef,
      current_question_id: resolvedAnchor.currentQuestionId,
      current_question_type_id: resolvedAnchor.currentQuestionTypeId,
      summary_state: {
        handoff: createSessionHandoffStub(),
      },
      open_questions: [],
      key_artifact_refs: [],
      misconceptions_in_focus: [],
    });

    const normalizedSession = normalizeSessionResponse(session);
    const response = {
      session: normalizedSession,
      anchor_validity: buildAnchorValidity(
        normalized.anchorKind,
        normalized.anchorRef,
        resolvedAnchor.canonicalHome,
      ),
      canonical_home_context: buildCanonicalHomeContext(
        normalized.anchorKind,
        resolvedAnchor.canonicalHome,
      ),
      feature_flags: featureFlags(),
    };

    rememberCreateSession(cacheKey, reservation, response);
    return response;
  } catch (error) {
    releaseCreateSessionReservation(cacheKey, reservation, error);
    throw error;
  }
}

export async function readLearningSession(client, { userId, sessionId } = {}) {
  const normalizedSessionId = normalizeNullableString(sessionId);
  if (!normalizedSessionId) {
    throw createLearningError('invalid_payload', {
      message: 'sessionId is required.',
      details: { field: 'sessionId' },
    });
  }

  const session = await getSession(client, {
    sessionId: normalizedSessionId,
    userId,
  });

  if (!session) {
    throw createLearningError('session_not_found');
  }

  const normalizedSession = normalizeSessionResponse(session);
  const bundle = normalizedSession.active_scope_bundle;

  return {
    session: normalizedSession,
    anchor_validity: buildAnchorValidity(
      normalizedSession.current_anchor_kind,
      normalizedSession.current_anchor_ref,
      {
        topic_id: bundle.primary_topic_id,
        topic_path: bundle.primary_topic_path,
      },
    ),
    canonical_home_context: buildCanonicalHomeContext(
      normalizedSession.current_anchor_kind,
      {
        topic_id: bundle.primary_topic_id,
        topic_path: bundle.primary_topic_path,
      },
    ),
    feature_flags: featureFlags(),
  };
}
