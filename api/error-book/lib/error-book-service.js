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

function makeServiceError(status, code, message, details) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
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
      const records = await listPrimaryRecords(supabase, {
        userId,
        filters,
      });
      const items = await serializeRecords(supabase, userId, records);

      return serializeErrorBookList(items, {
        manual_first: true,
        auto_source_enabled: allowAutoSource,
        filters: toFilterMeta(filters),
      });
    },

    async createEntry({ userId, body = {} }) {
      const payload = validateCreatePayload(body, { allowAutoSource });
      const timestamp = now().toISOString();
      const insertPayload = {
        ...payload,
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

      const updatePayload = {
        ...validateUpdatePayload(body),
        updated_at: now().toISOString(),
      };

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
