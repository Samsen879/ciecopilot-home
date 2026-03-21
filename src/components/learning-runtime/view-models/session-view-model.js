function normalizeText(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function labelForMode(mode) {
  return normalizeText(mode, 'learning session').replace(/_/g, ' ');
}

function buildAnchorLabel(anchor, topicPath) {
  if (!anchor) {
    return 'Unknown anchor';
  }

  switch (anchor.kind) {
    case 'concept':
      return topicPath || anchor.topicPath || anchor.topicId || 'Concept anchor';
    case 'question':
      return anchor.questionId || 'Question anchor';
    case 'review_task':
      return anchor.reviewTaskId || 'Review task anchor';
    case 'artifact':
      return anchor.artifactId || 'Artifact anchor';
    case 'workspace_slot':
      return anchor.slotKey
        ? `${anchor.slotKey} workspace slot`
        : 'Workspace slot anchor';
    default:
      return anchor.kind || 'Unknown anchor';
  }
}

function buildAssistantResponseEntry(latestResponse) {
  if (!latestResponse?.assistantMessage) {
    return null;
  }

  return {
    id: 'assistant-response',
    kind: 'assistant_response',
    title: 'Assistant response',
    message: latestResponse.assistantMessage,
    fallbackReasonCode: latestResponse?.fallbackPosture?.fallbackReasonCode ?? null,
    learningSignalPosture: latestResponse?.fallbackPosture?.learningSignalPosture ?? null,
    evidenceTopicPath: latestResponse?.evidenceSummary?.sourceTopicPath ?? null,
    retrievedEvidenceCount: latestResponse?.evidenceSummary?.retrievedEvidenceCount ?? null,
  };
}

function buildQuestionStateEntry(session) {
  if (session.hasQuestion && session.currentQuestionId) {
    return {
      id: 'current-question',
      kind: 'question',
      title: 'Current question',
      questionId: session.currentQuestionId,
      questionTypeId: session.currentQuestionTypeId,
    };
  }

  return {
    id: 'questionless-state',
    kind: 'questionless_state',
    title: 'Questionless entry',
    description: 'This runtime state is anchored without a current question.',
    questionTypeId: session.currentQuestionTypeId,
  };
}

function buildTimeline(session, latestResponse) {
  const entries = [];
  const assistantEntry = buildAssistantResponseEntry(latestResponse);
  if (assistantEntry) {
    entries.push(assistantEntry);
  }

  entries.push(buildQuestionStateEntry(session));
  return entries;
}

export function buildSessionViewModel(payload = {}) {
  const sessionPayload = payload.session || {};
  const activeScope = sessionPayload.activeScope || sessionPayload.activeScopeBundle || {};
  const currentAnchor = activeScope.currentAnchor || sessionPayload.currentAnchor || null;
  const currentQuestion = sessionPayload.currentQuestion ?? activeScope.currentQuestion ?? null;
  const currentQuestionType = sessionPayload.currentQuestionType ?? activeScope.currentQuestionType ?? null;
  const currentQuestionId = sessionPayload.currentQuestionId ?? currentQuestion?.questionId ?? null;
  const currentQuestionTypeId =
    sessionPayload.currentQuestionTypeId ?? currentQuestionType?.questionTypeId ?? null;
  const topicPath =
    payload?.canonicalHomeContext?.topicRef?.topicPath
    ?? activeScope.primaryTopicPath
    ?? currentAnchor?.topicPath
    ?? null;
  const latestResponse = payload.latestResponse || null;

  const session = {
    sessionId: sessionPayload.sessionId ?? null,
    state: sessionPayload.state ?? 'active',
    mode: sessionPayload.mode ?? null,
    modeLabel: labelForMode(sessionPayload.mode),
    sessionGoal: normalizeText(sessionPayload.sessionGoal, ''),
    currentAnchorKind: activeScope.currentAnchorKind ?? currentAnchor?.kind ?? null,
    currentAnchor,
    currentQuestion,
    currentQuestionId,
    currentQuestionType,
    currentQuestionTypeId,
    hasQuestion: Boolean(currentQuestionId),
    topicPath,
    createdAt: sessionPayload.createdAt ?? null,
    updatedAt: sessionPayload.updatedAt ?? null,
  };

  return {
    session,
    header: {
      modeLabel: session.modeLabel,
      anchorKind: session.currentAnchorKind,
      anchorLabel: buildAnchorLabel(currentAnchor, topicPath),
      topicPath,
      fallbackMode: latestResponse?.fallbackPosture?.fallbackMode ?? null,
      authoritativeScoringAllowed:
        latestResponse?.fallbackPosture?.authoritativeScoringAllowed ?? null,
    },
    latestResponse,
    timeline: buildTimeline(session, latestResponse),
    featureFlags: payload.featureFlags || {},
  };
}

export default buildSessionViewModel;
