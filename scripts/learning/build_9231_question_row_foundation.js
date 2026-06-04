#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const LOCATOR_METHOD = 'pdfjs_text_items_strict_left_margin_question_header_v1';
const INPUT_SCHEMA_VERSION = '9231_question_row_foundation_input_v1';
const SURFACE_SCHEMA_VERSION = '9231_question_row_foundation_page_chain_surface_v1';
const COMBINED_SCHEMA_VERSION = '9231_question_row_foundation_manifest_v1';
const REPORT_SCHEMA_VERSION = '9231_question_row_foundation_gate_report_v1';

const DEFAULTS = Object.freeze({
  subject: '9231',
  generatedOn: '2026-06-04',
  questionPaperRoot: 'data/past-papers/9231Further-Mathematics',
  manifestRoot: 'data/manifests',
  reportsRoot: 'docs/reports',
  combinedManifestOut: 'data/manifests/9231_question_row_foundation_2026_06_04_manifest_v1.json',
  jsonOut: 'docs/reports/2026-06-04-9231-question-row-foundation-gate.json',
  markdownOut: 'docs/reports/2026-06-04-9231-question-row-foundation-gate.md',
});

function writeStdoutLine(message) {
  fs.writeSync(1, `${message}\n`);
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
    help: false,
    writeArtifacts: true,
    workflowGaps: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help') {
      options.help = true;
      continue;
    }
    if (token === '--subject') {
      options.subject = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--generated-on') {
      options.generatedOn = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--question-paper-root') {
      options.questionPaperRoot = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--manifest-root') {
      options.manifestRoot = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--reports-root') {
      options.reportsRoot = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--combined-manifest-out') {
      options.combinedManifestOut = requiredValue(argv, index, token);
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
    if (token === '--workflow-gap') {
      options.workflowGaps.push(requiredValue(argv, index, token));
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

function printUsage() {
  writeStdoutLine([
    'Usage: node scripts/learning/build_9231_question_row_foundation.js',
    '  [--generated-on <YYYY-MM-DD>]',
    '  [--question-paper-root <path>]',
    '  [--manifest-root <path>]',
    '  [--combined-manifest-out <path>]',
    '  [--json-out <path>]',
    '  [--markdown-out <path>]',
    '  [--workflow-gap <text>]',
    '  [--no-write]',
  ].join('\n'));
}

function toPosix(value) {
  return String(value || '').replace(/\\/g, '/');
}

function resolveFromRoot(rootDir, repoPath) {
  return path.isAbsolute(repoPath) ? repoPath : path.resolve(rootDir, repoPath);
}

function toRepoPath(rootDir, filePath) {
  return toPosix(path.relative(rootDir, path.resolve(filePath)));
}

function writeJsonFile(rootDir, repoPath, payload) {
  const filePath = resolveFromRoot(rootDir, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeTextFile(rootDir, repoPath, text) {
  const filePath = resolveFromRoot(rootDir, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, 'utf8');
}

function listFilesRecursive(rootDir, repoDir, { extensions = null } = {}) {
  const absoluteRoot = resolveFromRoot(rootDir, repoDir);
  if (!fs.existsSync(absoluteRoot)) {
    return [];
  }

  const files = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      if (extensions && !extensions.includes(path.extname(entry.name).toLowerCase())) {
        continue;
      }
      files.push(entryPath);
    }
  };

  visit(absoluteRoot);
  return files.sort((left, right) => toRepoPath(rootDir, left).localeCompare(toRepoPath(rootDir, right)));
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item) || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function numericPaperSort(left, right) {
  return Number(left.replace(/^p/, '')) - Number(right.replace(/^p/, ''));
}

function roundCoord(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function questionToken(value) {
  return String(value || '').trim().replace(/[.)]+$/u, '');
}

export function parseQuestionPaperSourcePath(sourcePdf, subject = DEFAULTS.subject) {
  const repoPath = toPosix(sourcePdf);
  const fileName = path.posix.basename(repoPath);
  const pattern = new RegExp(`^(?:WM_)?${subject}_([msw])(\\d{2})_qp_(\\d)(\\d)\\.pdf$`, 'i');
  const match = pattern.exec(fileName);
  if (!match) {
    return null;
  }
  const yy = Number.parseInt(match[2], 10);
  return {
    subject_code: subject,
    session: match[1].toLowerCase(),
    session_year: `${match[1].toLowerCase()}${match[2]}`,
    year: 2000 + yy,
    paper: Number.parseInt(match[3], 10),
    variant: Number.parseInt(match[4], 10),
    source_pdf: repoPath,
    pdf_stem: fileName.replace(/\.pdf$/i, ''),
  };
}

export function detectQuestionHeadersFromTextItems(
  textItems,
  {
    pageIndex,
    pageNumber = pageIndex + 1,
    xMax = 70,
    yMin = 35,
    qMin = 1,
    qMax = 20,
  } = {},
) {
  if (pageIndex === 0) {
    return [];
  }

  const byQuestion = new Map();
  for (const item of textItems || []) {
    const token = questionToken(item?.str);
    if (!/^\d{1,2}$/.test(token)) {
      continue;
    }
    const qNumber = Number.parseInt(token, 10);
    if (qNumber < qMin || qNumber > qMax) {
      continue;
    }
    const transform = Array.isArray(item?.transform) ? item.transform : [];
    const x = roundCoord(transform[4]);
    const y = roundCoord(transform[5]);
    if (x > xMax || y <= yMin) {
      continue;
    }
    if (byQuestion.has(qNumber)) {
      continue;
    }
    byQuestion.set(qNumber, {
      q_number: qNumber,
      page_index: pageIndex,
      page_number: pageNumber,
      text: String(item?.str || '').trim(),
      x,
      y,
    });
  }

  return [...byQuestion.values()].sort((left, right) => (
    left.q_number - right.q_number
    || left.page_index - right.page_index
    || right.y - left.y
  ));
}

function sourceKey(meta) {
  return `${meta.session_year}_qp_${meta.paper}${meta.variant}`;
}

function shardIdForPaper(paper) {
  return `9231_p${paper}_source_locator_001`;
}

function inputManifestPathForPaper(manifestRoot, paper) {
  return `${manifestRoot}/9231_p${paper}_source_locator_001_input_v1.json`;
}

function surfaceManifestPathForPaper(manifestRoot, paper) {
  return `${manifestRoot}/9231_p${paper}_source_locator_001_page_chain_surface_v1.json`;
}

function sequentialIntegers(values) {
  return values.every((value, index) => value === index + 1);
}

function range(start, endInclusive) {
  const output = [];
  for (let value = start; value <= endInclusive; value += 1) {
    output.push(value);
  }
  return output;
}

export function buildQuestionRowsForPdf({ meta, pageCount, questionHeaders }) {
  const sortedHeaders = [...(questionHeaders || [])].sort((left, right) => (
    left.q_number - right.q_number
    || left.page_index - right.page_index
    || right.y - left.y
  ));
  const shardId = shardIdForPaper(meta.paper);

  return sortedHeaders.map((header, index) => {
    const nextHeader = sortedHeaders[index + 1] || null;
    const startPageIndex = Number(header.page_index);
    let endPageIndex = pageCount - 1;
    if (nextHeader) {
      endPageIndex = nextHeader.page_index === startPageIndex
        ? startPageIndex
        : Math.max(startPageIndex, Number(nextHeader.page_index) - 1);
    }
    const pageIndices = range(startPageIndex, endPageIndex);
    const pageNumbers = pageIndices.map((pageIndex) => pageIndex + 1);
    const qPadded = String(header.q_number).padStart(2, '0');

    return {
      storage_key: `${meta.subject_code}/${sourceKey(meta)}/questions/q${qPadded}.png`,
      subject_code: meta.subject_code,
      syllabus_code: meta.subject_code,
      year: meta.year,
      session: meta.session,
      session_year: meta.session_year,
      paper: meta.paper,
      variant: meta.variant,
      q_number: header.q_number,
      source_pdf: meta.source_pdf,
      source_pdf_page_count: pageCount,
      source_pdf_stem: meta.pdf_stem,
      paper_family: 'standard',
      group_key: `p${meta.paper}`,
      shard_id: shardId,
      source: {
        source_pdf: meta.source_pdf,
        source_pdf_page_count: pageCount,
        source_layer: 'repo_past_paper_pdf',
      },
      locator_method: LOCATOR_METHOD,
      locator_status: 'resolved',
      locator: {
        method: LOCATOR_METHOD,
        page_index: header.page_index,
        page_number: header.page_number,
        text: header.text,
        x: header.x,
        y: header.y,
      },
      page_indices: pageIndices,
      page_numbers: pageNumbers,
      page_range: {
        start_page_index: startPageIndex,
        end_page_index: endPageIndex,
        start_page_number: startPageIndex + 1,
        end_page_number: endPageIndex + 1,
      },
      route_hint: 'pdf_page_chain_locator',
      rendered_pdf_page_paths: [],
      crop_paths: [],
      review_crop_paths: [],
      crop_status: 'not_generated',
      surface_evidence_status: 'locator_resolved_pending_crop_render_and_visual_review',
      page_chain_surface_status: 'locator_rows_ready_pending_crop_render_visual_review',
      text_evidence_status: 'not_extracted',
      normalized_plain_text: null,
      text_consumption_status: 'not_ready_missing_question_plain_text',
      text_only_ready: false,
      image_context_required: true,
      requires_review: true,
      visual_review_required: true,
      visual_review_reason: 'not_rendered_or_cropped_not_vlm_reviewed',
      production_ready_claimed: false,
      db_consumption_claimed: false,
      search_consumption_claimed: false,
      rag_consumption_claimed: false,
      external_vlm_or_api_used: false,
      external_ocr_rerun_used: false,
    };
  });
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

export async function scanPdfQuestionHeaders({ rootDir = ROOT, sourcePdf, pdfjsModule = null }) {
  const pdfjs = pdfjsModule || await loadPdfjs();
  const resolved = resolveFromRoot(rootDir, sourcePdf);
  const data = new Uint8Array(fs.readFileSync(resolved));
  const pdf = await pdfjs.getDocument({
    data,
    disableFontFace: true,
    isEvalSupported: false,
  }).promise;

  const byQuestion = new Map();
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const pageIndex = pageNumber - 1;
      if (pageIndex === 0) {
        continue;
      }
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      for (const header of detectQuestionHeadersFromTextItems(textContent.items, {
        pageIndex,
        pageNumber,
      })) {
        if (!byQuestion.has(header.q_number)) {
          byQuestion.set(header.q_number, header);
        }
      }
    }
  } finally {
    await pdf.destroy();
  }

  const questionHeaders = [...byQuestion.values()].sort((left, right) => left.q_number - right.q_number);
  return {
    source_pdf: toPosix(sourcePdf),
    parse_ok: true,
    page_count: pdf.numPages,
    question_headers: questionHeaders,
  };
}

async function scanQuestionPaperSources({ rootDir, subject, questionPaperRoot }) {
  const files = listFilesRecursive(rootDir, questionPaperRoot, { extensions: ['.pdf'] })
    .map((filePath) => toRepoPath(rootDir, filePath));
  const pdfjs = await loadPdfjs();
  const scannedPdfs = [];
  const blockers = [];

  for (const sourcePdf of files) {
    const meta = parseQuestionPaperSourcePath(sourcePdf, subject);
    if (!meta) {
      blockers.push({
        check: 'unrecognized_question_paper_pdf_name',
        severity: 'blocker',
        source_pdf: sourcePdf,
      });
      continue;
    }
    try {
      scannedPdfs.push(await scanPdfQuestionHeaders({
        rootDir,
        sourcePdf,
        pdfjsModule: pdfjs,
      }));
    } catch (error) {
      blockers.push({
        check: 'pdf_text_layer_parse_failed',
        severity: 'blocker',
        source_pdf: sourcePdf,
        error: error.message,
      });
    }
  }

  return { scannedPdfs, blockers };
}

function buildInputItem(row) {
  return {
    storage_key: row.storage_key,
    subject_code: row.subject_code,
    syllabus_code: row.syllabus_code,
    year: row.year,
    session: row.session,
    session_year: row.session_year,
    paper: row.paper,
    variant: row.variant,
    q_number: row.q_number,
    source_pdf: row.source_pdf,
    source_pdf_page_count: row.source_pdf_page_count,
    source_pdf_stem: row.source_pdf_stem,
    paper_family: row.paper_family,
    group_key: row.group_key,
    shard_id: row.shard_id,
    locator_method: row.locator_method,
    locator_status: row.locator_status,
    locator: row.locator,
    page_indices: row.page_indices,
    page_numbers: row.page_numbers,
    page_range: row.page_range,
    route_hint: row.route_hint,
    surface_evidence_status: 'not_yet_extracted',
    requires_review: true,
  };
}

function buildShardPayloads({
  generatedOn,
  manifestRoot,
  rows,
  combinedManifestId,
}) {
  const byPaper = new Map();
  for (const row of rows) {
    const paperKey = `p${row.paper}`;
    if (!byPaper.has(paperKey)) {
      byPaper.set(paperKey, []);
    }
    byPaper.get(paperKey).push(row);
  }

  const inputManifests = [];
  const surfaceManifests = [];
  for (const paperKey of [...byPaper.keys()].sort(numericPaperSort)) {
    const paper = Number(paperKey.replace(/^p/, ''));
    const shardRows = byPaper.get(paperKey).sort((left, right) => (
      left.session_year.localeCompare(right.session_year)
      || left.variant - right.variant
      || left.q_number - right.q_number
    ));
    const shardId = shardIdForPaper(paper);
    const inputPath = inputManifestPathForPaper(manifestRoot, paper);
    const surfacePath = surfaceManifestPathForPaper(manifestRoot, paper);
    const sourcePdfPaths = [...new Set(shardRows.map((row) => row.source_pdf))].sort();

    const inputPayload = {
      schema_version: INPUT_SCHEMA_VERSION,
      manifest_id: `${shardId}_input_v1`,
      generated_on: generatedOn,
      source_manifest_id: combinedManifestId,
      subject_code: '9231',
      shard_id: shardId,
      group_key: paperKey,
      paper,
      stage: 'deterministic source locator input rows',
      locator_method: LOCATOR_METHOD,
      item_count: shardRows.length,
      source_pdf_count: sourcePdfPaths.length,
      source_pdf_paths: sourcePdfPaths,
      boundary: {
        page_chain_surface_claimed: false,
        production_ready_claimed: false,
        canonical_question_text_claimed: false,
        external_vlm_or_api_used: false,
        external_ocr_rerun_used: false,
      },
      items: shardRows.map(buildInputItem),
    };
    inputManifests.push({ path: inputPath, item_count: shardRows.length, payload: inputPayload });

    const surfacePayload = {
      schema_version: SURFACE_SCHEMA_VERSION,
      manifest_id: `${shardId}_page_chain_surface_v1`,
      generated_on: generatedOn,
      source_manifest_id: combinedManifestId,
      source_input_manifest_id: inputPayload.manifest_id,
      input_manifest_path: inputPath,
      subject_code: '9231',
      shard_id: shardId,
      group_key: paperKey,
      paper,
      stage: 'deterministic locator page-chain question-row surface',
      locator_method: LOCATOR_METHOD,
      item_count: shardRows.length,
      source_pdf_count: sourcePdfPaths.length,
      source_pdf_paths: sourcePdfPaths,
      surface_status: 'locator_rows_ready_pending_crop_render_visual_review',
      boundary: {
        local_deterministic_locator_surface: true,
        production_ready_claimed: false,
        canonical_question_text_claimed: false,
        normalized_plain_text_claimed: false,
        db_consumption_claimed: false,
        search_consumption_claimed: false,
        rag_consumption_claimed: false,
        external_vlm_or_api_used: false,
        external_ocr_rerun_used: false,
      },
      items: shardRows,
    };
    surfaceManifests.push({ path: surfacePath, item_count: shardRows.length, payload: surfacePayload });
  }

  return { inputManifests, surfaceManifests };
}

function reportArtifacts({ combinedManifestOut, inputManifests, surfaceManifests, jsonOut, markdownOut }) {
  return {
    combined_manifest: {
      path: combinedManifestOut,
    },
    input_manifests: inputManifests.map((manifest) => ({
      path: manifest.path,
      item_count: manifest.item_count,
    })),
    page_chain_surface_manifests: surfaceManifests.map((manifest) => ({
      path: manifest.path,
      item_count: manifest.item_count,
    })),
    reports: {
      json: jsonOut,
      markdown: markdownOut,
    },
  };
}

export function buildQuestionRowFoundationFromScannedPdfs({
  scannedPdfs,
  generatedOn = DEFAULTS.generatedOn,
  subject = DEFAULTS.subject,
  questionPaperRoot = DEFAULTS.questionPaperRoot,
  manifestRoot = DEFAULTS.manifestRoot,
  combinedManifestOut = DEFAULTS.combinedManifestOut,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
  scanBlockers = [],
  workflowGaps = [],
} = {}) {
  const rows = [];
  const blockers = [...scanBlockers];
  const pdfSummaries = [];

  for (const scanned of scannedPdfs || []) {
    const meta = parseQuestionPaperSourcePath(scanned.source_pdf, subject);
    if (!meta) {
      blockers.push({
        check: 'unrecognized_question_paper_pdf_name',
        severity: 'blocker',
        source_pdf: scanned.source_pdf,
      });
      continue;
    }
    if (scanned.parse_ok === false) {
      blockers.push({
        check: 'pdf_text_layer_parse_failed',
        severity: 'blocker',
        source_pdf: scanned.source_pdf,
        error: scanned.error || 'unknown',
      });
      continue;
    }

    const questionHeaders = [...(scanned.question_headers || [])].sort((left, right) => left.q_number - right.q_number);
    const questionNumbers = questionHeaders.map((header) => header.q_number);
    if (questionNumbers.length === 0) {
      blockers.push({
        check: 'missing_question_headers',
        severity: 'blocker',
        source_pdf: scanned.source_pdf,
        page_count: scanned.page_count,
      });
      continue;
    }
    if (!sequentialIntegers(questionNumbers)) {
      blockers.push({
        check: 'non_sequential_question_headers',
        severity: 'blocker',
        source_pdf: scanned.source_pdf,
        detected_question_numbers: questionNumbers,
      });
    }

    const pdfRows = buildQuestionRowsForPdf({
      meta,
      pageCount: scanned.page_count,
      questionHeaders,
    });
    rows.push(...pdfRows);
    pdfSummaries.push({
      source_pdf: scanned.source_pdf,
      paper: `p${meta.paper}`,
      session_year: meta.session_year,
      variant: meta.variant,
      page_count: scanned.page_count,
      question_count: pdfRows.length,
      detected_question_numbers: questionNumbers,
    });
  }

  const seenStorageKeys = new Set();
  for (const row of rows) {
    if (seenStorageKeys.has(row.storage_key)) {
      blockers.push({
        check: 'duplicate_storage_key',
        severity: 'blocker',
        storage_key: row.storage_key,
      });
    }
    seenStorageKeys.add(row.storage_key);
  }

  const combinedManifestId = path.posix.basename(combinedManifestOut).replace(/\.json$/i, '');
  const { inputManifests, surfaceManifests } = buildShardPayloads({
    generatedOn,
    manifestRoot,
    rows,
    combinedManifestId,
  });
  const sourcePdfCount = pdfSummaries.length;
  const questionRowCount = rows.length;
  const gateStatus = blockers.length === 0 && questionRowCount > 0
    ? 'row_foundation_ready_pending_text_image_gates'
    : 'blocked_by_locator_or_manifest_gaps';
  const summary = {
    source_pdf_count: sourcePdfCount,
    source_pdf_root: questionPaperRoot,
    pdfs_parse_ok: sourcePdfCount,
    page_count_total: pdfSummaries.reduce((sum, item) => sum + Number(item.page_count || 0), 0),
    question_row_count: questionRowCount,
    question_rows_by_paper: countBy(rows, (row) => `p${row.paper}`),
    source_pdfs_by_paper: countBy(pdfSummaries, (item) => item.paper),
    question_count_histogram: countBy(pdfSummaries, (item) => String(item.question_count)),
    input_manifest_count: inputManifests.length,
    page_chain_surface_manifest_count: surfaceManifests.length,
    text_only_ready_rows: rows.filter((row) => row.text_only_ready).length,
    image_context_required_rows: rows.filter((row) => row.image_context_required).length,
    blocker_count: blockers.length,
  };

  const combinedManifest = {
    schema_version: COMBINED_SCHEMA_VERSION,
    manifest_id: combinedManifestId,
    generated_on: generatedOn,
    subject_code: subject,
    gate_status: gateStatus,
    scope: {
      stage: 'deterministic source locator question-row foundation',
      question_paper_root: questionPaperRoot,
      locator_method: LOCATOR_METHOD,
      local_pdf_text_layer_locator: true,
      not_production_ready: true,
      not_canonical_question_text_layer: true,
      not_normalized_plain_text_layer: true,
      not_db_search_rag_consumed: true,
      external_vlm_or_api_used: false,
      external_ocr_rerun_used: false,
    },
    summary,
    shards: surfaceManifests.map((manifest) => ({
      shard_id: manifest.payload.shard_id,
      group_key: manifest.payload.group_key,
      paper: manifest.payload.paper,
      input_manifest_path: manifest.payload.input_manifest_path,
      page_chain_surface_manifest_path: manifest.path,
      source_pdf_count: manifest.payload.source_pdf_count,
      question_row_count: manifest.item_count,
      surface_status: manifest.payload.surface_status,
    })),
    blockers,
  };

  const artifacts = {
    combined_manifest: { path: combinedManifestOut, payload: combinedManifest },
    input_manifests: inputManifests,
    page_chain_surface_manifests: surfaceManifests,
    reports: {
      json: jsonOut,
      markdown: markdownOut,
    },
  };

  return {
    schema_version: REPORT_SCHEMA_VERSION,
    generated_on: generatedOn,
    subject_code: subject,
    gate_status: gateStatus,
    boundary: {
      local_deterministic_locator_gate: true,
      production_ready_claimed: false,
      canonical_question_text_claimed: false,
      question_plain_text_v1_claimed: false,
      question_plain_text_v2_claimed: false,
      normalized_plain_text_claimed: false,
      db_consumption_claimed: false,
      search_consumption_claimed: false,
      rag_consumption_claimed: false,
      external_vlm_or_api_used: false,
      external_ocr_rerun_used: false,
    },
    locator_method: LOCATOR_METHOD,
    summary,
    blockers,
    pdf_summaries: pdfSummaries,
    sample_rows: rows.slice(0, 10),
    combined_manifest: combinedManifest,
    artifacts,
    workflow_gaps: [...workflowGaps],
    verification_inputs: [
      'git status --short --branch',
      'npm run workflow:codex-preflight -- --json',
      questionPaperRoot,
      'pdfjs-dist/legacy/build/pdf.mjs local text-item coordinates',
      'data/manifests/9231_p{1..4}_source_locator_001_input_v1.json',
      'data/manifests/9231_p{1..4}_source_locator_001_page_chain_surface_v1.json',
    ],
  };
}

export async function buildQuestionRowFoundation({
  rootDir = ROOT,
  subject = DEFAULTS.subject,
  generatedOn = DEFAULTS.generatedOn,
  questionPaperRoot = DEFAULTS.questionPaperRoot,
  manifestRoot = DEFAULTS.manifestRoot,
  combinedManifestOut = DEFAULTS.combinedManifestOut,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
  workflowGaps = [],
} = {}) {
  const { scannedPdfs, blockers } = await scanQuestionPaperSources({
    rootDir,
    subject,
    questionPaperRoot,
  });
  return buildQuestionRowFoundationFromScannedPdfs({
    scannedPdfs,
    generatedOn,
    subject,
    questionPaperRoot,
    manifestRoot,
    combinedManifestOut,
    jsonOut,
    markdownOut,
    scanBlockers: blockers,
    workflowGaps,
  });
}

function slimReport(foundation) {
  return {
    schema_version: foundation.schema_version,
    generated_on: foundation.generated_on,
    subject_code: foundation.subject_code,
    gate_status: foundation.gate_status,
    boundary: foundation.boundary,
    locator_method: foundation.locator_method,
    summary: foundation.summary,
    blockers: foundation.blockers,
    artifacts: reportArtifacts({
      combinedManifestOut: foundation.artifacts.combined_manifest.path,
      inputManifests: foundation.artifacts.input_manifests,
      surfaceManifests: foundation.artifacts.page_chain_surface_manifests,
      jsonOut: foundation.artifacts.reports.json,
      markdownOut: foundation.artifacts.reports.markdown,
    }),
    pdf_samples: foundation.pdf_summaries.slice(0, 20),
    sample_rows: foundation.sample_rows,
    workflow_gaps: foundation.workflow_gaps,
    verification_inputs: foundation.verification_inputs,
  };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell)).join(' | ')} |`),
  ].join('\n');
}

export function renderQuestionRowFoundationMarkdown(foundation) {
  const summary = foundation.summary;
  const artifacts = reportArtifacts({
    combinedManifestOut: foundation.artifacts.combined_manifest.path,
    inputManifests: foundation.artifacts.input_manifests,
    surfaceManifests: foundation.artifacts.page_chain_surface_manifests,
    jsonOut: foundation.artifacts.reports.json,
    markdownOut: foundation.artifacts.reports.markdown,
  });

  const lines = [
    '# 9231 Question Row Foundation Gate',
    '',
    `- generated_on: \`${foundation.generated_on}\``,
    `- gate_status: \`${foundation.gate_status}\``,
    `- locator_method: \`${foundation.locator_method}\``,
    '- This is not production-ready and does not claim canonical question text.',
    '- No external VLM/API or OCR rerun was used.',
    '- DB/search/RAG consumption claimed: false.',
    '',
    '## Repo-Truth Conclusion',
    '',
    foundation.gate_status === 'row_foundation_ready_pending_text_image_gates'
      ? 'Conclusion: deterministic 9231 source PDF locator rows now exist as local page-chain surface manifests, pending crop/render, visual review, row-level text evidence, v1/v2 plain-text gates, and local normalized_plain_text consumption gates.'
      : 'Conclusion: 9231 question-row foundation remains blocked by locator or manifest gaps listed below.',
    '',
    '## Gate Counts',
    '',
    markdownTable(['metric', 'value'], [
      ['source PDF count', summary.source_pdf_count],
      ['PDFs parse OK', summary.pdfs_parse_ok],
      ['page count total', summary.page_count_total],
      ['question row count', summary.question_row_count],
      ['input manifests', summary.input_manifest_count],
      ['page-chain surface manifests', summary.page_chain_surface_manifest_count],
      ['text-only ready rows', summary.text_only_ready_rows],
      ['image-context required rows', summary.image_context_required_rows],
      ['blockers', summary.blocker_count],
      ['DB/search/RAG consumption claimed', false],
    ]),
    '',
    '## Paper Split',
    '',
    markdownTable(['paper', 'source PDFs', 'question rows'], Object.keys(summary.source_pdfs_by_paper)
      .sort(numericPaperSort)
      .map((paper) => [
        paper,
        summary.source_pdfs_by_paper[paper],
        summary.question_rows_by_paper[paper] || 0,
      ])),
    '',
    '## Question Count Histogram',
    '',
    markdownTable(['questions per PDF', 'PDF count'], Object.keys(summary.question_count_histogram)
      .sort((left, right) => Number(left) - Number(right))
      .map((questionCount) => [questionCount, summary.question_count_histogram[questionCount]])),
    '',
    '## Artifacts',
    '',
    markdownTable(['artifact', 'path', 'rows'], [
      ['combined manifest', artifacts.combined_manifest.path, summary.question_row_count],
      ...artifacts.input_manifests.map((manifest) => ['input manifest', manifest.path, manifest.item_count]),
      ...artifacts.page_chain_surface_manifests.map((manifest) => ['page-chain surface manifest', manifest.path, manifest.item_count]),
      ['report json', artifacts.reports.json, 'n/a'],
      ['report markdown', artifacts.reports.markdown, 'n/a'],
    ]),
    '',
    '## Blockers',
    '',
  ];

  if (foundation.blockers.length === 0) {
    lines.push('- none');
  } else {
    for (const blocker of foundation.blockers) {
      lines.push(`- ${blocker.check}: ${blocker.source_pdf || blocker.storage_key || ''}`);
    }
  }

  lines.push(
    '',
    '## Next Executable Gates',
    '',
    '- Render/crop each row locally and validate referenced crop assets.',
    '- Attach row-level OCR/text evidence without external VLM/API unless scope is explicitly expanded.',
    '- Build 9231 question_plain_text_v1/v2 only after row evidence exists.',
    '- Run a 9231 local normalized_plain_text consumption gate before claiming search/read-model/RAG consumption.',
    '',
    '## Verification Inputs',
    '',
  );
  for (const input of foundation.verification_inputs) {
    lines.push(`- \`${input}\``);
  }
  if (foundation.workflow_gaps.length > 0) {
    lines.push('', '## Workflow Gaps', '');
    for (const gap of foundation.workflow_gaps) {
      lines.push(`- ${gap}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export function writeQuestionRowFoundationArtifacts(rootDir, foundation) {
  writeJsonFile(rootDir, foundation.artifacts.combined_manifest.path, foundation.artifacts.combined_manifest.payload);
  for (const manifest of foundation.artifacts.input_manifests) {
    writeJsonFile(rootDir, manifest.path, manifest.payload);
  }
  for (const manifest of foundation.artifacts.page_chain_surface_manifests) {
    writeJsonFile(rootDir, manifest.path, manifest.payload);
  }
  writeJsonFile(rootDir, foundation.artifacts.reports.json, slimReport(foundation));
  writeTextFile(rootDir, foundation.artifacts.reports.markdown, renderQuestionRowFoundationMarkdown(foundation));
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return 0;
  }

  const foundation = await buildQuestionRowFoundation({
    rootDir: ROOT,
    ...options,
  });
  if (options.writeArtifacts) {
    writeQuestionRowFoundationArtifacts(ROOT, foundation);
  }
  writeStdoutLine(JSON.stringify({
    gate_status: foundation.gate_status,
    source_pdf_count: foundation.summary.source_pdf_count,
    question_row_count: foundation.summary.question_row_count,
    question_rows_by_paper: foundation.summary.question_rows_by_paper,
    text_only_ready_rows: foundation.summary.text_only_ready_rows,
    image_context_required_rows: foundation.summary.image_context_required_rows,
    blockers: foundation.summary.blocker_count,
    artifacts: reportArtifacts({
      combinedManifestOut: foundation.artifacts.combined_manifest.path,
      inputManifests: foundation.artifacts.input_manifests,
      surfaceManifests: foundation.artifacts.page_chain_surface_manifests,
      jsonOut: foundation.artifacts.reports.json,
      markdownOut: foundation.artifacts.reports.markdown,
    }),
  }, null, 2));
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    fs.writeSync(2, `${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
