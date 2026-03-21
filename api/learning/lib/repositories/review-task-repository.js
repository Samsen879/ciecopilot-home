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

async function maybeSingle(promise, message) {
  const { data, error } = await promise;

  if (error) {
    throw new Error(`${message}: ${error.message}`);
  }

  return data ?? null;
}

export function createReviewTaskRepository(client) {
  return {
    async insertReviewTask(input) {
      return insertReviewTask(client, input);
    },
  };
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
