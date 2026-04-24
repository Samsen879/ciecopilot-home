import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_9709_DIAGRAM_REVIEW_PATHS = Object.freeze({
  manifest: 'data/manifests/9709_authority_ready_batch_300_v1.json',
  evidenceBundles: 'docs/reports/2026-04-23-9709-prompt-backfill-evidence-bundles.json',
  assetsRoot: '/home/samsen/code/cie-assets',
});

function normalizeItems(payload = {}, preferredKey = 'items') {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.[preferredKey])) {
    return payload[preferredKey];
  }
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }
  if (Array.isArray(payload?.bundles)) {
    return payload.bundles;
  }
  return [];
}

function normalizeBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function indexByStorageKey(items = []) {
  const map = new Map();
  for (const item of items) {
    const storageKey = normalizeString(item?.storage_key);
    if (storageKey && !map.has(storageKey)) {
      map.set(storageKey, item);
    }
  }
  return map;
}

function currentIso() {
  return new Date().toISOString();
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
}

export function writeHumanDiagramReviewArtifact(reviewOut, artifact) {
  const resolved = path.resolve(reviewOut);
  ensureParentDir(resolved);
  const tmpPath = `${resolved}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  fs.renameSync(tmpPath, resolved);
}

export function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
}

export function readHumanDiagramReviewArtifact(reviewOut) {
  const resolved = path.resolve(reviewOut);
  if (!fs.existsSync(resolved)) {
    return null;
  }
  return readJsonFile(resolved);
}

function calendarDateInTimeZone(now, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function defaultHumanDiagramReviewOut(now = new Date(), timeZone = 'Asia/Shanghai') {
  const day = calendarDateInTimeZone(now, timeZone);
  return path.join('docs', 'reports', `${day}-9709-human-diagram-present-review.json`);
}

export function summarizeHumanDiagramReview(items = []) {
  const summary = {
    total: items.length,
    reviewed: 0,
    skipped: 0,
    pending: 0,
    present: 0,
    absent: 0,
  };

  for (const item of items) {
    if (item?.disposition === 'reviewed') {
      summary.reviewed += 1;
      if (item.reviewed_diagram_present === true) {
        summary.present += 1;
      } else if (item.reviewed_diagram_present === false) {
        summary.absent += 1;
      }
    } else if (item?.disposition === 'skipped') {
      summary.skipped += 1;
    } else {
      summary.pending += 1;
    }
  }

  return summary;
}

export function buildHumanDiagramReviewArtifact({
  manifest = {},
  evidenceBundles = {},
  assetsRoot = DEFAULT_9709_DIAGRAM_REVIEW_PATHS.assetsRoot,
  reviewOut = defaultHumanDiagramReviewOut(),
  existingArtifact = null,
  nowIso = currentIso(),
} = {}) {
  const manifestItems = normalizeItems(manifest);
  const bundlesByStorageKey = indexByStorageKey(normalizeItems(evidenceBundles, 'bundles'));
  const existingByStorageKey = indexByStorageKey(existingArtifact?.items ?? []);
  const reviewIdBase = normalizeString(manifest.manifest_id) || '9709_authority_ready_batch_300';

  const items = manifestItems.map((item, index) => {
    const storageKey = normalizeString(item?.storage_key);
    const bundle = bundlesByStorageKey.get(storageKey) ?? {};
    const existing = existingByStorageKey.get(storageKey) ?? {};
    const original = {
      manifest_diagram_present: normalizeBoolean(item?.diagram_present),
      evidence_diagram_present: normalizeBoolean(bundle?.evidence?.diagram_present),
      surface_posture_diagram_present: normalizeBoolean(bundle?.surface_posture?.diagram_present),
    };
    const originalValues = Object.values(original).filter((value) => typeof value === 'boolean');
    const hasConflict = new Set(originalValues).size > 1 || Object.values(original).some((value) => value === null);

    return {
      ordinal: index + 1,
      storage_key: storageKey,
      image_path: path.join(assetsRoot, storageKey),
      paper: item?.paper ?? null,
      variant: item?.variant ?? null,
      q_number: item?.q_number ?? null,
      primary_topic_path: normalizeString(item?.primary_topic_path) || null,
      original,
      original_has_conflict: hasConflict,
      disposition: ['reviewed', 'skipped'].includes(existing?.disposition) ? existing.disposition : 'pending',
      reviewed_diagram_present: normalizeBoolean(existing?.reviewed_diagram_present),
      reviewed_at: normalizeString(existing?.reviewed_at) || null,
      reviewed_by: normalizeString(existing?.reviewed_by) || null,
      note: normalizeString(existing?.note) || null,
    };
  });

  const artifact = {
    schema_version: '9709_human_diagram_present_review_v1',
    review_id: `${reviewIdBase}_human_diagram_present_review`,
    created_at: normalizeString(existingArtifact?.created_at) || nowIso,
    updated_at: nowIso,
    source: {
      manifest_id: normalizeString(manifest.manifest_id) || null,
      manifest_path: normalizeString(existingArtifact?.source?.manifest_path) || null,
      evidence_bundles_path: normalizeString(existingArtifact?.source?.evidence_bundles_path) || null,
      assets_root: assetsRoot,
      review_out: reviewOut,
    },
    summary: {},
    items,
  };
  artifact.summary = summarizeHumanDiagramReview(items);
  return artifact;
}

export function recordHumanDiagramReviewDecision({
  artifact,
  reviewOut,
  storageKey,
  diagramPresent = null,
  disposition = 'reviewed',
  note = null,
  reviewedBy = 'human',
  nowIso = currentIso(),
} = {}) {
  const normalizedStorageKey = normalizeString(storageKey);
  if (!normalizedStorageKey) {
    throw new Error('storageKey is required.');
  }
  if (!artifact || !Array.isArray(artifact.items)) {
    throw new Error('A review artifact with items is required.');
  }
  if (!['reviewed', 'skipped', 'pending'].includes(disposition)) {
    throw new Error(`Unsupported review disposition: ${disposition}`);
  }
  if (disposition === 'reviewed' && typeof diagramPresent !== 'boolean') {
    throw new Error('diagramPresent must be true or false when disposition is reviewed.');
  }

  const nextArtifact = cloneJson(artifact);
  const item = nextArtifact.items.find((candidate) => candidate.storage_key === normalizedStorageKey);
  if (!item) {
    throw new Error(`Unknown storage_key: ${normalizedStorageKey}`);
  }

  item.disposition = disposition;
  item.reviewed_diagram_present = disposition === 'reviewed' ? diagramPresent : null;
  item.reviewed_at = disposition === 'pending' ? null : nowIso;
  item.reviewed_by = disposition === 'pending' ? null : reviewedBy;
  item.note = normalizeString(note) || null;
  nextArtifact.updated_at = nowIso;
  nextArtifact.summary = summarizeHumanDiagramReview(nextArtifact.items);

  if (reviewOut) {
    writeHumanDiagramReviewArtifact(reviewOut, nextArtifact);
  }
  return nextArtifact;
}

export function buildHumanDiagramReviewState({
  manifestPath = DEFAULT_9709_DIAGRAM_REVIEW_PATHS.manifest,
  evidenceBundlesPath = DEFAULT_9709_DIAGRAM_REVIEW_PATHS.evidenceBundles,
  assetsRoot = DEFAULT_9709_DIAGRAM_REVIEW_PATHS.assetsRoot,
  reviewOut = defaultHumanDiagramReviewOut(),
  nowIso = currentIso(),
} = {}) {
  const manifest = readJsonFile(manifestPath);
  const evidenceBundles = readJsonFile(evidenceBundlesPath);
  const existingArtifact = readHumanDiagramReviewArtifact(reviewOut);
  const artifact = buildHumanDiagramReviewArtifact({
    manifest,
    evidenceBundles,
    assetsRoot,
    reviewOut,
    existingArtifact,
    nowIso,
  });

  artifact.source.manifest_path = manifestPath;
  artifact.source.evidence_bundles_path = evidenceBundlesPath;
  writeHumanDiagramReviewArtifact(reviewOut, artifact);
  return artifact;
}
