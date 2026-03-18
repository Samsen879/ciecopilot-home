import fs from 'node:fs';
import path from 'node:path';

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
  return normalizeArray(value).map((item) => normalizeString(item)).filter(Boolean);
}

function toRel(filePath) {
  return path.relative(process.cwd(), filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function pushError(errors, message) {
  errors.push(message);
}

function resolveDraftBundlePaths(input) {
  if (typeof input === 'string') {
    return resolveDraftBundlePaths({ bundleDir: input });
  }

  const source = normalizeObject(input);
  const bundleDir = normalizeString(source.bundleDir || source.bundle_dir);
  const manifestPathInput = normalizeString(source.manifestPath || source.manifest_path);
  const itemsPathInput = normalizeString(source.itemsPath || source.items_path);
  const reviewPathInput = normalizeString(source.reviewPath || source.review_path);
  const usesBundleDir = Boolean(bundleDir);
  const usesExplicitPaths = Boolean(manifestPathInput || itemsPathInput || reviewPathInput);

  if (!usesBundleDir && !usesExplicitPaths) {
    throw new Error('bundle input is required');
  }
  if (usesBundleDir && usesExplicitPaths) {
    throw new Error('bundle input must use either --bundle-dir or explicit --manifest/--items-json paths');
  }

  if (usesBundleDir) {
    const manifestPath = path.join(bundleDir, 'manifest.json');
    const reviewPath = path.join(bundleDir, 'review.md');

    return {
      bundleDir,
      manifestPath,
      itemsPath: null,
      reviewPath: fs.existsSync(reviewPath) ? reviewPath : null,
    };
  }

  if (!manifestPathInput || !itemsPathInput) {
    throw new Error('explicit bundle input requires both manifest and items json paths');
  }

  return {
    bundleDir: path.dirname(manifestPathInput),
    manifestPath: manifestPathInput,
    itemsPath: itemsPathInput,
    reviewPath: reviewPathInput || null,
  };
}

export function loadEvidenceDraftBundle(input) {
  const { bundleDir, manifestPath, itemsPath: explicitItemsPath, reviewPath: explicitReviewPath } = resolveDraftBundlePaths(input);

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`draft manifest not found: ${manifestPath}`);
  }

  const manifest = readJson(manifestPath);
  const itemsFile = normalizeString(manifest.items_file) || 'items.json';
  const itemsPath = explicitItemsPath || path.join(bundleDir, itemsFile);
  const fallbackReviewPath = path.join(bundleDir, 'review.md');
  const reviewPath = explicitReviewPath
    ? explicitReviewPath
    : fs.existsSync(fallbackReviewPath)
      ? fallbackReviewPath
      : null;

  if (!fs.existsSync(itemsPath)) {
    throw new Error(`draft items not found: ${itemsPath}`);
  }
  if (explicitReviewPath && !fs.existsSync(explicitReviewPath)) {
    throw new Error(`draft review markdown not found: ${explicitReviewPath}`);
  }

  return {
    bundle_dir: bundleDir,
    manifest_path: manifestPath,
    items_path: itemsPath,
    review_path: reviewPath,
    manifest,
    items: readJson(itemsPath),
    review_markdown: reviewPath ? fs.readFileSync(reviewPath, 'utf8') : '',
  };
}

export function buildEvidenceDraftReviewTemplate({
  bundle,
  reviewId,
  generatedAt = new Date().toISOString(),
  reviewer = '',
} = {}) {
  const draftBundle = normalizeObject(bundle);
  const manifest = normalizeObject(draftBundle.manifest);
  const items = normalizeArray(draftBundle.items);

  return {
    schema_version: 'evidence_draft_review_v1',
    review_id: normalizeString(reviewId) || `review-${manifest.bundle_id || 'unknown'}`,
    generated_at: generatedAt,
    reviewed_at: null,
    source_bundle_id: normalizeString(manifest.bundle_id) || null,
    source_bundle_path: draftBundle.bundle_dir ? toRel(draftBundle.bundle_dir) : null,
    source_generation_mode: normalizeString(manifest.draft_context?.generation_mode) || null,
    review_status: 'pending',
    reviewer: normalizeString(reviewer),
    review_notes: null,
    item_reviews: items.map((item) => ({
      evidence_id: normalizeString(item?.evidence_id) || null,
      brief_id: normalizeString(item?.draft_context?.brief_id) || null,
      subject_code: normalizeString(item?.subject_code) || null,
      legacy_target_topic_path: normalizeStringArray(item?.topic_paths)[0] || null,
      canonical_target_topic_path: normalizeString(item?.draft_context?.canonical_target_topic_path) || null,
      decision: null,
      decision_reason: null,
      approved_patch: {},
    })),
  };
}

export function validateEvidenceDraftReview({ review = null, bundle = null } = {}) {
  const errors = [];
  const reviewObject = normalizeObject(review);
  const draftBundle = normalizeObject(bundle);
  const bundleItems = normalizeArray(draftBundle.items);
  const itemReviews = normalizeArray(reviewObject.item_reviews);
  const allowedDecisions = new Set(['approve', 'reject', 'revise']);
  const allowedPatchKeys = new Set(['title', 'statement', 'topic_paths']);
  const itemReviewById = new Map(
    itemReviews
      .map((itemReview) => [normalizeString(itemReview?.evidence_id), normalizeObject(itemReview)])
      .filter(([evidenceId]) => Boolean(evidenceId)),
  );

  if (normalizeString(reviewObject.schema_version) !== 'evidence_draft_review_v1') {
    pushError(errors, 'schema_version must be evidence_draft_review_v1');
  }
  if (!normalizeString(reviewObject.review_id)) {
    pushError(errors, 'review_id is required');
  }
  if (!normalizeString(reviewObject.generated_at)) {
    pushError(errors, 'generated_at is required');
  }

  const reviewStatus = normalizeString(reviewObject.review_status);
  if (reviewStatus !== 'pending' && reviewStatus !== 'completed') {
    pushError(errors, 'review_status must be pending or completed');
  }

  if (!normalizeString(reviewObject.reviewer)) {
    pushError(errors, 'reviewer is required');
  }

  for (const [index, item] of bundleItems.entries()) {
    const evidenceId = normalizeString(item?.evidence_id);
    const itemReview = itemReviewById.get(evidenceId);

    if (!itemReview) {
      pushError(errors, `item_reviews is missing evidence_id ${evidenceId || `at index ${index}`}`);
      continue;
    }

    const decision = normalizeString(itemReview.decision);
    if (reviewStatus === 'completed') {
      if (!decision) {
        pushError(errors, `item_reviews[${index}].decision is required`);
      } else if (!allowedDecisions.has(decision)) {
        pushError(errors, `item_reviews[${index}].decision must be approve, reject, or revise`);
      }
    } else if (decision && !allowedDecisions.has(decision)) {
      pushError(errors, `item_reviews[${index}].decision must be approve, reject, or revise`);
    }

    if ((decision === 'reject' || decision === 'revise') && !normalizeString(itemReview.decision_reason)) {
      pushError(errors, `item_reviews[${index}].decision_reason is required`);
    }

    const approvedPatch = normalizeObject(itemReview.approved_patch);
    for (const key of Object.keys(approvedPatch)) {
      if (!allowedPatchKeys.has(key)) {
        pushError(errors, `item_reviews[${index}].approved_patch.${key} is not allowed`);
      }
    }
    if (Array.isArray(approvedPatch.topic_paths) && normalizeStringArray(approvedPatch.topic_paths).length === 0) {
      pushError(errors, `item_reviews[${index}].approved_patch.topic_paths must not be empty`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      review_id: normalizeString(reviewObject.review_id) || null,
      source_bundle_id: normalizeString(reviewObject.source_bundle_id) || null,
      review_status: reviewStatus || null,
      item_review_count: itemReviews.length,
      approved_count: itemReviews.filter((itemReview) => normalizeString(itemReview.decision) === 'approve').length,
      rejected_count: itemReviews.filter((itemReview) => normalizeString(itemReview.decision) === 'reject').length,
      revise_count: itemReviews.filter((itemReview) => normalizeString(itemReview.decision) === 'revise').length,
    },
  };
}

export function renderEvidenceDraftReviewReport({ bundle = null, review = null } = {}) {
  const draftBundle = normalizeObject(bundle);
  const reviewObject = normalizeObject(review);
  const itemReviews = normalizeArray(reviewObject.item_reviews);
  const lines = [
    '# Evidence Draft Review Decision',
    '',
    `- source_bundle_id: \`${normalizeString(reviewObject.source_bundle_id) || normalizeString(draftBundle.manifest?.bundle_id) || 'unknown'}\``,
    `- review_id: \`${normalizeString(reviewObject.review_id) || 'unknown'}\``,
    `- reviewer: \`${normalizeString(reviewObject.reviewer) || 'unassigned'}\``,
    `- decision: \`${normalizeString(reviewObject.review_status) || 'unknown'}\``,
    '',
    '## Item Decisions',
    '',
  ];

  if (itemReviews.length === 0) {
    lines.push('- none');
  } else {
    for (const itemReview of itemReviews) {
      lines.push(`### ${normalizeString(itemReview.evidence_id) || 'unknown'}`);
      lines.push('');
      lines.push(`- subject_code: \`${normalizeString(itemReview.subject_code) || 'unknown'}\``);
      lines.push(`- legacy_target_topic_path: \`${normalizeString(itemReview.legacy_target_topic_path) || 'unknown'}\``);
      lines.push(`- canonical_target_topic_path: \`${normalizeString(itemReview.canonical_target_topic_path) || 'unknown'}\``);
      lines.push(`- decision: \`${normalizeString(itemReview.decision) || 'pending'}\``);
      lines.push(`- decision_reason: ${normalizeString(itemReview.decision_reason) || 'n/a'}`);
      lines.push('');
    }
  }

  return `${lines.join('\n')}\n`;
}

export function writeEvidenceDraftReviewScaffoldOutputs({
  bundleDir,
  manifestPath = null,
  itemsPath = null,
  reviewPath = null,
  outJson,
  outMd = null,
  reviewer = '',
  reviewId = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  const bundle = loadEvidenceDraftBundle({
    bundleDir,
    manifestPath,
    itemsPath,
    reviewPath,
  });
  const review = buildEvidenceDraftReviewTemplate({
    bundle,
    reviewId,
    generatedAt,
    reviewer,
  });

  if (outJson) {
    fs.mkdirSync(path.dirname(outJson), { recursive: true });
    fs.writeFileSync(outJson, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
  }

  if (outMd) {
    fs.mkdirSync(path.dirname(outMd), { recursive: true });
    fs.writeFileSync(outMd, renderEvidenceDraftReviewReport({ bundle, review }), 'utf8');
  }

  return {
    bundle,
    review,
    outJson,
    outMd,
  };
}
