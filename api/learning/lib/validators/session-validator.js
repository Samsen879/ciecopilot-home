import {
  buildArtifactRef,
  buildConceptAnchorRef,
  buildQuestionRef,
  buildReviewTaskRef,
  buildWorkspaceSlotAnchorRef,
  isAnchorKind,
  isSessionMode,
  isStableSlotKey,
} from '../contracts/runtime-contract.js';
import { LEARNING_ERROR_CODES } from '../contracts/error-contract.js';
import { LearningHttpError } from '../http/learning-http.js';

const ALLOWED_CREATE_MODES = Object.freeze({
  concept: Object.freeze(['learn_concept']),
  question: Object.freeze(['guided_solve', 'timed_practice', 'post_mortem_review']),
  review_task: Object.freeze(['spaced_review']),
  artifact: Object.freeze(['learn_concept', 'spaced_review', 'post_mortem_review']),
  workspace_slot: Object.freeze(['learn_concept', 'spaced_review']),
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

function normalizeRequiredString(value, fieldName, code = LEARNING_ERROR_CODES.INVALID_PAYLOAD) {
  const normalized = normalizeString(value);
  if (!normalized) {
    throw new LearningHttpError(code, `${fieldName} is required.`, {
      details: { field: fieldName },
    });
  }
  return normalized;
}

function normalizePayload(input) {
  if (!isPlainObject(input)) {
    throw new LearningHttpError(
      LEARNING_ERROR_CODES.INVALID_PAYLOAD,
      'Request body must be an object.',
      { details: { field: 'body' } },
    );
  }

  return input;
}

function normalizeAnchorKind(anchorKind) {
  const normalized = normalizeString(anchorKind);
  if (!isAnchorKind(normalized)) {
    throw new LearningHttpError(
      LEARNING_ERROR_CODES.INVALID_ANCHOR_KIND,
      'anchor_kind is not part of the frozen learning contract.',
      { details: { field: 'anchor_kind', value: anchorKind ?? null } },
    );
  }

  return normalized;
}

function normalizeMode(mode) {
  const normalized = normalizeString(mode);
  if (!isSessionMode(normalized)) {
    throw new LearningHttpError(
      LEARNING_ERROR_CODES.INVALID_PAYLOAD,
      'mode is invalid.',
      { details: { field: 'mode', value: mode ?? null } },
    );
  }

  return normalized;
}

function normalizeAnchorRef(anchorKind, anchorRef) {
  if (!isPlainObject(anchorRef)) {
    throw new LearningHttpError(
      LEARNING_ERROR_CODES.INVALID_ANCHOR_REF,
      'anchor_ref must be an object.',
      { details: { field: 'anchor_ref' } },
    );
  }

  if (anchorRef.kind !== anchorKind) {
    throw new LearningHttpError(
      LEARNING_ERROR_CODES.INVALID_ANCHOR_REF,
      'anchor_ref.kind must match anchor_kind.',
      { details: { field: 'anchor_ref.kind', anchor_kind: anchorKind } },
    );
  }

  switch (anchorKind) {
    case 'concept':
      return buildConceptAnchorRef(
        normalizeRequiredString(anchorRef.topic_id, 'anchor_ref.topic_id', LEARNING_ERROR_CODES.INVALID_ANCHOR_REF),
        normalizeRequiredString(anchorRef.topic_path, 'anchor_ref.topic_path', LEARNING_ERROR_CODES.INVALID_ANCHOR_REF),
      );
    case 'question':
      return buildQuestionRef(
        normalizeRequiredString(anchorRef.question_id, 'anchor_ref.question_id', LEARNING_ERROR_CODES.INVALID_ANCHOR_REF),
      );
    case 'review_task':
      return buildReviewTaskRef(
        normalizeRequiredString(anchorRef.review_task_id, 'anchor_ref.review_task_id', LEARNING_ERROR_CODES.INVALID_ANCHOR_REF),
      );
    case 'artifact':
      return buildArtifactRef(
        normalizeRequiredString(anchorRef.artifact_id, 'anchor_ref.artifact_id', LEARNING_ERROR_CODES.INVALID_ANCHOR_REF),
      );
    case 'workspace_slot': {
      const workspaceId = normalizeRequiredString(
        anchorRef.workspace_id,
        'anchor_ref.workspace_id',
        LEARNING_ERROR_CODES.INVALID_ANCHOR_REF,
      );
      const slotKey = normalizeRequiredString(
        anchorRef.slot_key,
        'anchor_ref.slot_key',
        LEARNING_ERROR_CODES.INVALID_ANCHOR_REF,
      );

      if (!isStableSlotKey(slotKey)) {
        throw new LearningHttpError(
          LEARNING_ERROR_CODES.INVALID_ANCHOR_REF,
          'anchor_ref.slot_key is not part of the frozen slot contract.',
          { details: { field: 'anchor_ref.slot_key', value: slotKey } },
        );
      }

      return buildWorkspaceSlotAnchorRef(workspaceId, slotKey);
    }
    default:
      throw new LearningHttpError(
        LEARNING_ERROR_CODES.INVALID_ANCHOR_KIND,
        'anchor_kind is not part of the frozen learning contract.',
        { details: { field: 'anchor_kind', value: anchorKind } },
      );
  }
}

function assertModeAllowed(anchorKind, anchorRef, mode) {
  if (!ALLOWED_CREATE_MODES[anchorKind]?.includes(mode)) {
    throw new LearningHttpError(
      LEARNING_ERROR_CODES.UNSUPPORTED_MODE_FOR_ANCHOR,
      `mode ${mode} is not allowed for ${anchorKind} anchors.`,
      {
        status: 409,
        details: { anchor_kind: anchorKind, mode },
      },
    );
  }

  if (
    anchorKind === 'workspace_slot'
    && mode === 'spaced_review'
    && anchorRef.slot_key !== 'review_queue'
  ) {
    throw new LearningHttpError(
      LEARNING_ERROR_CODES.UNSUPPORTED_MODE_FOR_ANCHOR,
      'workspace_slot anchors may start spaced_review only from review_queue.',
      {
        status: 409,
        details: {
          anchor_kind: anchorKind,
          mode,
          slot_key: anchorRef.slot_key,
        },
      },
    );
  }
}

function assertQuestionContextRules(anchorKind, anchorRef, currentQuestionId) {
  if (anchorKind === 'concept' && currentQuestionId !== null) {
    throw new LearningHttpError(
      LEARNING_ERROR_CODES.INVALID_PAYLOAD,
      'concept anchors must start questionless on create.',
      { details: { field: 'current_question_id', anchor_kind: anchorKind } },
    );
  }

  if (anchorKind === 'question' && currentQuestionId !== anchorRef.question_id) {
    throw new LearningHttpError(
      LEARNING_ERROR_CODES.INVALID_PAYLOAD,
      'question anchors require current_question_id to match anchor_ref.question_id.',
      {
        details: {
          field: 'current_question_id',
          anchor_question_id: anchorRef.question_id,
        },
      },
    );
  }
}

export function validateCreateSessionInput(input = {}) {
  const payload = normalizePayload(input);
  const subjectCode = normalizeRequiredString(payload.subject_code, 'subject_code');
  const mode = normalizeMode(payload.mode);
  const anchorKind = normalizeAnchorKind(payload.anchor_kind);
  const anchorRef = normalizeAnchorRef(anchorKind, payload.anchor_ref);
  const currentQuestionId = normalizeNullableString(payload.current_question_id);
  const currentQuestionTypeId = normalizeNullableString(payload.current_question_type_id);
  const sessionGoal = normalizeNullableString(payload.session_goal);

  assertModeAllowed(anchorKind, anchorRef, mode);
  assertQuestionContextRules(anchorKind, anchorRef, currentQuestionId);

  return {
    ok: true,
    normalized: {
      subject_code: subjectCode,
      mode,
      session_goal: sessionGoal,
      anchor_kind: anchorKind,
      anchor_ref: anchorRef,
      current_question_id: currentQuestionId,
      current_question_type_id: currentQuestionTypeId,
    },
  };
}
