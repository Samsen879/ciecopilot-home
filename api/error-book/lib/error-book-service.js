import {
  getPrimaryRecordById,
  listPrimaryRecords,
  loadEnrichmentMap,
  PRIMARY_RECORD_SELECT,
} from './error-book-read-model.js';
import {
  isAutoSourceEnabled,
  normalizeListFilters,
  validateCreatePayload,
  validateUpdatePayload,
} from './error-book-validator.js';
import {
  serializeErrorBookItem,
  serializeErrorBookList,
  serializeErrorBookSingle,
} from './error-book-serializer.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MAX_POST_FILTER_SCAN_LIMIT = 200;
const REVIEW_FIELD_NAMES = ['next_review_at', 'review_interval', 'last_reviewed_at'];

function makeServiceError(status, code, message, details) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
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

function normalizeNullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeIsoDate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function normalizeReviewInterval(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 365) {
    return 1;
  }
  return parsed;
}

function toTimestamp(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  const timestamp = parsed.getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function computeNextReviewAt(anchorIso, reviewInterval) {
  const anchorTimestamp = toTimestamp(anchorIso);
  if (anchorTimestamp === null) {
    return null;
  }
  return new Date(anchorTimestamp + reviewInterval * DAY_IN_MS).toISOString();
}

function resolveReviewFieldFromBody(body, fieldName) {
  if (hasOwn(body || {}, fieldName)) {
    return {
      provided: true,
      value: body[fieldName],
    };
  }

  const review = toObject(body?.review);
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

function needsReviewPostProcessing(filters) {
  return Boolean(
    filters.next_review_after ||
    filters.next_review_before ||
    filters.sort_by === 'next_review_at',
  );
}

/**
 * Scheduling contract:
 * 1) review_interval is always normalized to days in [1, 365], default 1.
 * 2) next_review_at precedence: explicit value first; otherwise derive from
 *    (last_reviewed_at || created_at) + review_interval.
 * 3) On PATCH, if caller changes last_reviewed_at or review_interval without
 *    explicitly setting next_review_at, next_review_at is recalculated.
 */
function normalizeScheduleMetadata(metadata, {
  createdAt,
  recalculateNextReviewAt = false,
  preserveExplicitNextReviewAt = false,
} = {}) {
  const nextMetadata = {
    ...toObject(metadata),
  };
  const review = {
    ...toObject(nextMetadata.review),
  };
  const hasExplicitNextReviewAt = hasOwn(review, 'next_review_at');
  const reviewInterval = normalizeReviewInterval(review.review_interval);
  const lastReviewedAt = normalizeIsoDate(review.last_reviewed_at);
  let nextReviewAt = normalizeIsoDate(review.next_review_at);

  if (!(preserveExplicitNextReviewAt && hasExplicitNextReviewAt)) {
    if (recalculateNextReviewAt || !nextReviewAt) {
      nextReviewAt = computeNextReviewAt(lastReviewedAt || createdAt, reviewInterval);
    }
  }

  review.review_interval = reviewInterval;
  review.last_reviewed_at = lastReviewedAt;
  review.next_review_at = nextReviewAt;
  review.misconception_tag = normalizeNullableString(review.misconception_tag);
  nextMetadata.review = review;

  return nextMetadata;
}

function mergeMetadata(baseMetadata, patchMetadata) {
  const base = toObject(baseMetadata);
  const patch = toObject(patchMetadata);
  const merged = {
    ...base,
    ...patch,
  };

  if (hasOwn(patch, 'review')) {
    merged.review = {
      ...toObject(base.review),
      ...toObject(patch.review),
    };
  }

  return merged;
}

function applyReviewFiltersAndSort(items, filters) {
  const afterTimestamp = toTimestamp(filters.next_review_after);
  const beforeTimestamp = toTimestamp(filters.next_review_before);
  let result = [...items];

  if (afterTimestamp !== null) {
    result = result.filter((item) => {
      const nextReviewTimestamp = toTimestamp(item?.next_review_at);
      return nextReviewTimestamp !== null && nextReviewTimestamp >= afterTimestamp;
    });
  }

  if (beforeTimestamp !== null) {
    result = result.filter((item) => {
      const nextReviewTimestamp = toTimestamp(item?.next_review_at);
      return nextReviewTimestamp !== null && nextReviewTimestamp <= beforeTimestamp;
    });
  }

  if (filters.sort_by === 'next_review_at') {
    const direction = filters.sort_order === 'desc' ? -1 : 1;
    result.sort((left, right) => {
      const leftTimestamp = toTimestamp(left?.next_review_at);
      const rightTimestamp = toTimestamp(right?.next_review_at);

      if (leftTimestamp === null && rightTimestamp === null) return 0;
      if (leftTimestamp === null) return 1;
      if (rightTimestamp === null) return -1;
      if (leftTimestamp === rightTimestamp) return 0;
      return leftTimestamp < rightTimestamp ? -1 * direction : 1 * direction;
    });
  }

  return result.slice(0, filters.limit);
}

function resolveUpdatePayload(body, existingRecord, now) {
  const validatedPayload = validateUpdatePayload(body);
  const payload = hasOwn(body, 'metadata') || !hasOwn(validatedPayload, 'metadata')
    ? validatedPayload
    : {
      ...validatedPayload,
      metadata: mergeMetadata(existingRecord?.metadata, validatedPayload.metadata),
    };
  const reviewFieldUpdates = REVIEW_FIELD_NAMES
    .map((fieldName) => resolveReviewFieldFromBody(body, fieldName))
    .filter((entry) => entry.provided);
  const reviewFieldsWerePatched = reviewFieldUpdates.length > 0;
  const nextReviewWasPatched = resolveReviewFieldFromBody(body, 'next_review_at').provided;
  const scheduleShouldRecalculate =
    reviewFieldUpdates.some((entry) =>
      entry.value !== undefined && entry.value !== null && entry.value !== '',
    ) && !nextReviewWasPatched;

  if (hasOwn(payload, 'metadata') && reviewFieldsWerePatched) {
    payload.metadata = normalizeScheduleMetadata(payload.metadata, {
      createdAt: normalizeIsoDate(existingRecord?.created_at),
      recalculateNextReviewAt: scheduleShouldRecalculate,
      preserveExplicitNextReviewAt: nextReviewWasPatched,
    });
  }

  return {
    ...payload,
    updated_at: now().toISOString(),
  };
}

function isDuplicateError(error) {
  return error?.code === '23505' || /duplicate|unique/i.test(error?.message || '');
}

function assertOwnership(record, userId) {
  if (!record) {
    throw makeServiceError(404, 'not_found', 'Error Book item not found.');
  }
  if (String(record.user_id) !== String(userId)) {
    throw makeServiceError(403, 'ownership_forbidden', 'You do not own this Error Book item.');
  }
}

function toFilterMeta(filters) {
  return {
    source: filters.source,
    status: filters.status,
    syllabus_code: filters.syllabus_code,
    node_id: filters.node_id,
    paper: filters.paper,
    q_number: filters.q_number,
    created_after: filters.created_after,
    created_before: filters.created_before,
    next_review_after: filters.next_review_after,
    next_review_before: filters.next_review_before,
    sort_by: filters.sort_by,
    sort_order: filters.sort_order,
    is_starred: filters.is_starred,
    storage_key: filters.storage_key,
    limit: filters.limit,
  };
}

async function serializeRecords(supabase, userId, records) {
  const enrichmentMap = await loadEnrichmentMap(supabase, {
    userId,
    records,
  });

  return records.map((record) =>
    serializeErrorBookItem(record, enrichmentMap.get(record.id) || {}),
  );
}

export function createErrorBookService({ supabase, now = () => new Date(), logger = console, allowAutoSource = isAutoSourceEnabled() } = {}) {
  if (!supabase) {
    throw makeServiceError(500, 'supabase_not_configured', 'Supabase service client is not configured.');
  }

  return {
    async listEntries({ userId, query = {} }) {
      const filters = normalizeListFilters(query, { allowAutoSource });
      const shouldPostProcess = needsReviewPostProcessing(filters);
      const records = await listPrimaryRecords(supabase, {
        userId,
        filters: shouldPostProcess
          ? {
            ...filters,
            limit: Math.max(filters.limit, MAX_POST_FILTER_SCAN_LIMIT),
          }
          : filters,
      });
      const serialized = await serializeRecords(supabase, userId, records);
      const items = shouldPostProcess
        ? applyReviewFiltersAndSort(serialized, filters)
        : serialized;

      return serializeErrorBookList(items, {
        manual_first: true,
        auto_source_enabled: allowAutoSource,
        filters: toFilterMeta(filters),
      });
    },

    async createEntry({ userId, body = {} }) {
      const payload = validateCreatePayload(body, { allowAutoSource });
      const timestamp = now().toISOString();
      const metadata = normalizeScheduleMetadata(payload.metadata, {
        createdAt: timestamp,
      });
      const insertPayload = {
        ...payload,
        metadata,
        user_id: userId,
        created_at: timestamp,
        updated_at: timestamp,
      };

      const { data, error } = await supabase
        .from('user_errors')
        .insert(insertPayload)
        .select(PRIMARY_RECORD_SELECT)
        .single();

      if (error) {
        if (isDuplicateError(error)) {
          throw makeServiceError(409, 'duplicate_error_entry', error.message || 'Duplicate Error Book entry.');
        }
        throw makeServiceError(500, 'insert_failed', error.message || 'Failed to create Error Book entry.');
      }

      return serializeErrorBookSingle(serializeErrorBookItem(data));
    },

    async getEntry({ userId, id }) {
      const record = await getPrimaryRecordById(supabase, id);
      assertOwnership(record, userId);

      const [item] = await serializeRecords(supabase, userId, [record]);
      return serializeErrorBookSingle(item);
    },

    async updateEntry({ userId, id, body = {} }) {
      const existing = await getPrimaryRecordById(supabase, id);
      assertOwnership(existing, userId);

      if (existing.source === 'mark_engine_auto') {
        logger.warn(
          JSON.stringify({
            level: 'warn',
            event: 'patch_auto_record',
            id,
            user_id: userId,
            source: existing.source,
            message: 'PATCH applied to auto-generated Error Book record.',
          }),
        );
      }

      const updatePayload = resolveUpdatePayload(body, existing, now);

      const { data, error } = await supabase
        .from('user_errors')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', userId)
        .select(PRIMARY_RECORD_SELECT)
        .single();

      if (error) {
        throw makeServiceError(500, 'update_failed', error.message || 'Failed to update Error Book entry.');
      }

      const [item] = await serializeRecords(supabase, userId, [data]);
      return serializeErrorBookSingle(item);
    },

    async deleteEntry({ userId, id }) {
      const existing = await getPrimaryRecordById(supabase, id);
      assertOwnership(existing, userId);

      if (existing.source === 'mark_engine_auto') {
        logger.warn(
          JSON.stringify({
            level: 'warn',
            event: 'delete_auto_record',
            id,
            user_id: userId,
            source: existing.source,
            message: 'DELETE applied to auto-generated Error Book record.',
          }),
        );
      }

      const { error } = await supabase
        .from('user_errors')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        throw makeServiceError(500, 'delete_failed', error.message || 'Failed to delete Error Book entry.');
      }

      return {
        ok: true,
        deleted_id: id,
      };
    },
  };
}
