#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const DEFAULTS = Object.freeze({
  generatedOn: '2026-06-05',
  combinedShardManifest: 'data/manifests/9231_question_shard_split_2026_06_04_manifest_v1.json',
  manifestOut: 'data/manifests/9231_wm_source_freeze_2026_06_05_manifest_v1.json',
  jsonOut: 'docs/reports/2026-06-05-9231-wm-source-freeze-gate.json',
  markdownOut: 'docs/reports/2026-06-05-9231-wm-source-freeze-gate.md',
});

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

function isWmSourcePdf(sourcePdf) {
  return path.basename(String(sourcePdf || '')).startsWith('WM_');
}

function sortedObjectFromMap(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function freezeRow(row, { generatedOn }) {
  return {
    ...row,
    source_cleanliness_status: 'watermarked_source_frozen',
    source_freeze_status: 'frozen_pending_source_remediation',
    source_freeze_reason: 'source_pdf_filename_prefixed_WM_requires_source_remediation_before_visual_text_or_production',
    source_freeze_generated_on: generatedOn,
    source_freeze_mechanical_crop_blocker: false,
    eligible_for_clean_source_wave: false,
    eligible_for_visual_review_closeout: false,
    eligible_for_question_plain_text_v1: false,
    eligible_for_question_plain_text_v2: false,
    eligible_for_normalized_plain_text_consumption_gate: false,
    text_consumption_status: 'not_ready_frozen_watermarked_source',
    production_ready_claimed: false,
    db_consumption_claimed: false,
    search_consumption_claimed: false,
    rag_consumption_claimed: false,
  };
}

function buildFreezeManifest({
  generatedOn,
  freezeItems,
  affectedSourcePdfs,
  affectedShards,
  frozenCropStatusCounts,
}) {
  return {
    schema_version: '9231_wm_source_freeze_manifest_v1',
    manifest_id: `9231_wm_source_freeze_${generatedOn.replaceAll('-', '_')}_manifest_v1`,
    generated_on: generatedOn,
    subject_code: '9231',
    freeze_status: 'frozen_pending_source_remediation',
    boundary: {
      filename_based_wm_detection: true,
      visual_watermark_presence_not_exhaustively_reviewed: true,
      mechanical_crop_blocker: false,
      production_ready_claimed: false,
      question_plain_text_v1_or_v2_claimed: false,
      db_search_rag_consumption_claimed: false,
    },
    summary: {
      frozen_row_count: freezeItems.length,
      frozen_source_pdf_count: affectedSourcePdfs.size,
      affected_shard_count: affectedShards.size,
      frozen_crop_status_counts: sortedObjectFromMap(frozenCropStatusCounts),
    },
    affected_source_pdfs: sortedObjectFromMap(affectedSourcePdfs),
    affected_shards: sortedObjectFromMap(affectedShards),
    items: freezeItems,
  };
}

export function build9231WmSourceFreezeGate({
  rootDir = ROOT,
  generatedOn = DEFAULTS.generatedOn,
  combinedShardManifest = DEFAULTS.combinedShardManifest,
} = {}) {
  const combined = readJson(rootDir, combinedShardManifest);
  const shards = Array.isArray(combined.shards) ? combined.shards : [];
  const freezeItems = [];
  const affectedSourcePdfs = new Map();
  const affectedShards = new Map();
  const frozenCropStatusCounts = new Map();
  const updatedSurfaces = [];
  let scannedRowCount = 0;

  for (const shard of shards) {
    const surfacePath = shard.page_chain_surface_manifest_path;
    const surface = readJson(rootDir, surfacePath);
    const items = Array.isArray(surface.items) ? surface.items : [];
    let frozenRowsInSurface = 0;
    const updatedItems = items.map((item, index) => {
      scannedRowCount += 1;
      if (!isWmSourcePdf(item.source_pdf)) {
        return item;
      }
      frozenRowsInSurface += 1;
      const sourcePdf = toPosix(item.source_pdf);
      const cropStatus = item.crop_status || 'unknown';
      affectedSourcePdfs.set(sourcePdf, (affectedSourcePdfs.get(sourcePdf) || 0) + 1);
      affectedShards.set(surface.shard_id, (affectedShards.get(surface.shard_id) || 0) + 1);
      frozenCropStatusCounts.set(cropStatus, (frozenCropStatusCounts.get(cropStatus) || 0) + 1);
      freezeItems.push({
        source_manifest: surfacePath,
        source_manifest_index: index,
        shard_id: surface.shard_id,
        storage_key: item.storage_key,
        source_pdf: sourcePdf,
        source_pdf_stem: item.source_pdf_stem || path.basename(sourcePdf, '.pdf'),
        q_number: item.q_number,
        crop_status: cropStatus,
        source_freeze_status: 'frozen_pending_source_remediation',
        source_freeze_reason: 'source_pdf_filename_prefixed_WM_requires_source_remediation_before_visual_text_or_production',
        mechanical_crop_blocker: false,
      });
      return freezeRow(item, { generatedOn });
    });

    if (frozenRowsInSurface > 0) {
      updatedSurfaces.push({
        path: surfacePath,
        payload: {
          ...surface,
          items: updatedItems,
          source_freeze_gate: {
            schema_version: '9231_wm_source_freeze_gate_v1',
            generated_on: generatedOn,
            freeze_status: 'frozen_pending_source_remediation',
            frozen_row_count: frozenRowsInSurface,
            mechanical_crop_blocker: false,
            production_ready_claimed: false,
            db_search_rag_consumption_claimed: false,
          },
        },
      });
    }
  }

  const freezeManifest = buildFreezeManifest({
    generatedOn,
    freezeItems,
    affectedSourcePdfs,
    affectedShards,
    frozenCropStatusCounts,
  });
  const report = {
    schema_version: '9231_wm_source_freeze_gate_v1',
    generated_on: generatedOn,
    subject_code: '9231',
    gate_status: freezeItems.length
      ? 'wm_source_frozen_pending_source_remediation'
      : 'no_wm_source_rows_detected',
    boundary: {
      filename_based_wm_detection: true,
      not_production_ready: true,
      not_canonical_question_text: true,
      not_question_plain_text_v1_or_v2: true,
      not_normalized_plain_text_consumption_gate: true,
      external_vlm_or_api_calls: 0,
      external_ocr_reruns: 0,
      mechanical_crop_blocker: false,
      visual_review_required_after_source_remediation: true,
      db_consumption_claimed: false,
      search_consumption_claimed: false,
      rag_consumption_claimed: false,
    },
    summary: {
      current_surface_manifest_count: shards.length,
      scanned_row_count: scannedRowCount,
      frozen_row_count: freezeItems.length,
      frozen_source_pdf_count: affectedSourcePdfs.size,
      affected_shard_count: affectedShards.size,
      clean_source_row_count: scannedRowCount - freezeItems.length,
      frozen_crop_status_counts: sortedObjectFromMap(frozenCropStatusCounts),
      mechanical_crop_blocker_rows: 0,
      production_ready_claimed: false,
      db_search_rag_consumption_claimed: false,
    },
    affected_shards: sortedObjectFromMap(affectedShards),
    affected_source_pdfs: sortedObjectFromMap(affectedSourcePdfs),
    artifacts: {
      freeze_manifest: DEFAULTS.manifestOut,
      combined_shard_manifest: combinedShardManifest,
    },
    freeze_manifest: freezeManifest,
    updated_surfaces: updatedSurfaces.map((record) => ({
      path: record.path,
      frozen_row_count: record.payload.source_freeze_gate.frozen_row_count,
    })),
    next_executable_gates: [
      'Replace WM_ source PDFs with clean source PDFs before visual/text/production lanes.',
      'Rerun deterministic crop/surface-ref gate for remediated frozen rows.',
      'Only then resume visual review, question_plain_text_v1/v2, and normalized_plain_text consumption gates.',
    ],
  };

  return {
    ...report,
    freeze_manifest: freezeManifest,
    updated_surfaces: updatedSurfaces,
  };
}

export function render9231WmSourceFreezeMarkdown(report) {
  const summary = report.summary;
  const lines = [
    '# 9231 WM Source Freeze Gate',
    '',
    `- generated_on: \`${report.generated_on}\``,
    `- gate_status: \`${report.gate_status}\``,
    '- This is a filename-based WM source freeze, not a visual-cleanliness proof.',
    '- This is not production-ready and does not claim canonical question text.',
    '- DB/search/RAG consumption claimed: false.',
    '- Mechanical crop blocker status is unchanged; source remediation is required before visual/text/production lanes.',
    '',
    '## Gate Counts',
    '',
    '| metric | value |',
    '| --- | ---: |',
    `| current surface manifests | ${summary.current_surface_manifest_count} |`,
    `| scanned rows | ${summary.scanned_row_count} |`,
    `| frozen rows | ${summary.frozen_row_count} |`,
    `| affected source PDFs | ${summary.frozen_source_pdf_count} |`,
    `| affected shards | ${summary.affected_shard_count} |`,
    `| clean-source rows remaining | ${summary.clean_source_row_count} |`,
    `| mechanical crop blocker rows | ${summary.mechanical_crop_blocker_rows} |`,
    '',
    '## Frozen Crop Status',
    '',
    '| crop_status | frozen rows |',
    '| --- | ---: |',
  ];
  for (const [cropStatus, rowCount] of Object.entries(summary.frozen_crop_status_counts || {})) {
    lines.push(`| \`${cropStatus}\` | ${rowCount} |`);
  }
  lines.push(
    '',
    '## Affected Shards',
    '',
    '| shard | frozen rows |',
    '| --- | ---: |',
  );
  for (const [shardId, rowCount] of Object.entries(report.affected_shards || {})) {
    lines.push(`| \`${shardId}\` | ${rowCount} |`);
  }
  lines.push('', '## Affected Source PDFs', '', '| source PDF | frozen rows |', '| --- | ---: |');
  for (const [sourcePdf, rowCount] of Object.entries(report.affected_source_pdfs || {})) {
    lines.push(`| \`${sourcePdf}\` | ${rowCount} |`);
  }
  lines.push(
    '',
    '## Artifacts',
    '',
    `- freeze manifest: \`${report.artifacts.freeze_manifest}\``,
    '',
    '## Next Executable Gates',
    '',
  );
  for (const gate of report.next_executable_gates || []) {
    lines.push(`- ${gate}`);
  }
  lines.push('');
  return lines.join('\n');
}

export function write9231WmSourceFreezeOutputs(
  result,
  {
    rootDir = ROOT,
    manifestOut = DEFAULTS.manifestOut,
    jsonOut = DEFAULTS.jsonOut,
    markdownOut = DEFAULTS.markdownOut,
  } = {},
) {
  writeJson(rootDir, manifestOut, result.freeze_manifest);
  const { updated_surfaces: _updatedSurfaces, freeze_manifest: freezeManifest, ...reportRest } = result;
  const reportPayload = {
    ...reportRest,
    freeze_manifest: {
      ...freezeManifest,
      items: undefined,
    },
  };
  writeJson(rootDir, jsonOut, reportPayload);
  writeText(rootDir, markdownOut, render9231WmSourceFreezeMarkdown({
    ...result,
    artifacts: {
      ...result.artifacts,
      freeze_manifest: manifestOut,
    },
  }));
  for (const surface of result.updated_surfaces) {
    writeJson(rootDir, surface.path, surface.payload);
  }
  return { manifestOut, jsonOut, markdownOut };
}

function requiredValue(argv, index, flag) {
  const value = argv[index + 1] ?? null;
  if (!value || String(value).startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = { ...DEFAULTS, writeArtifacts: true };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--generated-on') {
      options.generatedOn = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--combined-shard-manifest') {
      options.combinedShardManifest = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--manifest-out') {
      options.manifestOut = requiredValue(argv, index, token);
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
    if (token === '--no-write') {
      options.writeArtifacts = false;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }
  return options;
}

function main() {
  const options = parseArgs();
  const result = build9231WmSourceFreezeGate({
    rootDir: ROOT,
    generatedOn: options.generatedOn,
    combinedShardManifest: options.combinedShardManifest,
  });
  if (options.writeArtifacts) {
    write9231WmSourceFreezeOutputs(result, {
      rootDir: ROOT,
      manifestOut: options.manifestOut,
      jsonOut: options.jsonOut,
      markdownOut: options.markdownOut,
    });
  }
  process.stdout.write(`${JSON.stringify(result.summary, null, 2)}\n`);
  return 0;
}

if (process.argv[1] === __filename) {
  process.exitCode = main();
}
