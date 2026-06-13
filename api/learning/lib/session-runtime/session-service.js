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
import { buildSessionContextHealth } from './context-health.js';
import {
  buildChildSessionLineage,
  buildSessionResumeGuidance,
  createSessionHandoff,
  normalizeSessionHandoffKind,
} from './session-handoff.js';
import { getLearningErrorDefinition } from '../contracts/error-contract.js';
import {
  sendLearningError as sendCanonicalLearningError,
} from '../http/learning-http.js';
import { validateCreateSessionInput } from '../validators/session-validator.js';
import { resolvePaperWorkspaceEntryAnchor } from '../workspaces/paper-workspace-entry-resolver.js';

// Enum validation and error definitions are now delegated to canonical modules:
// - session-validator.js (anchor legality matrix)
// - error-contract.js (error code definitions)
// - learning-http.js (error response envelope)

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

function isStrictProductionRuntime(env = process.env) {
  return env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production';
}

function readRuntimeFlag(flagName, {
  env = process.env,
  defaultEnabled = true,
} = {}) {
  if (!isStrictProductionRuntime(env)) {
    return defaultEnabled;
  }

  return env[flagName] === 'true';
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
  const definition = getLearningErrorDefinition(code);
  const error = new Error(message || definition.message);
  error.code = code;
  error.status = status || definition.status;
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

function normalizeCreatePaperContext(body = {}) {
  if (
    typeof body.paper_context !== 'undefined'
    && body.paper_context !== null
    && !isPlainObject(body.paper_context)
  ) {
    throw createLearningError('invalid_payload', {
      message: 'paper_context must be an object when provided.',
      details: { field: 'paper_context' },
    });
  }

  const topLevelPaperScope = normalizeNullableString(body.paper_scope ?? body.paperScope);
  const hasExplicitPaperContext =
    isPlainObject(body.paper_context)
    || topLevelPaperScope !== null;

  if (!hasExplicitPaperContext) {
    return null;
  }

  const paperContext = isPlainObject(body.paper_context) ? cloneJson(body.paper_context) : {};
  const nestedPaperScope = normalizeNullableString(
    paperContext.paper_scope ?? paperContext.paperScope,
  );

  if (topLevelPaperScope || nestedPaperScope) {
    paperContext.paper_scope = topLevelPaperScope ?? nestedPaperScope;
  }

  return paperContext;
}

function featureFlags(env = process.env) {
  const learningRuntimeEnabled = readRuntimeFlag('LEARNING_RUNTIME_ENABLED', {
    env,
    defaultEnabled: true,
  });
  const learningRuntime9709Enabled = learningRuntimeEnabled && readRuntimeFlag(
    'LEARNING_RUNTIME_9709_ENABLED',
    {
      env,
      defaultEnabled: true,
    },
  );

  return {
    learning_runtime_enabled: learningRuntimeEnabled,
    learning_runtime_9709_enabled: learningRuntime9709Enabled,
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
  const contextHealth = buildSessionContextHealth(normalized);

  return {
    ...normalized,
    ...contextHealth,
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

function validateCreateSessionPayload(body = {}) {
  if (!isPlainObject(body)) {
    throw createLearningError('invalid_payload', {
      message: 'Request body must be an object.',
    });
  }

  const subjectCode = assertRequiredString(body.subject_code, 'subject_code');

  // Delegate core anchor/mode/ref validation to the canonical session-validator.
  let coreResult;
  try {
    coreResult = validateCreateSessionInput(body);
  } catch (validationError) {
    throw createLearningError(validationError.code || 'invalid_payload', {
      status: validationError.status,
      message: validationError.publicMessage || validationError.message,
      details: validationError.details,
    });
  }

  const { normalized } = coreResult;

  // Parent session / handoff handling (session-service-specific scope).
  const parentSessionId = normalizeNullableString(body.parent_session_id);
  let handoffKind = normalizeSessionHandoffKind(body.handoff_kind);

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

  const paperContext = normalizeCreatePaperContext(body);

  return {
    subjectCode,
    mode: normalized.mode,
    sessionGoal: normalized.session_goal,
    anchorKind: normalized.anchor_kind,
    anchorRef: normalized.anchor_ref,
    currentQuestionId: normalized.current_question_id,
    currentQuestionTypeId: normalized.current_question_type_id,
    parentSessionId,
    handoffKind,
    ...(paperContext ? { paperContext } : {}),
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

function readPaperResolverReason(result = {}) {
  return normalizeNullableString(result?.error?.details?.reason_code)
    ?? normalizeNullableString(result?.active_scope_compatibility?.reason_code)
    ?? normalizeNullableString(result?.linked_reference_posture?.reason_code)
    ?? normalizeNullableString(result?.error?.code)
    ?? 'paper_context_unresolved';
}

function mapPaperResolverErrorCode(resolverErrorCode) {
  if (resolverErrorCode === 'invalid_paper_scope') {
    return {
      code: 'invalid_payload',
      status: 400,
    };
  }

  if (resolverErrorCode === 'anchor_target_not_found') {
    return {
      code: 'anchor_target_not_found',
      status: 404,
    };
  }

  if (resolverErrorCode === 'auth_forbidden') {
    return {
      code: 'auth_forbidden',
      status: 403,
    };
  }

  return {
    code: 'session_state_conflict',
    status: 409,
  };
}

function throwPaperContextResolutionError(result = {}) {
  const resolverErrorCode = normalizeNullableString(result?.error?.code);
  const mapped = mapPaperResolverErrorCode(resolverErrorCode);

  throw createLearningError(mapped.code, {
    status: mapped.status,
    message: result?.error?.message || 'Paper workspace context could not be resolved.',
    details: {
      field: 'paper_context',
      resolver_error_code: resolverErrorCode,
      reason_code: readPaperResolverReason(result),
      resolution_status: result?.resolution_status ?? null,
      active_scope_compatibility: result?.active_scope_compatibility ?? null,
    },
  });
}

function assertPaperContextMatchesCanonicalHome(paperBundle = {}, canonicalHome = {}) {
  const bundleTopicId = normalizeNullableString(paperBundle.primary_topic_id);
  const bundleTopicPath = normalizeNullableString(paperBundle.primary_topic_path);
  const canonicalTopicId = normalizeNullableString(canonicalHome?.topic_id);
  const canonicalTopicPath = normalizeNullableString(canonicalHome?.topic_path);

  if (bundleTopicId && canonicalTopicId && bundleTopicId !== canonicalTopicId) {
    throw createLearningError('session_state_conflict', {
      status: 409,
      message: 'Paper workspace context resolved a different canonical topic.',
      details: {
        field: 'paper_context',
        reason_code: 'paper_context_topic_mismatch',
        primary_topic_id: bundleTopicId,
        canonical_topic_id: canonicalTopicId,
      },
    });
  }

  if (bundleTopicPath && canonicalTopicPath && bundleTopicPath !== canonicalTopicPath) {
    throw createLearningError('session_state_conflict', {
      status: 409,
      message: 'Paper workspace context resolved a different canonical topic path.',
      details: {
        field: 'paper_context',
        reason_code: 'paper_context_topic_path_mismatch',
        primary_topic_path: bundleTopicPath,
        canonical_topic_path: canonicalTopicPath,
      },
    });
  }
}

async function resolveSessionPaperContext(client, {
  userId,
  normalized,
  resolvedAnchor,
} = {}) {
  if (!isPlainObject(normalized?.paperContext)) {
    return null;
  }

  const result = await resolvePaperWorkspaceEntryAnchor(client, {
    userId,
    subjectCode: normalized.subjectCode,
    subject_code: normalized.subjectCode,
    mode: normalized.mode,
    sessionGoal: normalized.sessionGoal,
    session_goal: normalized.sessionGoal,
    anchorKind: normalized.anchorKind,
    anchorRef: normalized.anchorRef,
    paper_context: normalized.paperContext,
    paper_scope: normalized.paperContext.paper_scope ?? null,
  });

  if (
    !result?.ok
    || result?.active_scope_compatibility?.status !== 'compatible'
    || !isPlainObject(result?.active_scope_bundle)
  ) {
    throwPaperContextResolutionError(result);
  }

  assertPaperContextMatchesCanonicalHome(
    result.active_scope_bundle,
    resolvedAnchor?.canonicalHome,
  );

  return result;
}

function mergePaperContextIntoActiveScopeBundle({
  baseBundle,
  paperResolution,
  normalized,
  resolvedAnchor,
} = {}) {
  const paperBundle = isPlainObject(paperResolution?.active_scope_bundle)
    ? paperResolution.active_scope_bundle
    : null;

  if (!paperBundle) {
    return baseBundle;
  }

  return {
    ...baseBundle,
    primary_topic_id: paperBundle.primary_topic_id ?? baseBundle.primary_topic_id,
    primary_topic_path: paperBundle.primary_topic_path ?? baseBundle.primary_topic_path,
    secondary_topics_in_scope: Array.isArray(paperBundle.secondary_topics_in_scope)
      ? paperBundle.secondary_topics_in_scope
      : baseBundle.secondary_topics_in_scope,
    allowed_prerequisites: Array.isArray(paperBundle.allowed_prerequisites)
      ? paperBundle.allowed_prerequisites
      : baseBundle.allowed_prerequisites,
    paper_context: isPlainObject(paperBundle.paper_context)
      ? paperBundle.paper_context
      : baseBundle.paper_context,
    mode: normalized.mode,
    session_goal: normalized.sessionGoal ?? null,
    current_anchor_kind: normalized.anchorKind,
    current_anchor_ref: normalized.anchorRef,
    current_question_ref: makeQuestionRef(resolvedAnchor.currentQuestionId),
    current_question_type_ref: makeQuestionTypeRef(resolvedAnchor.currentQuestionTypeId),
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
  const resolvedAnchorRef = resolvedAnchor.anchorRef ?? normalized.anchorRef;

  const activeScopeBundle = normalizeSessionBundle({
    sessionGoal: normalized.sessionGoal,
    mode: normalized.mode,
    anchorKind: normalized.anchorKind,
    anchorRef: resolvedAnchorRef,
    currentQuestionId: resolvedAnchor.currentQuestionId,
    currentQuestionTypeId: resolvedAnchor.currentQuestionTypeId,
    canonicalHome: resolvedAnchor.canonicalHome,
  });
  const resolvedNormalized = {
    ...normalized,
    anchorRef: resolvedAnchorRef,
  };
  const paperResolution = await resolveSessionPaperContext(client, {
    userId,
    normalized: resolvedNormalized,
    resolvedAnchor,
  });
  const resolvedActiveScopeBundle = mergePaperContextIntoActiveScopeBundle({
    baseBundle: activeScopeBundle,
    paperResolution,
    normalized: resolvedNormalized,
    resolvedAnchor,
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
    active_scope_bundle: resolvedActiveScopeBundle,
    current_anchor_kind: normalized.anchorKind,
    current_anchor_ref: resolvedAnchorRef,
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
    anchorRef: resolvedAnchorRef,
    canonicalHome: resolvedAnchor.canonicalHome,
  });
}

export function sendLearningError(req, res, code, overrides = {}) {
  return sendCanonicalLearningError(res, req?.request_id || null, code, {
    status: overrides.status,
    message: overrides.message,
    retryable: overrides.retryable,
    details: overrides.details,
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

  if (!isUuidString(normalizedSessionId)) {
    throw createLearningError('session_not_found');
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
