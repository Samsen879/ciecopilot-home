// api/marking/lib/attempt-repository.js
// Attempt Repository — creates/reuses attempt records with idempotency,
// resolves topic_path from question_concept_links + curriculum_nodes,
// and resolves question_id from the question bank mapping.

// ── Custom error class for validation failures ──────────────────────────────
export class ValidationError extends Error {
  /**
   * @param {string} message
   * @param {number} [status=422]
   */
  constructor(message, status = 422) {
    super(message);
    this.name = 'ValidationError';
    this.status = status;
  }
}

function isMissingRelationError(error, relationName) {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '').toLowerCase();
  if (code === '42P01') return true;
  return message.includes('relation') && message.includes(relationName.toLowerCase());
}

// ── Source priority for topic_path resolution ───────────────────────────────
const SOURCE_PRIORITY = ['ai_agent_reclassify', 'a1_keyword_mapper_v1'];

/**
 * Parse syllabus_code from a storage_key.
 * Example: "9709/s22/qp11/q01.png" → "9709"
 *
 * @param {string} storageKey
 * @returns {string} syllabus code (first segment before "/")
 * @throws {ValidationError} when storageKey is empty or has no valid code
 */
export function parseSyllabusCode(storageKey) {
  if (!storageKey || typeof storageKey !== 'string') {
    throw new ValidationError('storage_key is required and must be a non-empty string.');
  }

  const code = storageKey.split('/')[0].trim();
  if (!code) {
    throw new ValidationError(`Cannot parse syllabus_code from storage_key: "${storageKey}".`);
  }

  return code;
}

/**
 * Resolve topic_path by JOINing question_concept_links + curriculum_nodes.
 *
 * Priority: ai_agent_reclassify > a1_keyword_mapper_v1 > others
 * Same priority: confidence DESC, updated_at DESC
 * Takes the first result.
 *
 * @param {object} supabase - Supabase client
 * @param {string} storageKey
 * @returns {Promise<{node_id: string|null, topic_path: string|null, topic_source: string|null, topic_confidence: number|null, topic_resolved_at: string|null}>}
 */
export async function resolveTopicPath(supabase, storageKey) {
  const nullResult = {
    node_id: null,
    topic_path: null,
    topic_source: null,
    topic_confidence: null,
    topic_resolved_at: null,
  };

  try {
    const { data, error } = await supabase
      .from('question_concept_links')
      .select('node_id, source, confidence, updated_at, curriculum_nodes(topic_path)')
      .eq('storage_key', storageKey)
      .eq('link_type', 'primary');

    if (error) {
      console.error(JSON.stringify({
        event: 'attempt_repo_topic_path_query_error',
        storage_key: storageKey,
        error: error.message,
        ts: new Date().toISOString(),
      }));
      return nullResult;
    }

    if (!data || data.length === 0) {
      return nullResult;
    }

    // Sort by source priority, then confidence DESC, then updated_at DESC
    const sorted = [...data].sort((a, b) => {
      const idxA = SOURCE_PRIORITY.indexOf(a.source);
      const idxB = SOURCE_PRIORITY.indexOf(b.source);
      const prioA = idxA === -1 ? SOURCE_PRIORITY.length : idxA;
      const prioB = idxB === -1 ? SOURCE_PRIORITY.length : idxB;
      if (prioA !== prioB) return prioA - prioB;

      // confidence DESC (higher first)
      const confA = a.confidence ?? -1;
      const confB = b.confidence ?? -1;
      if (confB !== confA) return confB - confA;

      // updated_at DESC (more recent first)
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateB - dateA;
    });

    const best = sorted[0];
    const topicPath = best.curriculum_nodes?.topic_path ?? null;

    return {
      node_id: best.node_id || null,
      topic_path: topicPath,
      topic_source: best.source || null,
      topic_confidence: best.confidence ?? null,
      topic_resolved_at: best.updated_at || null,
    };
  } catch (err) {
    console.error(JSON.stringify({
      event: 'attempt_repo_topic_path_resolve_error',
      storage_key: storageKey,
      error: err?.message || String(err),
      ts: new Date().toISOString(),
    }));
    return nullResult;
  }
}

/**
 * Resolve question_id and paper_id from the question bank mapping.
 *
 * Resolution strategy:
 * 1) question_bank mapping table (preferred)
 * 2) asset_files fallback (question_id := asset_files.id, paper_id := asset_files.paper_id)
 *    for environments that have not yet populated question_bank
 *
 * Throws ValidationError (HTTP 422) if no mapping is found.
 *
 * @param {object} supabase - Supabase client
 * @param {string} storageKey
 * @param {number} qNumber
 * @returns {Promise<{question_id: string, paper_id: string|null}>}
 * @throws {ValidationError} when no mapping is found (HTTP 422)
 */
export async function resolveQuestionId(supabase, storageKey, qNumber) {
  const qbResult = await supabase
    .from('question_bank')
    .select('question_id, paper_id')
    .eq('storage_key', storageKey)
    .eq('q_number', qNumber)
    .limit(1)
    .maybeSingle();

  if (qbResult.error && !isMissingRelationError(qbResult.error, 'question_bank')) {
    throw new ValidationError(
      `Failed to resolve question_id for storage_key="${storageKey}", q_number=${qNumber}: ${qbResult.error.message}`,
    );
  }

  if (qbResult.data?.question_id) {
    return {
      question_id: qbResult.data.question_id,
      paper_id: qbResult.data.paper_id || null,
    };
  }

  const afResult = await supabase
    .from('asset_files')
    .select('id, paper_id, q_number')
    .eq('storage_key', storageKey)
    .limit(1)
    .maybeSingle();

  if (afResult.error && !isMissingRelationError(afResult.error, 'asset_files')) {
    throw new ValidationError(
      `Failed to resolve fallback question_id for storage_key="${storageKey}", q_number=${qNumber}: ${afResult.error.message}`,
    );
  }

  if (afResult.data?.id) {
    const fallbackQNumber = afResult.data.q_number;
    if (fallbackQNumber == null || Number(fallbackQNumber) === Number(qNumber)) {
      return {
        question_id: afResult.data.id,
        paper_id: afResult.data.paper_id || null,
      };
    }
  }

  throw new ValidationError(
    `No question mapping found for storage_key="${storageKey}", q_number=${qNumber}. Cannot create attempt without a stable question anchor.`,
  );
}

/**
 * Create or reuse an attempt record (idempotent via user_id + idempotency_key).
 *
 * Deterministic semantics:
 * 1) Lookup existing by (user_id, idempotency_key)
 * 2) If found, return is_new=false
 * 3) Else INSERT a new row
 * 4) If INSERT hits unique conflict, SELECT back and return is_new=false
 *
 * @param {object} params
 * @param {object} params.supabase - Supabase client (service-role)
 * @param {string} params.user_id - auth.uid()
 * @param {string} params.question_id - stable question entity UUID (required)
 * @param {string|null} params.paper_id - paper entity UUID (optional)
 * @param {string} params.storage_key
 * @param {number} params.q_number
 * @param {string|null} params.subpart
 * @param {object[]} params.submitted_steps
 * @param {string} params.idempotency_key
 * @returns {Promise<{attempt_id: string, topic_path: string|null, node_id: string|null, topic_source: string|null, topic_confidence: number|null, topic_resolved_at: string|null, is_new: boolean}>}
 * @throws {ValidationError} when question_id is missing (HTTP 422)
 */
export async function createOrReuseAttempt({
  supabase,
  user_id,
  question_id,
  paper_id = null,
  storage_key,
  q_number,
  subpart = null,
  submitted_steps = [],
  idempotency_key,
}) {
  // ── Validate required question_id ───────────────────────────────────────
  if (!question_id) {
    throw new ValidationError('question_id is required to create an attempt.');
  }

  // ── Parse syllabus_code ─────────────────────────────────────────────────
  const syllabus_code = parseSyllabusCode(storage_key);

  // ── Resolve topic_path (non-blocking — NULLs on failure) ────────────────
  const topicData = await resolveTopicPath(supabase, storage_key);

  // ── Deterministic idempotency lookup ─────────────────────────────────────
  const { data: existingBefore, error: existingBeforeError } = await supabase
    .from('attempts')
    .select('attempt_id, node_id, topic_path, topic_source, topic_confidence, topic_resolved_at')
    .eq('user_id', user_id)
    .eq('idempotency_key', idempotency_key)
    .maybeSingle();

  if (existingBeforeError && existingBeforeError.code !== 'PGRST116') {
    throw new Error(`Failed to lookup existing attempt: ${existingBeforeError.message}`);
  }

  if (existingBefore?.attempt_id) {
    return {
      attempt_id: existingBefore.attempt_id,
      topic_path: existingBefore.topic_path || null,
      node_id: existingBefore.node_id || null,
      topic_source: existingBefore.topic_source || null,
      topic_confidence: existingBefore.topic_confidence ?? null,
      topic_resolved_at: existingBefore.topic_resolved_at || null,
      is_new: false,
    };
  }

  // ── INSERT new row ───────────────────────────────────────────────────────
  const row = {
    user_id,
    question_id,
    paper_id,
    storage_key,
    q_number,
    subpart,
    syllabus_code,
    node_id: topicData.node_id,
    topic_path: topicData.topic_path,
    topic_source: topicData.topic_source,
    topic_confidence: topicData.topic_confidence,
    topic_resolved_at: topicData.topic_resolved_at,
    submitted_steps,
    idempotency_key,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('attempts')
    .insert(row)
    .select('attempt_id, node_id, topic_path, topic_source, topic_confidence, topic_resolved_at')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: raced, error: racedError } = await supabase
        .from('attempts')
        .select('attempt_id, node_id, topic_path, topic_source, topic_confidence, topic_resolved_at')
        .eq('user_id', user_id)
        .eq('idempotency_key', idempotency_key)
        .single();

      if (racedError || !raced?.attempt_id) {
        throw new Error(
          `Failed to retrieve attempt after unique conflict: ${racedError?.message || 'no data returned'}`,
        );
      }

      return {
        attempt_id: raced.attempt_id,
        topic_path: raced.topic_path || null,
        node_id: raced.node_id || null,
        topic_source: raced.topic_source || null,
        topic_confidence: raced.topic_confidence ?? null,
        topic_resolved_at: raced.topic_resolved_at || null,
        is_new: false,
      };
    }

    console.error(JSON.stringify({
      event: 'attempt_repo_insert_error',
      user_id,
      idempotency_key,
      error_code: insertError.code || 'unknown',
      error: insertError.message,
      ts: new Date().toISOString(),
    }));
    throw new Error(`Failed to create attempt: ${insertError.message}`);
  }

  if (!inserted?.attempt_id) {
    throw new Error('Failed to create attempt: no data returned');
  }

  return {
    attempt_id: inserted.attempt_id,
    topic_path: inserted.topic_path || null,
    node_id: inserted.node_id || null,
    topic_source: inserted.topic_source || null,
    topic_confidence: inserted.topic_confidence ?? null,
    topic_resolved_at: inserted.topic_resolved_at || null,
    is_new: true,
  };
}
