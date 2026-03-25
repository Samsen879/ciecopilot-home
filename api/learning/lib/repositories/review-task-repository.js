function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function buildInsertRow(input = {}) {
  return {
    user_id: input.user_id,
    target_kind: input.target_kind,
    target_topic_id: input.target_topic_id,
    target_family_id: input.target_family_id ?? null,
    target_question_type_id: input.target_question_type_id ?? null,
    target_misconception_tags: normalizeArray(input.target_misconception_tags),
    related_artifact_refs: normalizeArray(input.related_artifact_refs),
    source_question_id: input.source_question_id ?? null,
    source_attempt_ref: input.source_attempt_ref ?? null,
    trigger_type: input.trigger_type,
    mode: input.mode,
    due_at: input.due_at ?? null,
    priority: input.priority ?? 'normal',
    estimated_minutes: input.estimated_minutes ?? null,
    success_criteria: normalizeObject(input.success_criteria),
    completion_evidence: normalizeObject(input.completion_evidence),
    status: input.status ?? 'open',
    ...(input.updated_at ? { updated_at: input.updated_at } : {}),
  };
}

function buildUpdateRow(patch = {}) {
  const row = {};

  if (Object.prototype.hasOwnProperty.call(patch, 'due_at')) {
    row.due_at = patch.due_at ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'completion_evidence')) {
    row.completion_evidence = normalizeObject(patch.completion_evidence);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
    row.status = patch.status;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'updated_at')) {
    row.updated_at = patch.updated_at;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'trigger_type')) {
    row.trigger_type = patch.trigger_type;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'mode')) {
    row.mode = patch.mode;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'priority')) {
    row.priority = patch.priority;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'success_criteria')) {
    row.success_criteria = normalizeObject(patch.success_criteria);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'target_misconception_tags')) {
    row.target_misconception_tags = normalizeArray(patch.target_misconception_tags);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'related_artifact_refs')) {
    row.related_artifact_refs = normalizeArray(patch.related_artifact_refs);
  }

  return row;
}

async function maybeSingle(promise, message) {
  const { data, error } = await promise;

  if (error) {
    throw new Error(`${message}: ${error.message}`);
  }

  return data ?? null;
}

export function createReviewTaskRepository(client) {
  return {
    async getReviewTaskById(reviewTaskId) {
      return getReviewTaskById(client, reviewTaskId);
    },

    async getReviewTaskProjectionById(reviewTaskId) {
      return getReviewTaskProjectionById(client, reviewTaskId);
    },

    async insertReviewTask(input) {
      return insertReviewTask(client, input);
    },

    async updateReviewTask(reviewTaskId, patch) {
      return updateReviewTask(client, reviewTaskId, patch);
    },

    async listReviewTaskProjectionsByUser(userId) {
      return listReviewTaskProjectionsByUser(client, userId);
    },
  };
}

export async function getReviewTaskById(client, reviewTaskId) {
  return maybeSingle(
    client
      .from('learning_review_tasks')
      .select('*')
      .eq('review_task_id', reviewTaskId)
      .maybeSingle(),
    'Failed to load learning review task',
  );
}

export async function getReviewTaskProjectionById(client, reviewTaskId) {
  return maybeSingle(
    client
      .from('learning_review_queue_projection')
      .select('*')
      .eq('review_task_id', reviewTaskId)
      .maybeSingle(),
    'Failed to load learning review task projection',
  );
}

export async function insertReviewTask(client, input = {}) {
  const row = buildInsertRow(input);

  return maybeSingle(
    client
      .from('learning_review_tasks')
      .insert(row)
      .select('*')
      .single(),
    'Failed to insert learning review task',
  );
}

export async function updateReviewTask(client, reviewTaskId, patch = {}) {
  const row = buildUpdateRow(patch);

  return maybeSingle(
    client
      .from('learning_review_tasks')
      .update(row)
      .eq('review_task_id', reviewTaskId)
      .select('*')
      .single(),
    'Failed to update learning review task',
  );
}

export async function listReviewTaskProjectionsByUser(client, userId) {
  const { data, error } = await client
    .from('learning_review_queue_projection')
    .select('*')
    .eq('user_id', userId)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load learning review-task projections: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}
