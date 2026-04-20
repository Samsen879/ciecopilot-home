import fs from 'node:fs';

function normalizeManifestItem(item = {}) {
  return {
    route_hint: null,
    diagram_present: null,
    formula_dense: null,
    table_heavy: null,
    surface_evidence_status: null,
    requires_review: false,
    ...item,
    descriptor_required: Boolean(item?.descriptor_required),
    gate_critical: Boolean(item?.gate_critical),
    requires_review: Boolean(item?.requires_review),
  };
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function loadManifest(manifestPath) {
  const manifest = readJson(manifestPath);
  return {
    ...manifest,
    items: Array.isArray(manifest?.items)
      ? manifest.items.map((item) => normalizeManifestItem(item))
      : [],
  };
}

export function filterManifestItemsByShard(manifest = {}, shardId = null) {
  const items = Array.isArray(manifest?.items) ? manifest.items : [];
  if (!shardId) {
    return items;
  }

  const filtered = items.filter((item) => item?.shard_id === shardId);
  if (filtered.length === 0) {
    throw new Error(`Manifest does not contain any items for shard_id=${shardId}`);
  }
  return filtered;
}

export function normalizeLaneResultsPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.outputs)) {
    return payload.outputs;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  throw new Error('Lane results file must contain an array of outputs or a { results } payload.');
}

export function extractLaneResultStorageKeys(payload) {
  const rows = normalizeLaneResultsPayload(payload);
  return [...new Set(
    rows
      .map((row) => (typeof row?.input_asset_id === 'string' ? row.input_asset_id.trim() : ''))
      .filter(Boolean),
  )];
}

function setEquals(left, right) {
  if (left.size !== right.size) {
    return false;
  }
  for (const entry of left) {
    if (!right.has(entry)) {
      return false;
    }
  }
  return true;
}

export function buildScopedManifest(manifest = {}, targetStorageKeys = []) {
  const scope = new Set(targetStorageKeys);
  return {
    ...manifest,
    items: (Array.isArray(manifest?.items) ? manifest.items : [])
      .filter((item) => scope.has(item?.storage_key)),
  };
}

export function resolveWaveAClosureScope({
  manifest,
  manifestPath,
  shardId = null,
  laneResultsPath = null,
  scopeMode = null,
  dryRun = false,
} = {}) {
  const targetItems = filterManifestItemsByShard(manifest, shardId);
  const targetStorageKeys = targetItems.map((item) => item.storage_key);
  const manifestKeySet = new Set(targetStorageKeys);
  const normalizedScopeMode = scopeMode ?? 'manifest';

  if (!['manifest', 'lane_results'].includes(normalizedScopeMode)) {
    throw new Error(`Unsupported scope mode: ${scopeMode}`);
  }

  if (normalizedScopeMode === 'lane_results' && !laneResultsPath) {
    throw new Error('--scope-from-lane-results requires --lane-results');
  }

  if (dryRun || normalizedScopeMode === 'manifest') {
    return {
      scopeMode: normalizedScopeMode,
      scopeSource: normalizedScopeMode === 'lane_results'
        ? laneResultsPath
        : manifestPath,
      targetStorageKeys,
      targetRowCount: targetStorageKeys.length,
      cumulativeMode: shardId ? false : normalizedScopeMode !== 'lane_results',
    };
  }

  const laneResultsPayload = readJson(laneResultsPath);
  const laneResultKeys = extractLaneResultStorageKeys(laneResultsPayload);
  const laneKeySet = new Set(laneResultKeys);

  if (laneResultKeys.length === 0) {
    throw new Error('Authoritative lane-results scope resolved to zero identities.');
  }
  if (shardId && !setEquals(manifestKeySet, laneKeySet)) {
    throw new Error(`Authoritative lane-results scope does not match shard_id=${shardId}.`);
  }

  return {
    scopeMode: normalizedScopeMode,
    scopeSource: laneResultsPath,
    targetStorageKeys: laneResultKeys,
    targetRowCount: laneResultKeys.length,
    cumulativeMode: false,
  };
}
