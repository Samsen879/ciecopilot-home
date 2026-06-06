#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const DEFAULT_EXPECTED_SHARD_COUNTS = Object.freeze({
  '9231_p1_s20_standard_001': 21,
  '9231_p1_w19_standard_001': 33,
  '9231_p2_s20_standard_001': 24,
  '9231_p2_w19_standard_001': 33,
  '9231_p3_s20_standard_001': 21,
  '9231_p4_s20_standard_001': 18,
});

const DEFAULTS = Object.freeze({
  generatedOn: '2026-06-07',
  sourceRemediationReport: 'docs/reports/2026-06-06-9231-wm-source-remediation-gate.json',
  cropRenderGate: 'docs/reports/2026-06-06-9231-wm-final-crop-render-gate.json',
  cropManifest: 'data/manifests/9231_wm_final_crop_manifest_2026_06_06_v1.json',
  vlmReviewJson: 'docs/reports/2026-06-07-9231-wm-final-visual-review-vlm.json',
  jsonOut: 'docs/reports/2026-06-07-9231-wm-final-visual-review-gate.json',
  markdownOut: 'docs/reports/2026-06-07-9231-wm-final-visual-review-gate.md',
});

function writeStdoutLine(message) {
  fs.writeSync(1, `${message}\n`);
}

function writeStderrLine(message) {
  fs.writeSync(2, `${message}\n`);
}

function requiredValue(argv, index, flag) {
  const value = argv[index + 1] ?? null;
  if (!value || String(value).startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function printUsage() {
  writeStdoutLine([
    'Usage: node scripts/learning/build_9231_wm_final_visual_review_gate.js',
    '  [--generated-on <YYYY-MM-DD>]',
    '  [--source-remediation-report <path>]',
    '  [--crop-render-gate <path>]',
    '  [--crop-manifest <path>]',
    '  [--vlm-review-json <path>]',
    '  [--json-out <path>]',
    '  [--markdown-out <path>]',
  ].join('\n'));
}

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    ...DEFAULTS,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help') {
      options.help = true;
      continue;
    }
    if (token === '--generated-on') {
      options.generatedOn = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--source-remediation-report') {
      options.sourceRemediationReport = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--crop-render-gate') {
      options.cropRenderGate = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--crop-manifest') {
      options.cropManifest = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--vlm-review-json') {
      options.vlmReviewJson = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--json-out') {
      options.jsonOut = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--markdown-out') {
      options.markdownOut = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return options;
}

function resolveFromRoot(rootDir, repoPath) {
  return path.isAbsolute(repoPath) ? repoPath : path.resolve(rootDir, repoPath);
}

function readJson(rootDir, repoPath) {
  return JSON.parse(fs.readFileSync(resolveFromRoot(rootDir, repoPath), 'utf8'));
}

function writeJson(rootDir, repoPath, payload) {
  const filePath = resolveFromRoot(rootDir, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeText(rootDir, repoPath, text) {
  const filePath = resolveFromRoot(rootDir, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, 'utf8');
}

function countWhere(items, predicate) {
  return items.reduce((count, item) => count + (predicate(item) ? 1 : 0), 0);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => String(left).localeCompare(String(right)));
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = String(keyFn(item) || 'unknown');
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function kebabShardId(shardId) {
  return String(shardId).replaceAll('_', '-');
}

function sourceManifestPath(shardId) {
  return `data/manifests/${shardId}_page_chain_surface_v1.json`;
}

function numericUsage(value) {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const usage = {};
  for (const [key, raw] of Object.entries(value)) {
    if (Number.isFinite(raw)) {
      usage[key] = raw;
    }
  }
  return usage;
}

function usageTotals(items) {
  const totals = {};
  for (const item of items) {
    for (const [key, value] of Object.entries(numericUsage(item.vlm_usage))) {
      totals[key] = (totals[key] || 0) + value;
    }
  }
  return Object.fromEntries(Object.entries(totals).sort(([left], [right]) => left.localeCompare(right)));
}

function stackImageExists(rootDir, repoPath) {
  if (!repoPath) {
    return false;
  }
  const filePath = resolveFromRoot(rootDir, repoPath);
  try {
    return fs.statSync(filePath).size > 0;
  } catch {
    return false;
  }
}

function buildReviewIndex(vlmPayload) {
  const byStorageKey = new Map();
  const duplicateStorageKeys = [];
  for (const review of vlmPayload.items || []) {
    if (!review?.storage_key) {
      continue;
    }
    if (byStorageKey.has(review.storage_key)) {
      duplicateStorageKeys.push(review.storage_key);
      continue;
    }
    byStorageKey.set(review.storage_key, review);
  }
  return {
    byStorageKey,
    duplicateStorageKeys: unique(duplicateStorageKeys),
  };
}

function addBlocker(blockers, check, details = {}) {
  blockers.push({
    check,
    severity: 'blocker',
    ...details,
  });
}

function validateSourceRemediationGate(payload, blockers, expectedRows) {
  const summary = payload.summary || {};
  if (
    payload.gate_status !== 'pass'
    || summary.freeze_posture_lifted_by_machine_gate !== true
    || Number(summary.total_after_red_pixels || 0) !== 0
    || Number(summary.affected_frozen_rows || 0) !== expectedRows
  ) {
    addBlocker(blockers, 'source_remediation_gate_not_pass', {
      gate_status: payload.gate_status || null,
      affected_frozen_rows: summary.affected_frozen_rows ?? null,
      total_after_red_pixels: summary.total_after_red_pixels ?? null,
      freeze_posture_lifted_by_machine_gate: summary.freeze_posture_lifted_by_machine_gate ?? null,
    });
  }
}

function validateCropRenderGate(payload, blockers, expectedRows) {
  const summary = payload.summary || {};
  if (
    payload.gate_status !== 'wm_final_crop_render_complete_pending_visual_review'
    || Number(summary.total_rows || 0) !== expectedRows
    || Number(summary.crop_rows_complete || 0) !== expectedRows
    || Number(summary.missing_crops || 0) !== 0
    || Number(summary.blocker_rows || 0) !== 0
    || summary.row_identity_preserved !== true
  ) {
    addBlocker(blockers, 'crop_render_gate_not_complete', {
      gate_status: payload.gate_status || null,
      total_rows: summary.total_rows ?? null,
      crop_rows_complete: summary.crop_rows_complete ?? null,
      missing_crops: summary.missing_crops ?? null,
      blocker_rows: summary.blocker_rows ?? null,
      row_identity_preserved: summary.row_identity_preserved ?? null,
    });
  }
}

function validateCropManifest(cropManifest, blockers, expectedShardCounts) {
  const items = cropManifest.items || [];
  const expectedRows = Object.values(expectedShardCounts).reduce((sum, count) => sum + count, 0);
  const actualCounts = countBy(items, (item) => item.shard_id);
  const expectedShardIds = Object.keys(expectedShardCounts).sort();
  const actualShardIds = Object.keys(actualCounts).sort();

  if (Number(cropManifest.item_count || items.length) !== expectedRows || items.length !== expectedRows) {
    addBlocker(blockers, 'crop_manifest_row_count_mismatch', {
      expected_rows: expectedRows,
      item_count: cropManifest.item_count ?? null,
      actual_rows: items.length,
    });
  }
  if (JSON.stringify(actualShardIds) !== JSON.stringify(expectedShardIds)) {
    addBlocker(blockers, 'crop_manifest_shard_set_mismatch', {
      expected_shards: expectedShardIds,
      actual_shards: actualShardIds,
    });
  }
  for (const [shardId, expectedCount] of Object.entries(expectedShardCounts)) {
    if (Number(actualCounts[shardId] || 0) !== expectedCount) {
      addBlocker(blockers, 'crop_manifest_shard_count_mismatch', {
        shard_id: shardId,
        expected_rows: expectedCount,
        actual_rows: Number(actualCounts[shardId] || 0),
      });
    }
  }
  for (const item of items) {
    if (item.crop_status !== 'complete') {
      addBlocker(blockers, 'crop_manifest_row_not_complete', {
        storage_key: item.storage_key || null,
        shard_id: item.shard_id || null,
        crop_status: item.crop_status || null,
      });
    }
  }

  return {
    expectedRows,
    actualCounts,
  };
}

function reviewAccepted({ review, cropItem, rootDir }) {
  if (!review) {
    return false;
  }
  const checked = review.vlm_checked || {};
  const cropCount = Array.isArray(review.review_crop_paths)
    ? review.review_crop_paths.length
    : (Array.isArray(cropItem.review_crop_paths) ? cropItem.review_crop_paths.length : 0);
  const crossPageAccepted = cropCount > 1
    ? checked.cross_page_continuity_accepted === true
    : (checked.cross_page_continuity_accepted === true || checked.cross_page_continuity_accepted === null);
  const diagramOrTableAccepted = checked.diagram_or_table_presence_accepted === true
    || checked.diagram_or_table_presence_accepted === null;
  return review.status === 'accepted'
    && review.visual_review_status === 'accepted'
    && review.external_vlm_or_api_used === true
    && Boolean(review.vlm_model)
    && Boolean(review.vlm_transport)
    && Boolean(review.vlm_response_id)
    && stackImageExists(rootDir, review.targeted_stack_image_path)
    && checked.question_boundary_accepted === true
    && checked.visual_legibility_accepted === true
    && crossPageAccepted
    && diagramOrTableAccepted
    && Array.isArray(review.vlm_blockers)
    && review.vlm_blockers.length === 0;
}

function visualStatusForItem({ cropItem, review, sourceManifest, sourceManifestIndex, rootDir, vlmReviewJson }) {
  const base = {
    storage_key: cropItem.storage_key,
    shard_id: cropItem.shard_id,
    source_manifest: sourceManifest,
    source_manifest_index: sourceManifestIndex,
    q_number: cropItem.q_number,
    source_pdf: cropItem.source_pdf,
    crop_status: cropItem.crop_status,
    wm_final_crop_phase: cropItem.wm_final_crop_phase || null,
    source_remediation_status: cropItem.source_remediation_status || null,
    source_freeze_status: cropItem.source_freeze_status || null,
    source_cleanliness_status: cropItem.source_cleanliness_status || null,
    visual_review_evidence_path: vlmReviewJson,
  };
  if (!review) {
    return {
      ...base,
      visual_review_status: 'missing',
      accepted: false,
      blockers: [{
        check: 'missing_vlm_visual_review',
        severity: 'blocker',
        storage_key: cropItem.storage_key,
      }],
    };
  }

  const accepted = reviewAccepted({ review, cropItem, rootDir });
  const blockers = [];
  if (!accepted) {
    blockers.push({
      check: 'vlm_visual_review_not_accepted',
      severity: 'blocker',
      storage_key: cropItem.storage_key,
      status: review.status || null,
      visual_review_status: review.visual_review_status || null,
      external_vlm_or_api_used: review.external_vlm_or_api_used === true,
      has_model: Boolean(review.vlm_model),
      has_transport: Boolean(review.vlm_transport),
      has_response_id: Boolean(review.vlm_response_id),
      stack_image_path: review.targeted_stack_image_path || null,
      stack_image_exists: stackImageExists(rootDir, review.targeted_stack_image_path),
      vlm_checked: review.vlm_checked || {},
      vlm_blockers: review.vlm_blockers || [],
    });
  }

  return {
    ...base,
    visual_review_status: accepted ? 'accepted' : 'rejected',
    accepted,
    reviewed_by: review.reviewed_by || null,
    reviewed_on: review.reviewed_on || null,
    external_vlm_or_api_used: review.external_vlm_or_api_used === true,
    vlm_model: review.vlm_model || null,
    vlm_transport: review.vlm_transport || null,
    vlm_response_id: review.vlm_response_id || null,
    vlm_usage: numericUsage(review.vlm_usage),
    vlm_checked: review.vlm_checked || {},
    vlm_blockers: review.vlm_blockers || [],
    vlm_warnings: review.vlm_warnings || [],
    vlm_notes: review.vlm_notes || '',
    targeted_stack_image_path: review.targeted_stack_image_path || null,
    review_crop_paths: review.review_crop_paths || cropItem.review_crop_paths || [],
    blockers,
  };
}

function applyVisualReviewToSurfaceItem(item, visual) {
  if (!visual.accepted) {
    return {
      ...item,
      visual_review_status: visual.visual_review_status,
      visual_review_required: true,
      visual_review_reason: visual.blockers?.[0]?.check || 'vlm_visual_review_not_accepted',
      visual_review_evidence_path: visual.visual_review_evidence_path,
      production_ready_claimed: false,
      db_consumption_claimed: false,
      search_consumption_claimed: false,
      rag_consumption_claimed: false,
    };
  }

  return {
    ...item,
    surface_evidence_status: 'external_vlm_wm_final_visual_review_accepted',
    page_chain_surface_status: 'wm_final_crop_render_external_vlm_visual_review_accepted',
    visual_review_status: 'accepted',
    visual_review_required: false,
    visual_review_reason: 'external_vlm_wm_final_visual_review_accepted',
    visual_review_method: 'qwen_vlm_external_authorized',
    visual_review_evidence_path: visual.visual_review_evidence_path,
    visual_reviewed_on: visual.reviewed_on,
    visual_reviewed_by: visual.reviewed_by,
    visual_review_stack_image_path: visual.targeted_stack_image_path,
    visual_review_vlm_model: visual.vlm_model,
    visual_review_vlm_transport: visual.vlm_transport,
    visual_review_vlm_response_id: visual.vlm_response_id,
    visual_review_vlm_usage: visual.vlm_usage,
    visual_review_vlm_checked: visual.vlm_checked,
    visual_review_vlm_warnings: visual.vlm_warnings,
    external_vlm_or_api_used: true,
    external_ocr_rerun_used: false,
    text_evidence_status: item.text_evidence_status ?? 'not_extracted',
    normalized_plain_text: item.normalized_plain_text ?? null,
    text_consumption_status: item.text_consumption_status ?? 'not_ready_missing_question_plain_text',
    text_only_ready: item.text_only_ready === true,
    image_context_required: item.image_context_required !== false,
    eligible_for_question_plain_text_v1: true,
    eligible_for_question_plain_text_v2: false,
    eligible_for_normalized_plain_text_consumption_gate: false,
    production_ready_claimed: false,
    db_consumption_claimed: false,
    search_consumption_claimed: false,
    rag_consumption_claimed: false,
  };
}

function buildSurfaceIndex(rootDir, sourceManifests, blockers) {
  const byStorageKey = new Map();
  const surfaceRecords = [];
  for (const sourceManifest of sourceManifests) {
    const surface = readJson(rootDir, sourceManifest);
    const items = Array.isArray(surface.items) ? surface.items : [];
    surfaceRecords.push({
      path: sourceManifest,
      payload: surface,
      items,
    });
    items.forEach((item, index) => {
      if (!item?.storage_key) {
        return;
      }
      byStorageKey.set(item.storage_key, {
        sourceManifest,
        sourceManifestIndex: index,
        item,
      });
    });
  }

  for (const sourceManifest of sourceManifests) {
    const storageKeys = surfaceRecords
      .find((record) => record.path === sourceManifest)
      ?.items
      ?.map((item) => item.storage_key)
      ?.filter(Boolean) || [];
    if (new Set(storageKeys).size !== storageKeys.length) {
      addBlocker(blockers, 'duplicate_surface_storage_key', {
        source_manifest: sourceManifest,
      });
    }
  }

  return {
    byStorageKey,
    surfaceRecords,
  };
}

function summarizeShard({ shardId, rows, generatedOn }) {
  const acceptedRows = countWhere(rows, (row) => row.accepted);
  const missingReviewRows = countWhere(rows, (row) => row.visual_review_status === 'missing');
  const rejectedRows = countWhere(rows, (row) => row.visual_review_status === 'rejected');
  const blockers = rows.flatMap((row) => row.blockers || []);
  return {
    shard_id: shardId,
    status: blockers.length ? 'blocked' : 'pass',
    generated_on: generatedOn,
    summary: {
      rows: rows.length,
      accepted_rows: acceptedRows,
      rejected_rows: rejectedRows,
      missing_review_rows: missingReviewRows,
      source_pdf_count: unique(rows.map((row) => row.source_pdf)).length,
      blocker_count: blockers.length,
    },
    source_pdfs: unique(rows.map((row) => row.source_pdf)),
    blockers,
    rows,
  };
}

export function build9231WmFinalVisualReviewGate({
  rootDir = ROOT,
  generatedOn = DEFAULTS.generatedOn,
  sourceRemediationReport = DEFAULTS.sourceRemediationReport,
  cropRenderGate = DEFAULTS.cropRenderGate,
  cropManifest = DEFAULTS.cropManifest,
  vlmReviewJson = DEFAULTS.vlmReviewJson,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
  expectedShardCounts = DEFAULT_EXPECTED_SHARD_COUNTS,
} = {}) {
  const blockers = [];
  const sourceGate = readJson(rootDir, sourceRemediationReport);
  const cropGate = readJson(rootDir, cropRenderGate);
  const cropPayload = readJson(rootDir, cropManifest);
  const vlmPayload = readJson(rootDir, vlmReviewJson);
  const cropItems = Array.isArray(cropPayload.items) ? cropPayload.items : [];
  const { expectedRows } = validateCropManifest(cropPayload, blockers, expectedShardCounts);

  validateSourceRemediationGate(sourceGate, blockers, expectedRows);
  validateCropRenderGate(cropGate, blockers, expectedRows);

  const sourceManifests = unique(Object.keys(expectedShardCounts).map(sourceManifestPath));
  const { byStorageKey: surfaceByStorageKey, surfaceRecords } = buildSurfaceIndex(rootDir, sourceManifests, blockers);
  const { byStorageKey: reviewByStorageKey, duplicateStorageKeys } = buildReviewIndex(vlmPayload);
  for (const storageKey of duplicateStorageKeys) {
    addBlocker(blockers, 'duplicate_vlm_visual_review_storage_key', { storage_key: storageKey });
  }

  const visualRowsByStorageKey = new Map();
  const visualRowsByShardId = new Map();
  for (const cropItem of cropItems) {
    const surfaceRef = surfaceByStorageKey.get(cropItem.storage_key);
    if (!surfaceRef) {
      addBlocker(blockers, 'crop_manifest_row_missing_surface_match', {
        storage_key: cropItem.storage_key || null,
        shard_id: cropItem.shard_id || null,
      });
    }
    const sourceManifest = surfaceRef?.sourceManifest || sourceManifestPath(cropItem.shard_id);
    const visual = visualStatusForItem({
      cropItem,
      review: reviewByStorageKey.get(cropItem.storage_key),
      sourceManifest,
      sourceManifestIndex: surfaceRef?.sourceManifestIndex ?? null,
      rootDir,
      vlmReviewJson,
    });
    visualRowsByStorageKey.set(cropItem.storage_key, visual);
    const shardRows = visualRowsByShardId.get(cropItem.shard_id) || [];
    shardRows.push(visual);
    visualRowsByShardId.set(cropItem.shard_id, shardRows);
    blockers.push(...(visual.blockers || []));
  }

  const updatedSurfaces = [];
  for (const record of surfaceRecords) {
    const updatedItems = record.items.map((item) => {
      const visual = visualRowsByStorageKey.get(item.storage_key);
      return visual ? applyVisualReviewToSurfaceItem(item, visual) : item;
    });
    const visualRows = updatedItems
      .map((item) => visualRowsByStorageKey.get(item.storage_key))
      .filter(Boolean);
    const acceptedRows = countWhere(visualRows, (row) => row.accepted);
    const rejectedRows = countWhere(visualRows, (row) => row.visual_review_status === 'rejected');
    const missingReviewRows = countWhere(visualRows, (row) => row.visual_review_status === 'missing');
    updatedSurfaces.push({
      path: record.path,
      payload: {
        ...record.payload,
        items: updatedItems,
        visual_review_wm_final_gate: {
          schema_version: '9231_wm_final_visual_review_surface_gate_v1',
          generated_on: generatedOn,
          status: rejectedRows === 0 && missingReviewRows === 0 ? 'pass' : 'blocked',
          source_vlm_review_json: vlmReviewJson,
          gate_json: jsonOut,
          accepted_rows: acceptedRows,
          rejected_rows: rejectedRows,
          missing_review_rows: missingReviewRows,
          external_vlm_or_api_used_for_visual_review: true,
          production_ready_claimed: false,
          db_search_rag_consumption_claimed: false,
        },
      },
    });
  }

  const visualRows = [...visualRowsByStorageKey.values()];
  const reviewedRows = countWhere(visualRows, (row) => row.visual_review_status !== 'missing');
  const acceptedRows = countWhere(visualRows, (row) => row.accepted);
  const rejectedRows = countWhere(visualRows, (row) => row.visual_review_status === 'rejected');
  const missingReviewRows = countWhere(visualRows, (row) => row.visual_review_status === 'missing');
  const shards = [...visualRowsByShardId.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([shardId, rows]) => summarizeShard({ shardId, rows, generatedOn }));
  const usage = usageTotals(visualRows);
  const status = blockers.length ? 'blocked' : 'pass';

  return {
    schema_version: '9231_wm_final_visual_review_gate_v1',
    generated_on: generatedOn,
    subject_code: '9231',
    status,
    gate_status: status,
    visual_review_gate_passed: status === 'pass',
    production_ready_claimed: false,
    db_search_rag_consumption_claimed: false,
    boundary: {
      external_vlm_or_api_used_for_visual_review: true,
      external_ocr_rerun_used: false,
      not_question_plain_text_v1_or_v2: true,
      not_authority_alignment_gate: true,
      not_db_search_rag_consumption_gate: true,
      not_final_production_ready: true,
    },
    artifacts: {
      source_remediation_report: sourceRemediationReport,
      crop_render_gate: cropRenderGate,
      crop_manifest: cropManifest,
      source_vlm_review_json: vlmReviewJson,
      json: jsonOut,
      markdown: markdownOut,
    },
    summary: {
      selected_shards: visualRowsByShardId.size,
      expected_rows: expectedRows,
      selected_rows: cropItems.length,
      reviewed_rows: reviewedRows,
      accepted_rows: acceptedRows,
      rejected_rows: rejectedRows,
      missing_review_rows: missingReviewRows,
      duplicate_review_storage_keys: duplicateStorageKeys.length,
      updated_surface_manifests: updatedSurfaces.length,
      passed_shards: countWhere(shards, (shard) => shard.status === 'pass'),
      blocked_shards: countWhere(shards, (shard) => shard.status !== 'pass'),
      blocker_count: blockers.length,
      vlm_usage: usage,
    },
    expected_shard_counts: expectedShardCounts,
    actual_shard_counts: countBy(cropItems, (item) => item.shard_id),
    shards,
    blockers,
    updated_surfaces: updatedSurfaces,
  };
}

export function render9231WmFinalVisualReviewMarkdown(result) {
  const lines = [
    '# 9231 WM Final Visual Review Gate',
    '',
    `- generated_on: \`${result.generated_on}\``,
    `- status: \`${result.status}\``,
    `- visual_review_gate_passed: \`${result.visual_review_gate_passed}\``,
    `- production_ready_claimed: \`${result.production_ready_claimed}\``,
    `- source VLM review JSON: \`${result.artifacts.source_vlm_review_json}\``,
    '- External VLM/API use was explicitly authorized for this evidence layer. This gate does not claim v1/v2 text readiness, authority alignment, DB/search/read-model/RAG consumption, or production readiness.',
    '',
    '## Counts',
    '',
    '| metric | value |',
    '| --- | ---: |',
    `| selected shards | ${result.summary.selected_shards} |`,
    `| expected rows | ${result.summary.expected_rows} |`,
    `| selected rows | ${result.summary.selected_rows} |`,
    `| reviewed rows | ${result.summary.reviewed_rows} |`,
    `| accepted rows | ${result.summary.accepted_rows} |`,
    `| rejected rows | ${result.summary.rejected_rows} |`,
    `| missing review rows | ${result.summary.missing_review_rows} |`,
    `| duplicate review storage keys | ${result.summary.duplicate_review_storage_keys} |`,
    `| updated surface manifests | ${result.summary.updated_surface_manifests} |`,
    `| passed shards | ${result.summary.passed_shards} |`,
    `| blocked shards | ${result.summary.blocked_shards} |`,
    `| blockers | ${result.summary.blocker_count} |`,
    '',
    '## Token Usage',
    '',
    '| metric | value |',
    '| --- | ---: |',
  ];
  const usageEntries = Object.entries(result.summary.vlm_usage || {});
  if (usageEntries.length) {
    for (const [key, value] of usageEntries) {
      lines.push(`| ${key} | ${value} |`);
    }
  } else {
    lines.push('| none recorded | 0 |');
  }
  lines.push(
    '',
    '## Artifacts',
    '',
    `- source remediation gate: \`${result.artifacts.source_remediation_report}\``,
    `- crop/render gate: \`${result.artifacts.crop_render_gate}\``,
    `- crop manifest: \`${result.artifacts.crop_manifest}\``,
    `- VLM review JSON: \`${result.artifacts.source_vlm_review_json}\``,
    `- gate JSON: \`${result.artifacts.json}\``,
    '',
    '## Shards',
    '',
    '| shard | status | rows | accepted | blocked |',
    '| --- | --- | ---: | ---: | ---: |',
  );
  for (const shard of result.shards) {
    const blocked = shard.summary.rejected_rows + shard.summary.missing_review_rows;
    lines.push(`| \`${shard.shard_id}\` | \`${shard.status}\` | ${shard.summary.rows} | ${shard.summary.accepted_rows} | ${blocked} |`);
  }
  lines.push(
    '',
    '## Blockers',
    '',
    '| check | storage_key |',
    '| --- | --- |',
  );
  if (result.blockers.length) {
    for (const blocker of result.blockers) {
      lines.push(`| \`${blocker.check}\` | \`${blocker.storage_key || ''}\` |`);
    }
  } else {
    lines.push('| none |  |');
  }
  lines.push('');
  return lines.join('\n');
}

export function write9231WmFinalVisualReviewGateArtifacts(result, {
  rootDir = ROOT,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
} = {}) {
  for (const surface of result.updated_surfaces) {
    writeJson(rootDir, surface.path, surface.payload);
  }
  const persisted = {
    ...result,
    updated_surfaces: result.updated_surfaces.map((surface) => ({
      path: surface.path,
      item_count: surface.payload.items?.length || 0,
    })),
  };
  writeJson(rootDir, jsonOut, persisted);
  writeText(rootDir, markdownOut, render9231WmFinalVisualReviewMarkdown(result));
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return null;
  }
  const result = build9231WmFinalVisualReviewGate(options);
  write9231WmFinalVisualReviewGateArtifacts(result, {
    rootDir: options.rootDir || ROOT,
    jsonOut: options.jsonOut,
    markdownOut: options.markdownOut,
  });
  writeStdoutLine(JSON.stringify({
    status: result.status,
    summary: result.summary,
  }, null, 2));
  if (result.status !== 'pass') {
    throw new Error('9231 WM-final visual review gate failed.');
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    main();
  } catch (error) {
    writeStderrLine(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
