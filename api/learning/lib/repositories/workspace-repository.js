const STABLE_SLOT_KEYS = [
  'overview_map',
  'core_method_derivation',
  'canonical_worked_example',
  'common_traps',
  'my_notes',
  'review_queue',
];

function buildStableSlotMap(fillValue) {
  return Object.fromEntries(STABLE_SLOT_KEYS.map((slotKey) => [slotKey, fillValue(slotKey)]));
}

function separateWorkspaceSlots(slotRows) {
  const slots = buildStableSlotMap(() => null);
  const linked_references = buildStableSlotMap(() => []);

  for (const slot of Array.isArray(slotRows) ? slotRows : []) {
    if (!STABLE_SLOT_KEYS.includes(slot.slot_key)) {
      continue;
    }

    slots[slot.slot_key] = {
      workspace_slot_id: slot.workspace_slot_id,
      primary_artifact_ref: slot.primary_artifact_ref ?? null,
      updated_at: slot.updated_at ?? null,
    };
    linked_references[slot.slot_key] = Array.isArray(slot.linked_reference_refs)
      ? slot.linked_reference_refs
      : [];
  }

  return { slots, linked_references };
}

async function getWorkspaceByTopic(client, { userId, topicId } = {}) {
  const { data, error } = await client
    .from('learning_workspaces')
    .select('*')
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load learning workspace: ${error.message}`);
  }

  return data || null;
}

export async function ensureWorkspaceExists(client, {
  userId,
  topicId,
  topicPath,
} = {}) {
  const existing = await getWorkspaceByTopic(client, {
    userId,
    topicId,
  });

  if (existing) {
    return existing;
  }

  const { data, error } = await client
    .from('learning_workspaces')
    .insert({
      user_id: userId,
      topic_id: topicId,
      topic_path: topicPath,
      slot_state: {},
      linked_reference_summary: {},
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to create learning workspace: ${error?.message || 'no data returned'}`,
    );
  }

  return data;
}

export async function fetchWorkspaceProjection(client, { userId, topicId } = {}) {
  const { data, error } = await client
    .from('learning_workspace_projection')
    .select('*')
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load learning workspace projection: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const { slots, linked_references } = separateWorkspaceSlots(data.slots);

  return {
    workspace_id: data.workspace_id,
    user_id: data.user_id,
    topic_id: data.topic_id,
    topic_path: data.topic_path,
    slot_state: data.slot_state ?? {},
    linked_reference_summary: data.linked_reference_summary ?? {},
    updated_at: data.updated_at ?? null,
    slots,
    linked_references,
  };
}
