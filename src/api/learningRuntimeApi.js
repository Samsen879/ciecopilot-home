import { requireSessionAccessToken } from '../services/utils/sessionAccessToken.js';
import { supabase } from '../utils/supabase.js';

const LEARNING_RUNTIME_API_BASE = '/api/learning';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function camelizeKey(key) {
  return String(key).replace(/_([a-z0-9])/gi, (_, letter) => letter.toUpperCase());
}

function camelizeKeys(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => camelizeKeys(entry));
  }

  if (!isPlainObject(value)) {
    return value ?? null;
  }

  return Object.entries(value).reduce((acc, [key, entry]) => {
    acc[camelizeKey(key)] = camelizeKeys(entry);
    return acc;
  }, {});
}

function buildQuestionRef(questionId) {
  return questionId ? { kind: 'question', questionId } : null;
}

function buildQuestionTypeRef(questionTypeId) {
  return questionTypeId ? { kind: 'question_type', questionTypeId } : null;
}

function normalizeSessionRecord(session = {}) {
  const activeScopeBundle = isPlainObject(session.activeScopeBundle)
    ? session.activeScopeBundle
    : {};
  const lineage = isPlainObject(session.lineage)
    ? session.lineage
    : {
      parentSessionId: session?.lineageRef?.parentSessionId ?? null,
      handoffKind: session?.lineageRef?.handoffKind ?? null,
      summarySnapshot: null,
    };
  const activeScope = {
    ...activeScopeBundle,
    currentAnchorKind: activeScopeBundle.currentAnchorKind ?? session.currentAnchorKind ?? null,
    currentAnchor: activeScopeBundle.currentAnchorRef ?? session.currentAnchorRef ?? null,
    currentQuestion:
      activeScopeBundle.currentQuestionRef ?? buildQuestionRef(session.currentQuestionId ?? null),
    currentQuestionType:
      activeScopeBundle.currentQuestionTypeRef
      ?? buildQuestionTypeRef(session.currentQuestionTypeId ?? null),
  };

  return {
    ...session,
    lineage,
    handoff: isPlainObject(session.handoff)
      ? session.handoff
      : isPlainObject(session?.summaryState?.handoff)
        ? session.summaryState.handoff
        : null,
    resumeGuidance: isPlainObject(session.resumeGuidance)
      ? session.resumeGuidance
      : isPlainObject(session?.summaryState?.resumeGuidance)
        ? session.summaryState.resumeGuidance
        : null,
    currentAnchor: session.currentAnchorRef ?? activeScope.currentAnchor,
    currentQuestion: activeScope.currentQuestion,
    currentQuestionType: activeScope.currentQuestionType,
    activeScope,
  };
}

function normalizeRequestPayload(payload) {
  return typeof payload === 'undefined' ? null : payload;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function createLearningRuntimeError(response, payload) {
  const error = new Error(
    payload?.error?.message
      || payload?.message
      || `HTTP ${response.status}: ${response.statusText || 'Request failed'}`,
  );
  error.name = 'LearningRuntimeApiError';
  error.status = response.status;
  error.code = payload?.error?.code ?? 'http_error';
  error.retryable = payload?.error?.retryable ?? false;
  error.details = payload?.error?.details ?? {};
  error.requestId = payload?.request_id ?? null;
  return error;
}

async function learningRequest(path, {
  method = 'GET',
  body,
  headers = {},
  idempotencyKey = null,
} = {}) {
  const accessToken = await requireSessionAccessToken(supabase);
  const requestHeaders = {
    Authorization: `Bearer ${accessToken}`,
    ...headers,
  };

  const hasBody = typeof body !== 'undefined';
  if (hasBody) {
    requestHeaders['Content-Type'] = 'application/json';
  }
  if (idempotencyKey) {
    requestHeaders['Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(`${LEARNING_RUNTIME_API_BASE}${path}`, {
    method,
    headers: requestHeaders,
    body: hasBody ? JSON.stringify(normalizeRequestPayload(body)) : undefined,
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw createLearningRuntimeError(response, payload);
  }

  return payload ?? {};
}

function buildQuery(params = {}, keyMap = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || typeof value === 'undefined' || value === '') {
      return;
    }
    searchParams.set(keyMap[key] || key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export function normalizeSessionResponse(payload = {}) {
  const camelized = camelizeKeys(payload);

  return {
    ...camelized,
    session: normalizeSessionRecord(camelized.session || {}),
    runtimePosture: camelized.runtimePosture || null,
    anchorValidity: camelized.anchorValidity || null,
    canonicalHomeContext: camelized.canonicalHomeContext || null,
    featureFlags: camelized.featureFlags || {},
  };
}

export function normalizeAskResponse(payload = {}) {
  const camelized = camelizeKeys(payload);
  const sessionDelta = isPlainObject(camelized.sessionDelta)
    ? camelized.sessionDelta
    : {};

  return {
    ...camelized,
    fallbackPosture: camelized.fallbackPosture || null,
    evidenceSummary: camelized.evidenceSummary || null,
    sessionDelta: {
      ...sessionDelta,
      currentQuestion:
        sessionDelta.currentQuestionRef
        ?? buildQuestionRef(sessionDelta.currentQuestionId ?? null),
      currentQuestionType:
        sessionDelta.currentQuestionTypeRef
        ?? buildQuestionTypeRef(sessionDelta.currentQuestionTypeId ?? null),
    },
    suggestedActions: Array.isArray(camelized.suggestedActions)
      ? camelized.suggestedActions
      : [],
  };
}

export function normalizeImportQuestionResponse(payload = {}) {
  const camelized = camelizeKeys(payload);
  return {
    ...camelized,
    question: camelized.question || null,
    scoringScopePosture: camelized.scoringScopePosture || null,
  };
}

export function normalizeQuestionSearchResponse(payload = {}) {
  const camelized = camelizeKeys(payload);
  return {
    ...camelized,
    items: Array.isArray(camelized.items) ? camelized.items : [],
    featureFlags: camelized.featureFlags || {},
  };
}

export function normalizeReviewTaskListResponse(payload = {}) {
  const camelized = camelizeKeys(payload);
  return {
    ...camelized,
    items: Array.isArray(camelized.items) ? camelized.items : [],
  };
}

export function normalizeReviewTaskResponse(payload = {}) {
  const camelized = camelizeKeys(payload);
  return {
    ...camelized,
    reviewTask: camelized.reviewTask || null,
  };
}

export function normalizeWorkspaceResponse(payload = {}) {
  const camelized = camelizeKeys(payload);
  return {
    ...camelized,
    workspace: camelized.workspace || null,
    runtimePosture: camelized.runtimePosture || null,
    reviewQueue: normalizeReviewTaskListResponse(camelized.reviewQueue || {}),
  };
}

export function normalizeArtifactResponse(payload = {}) {
  const camelized = camelizeKeys(payload);
  return {
    ...camelized,
    artifact: camelized.artifact || null,
    slotTransition: camelized.slotTransition || null,
  };
}

export async function createSession(payload, options = {}) {
  return normalizeSessionResponse(await learningRequest('/sessions', {
    method: 'POST',
    body: payload,
    idempotencyKey: options.idempotencyKey ?? null,
  }));
}

export async function getSession(sessionId) {
  return normalizeSessionResponse(await learningRequest(`/sessions/${encodeURIComponent(sessionId)}`));
}

export async function askInSession(sessionId, payload) {
  return normalizeAskResponse(await learningRequest(`/sessions/${encodeURIComponent(sessionId)}/ask`, {
    method: 'POST',
    body: payload,
  }));
}

export async function importQuestion(payload, options = {}) {
  return normalizeImportQuestionResponse(await learningRequest('/questions/import', {
    method: 'POST',
    body: payload,
    idempotencyKey: options.idempotencyKey ?? null,
  }));
}

export async function searchQuestions(params = {}) {
  const query = buildQuery({
    subjectCode: params.subjectCode ?? params.subject_code,
    primaryTopicId: params.primaryTopicId ?? params.primary_topic_id,
    familyId: params.familyId ?? params.family_id,
    primaryQuestionTypeId: params.primaryQuestionTypeId ?? params.primary_question_type_id,
    year: params.year,
    session: params.session,
    paperNumber: params.paperNumber ?? params.paper_number,
    variant: params.variant,
    qNumber: params.qNumber ?? params.q_number,
    query: params.query,
    page: params.page,
    pageSize: params.pageSize ?? params.page_size,
  }, {
    subjectCode: 'subject_code',
    primaryTopicId: 'primary_topic_id',
    familyId: 'family_id',
    primaryQuestionTypeId: 'primary_question_type_id',
    paperNumber: 'paper_number',
    qNumber: 'q_number',
    pageSize: 'page_size',
  });

  return normalizeQuestionSearchResponse(
    await learningRequest(`/questions${query}`),
  );
}

export async function getWorkspace(topicId) {
  return normalizeWorkspaceResponse(await learningRequest(`/workspaces/${encodeURIComponent(topicId)}`));
}

export async function listReviewTasks(params = {}) {
  const query = buildQuery(params, {
    topicId: 'topic_id',
    dueBefore: 'due_before',
  });

  return normalizeReviewTaskListResponse(
    await learningRequest(`/review-tasks${query}`),
  );
}

function buildReviewTaskWritePayload(payload = {}) {
  const intent = payload.intent ?? null;
  const body = { intent };

  if (intent === 'complete') {
    body.completion_outcome = payload.completionOutcome ?? payload.completion_outcome ?? null;
    body.completion_evidence = payload.completionEvidence ?? payload.completion_evidence ?? null;
    return body;
  }

  if (intent === 'reschedule' || intent === 'snooze') {
    body.due_at = payload.dueAt ?? payload.due_at ?? null;
    return body;
  }

  return body;
}

export async function updateReviewTask(reviewTaskId, payload) {
  return normalizeReviewTaskResponse(
    await learningRequest(`/review-tasks/${encodeURIComponent(reviewTaskId)}`, {
      method: 'PATCH',
      body: buildReviewTaskWritePayload(payload),
    }),
  );
}

export async function updateArtifact(artifactId, payload) {
  return normalizeArtifactResponse(await learningRequest(`/artifacts/${encodeURIComponent(artifactId)}`, {
    method: 'PATCH',
    body: payload,
  }));
}

export async function pinArtifact(artifactId) {
  return updateArtifact(artifactId, {
    intent: 'set_placement_status',
    placement_status: 'pinned',
  });
}

export async function unpinArtifact(artifactId) {
  return updateArtifact(artifactId, {
    intent: 'set_placement_status',
    placement_status: 'inbox',
  });
}

export async function markArtifactContested(artifactId) {
  return updateArtifact(artifactId, {
    intent: 'mark_contested',
  });
}

export async function supersedeArtifact(artifactId, successorArtifactRef) {
  return updateArtifact(artifactId, {
    intent: 'attach_superseded_by',
    successor_artifact_ref: successorArtifactRef,
  });
}

export const learningRuntimeApi = {
  createSession,
  getSession,
  askInSession,
  importQuestion,
  searchQuestions,
  getWorkspace,
  listReviewTasks,
  updateReviewTask,
  pinArtifact,
  unpinArtifact,
  markArtifactContested,
  supersedeArtifact,
  updateArtifact,
};

export default learningRuntimeApi;
