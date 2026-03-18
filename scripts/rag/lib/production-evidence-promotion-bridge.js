import path from 'node:path';

import { loadProductionEvidenceBundle } from './production-evidence-bundle.js';
import { buildProductionEvidenceGovernancePreflight } from './production-evidence-governance-preflight.js';
import { validateProductionEvidenceManifest } from './production-evidence-manifest.js';
import { buildProductionEvidencePromotionReceipt } from './production-evidence-promotion-receipt.js';
import { buildProductionEvidenceReleaseGate } from './production-evidence-release-gate.js';
import { validateProductionEvidenceWhitelist, upsertProductionEvidenceWhitelistEntry } from './production-evidence-whitelist.js';

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(value) {
  return [...new Set(normalizeArray(value).map((item) => normalizeString(item)).filter(Boolean))];
}

function normalizePathToken(value) {
  return normalizeString(value).replace(/\\/g, '/');
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildPromotionNote(candidateBundleId, sourceReviewId) {
  const bundleLabel = normalizeString(candidateBundleId) || 'unknown';
  const reviewLabel = normalizeString(sourceReviewId);
  return reviewLabel
    ? `Promoted from reviewed candidate ${bundleLabel} via review ${reviewLabel}.`
    : `Promoted from reviewed candidate ${bundleLabel}.`;
}

export function loadPromotionCandidateBundle({
  rootDir = process.cwd(),
  candidateDir = null,
  manifestPath = null,
} = {}) {
  const resolvedManifestPath =
    normalizeString(manifestPath) || (normalizeString(candidateDir) ? path.join(candidateDir, 'manifest.json') : null);
  const bundle = loadProductionEvidenceBundle({
    root: rootDir,
    manifestPath: resolvedManifestPath,
  });

  if (normalizeString(bundle.manifest?.bundle_status) !== 'governance_seed_only') {
    throw new Error('promotion candidate manifest bundle_status must be governance_seed_only');
  }

  return bundle;
}

export function buildPilotReadyBundle({
  candidateManifest,
  candidateItems,
  targetBundleId,
  promotedAt = new Date().toISOString(),
  sourceReviewId = null,
} = {}) {
  if (!normalizeString(targetBundleId)) {
    throw new Error('target bundle id is required');
  }

  const manifest = cloneJson(normalizeObject(candidateManifest));
  const items = normalizeArray(candidateItems).map((item) => cloneJson(item));
  const subjectCodes = normalizeStringArray(items.map((item) => normalizeObject(item).subject_code)).sort();
  const notes = normalizeStringArray(manifest.notes).filter(
    (note) => !note.includes('governance_seed_only until a later explicit operator promotion step'),
  );
  notes.push(buildPromotionNote(manifest.bundle_id, sourceReviewId));

  return {
    manifest: {
      ...manifest,
      bundle_id: normalizeString(targetBundleId),
      generated_at: normalizeString(promotedAt),
      bundle_status: 'pilot_ready_for_ingest',
      subject_scope: subjectCodes.length === 1 ? 'single_subject' : 'mixed_subject',
      subject_codes: subjectCodes,
      items_file: 'items.json',
      bundle_item_count: items.length,
      review: {
        status: 'approved',
        owner: normalizeString(manifest.review?.owner) || 'phase_e_promotion_bridge',
      },
      notes,
    },
    items: items.map((item) => ({
      ...item,
      review: {
        ...normalizeObject(item.review),
        status: 'approved',
      },
    })),
  };
}

export function buildPilotReadyWhitelistEntry({
  targetManifest,
  manifestPath,
  approvedCorpusVersions,
} = {}) {
  const manifest = normalizeObject(targetManifest);
  const normalizedManifestPath = normalizeString(manifestPath);
  const corpusVersions = normalizeStringArray(approvedCorpusVersions).sort();
  if (!normalizedManifestPath) {
    throw new Error('manifest path is required');
  }
  if (corpusVersions.length === 0) {
    throw new Error('approved corpus versions must not be empty');
  }

  return {
    bundle_id: normalizeString(manifest.bundle_id),
    manifest_path: normalizedManifestPath,
    subject_scope: normalizeString(manifest.subject_scope),
    subject_codes: normalizeStringArray(manifest.subject_codes).sort(),
    allowed_source_types: normalizeStringArray(manifest.allowed_source_types),
    approved_corpus_versions: corpusVersions,
    release_channel: 'ready_for_ingest',
    ingest_allowed: true,
    release_ready_expected: true,
    notes: [buildPromotionNote(manifest.bundle_id, null)],
  };
}

export function previewProductionEvidencePromotionBridge({
  rootDir = process.cwd(),
  whitelist,
  candidateManifest,
  candidateItems,
  sourceCandidateManifestPath = null,
  targetBundleId,
  targetManifestPath,
  approvedCorpusVersions,
  promotedAt = new Date().toISOString(),
  sourceReviewId = null,
  whitelistPath = 'data/evidence/production/whitelist_v1.json',
  rolloutGatePath = 'data/evidence/production/rollout_gate_v1.json',
  receiptPath = null,
  receiptMdPath = null,
} = {}) {
  const targetBundle = buildPilotReadyBundle({
    candidateManifest,
    candidateItems,
    targetBundleId,
    promotedAt,
    sourceReviewId,
  });
  const whitelistEntry = buildPilotReadyWhitelistEntry({
    targetManifest: targetBundle.manifest,
    manifestPath: targetManifestPath,
    approvedCorpusVersions,
  });
  const whitelistUpsert = upsertProductionEvidenceWhitelistEntry({
    whitelist,
    entry: whitelistEntry,
  });
  const manifestValidation = validateProductionEvidenceManifest({
    manifest: targetBundle.manifest,
    items: targetBundle.items,
  });
  const whitelistValidation = validateProductionEvidenceWhitelist({
    whitelist: whitelistUpsert.whitelist,
    manifest: targetBundle.manifest,
    manifestPath: targetManifestPath,
  });
  const releaseGate = buildProductionEvidenceReleaseGate({
    rootDir,
    manifest: targetBundle.manifest,
    items: targetBundle.items,
    manifestPath: targetManifestPath,
    whitelist: whitelistUpsert.whitelist,
  });
  const governancePreflight = buildProductionEvidenceGovernancePreflight({
    rootDir,
    manifest: targetBundle.manifest,
    items: targetBundle.items,
    manifestPath: targetManifestPath,
    whitelist: whitelistUpsert.whitelist,
  });
  const validation = {
    manifest_valid: manifestValidation.ok,
    whitelist_valid: whitelistValidation.ok,
    release_ready: releaseGate.release_ready === true,
    ingest_permitted: governancePreflight.summary?.ingest_permitted === true,
    manifest: manifestValidation,
    whitelist: whitelistValidation,
    release_gate: releaseGate,
    governance_preflight: governancePreflight,
  };
  const receipt = buildProductionEvidencePromotionReceipt({
    generatedAt: promotedAt,
    mode: 'dry-run',
    sourceCandidate: {
      bundle_id: normalizeString(candidateManifest?.bundle_id),
      manifest_path: normalizePathToken(sourceCandidateManifestPath),
      bundle_status: normalizeString(candidateManifest?.bundle_status),
    },
    targetBundle: {
      bundle_id: normalizeString(targetBundle.manifest.bundle_id),
      manifest_path: normalizePathToken(targetManifestPath),
      bundle_dir: path.posix.dirname(normalizePathToken(targetManifestPath)),
      bundle_status: normalizeString(targetBundle.manifest.bundle_status),
      subject_codes: normalizeStringArray(targetBundle.manifest.subject_codes),
    },
    whitelistUpdate: {
      path: normalizePathToken(whitelistPath),
      changed: whitelistUpsert.changed,
      replayed: whitelistUpsert.replayed,
      entry: whitelistUpsert.entry,
    },
    approvedCorpusVersions,
    validation,
    rolloutGatePath: normalizePathToken(rolloutGatePath),
    receiptPath: normalizePathToken(receiptPath),
    receiptMdPath: normalizePathToken(receiptMdPath),
  });

  return {
    manifest: targetBundle.manifest,
    items: targetBundle.items,
    whitelist: whitelistUpsert.whitelist,
    whitelistEntry: whitelistUpsert.entry,
    whitelistChanged: whitelistUpsert.changed,
    replayed: whitelistUpsert.replayed,
    validation,
    receipt,
  };
}
