import path from 'node:path';

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => normalizeString(item)).filter(Boolean))];
}

function toPosixPath(value) {
  return normalizeString(value).replace(/\\/g, '/');
}

function buildRollbackPaths({ targetBundle, whitelistUpdate, receiptPath, receiptMdPath }) {
  return normalizeStringArray([
    toPosixPath(targetBundle?.bundle_dir),
    toPosixPath(whitelistUpdate?.path),
    toPosixPath(receiptPath),
    toPosixPath(receiptMdPath),
  ]);
}

export function buildProductionEvidencePromotionReceipt({
  generatedAt = new Date().toISOString(),
  mode = 'dry-run',
  sourceCandidate = null,
  targetBundle = null,
  whitelistUpdate = null,
  approvedCorpusVersions = [],
  validation = null,
  rolloutGatePath = 'data/evidence/production/rollout_gate_v1.json',
  receiptPath = null,
  receiptMdPath = null,
} = {}) {
  const normalizedSourceCandidate = normalizeObject(sourceCandidate);
  const normalizedTargetBundle = normalizeObject(targetBundle);
  const normalizedWhitelistUpdate = normalizeObject(whitelistUpdate);
  const normalizedValidation = normalizeObject(validation);

  return {
    schema_version: 'production_evidence_promotion_receipt_v1',
    generated_at: normalizeString(generatedAt),
    mode: normalizeString(mode) || 'dry-run',
    source_candidate: {
      bundle_id: normalizeString(normalizedSourceCandidate.bundle_id) || null,
      manifest_path: toPosixPath(normalizedSourceCandidate.manifest_path) || null,
      bundle_status: normalizeString(normalizedSourceCandidate.bundle_status) || null,
    },
    target_bundle: {
      bundle_id: normalizeString(normalizedTargetBundle.bundle_id) || null,
      manifest_path: toPosixPath(normalizedTargetBundle.manifest_path) || null,
      bundle_dir: toPosixPath(normalizedTargetBundle.bundle_dir) || null,
      bundle_status: normalizeString(normalizedTargetBundle.bundle_status) || null,
      subject_codes: normalizeStringArray(normalizedTargetBundle.subject_codes),
    },
    whitelist_update: {
      path: toPosixPath(normalizedWhitelistUpdate.path) || null,
      changed: normalizedWhitelistUpdate.changed === true,
      replayed: normalizedWhitelistUpdate.replayed === true,
      entry_bundle_id: normalizeString(normalizedWhitelistUpdate.entry?.bundle_id) || null,
    },
    approved_corpus_versions: normalizeStringArray(approvedCorpusVersions),
    validation: {
      manifest_valid: normalizedValidation.manifest_valid === true,
      whitelist_valid: normalizedValidation.whitelist_valid === true,
      release_ready: normalizedValidation.release_ready === true,
      ingest_permitted: normalizedValidation.ingest_permitted === true,
    },
    rollout_gate: {
      touched: false,
      path: toPosixPath(rolloutGatePath) || null,
    },
    receipt_paths: {
      json: toPosixPath(receiptPath) || null,
      markdown: toPosixPath(receiptMdPath) || null,
    },
    rollback_guidance: {
      strategy: 'git_revert_or_restore',
      paths: buildRollbackPaths({
        targetBundle: normalizedTargetBundle,
        whitelistUpdate: normalizedWhitelistUpdate,
        receiptPath,
        receiptMdPath,
      }),
    },
  };
}

export function renderProductionEvidencePromotionReceiptReport(receipt = {}) {
  const lines = [
    '# Production Evidence Promotion Receipt',
    '',
    `- mode: \`${receipt.mode || 'unknown'}\``,
    `- source_candidate_bundle_id: \`${receipt.source_candidate?.bundle_id || 'unknown'}\``,
    `- target_bundle_id: \`${receipt.target_bundle?.bundle_id || 'unknown'}\``,
    `- manifest_valid: \`${Boolean(receipt.validation?.manifest_valid)}\``,
    `- whitelist_valid: \`${Boolean(receipt.validation?.whitelist_valid)}\``,
    `- release_ready: \`${Boolean(receipt.validation?.release_ready)}\``,
    `- ingest_permitted: \`${Boolean(receipt.validation?.ingest_permitted)}\``,
    `- rollout_gate_touched: \`${Boolean(receipt.rollout_gate?.touched)}\``,
    '',
    '## Approved Corpus Versions',
    '',
  ];

  if ((receipt.approved_corpus_versions || []).length === 0) {
    lines.push('- none');
  } else {
    for (const corpusVersion of receipt.approved_corpus_versions || []) {
      lines.push(`- ${corpusVersion}`);
    }
  }

  lines.push('', '## rollback_guidance', '');
  for (const rollbackPath of receipt.rollback_guidance?.paths || []) {
    lines.push(`- ${rollbackPath}`);
  }

  return `${lines.join('\n')}\n`;
}
