import { LEARNING_ERROR_CODES, getLearningErrorStatus } from '../contracts/error-contract.js';
import { resolveReleasedScoringPosture } from '../contracts/released-scope.js';
import { fetchWorkspaceProjection } from '../repositories/workspace-repository.js';

function normalizeString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function createLearningError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.status = getLearningErrorStatus(code);
  error.retryable = false;
  error.details = details;
  return error;
}

function normalizeEvidenceContext(payload) {
  if (!isPlainObject(payload)) {
    return {
      mastery: null,
      recent_decisions: [],
      misconception_tags: [],
      recent_errors: [],
    };
  }

  return {
    mastery: payload.mastery ?? null,
    recent_decisions: normalizeArray(payload.recent_decisions ?? payload.recentDecisions),
    misconception_tags: normalizeArray(payload.misconception_tags ?? payload.misconceptionTags),
    recent_errors: normalizeArray(payload.recent_errors ?? payload.recentErrors),
  };
}

function buildQuestionRef(questionId) {
  const normalized = normalizeString(questionId);
  return normalized
    ? { kind: 'question', question_id: normalized }
    : null;
}

function buildQuestionTypeRef(questionTypeId) {
  const normalized = normalizeString(questionTypeId);
  return normalized
    ? { kind: 'question_type', question_type_id: normalized }
    : null;
}

function normalizeActiveScopeBundle(session) {
  const bundle = isPlainObject(session?.active_scope_bundle) ? session.active_scope_bundle : {};

  return {
    primary_topic_id: bundle.primary_topic_id ?? null,
    primary_topic_path: bundle.primary_topic_path ?? null,
    secondary_topics_in_scope: normalizeArray(bundle.secondary_topics_in_scope),
    allowed_prerequisites: normalizeArray(bundle.allowed_prerequisites),
    paper_context: bundle.paper_context ?? null,
    mode: bundle.mode ?? session?.mode ?? null,
    session_goal: bundle.session_goal ?? session?.session_goal ?? null,
    current_anchor_kind: bundle.current_anchor_kind ?? session?.current_anchor_kind ?? null,
    current_anchor_ref: bundle.current_anchor_ref ?? session?.current_anchor_ref ?? null,
    current_question_ref:
      bundle.current_question_ref ?? buildQuestionRef(session?.current_question_id ?? null),
    current_question_type_ref:
      bundle.current_question_type_ref
      ?? buildQuestionTypeRef(session?.current_question_type_id ?? null),
  };
}

async function loadQuestionContext(client, questionId) {
  const normalizedQuestionId = normalizeString(questionId);
  if (!normalizedQuestionId) {
    return null;
  }

  const { data, error } = await client
    .from('learning_question_registry_projection')
    .select('*')
    .eq('question_id', normalizedQuestionId)
    .maybeSingle();

  if (error) {
    throw createLearningError(
      LEARNING_ERROR_CODES.SESSION_STATE_CONFLICT,
      'Stored question context could not be loaded.',
      { cause: error.message },
    );
  }

  return data ?? null;
}

async function loadEvidenceContext(client, { userId, topicPath }) {
  if (!normalizeString(userId) || !normalizeString(topicPath) || typeof client?.rpc !== 'function') {
    return normalizeEvidenceContext(null);
  }

  try {
    const { data, error } = await client.rpc('get_evidence_context', {
      p_user_id: userId,
      p_topic_path: topicPath,
      p_limit: 3,
    });

    if (error) {
      return normalizeEvidenceContext(null);
    }

    return normalizeEvidenceContext(data);
  } catch {
    return normalizeEvidenceContext(null);
  }
}

function buildBoundaryDescription({
  session,
  bundle,
  workspace,
  evidenceContext,
  fallbackPosture,
  questionContext,
}) {
  const parts = [
    `mode=${normalizeString(bundle.mode || session?.mode || 'learning_session')}`,
    `anchor=${normalizeString(bundle.current_anchor_kind || 'unknown')}`,
    `topic=${normalizeString(bundle.primary_topic_path || 'unknown')}`,
  ];

  const questionTypeId = normalizeString(
    questionContext?.primary_question_type_id
      || bundle.current_question_type_ref?.question_type_id,
  );
  if (questionTypeId) {
    parts.push(`question_type=${questionTypeId}`);
  }

  if (workspace?.workspace_id) {
    parts.push(`workspace=${workspace.workspace_id}`);
  }

  if (isPlainObject(bundle.paper_context)) {
    const paperScope = normalizeString(bundle.paper_context.paper_scope);
    const topicSectionId = normalizeString(
      bundle.paper_context.topic_section_ref?.paper_workspace_topic_section_id,
    );

    if (paperScope) {
      parts.push(`paper_scope=${paperScope}`);
    }

    if (topicSectionId) {
      parts.push(`topic_section=${topicSectionId}`);
    }
  }

  if (evidenceContext.mastery && typeof evidenceContext.mastery.score === 'number') {
    parts.push(`mastery_score=${evidenceContext.mastery.score}`);
  }

  if (typeof fallbackPosture?.fallback_mode === 'string' && fallbackPosture.fallback_mode) {
    parts.push(`fallback_mode=${fallbackPosture.fallback_mode}`);
  }

  return parts.join('; ');
}

function buildSuggestedActions({ bundle, workspace, fallbackPosture }) {
  const actions = [];

  if (!fallbackPosture?.authoritative_scoring_allowed) {
    actions.push({
      kind: 'non_released_fallback',
      fallback_mode: fallbackPosture?.fallback_mode ?? null,
    });
  }

  actions.push({
    kind: 'continue_session',
    anchor_kind: bundle.current_anchor_kind ?? null,
  });

  if (workspace?.workspace_id) {
    actions.push({
      kind: 'review_workspace',
      workspace_id: workspace.workspace_id,
    });
  }

  if (bundle.current_question_ref?.question_id) {
    actions.push({
      kind: 'review_question',
      question_id: bundle.current_question_ref.question_id,
    });
  }

  return actions;
}

function buildEvidenceSummary({ askResponse, bundle, workspace, evidenceContext }) {
  const populatedSlotKeys = Object.entries(workspace?.slots || {})
    .filter(([, slot]) => slot !== null)
    .map(([slotKey]) => slotKey);

  return {
    source_topic_path: bundle.primary_topic_path ?? null,
    retrieved_evidence_count: normalizeArray(askResponse?.evidence).length,
    workspace_id: workspace?.workspace_id ?? null,
    populated_slot_keys: populatedSlotKeys,
    mastery: evidenceContext.mastery,
    recent_decision_count: evidenceContext.recent_decisions.length,
    recent_error_count: evidenceContext.recent_errors.length,
    misconception_tags: evidenceContext.misconception_tags
      .map((tag) => normalizeString(tag?.tag))
      .filter(Boolean),
  };
}

function buildSessionDelta({ bundle, session, clientTurnId, askResponse, fallbackPosture }) {
  return {
    session_id: session?.session_id ?? null,
    client_turn_id: normalizeString(clientTurnId) || null,
    current_anchor_ref: bundle.current_anchor_ref ?? null,
    current_question_ref: bundle.current_question_ref ?? null,
    current_question_type_ref: bundle.current_question_type_ref ?? null,
    assistant_uncertain: Boolean(askResponse?.uncertain),
    fallback_mode: fallbackPosture?.fallback_mode ?? null,
  };
}

export async function buildLearningSessionAskContext(
  client,
  {
    session,
    message,
    clientTurnId = null,
  } = {},
) {
  const normalizedMessage = normalizeString(message);
  if (!normalizedMessage) {
    throw createLearningError(
      LEARNING_ERROR_CODES.INVALID_PAYLOAD,
      'message is required.',
      { field: 'message' },
    );
  }

  if (!isPlainObject(session)) {
    throw createLearningError(
      LEARNING_ERROR_CODES.SESSION_NOT_FOUND,
      'Learning session not found.',
    );
  }

  if (normalizeString(session.state) && session.state !== 'active') {
    throw createLearningError(
      LEARNING_ERROR_CODES.SESSION_STATE_CONFLICT,
      'The session is not active.',
      { state: session.state },
    );
  }

  const bundle = normalizeActiveScopeBundle(session);
  if (!normalizeString(bundle.primary_topic_path)) {
    throw createLearningError(
      LEARNING_ERROR_CODES.SESSION_STATE_CONFLICT,
      'The persisted active_scope_bundle is missing primary_topic_path.',
    );
  }

  const [questionContext, workspace, evidenceContext] = await Promise.all([
    loadQuestionContext(client, bundle.current_question_ref?.question_id),
    bundle.primary_topic_id && session.user_id
      ? fetchWorkspaceProjection(client, {
        userId: session.user_id,
        topicId: bundle.primary_topic_id,
      })
      : Promise.resolve(null),
    loadEvidenceContext(client, {
      userId: session.user_id,
      topicPath: bundle.primary_topic_path,
    }),
  ]);

  const fallbackPosture = resolveReleasedScoringPosture({
    questionTypeId:
      questionContext?.primary_question_type_id
      ?? bundle.current_question_type_ref?.question_type_id
      ?? null,
    questionTypeReleaseState:
      questionContext?.primary_question_type_release_state
      ?? questionContext?.question_type_release_state
      ?? null,
    candidateRubricRefs: normalizeArray(questionContext?.candidate_rubric_refs),
    classificationConfidence: questionContext?.classification_confidence ?? null,
    uncertaintyValidated: false,
  });

  const boundaryTitle = normalizeString(
    questionContext?.primary_question_type_title
      || bundle.current_question_type_ref?.question_type_id
      || bundle.primary_topic_path,
  ) || 'Learning session';

  return {
    message: normalizedMessage,
    client_turn_id: normalizeString(clientTurnId) || null,
    session,
    bundle,
    workspace,
    evidenceContext,
    questionContext,
    fallbackPosture,
    askInput: {
      query: normalizedMessage,
      subject_code: session.subject_code ?? null,
      syllabus_node_id: bundle.primary_topic_id ?? null,
      current_topic_path: bundle.primary_topic_path,
      boundary_title: boundaryTitle,
      boundary_description: buildBoundaryDescription({
        session,
        bundle,
        workspace,
        evidenceContext,
        fallbackPosture,
        questionContext,
      }),
      internal_debug: true,
    },
    buildResponsePayload(askResponse) {
      return {
        assistant_message: normalizeString(askResponse?.answer),
        evidence_summary: buildEvidenceSummary({
          askResponse,
          bundle,
          workspace,
          evidenceContext,
        }),
        fallback_posture: fallbackPosture,
        session_delta: buildSessionDelta({
          bundle,
          session,
          clientTurnId,
          askResponse,
          fallbackPosture,
        }),
        suggested_actions: buildSuggestedActions({
          bundle,
          workspace,
          fallbackPosture,
        }),
      };
    },
  };
}
