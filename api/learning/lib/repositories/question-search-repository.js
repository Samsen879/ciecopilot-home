const QUESTION_SEARCH_PROJECTION = 'learning_question_search_projection';

function normalizeNullableString(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}

function escapeLikePattern(value) {
  return String(value).replace(/[\\%_]/g, '\\$&');
}

export async function searchQuestionProjection(client, filters = {}) {
  const page = Number.isInteger(filters.page) && filters.page > 0 ? filters.page : 1;
  const pageSize = Number.isInteger(filters.page_size) && filters.page_size > 0
    ? filters.page_size
    : 20;
  const unpaged = filters.unpaged === true;
  const rangeStart = (page - 1) * pageSize;
  const rangeEnd = rangeStart + pageSize - 1;

  let query = client
    .from(QUESTION_SEARCH_PROJECTION)
    .select('*', { count: 'exact' });

  const structuredFilters = [
    ['subject_code', filters.subject_code],
    ['primary_topic_id', filters.primary_topic_id],
    ['family_id', filters.family_id],
    ['primary_question_type_id', filters.primary_question_type_id],
    ['year', filters.year],
    ['session', filters.session],
    ['paper_number', filters.paper_number],
    ['variant', filters.variant],
    ['q_number', filters.q_number],
  ];

  for (const [field, value] of structuredFilters) {
    if (value !== null && typeof value !== 'undefined') {
      query = query.eq(field, value);
    }
  }

  const textQuery = normalizeNullableString(filters.query);
  if (textQuery) {
    // V1 tradeoff: pilot-scale retrieval uses ILIKE on search_text only.
    query = query.ilike('search_text', `%${escapeLikePattern(textQuery)}%`);
  }

  let orderedQuery = query.order('question_id', { ascending: true });
  if (!unpaged) {
    orderedQuery = orderedQuery.range(rangeStart, rangeEnd);
  }

  const { data, count, error } = await orderedQuery;

  if (error) {
    throw new Error(`Failed to search question projection: ${error.message}`);
  }

  return {
    total: Number.isInteger(count) ? count : 0,
    rows: Array.isArray(data) ? data : [],
  };
}
