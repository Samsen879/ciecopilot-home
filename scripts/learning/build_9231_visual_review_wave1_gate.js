#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const DEFAULTS = Object.freeze({
  generatedOn: '2026-06-05',
  selectionManifest: 'data/manifests/9231_production_ready_wave1_16_2026_06_05_manifest_v1.json',
  vlmReviewJson: 'docs/reports/2026-06-05-9231-visual-review-wave1-vlm.json',
  jsonOut: 'docs/reports/2026-06-05-9231-visual-review-wave1-gate.json',
  markdownOut: 'docs/reports/2026-06-05-9231-visual-review-wave1-gate.md',
  reportsDir: 'docs/reports',
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
    'Usage: node scripts/learning/build_9231_visual_review_wave1_gate.js',
    '  [--generated-on <YYYY-MM-DD>]',
    '  [--selection-manifest <path>]',
    '  [--vlm-review-json <path>]',
    '  [--json-out <path>]',
    '  [--markdown-out <path>]',
    '  [--reports-dir <path>]',
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
    if (token === '--selection-manifest') {
      options.selectionManifest = requiredValue(argv, index, token);
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
    if (token === '--reports-dir') {
      options.reportsDir = requiredValue(argv, index, token);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return options;
}

function toPosix(value) {
  return String(value || '').replace(/\\/g, '/');
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

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => String(left).localeCompare(String(right)));
}

function countWhere(items, predicate) {
  return items.reduce((count, item) => count + (predicate(item) ? 1 : 0), 0);
}

function kebabShardId(shardId) {
  return String(shardId).replaceAll('_', '-');
}

function reviewAccepted(review) {
  if (!review) {
    return false;
  }
  const checked = review.vlm_checked || {};
  return review.status === 'accepted'
    && review.visual_review_status === 'accepted'
    && checked.question_boundary_accepted === true
    && checked.visual_legibility_accepted === true
    && (checked.cross_page_continuity_accepted === true || checked.cross_page_continuity_accepted === null)
    && Array.isArray(review.vlm_blockers)
    && review.vlm_blockers.length === 0;
}

function buildReviewIndex(vlmPayload) {
  const byStorageKey = new Map();
  const duplicateStorageKeys = [];
  for (const review of vlmPayload.items || []) {
    if (!review?.storage_key) {
      continue;
    }
    const existing = byStorageKey.get(review.storage_key);
    if (existing) {
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

function shardVisualCloseoutPaths({ reportsDir, generatedOn, shardId }) {
  const prefix = `${reportsDir}/${generatedOn}-${kebabShardId(shardId)}-visual-review-closeout`;
  return {
    json: `${prefix}.json`,
    markdown: `${prefix}.md`,
  };
}

function visualStatusForItem(selectionItem, review) {
  if (!review) {
    return {
      storage_key: selectionItem.storage_key,
      shard_id: selectionItem.shard_id,
      source_manifest: selectionItem.source_manifest,
      source_manifest_index: selectionItem.source_manifest_index,
      q_number: selectionItem.q_number,
      source_pdf: selectionItem.source_pdf,
      visual_review_status: 'missing',
      accepted: false,
      blockers: [{
        check: 'missing_vlm_visual_review',
        severity: 'blocker',
        storage_key: selectionItem.storage_key,
      }],
    };
  }

  const accepted = reviewAccepted(review);
  const blockers = [];
  if (!accepted) {
    blockers.push({
      check: 'vlm_visual_review_not_accepted',
      severity: 'blocker',
      storage_key: selectionItem.storage_key,
      status: review.status || null,
      visual_review_status: review.visual_review_status || null,
      vlm_blockers: review.vlm_blockers || [],
      vlm_checked: review.vlm_checked || {},
    });
  }

  return {
    storage_key: selectionItem.storage_key,
    shard_id: selectionItem.shard_id,
    source_manifest: selectionItem.source_manifest,
    source_manifest_index: selectionItem.source_manifest_index,
    q_number: selectionItem.q_number,
    source_pdf: selectionItem.source_pdf,
    visual_review_status: accepted ? 'accepted' : 'rejected',
    accepted,
    reviewed_by: review.reviewed_by || null,
    reviewed_on: review.reviewed_on || null,
    external_vlm_or_api_used: review.external_vlm_or_api_used === true,
    vlm_model: review.vlm_model || null,
    vlm_transport: review.vlm_transport || null,
    vlm_response_id: review.vlm_response_id || null,
    vlm_checked: review.vlm_checked || {},
    vlm_blockers: review.vlm_blockers || [],
    vlm_warnings: review.vlm_warnings || [],
    vlm_notes: review.vlm_notes || '',
    targeted_stack_image_path: review.targeted_stack_image_path || null,
    review_crop_paths: review.review_crop_paths || [],
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
    surface_evidence_status: 'external_vlm_visual_review_accepted',
    page_chain_surface_status: 'crop_render_complete_external_vlm_visual_review_accepted',
    visual_review_status: 'accepted',
    visual_review_required: false,
    visual_review_reason: 'external_vlm_visual_review_accepted',
    visual_review_method: 'qwen_vlm_external_authorized',
    visual_review_evidence_path: visual.visual_review_evidence_path,
    visual_reviewed_on: visual.reviewed_on,
    visual_reviewed_by: visual.reviewed_by,
    visual_review_stack_image_path: visual.targeted_stack_image_path,
    visual_review_vlm_model: visual.vlm_model,
    visual_review_vlm_transport: visual.vlm_transport,
    visual_review_vlm_response_id: visual.vlm_response_id,
    visual_review_vlm_checked: visual.vlm_checked,
    visual_review_vlm_warnings: visual.vlm_warnings,
    external_vlm_or_api_used: true,
    external_ocr_rerun_used: false,
    text_evidence_status: item.text_evidence_status ?? 'not_extracted',
    normalized_plain_text: item.normalized_plain_text ?? null,
    text_consumption_status: item.text_consumption_status ?? 'not_ready_missing_question_plain_text',
    text_only_ready: item.text_only_ready === true,
    image_context_required: item.image_context_required !== false,
    production_ready_claimed: false,
    db_consumption_claimed: false,
    search_consumption_claimed: false,
    rag_consumption_claimed: false,
  };
}

function summarizeShard({ shardId, sourceManifest, visualRows, generatedOn, reportsDir }) {
  const rowCount = visualRows.length;
  const acceptedRows = countWhere(visualRows, (row) => row.accepted);
  const missingReviewRows = countWhere(visualRows, (row) => row.visual_review_status === 'missing');
  const rejectedRows = countWhere(visualRows, (row) => row.visual_review_status === 'rejected');
  const sourcePdfs = unique(visualRows.map((row) => row.source_pdf));
  const blockers = visualRows.flatMap((row) => row.blockers || []);
  const closeoutPaths = shardVisualCloseoutPaths({ reportsDir, generatedOn, shardId });

  return {
    schema_version: '9231_visual_review_wave1_shard_closeout_v1',
    generated_on: generatedOn,
    subject_code: '9231',
    shard_id: shardId,
    status: blockers.length ? 'blocked' : 'pass',
    visual_review_gate_passed: blockers.length === 0,
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
    summary: {
      rows: rowCount,
      accepted_rows: acceptedRows,
      rejected_rows: rejectedRows,
      missing_review_rows: missingReviewRows,
      source_pdf_count: sourcePdfs.length,
      blocker_count: blockers.length,
    },
    artifacts: {
      source_manifest: sourceManifest,
      json: closeoutPaths.json,
      markdown: closeoutPaths.markdown,
    },
    source_pdfs: sourcePdfs,
    blockers,
    rows: visualRows,
  };
}

function updateSelectionManifest(selectionManifest, visualRowsByStorageKey, shardCloseouts, {
  generatedOn,
  vlmReviewJson,
  jsonOut,
  markdownOut,
}) {
  const closeoutByShardId = new Map(shardCloseouts.map((shard) => [shard.shard_id, shard]));
  const items = (selectionManifest.items || []).map((item) => {
    const visual = visualRowsByStorageKey.get(item.storage_key);
    return {
      ...item,
      visual_review_wave1_status: visual?.visual_review_status || 'missing',
      visual_review_wave1_accepted: visual?.accepted === true,
      visual_review_evidence_path: vlmReviewJson,
      production_ready_claimed: false,
    };
  });

  const acceptedRows = countWhere(items, (item) => item.visual_review_wave1_accepted === true);
  const blockedRows = items.length - acceptedRows;
  return {
    ...selectionManifest,
    gate_status: 'production_blocked',
    boundary: {
      ...(selectionManifest.boundary || {}),
      external_vlm_or_api_used_for_visual_review: true,
      no_external_ocr_rerun: true,
      not_question_plain_text_v1_or_v2: true,
      not_db_search_rag_consumption_gate: true,
      not_final_production_ready: true,
    },
    visual_review_wave1_gate: {
      schema_version: '9231_visual_review_wave1_manifest_gate_v1',
      generated_on: generatedOn,
      status: blockedRows === 0 ? 'pass' : 'blocked',
      visual_review_gate_passed: blockedRows === 0,
      accepted_rows: acceptedRows,
      blocked_rows: blockedRows,
      source_vlm_review_json: vlmReviewJson,
      gate_json: jsonOut,
      gate_markdown: markdownOut,
      shard_closeouts: shardCloseouts.map((shard) => ({
        shard_id: shard.shard_id,
        status: shard.status,
        accepted_rows: shard.summary.accepted_rows,
        blocked_rows: shard.summary.rejected_rows + shard.summary.missing_review_rows,
        json: shard.artifacts.json,
        markdown: shard.artifacts.markdown,
      })),
    },
    summary: {
      ...(selectionManifest.summary || {}),
      visual_review_accepted_rows: acceptedRows,
      visual_review_blocked_rows: blockedRows,
      visual_review_passed_shards: countWhere(shardCloseouts, (shard) => shard.status === 'pass'),
    },
    items,
    shards: (selectionManifest.shards || []).map((shard) => {
      const closeout = closeoutByShardId.get(shard.shard_id);
      if (!closeout) {
        return shard;
      }
      return {
        ...shard,
        visual_review_wave1_status: closeout.status,
        visual_review_wave1_accepted_rows: closeout.summary.accepted_rows,
        visual_review_wave1_blocked_rows: closeout.summary.rejected_rows + closeout.summary.missing_review_rows,
        visual_review_wave1_closeout_json: closeout.artifacts.json,
        visual_review_wave1_closeout_markdown: closeout.artifacts.markdown,
      };
    }),
  };
}

export function build9231VisualReviewWave1Gate({
  rootDir = ROOT,
  generatedOn = DEFAULTS.generatedOn,
  selectionManifest = DEFAULTS.selectionManifest,
  vlmReviewJson = DEFAULTS.vlmReviewJson,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
  reportsDir = DEFAULTS.reportsDir,
} = {}) {
  const selection = readJson(rootDir, selectionManifest);
  const vlmPayload = readJson(rootDir, vlmReviewJson);
  const { byStorageKey, duplicateStorageKeys } = buildReviewIndex(vlmPayload);

  const selectedItems = selection.items || [];
  const sourceManifests = unique(selectedItems.map((item) => item.source_manifest));
  const visualRowsByStorageKey = new Map();
  const visualRowsByShardId = new Map();
  const blockerRows = [];

  for (const item of selectedItems) {
    const review = byStorageKey.get(item.storage_key);
    const visual = {
      ...visualStatusForItem(item, review),
      visual_review_evidence_path: vlmReviewJson,
    };
    visualRowsByStorageKey.set(item.storage_key, visual);
    const shardRows = visualRowsByShardId.get(item.shard_id) || [];
    shardRows.push(visual);
    visualRowsByShardId.set(item.shard_id, shardRows);
    blockerRows.push(...(visual.blockers || []));
  }

  for (const storageKey of duplicateStorageKeys) {
    blockerRows.push({
      check: 'duplicate_vlm_visual_review_storage_key',
      severity: 'blocker',
      storage_key: storageKey,
    });
  }

  const updatedSurfaces = [];
  for (const sourceManifest of sourceManifests) {
    const surface = readJson(rootDir, sourceManifest);
    const items = (surface.items || []).map((item) => {
      const visual = visualRowsByStorageKey.get(item.storage_key);
      return visual ? applyVisualReviewToSurfaceItem(item, visual) : item;
    });
    updatedSurfaces.push({
      path: sourceManifest,
      payload: {
        ...surface,
        items,
        visual_review_wave1_gate: {
          schema_version: '9231_visual_review_wave1_surface_gate_v1',
          generated_on: generatedOn,
          status: countWhere(items, (item) => item.visual_review_status === 'accepted') === items.length
            ? 'pass'
            : 'blocked',
          source_vlm_review_json: vlmReviewJson,
          external_vlm_or_api_used_for_visual_review: true,
          production_ready_claimed: false,
          db_search_rag_consumption_claimed: false,
        },
      },
    });
  }

  const shardCloseouts = [...visualRowsByShardId.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([shardId, rows]) => {
      const sourceManifest = rows[0]?.source_manifest || null;
      return summarizeShard({
        shardId,
        sourceManifest,
        visualRows: rows,
        generatedOn,
        reportsDir,
      });
    });

  const reviewedRows = selectedItems.filter((item) => byStorageKey.has(item.storage_key)).length;
  const acceptedRows = countWhere([...visualRowsByStorageKey.values()], (row) => row.accepted);
  const rejectedRows = countWhere([...visualRowsByStorageKey.values()], (row) => row.visual_review_status === 'rejected');
  const missingReviewRows = countWhere([...visualRowsByStorageKey.values()], (row) => row.visual_review_status === 'missing');
  const result = {
    schema_version: '9231_visual_review_wave1_gate_v1',
    generated_on: generatedOn,
    subject_code: '9231',
    status: blockerRows.length ? 'blocked' : 'pass',
    visual_review_gate_passed: blockerRows.length === 0,
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
      selection_manifest: selectionManifest,
      source_vlm_review_json: vlmReviewJson,
      json: jsonOut,
      markdown: markdownOut,
    },
    summary: {
      selected_shards: visualRowsByShardId.size,
      selected_rows: selectedItems.length,
      reviewed_rows: reviewedRows,
      accepted_rows: acceptedRows,
      rejected_rows: rejectedRows,
      missing_review_rows: missingReviewRows,
      duplicate_review_storage_keys: duplicateStorageKeys.length,
      updated_surface_manifests: updatedSurfaces.length,
      passed_shards: countWhere(shardCloseouts, (shard) => shard.status === 'pass'),
      blocked_shards: countWhere(shardCloseouts, (shard) => shard.status !== 'pass'),
      blocker_count: blockerRows.length,
    },
    shards: shardCloseouts,
    blockers: blockerRows,
    updated_surfaces: updatedSurfaces,
    updated_selection_manifest: updateSelectionManifest(selection, visualRowsByStorageKey, shardCloseouts, {
      generatedOn,
      vlmReviewJson,
      jsonOut,
      markdownOut,
    }),
  };

  return result;
}

export function render9231VisualReviewShardMarkdown(shard) {
  const lines = [
    `# 9231 ${shard.shard_id} Visual Review Closeout`,
    '',
    `- generated_on: \`${shard.generated_on}\``,
    `- status: \`${shard.status}\``,
    `- visual_review_gate_passed: \`${shard.visual_review_gate_passed}\``,
    `- production_ready_claimed: \`${shard.production_ready_claimed}\``,
    '- This report only closes the visual review evidence layer. It is not a v1/v2 text, authority, DB/search, or RAG consumption proof.',
    '',
    '## Counts',
    '',
    '| metric | value |',
    '| --- | ---: |',
    `| rows | ${shard.summary.rows} |`,
    `| accepted rows | ${shard.summary.accepted_rows} |`,
    `| rejected rows | ${shard.summary.rejected_rows} |`,
    `| missing review rows | ${shard.summary.missing_review_rows} |`,
    `| source PDFs | ${shard.summary.source_pdf_count} |`,
    `| blockers | ${shard.summary.blocker_count} |`,
    '',
    '## Artifacts',
    '',
    `- source surface manifest: \`${shard.artifacts.source_manifest}\``,
    `- JSON: \`${shard.artifacts.json}\``,
    '',
    '## Blockers',
    '',
    '| check | storage_key |',
    '| --- | --- |',
  ];
  if (shard.blockers.length) {
    for (const blocker of shard.blockers) {
      lines.push(`| \`${blocker.check}\` | \`${blocker.storage_key || ''}\` |`);
    }
  } else {
    lines.push('| none |  |');
  }
  lines.push('');
  return lines.join('\n');
}

export function render9231VisualReviewWave1Markdown(result) {
  const lines = [
    '# 9231 Visual Review Wave1 Gate',
    '',
    `- generated_on: \`${result.generated_on}\``,
    `- status: \`${result.status}\``,
    `- visual_review_gate_passed: \`${result.visual_review_gate_passed}\``,
    `- production_ready_claimed: \`${result.production_ready_claimed}\``,
    `- source VLM review JSON: \`${result.artifacts.source_vlm_review_json}\``,
    '- External VLM/API use was explicitly authorized for this evidence layer. This gate does not claim v1/v2 text readiness, authority alignment, DB search, or RAG consumption.',
    '',
    '## Counts',
    '',
    '| metric | value |',
    '| --- | ---: |',
    `| selected shards | ${result.summary.selected_shards} |`,
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
    '## Shards',
    '',
    '| shard | status | rows | accepted | blocked | closeout |',
    '| --- | --- | ---: | ---: | ---: | --- |',
  ];
  for (const shard of result.shards) {
    const blocked = shard.summary.rejected_rows + shard.summary.missing_review_rows;
    lines.push(`| \`${shard.shard_id}\` | \`${shard.status}\` | ${shard.summary.rows} | ${shard.summary.accepted_rows} | ${blocked} | \`${shard.artifacts.markdown}\` |`);
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

export function write9231VisualReviewWave1GateArtifacts(result, {
  rootDir = ROOT,
  selectionManifest = DEFAULTS.selectionManifest,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
} = {}) {
  for (const surface of result.updated_surfaces) {
    writeJson(rootDir, surface.path, surface.payload);
  }
  writeJson(rootDir, selectionManifest, result.updated_selection_manifest);
  for (const shard of result.shards) {
    writeJson(rootDir, shard.artifacts.json, shard);
    writeText(rootDir, shard.artifacts.markdown, render9231VisualReviewShardMarkdown(shard));
  }

  const persisted = {
    ...result,
    updated_surfaces: result.updated_surfaces.map((surface) => ({
      path: surface.path,
      item_count: surface.payload.items?.length || 0,
    })),
    updated_selection_manifest: selectionManifest,
  };
  writeJson(rootDir, jsonOut, persisted);
  writeText(rootDir, markdownOut, render9231VisualReviewWave1Markdown(result));
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return null;
  }

  const result = build9231VisualReviewWave1Gate(options);
  write9231VisualReviewWave1GateArtifacts(result, {
    rootDir: options.rootDir || ROOT,
    selectionManifest: options.selectionManifest,
    jsonOut: options.jsonOut,
    markdownOut: options.markdownOut,
  });
  writeStdoutLine(JSON.stringify({
    status: result.status,
    summary: result.summary,
  }, null, 2));
  if (result.status !== 'pass') {
    throw new Error('9231 visual review wave1 gate failed.');
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
