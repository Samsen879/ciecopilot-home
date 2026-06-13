import { normalizeArtifactRenderPayload } from '../artifacts/visual-reasoning-render-schema.js';

function normalizeString(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeArtifactIds(artifactIds = []) {
  return [...new Set(
    normalizeArray(artifactIds)
      .map((artifactId) => normalizeString(artifactId))
      .filter(Boolean),
  )];
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

async function maybeRpcSingle(promise, message) {
  const { data, error } = await promise;

  if (error) {
    throw new Error(`${message}: ${error.message}`);
  }

  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  return data ?? null;
}

export function hasRenderableArtifactContent(content = {}) {
  return Boolean(
    normalizeString(content.title)
    || normalizeString(content.summary)
    || normalizeString(content.body_markdown),
  );
}

export function mergeArtifactWithCurrentContent(artifact, currentContent) {
  if (!artifact) {
    return artifact;
  }

  if (!currentContent) {
    return {
      ...artifact,
      current_content_version_id: null,
      current_content_version_number: null,
      current_content_lineage_parent_version_id: null,
      has_renderable_content: false,
    };
  }

  return {
    ...artifact,
    title: normalizeString(currentContent.title),
    summary: normalizeString(currentContent.summary),
    body_markdown: normalizeString(currentContent.body_markdown),
    content_format: normalizeString(currentContent.content_format, 'markdown'),
    render_payload: normalizeArtifactRenderPayload(currentContent.render_payload),
    content_source_refs: normalizeArray(currentContent.source_refs),
    current_content_version_id: currentContent.artifact_content_version_id,
    current_content_version_number: currentContent.version_number ?? null,
    current_content_lineage_parent_version_id: currentContent.lineage_parent_version_id ?? null,
    has_renderable_content: hasRenderableArtifactContent(currentContent),
  };
}

function buildInsertRow(input = {}, currentContent = null) {
  return {
    artifact_id: input.artifact_id,
    version_number:
      Number.isInteger(Number(input.version_number)) && Number(input.version_number) > 0
        ? Number(input.version_number)
        : Number(currentContent?.version_number ?? 0) + 1,
    lineage_parent_version_id:
      input.lineage_parent_version_id ?? currentContent?.artifact_content_version_id ?? null,
    is_current: input.is_current ?? true,
    title: normalizeString(input.title, `Artifact ${input.artifact_id ?? 'content'}`),
    summary: normalizeString(input.summary),
    body_markdown: normalizeString(input.body_markdown, ''),
    content_format: normalizeString(input.content_format, 'markdown'),
    render_payload: normalizeArtifactRenderPayload(input.render_payload),
    materialization_kind: normalizeString(input.materialization_kind, 'runtime_candidate'),
    source_refs: normalizeArray(input.source_refs),
    ...(input.created_at ? { created_at: input.created_at } : {}),
  };
}

export async function getCurrentArtifactContentByArtifactId(client, artifactId) {
  return maybeSingle(
    client
      .from('learning_artifact_content_versions')
      .select('*')
      .eq('artifact_id', artifactId)
      .eq('is_current', true)
      .order('version_number', { ascending: false })
      .maybeSingle(),
    'Failed to load current learning artifact content',
  );
}

export async function listArtifactContentVersionsByArtifactId(client, artifactId) {
  const { data, error } = await client
    .from('learning_artifact_content_versions')
    .select('*')
    .eq('artifact_id', artifactId)
    .order('version_number', { ascending: false });

  if (error) {
    throw new Error(`Failed to load learning artifact content versions: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

export async function listCurrentArtifactContentsByArtifactIds(client, artifactIds = []) {
  const normalizedArtifactIds = normalizeArtifactIds(artifactIds);
  if (normalizedArtifactIds.length === 0) {
    return new Map();
  }

  const { data, error } = await client
    .from('learning_artifact_content_versions')
    .select('*')
    .in('artifact_id', normalizedArtifactIds)
    .eq('is_current', true)
    .order('version_number', { ascending: false });

  if (error) {
    throw new Error(`Failed to load current learning artifact content batch: ${error.message}`);
  }

  return (Array.isArray(data) ? data : []).reduce((acc, row) => {
    const artifactId = normalizeString(row?.artifact_id);
    if (!artifactId || acc.has(artifactId)) {
      return acc;
    }

    acc.set(artifactId, row);
    return acc;
  }, new Map());
}

export async function createArtifactContentVersion(client, input = {}) {
  const currentContent = await getCurrentArtifactContentByArtifactId(client, input.artifact_id);
  const row = buildInsertRow(input, currentContent);

  return maybeRpcSingle(
    client.rpc('create_learning_artifact_content_version', {
      p_artifact_id: row.artifact_id,
      p_version_number: row.version_number,
      p_lineage_parent_version_id: row.lineage_parent_version_id,
      p_is_current: row.is_current,
      p_title: row.title,
      p_summary: row.summary,
      p_body_markdown: row.body_markdown,
      p_content_format: row.content_format,
      p_render_payload: row.render_payload,
      p_materialization_kind: row.materialization_kind,
      p_source_refs: row.source_refs,
      p_created_at: row.created_at ?? null,
    }),
    'Failed to insert learning artifact content version',
  );
}

export function createArtifactContentRepository(client) {
  return {
    async getCurrentArtifactContentByArtifactId(artifactId) {
      return getCurrentArtifactContentByArtifactId(client, artifactId);
    },

    async listArtifactContentVersionsByArtifactId(artifactId) {
      return listArtifactContentVersionsByArtifactId(client, artifactId);
    },

    async listCurrentArtifactContentsByArtifactIds(artifactIds) {
      return listCurrentArtifactContentsByArtifactIds(client, artifactIds);
    },

    async createArtifactContentVersion(input) {
      return createArtifactContentVersion(client, input);
    },
  };
}
