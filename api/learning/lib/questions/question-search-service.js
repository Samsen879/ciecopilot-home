import { LEARNING_ERROR_CODES } from '../contracts/error-contract.js';
import { LearningHttpError } from '../http/learning-http.js';
import { searchQuestionProjection } from '../repositories/question-search-repository.js';

const DEFAULT_QUESTION_SEARCH_PAGE = 1;
const DEFAULT_QUESTION_SEARCH_PAGE_SIZE = 20;
export const MAX_QUESTION_SEARCH_PAGE_SIZE = 50;

const STRUCTURED_FILTER_FIELDS = Object.freeze([
  'subject_code',
  'primary_topic_id',
  'family_id',
  'primary_question_type_id',
  'year',
  'session',
  'paper_number',
  'variant',
  'q_number',
]);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function createInvalidPayloadError(message, details = {}) {
  return new LearningHttpError(
    LEARNING_ERROR_CODES.INVALID_PAYLOAD,
    message,
    { details },
  );
}

function normalizeRequiredString(value, fieldName) {
  const normalized = normalizeNullableString(value);
  if (!normalized) {
    throw createInvalidPayloadError(`${fieldName} is required.`, {
      field: fieldName,
    });
  }
  return normalized;
}

function normalizePositiveInteger(value, fieldName, { defaultValue = null, max = null } = {}) {
  if (value === null || typeof value === 'undefined') {
    return defaultValue;
  }

  if (typeof value === 'string' && normalizeString(value) === '') {
    return defaultValue;
  }

  const parsed = typeof value === 'number'
    ? value
    : (/^\d+$/.test(String(value).trim())
      ? Number.parseInt(String(value).trim(), 10)
      : Number.NaN);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createInvalidPayloadError(`${fieldName} must be a positive integer.`, {
      field: fieldName,
      value,
    });
  }

  if (typeof max === 'number') {
    return Math.min(parsed, max);
  }

  return parsed;
}

export function normalizeQuestionSearchInput(input = {}) {
  return {
    subject_code: normalizeRequiredString(input.subject_code, 'subject_code'),
    primary_topic_id: normalizeNullableString(input.primary_topic_id),
    family_id: normalizeNullableString(input.family_id),
    primary_question_type_id: normalizeNullableString(input.primary_question_type_id),
    year: normalizePositiveInteger(input.year, 'year'),
    session: normalizeNullableString(input.session),
    paper_number: normalizePositiveInteger(input.paper_number, 'paper_number'),
    variant: normalizePositiveInteger(input.variant, 'variant'),
    q_number: normalizePositiveInteger(input.q_number, 'q_number'),
    query: normalizeNullableString(input.query),
    page: normalizePositiveInteger(input.page, 'page', {
      defaultValue: DEFAULT_QUESTION_SEARCH_PAGE,
    }),
    page_size: normalizePositiveInteger(input.page_size, 'page_size', {
      defaultValue: DEFAULT_QUESTION_SEARCH_PAGE_SIZE,
      max: MAX_QUESTION_SEARCH_PAGE_SIZE,
    }),
  };
}

function buildMatchContext(filters) {
  return {
    filters_applied: STRUCTURED_FILTER_FIELDS.filter((field) => filters[field] !== null),
    text_query_used: Boolean(filters.query),
  };
}

export async function searchQuestions(client, input = {}) {
  const normalizedFilters = normalizeQuestionSearchInput(input);
  const { rows, total } = await searchQuestionProjection(client, normalizedFilters);
  const matchContext = buildMatchContext(normalizedFilters);

  return {
    items: rows.map((row) => ({
      ...row,
      match_context: {
        filters_applied: [...matchContext.filters_applied],
        text_query_used: matchContext.text_query_used,
      },
    })),
    total,
    page: normalizedFilters.page,
    page_size: normalizedFilters.page_size,
  };
}
