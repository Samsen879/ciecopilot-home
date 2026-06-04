#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

export const DEFAULT_SELECTED_9231_PRODUCTION_READY_WAVE1_SHARDS = Object.freeze([
  '9231_p1_s16_standard_001',
  '9231_p1_s24_standard_001',
  '9231_p1_s25_standard_001',
  '9231_p1_w16_standard_001',
  '9231_p1_w25_standard_001',
  '9231_p2_s16_standard_001',
  '9231_p2_s24_standard_001',
  '9231_p2_s25_standard_001',
  '9231_p2_w16_standard_001',
  '9231_p2_w25_standard_001',
  '9231_p3_s24_standard_001',
  '9231_p3_s25_standard_001',
  '9231_p3_w25_standard_001',
  '9231_p4_s24_standard_001',
  '9231_p4_s25_standard_001',
  '9231_p4_w25_standard_001',
]);

const DEFAULTS = Object.freeze({
  generatedOn: '2026-06-05',
  combinedShardManifest: 'data/manifests/9231_question_shard_split_2026_06_04_manifest_v1.json',
  manifestOut: 'data/manifests/9231_production_ready_wave1_16_2026_06_05_manifest_v1.json',
  jsonOut: 'docs/reports/2026-06-05-9231-production-ready-wave1-16-gate.json',
  markdownOut: 'docs/reports/2026-06-05-9231-production-ready-wave1-16-gate.md',
  reportsDir: 'docs/reports',
});

function writeStdoutLine(message) {
  fs.writeSync(1, `${message}\n`);
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

function repoPathExists(rootDir, repoPath) {
  return fs.existsSync(resolveFromRoot(rootDir, repoPath));
}

function isWmRow(row) {
  return path.basename(String(row.source_pdf || '')).startsWith('WM_')
    || row.source_freeze_status === 'frozen_pending_source_remediation';
}

function unique(items) {
  return [...new Set(items.filter(Boolean))].sort((left, right) => String(left).localeCompare(String(right)));
}

function countWhere(items, predicate) {
  return items.reduce((count, item) => count + (predicate(item) ? 1 : 0), 0);
}

function kebabShardId(shardId) {
  return String(shardId).replaceAll('_', '-');
}

function addBlocker(blockers, check, count, extra = {}) {
  if (count > 0) {
    blockers.push({
      check,
      severity: 'blocker',
      count,
      ...extra,
    });
  }
}

function productionCloseoutPaths({ generatedOn, reportsDir, shardId }) {
  const prefix = `${reportsDir}/${generatedOn}-${kebabShardId(shardId)}-production-ready-closeout`;
  return {
    json: `${prefix}.json`,
    markdown: `${prefix}.md`,
  };
}

function summarizePdfTextLayer(sourcePdfs, pdfTextLayerBySourcePdf) {
  if (!pdfTextLayerBySourcePdf) {
    return {
      inspected: false,
      status: 'not_inspected',
      source_pdf_count: sourcePdfs.length,
      parseable_source_pdf_count: 0,
      blockers: [],
    };
  }
  const blockers = [];
  let parseable = 0;
  for (const sourcePdf of sourcePdfs) {
    const record = pdfTextLayerBySourcePdf[sourcePdf];
    if (record?.status === 'available') {
      parseable += 1;
      continue;
    }
    blockers.push({
      check: 'pdf_text_layer_unavailable',
      severity: 'blocker',
      source_pdf: sourcePdf,
      status: record?.status || 'missing_inspection_record',
      error: record?.error || null,
    });
  }
  return {
    inspected: true,
    status: blockers.length ? 'blocked' : 'available',
    source_pdf_count: sourcePdfs.length,
    parseable_source_pdf_count: parseable,
    blockers,
  };
}

function analyzeShard({
  rootDir,
  generatedOn,
  surfacePath,
  surface,
  pdfTextLayerBySourcePdf = null,
  reportsDir,
}) {
  const items = Array.isArray(surface.items) ? surface.items : [];
  const sourcePdfs = unique(items.map((item) => toPosix(item.source_pdf)));
  const rowCount = items.length;
  const frozenWmRows = countWhere(items, isWmRow);
  const cropCompleteRows = countWhere(items, (item) => item.crop_status === 'complete');
  const locatorResolvedRows = countWhere(items, (item) => item.locator_status === 'resolved');
  const sourcePdfMissingRows = countWhere(items, (item) => !item.source_pdf || !repoPathExists(rootDir, item.source_pdf));
  const cropFileMissingRows = countWhere(items, (item) => (
    !Array.isArray(item.crop_paths)
      || item.crop_paths.length === 0
      || item.crop_paths.some((cropPath) => !repoPathExists(rootDir, cropPath))
  ));
  const renderFileMissingRows = countWhere(items, (item) => (
    !Array.isArray(item.rendered_pdf_page_paths)
      || item.rendered_pdf_page_paths.length === 0
      || item.rendered_pdf_page_paths.some((renderPath) => !repoPathExists(rootDir, renderPath))
  ));
  const positiveConsumptionClaims = countWhere(items, (item) => (
    item.db_consumption_claimed === true
      || item.search_consumption_claimed === true
      || item.rag_consumption_claimed === true
  ));
  const externalCalls = countWhere(items, (item) => (
    item.external_vlm_or_api_used === true
      || item.external_ocr_rerun_used === true
  ));
  const visualNotAcceptedRows = countWhere(items, (item) => (
    item.visual_review_status !== 'accepted'
      || item.surface_evidence_status !== 'local_visual_review_accepted'
  ));
  const textNotReadyRows = countWhere(items, (item) => (
    typeof item.normalized_plain_text !== 'string'
      || !item.normalized_plain_text.trim()
      || item.text_evidence_status === 'not_extracted'
  ));
  const authorityMissingRows = countWhere(items, (item) => (
    !item.authority_alignment
      && !item.authority_sidecar
      && !item.primary_topic_path
      && !item.visual_disposition?.authority_topic_path
  ));
  const pdfTextLayer = summarizePdfTextLayer(sourcePdfs, pdfTextLayerBySourcePdf);

  const blockers = [];
  addBlocker(blockers, 'frozen_wm_source_rows_present', frozenWmRows);
  addBlocker(blockers, 'source_pdf_missing', sourcePdfMissingRows);
  addBlocker(blockers, 'locator_not_resolved', rowCount - locatorResolvedRows);
  addBlocker(blockers, 'crop_not_complete', rowCount - cropCompleteRows);
  addBlocker(blockers, 'crop_file_missing', cropFileMissingRows);
  addBlocker(blockers, 'render_file_missing', renderFileMissingRows);
  addBlocker(blockers, 'unexpected_positive_db_search_rag_claim', positiveConsumptionClaims);
  addBlocker(blockers, 'external_vlm_or_ocr_usage_present', externalCalls);
  blockers.push(...pdfTextLayer.blockers);

  const localSurfaceReady = blockers.length === 0;
  addBlocker(blockers, 'visual_review_not_accepted', visualNotAcceptedRows);
  addBlocker(blockers, 'question_plain_text_not_ready', textNotReadyRows);
  addBlocker(blockers, 'authority_alignment_missing', authorityMissingRows);
  addBlocker(blockers, 'db_search_rag_consumption_not_proven', rowCount);

  const gateStatus = localSurfaceReady
    ? 'production_blocked_pending_visual_text_authority_consumption'
    : 'local_surface_blocked';
  const closeoutPaths = productionCloseoutPaths({
    generatedOn,
    reportsDir,
    shardId: surface.shard_id,
  });

  return {
    schema_version: '9231_production_ready_wave1_shard_closeout_v1',
    generated_on: generatedOn,
    subject_code: '9231',
    shard_id: surface.shard_id,
    gate_status: gateStatus,
    local_surface_ready: localSurfaceReady,
    production_ready_claimed: false,
    db_search_rag_consumption_claimed: false,
    boundary: {
      local_deterministic_gate: true,
      no_external_vlm_or_api: true,
      no_external_ocr_rerun: true,
      not_question_plain_text_v1_or_v2: true,
      not_db_search_rag_consumption_gate: true,
      not_final_production_ready: true,
      frozen_wm_rows_excluded: true,
    },
    summary: {
      row_count: rowCount,
      source_pdf_count: sourcePdfs.length,
      crop_complete_rows: cropCompleteRows,
      locator_resolved_rows: locatorResolvedRows,
      frozen_wm_rows: frozenWmRows,
      source_pdf_missing_rows: sourcePdfMissingRows,
      crop_file_missing_rows: cropFileMissingRows,
      render_file_missing_rows: renderFileMissingRows,
      visual_not_accepted_rows: visualNotAcceptedRows,
      text_not_ready_rows: textNotReadyRows,
      authority_missing_rows: authorityMissingRows,
      positive_consumption_claims: positiveConsumptionClaims,
      external_call_rows: externalCalls,
    },
    pdf_text_layer: pdfTextLayer,
    blockers,
    artifacts: {
      surface_manifest: surfacePath,
      json: closeoutPaths.json,
      markdown: closeoutPaths.markdown,
    },
    source_pdfs: sourcePdfs,
  };
}

function updateSurfaceForCloseout(surface, shardCloseout) {
  const items = (surface.items || []).map((item) => ({
    ...item,
    production_ready_wave1_status: shardCloseout.gate_status,
    production_ready_wave1_local_surface_ready: shardCloseout.local_surface_ready,
    production_ready_wave1_generated_on: shardCloseout.generated_on,
    production_ready_claimed: false,
    db_consumption_claimed: false,
    search_consumption_claimed: false,
    rag_consumption_claimed: false,
  }));
  return {
    ...surface,
    items,
    production_ready_wave1_gate: {
      schema_version: '9231_production_ready_wave1_surface_gate_v1',
      generated_on: shardCloseout.generated_on,
      gate_status: shardCloseout.gate_status,
      local_surface_ready: shardCloseout.local_surface_ready,
      row_count: shardCloseout.summary.row_count,
      blocker_count: shardCloseout.blockers.length,
      production_ready_claimed: false,
      db_search_rag_consumption_claimed: false,
      closeout_report_json: shardCloseout.artifacts.json,
      closeout_report_markdown: shardCloseout.artifacts.markdown,
    },
  };
}

export function build9231ProductionReadyWave1Gate({
  rootDir = ROOT,
  generatedOn = DEFAULTS.generatedOn,
  combinedShardManifest = DEFAULTS.combinedShardManifest,
  selectedShardIds = DEFAULT_SELECTED_9231_PRODUCTION_READY_WAVE1_SHARDS,
  reportsDir = DEFAULTS.reportsDir,
  inspectPdfTextLayer = false,
  pdfTextLayerBySourcePdf = null,
} = {}) {
  const combined = readJson(rootDir, combinedShardManifest);
  const shardRecords = new Map((combined.shards || []).map((shard) => [shard.shard_id, shard]));
  const selected = selectedShardIds.map((shardId) => {
    const shard = shardRecords.get(shardId);
    if (!shard) {
      throw new Error(`Selected shard is missing from combined manifest: ${shardId}`);
    }
    return shard;
  });

  const closeouts = [];
  const updatedSurfaces = [];
  for (const shard of selected) {
    const surface = readJson(rootDir, shard.page_chain_surface_manifest_path);
    const shardCloseout = analyzeShard({
      rootDir,
      generatedOn,
      surfacePath: shard.page_chain_surface_manifest_path,
      surface,
      pdfTextLayerBySourcePdf: inspectPdfTextLayer ? pdfTextLayerBySourcePdf : null,
      reportsDir,
    });
    closeouts.push(shardCloseout);
    updatedSurfaces.push({
      path: shard.page_chain_surface_manifest_path,
      payload: updateSurfaceForCloseout(surface, shardCloseout),
    });
  }

  const selectedRows = closeouts.reduce((sum, shard) => sum + shard.summary.row_count, 0);
  const selectedSourcePdfs = unique(closeouts.flatMap((shard) => shard.source_pdfs));
  const localSurfaceReadyShards = countWhere(closeouts, (shard) => shard.local_surface_ready);
  const productionReadyShards = 0;
  const blockers = closeouts.flatMap((shard) => (
    shard.blockers.map((blocker) => ({
      shard_id: shard.shard_id,
      ...blocker,
    }))
  ));

  const manifestItems = closeouts.flatMap((shard) => {
    const surface = readJson(rootDir, shard.artifacts.surface_manifest);
    return (surface.items || []).map((item, index) => ({
      shard_id: shard.shard_id,
      source_manifest: shard.artifacts.surface_manifest,
      source_manifest_index: index,
      storage_key: item.storage_key,
      source_pdf: item.source_pdf,
      q_number: item.q_number,
      crop_status: item.crop_status,
      production_ready_wave1_status: shard.gate_status,
      local_surface_ready: shard.local_surface_ready,
      production_ready_claimed: false,
    }));
  });

  const manifest = {
    schema_version: '9231_production_ready_wave1_manifest_v1',
    manifest_id: `9231_production_ready_wave1_16_${generatedOn.replaceAll('-', '_')}_manifest_v1`,
    generated_on: generatedOn,
    subject_code: '9231',
    selected_shard_ids: [...selectedShardIds],
    gate_status: productionReadyShards === closeouts.length ? 'production_ready' : 'production_blocked',
    boundary: {
      local_deterministic_gate: true,
      no_external_vlm_or_api: true,
      no_external_ocr_rerun: true,
      not_question_plain_text_v1_or_v2: true,
      not_db_search_rag_consumption_gate: true,
      not_final_production_ready: true,
    },
    summary: {
      selected_shards: closeouts.length,
      selected_rows: selectedRows,
      selected_source_pdfs: selectedSourcePdfs.length,
      local_surface_ready_shards: localSurfaceReadyShards,
      production_ready_shards: productionReadyShards,
      production_blocked_shards: closeouts.length - productionReadyShards,
    },
    items: manifestItems,
  };

  return {
    schema_version: '9231_production_ready_wave1_gate_v1',
    generated_on: generatedOn,
    subject_code: '9231',
    gate_status: 'production_blocked',
    verdict: 'not_production_ready',
    boundary: manifest.boundary,
    summary: {
      selected_shards: closeouts.length,
      selected_rows: selectedRows,
      selected_source_pdfs: selectedSourcePdfs.length,
      local_surface_ready_shards: localSurfaceReadyShards,
      production_ready_shards: productionReadyShards,
      production_blocked_shards: closeouts.length - productionReadyShards,
      frozen_wm_rows: closeouts.reduce((sum, shard) => sum + shard.summary.frozen_wm_rows, 0),
      crop_complete_rows: closeouts.reduce((sum, shard) => sum + shard.summary.crop_complete_rows, 0),
      visual_not_accepted_rows: closeouts.reduce((sum, shard) => sum + shard.summary.visual_not_accepted_rows, 0),
      text_not_ready_rows: closeouts.reduce((sum, shard) => sum + shard.summary.text_not_ready_rows, 0),
      authority_missing_rows: closeouts.reduce((sum, shard) => sum + shard.summary.authority_missing_rows, 0),
      positive_consumption_claims: closeouts.reduce((sum, shard) => sum + shard.summary.positive_consumption_claims, 0),
    },
    selected_shard_ids: [...selectedShardIds],
    shards: closeouts,
    blockers,
    manifest,
    updated_surfaces: updatedSurfaces,
  };
}

async function loadPdfjs() {
  try {
    return await import('pdfjs-dist/legacy/build/pdf.mjs');
  } catch {
    const candidates = [
      path.resolve(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs'),
      '/home/samsen/code/ciecopilot-home/node_modules/pdfjs-dist/legacy/build/pdf.mjs',
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return import(pathToFileURL(candidate).href);
      }
    }
    throw new Error('pdfjs-dist/legacy/build/pdf.mjs was not found in local node_modules.');
  }
}

async function inspectSourcePdfTextLayers(rootDir, sourcePdfs) {
  const pdfjs = await loadPdfjs();
  const results = {};
  for (const sourcePdf of sourcePdfs) {
    try {
      const data = new Uint8Array(fs.readFileSync(resolveFromRoot(rootDir, sourcePdf)));
      const pdf = await pdfjs.getDocument({
        data,
        disableFontFace: true,
        useSystemFonts: false,
      }).promise;
      let textItemCount = 0;
      let textPageCount = 0;
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageItems = (textContent.items || []).filter((item) => String(item?.str || '').trim());
        textItemCount += pageItems.length;
        if (pageItems.length) {
          textPageCount += 1;
        }
      }
      results[sourcePdf] = {
        status: textItemCount > 0 ? 'available' : 'empty',
        page_count: pdf.numPages,
        text_page_count: textPageCount,
        text_item_count: textItemCount,
      };
    } catch (error) {
      results[sourcePdf] = {
        status: 'parse_failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  return results;
}

export async function build9231ProductionReadyWave1GateAsync(options = {}) {
  let pdfTextLayerBySourcePdf = options.pdfTextLayerBySourcePdf || null;
  if (options.inspectPdfTextLayer && !pdfTextLayerBySourcePdf) {
    const dryRun = build9231ProductionReadyWave1Gate({
      ...options,
      inspectPdfTextLayer: false,
    });
    const sourcePdfs = unique(dryRun.shards.flatMap((shard) => shard.source_pdfs));
    pdfTextLayerBySourcePdf = await inspectSourcePdfTextLayers(options.rootDir || ROOT, sourcePdfs);
  }
  return build9231ProductionReadyWave1Gate({
    ...options,
    pdfTextLayerBySourcePdf,
  });
}

export function render9231ProductionReadyShardMarkdown(shard) {
  const lines = [
    `# 9231 ${shard.shard_id} Production-Ready Closeout`,
    '',
    `- generated_on: \`${shard.generated_on}\``,
    `- gate_status: \`${shard.gate_status}\``,
    `- local_surface_ready: \`${shard.local_surface_ready}\``,
    `- production_ready_claimed: \`${shard.production_ready_claimed}\``,
    `- DB/search/RAG consumption claimed: \`${shard.db_search_rag_consumption_claimed}\``,
    '- This is a deterministic closeout report. It is not a v1/v2 question text layer and not a DB/search/RAG consumption proof.',
    '',
    '## Counts',
    '',
    '| metric | value |',
    '| --- | ---: |',
    `| rows | ${shard.summary.row_count} |`,
    `| source PDFs | ${shard.summary.source_pdf_count} |`,
    `| crop complete rows | ${shard.summary.crop_complete_rows} |`,
    `| frozen WM rows | ${shard.summary.frozen_wm_rows} |`,
    `| visual not accepted rows | ${shard.summary.visual_not_accepted_rows ?? 'n/a'} |`,
    `| text not ready rows | ${shard.summary.text_not_ready_rows ?? 'n/a'} |`,
    `| authority missing rows | ${shard.summary.authority_missing_rows ?? 'n/a'} |`,
    '',
    '## Blockers',
    '',
    '| check | count |',
    '| --- | ---: |',
  ];
  for (const blocker of shard.blockers || []) {
    lines.push(`| \`${blocker.check}\` | ${blocker.count ?? 1} |`);
  }
  if (!shard.blockers?.length) {
    lines.push('| none | 0 |');
  }
  lines.push(
    '',
    '## Artifacts',
    '',
    `- surface manifest: \`${shard.artifacts.surface_manifest}\``,
    `- closeout JSON: \`${shard.artifacts.json || ''}\``,
    '',
  );
  return lines.join('\n');
}

export function render9231ProductionReadyWave1Markdown(report) {
  const lines = [
    '# 9231 Production-Ready Wave1 16-Shard Gate',
    '',
    `- generated_on: \`${report.generated_on}\``,
    `- gate_status: \`${report.gate_status}\``,
    `- verdict: \`${report.verdict}\``,
    '- This wave uses production-ready closeout rhythm, but it does not claim final 9231 production readiness.',
    '- Frozen WM rows are excluded from selected shards.',
    '- DB/search/RAG consumption claimed: `false`.',
    '',
    '## Counts',
    '',
    '| metric | value |',
    '| --- | ---: |',
    `| selected shards | ${report.summary.selected_shards} |`,
    `| selected rows | ${report.summary.selected_rows} |`,
    `| selected source PDFs | ${report.summary.selected_source_pdfs} |`,
    `| local surface ready shards | ${report.summary.local_surface_ready_shards} |`,
    `| production ready shards | ${report.summary.production_ready_shards} |`,
    `| production blocked shards | ${report.summary.production_blocked_shards} |`,
    `| frozen WM rows | ${report.summary.frozen_wm_rows} |`,
    `| crop complete rows | ${report.summary.crop_complete_rows} |`,
    `| visual not accepted rows | ${report.summary.visual_not_accepted_rows} |`,
    `| text not ready rows | ${report.summary.text_not_ready_rows} |`,
    `| authority missing rows | ${report.summary.authority_missing_rows} |`,
    '',
    '## Shards',
    '',
    '| shard | rows | local surface | gate status | report |',
    '| --- | ---: | --- | --- | --- |',
  ];
  for (const shard of report.shards) {
    lines.push(`| \`${shard.shard_id}\` | ${shard.summary.row_count} | \`${shard.local_surface_ready}\` | \`${shard.gate_status}\` | \`${shard.artifacts.markdown}\` |`);
  }
  lines.push('');
  return lines.join('\n');
}

export function write9231ProductionReadyWave1Outputs(
  result,
  {
    rootDir = ROOT,
    manifestOut = DEFAULTS.manifestOut,
    jsonOut = DEFAULTS.jsonOut,
    markdownOut = DEFAULTS.markdownOut,
  } = {},
) {
  writeJson(rootDir, manifestOut, result.manifest);
  const { updated_surfaces: _updatedSurfaces, manifest: _manifest, ...reportPayload } = result;
  writeJson(rootDir, jsonOut, {
    ...reportPayload,
    artifacts: {
      manifest: manifestOut,
      markdown: markdownOut,
    },
  });
  writeText(rootDir, markdownOut, render9231ProductionReadyWave1Markdown(result));
  for (const shard of result.shards) {
    writeJson(rootDir, shard.artifacts.json, shard);
    writeText(rootDir, shard.artifacts.markdown, render9231ProductionReadyShardMarkdown(shard));
  }
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
  const options = {
    ...DEFAULTS,
    selectedShardIds: [...DEFAULT_SELECTED_9231_PRODUCTION_READY_WAVE1_SHARDS],
    inspectPdfTextLayer: false,
    writeArtifacts: true,
  };
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
    if (token === '--selected-shards') {
      options.selectedShardIds = requiredValue(argv, index, token).split(',').map((part) => part.trim()).filter(Boolean);
      index += 1;
      continue;
    }
    if (token === '--inspect-pdf-text-layer') {
      options.inspectPdfTextLayer = true;
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

async function main() {
  const options = parseArgs();
  const result = await build9231ProductionReadyWave1GateAsync({
    rootDir: ROOT,
    generatedOn: options.generatedOn,
    combinedShardManifest: options.combinedShardManifest,
    selectedShardIds: options.selectedShardIds,
    inspectPdfTextLayer: options.inspectPdfTextLayer,
  });
  if (options.writeArtifacts) {
    write9231ProductionReadyWave1Outputs(result, {
      rootDir: ROOT,
      manifestOut: options.manifestOut,
      jsonOut: options.jsonOut,
      markdownOut: options.markdownOut,
    });
  }
  writeStdoutLine(JSON.stringify(result.summary, null, 2));
}

if (process.argv[1] === __filename) {
  main().catch((error) => {
    fs.writeSync(2, `${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
