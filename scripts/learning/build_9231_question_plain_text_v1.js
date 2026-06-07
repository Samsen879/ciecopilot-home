#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const DEFAULTS = Object.freeze({
  subject: '9231',
  generatedOn: '2026-06-05',
  sourceVersion: '9231_wave1_surface_v1',
  selectionManifest: 'data/manifests/9231_production_ready_wave1_16_2026_06_05_manifest_v1.json',
  surfaceManifestPaths: [],
  visualGateJson: 'docs/reports/2026-06-05-9231-visual-review-wave1-gate.json',
  jsonOut: 'docs/reports/2026-06-05-9231-question-plain-text-v1.json',
  markdownOut: 'docs/reports/2026-06-05-9231-question-plain-text-v1-coverage.md',
});

const UNICODE_MATH_REPLACEMENTS = Object.freeze([
  [/\u2212/g, '-'],
  [/\u2013/g, '-'],
  [/\u2014/g, '-'],
  [/\u00d7/g, 'x'],
  [/\u00f7/g, '/'],
  [/\u2264/g, '<='],
  [/\u2265/g, '>='],
  [/\u2260/g, '!='],
  [/\u2248/g, '~='],
  [/\u221a/g, 'sqrt'],
  [/\u221e/g, 'infinity'],
  [/\u03c0/g, 'pi'],
  [/\u03b8/g, 'theta'],
  [/\u03b1/g, 'alpha'],
  [/\u03b2/g, 'beta'],
  [/\u03bb/g, 'lambda'],
  [/\u00b0/g, ' degrees'],
  [/\u00b2/g, '^2'],
  [/\u00b3/g, '^3'],
  [/\u2074/g, '^4'],
  [/\u2075/g, '^5'],
  [/\u2076/g, '^6'],
  [/\u2077/g, '^7'],
  [/\u2078/g, '^8'],
  [/\u2079/g, '^9'],
]);

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
    'Usage: node scripts/learning/build_9231_question_plain_text_v1.js',
    '  [--generated-on <YYYY-MM-DD>]',
    '  [--source-version <id>]',
    '  [--selection-manifest <path>]',
    '  [--surface-manifest <path>] (repeatable; overrides --selection-manifest)',
    '  [--visual-gate-json <path>]',
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
    if (token === '--source-version') {
      options.sourceVersion = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--selection-manifest') {
      options.selectionManifest = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--surface-manifest') {
      options.surfaceManifestPaths = [
        ...(options.surfaceManifestPaths || []),
        requiredValue(argv, index, token),
      ];
      index += 1;
      continue;
    }
    if (token === '--visual-gate-json') {
      options.visualGateJson = requiredValue(argv, index, token);
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

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter((entry) => entry !== null && typeof entry !== 'undefined') : [];
}

function normalizeStringArray(value) {
  return [...new Set(normalizeArray(value).map((entry) => normalizeString(entry)).filter(Boolean))];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => String(left).localeCompare(String(right)));
}

function countWhere(items, predicate) {
  return items.reduce((count, item) => count + (predicate(item) ? 1 : 0), 0);
}

function normalizePlainText(value) {
  let normalized = typeof value === 'string' ? value.replace(/\r\n/g, '\n') : '';
  for (const [pattern, replacement] of UNICODE_MATH_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,.;:)\]])/g, '$1')
    .replace(/([(])\s+/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeLineText(value) {
  return normalizePlainText(value)
    .replace(/\n+/g, ' ')
    .trim();
}

function itemX(item) {
  const transform = Array.isArray(item?.transform) ? item.transform : [];
  return Number.isFinite(item?.x) ? item.x : Number(transform[4] || 0);
}

function itemY(item) {
  const transform = Array.isArray(item?.transform) ? item.transform : [];
  return Number.isFinite(item?.y) ? item.y : Number(transform[5] || 0);
}

function textItemRecord(item) {
  return {
    str: String(item?.str || ''),
    x: Math.round(itemX(item) * 100) / 100,
    y: Math.round(itemY(item) * 100) / 100,
  };
}

function ignoreTextItem(item) {
  const raw = String(item?.str || '');
  const text = normalizeLineText(raw);
  if (!text) {
    return true;
  }
  if (item.y <= 30) {
    return true;
  }
  return /^UCLES\b/i.test(text)
    || /^©? Cambridge International/i.test(text)
    || /^\[Turn over\]$/i.test(text)
    || /^BLANK PAGE$/i.test(text)
    || /^Permission to reproduce/i.test(text);
}

function joinLineFragments(items) {
  const raw = items
    .sort((left, right) => left.x - right.x)
    .map((item) => item.str)
    .join('');
  return normalizeLineText(raw);
}

export function buildTextLinesForPage(items, { yTolerance = 3 } = {}) {
  const lines = [];
  for (const item of items.map(textItemRecord).filter((entry) => !ignoreTextItem(entry))
    .sort((left, right) => right.y - left.y || left.x - right.x)) {
    const existing = lines.find((line) => Math.abs(line.y - item.y) <= yTolerance);
    if (existing) {
      existing.items.push(item);
      existing.y = Math.max(existing.y, item.y);
      continue;
    }
    lines.push({
      y: item.y,
      items: [item],
    });
  }
  return lines
    .map((line) => ({
      y: line.y,
      text: joinLineFragments(line.items),
    }))
    .filter((line) => line.text)
    .sort((left, right) => right.y - left.y);
}

function pageIndexFromItem(item) {
  if (Number.isInteger(item?.locator?.page_index)) {
    return item.locator.page_index;
  }
  if (Array.isArray(item?.page_indices) && Number.isInteger(item.page_indices[0])) {
    return item.page_indices[0];
  }
  return null;
}

function locatorYFromItem(item) {
  return Number.isFinite(item?.locator?.y) ? item.locator.y : null;
}

function pageRangeForItem(item) {
  const start = Number.isInteger(item?.page_range?.start_page_index)
    ? item.page_range.start_page_index
    : pageIndexFromItem(item);
  const end = Number.isInteger(item?.page_range?.end_page_index)
    ? item.page_range.end_page_index
    : Array.isArray(item?.page_indices) && item.page_indices.length
      ? item.page_indices[item.page_indices.length - 1]
      : start;
  return {
    start_page_index: start,
    end_page_index: end,
  };
}

function compareRowsInPdf(left, right) {
  const leftPage = pageIndexFromItem(left);
  const rightPage = pageIndexFromItem(right);
  if (leftPage !== rightPage) {
    return leftPage - rightPage;
  }
  return locatorYFromItem(right) - locatorYFromItem(left)
    || Number(left.q_number || 0) - Number(right.q_number || 0);
}

function buildNextRowByStorageKey(rows) {
  const byPdf = new Map();
  for (const row of rows) {
    const sourcePdf = toPosix(row.source_pdf);
    const pdfRows = byPdf.get(sourcePdf) || [];
    pdfRows.push(row);
    byPdf.set(sourcePdf, pdfRows);
  }

  const nextByStorageKey = new Map();
  for (const pdfRows of byPdf.values()) {
    const sorted = [...pdfRows].sort(compareRowsInPdf);
    for (let index = 0; index < sorted.length; index += 1) {
      nextByStorageKey.set(sorted[index].storage_key, sorted[index + 1] || null);
    }
  }
  return nextByStorageKey;
}

export function extractQuestionTextFromPdfText({
  row,
  nextRow = null,
  pdfText,
  topPadding = 10,
  bottomPadding = 6,
}) {
  const range = pageRangeForItem(row);
  const startPageIndex = range.start_page_index;
  const endPageIndex = range.end_page_index;
  const startY = locatorYFromItem(row);
  const nextPageIndex = nextRow ? pageIndexFromItem(nextRow) : null;
  const nextY = nextRow ? locatorYFromItem(nextRow) : null;
  const pages = pdfText?.pages || {};
  const lines = [];

  if (!Number.isInteger(startPageIndex) || !Number.isInteger(endPageIndex) || !Number.isFinite(startY)) {
    return {
      plain_text: '',
      page_line_counts: {},
      extraction_status: 'missing_locator_window',
    };
  }

  for (let pageIndex = startPageIndex; pageIndex <= endPageIndex; pageIndex += 1) {
    const pageItems = pages[String(pageIndex)] || [];
    const pageLines = buildTextLinesForPage(pageItems);
    const upperY = pageIndex === startPageIndex ? startY + topPadding : Number.POSITIVE_INFINITY;
    const lowerY = nextRow && nextPageIndex === pageIndex && Number.isFinite(nextY)
      ? nextY + bottomPadding
      : 30;
    const selected = pageLines.filter((line) => line.y <= upperY && line.y > lowerY);
    for (const line of selected) {
      lines.push(line.text);
    }
  }

  const plainText = normalizePlainText(lines.join('\n'));
  return {
    plain_text: plainText,
    page_line_counts: {
      [String(startPageIndex)]: lines.length,
    },
    extraction_status: plainText ? 'extracted' : 'empty_window',
  };
}

function collectSurfaceRows({ rootDir, selectionManifest, surfaceManifestPaths = [] }) {
  if (surfaceManifestPaths.length > 0) {
    const rows = [];
    const surfacePaths = unique(surfaceManifestPaths);
    for (const sourceManifest of surfacePaths) {
      const surface = readJson(rootDir, sourceManifest);
      const items = Array.isArray(surface.items) ? surface.items : [];
      items.forEach((surfaceItem, index) => {
        rows.push({
          ...surfaceItem,
          source_surface_manifest: sourceManifest,
          source_surface_manifest_index: index,
          source_surface_manifest_schema_version: surface.schema_version || null,
        });
      });
    }
    return {
      selection: null,
      rows,
      surface_paths: surfacePaths,
    };
  }

  const selection = readJson(rootDir, selectionManifest);
  const surfaceByPath = new Map();
  const rows = [];
  for (const selectionItem of selection.items || []) {
    const sourceManifest = selectionItem.source_manifest;
    if (!sourceManifest) {
      continue;
    }
    if (!surfaceByPath.has(sourceManifest)) {
      surfaceByPath.set(sourceManifest, readJson(rootDir, sourceManifest));
    }
    const surface = surfaceByPath.get(sourceManifest);
    const surfaceItem = surface.items?.[selectionItem.source_manifest_index] || null;
    rows.push({
      ...(surfaceItem || {}),
      ...selectionItem,
      source_surface_manifest: sourceManifest,
      source_surface_manifest_index: selectionItem.source_manifest_index,
      source_surface_manifest_schema_version: surface.schema_version || null,
    });
  }
  return {
    selection,
    rows,
    surface_paths: [...surfaceByPath.keys()].sort((left, right) => left.localeCompare(right)),
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
    const found = candidates.find((candidate) => fs.existsSync(candidate));
    if (!found) {
      throw new Error('pdfjs-dist/legacy/build/pdf.mjs was not found in local node_modules.');
    }
    return import(pathToFileURL(found).href);
  }
}

async function extractPdfText(rootDir, sourcePdf, pdfjsModule) {
  const resolved = resolveFromRoot(rootDir, sourcePdf);
  const data = new Uint8Array(fs.readFileSync(resolved));
  const pdf = await pdfjsModule.getDocument({
    data,
    disableFontFace: true,
    isEvalSupported: false,
  }).promise;
  const pages = {};
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      pages[String(pageNumber - 1)] = (textContent.items || []).map(textItemRecord);
    }
  } finally {
    await pdf.destroy();
  }
  return {
    source_pdf: toPosix(sourcePdf),
    status: 'available',
    page_count: pdf.numPages,
    pages,
  };
}

async function extractPdfTextBySource({ rootDir, sourcePdfs, pdfTextBySourcePdf = null }) {
  if (pdfTextBySourcePdf) {
    return pdfTextBySourcePdf;
  }
  const pdfjs = await loadPdfjs();
  const result = {};
  for (const sourcePdf of sourcePdfs) {
    try {
      result[sourcePdf] = await extractPdfText(rootDir, sourcePdf, pdfjs);
    } catch (error) {
      result[sourcePdf] = {
        source_pdf: sourcePdf,
        status: 'parse_failed',
        error: error instanceof Error ? error.message : String(error),
        pages: {},
      };
    }
  }
  return result;
}

function hasDiagramHeuristic(plainText) {
  return /\b(diagram|figure|sketch|graph|argand diagram|shown in the figure|shown in the diagram)\b/i.test(plainText);
}

function tableHeavyHeuristic(plainText) {
  if (/\b(table|tabulated|row|column)\b/i.test(plainText)) {
    return true;
  }
  const numericLineCount = plainText.split(/\n+/).filter((line) => (line.match(/\d/g) || []).length >= 8).length;
  return numericLineCount >= 3;
}

function formulaDenseHeuristic(plainText) {
  return /[=<>]|sqrt|\^|\b(sin|cos|tan|ln|log|exp|matrix|determinant|vector|eigenvalue|differential)\b/i.test(plainText);
}

function buildQualityFlags({ textExtraction, visualAccepted, hasDiagram, tableHeavy, imageAssets }) {
  const flags = [];
  if (!visualAccepted) {
    flags.push('visual_review_not_accepted');
  }
  if (!textExtraction.plain_text) {
    flags.push('missing_plain_text');
  }
  if ((hasDiagram || tableHeavy) && imageAssets.length === 0) {
    flags.push('missing_image_asset_for_layout_dependent_question');
  }
  if (textExtraction.extraction_status !== 'extracted') {
    flags.push(`pdf_text_extraction_${textExtraction.extraction_status}`);
  }
  return flags;
}

function buildPlainTextItem({
  row,
  nextRow,
  pdfText,
  generatedOn,
  visualGateJson,
  sourceVersion = DEFAULTS.sourceVersion,
}) {
  const textExtraction = extractQuestionTextFromPdfText({
    row,
    nextRow,
    pdfText,
  });
  const plainText = textExtraction.plain_text;
  const hasDiagram = hasDiagramHeuristic(plainText);
  const tableHeavy = tableHeavyHeuristic(plainText);
  const formulaDense = formulaDenseHeuristic(plainText);
  const imageAssets = unique([
    ...normalizeStringArray(row.review_crop_paths),
    ...normalizeStringArray(row.crop_paths),
  ]);
  const needsImageAsset = hasDiagram || tableHeavy;
  const visualAccepted = row.visual_review_status === 'accepted'
    || row.visual_review_wave1_accepted === true
    || row.surface_evidence_status === 'external_vlm_visual_review_accepted';

  return {
    schema_version: 'question_plain_text_v1',
    storage_key: row.storage_key,
    subject_code: row.subject_code || row.syllabus_code || DEFAULTS.subject,
    year: row.year ?? null,
    session: row.session ?? null,
    paper: row.paper ?? null,
    variant: row.variant ?? null,
    q_number: row.q_number ?? null,
    source_pdf: row.source_pdf ?? null,
    source_version: sourceVersion,
    source_surface_manifest: row.source_surface_manifest,
    source_surface_manifest_index: row.source_surface_manifest_index,
    source_visual_gate_json: visualGateJson,
    source_evidence_bundle: null,
    source_evidence_bundle_index: null,
    source_evidence_bundle_candidate_count: 0,
    primary_topic_path: row.primary_topic_path ?? null,
    has_diagram: hasDiagram,
    formula_dense: formulaDense,
    table_heavy: tableHeavy,
    needs_image_asset: needsImageAsset,
    plain_text: plainText,
    text_source: 'pdfjs_page_chain_text_layer',
    formula_latex_list: [],
    subquestion_blocks: [],
    diagram_elements: [],
    spatial_evidence: [],
    image_assets: imageAssets,
    rendered_pdf_page_paths: normalizeStringArray(row.rendered_pdf_page_paths),
    page_indices: normalizeArray(row.page_indices),
    page_range: row.page_range ?? null,
    provenance: {
      generated_on: generatedOn,
      text_extraction_method: 'pdfjs_page_chain_locator_window_v1',
      visual_review_status: row.visual_review_status ?? row.visual_review_wave1_status ?? null,
      visual_review_method: row.visual_review_method ?? null,
      visual_review_evidence_path: row.visual_review_evidence_path ?? visualGateJson,
      visual_review_vlm_model: row.visual_review_vlm_model ?? null,
      locator_method: row.locator_method ?? row.locator?.method ?? null,
      locator: row.locator ?? null,
      text_extraction: textExtraction,
      external_vlm_or_api_used_for_visual_review: row.external_vlm_or_api_used === true,
      external_ocr_rerun_used: false,
    },
    text_only_ready: Boolean(plainText) && !needsImageAsset && visualAccepted,
    image_context_required: needsImageAsset,
    quality_flags: buildQualityFlags({
      textExtraction,
      visualAccepted,
      hasDiagram,
      tableHeavy,
      imageAssets,
    }),
  };
}

function buildBlockers({ items, duplicateKeys }) {
  const blockers = [];
  for (const storageKey of duplicateKeys) {
    blockers.push({
      storage_key: storageKey,
      check: 'duplicate_storage_key',
    });
  }
  for (const item of items) {
    if (!item.plain_text) {
      blockers.push({
        storage_key: item.storage_key,
        check: 'missing_plain_text',
        source_surface_manifest: item.source_surface_manifest,
      });
    }
    if (item.quality_flags.includes('visual_review_not_accepted')) {
      blockers.push({
        storage_key: item.storage_key,
        check: 'visual_review_not_accepted',
        source_surface_manifest: item.source_surface_manifest,
      });
    }
    if (item.needs_image_asset && item.image_assets.length === 0) {
      blockers.push({
        storage_key: item.storage_key,
        check: 'missing_image_asset_for_layout_dependent_question',
        source_surface_manifest: item.source_surface_manifest,
      });
    }
  }
  return blockers;
}

function duplicateStorageKeys(items) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items) {
    if (!item.storage_key) {
      continue;
    }
    if (seen.has(item.storage_key)) {
      duplicates.add(item.storage_key);
    } else {
      seen.add(item.storage_key);
    }
  }
  return duplicates;
}

function buildSummary({ surface, pdfTextBySourcePdf, items, blockers }) {
  const sourcePdfs = unique(surface.rows.map((row) => row.source_pdf));
  return {
    selected_surface_manifests: surface.surface_paths.length,
    selected_source_pdfs: sourcePdfs.length,
    production_rows: items.length,
    plain_text_rows: countWhere(items, (item) => Boolean(item.plain_text)),
    text_only_ready_rows: countWhere(items, (item) => item.text_only_ready),
    image_context_required_rows: countWhere(items, (item) => item.image_context_required),
    image_context_rows_with_assets: countWhere(items, (item) => item.image_context_required && item.image_assets.length > 0),
    diagram_rows: countWhere(items, (item) => item.has_diagram),
    table_heavy_rows: countWhere(items, (item) => item.table_heavy),
    formula_dense_rows: countWhere(items, (item) => item.formula_dense),
    visual_review_accepted_rows: countWhere(items, (item) => !item.quality_flags.includes('visual_review_not_accepted')),
    pdf_text_layer_available_source_pdfs: countWhere(sourcePdfs, (sourcePdf) => pdfTextBySourcePdf[sourcePdf]?.status === 'available'),
    pdf_text_layer_failed_source_pdfs: countWhere(sourcePdfs, (sourcePdf) => pdfTextBySourcePdf[sourcePdf]?.status !== 'available'),
    duplicate_storage_keys: duplicateStorageKeys(items).size,
    missing_plain_text: countWhere(items, (item) => !item.plain_text),
    missing_image_asset: countWhere(items, (item) => item.image_context_required && item.image_assets.length === 0),
    blockers: blockers.length,
  };
}

export async function build9231QuestionPlainTextV1Layer({
  rootDir = ROOT,
  subject = DEFAULTS.subject,
  generatedOn = DEFAULTS.generatedOn,
  selectionManifest = DEFAULTS.selectionManifest,
  surfaceManifestPaths = DEFAULTS.surfaceManifestPaths,
  visualGateJson = DEFAULTS.visualGateJson,
  sourceVersion = DEFAULTS.sourceVersion,
  pdfTextBySourcePdf = null,
} = {}) {
  const surface = collectSurfaceRows({ rootDir, selectionManifest, surfaceManifestPaths });
  const sourcePdfs = unique(surface.rows.map((row) => row.source_pdf));
  const pdfText = await extractPdfTextBySource({
    rootDir,
    sourcePdfs,
    pdfTextBySourcePdf,
  });
  const nextByStorageKey = buildNextRowByStorageKey(surface.rows);
  const items = surface.rows.map((row) => buildPlainTextItem({
    row,
    nextRow: nextByStorageKey.get(row.storage_key) || null,
    pdfText: pdfText[toPosix(row.source_pdf)] || null,
    generatedOn,
    visualGateJson,
    sourceVersion,
  }));
  const duplicates = duplicateStorageKeys(items);
  const blockers = buildBlockers({ items, duplicateKeys: duplicates });
  const summary = buildSummary({ surface, pdfTextBySourcePdf: pdfText, items, blockers });
  const status = blockers.length === 0 ? 'pass' : 'blocked';
  return {
    schema_version: '9231_question_plain_text_v1',
    status,
    verdict: status === 'pass' ? 'question-plain-text-ready' : 'question-plain-text-blocked',
    generated_on: generatedOn,
    subject_code: subject,
    source_contract: {
      selection_manifest: surfaceManifestPaths.length > 0 ? null : selectionManifest,
      surface_manifest_paths: surface.surface_paths,
      visual_gate_json: visualGateJson,
      text_priority: ['pdfjs_page_chain_text_layer'],
      extraction_method: 'pdfjs_page_chain_locator_window_v1',
      split_method: 'deterministic text-only/image-context heuristic from extracted text and crop assets',
      boundary: 'local deterministic PDF text-layer extraction only; no external OCR rerun, no DB write, no RAG/search mutation',
    },
    summary,
    blockers,
    items,
  };
}

function markdownTable(rows) {
  return rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
}

export function buildMarkdownReport(layer, { jsonOut }) {
  const s = layer.summary;
  const blockerLines = layer.blockers.length === 0
    ? '- none'
    : layer.blockers.slice(0, 25).map((blocker) => `- ${blocker.check}: ${blocker.storage_key}`).join('\n');
  const blockerSuffix = layer.blockers.length > 25
    ? `\n- ... ${layer.blockers.length - 25} more blocker(s) omitted from markdown; see JSON.`
    : '';

  return [
    '# 9231 question plain text v1 coverage',
    '',
    layer.status === 'pass'
      ? 'Verdict: pass. Selected 9231 wave1 rows have deterministic PDF text-layer plain text with visual-review provenance.'
      : `Verdict: blocked. ${layer.blockers.length} blocker(s) must be fixed before this text layer is complete.`,
    '',
    '## Scope',
    '',
    '- Subject: 9231 Further Mathematics',
    `- Generated on: ${layer.generated_on}`,
    `- JSON artifact: ${jsonOut}`,
    '- Boundary: local deterministic PDF text-layer extraction only; no external OCR rerun, no DB write, no RAG/search mutation.',
    '- Text-only/image-context split is a deterministic heuristic recorded in the JSON provenance.',
    '',
    '## Aggregate Gate',
    '',
    markdownTable([
      ['metric', 'value'],
      ['selected surface manifests', String(s.selected_surface_manifests)],
      ['selected source PDFs', String(s.selected_source_pdfs)],
      ['production rows', String(s.production_rows)],
      ['plain text rows', String(s.plain_text_rows)],
      ['text-only ready rows', String(s.text_only_ready_rows)],
      ['image-context required rows', String(s.image_context_required_rows)],
      ['image-context rows with assets', `${s.image_context_rows_with_assets}/${s.image_context_required_rows}`],
      ['diagram rows', String(s.diagram_rows)],
      ['table-heavy rows', String(s.table_heavy_rows)],
      ['formula-dense rows', String(s.formula_dense_rows)],
      ['visual review accepted rows', String(s.visual_review_accepted_rows)],
      ['PDF text layer available source PDFs', String(s.pdf_text_layer_available_source_pdfs)],
      ['PDF text layer failed source PDFs', String(s.pdf_text_layer_failed_source_pdfs)],
      ['duplicate storage keys', String(s.duplicate_storage_keys)],
      ['missing plain text', String(s.missing_plain_text)],
      ['missing image asset', String(s.missing_image_asset)],
      ['blockers', String(s.blockers)],
    ]),
    '',
    '## Blockers',
    '',
    `${blockerLines}${blockerSuffix}`,
    '',
  ].join('\n');
}

export function write9231QuestionPlainTextV1Artifacts({
  rootDir = ROOT,
  layer,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
} = {}) {
  writeJson(rootDir, jsonOut, layer);
  writeText(rootDir, markdownOut, buildMarkdownReport(layer, { jsonOut }));
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return 0;
  }
  const layer = await build9231QuestionPlainTextV1Layer(options);
  write9231QuestionPlainTextV1Artifacts({ layer, ...options });
  writeStdoutLine(JSON.stringify({
    status: layer.status,
    verdict: layer.verdict,
    summary: layer.summary,
    json_out: options.jsonOut,
    markdown_out: options.markdownOut,
  }, null, 2));
  return layer.status === 'pass' ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error) => {
    writeStderrLine(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
