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

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function comparePaperTopicSections(left = {}, right = {}) {
  const pathCompare = String(left.topic_path ?? '').localeCompare(String(right.topic_path ?? ''));
  if (pathCompare !== 0) {
    return pathCompare;
  }

  return String(left.topic_id ?? '').localeCompare(String(right.topic_id ?? ''));
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
      primary_artifact: slot.primary_artifact ?? null,
      updated_at: slot.updated_at ?? null,
    };
    linked_references[slot.slot_key] = Array.isArray(slot.linked_reference_refs)
      ? slot.linked_reference_refs
      : [];
  }

  return { slots, linked_references };
}

function normalizePaperTopicSections(topicSections) {
  return normalizeArray(topicSections)
    .map((section) => ({
      ...section,
      paper_workspace_topic_section_id: section?.paper_workspace_topic_section_id ?? null,
      topic_id: section?.topic_id ?? null,
      topic_workspace_id: section?.topic_workspace_id ?? null,
      topic_path: section?.topic_path ?? null,
      section_state: normalizeObject(section?.section_state),
      created_at: section?.created_at ?? null,
      updated_at: section?.updated_at ?? null,
    }))
    .sort(comparePaperTopicSections);
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

export async function loadPaperWorkspaceByScope(client, { userId, paperScope } = {}) {
  const { data, error } = await client
    .from('learning_paper_workspaces')
    .select('*')
    .eq('user_id', userId)
    .eq('paper_scope', paperScope)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load paper workspace: ${error.message}`);
  }

  return data || null;
}

function isUniqueConflict(error) {
  return error?.code === '23505'
    || String(error?.message || '').includes('duplicate key value');
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
    if (isUniqueConflict(error)) {
      const racedWorkspace = await getWorkspaceByTopic(client, {
        userId,
        topicId,
      });

      if (racedWorkspace) {
        return racedWorkspace;
      }
    }

    throw new Error(
      `Failed to create learning workspace: ${error?.message || 'no data returned'}`,
    );
  }

  return data;
}

export async function ensurePaperWorkspaceExists(client, {
  userId,
  subjectCode,
  paperScope,
  visibleOrganizationSummary = {},
  linkedTopicSummary = {},
} = {}) {
  const existing = await loadPaperWorkspaceByScope(client, {
    userId,
    paperScope,
  });

  if (existing) {
    return existing;
  }

  const { data, error } = await client
    .from('learning_paper_workspaces')
    .insert({
      user_id: userId,
      subject_code: subjectCode,
      paper_scope: paperScope,
      workspace_kind: 'paper_main',
      visible_organization_summary: visibleOrganizationSummary,
      linked_topic_summary: linkedTopicSummary,
    })
    .select('*')
    .single();

  if (error || !data) {
    if (isUniqueConflict(error)) {
      const racedWorkspace = await loadPaperWorkspaceByScope(client, {
        userId,
        paperScope,
      });

      if (racedWorkspace) {
        return racedWorkspace;
      }
    }

    throw new Error(
      `Failed to create paper workspace: ${error?.message || 'no data returned'}`,
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

export async function fetchPaperWorkspaceProjection(client, {
  userId,
  paperScope,
} = {}) {
  const { data, error } = await client
    .from('learning_paper_workspace_projection')
    .select('*')
    .eq('user_id', userId)
    .eq('paper_scope', paperScope)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load paper workspace projection: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    paper_workspace_id: data.paper_workspace_id,
    user_id: data.user_id,
    subject_code: data.subject_code,
    paper_scope: data.paper_scope,
    workspace_kind: data.workspace_kind ?? 'paper_main',
    visible_organization_summary: normalizeObject(data.visible_organization_summary),
    linked_topic_summary: normalizeObject(data.linked_topic_summary),
    created_at: data.created_at ?? null,
    updated_at: data.updated_at ?? null,
    topic_sections: normalizePaperTopicSections(data.topic_sections),
    stable_slots: normalizeObject(data.stable_slots),
    pinned_artifact_summaries: normalizeArray(data.pinned_artifact_summaries),
    linked_reference_refs: normalizeArray(data.linked_reference_refs),
    review_queue_projection_shape: normalizeObject(data.review_queue_projection_shape),
  };
}
