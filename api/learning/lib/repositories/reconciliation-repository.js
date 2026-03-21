function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

async function maybeSingle(promise, message) {
  const { data, error } = await promise;

  if (error) {
    throw new Error(`${message}: ${error.message}`);
  }

  return data ?? null;
}

function buildInsertRow(input = {}) {
  return {
    trigger_source: input.trigger_source,
    source_ref: input.source_ref,
    affected_object_refs: normalizeArray(input.affected_object_refs),
    old_snapshot_refs: normalizeArray(input.old_snapshot_refs),
    new_snapshot_refs: normalizeArray(input.new_snapshot_refs),
    status: input.status ?? 'completed',
    result_summary: normalizeObject(input.result_summary),
    ...(input.started_at ? { started_at: input.started_at } : {}),
    completed_at: input.completed_at ?? null,
  };
}

export function createReconciliationRepository(client) {
  return {
    async insertRun(input) {
      return insertRun(client, input);
    },
  };
}

export async function insertRun(client, input = {}) {
  return maybeSingle(
    client
      .from('learning_reconciliation_runs')
      .insert(buildInsertRow(input))
      .select('*')
      .single(),
    'Failed to insert learning reconciliation run',
  );
}
