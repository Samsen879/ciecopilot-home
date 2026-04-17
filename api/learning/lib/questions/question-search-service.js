import { LEARNING_ERROR_CODES } from '../contracts/error-contract.js';
import { LearningHttpError } from '../http/learning-http.js';
import { searchQuestionProjection } from '../repositories/question-search-repository.js';

const DEFAULT_QUESTION_SEARCH_PAGE = 1;
const DEFAULT_QUESTION_SEARCH_PAGE_SIZE = 20;
export const MAX_QUESTION_SEARCH_PAGE_SIZE = 50;
export const QUESTION_SEARCH_PRODUCT_FLAG = 'QUESTION_SEARCH_PRODUCT_ENABLED';

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

const STRUCTURED_FILTER_WEIGHTS = Object.freeze({
  subject_code: 1,
  primary_topic_id: 8,
  family_id: 4,
  primary_question_type_id: 6,
  year: 5,
  session: 3,
  paper_number: 5,
  variant: 2,
  q_number: 7,
});

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

function isStrictProductionRuntime() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

export function getQuestionSearchProductFlagStatus() {
  const strict = isStrictProductionRuntime();
  const enabled = strict
    ? process.env[QUESTION_SEARCH_PRODUCT_FLAG] === 'true'
    : true;

  return {
    enabled,
    strict,
    flag_name: QUESTION_SEARCH_PRODUCT_FLAG,
    reason: strict
      ? (enabled ? 'feature_flag_enabled' : 'feature_flag_disabled')
      : 'non_production_runtime',
  };
}

function normalizeCompactLine(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized || null;
}

function tokenizeQuery(value) {
  return [...new Set(
    normalizeString(value)
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter(Boolean),
  )];
}

function compareNullableString(left, right) {
  const normalizedLeft = normalizeNullableString(left);
  const normalizedRight = normalizeNullableString(right);

  if (normalizedLeft === normalizedRight) {
    return 0;
  }
  if (normalizedLeft === null) {
    return 1;
  }
  if (normalizedRight === null) {
    return -1;
  }

  return normalizedLeft.localeCompare(normalizedRight);
}

function compareNullableNumber(left, right) {
  const normalizedLeft = Number.isInteger(left) ? left : null;
  const normalizedRight = Number.isInteger(right) ? right : null;

  if (normalizedLeft === normalizedRight) {
    return 0;
  }
  if (normalizedLeft === null) {
    return 1;
  }
  if (normalizedRight === null) {
    return -1;
  }

  return normalizedLeft - normalizedRight;
}

function buildStructuredExactnessWeight(row, filters) {
  return STRUCTURED_FILTER_FIELDS.reduce((acc, field) => {
    if (filters[field] !== null && row?.[field] === filters[field]) {
      return acc + (STRUCTURED_FILTER_WEIGHTS[field] || 1);
    }
    return acc;
  }, 0);
}

function buildTypeFamilyMatchStrength(row, filters) {
  let rank = 0;

  if (filters.primary_question_type_id && row?.primary_question_type_id === filters.primary_question_type_id) {
    rank += 2;
  }

  if (filters.family_id && row?.family_id === filters.family_id) {
    rank += 1;
  }

  if (!filters.primary_question_type_id && normalizeNullableString(row?.primary_question_type_id)) {
    rank += 1;
  }

  if (!filters.family_id && normalizeNullableString(row?.family_id)) {
    rank += 1;
  }

  return rank;
}

function buildTextualSimilarity(row, query) {
  const normalizedQuery = normalizeString(query).toLowerCase();
  const queryTokens = tokenizeQuery(query);
  const haystack = [
    row?.summary,
    row?.search_text,
    row?.primary_topic_title,
    row?.question_type,
  ]
    .map((value) => normalizeString(value).toLowerCase())
    .filter(Boolean)
    .join(' ');

  if (!queryTokens.length || !haystack) {
    return {
      exact_phrase_match: false,
      matched_query_token_count: 0,
      normalized_score: 0,
    };
  }

  const matchedTokenCount = queryTokens.filter((token) => haystack.includes(token)).length;
  return {
    exact_phrase_match: normalizedQuery.length > 0 && haystack.includes(normalizedQuery),
    matched_query_token_count: matchedTokenCount,
    normalized_score: queryTokens.length > 0
      ? Number((matchedTokenCount / queryTokens.length).toFixed(4))
      : 0,
  };
}

function buildResultSortKey(row, filters) {
  const textualSimilarity = buildTextualSimilarity(row, filters.query);

  return {
    authority_tier: row?.source_kind === 'paper_question' ? 2 : 1,
    structured_exactness_weight: buildStructuredExactnessWeight(row, filters),
    release_posture_rank: row?.release_scope_status === 'released_scoring' ? 1 : 0,
    type_family_match_strength: buildTypeFamilyMatchStrength(row, filters),
    textual_similarity: textualSimilarity,
    tiebreakers: {
      storage_key: normalizeNullableString(row?.storage_key),
      year: Number.isInteger(row?.year) ? row.year : null,
      session: normalizeNullableString(row?.session),
      paper_number: Number.isInteger(row?.paper_number) ? row.paper_number : null,
      variant: Number.isInteger(row?.variant) ? row.variant : null,
      q_number: Number.isInteger(row?.q_number) ? row.q_number : null,
      question_id: normalizeNullableString(row?.question_id),
    },
  };
}

function compareTextualSimilarity(left, right) {
  if (left.exact_phrase_match !== right.exact_phrase_match) {
    return left.exact_phrase_match ? -1 : 1;
  }

  if (left.matched_query_token_count !== right.matched_query_token_count) {
    return right.matched_query_token_count - left.matched_query_token_count;
  }

  if (left.normalized_score !== right.normalized_score) {
    return right.normalized_score - left.normalized_score;
  }

  return 0;
}

function compareResultSortKeys(left, right) {
  if (left.authority_tier !== right.authority_tier) {
    return right.authority_tier - left.authority_tier;
  }

  if (left.structured_exactness_weight !== right.structured_exactness_weight) {
    return right.structured_exactness_weight - left.structured_exactness_weight;
  }

  if (left.release_posture_rank !== right.release_posture_rank) {
    return right.release_posture_rank - left.release_posture_rank;
  }

  if (left.type_family_match_strength !== right.type_family_match_strength) {
    return right.type_family_match_strength - left.type_family_match_strength;
  }

  const textualSimilarityComparison = compareTextualSimilarity(
    left.textual_similarity,
    right.textual_similarity,
  );
  if (textualSimilarityComparison !== 0) {
    return textualSimilarityComparison;
  }

  for (const field of ['storage_key', 'session', 'question_id']) {
    const stringComparison = compareNullableString(
      left.tiebreakers[field],
      right.tiebreakers[field],
    );
    if (stringComparison !== 0) {
      return stringComparison;
    }
  }

  for (const field of ['year', 'paper_number', 'variant', 'q_number']) {
    const numberComparison = compareNullableNumber(
      left.tiebreakers[field],
      right.tiebreakers[field],
    );
    if (numberComparison !== 0) {
      return numberComparison;
    }
  }

  return 0;
}

function formatPaperQuestionTitle(row) {
  if (!Number.isInteger(row?.year)
    || !normalizeNullableString(row?.session)
    || !Number.isInteger(row?.paper_number)
    || !Number.isInteger(row?.q_number)) {
    return null;
  }

  const shortYear = String(row.year).slice(-2);
  return `${normalizeString(row.session).toUpperCase()}${shortYear} P${row.paper_number} Q${row.q_number}`;
}

function buildProductPosture(row) {
  if (row?.source_kind === 'paper_question') {
    return {
      code: 'paper_backed',
      label: 'Paper-backed',
      is_provisional: false,
    };
  }

  return {
    code: 'imported_provisional',
    label: 'Imported / provisional',
    is_provisional: true,
  };
}

function buildProductCard(row) {
  const title = formatPaperQuestionTitle(row)
    || normalizeNullableString(row?.primary_topic_title)
    || normalizeNullableString(row?.question_type)
    || (row?.source_kind === 'imported_question' ? 'Imported question' : 'Question');

  const metaParts = [
    normalizeNullableString(row?.primary_topic_title),
    normalizeNullableString(row?.question_type),
    normalizeNullableString(row?.answer_form),
  ].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index && value !== title);

  return {
    title,
    meta_line: metaParts.length > 0 ? metaParts.join(' · ') : null,
    summary_line: normalizeCompactLine(row?.summary),
  };
}

function attachMatchContext(row, matchContext) {
  return {
    ...row,
    match_context: {
      filters_applied: [...matchContext.filters_applied],
      text_query_used: matchContext.text_query_used,
    },
  };
}

function paginateRows(rows, page, pageSize) {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export async function searchQuestions(client, input = {}, options = {}) {
  const normalizedFilters = normalizeQuestionSearchInput(input);
  const productMode = options.productMode === true;
  const repositoryFilters = productMode
    ? { ...normalizedFilters, unpaged: true }
    : normalizedFilters;
  const { rows, total } = await searchQuestionProjection(client, repositoryFilters);
  const matchContext = buildMatchContext(normalizedFilters);
  const items = productMode
    ? paginateRows(
      rows
        .map((row) => ({
          ...attachMatchContext(row, matchContext),
          product_posture: buildProductPosture(row),
          product_card: buildProductCard(row),
          __sort_key: buildResultSortKey(row, normalizedFilters),
        }))
        .sort((left, right) => compareResultSortKeys(left.__sort_key, right.__sort_key))
        .map(({ __sort_key, ...row }) => row),
      normalizedFilters.page,
      normalizedFilters.page_size,
    )
    : rows.map((row) => attachMatchContext(row, matchContext));

  return {
    items,
    total,
    page: normalizedFilters.page,
    page_size: normalizedFilters.page_size,
    feature_flags: {
      question_search_product_enabled: productMode,
    },
  };
}
