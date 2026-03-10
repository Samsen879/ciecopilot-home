const PRIMARY_RECORD_SELECT = [
  'id',
  'user_id',
  'subject_code',
  'syllabus_code',
  'paper',
  'paper_id',
  'q_number',
  'topic_id',
  'topic_name',
  'question',
  'correct_answer',
  'user_answer',
  'explanation',
  'error_type',
  'difficulty_level',
  'tags',
  'status',
  'review_count',
  'is_starred',
  'notes',
  'storage_key',
  'node_id',
  'source',
  'metadata',
  'created_at',
  'updated_at',
].join(',');

const ATTEMPT_SELECT = [
  'attempt_id',
  'user_id',
  'question_id',
  'paper_id',
  'storage_key',
  'q_number',
  'subpart',
  'syllabus_code',
  'node_id',
  'topic_path',
  'created_at',
].join(',');

const MARK_DECISION_SELECT = [
  'mark_decision_id',
  'mark_run_id',
  'rubric_id',
  'mark_label',
  'awarded',
  'awarded_marks',
  'reason',
  'created_at',
].join(',');

const MARK_RUN_SELECT = [
  'mark_run_id',
  'attempt_id',
  'created_at',
].join(',');

const ERROR_EVENT_SELECT = [
  'error_event_id',
  'user_id',
  'attempt_id',
  'mark_decision_id',
  'topic_path',
  'node_id',
  'misconception_tag',
  'severity',
  'created_at',
].join(',');

function makeError(code, message, details) {
  const error = new Error(message);
  error.status = 500;
  error.code = code;
  error.details = details;
  return error;
}

function metadataOf(record) {
  const value = record?.metadata;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value;
}

function indexBy(rows, keyField) {
  const map = new Map();
  for (const row of rows || []) {
    const key = row?.[keyField];
    if (key && !map.has(key)) {
      map.set(key, row);
    }
  }
  return map;
}

function keyOfStorageQuestion(storageKey, qNumber) {
  return `${storageKey || ''}::${qNumber ?? ''}`;
}

function indexLatestByStorageQuestion(rows) {
  const map = new Map();
  for (const row of rows || []) {
    if (!row?.storage_key) {
      continue;
    }
    const key = keyOfStorageQuestion(row.storage_key, row.q_number);
    if (!map.has(key)) {
      map.set(key, row);
    }
  }
  return map;
}

function upsertFirst(map, key, row) {
  if (key && row && !map.has(key)) {
    map.set(key, row);
  }
}

function pushUnique(target, seen, value) {
  if (!value || seen.has(value)) {
    return;
  }
  seen.add(value);
  target.push(value);
}

function buildBaseQuery(supabase, userId, filters) {
  let query = supabase
    .from('user_errors')
    .select(PRIMARY_RECORD_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(filters.limit);

  if (filters.source === 'manual' || filters.source === 'mark_engine_auto') {
    query = query.eq('source', filters.source);
  }
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.syllabus_code) query = query.eq('syllabus_code', filters.syllabus_code);
  if (filters.node_id) query = query.eq('node_id', filters.node_id);
  if (Number.isFinite(filters.paper)) query = query.eq('paper', filters.paper);
  if (Number.isFinite(filters.q_number)) query = query.eq('q_number', filters.q_number);
  if (typeof filters.is_starred === 'boolean') query = query.eq('is_starred', filters.is_starred);
  if (filters.storage_key) query = query.eq('storage_key', filters.storage_key);
  if (filters.created_after) query = query.gte('created_at', filters.created_after);
  if (filters.created_before) query = query.lte('created_at', filters.created_before);

  return query;
}

export async function listPrimaryRecords(supabase, { userId, filters }) {
  const { data, error } = await buildBaseQuery(supabase, userId, filters);
  if (error) {
    throw makeError('error_book_read_failed', error.message || 'Failed to load Error Book items.');
  }
  return data || [];
}

export async function getPrimaryRecordById(supabase, id) {
  const { data, error } = await supabase
    .from('user_errors')
    .select(PRIMARY_RECORD_SELECT)
    .eq('id', id)
    .single();

  if (error && data === null) {
    return null;
  }
  if (error) {
    throw makeError('error_book_read_failed', error.message || 'Failed to load Error Book item.');
  }

  return data || null;
}

async function fetchAttemptsByIds(supabase, userId, attemptIds) {
  if (attemptIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('attempts')
    .select(ATTEMPT_SELECT)
    .eq('user_id', userId)
    .in('attempt_id', attemptIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw makeError('error_book_attempt_enrichment_failed', error.message || 'Failed to load attempt enrichment.');
  }

  return data || [];
}

async function fetchAttemptsByStorageKeys(supabase, userId, storageKeys) {
  if (storageKeys.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('attempts')
    .select(ATTEMPT_SELECT)
    .eq('user_id', userId)
    .in('storage_key', storageKeys)
    .order('created_at', { ascending: false });

  if (error) {
    throw makeError('error_book_attempt_enrichment_failed', error.message || 'Failed to load attempt enrichment.');
  }

  return data || [];
}

async function fetchMarkRunsByAttemptIds(supabase, attemptIds) {
  if (attemptIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('mark_runs')
    .select(MARK_RUN_SELECT)
    .in('attempt_id', attemptIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw makeError('error_book_mark_run_enrichment_failed', error.message || 'Failed to load mark-run enrichment.');
  }

  return data || [];
}

async function fetchMarkDecisions(supabase, markDecisionIds, markRunIds) {
  if (markDecisionIds.length === 0 || markRunIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('mark_decisions')
    .select(MARK_DECISION_SELECT)
    .in('mark_decision_id', markDecisionIds)
    .in('mark_run_id', markRunIds);

  if (error) {
    throw makeError('error_book_decision_enrichment_failed', error.message || 'Failed to load mark decision enrichment.');
  }

  return data || [];
}

async function fetchErrorEventsByIds(supabase, userId, errorEventIds) {
  if (errorEventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('error_events')
    .select(ERROR_EVENT_SELECT)
    .eq('user_id', userId)
    .in('error_event_id', errorEventIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw makeError('error_book_event_enrichment_failed', error.message || 'Failed to load error-event enrichment.');
  }

  return data || [];
}

async function fetchErrorEventsByAttemptIds(supabase, userId, attemptIds) {
  if (attemptIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('error_events')
    .select(ERROR_EVENT_SELECT)
    .eq('user_id', userId)
    .in('attempt_id', attemptIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw makeError('error_book_event_enrichment_failed', error.message || 'Failed to load error-event enrichment.');
  }

  return data || [];
}

async function fetchErrorEventsByDecisionIds(supabase, userId, markDecisionIds) {
  if (markDecisionIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('error_events')
    .select(ERROR_EVENT_SELECT)
    .eq('user_id', userId)
    .in('mark_decision_id', markDecisionIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw makeError('error_book_event_enrichment_failed', error.message || 'Failed to load error-event enrichment.');
  }

  return data || [];
}

export async function loadEnrichmentMap(supabase, { userId, records }) {
  if (!Array.isArray(records) || records.length === 0) {
    return new Map();
  }

  const attemptIds = new Set();
  const markDecisionIds = new Set();
  const errorEventIds = new Set();
  const storageKeys = new Set();

  for (const record of records) {
    const metadata = metadataOf(record);
    if (metadata.attempt_id) attemptIds.add(metadata.attempt_id);
    if (metadata.mark_decision_id) markDecisionIds.add(metadata.mark_decision_id);
    if (metadata.error_event_id) errorEventIds.add(metadata.error_event_id);
    if (record?.storage_key) storageKeys.add(record.storage_key);
  }

  const attemptsById = new Map();
  for (const row of await fetchAttemptsByIds(supabase, userId, [...attemptIds])) {
    upsertFirst(attemptsById, row.attempt_id, row);
  }

  const storageAttempts = await fetchAttemptsByStorageKeys(supabase, userId, [...storageKeys]);
  const attemptsByStorageKeyQuestion = indexLatestByStorageQuestion(storageAttempts);
  for (const row of storageAttempts) {
    upsertFirst(attemptsById, row.attempt_id, row);
  }

  const errorEventsById = new Map();
  const errorEventsByAttemptId = new Map();
  const errorEventsByMarkDecisionId = new Map();
  const allErrorEvents = [];

  const knownAttemptIds = new Set(attemptsById.keys());
  for (const row of await fetchErrorEventsByIds(supabase, userId, [...errorEventIds])) {
    upsertFirst(errorEventsById, row.error_event_id, row);
    allErrorEvents.push(row);
  }
  for (const row of await fetchErrorEventsByAttemptIds(supabase, userId, [...knownAttemptIds])) {
    upsertFirst(errorEventsByAttemptId, row.attempt_id, row);
    upsertFirst(errorEventsById, row.error_event_id, row);
    allErrorEvents.push(row);
  }
  for (const row of await fetchErrorEventsByDecisionIds(supabase, userId, [...markDecisionIds])) {
    upsertFirst(errorEventsByMarkDecisionId, row.mark_decision_id, row);
    upsertFirst(errorEventsById, row.error_event_id, row);
    allErrorEvents.push(row);
  }

  const supplementalAttemptIds = [];
  const supplementalAttemptSeen = new Set();
  for (const row of allErrorEvents) {
    const attemptId = row?.attempt_id;
    if (attemptId && !knownAttemptIds.has(attemptId) && !supplementalAttemptSeen.has(attemptId)) {
      supplementalAttemptSeen.add(attemptId);
      supplementalAttemptIds.push(attemptId);
    }
  }

  for (const row of await fetchAttemptsByIds(supabase, userId, supplementalAttemptIds)) {
    upsertFirst(attemptsById, row.attempt_id, row);
    if (row?.storage_key) {
      upsertFirst(
        attemptsByStorageKeyQuestion,
        keyOfStorageQuestion(row.storage_key, row.q_number),
        row,
      );
    }
  }

  const markRunIds = [];
  const seenMarkRunIds = new Set();
  for (const row of await fetchMarkRunsByAttemptIds(supabase, [...attemptsById.keys()])) {
    pushUnique(markRunIds, seenMarkRunIds, row?.mark_run_id);
  }

  const candidateMarkDecisionIds = [];
  const seenMarkDecisionIds = new Set();
  for (const markDecisionId of markDecisionIds) {
    pushUnique(candidateMarkDecisionIds, seenMarkDecisionIds, markDecisionId);
  }
  for (const row of allErrorEvents) {
    pushUnique(candidateMarkDecisionIds, seenMarkDecisionIds, row?.mark_decision_id);
  }

  const markDecisionsById = indexBy(
    await fetchMarkDecisions(supabase, candidateMarkDecisionIds, markRunIds),
    'mark_decision_id',
  );

  const result = new Map();

  for (const record of records) {
    const metadata = metadataOf(record);
    let attempt =
      attemptsById.get(metadata.attempt_id) ||
      attemptsByStorageKeyQuestion.get(keyOfStorageQuestion(record?.storage_key, record?.q_number)) ||
      null;

    let errorEvent = errorEventsById.get(metadata.error_event_id) || null;
    if (!attempt && errorEvent?.attempt_id) {
      attempt = attemptsById.get(errorEvent.attempt_id) || null;
    }

    let markDecision = markDecisionsById.get(metadata.mark_decision_id) || null;
    if (!markDecision && errorEvent?.mark_decision_id) {
      markDecision = markDecisionsById.get(errorEvent.mark_decision_id) || null;
    }
    if (!errorEvent && attempt) {
      errorEvent = errorEventsByAttemptId.get(attempt.attempt_id) || null;
    }
    if (!errorEvent && markDecision) {
      errorEvent = errorEventsByMarkDecisionId.get(markDecision.mark_decision_id) || null;
    }
    if (!attempt && errorEvent?.attempt_id) {
      attempt = attemptsById.get(errorEvent.attempt_id) || null;
    }

    result.set(record.id, {
      attempt,
      markDecision,
      errorEvent,
    });
  }

  return result;
}

export { PRIMARY_RECORD_SELECT };
