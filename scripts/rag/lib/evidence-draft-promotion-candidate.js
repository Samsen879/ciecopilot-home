import fs from 'node:fs';
import path from 'node:path';

import { loadEvidenceDraftBundle, validateEvidenceDraftReview } from './evidence-draft-review.js';
import { validateProductionEvidenceManifest } from './production-evidence-manifest.js';

const DECLARED_SOURCE_TYPES = ['evidence_authored', 'evidence_transformed', 'evidence_reserved'];
const ENABLED_SOURCE_TYPES = ['evidence_authored', 'evidence_transformed'];
const RESERVED_SOURCE_TYPES = ['evidence_reserved'];

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

function dedupe(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function compileApprovedItem({ draftItem, itemReview, candidateBundleId, approvedIndex }) {
  const approvedPatch = normalizeObject(itemReview.approved_patch);
  const patchedTopicPaths = normalizeStringArray(approvedPatch.topic_paths);
  const topicPaths = patchedTopicPaths.length > 0 ? patchedTopicPaths : normalizeStringArray(draftItem.topic_paths);
  const operatorPatchApplied = Object.keys(approvedPatch).length > 0;

  return {
    evidence_id: `${candidateBundleId}-${String(approvedIndex + 1).padStart(3, '0')}`,
    source_type: 'evidence_authored',
    subject_code: normalizeString(draftItem.subject_code),
    title: normalizeString(approvedPatch.title) || normalizeString(draftItem.title),
    topic_paths: topicPaths,
    statement: normalizeString(approvedPatch.statement) || normalizeString(draftItem.statement),
    provenance: {
      method: 'authored',
      origin_layer: 'production_evidence',
      upstream_source_class: 'none',
      upstream_refs: [],
    },
    review: {
      status: 'approved',
    },
    review_trace: {
      source_draft_bundle_id: normalizeString(itemReview.source_bundle_id) || null,
      source_draft_evidence_id: normalizeString(draftItem.evidence_id) || null,
      source_brief_id: normalizeString(draftItem.draft_context?.brief_id) || null,
      canonical_target_topic_path: normalizeString(draftItem.draft_context?.canonical_target_topic_path) || null,
      canonical_target_title: normalizeString(draftItem.draft_context?.canonical_target_title) || null,
      claim_type: normalizeString(draftItem.draft_context?.claim_type) || null,
      anchor_topic_paths: normalizeStringArray(draftItem.draft_context?.anchor_topic_paths),
      source_objective_titles: normalizeStringArray(draftItem.draft_context?.source_objective_titles),
      operator_decision_reason: normalizeString(itemReview.decision_reason) || null,
      operator_patch_applied: operatorPatchApplied,
    },
  };
}

function buildManifest({ bundle, review, candidateBundleId, generatedAt, items }) {
  const subjectCodes = dedupe(items.map((item) => normalizeString(item.subject_code))).sort();
  const manifest = normalizeObject(bundle.manifest);

  return {
    manifest_role: 'production_evidence_bundle',
    evidence_layer: 'production_evidence',
    policy_mode: 'production_evidence',
    schema_version: 'v1',
    bundle_id: candidateBundleId,
    generated_at: generatedAt,
    bundle_status: 'governance_seed_only',
    subject_scope: subjectCodes.length === 1 ? 'single_subject' : 'mixed_subject',
    subject_codes: subjectCodes,
    language: normalizeString(manifest.language) || 'en',
    declared_source_types: [...DECLARED_SOURCE_TYPES],
    enabled_source_types: [...ENABLED_SOURCE_TYPES],
    allowed_source_types: [...ENABLED_SOURCE_TYPES],
    reserved_source_types: [...RESERVED_SOURCE_TYPES],
    restricted_official_posture: 'internal_context_only',
    items_file: 'items.json',
    bundle_item_count: items.length,
    review: {
      status: 'approved',
      owner: normalizeString(review.reviewer),
    },
    notes: [
      `Compiled from reviewed draft bundle ${normalizeString(review.source_bundle_id) || normalizeString(manifest.bundle_id) || 'unknown'}.`,
      'This candidate remains governance_seed_only until a later explicit operator promotion step.',
    ],
  };
}

export function buildEvidenceDraftPromotionCandidate({
  bundle,
  review,
  candidateBundleId,
  generatedAt = new Date().toISOString(),
} = {}) {
  const draftBundle = normalizeObject(bundle);
  const draftItems = normalizeArray(draftBundle.items);
  const reviewObject = normalizeObject(review);
  const validation = validateEvidenceDraftReview({
    review: reviewObject,
    bundle: draftBundle,
  });

  if (!validation.ok) {
    throw new Error(`review decision is invalid: ${validation.errors.join('; ')}`);
  }

  const itemReviewById = new Map(
    normalizeArray(reviewObject.item_reviews).map((itemReview) => [normalizeString(itemReview.evidence_id), itemReview]),
  );
  const approvedItems = [];

  for (const draftItem of draftItems) {
    const itemReview = normalizeObject(itemReviewById.get(normalizeString(draftItem.evidence_id)));
    if (normalizeString(itemReview.decision) !== 'approve') {
      continue;
    }

    approvedItems.push(
      compileApprovedItem({
        draftItem,
        itemReview: {
          ...itemReview,
          source_bundle_id: normalizeString(reviewObject.source_bundle_id),
        },
        candidateBundleId: normalizeString(candidateBundleId),
        approvedIndex: approvedItems.length,
      }),
    );
  }

  if (approvedItems.length === 0) {
    throw new Error('approved item count must be greater than zero');
  }

  const manifest = buildManifest({
    bundle: draftBundle,
    review: reviewObject,
    candidateBundleId: normalizeString(candidateBundleId),
    generatedAt,
    items: approvedItems,
  });
  const manifestValidation = validateProductionEvidenceManifest({
    manifest,
    items: approvedItems,
  });

  if (!manifestValidation.ok) {
    throw new Error(`compiled candidate bundle failed manifest validation: ${manifestValidation.errors.join('; ')}`);
  }

  return {
    generated_at: generatedAt,
    review_id: normalizeString(reviewObject.review_id) || null,
    manifest,
    items: approvedItems,
    validation: manifestValidation,
    decision_summary: {
      approved_count: validation.summary.approved_count,
      rejected_count: validation.summary.rejected_count,
      revise_count: validation.summary.revise_count,
    },
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function renderEvidenceDraftPromotionCandidateReport(result = {}) {
  const lines = [
    '# Evidence Draft Promotion Candidate',
    '',
    `- review_id: \`${normalizeString(result.review_id) || 'unknown'}\``,
    `- bundle_id: \`${normalizeString(result.manifest?.bundle_id) || 'unknown'}\``,
    `- bundle_status: \`${normalizeString(result.manifest?.bundle_status) || 'unknown'}\``,
    `- subject_codes: \`${JSON.stringify(result.manifest?.subject_codes || [])}\``,
    `- approved_count: \`${result.decision_summary?.approved_count || 0}\``,
    `- rejected_count: \`${result.decision_summary?.rejected_count || 0}\``,
    `- revise_count: \`${result.decision_summary?.revise_count || 0}\``,
    `- manifest_validation_ok: \`${Boolean(result.validation?.ok)}\``,
    '',
  ];

  return `${lines.join('\n')}\n`;
}

export function writeEvidenceDraftPromotionCandidateOutputs({
  bundleDir,
  manifestPath: draftManifestPath = null,
  itemsPath: draftItemsPath = null,
  reviewPath: draftReviewPath = null,
  decisionJsonPath,
  candidateDir,
  outJson = null,
  outMd = null,
  candidateBundleId = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  const bundle = loadEvidenceDraftBundle({
    bundleDir,
    manifestPath: draftManifestPath,
    itemsPath: draftItemsPath,
    reviewPath: draftReviewPath,
  });
  const review = readJson(decisionJsonPath);
  const bundleId = normalizeString(candidateBundleId) || path.basename(candidateDir);
  const result = buildEvidenceDraftPromotionCandidate({
    bundle,
    review,
    candidateBundleId: bundleId,
    generatedAt,
  });

  const manifestPath = path.join(candidateDir, 'manifest.json');
  const itemsPath = path.join(candidateDir, 'items.json');
  fs.mkdirSync(candidateDir, { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(result.manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(itemsPath, `${JSON.stringify(result.items, null, 2)}\n`, 'utf8');

  if (outJson) {
    fs.mkdirSync(path.dirname(outJson), { recursive: true });
    fs.writeFileSync(outJson, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  }
  if (outMd) {
    fs.mkdirSync(path.dirname(outMd), { recursive: true });
    fs.writeFileSync(outMd, renderEvidenceDraftPromotionCandidateReport(result), 'utf8');
  }

  return {
    ...result,
    candidateDir,
    manifestPath,
    itemsPath,
    outJson,
    outMd,
  };
}
