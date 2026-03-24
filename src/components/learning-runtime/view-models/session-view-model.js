import {
  SESSION_LAUNCH_TOPIC_OPTIONS,
  canSubmitSessionLaunchDraft,
  createSessionLaunchDraft,
} from './session-live-state.js';

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

function buildTurnEntries(turnHistory = []) {
  return turnHistory.flatMap((turn, index) => {
    const turnId = turn?.clientTurnId || `turn-${index + 1}`;
    const entries = [
      {
        id: `user:${turnId}`,
        kind: 'user_turn',
        title: 'Your follow-up',
        message: turn?.userMessage || '',
      },
    ];
    const assistantEntry = buildAssistantResponseEntry(turn?.response || null);
    if (assistantEntry) {
      entries.push({
        ...assistantEntry,
        id: `assistant:${turnId}`,
      });
    }

    return entries.filter((entry) => entry.message || entry.kind !== 'user_turn');
  });
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

function buildTimeline(session, latestResponse, turnHistory = []) {
  const entries = buildTurnEntries(turnHistory);

  if (entries.length === 0) {
    const assistantEntry = buildAssistantResponseEntry(latestResponse);
    if (assistantEntry) {
      entries.push(assistantEntry);
    }
  }

  entries.push(buildQuestionStateEntry(session));
  return entries;
}

function buildLauncherViewModel(launcher = {}) {
  const draft = createSessionLaunchDraft(launcher?.draft || {});

  return {
    draft,
    status: launcher?.status || 'idle',
    errorMessage: launcher?.errorMessage || launcher?.error?.message || null,
    canSubmit: typeof launcher?.canSubmit === 'boolean'
      ? launcher.canSubmit
      : canSubmitSessionLaunchDraft(draft),
    anchorOptions: [
      { value: 'concept', label: 'Concept' },
      { value: 'question', label: 'Question' },
      { value: 'review_task', label: 'Review task' },
      { value: 'artifact', label: 'Artifact' },
      { value: 'workspace_slot', label: 'Workspace slot' },
    ],
    modeOptions: [
      { value: 'learn_concept', label: 'Learn concept' },
      { value: 'guided_solve', label: 'Guided solve' },
      { value: 'timed_practice', label: 'Timed practice' },
      { value: 'post_mortem_review', label: 'Post-mortem review' },
      { value: 'spaced_review', label: 'Spaced review' },
    ],
    topicOptions: SESSION_LAUNCH_TOPIC_OPTIONS,
    slotOptions: [
      { value: 'review_queue', label: 'review_queue' },
      { value: 'common_traps', label: 'common_traps' },
      { value: 'my_notes', label: 'my_notes' },
      { value: 'overview_map', label: 'overview_map' },
    ],
  };
}

function buildComposerViewModel(composer = {}, hasSession) {
  const message = normalizeText(composer?.message, '');

  return {
    message,
    status: composer?.status || 'idle',
    errorMessage: composer?.errorMessage || composer?.error?.message || null,
    canSubmit: typeof composer?.canSubmit === 'boolean'
      ? composer.canSubmit
      : Boolean(hasSession && message && composer?.status !== 'submitting'),
  };
}

export function buildSessionViewModel(payload = {}, options = {}) {
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
  const hasSession = Boolean(session.sessionId);
  const latestResponse = options.latestResponse || payload.latestResponse || null;
  const launcher = buildLauncherViewModel(options.launcher || {});
  const composer = buildComposerViewModel(options.composer || {}, hasSession);

  return {
    hasSession,
    session,
    header: {
      modeLabel: hasSession ? session.modeLabel : 'launch a learning session',
      anchorKind: hasSession ? session.currentAnchorKind : launcher.draft.anchorKind,
      anchorLabel: hasSession
        ? buildAnchorLabel(currentAnchor, topicPath)
        : 'Choose a valid anchor and mode to start a runtime session.',
      topicPath: hasSession ? topicPath : launcher.draft.topicPath,
      fallbackMode: latestResponse?.fallbackPosture?.fallbackMode ?? null,
      authoritativeScoringAllowed:
        latestResponse?.fallbackPosture?.authoritativeScoringAllowed ?? null,
      fallbackReasonCode: latestResponse?.fallbackPosture?.fallbackReasonCode ?? null,
      learningSignalPosture: latestResponse?.fallbackPosture?.learningSignalPosture ?? null,
    },
    latestResponse,
    timeline: hasSession ? buildTimeline(session, latestResponse, options.turnHistory || []) : [],
    launcher,
    composer,
    timelineUpdating: composer.status === 'submitting',
    featureFlags: payload.featureFlags || {},
  };
}

export default buildSessionViewModel;
