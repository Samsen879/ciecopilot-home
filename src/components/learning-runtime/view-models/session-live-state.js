import { LEARNING_RUNTIME_ENTRY_TOPICS } from '../../../pages/legacy-entry-mode.js';

const DEFAULT_SUBJECT_CODE = '9709';
const DEFAULT_ANCHOR_KIND = 'concept';
const DEFAULT_SLOT_KEY = 'review_queue';

const TOPIC_TYPE_BY_TOPIC_ID = Object.freeze({
  'topic-trig-identities': '9709.trigonometry.identities',
  'topic-trig-equations': '9709.trigonometry.equations',
});

export const SESSION_LAUNCH_TOPIC_OPTIONS = Object.freeze(
  LEARNING_RUNTIME_ENTRY_TOPICS.map((topic) => ({
    ...topic,
    questionTypeId: TOPIC_TYPE_BY_TOPIC_ID[topic.topicId] ?? null,
  })),
);

function normalizeString(value) {
  if (value === null || typeof value === 'undefined') {
    return '';
  }

  return String(value).trim();
}

function normalizeNullableString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function readFirstValue(source, keys) {
  if (!source || typeof source !== 'object') {
    return null;
  }

  for (const key of keys) {
    if (key in source && source[key] !== null && typeof source[key] !== 'undefined') {
      return source[key];
    }
  }

  return null;
}

function findTopicOption(topicId, topicPath) {
  const normalizedTopicId = normalizeNullableString(topicId);
  const normalizedTopicPath = normalizeNullableString(topicPath);

  return (
    SESSION_LAUNCH_TOPIC_OPTIONS.find((topic) => (
      (normalizedTopicId && topic.topicId === normalizedTopicId)
      || (normalizedTopicPath && topic.topicPath === normalizedTopicPath)
    ))
    || SESSION_LAUNCH_TOPIC_OPTIONS[0]
    || null
  );
}

function defaultModeForAnchor(anchorKind, slotKey) {
  if (anchorKind === 'question') {
    return 'guided_solve';
  }

  if (anchorKind === 'review_task') {
    return 'spaced_review';
  }

  if (anchorKind === 'workspace_slot') {
    return slotKey === DEFAULT_SLOT_KEY ? 'spaced_review' : 'learn_concept';
  }

  return 'learn_concept';
}

function questionIdFromRef(ref) {
  if (!ref || typeof ref !== 'object') {
    return null;
  }

  return normalizeNullableString(ref.questionId ?? ref.question_id);
}

function questionTypeIdFromRef(ref) {
  if (!ref || typeof ref !== 'object') {
    return null;
  }

  return normalizeNullableString(ref.questionTypeId ?? ref.question_type_id);
}

export function createSessionLaunchDraft(overrides = {}) {
  const anchorKind = normalizeNullableString(
    readFirstValue(overrides, ['anchorKind', 'anchor_kind']),
  ) || DEFAULT_ANCHOR_KIND;
  const slotKey = normalizeNullableString(
    readFirstValue(overrides, ['slotKey', 'slot_key']),
  ) || DEFAULT_SLOT_KEY;
  const topicOption = findTopicOption(
    readFirstValue(overrides, ['topicId', 'topic_id']),
    readFirstValue(overrides, ['topicPath', 'topic_path']),
  );
  const questionId = normalizeNullableString(
    readFirstValue(overrides, ['questionId', 'question_id']),
  ) || '';

  return {
    subjectCode: normalizeNullableString(
      readFirstValue(overrides, ['subjectCode', 'subject_code']),
    ) || DEFAULT_SUBJECT_CODE,
    mode: normalizeNullableString(
      readFirstValue(overrides, ['mode']),
    ) || defaultModeForAnchor(anchorKind, slotKey),
    sessionGoal: normalizeNullableString(
      readFirstValue(overrides, ['sessionGoal', 'session_goal']),
    ) || '',
    anchorKind,
    topicId: topicOption?.topicId ?? '',
    topicPath: topicOption?.topicPath ?? '',
    questionId,
    reviewTaskId: normalizeNullableString(
      readFirstValue(overrides, ['reviewTaskId', 'review_task_id']),
    ) || '',
    artifactId: normalizeNullableString(
      readFirstValue(overrides, ['artifactId', 'artifact_id']),
    ) || '',
    workspaceId: normalizeNullableString(
      readFirstValue(overrides, ['workspaceId', 'workspace_id']),
    ) || '',
    slotKey,
    currentQuestionId: normalizeNullableString(
      readFirstValue(overrides, ['currentQuestionId', 'current_question_id']),
    ) || (anchorKind === 'question' ? questionId : ''),
    currentQuestionTypeId: normalizeNullableString(
      readFirstValue(overrides, ['currentQuestionTypeId', 'current_question_type_id']),
    ) || topicOption?.questionTypeId || '',
  };
}

export function patchSessionLaunchDraft(currentDraft = {}, patch = {}) {
  const nextDraft = {
    ...createSessionLaunchDraft(currentDraft),
    ...patch,
  };

  const topicOption = findTopicOption(nextDraft.topicId, nextDraft.topicPath);
  if (topicOption) {
    nextDraft.topicId = topicOption.topicId;
    nextDraft.topicPath = topicOption.topicPath;
    if (!normalizeNullableString(patch.currentQuestionTypeId)) {
      nextDraft.currentQuestionTypeId = topicOption.questionTypeId || nextDraft.currentQuestionTypeId;
    }
  }

  if ('anchorKind' in patch && !('mode' in patch)) {
    nextDraft.mode = defaultModeForAnchor(nextDraft.anchorKind, nextDraft.slotKey);
  }

  if ('slotKey' in patch && nextDraft.anchorKind === 'workspace_slot' && !('mode' in patch)) {
    nextDraft.mode = defaultModeForAnchor(nextDraft.anchorKind, nextDraft.slotKey);
  }

  if ('questionId' in patch || nextDraft.anchorKind === 'question') {
    nextDraft.currentQuestionId = nextDraft.anchorKind === 'question'
      ? normalizeNullableString(nextDraft.questionId) || ''
      : nextDraft.currentQuestionId;
  }

  if (nextDraft.anchorKind === 'concept') {
    nextDraft.currentQuestionId = '';
  }

  return nextDraft;
}

export function canSubmitSessionLaunchDraft(draft = {}) {
  const normalizedDraft = createSessionLaunchDraft(draft);

  if (!normalizeNullableString(normalizedDraft.subjectCode) || !normalizeNullableString(normalizedDraft.mode)) {
    return false;
  }

  switch (normalizedDraft.anchorKind) {
    case 'concept':
      return Boolean(
        normalizeNullableString(normalizedDraft.topicId)
        && normalizeNullableString(normalizedDraft.topicPath),
      );
    case 'question':
      return Boolean(normalizeNullableString(normalizedDraft.questionId));
    case 'review_task':
      return Boolean(normalizeNullableString(normalizedDraft.reviewTaskId));
    case 'artifact':
      return Boolean(normalizeNullableString(normalizedDraft.artifactId));
    case 'workspace_slot':
      return Boolean(
        normalizeNullableString(normalizedDraft.workspaceId)
        && normalizeNullableString(normalizedDraft.slotKey),
      );
    default:
      return false;
  }
}

function buildAnchorRef(draft) {
  switch (draft.anchorKind) {
    case 'concept':
      return {
        kind: 'concept',
        topic_id: normalizeNullableString(draft.topicId),
        topic_path: normalizeNullableString(draft.topicPath),
      };
    case 'question':
      return {
        kind: 'question',
        question_id: normalizeNullableString(draft.questionId),
      };
    case 'review_task':
      return {
        kind: 'review_task',
        review_task_id: normalizeNullableString(draft.reviewTaskId),
      };
    case 'artifact':
      return {
        kind: 'artifact',
        artifact_id: normalizeNullableString(draft.artifactId),
      };
    case 'workspace_slot':
      return {
        kind: 'workspace_slot',
        workspace_id: normalizeNullableString(draft.workspaceId),
        slot_key: normalizeNullableString(draft.slotKey),
      };
    default:
      return null;
  }
}

export function buildSessionLaunchPayload(draft = {}) {
  const normalizedDraft = createSessionLaunchDraft(draft);
  const currentQuestionId = normalizedDraft.anchorKind === 'question'
    ? normalizeNullableString(normalizedDraft.questionId)
    : normalizeNullableString(normalizedDraft.currentQuestionId);

  return {
    subject_code: normalizeNullableString(normalizedDraft.subjectCode) || DEFAULT_SUBJECT_CODE,
    mode: normalizeNullableString(normalizedDraft.mode),
    session_goal: normalizeNullableString(normalizedDraft.sessionGoal),
    anchor_kind: normalizedDraft.anchorKind,
    anchor_ref: buildAnchorRef(normalizedDraft),
    current_question_id: currentQuestionId,
    current_question_type_id: normalizeNullableString(normalizedDraft.currentQuestionTypeId),
  };
}

export function mergeAskResponseIntoSessionPayload(sessionPayload = {}, askResponse = {}) {
  const session = sessionPayload.session || {};
  const currentActiveScope = session.activeScope || session.activeScopeBundle || {};
  const sessionDelta = askResponse.sessionDelta || {};
  const nextCurrentQuestion = Object.prototype.hasOwnProperty.call(sessionDelta, 'currentQuestion')
    ? sessionDelta.currentQuestion
    : (session.currentQuestion ?? null);
  const nextCurrentQuestionType = Object.prototype.hasOwnProperty.call(sessionDelta, 'currentQuestionType')
    ? sessionDelta.currentQuestionType
    : (session.currentQuestionType ?? null);
  const nextActiveScope = {
    ...currentActiveScope,
    currentQuestion: nextCurrentQuestion,
    currentQuestionType: nextCurrentQuestionType,
  };

  return {
    ...sessionPayload,
    session: {
      ...session,
      currentQuestion: nextCurrentQuestion,
      currentQuestionId: questionIdFromRef(nextCurrentQuestion),
      currentQuestionType: nextCurrentQuestionType,
      currentQuestionTypeId: questionTypeIdFromRef(nextCurrentQuestionType),
      activeScope: nextActiveScope,
      activeScopeBundle: nextActiveScope,
    },
    latestResponse: askResponse,
  };
}

export function shouldApplyLaunchSuccess({
  activeRequestKey,
  isLauncherSurface,
  isMounted,
  requestKey,
} = {}) {
  return Boolean(
    isMounted
    && isLauncherSurface
    && requestKey
    && activeRequestKey
    && requestKey === activeRequestKey,
  );
}

export function shouldApplyAskResponse({
  activeRouteSessionId,
  currentSessionId,
  isMounted,
  requestSessionId,
} = {}) {
  return Boolean(
    isMounted
    && requestSessionId
    && activeRouteSessionId
    && currentSessionId
    && requestSessionId === activeRouteSessionId
    && requestSessionId === currentSessionId,
  );
}
