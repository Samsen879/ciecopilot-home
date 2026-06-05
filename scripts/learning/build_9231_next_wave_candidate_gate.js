#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const DEFAULTS = Object.freeze({
  generatedOn: '2026-06-05',
  combinedShardManifest: 'data/manifests/9231_question_shard_split_2026_06_04_manifest_v1.json',
  coverageArtifacts: Object.freeze([
    'docs/reports/2026-06-05-9231-visual-review-wave1-gate.json',
    'docs/reports/2026-06-05-9231-evidence-layers-wave1-gate.json',
    'docs/reports/2026-06-05-9231-question-plain-text-v2.json',
    'docs/reports/2026-06-05-9231-question-plain-text-v2-consumption.json',
  ]),
  maxRecommendedShards: 16,
  manifestOut: 'data/manifests/9231_next_wave_candidates_2026_06_05_manifest_v1.json',
  jsonOut: 'docs/reports/2026-06-05-9231-next-wave-candidate-gate.json',
  markdownOut: 'docs/reports/2026-06-05-9231-next-wave-candidate-gate.md',
});

function writeStdoutLine(message) {
  fs.writeSync(1, `${message}\n`);
}

function writeStderrLine(message) {
  fs.writeSync(2, `${message}\n`);
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
  return Boolean(repoPath) && fs.existsSync(resolveFromRoot(rootDir, repoPath));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => String(left).localeCompare(String(right)));
}

function countWhere(items, predicate) {
  return items.reduce((count, item) => count + (predicate(item) ? 1 : 0), 0);
}

function sortedObjectFromMap(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function pdfHeaderOk(rootDir, repoPath) {
  if (!repoPathExists(rootDir, repoPath)) {
    return false;
  }
  const buffer = Buffer.alloc(4);
  const fd = fs.openSync(resolveFromRoot(rootDir, repoPath), 'r');
  try {
    fs.readSync(fd, buffer, 0, 4, 0);
    return buffer.toString('utf8') === '%PDF';
  } finally {
    fs.closeSync(fd);
  }
}

function isWmOrFrozenRow(row) {
  return path.basename(String(row.source_pdf || '')).startsWith('WM_')
    || row.source_freeze_status === 'frozen_pending_source_remediation'
    || row.source_cleanliness_status === 'watermarked_source_frozen';
}

function hasNormalizedPlainText(row) {
  return typeof row.normalized_plain_text === 'string' && row.normalized_plain_text.trim().length > 0;
}

function isAlreadyCovered(row, coveredStorageKeys) {
  return coveredStorageKeys.has(row.storage_key)
    || row.surface_evidence_status === 'external_vlm_visual_review_accepted'
    || row.visual_review_status === 'accepted'
    || row.visual_review_wave1_accepted === true
    || row.text_evidence_status === 'question_plain_text_v2_ready'
    || hasNormalizedPlainText(row)
    || row.search_read_model_rag_local_consumption_gate_passed === true;
}

function pathsExist(rootDir, values) {
  return Array.isArray(values)
    && values.length > 0
    && values.every((repoPath) => repoPathExists(rootDir, repoPath));
}

function cropReady(rootDir, row) {
  return row.crop_status === 'complete'
    && pathsExist(rootDir, row.crop_paths)
    && pathsExist(rootDir, row.review_crop_paths)
    && pathsExist(rootDir, row.rendered_pdf_page_paths);
}

function sourcePdfPageCount(row) {
  const direct = Number(row.source_pdf_page_count);
  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }
  const nested = Number(row.source?.source_pdf_page_count);
  if (Number.isFinite(nested) && nested > 0) {
    return nested;
  }
  return null;
}

function readCoverageArtifact(rootDir, repoPath) {
  if (!repoPathExists(rootDir, repoPath)) {
    return {
      path: repoPath,
      exists: false,
      row_count: 0,
      storage_key_count: 0,
      storage_keys: [],
    };
  }
  const payload = readJson(rootDir, repoPath);
  const rows = [
    ...(Array.isArray(payload.rows) ? payload.rows : []),
    ...(Array.isArray(payload.items) ? payload.items : []),
  ];
  const storageKeys = unique(rows.map((row) => row.storage_key));
  return {
    path: repoPath,
    exists: true,
    row_count: rows.length,
    storage_key_count: storageKeys.length,
    storage_keys: storageKeys,
  };
}

function buildCoverage(rootDir, coverageArtifacts) {
  const artifacts = coverageArtifacts.map((repoPath) => readCoverageArtifact(rootDir, repoPath));
  const coveredStorageKeys = new Set(artifacts.flatMap((artifact) => artifact.storage_keys));
  return {
    artifacts: artifacts.map(({ storage_keys: _storageKeys, ...artifact }) => artifact),
    coveredStorageKeys,
    missingArtifacts: artifacts.filter((artifact) => !artifact.exists).map((artifact) => artifact.path),
  };
}

function addCount(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function buildStorageKeyCounts(rows) {
  const counts = new Map();
  for (const row of rows) {
    if (row.storage_key) {
      addCount(counts, row.storage_key);
    }
  }
  return counts;
}

function rowValidation({
  rootDir,
  row,
  coveredStorageKeys,
  duplicateStorageKeys,
  inspectPdfTextLayer,
  pdfInspectionBySourcePdf,
}) {
  const sourcePdf = toPosix(row.source_pdf);
  const sourcePdfExists = repoPathExists(rootDir, sourcePdf);
  const sourcePdfHeaderOk = pdfHeaderOk(rootDir, sourcePdf);
  const sourcePdfManifestPageCount = sourcePdfPageCount(row);
  const pdfInspection = pdfInspectionBySourcePdf?.[sourcePdf] || null;
  const sourcePdfParseOk = inspectPdfTextLayer
    ? pdfInspection?.status === 'parse_ok'
    : null;
  const duplicateStorageKey = Boolean(row.storage_key && duplicateStorageKeys.has(row.storage_key));
  const validation = {
    storage_key_present: Boolean(row.storage_key),
    duplicate_storage_key: duplicateStorageKey,
    source_pdf: sourcePdf || null,
    source_pdf_exists: sourcePdfExists,
    source_pdf_header_ok: sourcePdfHeaderOk,
    source_pdf_manifest_page_count: sourcePdfManifestPageCount,
    source_pdf_manifest_page_count_ok: Boolean(sourcePdfManifestPageCount),
    source_pdf_parse_inspected: Boolean(inspectPdfTextLayer),
    source_pdf_parse_record_present: Boolean(pdfInspection),
    source_pdf_parse_ok: sourcePdfParseOk,
    source_pdf_parse_record: pdfInspection,
    locator_resolved: row.locator_status === 'resolved',
    crop_ready: cropReady(rootDir, row),
    wm_or_frozen_source: isWmOrFrozenRow(row),
    already_covered_by_visual_text_or_consumption: isAlreadyCovered(row, coveredStorageKeys),
  };
  const exclusionReasons = [];
  if (!validation.storage_key_present) exclusionReasons.push('missing_storage_key');
  if (validation.duplicate_storage_key) exclusionReasons.push('duplicate_storage_key');
  if (validation.wm_or_frozen_source) exclusionReasons.push('wm_or_frozen_source');
  if (validation.already_covered_by_visual_text_or_consumption) {
    exclusionReasons.push('already_covered_by_visual_text_or_consumption');
  }
  if (!validation.source_pdf_exists) exclusionReasons.push('source_pdf_missing');
  if (!validation.source_pdf_header_ok) exclusionReasons.push('source_pdf_header_not_pdf');
  if (!validation.source_pdf_manifest_page_count_ok) exclusionReasons.push('source_pdf_manifest_page_count_missing');
  if (!validation.locator_resolved) exclusionReasons.push('locator_not_resolved');
  if (!validation.crop_ready) exclusionReasons.push('crop_or_render_not_complete');
  if (inspectPdfTextLayer && exclusionReasons.length === 0 && !validation.source_pdf_parse_ok) {
    exclusionReasons.push('source_pdf_parse_failed');
  }

  return {
    ...validation,
    candidate_ready: exclusionReasons.length === 0,
    exclusion_reasons: exclusionReasons,
  };
}

function rowCandidateRecord({ row, surfacePath, surfaceIndex, validation }) {
  return {
    storage_key: row.storage_key,
    shard_id: row.shard_id,
    source_manifest: surfacePath,
    source_manifest_index: surfaceIndex,
    source_pdf: toPosix(row.source_pdf),
    source_pdf_page_count: sourcePdfPageCount(row),
    q_number: row.q_number,
    page_numbers: row.page_numbers || [],
    crop_status: row.crop_status || null,
    rendered_pdf_page_paths: row.rendered_pdf_page_paths || [],
    crop_paths: row.crop_paths || [],
    review_crop_paths: row.review_crop_paths || [],
    candidate_status: 'next_wave_candidate_ready',
    validation: {
      source_pdf_header_ok: validation.source_pdf_header_ok,
      source_pdf_parse_inspected: validation.source_pdf_parse_inspected,
      source_pdf_parse_ok: validation.source_pdf_parse_ok,
      locator_resolved: validation.locator_resolved,
      crop_ready: validation.crop_ready,
      duplicate_storage_key: false,
      already_covered_by_visual_text_or_consumption: false,
      wm_or_frozen_source: false,
    },
    production_ready_claimed: false,
    db_consumption_claimed: false,
    search_consumption_claimed: false,
    rag_consumption_claimed: false,
  };
}

function buildShardSummary({ shard, surfacePath, rows, rowAnalyses }) {
  const candidateRows = rowAnalyses.filter((analysis) => analysis.validation.candidate_ready);
  const exclusionCounts = new Map();
  for (const analysis of rowAnalyses) {
    for (const reason of analysis.validation.exclusion_reasons) {
      addCount(exclusionCounts, reason);
    }
  }
  const rowCount = rows.length;
  return {
    shard_id: shard.shard_id,
    surface_manifest: surfacePath,
    paper: shard.paper || null,
    session_year: shard.session_year || null,
    row_count: rowCount,
    candidate_rows: candidateRows.length,
    candidate_completion_ratio: rowCount > 0 ? Number((candidateRows.length / rowCount).toFixed(6)) : 0,
    crop_ready_rows: countWhere(rowAnalyses, (analysis) => analysis.validation.crop_ready),
    already_covered_rows: countWhere(rowAnalyses, (analysis) => (
      analysis.validation.already_covered_by_visual_text_or_consumption
    )),
    wm_or_frozen_rows: countWhere(rowAnalyses, (analysis) => analysis.validation.wm_or_frozen_source),
    duplicate_storage_key_rows: countWhere(rowAnalyses, (analysis) => analysis.validation.duplicate_storage_key),
    source_pdf_missing_rows: countWhere(rowAnalyses, (analysis) => !analysis.validation.source_pdf_exists),
    source_pdf_header_failed_rows: countWhere(rowAnalyses, (analysis) => !analysis.validation.source_pdf_header_ok),
    source_pdf_parse_failed_rows: countWhere(rowAnalyses, (analysis) => (
      analysis.validation.source_pdf_parse_record_present && !analysis.validation.source_pdf_parse_ok
    )),
    crop_or_render_incomplete_rows: countWhere(rowAnalyses, (analysis) => !analysis.validation.crop_ready),
    exclusion_counts: sortedObjectFromMap(exclusionCounts),
    source_pdfs: unique(rows.map((row) => toPosix(row.source_pdf))),
    candidate_source_pdfs: unique(candidateRows.map((analysis) => toPosix(analysis.row.source_pdf))),
    gate_status: candidateRows.length > 0 ? 'candidate_ready' : 'no_candidate_rows',
  };
}

function buildDuplicateBlockers(storageKeyCounts) {
  return [...storageKeyCounts.entries()]
    .filter(([, count]) => count > 1)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([storageKey, count]) => ({
      check: 'duplicate_storage_key',
      severity: 'blocker',
      storage_key: storageKey,
      count,
    }));
}

function buildMissingCoverageBlockers(missingArtifacts) {
  return missingArtifacts.map((artifact) => ({
    check: 'missing_coverage_artifact',
    severity: 'blocker',
    artifact,
  }));
}

function buildCandidateManifest({ generatedOn, result, manifestOut }) {
  return {
    schema_version: '9231_next_wave_candidate_manifest_v1',
    manifest_id: `9231_next_wave_candidates_${generatedOn.replaceAll('-', '_')}_manifest_v1`,
    generated_on: generatedOn,
    subject_code: '9231',
    candidate_status: result.gate_status,
    boundary: result.boundary,
    summary: {
      candidate_rows: result.summary.candidate_rows,
      candidate_shards: result.summary.candidate_shards,
      recommended_shards: result.summary.recommended_shards,
      source_pdfs: result.summary.candidate_source_pdfs,
    },
    recommended_shard_ids: result.recommended_shards.map((shard) => shard.shard_id),
    source_manifests: unique(result.candidate_rows.map((item) => item.source_manifest)),
    items: result.candidate_rows,
    artifacts: {
      manifest: manifestOut,
    },
  };
}

export function build9231NextWaveCandidateGate({
  rootDir = ROOT,
  generatedOn = DEFAULTS.generatedOn,
  combinedShardManifest = DEFAULTS.combinedShardManifest,
  coverageArtifacts = DEFAULTS.coverageArtifacts,
  maxRecommendedShards = DEFAULTS.maxRecommendedShards,
  inspectPdfTextLayer = false,
  pdfInspectionBySourcePdf = null,
} = {}) {
  const combined = readJson(rootDir, combinedShardManifest);
  const shards = Array.isArray(combined.shards) ? combined.shards : [];
  const coverage = buildCoverage(rootDir, coverageArtifacts);
  const surfaces = [];
  const allRows = [];
  for (const shard of shards) {
    const surfacePath = shard.page_chain_surface_manifest_path;
    const surface = readJson(rootDir, surfacePath);
    const items = Array.isArray(surface.items) ? surface.items : [];
    surfaces.push({ shard, surfacePath, surface, items });
    for (const [index, row] of items.entries()) {
      allRows.push({
        shard,
        surfacePath,
        surfaceIndex: index,
        row,
      });
    }
  }

  const storageKeyCounts = buildStorageKeyCounts(allRows.map((record) => record.row));
  const duplicateStorageKeys = new Set([...storageKeyCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([storageKey]) => storageKey));

  const rowAnalysesBySurface = new Map();
  const candidateRows = [];
  const sourcePdfs = new Set();
  const candidateSourcePdfs = new Set();
  for (const surface of surfaces) {
    const analyses = [];
    for (const [index, row] of surface.items.entries()) {
      const validation = rowValidation({
        rootDir,
        row,
        coveredStorageKeys: coverage.coveredStorageKeys,
        duplicateStorageKeys,
        inspectPdfTextLayer,
        pdfInspectionBySourcePdf,
      });
      sourcePdfs.add(toPosix(row.source_pdf));
      const analysis = {
        row,
        surface_path: surface.surfacePath,
        surface_index: index,
        validation,
      };
      analyses.push(analysis);
      if (validation.candidate_ready) {
        candidateSourcePdfs.add(toPosix(row.source_pdf));
        candidateRows.push(rowCandidateRecord({
          row,
          surfacePath: surface.surfacePath,
          surfaceIndex: index,
          validation,
        }));
      }
    }
    rowAnalysesBySurface.set(surface.surfacePath, analyses);
  }

  const shardSummaries = surfaces.map((surface) => buildShardSummary({
    shard: surface.shard,
    surfacePath: surface.surfacePath,
    rows: surface.items,
    rowAnalyses: rowAnalysesBySurface.get(surface.surfacePath),
  }));

  const candidateShards = shardSummaries.filter((shard) => shard.candidate_rows > 0);
  const recommendedShards = [...candidateShards]
    .sort((left, right) => (
      right.candidate_completion_ratio - left.candidate_completion_ratio
        || right.candidate_rows - left.candidate_rows
        || String(left.shard_id).localeCompare(String(right.shard_id))
    ))
    .slice(0, maxRecommendedShards);

  const duplicateBlockers = buildDuplicateBlockers(storageKeyCounts);
  const blockers = [
    ...buildMissingCoverageBlockers(coverage.missingArtifacts),
    ...duplicateBlockers,
  ];
  const gateStatus = coverage.missingArtifacts.length
    ? 'candidate_inventory_blocked_missing_coverage_artifacts'
    : 'candidate_inventory_ready';

  const parseInspectedCandidateSourcePdfs = unique([...candidateSourcePdfs])
    .filter((sourcePdf) => pdfInspectionBySourcePdf?.[sourcePdf]);
  const parseOkCandidateSourcePdfs = parseInspectedCandidateSourcePdfs
    .filter((sourcePdf) => pdfInspectionBySourcePdf?.[sourcePdf]?.status === 'parse_ok');
  const summary = {
    surface_manifests_scanned: surfaces.length,
    scanned_rows: allRows.length,
    source_pdfs: unique([...sourcePdfs]).length,
    source_pdf_header_ok_rows: countWhere(
      [...rowAnalysesBySurface.values()].flat(),
      (analysis) => analysis.validation.source_pdf_header_ok,
    ),
    source_pdf_parse_inspected: Boolean(inspectPdfTextLayer),
    candidate_source_pdfs_pdfjs_parse_inspected: parseInspectedCandidateSourcePdfs.length,
    candidate_source_pdfs_pdfjs_parse_ok: parseOkCandidateSourcePdfs.length,
    candidate_rows_with_source_pdf_parse_ok: countWhere(
      [...rowAnalysesBySurface.values()].flat(),
      (analysis) => analysis.validation.candidate_ready && analysis.validation.source_pdf_parse_ok === true,
    ),
    crop_ready_rows: countWhere(
      [...rowAnalysesBySurface.values()].flat(),
      (analysis) => analysis.validation.crop_ready,
    ),
    crop_or_render_incomplete_rows: countWhere(
      [...rowAnalysesBySurface.values()].flat(),
      (analysis) => !analysis.validation.crop_ready,
    ),
    already_covered_rows: countWhere(
      [...rowAnalysesBySurface.values()].flat(),
      (analysis) => analysis.validation.already_covered_by_visual_text_or_consumption,
    ),
    wm_or_frozen_rows: countWhere(
      [...rowAnalysesBySurface.values()].flat(),
      (analysis) => analysis.validation.wm_or_frozen_source,
    ),
    missing_storage_key_rows: countWhere(
      [...rowAnalysesBySurface.values()].flat(),
      (analysis) => !analysis.validation.storage_key_present,
    ),
    duplicate_storage_key_rows: countWhere(
      [...rowAnalysesBySurface.values()].flat(),
      (analysis) => analysis.validation.duplicate_storage_key,
    ),
    candidate_rows: candidateRows.length,
    candidate_shards: candidateShards.length,
    recommended_shards: recommendedShards.length,
    candidate_source_pdfs: unique([...candidateSourcePdfs]).length,
    max_recommended_shards: maxRecommendedShards,
    blocker_count: blockers.length,
    production_ready_claimed: false,
    db_search_rag_consumption_claimed: false,
  };

  const result = {
    schema_version: '9231_next_wave_candidate_gate_v1',
    generated_on: generatedOn,
    subject_code: '9231',
    gate_status: gateStatus,
    verdict: candidateRows.length
      ? 'next_wave_candidates_available'
      : 'no_next_wave_candidates_available',
    boundary: {
      local_deterministic_candidate_inventory: true,
      criteria: [
        'clean-source rows only; WM_ and frozen rows excluded',
        'crop/render complete with local files present',
        'not already covered by visual/text/consumption artifacts',
        'shards ranked by candidate completion ratio then candidate row count',
        'source PDF existence/header/page-count validation plus optional local pdfjs parse',
      ],
      external_vlm_or_api_calls: 0,
      external_ocr_reruns: 0,
      not_question_plain_text_v1_or_v2: true,
      not_db_search_rag_consumption_gate: true,
      not_production_ready: true,
      production_ready_claimed: false,
      db_consumption_claimed: false,
      search_consumption_claimed: false,
      rag_consumption_claimed: false,
    },
    inputs: {
      combined_shard_manifest: combinedShardManifest,
      coverage_artifacts: coverage.artifacts,
      inspect_pdf_text_layer: Boolean(inspectPdfTextLayer),
    },
    summary,
    recommended_shards: recommendedShards,
    candidate_shards: candidateShards,
    candidate_rows: candidateRows,
    all_shards: shardSummaries,
    blockers,
  };
  return {
    ...result,
    candidate_manifest: buildCandidateManifest({
      generatedOn,
      result,
      manifestOut: DEFAULTS.manifestOut,
    }),
  };
}

async function loadPdfjs() {
  try {
    return await import('pdfjs-dist/legacy/build/pdf.mjs');
  } catch {
    const candidates = [
      path.resolve(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs'),
      path.resolve(ROOT, '../../node_modules/pdfjs-dist/legacy/build/pdf.mjs'),
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

export async function inspectSourcePdfsWithPdfjs(rootDir, sourcePdfs) {
  const pdfjs = await loadPdfjs();
  const records = {};
  for (const sourcePdf of unique(sourcePdfs)) {
    try {
      const data = new Uint8Array(fs.readFileSync(resolveFromRoot(rootDir, sourcePdf)));
      const pdf = await pdfjs.getDocument({
        data,
        disableFontFace: true,
        useSystemFonts: false,
      }).promise;
      records[sourcePdf] = {
        status: pdf.numPages > 0 ? 'parse_ok' : 'parse_empty',
        page_count: pdf.numPages,
      };
    } catch (error) {
      records[sourcePdf] = {
        status: 'parse_failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  return records;
}

export async function build9231NextWaveCandidateGateAsync(options = {}) {
  let pdfInspectionBySourcePdf = options.pdfInspectionBySourcePdf || null;
  if (options.inspectPdfTextLayer && !pdfInspectionBySourcePdf) {
    const dryRun = build9231NextWaveCandidateGate({
      ...options,
      inspectPdfTextLayer: false,
    });
    const sourcePdfs = unique(dryRun.candidate_rows.map((row) => row.source_pdf));
    pdfInspectionBySourcePdf = await inspectSourcePdfsWithPdfjs(options.rootDir || ROOT, sourcePdfs);
  }
  return build9231NextWaveCandidateGate({
    ...options,
    pdfInspectionBySourcePdf,
  });
}

function markdownList(values) {
  if (!values.length) {
    return '- none';
  }
  return values.map((value) => `- \`${value}\``).join('\n');
}

export function render9231NextWaveCandidateGateMarkdown(report) {
  const summary = report.summary;
  const lines = [
    '# 9231 Next-Wave Candidate Gate',
    '',
    `- generated_on: \`${report.generated_on}\``,
    `- gate_status: \`${report.gate_status}\``,
    `- verdict: \`${report.verdict}\``,
    '- production_ready_claimed: `false`',
    '- This is a candidate inventory only: not question_plain_text_v1/v2, not a visual review gate, and not a DB/search/RAG consumption gate.',
    '- External VLM/API calls: 0. External OCR reruns: 0.',
    '',
    '## Criteria',
    '',
    '| # | gate | posture |',
    '| ---: | --- | --- |',
    '| 1 | clean source | `WM_` and `frozen_pending_source_remediation` rows excluded |',
    '| 2 | crop/render complete | local crop, review crop, and render files must exist |',
    '| 3 | not covered | visual/text/consumption-covered rows excluded by `storage_key` |',
    '| 4 | complete shards | candidates ranked by completion ratio then candidate row count |',
    '| 5 | source/basic validation | source PDF existence/header/page-count and optional pdfjs parse; duplicate `storage_key` rows blocked |',
    '',
    '## Counts',
    '',
    '| metric | value |',
    '| --- | ---: |',
    `| surface manifests scanned | ${summary.surface_manifests_scanned} |`,
    `| scanned rows | ${summary.scanned_rows} |`,
    `| crop-ready rows | ${summary.crop_ready_rows} |`,
    `| crop/render incomplete rows | ${summary.crop_or_render_incomplete_rows} |`,
    `| already covered rows | ${summary.already_covered_rows} |`,
    `| WM/frozen rows | ${summary.wm_or_frozen_rows} |`,
    `| duplicate storage-key rows | ${summary.duplicate_storage_key_rows} |`,
    `| candidate rows | ${summary.candidate_rows} |`,
    `| candidate shards | ${summary.candidate_shards} |`,
    `| recommended shards | ${summary.recommended_shards} |`,
    `| candidate source PDFs | ${summary.candidate_source_pdfs} |`,
    `| source PDF parse inspected | ${summary.source_pdf_parse_inspected} |`,
    `| candidate source PDFs pdfjs parse OK | ${summary.candidate_source_pdfs_pdfjs_parse_ok} |`,
    `| candidate rows with source PDF parse OK | ${summary.candidate_rows_with_source_pdf_parse_ok} |`,
    `| blockers | ${summary.blocker_count} |`,
    '',
    '## Recommended Shards',
    '',
    '| shard | candidate rows | total rows | completion | source PDFs |',
    '| --- | ---: | ---: | ---: | ---: |',
  ];
  if (report.recommended_shards.length) {
    for (const shard of report.recommended_shards) {
      lines.push(`| \`${shard.shard_id}\` | ${shard.candidate_rows} | ${shard.row_count} | ${shard.candidate_completion_ratio} | ${shard.candidate_source_pdfs.length} |`);
    }
  } else {
    lines.push('| none | 0 | 0 | 0 | 0 |');
  }
  lines.push(
    '',
    '## Blockers',
    '',
    '| check | count | detail |',
    '| --- | ---: | --- |',
  );
  if (report.blockers.length) {
    for (const blocker of report.blockers) {
      lines.push(`| \`${blocker.check}\` | ${blocker.count ?? 1} | \`${blocker.storage_key || blocker.artifact || ''}\` |`);
    }
  } else {
    lines.push('| none | 0 |  |');
  }
  lines.push(
    '',
    '## Artifacts',
    '',
    `- candidate manifest: \`${report.artifacts?.manifest || DEFAULTS.manifestOut}\``,
    `- JSON report: \`${report.artifacts?.json || DEFAULTS.jsonOut}\``,
    '',
    '## Coverage Inputs',
    '',
    markdownList((report.inputs?.coverage_artifacts || []).map((artifact) => artifact.path)),
    '',
  );
  return lines.join('\n');
}

export function write9231NextWaveCandidateGateOutputs(
  result,
  {
    rootDir = ROOT,
    manifestOut = DEFAULTS.manifestOut,
    jsonOut = DEFAULTS.jsonOut,
    markdownOut = DEFAULTS.markdownOut,
  } = {},
) {
  const candidateManifest = {
    ...result.candidate_manifest,
    artifacts: {
      manifest: manifestOut,
      json: jsonOut,
      markdown: markdownOut,
    },
  };
  writeJson(rootDir, manifestOut, candidateManifest);
  const reportPayload = {
    ...result,
    candidate_manifest: {
      path: manifestOut,
      summary: candidateManifest.summary,
    },
    artifacts: {
      manifest: manifestOut,
      json: jsonOut,
      markdown: markdownOut,
    },
  };
  writeJson(rootDir, jsonOut, reportPayload);
  writeText(rootDir, markdownOut, render9231NextWaveCandidateGateMarkdown(reportPayload));
  return { manifestOut, jsonOut, markdownOut };
}

function requiredValue(argv, index, flag) {
  const value = argv[index + 1] ?? null;
  if (!value || String(value).startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    ...DEFAULTS,
    coverageArtifacts: [...DEFAULTS.coverageArtifacts],
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
    if (token === '--coverage-artifact') {
      options.coverageArtifacts.push(requiredValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token === '--max-recommended-shards') {
      options.maxRecommendedShards = Number(requiredValue(argv, index, token));
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
    if (token === '--help') {
      options.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }
  return options;
}

function printUsage() {
  writeStdoutLine([
    'Usage: node scripts/learning/build_9231_next_wave_candidate_gate.js',
    '  [--generated-on <YYYY-MM-DD>]',
    '  [--combined-shard-manifest <path>]',
    '  [--coverage-artifact <path>]  # may be repeated; defaults are retained',
    '  [--max-recommended-shards <n>]',
    '  [--inspect-pdf-text-layer]',
    '  [--manifest-out <path>]',
    '  [--json-out <path>]',
    '  [--markdown-out <path>]',
    '  [--no-write]',
  ].join('\n'));
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    printUsage();
    return;
  }
  const result = await build9231NextWaveCandidateGateAsync(options);
  if (options.writeArtifacts) {
    write9231NextWaveCandidateGateOutputs(result, {
      rootDir: options.rootDir || ROOT,
      manifestOut: options.manifestOut,
      jsonOut: options.jsonOut,
      markdownOut: options.markdownOut,
    });
  }
  writeStdoutLine(JSON.stringify({
    gate_status: result.gate_status,
    verdict: result.verdict,
    scanned_rows: result.summary.scanned_rows,
    candidate_rows: result.summary.candidate_rows,
    candidate_shards: result.summary.candidate_shards,
    recommended_shards: result.recommended_shards.map((shard) => shard.shard_id),
    blockers: result.summary.blocker_count,
    source_pdf_parse_inspected: result.summary.source_pdf_parse_inspected,
  }, null, 2));
}

if (process.argv[1] === __filename) {
  main().catch((error) => {
    writeStderrLine(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}
