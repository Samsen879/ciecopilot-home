import fs from 'node:fs';
import path from 'node:path';

import { loadProductionEvidenceBundle } from './production-evidence-bundle.js';
import { buildProductionEvidenceGovernancePreflight } from './production-evidence-governance-preflight.js';
import { validateProductionEvidenceManifest } from './production-evidence-manifest.js';
import { buildProductionEvidencePromotionReceipt } from './production-evidence-promotion-receipt.js';
import { buildProductionEvidenceReleaseGate } from './production-evidence-release-gate.js';
import { validateProductionEvidenceWhitelist, upsertProductionEvidenceWhitelistEntry } from './production-evidence-whitelist.js';
import { renderProductionEvidencePromotionReceiptReport } from './production-evidence-promotion-receipt.js';

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

function toRel(rootDir, filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function toJsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeTextIfChanged(filePath, content) {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === content) {
    return false;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function writeBundleIfChanged({
  rootDir,
  manifestPath,
  itemsPath,
  manifest,
  items,
} = {}) {
  const manifestText = toJsonText(manifest);
  const itemsText = toJsonText(items);
  const targetDir = path.dirname(manifestPath);

  if (fs.existsSync(targetDir)) {
    const existingManifest = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : null;
    const existingItems = fs.existsSync(itemsPath) ? fs.readFileSync(itemsPath, 'utf8') : null;
    if (existingManifest === manifestText && existingItems === itemsText) {
      return false;
    }
    throw new Error(`target bundle directory already exists with different contents: ${toRel(rootDir, targetDir)}`);
  }

  const stagingDir = `${targetDir}.__stage_${process.pid}`;
  fs.rmSync(stagingDir, { recursive: true, force: true });
  fs.mkdirSync(stagingDir, { recursive: true });
  fs.writeFileSync(path.join(stagingDir, 'manifest.json'), manifestText, 'utf8');
  fs.writeFileSync(path.join(stagingDir, 'items.json'), itemsText, 'utf8');
  fs.renameSync(stagingDir, targetDir);
  return true;
}

function ensurePromotionValidation(validation) {
  if (
    validation.manifest_valid !== true
    || validation.whitelist_valid !== true
    || validation.release_ready !== true
    || validation.ingest_permitted !== true
  ) {
    throw new Error('promotion bridge preview failed governance validation');
  }
}

function resolveMode(mode) {
  const normalized = normalizeString(mode) || 'apply';
  if (!['apply', 'dry-run', 'proposal-only'].includes(normalized)) {
    throw new Error(`unsupported promotion bridge mode: ${normalized}`);
  }
  return normalized;
}

function defaultTargetManifestPath(targetBundleId) {
  return `data/evidence/production/${normalizeString(targetBundleId)}/manifest.json`;
}

function defaultReceiptJsonPath(targetBundleId) {
  return `docs/reports/receipts/${normalizeString(targetBundleId)}.json`;
}

function defaultReceiptMdPath(targetBundleId) {
  return `docs/reports/receipts/${normalizeString(targetBundleId)}.md`;
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
  itemsPath = null,
} = {}) {
  const resolvedManifestPath =
    normalizeString(manifestPath) || (normalizeString(candidateDir) ? path.join(candidateDir, 'manifest.json') : null);
  const normalizedItemsPath = normalizeString(itemsPath);
  const bundle = normalizedItemsPath
    ? (() => {
        const manifestFilePath = path.resolve(rootDir, resolvedManifestPath || '');
        const itemsFilePath = path.resolve(rootDir, normalizedItemsPath);
        if (!resolvedManifestPath || !fs.existsSync(manifestFilePath)) {
          throw new Error(`production evidence manifest not found: ${resolvedManifestPath || 'missing'}`);
        }
        if (!fs.existsSync(itemsFilePath)) {
          throw new Error(`production evidence items file not found: ${normalizedItemsPath}`);
        }
        return {
          manifest: readJson(manifestFilePath),
          items: readJson(itemsFilePath),
          manifestPath: toRel(rootDir, manifestFilePath),
          itemsPath: toRel(rootDir, itemsFilePath),
        };
      })()
    : loadProductionEvidenceBundle({
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

export function executeProductionEvidencePromotionBridge({
  rootDir = process.cwd(),
  mode = 'apply',
  candidateManifestPath = null,
  candidateDir = null,
  candidateItemsPath = null,
  targetBundleId,
  targetManifestPath = null,
  approvedCorpusVersions,
  promotedAt = new Date().toISOString(),
  sourceReviewId = null,
  whitelistPath = 'data/evidence/production/whitelist_v1.json',
  rolloutGatePath = 'data/evidence/production/rollout_gate_v1.json',
  proposalDir = null,
  receiptJsonPath = null,
  receiptMdPath = null,
} = {}) {
  const resolvedMode = resolveMode(mode);
  const normalizedTargetManifestPath = normalizePathToken(
    targetManifestPath || defaultTargetManifestPath(targetBundleId),
  );
  const normalizedWhitelistPath = normalizePathToken(whitelistPath);
  const normalizedRolloutGatePath = normalizePathToken(rolloutGatePath);
  const resolvedWhitelistPath = path.resolve(rootDir, normalizedWhitelistPath);
  const whitelist = readJson(resolvedWhitelistPath);

  const candidate = loadPromotionCandidateBundle({
    rootDir,
    candidateDir,
    manifestPath: candidateManifestPath,
    itemsPath: candidateItemsPath,
  });

  const normalizedProposalDir = normalizePathToken(proposalDir);
  const previewReceiptJsonPath =
    resolvedMode === 'proposal-only'
      ? normalizePathToken(path.posix.join(normalizedProposalDir, 'promotion_receipt.json'))
      : normalizePathToken(receiptJsonPath || defaultReceiptJsonPath(targetBundleId));
  const previewReceiptMdPath =
    resolvedMode === 'proposal-only'
      ? normalizePathToken(path.posix.join(normalizedProposalDir, 'promotion_receipt.md'))
      : normalizePathToken(receiptMdPath || defaultReceiptMdPath(targetBundleId));

  if (resolvedMode === 'proposal-only' && !normalizedProposalDir) {
    throw new Error('proposalDir is required for proposal-only mode');
  }

  const preview = previewProductionEvidencePromotionBridge({
    rootDir,
    whitelist,
    candidateManifest: candidate.manifest,
    candidateItems: candidate.items,
    sourceCandidateManifestPath: candidate.manifestPath,
    targetBundleId,
    targetManifestPath: normalizedTargetManifestPath,
    approvedCorpusVersions,
    promotedAt,
    sourceReviewId,
    whitelistPath: normalizedWhitelistPath,
    rolloutGatePath: normalizedRolloutGatePath,
    receiptPath: previewReceiptJsonPath,
    receiptMdPath: previewReceiptMdPath,
  });
  ensurePromotionValidation(preview.validation);

  const writes = {
    bundle: false,
    whitelist: false,
    receipt: false,
    proposal: false,
  };
  const pathSummary = {
    targetManifestPath: normalizedTargetManifestPath,
    targetItemsPath: normalizePathToken(path.posix.join(path.posix.dirname(normalizedTargetManifestPath), 'items.json')),
    whitelistPath: normalizedWhitelistPath,
    receiptJsonPath: normalizePathToken(previewReceiptJsonPath),
    receiptMdPath: normalizePathToken(previewReceiptMdPath),
  };

  if (resolvedMode === 'dry-run') {
    return {
      ...preview,
      mode: resolvedMode,
      writes,
      paths: pathSummary,
    };
  }

  if (resolvedMode === 'proposal-only') {
    const proposalRoot = path.resolve(rootDir, normalizedProposalDir);
    const proposalBundleDir = path.join(proposalRoot, normalizeString(targetBundleId));
    const proposalManifestPath = path.join(proposalBundleDir, 'manifest.json');
    const proposalItemsPath = path.join(proposalBundleDir, 'items.json');
    const proposalWhitelistPath = path.join(proposalRoot, path.basename(normalizedWhitelistPath));
    const proposalReceiptJsonPath = path.resolve(rootDir, previewReceiptJsonPath);
    const proposalReceiptMdPath = path.resolve(rootDir, previewReceiptMdPath);

    writeTextIfChanged(proposalManifestPath, toJsonText(preview.manifest));
    writeTextIfChanged(proposalItemsPath, toJsonText(preview.items));
    writeTextIfChanged(proposalWhitelistPath, toJsonText(preview.whitelist));
    writeTextIfChanged(proposalReceiptJsonPath, toJsonText(preview.receipt));
    writeTextIfChanged(proposalReceiptMdPath, renderProductionEvidencePromotionReceiptReport(preview.receipt));
    writes.proposal = true;

    return {
      ...preview,
      mode: resolvedMode,
      writes,
      proposalPaths: {
        bundleDir: toRel(rootDir, proposalBundleDir),
        manifestPath: toRel(rootDir, proposalManifestPath),
        itemsPath: toRel(rootDir, proposalItemsPath),
        whitelistPath: toRel(rootDir, proposalWhitelistPath),
        receiptJsonPath: toRel(rootDir, proposalReceiptJsonPath),
        receiptMdPath: toRel(rootDir, proposalReceiptMdPath),
      },
    };
  }

  const resolvedTargetManifestPath = path.resolve(rootDir, normalizedTargetManifestPath);
  const resolvedTargetItemsPath = path.resolve(path.dirname(resolvedTargetManifestPath), 'items.json');
  const resolvedReceiptJsonPath = path.resolve(rootDir, previewReceiptJsonPath);
  const resolvedReceiptMdPath = path.resolve(rootDir, previewReceiptMdPath);

  writes.bundle = writeBundleIfChanged({
    rootDir,
    manifestPath: resolvedTargetManifestPath,
    itemsPath: resolvedTargetItemsPath,
    manifest: preview.manifest,
    items: preview.items,
  });
  writes.whitelist = writeTextIfChanged(resolvedWhitelistPath, toJsonText(preview.whitelist));
  if (
    preview.replayed === true
    && writes.bundle === false
    && writes.whitelist === false
    && fs.existsSync(resolvedReceiptJsonPath)
    && fs.existsSync(resolvedReceiptMdPath)
  ) {
    writes.receipt = false;
  } else {
    const receiptJsonWritten = writeTextIfChanged(resolvedReceiptJsonPath, toJsonText(preview.receipt));
    const receiptMdWritten = writeTextIfChanged(
      resolvedReceiptMdPath,
      renderProductionEvidencePromotionReceiptReport(preview.receipt),
    );
    writes.receipt = receiptJsonWritten || receiptMdWritten;
  }

  return {
    ...preview,
    mode: resolvedMode,
    writes,
    paths: pathSummary,
  };
}
