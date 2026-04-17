function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeObjectOrNull(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
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
    artifact_kind: input.artifact_kind,
    canonical_home_topic_id: input.canonical_home_topic_id,
    source_session_id: input.source_session_id ?? null,
    source_attempt_id: input.source_attempt_id ?? null,
    source_mark_run_id: input.source_mark_run_id ?? null,
    target_family_id: input.target_family_id ?? null,
    target_question_type_id: input.target_question_type_id ?? null,
    slot_key: input.slot_key ?? null,
    artifact_state: input.artifact_state ?? 'unverified',
    trust_status: input.trust_status ?? 'unverified',
    placement_status: input.placement_status ?? 'inbox',
    lifecycle_status: input.lifecycle_status ?? 'active',
    lineage_parent_artifact_id: input.lineage_parent_artifact_id ?? null,
    superseded_by_artifact_id: input.superseded_by_artifact_id ?? null,
    verified_by: input.verified_by ?? null,
    verified_at: input.verified_at ?? null,
    verification_evidence_ref: normalizeObjectOrNull(input.verification_evidence_ref),
    released_by: input.released_by ?? null,
    released_at: input.released_at ?? null,
    release_evidence_ref: normalizeObjectOrNull(input.release_evidence_ref),
    contested_by: input.contested_by ?? null,
    contested_at: input.contested_at ?? null,
    contested_reason: input.contested_reason ?? null,
    superseded_at: input.superseded_at ?? null,
    grounding_refs: normalizeArray(input.grounding_refs),
    ...(input.updated_at ? { updated_at: input.updated_at } : {}),
  };
}

export function createArtifactRepository(client) {
  return {
    async getArtifactById(artifactId) {
      return getArtifactById(client, artifactId);
    },

    async listArtifactsByTopic({ topicId }) {
      return listArtifactsByTopic(client, { topicId });
    },

    async insertArtifact(input) {
      return insertArtifact(client, input);
    },

    async updateArtifact(artifactId, patch) {
      return updateArtifact(client, artifactId, patch);
    },

    async getTopicById(topicId) {
      return getTopicById(client, topicId);
    },

    async getWorkspaceSlotByTopicAndKey(params) {
      return getWorkspaceSlotByTopicAndKey(client, params);
    },

    async setWorkspaceSlotPrimaryArtifact(params) {
      return setWorkspaceSlotPrimaryArtifact(client, params);
    },
  };
}

export async function getArtifactById(client, artifactId) {
  return maybeSingle(
    client
      .from('learning_artifacts')
      .select('*')
      .eq('artifact_id', artifactId)
      .maybeSingle(),
    'Failed to load learning artifact',
  );
}

export async function insertArtifact(client, input = {}) {
  return maybeSingle(
    client
      .from('learning_artifacts')
      .insert(buildInsertRow(input))
      .select('*')
      .single(),
    'Failed to insert learning artifact',
  );
}

export async function listArtifactsByTopic(client, { topicId } = {}) {
  const { data, error } = await client
    .from('learning_artifacts')
    .select('*')
    .eq('canonical_home_topic_id', topicId)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load learning artifacts for topic: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

export async function updateArtifact(client, artifactId, patch = {}) {
  const payload = {
    ...patch,
  };

  if (Object.prototype.hasOwnProperty.call(payload, 'verification_evidence_ref')) {
    payload.verification_evidence_ref = normalizeObjectOrNull(payload.verification_evidence_ref);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'release_evidence_ref')) {
    payload.release_evidence_ref = normalizeObjectOrNull(payload.release_evidence_ref);
  }

  return maybeSingle(
    client
      .from('learning_artifacts')
      .update(payload)
      .eq('artifact_id', artifactId)
      .select('*')
      .single(),
    'Failed to update learning artifact',
  );
}

export async function getTopicById(client, topicId) {
  return maybeSingle(
    client
      .from('curriculum_nodes')
      .select('node_id, topic_path')
      .eq('node_id', topicId)
      .maybeSingle(),
    'Failed to load artifact topic',
  );
}

async function getWorkspaceByTopic(client, { userId, topicId } = {}) {
  return maybeSingle(
    client
      .from('learning_workspaces')
      .select('*')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .maybeSingle(),
    'Failed to load learning workspace',
  );
}

async function createWorkspace(client, {
  userId,
  topicId,
  topicPath,
} = {}) {
  return maybeSingle(
    client
      .from('learning_workspaces')
      .insert({
        user_id: userId,
        topic_id: topicId,
        topic_path: topicPath,
        slot_state: {},
        linked_reference_summary: {},
      })
      .select('*')
      .single(),
    'Failed to create learning workspace',
  );
}

async function ensureWorkspace(client, {
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

  return createWorkspace(client, {
    userId,
    topicId,
    topicPath,
  });
}

export async function getWorkspaceSlotByTopicAndKey(client, {
  userId,
  topicId,
  slotKey,
} = {}) {
  const workspace = await getWorkspaceByTopic(client, {
    userId,
    topicId,
  });

  if (!workspace) {
    return null;
  }

  const slot = await maybeSingle(
    client
      .from('learning_workspace_slots')
      .select('*')
      .eq('workspace_id', workspace.workspace_id)
      .eq('slot_key', slotKey)
      .maybeSingle(),
    'Failed to load learning workspace slot',
  );

  return slot
    ? {
      ...slot,
      workspace_id: workspace.workspace_id,
    }
    : null;
}

export async function setWorkspaceSlotPrimaryArtifact(client, {
  userId,
  topicId,
  topicPath,
  slotKey,
  primaryArtifactRef = null,
} = {}) {
  const workspace = await ensureWorkspace(client, {
    userId,
    topicId,
    topicPath,
  });

  const existingSlot = await maybeSingle(
    client
      .from('learning_workspace_slots')
      .select('*')
      .eq('workspace_id', workspace.workspace_id)
      .eq('slot_key', slotKey)
      .maybeSingle(),
    'Failed to load learning workspace slot for update',
  );

  if (!existingSlot) {
    return maybeSingle(
      client
        .from('learning_workspace_slots')
        .insert({
          workspace_id: workspace.workspace_id,
          slot_key: slotKey,
          primary_artifact_ref: primaryArtifactRef,
          linked_reference_refs: [],
        })
        .select('*')
        .single(),
      'Failed to create learning workspace slot',
    );
  }

  return maybeSingle(
    client
      .from('learning_workspace_slots')
      .update({
        primary_artifact_ref: primaryArtifactRef,
      })
      .eq('workspace_slot_id', existingSlot.workspace_slot_id)
      .select('*')
      .single(),
    'Failed to update learning workspace slot',
  );
}
