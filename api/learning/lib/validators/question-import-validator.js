import {
  LEARNING_ERROR_CODES,
  getLearningErrorStatus,
} from '../contracts/error-contract.js';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function createValidationError(code, message, { details = {}, status } = {}) {
  const error = new Error(`${code}: ${message}`);
  error.name = 'LearningHttpError';
  error.code = code;
  error.status = status ?? getLearningErrorStatus(code);
  error.details = details;
  error.retryable = false;
  error.publicMessage = message;
  return error;
}

function normalizeRequiredString(value, fieldName) {
  const normalized = normalizeString(value);
  if (!normalized) {
    throw createValidationError(
      LEARNING_ERROR_CODES.INVALID_PAYLOAD,
      `${fieldName} is required.`,
      { details: { field: fieldName } },
    );
  }

  return normalized;
}

function normalizePromptRepresentation(value) {
  if (!isPlainObject(value)) {
    throw createValidationError(
      LEARNING_ERROR_CODES.INVALID_PAYLOAD,
      'prompt_representation is required.',
      { details: { field: 'prompt_representation' } },
    );
  }

  const type = normalizeRequiredString(value.type, 'prompt_representation.type');

  if (!Object.prototype.hasOwnProperty.call(value, 'value')) {
    throw createValidationError(
      LEARNING_ERROR_CODES.INVALID_PAYLOAD,
      'prompt_representation.value is required.',
      { details: { field: 'prompt_representation.value' } },
    );
  }

  return {
    ...value,
    type,
  };
}

export function validateQuestionImportInput(input = {}) {
  if (!isPlainObject(input)) {
    throw createValidationError(
      LEARNING_ERROR_CODES.INVALID_PAYLOAD,
      'Request body must be an object.',
      { details: { field: 'body' } },
    );
  }

  const sourceKind = normalizeString(input.source_kind);
  if (sourceKind && sourceKind !== 'imported_question') {
    throw createValidationError(
      LEARNING_ERROR_CODES.INVALID_PAYLOAD,
      'source_kind must be imported_question when using the import endpoint.',
      { details: { field: 'source_kind', value: sourceKind } },
    );
  }

  return {
    ok: true,
    normalized: {
      source_kind: 'imported_question',
      subject_code: normalizeRequiredString(input.subject_code, 'subject_code'),
      prompt_representation: normalizePromptRepresentation(input.prompt_representation),
    },
  };
}
