import { randomUUID } from 'node:crypto';
import {
  deleteLearningRequestIdempotencyReservation,
  finalizeLearningRequestIdempotency,
  getLearningRequestIdempotency,
  reserveLearningRequestIdempotency,
  setLearningRequestIdempotencyResourceRef,
} from '../repositories/request-idempotency-repository.js';
import { insertSession, getSession } from '../repositories/session-repository.js';
import { buildSubjectRuntimePostureOrNull } from '../subjects/subject-adapter-registry.js';
import { resolveCreateSessionAnchor } from './session-anchor-resolution.js';
import {
  buildChildSessionLineage,
  buildSessionResumeGuidance,
  createSessionHandoff,
  normalizeSessionHandoffKind,
} from './session-handoff.js';

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

const IDEMPOTENCY_POLL_ATTEMPTS = 10;
const IDEMPOTENCY_POLL_INTERVAL_MS = 250;
const IDEMPOTENCY_ABANDONED_AGE_MS = 5 * 60 * 1000;

function normalizeString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeNullableString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function isUuidString(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalizeString(value),
  );
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

function makeArtifactRef(artifactId) {
  return artifactId ? { kind: 'artifact', artifact_id: artifactId } : null;
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
  const normalized = {
    ...session,
    active_scope_bundle: normalizeStoredBundle(session),
  };

  return {
    ...normalized,
    handoff: createSessionHandoff(normalized),
    resume_guidance: buildSessionResumeGuidance(normalized),
  };
}

async function loadArtifactForPostMortem(client, artifactId) {
  const { data, error } = await client
    .from('learning_artifacts')
    .select('*')
    .eq('artifact_id', artifactId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load post-mortem artifact: ${error.message}`);
  }

  return data ?? null;
}

async function listUserReviewTaskProjections(client, userId) {
  const { data, error } = await client
    .from('learning_review_queue_projection')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to load post-mortem review-task projection: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

function uniqueStrings(values = []) {
  return [...new Set(normalizeArray(values).map((value) => normalizeNullableString(value)).filter(Boolean))];
}

function buildPostMortemScoringPosture(reviewTasks = []) {
  const conservativeTask = reviewTasks.find((task) =>
    task?.trigger_type === 'non_released_fallback'
    || task?.success_criteria?.authoritative_scoring_allowed === false);

  if (!conservativeTask) {
    return null;
  }

  return {
    release_scope_status: 'non_released_fallback',
    authoritative_scoring_allowed: false,
    fallback_reason_code:
      normalizeNullableString(
        conservativeTask?.success_criteria?.scheduler_policy?.fallback_reason_code,
      )
      ?? normalizeNullableString(conservativeTask?.success_criteria?.fallback_reason_code)
      ?? normalizeNullableString(conservativeTask.trigger_type)
      ?? 'non_released_fallback',
  };
}

function selectPostMortemReviewTasks(reviewTasks = [], {
  topicId = null,
  questionTypeId = null,
  currentQuestionId = null,
} = {}) {
  const normalizedTasks = normalizeArray(reviewTasks);
  const sourceQuestionMatches = currentQuestionId
    ? normalizedTasks.filter((task) => task?.source_question_id === currentQuestionId)
    : [];
  const candidateTasks = sourceQuestionMatches.length > 0 ? sourceQuestionMatches : normalizedTasks;

  return candidateTasks.filter((task) => {
    if (currentQuestionId && task?.source_question_id === currentQuestionId) {
      return true;
    }

    if (topicId && task?.target_topic_id !== topicId) {
      return false;
    }

    if (questionTypeId && task?.target_question_type_id && task.target_question_type_id !== questionTypeId) {
      return false;
    }

    return Boolean(topicId);
  });
}

function pickPreferredRepairTask(reviewTasks = []) {
  return reviewTasks.find((task) => ['open', 'partial'].includes(task?.status))
    || reviewTasks[0]
    || null;
}

function buildPostMortemDiagnosticSummary({ misconceptionTags = [], partResults = [] } = {}) {
  if (misconceptionTags.length > 0) {
    return `Focus on ${misconceptionTags.join(', ')} before starting the repair step.`;
  }

  if (partResults.length > 0) {
    return 'Use the scored part breakdown before moving into the repair step.';
  }

  return 'Use the saved scored attempt and misconception evidence before starting repair.';
}

function buildPostMortemArtifactCandidate(artifact = {}) {
  return {
    artifact_id: artifact.artifact_id,
    artifact_kind: artifact.artifact_kind,
    canonical_home_topic_id: artifact.canonical_home_topic_id,
    target_question_type_id: artifact.target_question_type_id ?? null,
    trust_status: artifact.trust_status ?? null,
    placement_status: artifact.placement_status ?? null,
    lifecycle_status: artifact.lifecycle_status ?? null,
    slot_key: artifact.slot_key ?? null,
  };
}

function buildRepairHandoff({
  currentQuestionId,
  currentQuestionTypeId,
  preferredReviewTask,
  topicId,
  topicPath,
} = {}) {
  if (preferredReviewTask?.review_task_id) {
    return {
      title: 'Start the repair session',
      message: 'Use the projected review task to retry the misconception inside canonical runtime flows.',
      action_label: 'Launch repair session',
      launch_payload: {
        anchor_kind: 'review_task',
        review_task_id: preferredReviewTask.review_task_id,
        mode: 'spaced_review',
        topic_id: preferredReviewTask.target_topic_id ?? topicId ?? null,
        topic_path: preferredReviewTask.target_topic_path ?? topicPath ?? null,
        current_question_type_id:
          preferredReviewTask.target_question_type_id ?? currentQuestionTypeId ?? null,
      },
    };
  }

  if (currentQuestionId) {
    return {
      title: 'Retry the source question',
      message: 'Return to the source question in guided solve once the misconception focus is clear.',
      action_label: 'Launch guided solve',
      launch_payload: {
        anchor_kind: 'question',
        question_id: currentQuestionId,
        mode: 'guided_solve',
        topic_id: topicId ?? null,
        topic_path: topicPath ?? null,
        current_question_id: currentQuestionId,
        current_question_type_id: currentQuestionTypeId ?? null,
      },
    };
  }

  return null;
}

async function enrichPostMortemSession(client, {
  userId,
  session,
} = {}) {
  if (session?.mode !== 'post_mortem_review') {
    return session;
  }

  const bundle = normalizeStoredBundle(session);
  const anchorKind = bundle.current_anchor_kind ?? session?.current_anchor_kind ?? null;
  if (anchorKind !== 'artifact') {
    return session;
  }

  const artifactId = normalizeNullableString(
    bundle.current_anchor_ref?.artifact_id
    ?? bundle.current_anchor_ref?.artifactId
    ?? session?.current_anchor_ref?.artifact_id
    ?? session?.current_anchor_ref?.artifactId,
  );
  if (!artifactId) {
    return session;
  }

  const artifact = await loadArtifactForPostMortem(client, artifactId);
  if (!artifact) {
    return session;
  }

  const topicId = artifact.canonical_home_topic_id ?? bundle.primary_topic_id ?? null;
  const topicPath = bundle.primary_topic_path ?? null;
  const currentQuestionId = normalizeNullableString(session?.current_question_id);
  const currentQuestionTypeId =
    normalizeNullableString(artifact.target_question_type_id)
    ?? normalizeNullableString(session?.current_question_type_id)
    ?? null;
  const reviewTasks = selectPostMortemReviewTasks(
    await listUserReviewTaskProjections(client, userId),
    {
      topicId,
      questionTypeId: currentQuestionTypeId,
      currentQuestionId,
    },
  );
  const preferredReviewTask = pickPreferredRepairTask(reviewTasks);
  const misconceptionTags = uniqueStrings([
    ...normalizeArray(artifact.misconception_tags),
    ...reviewTasks.flatMap((task) => normalizeArray(task?.target_misconception_tags)),
  ]);
  const partResults = normalizeArray(preferredReviewTask?.success_criteria?.part_results).map((part) => ({
    part_id: part?.part_id ?? null,
    subpart_id: part?.subpart_id ?? null,
    score_awarded: Number(part?.score_awarded ?? 0),
    score_max: Number(part?.score_max ?? 0),
  }));
  const scoringPosture = buildPostMortemScoringPosture(reviewTasks);
  const repairHandoff = buildRepairHandoff({
    currentQuestionId,
    currentQuestionTypeId,
    preferredReviewTask,
    topicId,
    topicPath,
  });
  const summaryState = {
    ...(isPlainObject(session?.summary_state) ? cloneJson(session.summary_state) : {}),
    post_mortem_review: {
      scoring_posture: scoringPosture,
      misconception_tags: misconceptionTags,
      diagnostic_focus: {
        title: 'Misconception-focused diagnostic',
        summary: buildPostMortemDiagnosticSummary({
          misconceptionTags,
          partResults,
        }),
        source_question_id: currentQuestionId,
        source_attempt_ref: artifact.source_attempt_id
          ? { kind: 'attempt', attempt_id: artifact.source_attempt_id }
          : null,
        source_mark_run_ref: artifact.source_mark_run_id
          ? { kind: 'mark_run', mark_run_id: artifact.source_mark_run_id }
          : null,
        part_results: partResults,
      },
      artifact_candidates: [buildPostMortemArtifactCandidate(artifact)],
      repair_handoff: repairHandoff,
    },
  };

  if (repairHandoff?.launch_payload && !summaryState.suggested_handoff_kind) {
    summaryState.suggested_handoff_kind = 'explicit_new_session';
    summaryState.suggested_handoff_reason_code = 'post_mortem_repair_ready';
    summaryState.suggested_handoff_message = repairHandoff.message;
    summaryState.recommended_mode = repairHandoff.launch_payload.mode;
    summaryState.recommended_anchor_kind = repairHandoff.launch_payload.anchor_kind;
    summaryState.recommended_anchor_ref = repairHandoff.launch_payload.anchor_kind === 'review_task'
      ? {
        kind: 'review_task',
        review_task_id: repairHandoff.launch_payload.review_task_id,
      }
      : {
        kind: 'question',
        question_id: repairHandoff.launch_payload.question_id,
      };
  }

  return {
    ...session,
    summary_state: summaryState,
    key_artifact_refs: [makeArtifactRef(artifact.artifact_id)].filter(Boolean),
    misconceptions_in_focus: misconceptionTags,
  };
}

async function enrichSessionForResponse(client, {
  userId,
  session,
} = {}) {
  return enrichPostMortemSession(client, {
    userId,
    session,
  });
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
  const parentSessionId = normalizeNullableString(body.parent_session_id);
  let handoffKind = normalizeSessionHandoffKind(body.handoff_kind);
  const anchorRef = cloneJson(body.anchor_ref);

  if (normalizeString(body.handoff_kind) && !handoffKind) {
    throw createLearningError('invalid_payload', {
      message: 'handoff_kind is invalid.',
      details: { field: 'handoff_kind' },
    });
  }

  if (handoffKind && !parentSessionId) {
    throw createLearningError('invalid_payload', {
      message: 'handoff_kind requires parent_session_id.',
      details: { field: 'handoff_kind' },
    });
  }

  if (parentSessionId && !isUuidString(parentSessionId)) {
    throw createLearningError('invalid_payload', {
      message: 'parent_session_id must be a UUID.',
      details: { field: 'parent_session_id' },
    });
  }

  if (parentSessionId && !handoffKind) {
    handoffKind = 'explicit_new_session';
  }

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
    parentSessionId,
    handoffKind,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildLearningSessionResponse(session, {
  anchorKind = session?.current_anchor_kind ?? null,
  anchorRef = session?.current_anchor_ref ?? null,
  canonicalHome = null,
} = {}) {
  const normalizedSession = normalizeSessionResponse(session);
  const bundle = normalizedSession.active_scope_bundle;
  const subjectCode = normalizeNullableString(normalizedSession.subject_code);
  const resolvedCanonicalHome = canonicalHome || {
    topic_id: bundle.primary_topic_id,
    topic_path: bundle.primary_topic_path,
  };

  return {
    session: normalizedSession,
    runtime_posture: buildSubjectRuntimePostureOrNull(subjectCode),
    anchor_validity: buildAnchorValidity(
      anchorKind,
      anchorRef,
      resolvedCanonicalHome,
    ),
    canonical_home_context: buildCanonicalHomeContext(
      anchorKind,
      resolvedCanonicalHome,
    ),
    feature_flags: featureFlags(),
  };
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

async function maybeRecoverCreateSessionResponse(client, {
  userId,
  row,
} = {}) {
  const sessionId = row?.resource_ref?.kind === 'learning_session'
    ? normalizeNullableString(row.resource_ref.session_id)
    : null;

  if (!sessionId) {
    return null;
  }

  const session = await getSession(client, {
    sessionId,
    userId,
  });

  if (!session) {
    return null;
  }

  return buildLearningSessionResponse(
    await enrichSessionForResponse(client, {
      userId,
      session,
    }),
  );
}

async function resolveCreateSessionReplay(client, {
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

    const recovered = await maybeRecoverCreateSessionResponse(client, {
      userId,
      row: current,
    });

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

  const recovered = await maybeRecoverCreateSessionResponse(client, {
    userId,
    row: latest,
  });
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

  throw createLearningError('internal_error', {
    message: 'Learning session request is still pending.',
  });
}

async function performCreateLearningSession(client, {
  userId,
  normalized,
  sessionId = null,
} = {}) {
  const parentSession = normalized.parentSessionId
    ? await getSession(client, {
      sessionId: normalized.parentSessionId,
      userId,
    })
    : null;

  if (normalized.parentSessionId && !parentSession) {
    throw createLearningError('session_not_found');
  }

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
  const lineage = buildChildSessionLineage({
    parentSession,
    parentSessionId: normalized.parentSessionId,
    handoffKind: normalized.handoffKind,
  });

  const session = await insertSession(client, {
    session_id: sessionId,
    user_id: userId,
    subject_code: normalized.subjectCode,
    session_goal: normalized.sessionGoal,
    mode: normalized.mode,
    active_scope_bundle: activeScopeBundle,
    current_anchor_kind: normalized.anchorKind,
    current_anchor_ref: normalized.anchorRef,
    current_question_id: resolvedAnchor.currentQuestionId,
    current_question_type_id: resolvedAnchor.currentQuestionTypeId,
    summary_state: {},
    parent_session_id: lineage.parent_session_id,
    handoff_kind: lineage.handoff_kind,
    lineage_summary_snapshot: lineage.lineage_summary_snapshot,
    open_questions: [],
    key_artifact_refs: [],
    misconceptions_in_focus: [],
  });

  return buildLearningSessionResponse(await enrichSessionForResponse(client, {
    userId,
    session,
  }), {
    anchorKind: normalized.anchorKind,
    anchorRef: normalized.anchorRef,
    canonicalHome: resolvedAnchor.canonicalHome,
  });
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
  const normalizedIdempotencyKey = normalizeNullableString(idempotencyKey);

  if (!normalizedIdempotencyKey) {
    return performCreateLearningSession(client, {
      userId,
      normalized,
    });
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const reservation = await reserveLearningRequestIdempotency(client, {
      userId,
      requestPath,
      idempotencyKey: normalizedIdempotencyKey,
      requestKind: 'create_learning_session',
      requestPayload: normalized,
    });

    if (reservation.state === 'conflict') {
      throw createLearningError('idempotency_conflict');
    }

    if (reservation.state === 'replay') {
      const replay = await resolveCreateSessionReplay(client, {
        userId,
        requestPath,
        idempotencyKey: normalizedIdempotencyKey,
        row: reservation.row,
      });

      if (replay) {
        return replay;
      }

      continue;
    }

    const sessionId = randomUUID();

    await setLearningRequestIdempotencyResourceRef(client, {
      userId,
      requestPath,
      idempotencyKey: normalizedIdempotencyKey,
      resourceRef: {
        kind: 'learning_session',
        session_id: sessionId,
      },
    });

    const response = await performCreateLearningSession(client, {
      userId,
      normalized,
      sessionId,
    });

    await finalizeLearningRequestIdempotency(client, {
      userId,
      requestPath,
      idempotencyKey: normalizedIdempotencyKey,
      responsePayload: response,
    });

    return response;
  }

  throw createLearningError('internal_error', {
    message: 'Unable to reacquire abandoned learning session reservation.',
  });
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

  return buildLearningSessionResponse(await enrichSessionForResponse(client, {
    userId,
    session,
  }));
}
