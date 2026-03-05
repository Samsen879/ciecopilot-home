const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;
const ALLOWED_SOURCES = new Set(['manual', 'mark_engine_auto', 'all']);
const WRITABLE_SOURCES = new Set(['manual', 'mark_engine_auto']);
const ALLOWED_STATUSES = new Set(['unresolved', 'reviewing', 'resolved']);
const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const MIN_REVIEW_INTERVAL = 1;
const MAX_REVIEW_INTERVAL = 365;
const DEFAULT_REVIEW_INTERVAL = 1;
const REVIEW_FIELDS = ['next_review_at', 'review_interval', 'last_reviewed_at', 'misconception_tag'];
const ALLOWED_LIST_SORT_FIELDS = new Set(['next_review_at']);
const ALLOWED_LIST_SORT_ORDERS = new Set(['asc', 'desc']);

export class ValidationError extends Error {
  constructor(message, { status = 400, code = 'bad_request', details } = {}) {
    super(message);
    this.name = 'ValidationError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function normalizeString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function normalizeNullableString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeInteger(value, fieldName, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`${fieldName} must be an integer.`, {
      code: 'bad_request',
      details: { field: fieldName },
    });
  }
  if (parsed < min || parsed > max) {
    throw new ValidationError(`${fieldName} is out of range.`, {
      code: 'bad_request',
      details: { field: fieldName, min, max },
    });
  }

  return parsed;
}

function normalizeBoolean(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = normalizeString(value).toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no'].includes(normalized)) {
    return false;
  }

  throw new ValidationError(`${fieldName} must be a boolean.`, {
    code: 'bad_request',
    details: { field: fieldName },
  });
}

function normalizeDate(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid ISO-8601 date.`, {
      code: 'bad_request',
      details: { field: fieldName },
    });
  }

  return parsed.toISOString();
}

function normalizeSortField(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = normalizeString(value).toLowerCase();
  if (!ALLOWED_LIST_SORT_FIELDS.has(normalized)) {
    throw new ValidationError('sort_by is invalid.', {
      code: 'bad_request',
      details: { field: 'sort_by', allowed: [...ALLOWED_LIST_SORT_FIELDS] },
    });
  }

  return normalized;
}

function normalizeSortOrder(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = normalizeString(value).toLowerCase();
  if (!ALLOWED_LIST_SORT_ORDERS.has(normalized)) {
    throw new ValidationError('sort_order is invalid.', {
      code: 'bad_request',
      details: { field: 'sort_order', allowed: [...ALLOWED_LIST_SORT_ORDERS] },
    });
  }

  return normalized;
}

function normalizeTags(value) {
  if (value === null || value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ValidationError('tags must be an array of strings.', {
      code: 'bad_request',
      details: { field: 'tags' },
    });
  }

  return value
    .map((entry) => normalizeString(entry))
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeMetadata(value) {
  if (value === null || value === undefined) {
    return {};
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('metadata must be an object.', {
      code: 'bad_request',
      details: { field: 'metadata' },
    });
  }
  return value;
}

function toObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value;
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function resolveReviewField(body, fieldName) {
  if (hasOwn(body, fieldName)) {
    return {
      provided: true,
      value: body[fieldName],
    };
  }

  const review = toObject(body.review);
  if (hasOwn(review, fieldName)) {
    return {
      provided: true,
      value: review[fieldName],
    };
  }

  return {
    provided: false,
    value: undefined,
  };
}

function normalizeReviewField(fieldName, value) {
  if (fieldName === 'next_review_at' || fieldName === 'last_reviewed_at') {
    return normalizeDate(value, fieldName);
  }
  if (fieldName === 'review_interval') {
    return normalizeInteger(value, fieldName, {
      min: MIN_REVIEW_INTERVAL,
      max: MAX_REVIEW_INTERVAL,
    });
  }
  if (fieldName === 'misconception_tag') {
    return normalizeNullableString(value);
  }
  return value;
}

function normalizeReviewPatch(body = {}) {
  const patch = {};
  for (const fieldName of REVIEW_FIELDS) {
    const { provided, value } = resolveReviewField(body, fieldName);
    if (!provided) {
      continue;
    }
    patch[fieldName] = normalizeReviewField(fieldName, value);
  }
  return patch;
}

function mergeReviewMetadata(metadata, reviewPatch, { applyDefaults = false } = {}) {
  const nextMetadata = { ...metadata };
  const mergedReview = {
    ...toObject(nextMetadata.review),
  };

  for (const fieldName of REVIEW_FIELDS) {
    if (hasOwn(reviewPatch, fieldName)) {
      mergedReview[fieldName] = reviewPatch[fieldName];
    }
  }

  if (applyDefaults) {
    if (!hasOwn(mergedReview, 'review_interval')) {
      mergedReview.review_interval = DEFAULT_REVIEW_INTERVAL;
    }
    if (!hasOwn(mergedReview, 'next_review_at')) {
      mergedReview.next_review_at = null;
    }
    if (!hasOwn(mergedReview, 'last_reviewed_at')) {
      mergedReview.last_reviewed_at = null;
    }
    if (!hasOwn(mergedReview, 'misconception_tag')) {
      mergedReview.misconception_tag = null;
    }
  }

  if (Object.keys(mergedReview).length > 0) {
    nextMetadata.review = mergedReview;
  }

  return nextMetadata;
}

function normalizeStatus(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = normalizeString(value).toLowerCase();
  if (!ALLOWED_STATUSES.has(normalized)) {
    throw new ValidationError('status is invalid.', {
      code: 'bad_request',
      details: { field: 'status', allowed: [...ALLOWED_STATUSES] },
    });
  }
  return normalized;
}

function normalizeDifficulty(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = normalizeString(value).toLowerCase();
  if (!ALLOWED_DIFFICULTIES.has(normalized)) {
    throw new ValidationError('difficulty_level is invalid.', {
      code: 'bad_request',
      details: { field: 'difficulty_level', allowed: [...ALLOWED_DIFFICULTIES] },
    });
  }
  return normalized;
}

function normalizeSource(value, { allowAll = false, allowAutoSource = false } = {}) {
  const normalized = normalizeString(value || 'manual').toLowerCase();
  const allowedSet = allowAll ? ALLOWED_SOURCES : WRITABLE_SOURCES;

  if (!allowedSet.has(normalized)) {
    throw new ValidationError('source is invalid.', {
      code: 'invalid_source',
      details: { field: 'source', allowed: [...allowedSet] },
    });
  }

  if (normalized !== 'manual' && !allowAutoSource) {
    throw new ValidationError('Automatic sources are disabled for the manual-first Error Book contract.', {
      status: 403,
      code: 'auto_source_disabled',
      details: { field: 'source', source: normalized, feature_flag: 'ERROR_BOOK_ALLOW_AUTO_SOURCE' },
    });
  }

  return normalized;
}

export function isAutoSourceEnabled() {
  return process.env.ERROR_BOOK_ALLOW_AUTO_SOURCE === 'true';
}

export function normalizeListFilters(query = {}, options = {}) {
  const allowAutoSource = options.allowAutoSource ?? isAutoSourceEnabled();
  const limit = normalizeInteger(query.limit ?? DEFAULT_LIMIT, 'limit', {
    min: 1,
    max: MAX_LIMIT,
  }) ?? DEFAULT_LIMIT;

  const filters = {
    limit,
    source: normalizeSource(query.source || 'manual', {
      allowAll: true,
      allowAutoSource,
    }),
    status: normalizeStatus(query.status),
    syllabus_code: normalizeNullableString(query.syllabus_code || query.subject_code),
    node_id: normalizeNullableString(query.node_id),
    paper: normalizeInteger(query.paper, 'paper', { min: 1, max: 6 }),
    q_number: normalizeInteger(query.q_number, 'q_number', { min: 1, max: 500 }),
    created_after: normalizeDate(query.created_after, 'created_after'),
    created_before: normalizeDate(query.created_before, 'created_before'),
    next_review_after: normalizeDate(query.next_review_after, 'next_review_after'),
    next_review_before: normalizeDate(query.next_review_before, 'next_review_before'),
    sort_by: normalizeSortField(query.sort_by),
    sort_order: normalizeSortOrder(query.sort_order),
    is_starred: normalizeBoolean(query.is_starred, 'is_starred'),
    storage_key: normalizeNullableString(query.storage_key),
  };

  if (filters.created_after && filters.created_before && filters.created_after > filters.created_before) {
    throw new ValidationError('created_after cannot be later than created_before.', {
      code: 'bad_request',
      details: {
        created_after: filters.created_after,
        created_before: filters.created_before,
      },
    });
  }

  if (filters.next_review_after && filters.next_review_before && filters.next_review_after > filters.next_review_before) {
    throw new ValidationError('next_review_after cannot be later than next_review_before.', {
      code: 'bad_request',
      details: {
        next_review_after: filters.next_review_after,
        next_review_before: filters.next_review_before,
      },
    });
  }

  if (!filters.sort_by && filters.sort_order) {
    throw new ValidationError('sort_order requires sort_by.', {
      code: 'bad_request',
      details: {
        field: 'sort_order',
      },
    });
  }

  return filters;
}

export function validateCreatePayload(body = {}, options = {}) {
  const allowAutoSource = options.allowAutoSource ?? isAutoSourceEnabled();
  const question = normalizeString(body.question);

  if (!question) {
    throw new ValidationError('question is required.', {
      code: 'bad_request',
      details: { field: 'question' },
    });
  }

  const syllabusCode = normalizeNullableString(body.syllabus_code || body.subject_code);
  const metadata = mergeReviewMetadata(
    normalizeMetadata(body.metadata),
    normalizeReviewPatch(body),
    { applyDefaults: true },
  );

  return {
    subject_code: normalizeNullableString(body.subject_code) || syllabusCode,
    syllabus_code: syllabusCode,
    paper: normalizeInteger(body.paper, 'paper', { min: 1, max: 6 }),
    paper_id: normalizeNullableString(body.paper_id),
    q_number: normalizeInteger(body.q_number, 'q_number', { min: 1, max: 500 }),
    topic_id: normalizeNullableString(body.topic_id),
    topic_name: normalizeNullableString(body.topic_name),
    question,
    correct_answer: normalizeNullableString(body.correct_answer),
    user_answer: normalizeNullableString(body.user_answer),
    explanation: normalizeNullableString(body.explanation),
    error_type: normalizeNullableString(body.error_type) || 'unknown',
    difficulty_level: normalizeDifficulty(body.difficulty_level) || 'medium',
    tags: normalizeTags(body.tags),
    status: normalizeStatus(body.status) || 'unresolved',
    review_count: 0,
    is_starred: Boolean(body.is_starred),
    notes: normalizeNullableString(body.notes),
    storage_key: normalizeNullableString(body.storage_key),
    node_id: normalizeNullableString(body.node_id),
    source: normalizeSource(body.source || 'manual', {
      allowAutoSource,
    }),
    metadata,
  };
}

export function validateUpdatePayload(body = {}) {
  if (body.source !== undefined) {
    throw new ValidationError('source cannot be changed after creation.', {
      code: 'source_immutable',
      details: { field: 'source' },
    });
  }

  const payload = {};
  const reviewPatch = normalizeReviewPatch(body);

  if (body.question !== undefined) {
    const question = normalizeString(body.question);
    if (!question) {
      throw new ValidationError('question cannot be empty.', {
        code: 'bad_request',
        details: { field: 'question' },
      });
    }
    payload.question = question;
  }
  if (body.status !== undefined) payload.status = normalizeStatus(body.status);
  if (body.review_count !== undefined) {
    payload.review_count = normalizeInteger(body.review_count, 'review_count', { min: 0, max: 10000 }) ?? 0;
  }
  if (body.is_starred !== undefined) payload.is_starred = normalizeBoolean(body.is_starred, 'is_starred');
  if (body.notes !== undefined) payload.notes = normalizeNullableString(body.notes);
  if (body.user_answer !== undefined) payload.user_answer = normalizeNullableString(body.user_answer);
  if (body.correct_answer !== undefined) payload.correct_answer = normalizeNullableString(body.correct_answer);
  if (body.explanation !== undefined) payload.explanation = normalizeNullableString(body.explanation);
  if (body.error_type !== undefined) payload.error_type = normalizeNullableString(body.error_type);
  if (body.difficulty_level !== undefined) payload.difficulty_level = normalizeDifficulty(body.difficulty_level);
  if (body.tags !== undefined) payload.tags = normalizeTags(body.tags);
  if (body.storage_key !== undefined) payload.storage_key = normalizeNullableString(body.storage_key);
  if (body.node_id !== undefined) payload.node_id = normalizeNullableString(body.node_id);
  if (body.metadata !== undefined) payload.metadata = normalizeMetadata(body.metadata);
  if (Object.keys(reviewPatch).length > 0) {
    payload.metadata = mergeReviewMetadata(payload.metadata || {}, reviewPatch);
  }
  if (body.topic_id !== undefined) payload.topic_id = normalizeNullableString(body.topic_id);
  if (body.topic_name !== undefined) payload.topic_name = normalizeNullableString(body.topic_name);
  if (body.paper !== undefined) payload.paper = normalizeInteger(body.paper, 'paper', { min: 1, max: 6 });
  if (body.paper_id !== undefined) payload.paper_id = normalizeNullableString(body.paper_id);
  if (body.q_number !== undefined) payload.q_number = normalizeInteger(body.q_number, 'q_number', { min: 1, max: 500 });

  if (Object.keys(payload).length === 0) {
    throw new ValidationError('PATCH payload is empty.', {
      code: 'empty_patch',
    });
  }

  return payload;
}
