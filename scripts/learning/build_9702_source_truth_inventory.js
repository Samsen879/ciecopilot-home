#!/usr/bin/env node

import childProcess from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const DEFAULTS = Object.freeze({
  generatedOn: '2026-06-09',
  subject: '9702',
  sourceRoot: 'data/past-papers/9702Physics',
  manifestRoot: 'data/manifests',
  promotionJson: 'docs/reports/2026-06-02-9231-9702-new-paper-source-promotion.json',
  sourceGapReport: 'docs/reports/2026-06-02-9231-9702-new-paper-source-gap-inventory.md',
  candidateDownloadReport: 'docs/reports/2026-06-02-9231-9702-new-paper-source-candidate-download-report.md',
  promotionReport: 'docs/reports/2026-06-02-9231-9702-new-paper-source-promotion-report.md',
  jsonOut: 'docs/reports/2026-06-09-9702-source-truth-inventory.json',
  markdownOut: 'docs/reports/2026-06-09-9702-source-truth-inventory.md',
  renderScale: 0.4,
  renderMode: 'representative',
});

const SESSION_LABELS = Object.freeze({
  m: 'Feb/March',
  s: 'May/June',
  w: 'Oct/Nov',
});

const POSTURE_KEYS = Object.freeze([
  'historical_repo_source',
  'public_mirror_candidate_promoted_2026_06_02',
  'official_restricted_or_user_supplied',
  'ambiguous_or_blocked',
]);

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
    renderAllPages: false,
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
    if (token === '--source-root') {
      options.sourceRoot = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--manifest-root') {
      options.manifestRoot = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--promotion-json') {
      options.promotionJson = requiredValue(argv, index, token);
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
    if (token === '--render-scale') {
      options.renderScale = Number.parseFloat(requiredValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token === '--render-all-pages') {
      options.renderAllPages = true;
      options.renderMode = 'all_pages';
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
    'Usage: node scripts/learning/build_9702_source_truth_inventory.js',
    '  [--generated-on <YYYY-MM-DD>]',
    '  [--render-scale <number>]',
    '  [--render-all-pages]',
    '  [--no-write]',
    '  [--json-out <path>]',
    '  [--markdown-out <path>]',
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

function readJsonIfExists(rootDir, repoPath) {
  const filePath = resolveFromRoot(rootDir, repoPath);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

function fileSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function pdfSignatureEvidence(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const stat = fs.fstatSync(fd);
    const first = Buffer.alloc(Math.min(8, stat.size));
    fs.readSync(fd, first, 0, first.length, 0);
    const tailLength = Math.min(2048, stat.size);
    const tail = Buffer.alloc(tailLength);
    fs.readSync(fd, tail, 0, tailLength, Math.max(0, stat.size - tailLength));
    return {
      starts_with_pdf_signature: first.toString('latin1').startsWith('%PDF-'),
      eof_marker_present: tail.toString('latin1').includes('%%EOF'),
    };
  } finally {
    fs.closeSync(fd);
  }
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = String(keyFn(item) ?? 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function sortedObject(objectLike) {
  return Object.fromEntries(Object.entries(objectLike || {}).sort(([left], [right]) => (
    String(left).localeCompare(String(right), undefined, { numeric: true })
  )));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => String(left).localeCompare(String(right), undefined, { numeric: true }));
}

export function parse9702SourcePdfPath(repoPath) {
  const normalized = toPosix(repoPath);
  const match = /^data\/past-papers\/9702Physics\/paper([1-5])\/(9702_([msw])(\d{2})_qp_([1-5])(\d)\.pdf)$/i.exec(normalized);
  if (!match) {
    return null;
  }
  const [, paperDir, fileName, sessionCodeRaw, yearSuffix, componentPaper, variantRaw] = match;
  const sessionCode = sessionCodeRaw.toLowerCase();
  const paperNumber = Number.parseInt(componentPaper, 10);
  const variant = Number.parseInt(variantRaw, 10);
  const year = 2000 + Number.parseInt(yearSuffix, 10);
  return {
    repo_path: normalized,
    file_name: fileName,
    canonical_paper_id: fileName.replace(/\.pdf$/i, ''),
    session_id: `${sessionCode}${yearSuffix}`,
    session_code: sessionCode,
    session_label: SESSION_LABELS[sessionCode] || 'unknown',
    year,
    paper: `paper${paperDir}`,
    paper_number: paperNumber,
    component_id: `${componentPaper}${variantRaw}`,
    variant,
  };
}

function discoverTrackedSourcePaths(rootDir, sourceRoot = DEFAULTS.sourceRoot) {
  const pattern = `${sourceRoot}/**/9702_*_qp_*.pdf`;
  const output = childProcess.execFileSync('git', ['ls-files', pattern], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).sort((left, right) => (
    left.localeCompare(right, undefined, { numeric: true })
  ));
}

function list9702ManifestPaths(rootDir, manifestRoot = DEFAULTS.manifestRoot) {
  const absolute = resolveFromRoot(rootDir, manifestRoot);
  if (!fs.existsSync(absolute)) {
    return [];
  }
  return fs.readdirSync(absolute, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^9702.*\.json$/i.test(entry.name))
    .map((entry) => toPosix(path.posix.join(manifestRoot, entry.name)))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

function loadPromotionRows(rootDir, promotionJson) {
  const payload = readJsonIfExists(rootDir, promotionJson);
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const byPath = new Map();
  for (const row of rows) {
    if (String(row.subject_code || row.subject || '') !== '9702') {
      continue;
    }
    const repoPath = toPosix(row.repo_source_path || row.intended_repo_source_path || row.target_path || '');
    if (!repoPath) {
      continue;
    }
    byPath.set(repoPath, row);
  }
  return {
    artifact: promotionJson,
    exists: Boolean(payload),
    source_posture: payload?.source_posture || null,
    row_count: rows.length,
    subject_9702_row_count: byPath.size,
    byPath,
  };
}

function sourcePostureForPath(repoPath, promotionEvidence) {
  const promoted = promotionEvidence.byPath.get(repoPath);
  if (!promoted) {
    return {
      classification: 'historical_repo_source',
      evidence: {
        basis: 'tracked 9702 source PDF not listed in the 2026-06-02 public-mirror promotion evidence',
      },
    };
  }
  if (String(promoted.status || '').toLowerCase() !== 'verified') {
    return {
      classification: 'ambiguous_or_blocked',
      evidence: {
        basis: 'listed in promotion evidence but status is not verified',
        promotion_artifact: promotionEvidence.artifact,
        promotion_status: promoted.status || null,
      },
    };
  }
  return {
    classification: 'public_mirror_candidate_promoted_2026_06_02',
    evidence: {
      basis: 'public mirror candidate promoted into repo source tree on 2026-06-02',
      promotion_artifact: promotionEvidence.artifact,
      source_posture: promotionEvidence.source_posture,
      candidate_source_url: promoted.candidate_source_url || null,
      recorded_sha256: promoted.sha256 || null,
      recorded_page_count: promoted.page_count ?? null,
    },
  };
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function compactText(value) {
  return normalizeText(value).toUpperCase().replace(/\s+/g, '');
}

function sessionTerms(meta) {
  if (meta.session_code === 'm') {
    return ['FEBRUARY/MARCH', 'FEB/MAR', 'FEBRUARY', 'MARCH', '/M/'];
  }
  if (meta.session_code === 's') {
    return ['MAY/JUNE', 'M/J', 'JUNE'];
  }
  if (meta.session_code === 'w') {
    return ['OCTOBER/NOVEMBER', 'OCT/NOV', 'O/N', 'NOVEMBER'];
  }
  return [];
}

function buildFirstPageIdentity(meta, inspection) {
  const sample = normalizeText(inspection.first_page_text_sample || inspection.firstPageTextSample || '');
  const available = Boolean(inspection.first_page_text_available ?? sample.length > 0);
  if (!available) {
    return {
      text_layer_available: false,
      status: 'not_checked_text_layer_unavailable',
      subject_9702: null,
      session_year: null,
      component: null,
      first_page_text_sample: sample,
    };
  }

  const compact = compactText(sample);
  const upper = normalizeText(sample).toUpperCase();
  const yearTwo = String(meta.year).slice(-2);
  const subjectPass = /\b9702\b/.test(upper) || compact.includes('9702');
  const componentPass = compact.includes(`9702/${meta.component_id}`) ||
    compact.includes(`PAPER${meta.component_id}`) ||
    compact.includes(`COMPONENT${meta.component_id}`);
  const yearPass = upper.includes(String(meta.year)) ||
    compact.includes(`/${yearTwo}`) ||
    new RegExp(`\\b${yearTwo}\\b`).test(upper);
  const sessionPass = sessionTerms(meta).some((term) => compact.includes(term.replace(/\s+/g, '').toUpperCase()));

  return {
    text_layer_available: true,
    status: subjectPass && componentPass && yearPass && sessionPass ? 'pass' : 'failed',
    subject_9702: subjectPass,
    session_year: yearPass && sessionPass,
    component: componentPass,
    expected_session_label: meta.session_label,
    expected_year: meta.year,
    expected_component_id: meta.component_id,
    first_page_text_sample: sample.slice(0, 500),
  };
}

function representativePageNumbers(pageCount, renderAllPages) {
  const total = Number(pageCount || 0);
  if (!Number.isFinite(total) || total <= 0) {
    return [];
  }
  if (renderAllPages) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  return uniqueSorted([1, Math.ceil(total / 2), total].filter((page) => page >= 1 && page <= total))
    .map((page) => Number(page));
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

async function loadCanvas() {
  try {
    return await import('@napi-rs/canvas');
  } catch {
    const candidates = [
      path.resolve(ROOT, 'node_modules/@napi-rs/canvas/index.js'),
      path.resolve(ROOT, '../../node_modules/@napi-rs/canvas/index.js'),
      '/home/samsen/code/ciecopilot-home/node_modules/@napi-rs/canvas/index.js',
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return import(pathToFileURL(candidate).href);
      }
    }
    throw new Error('@napi-rs/canvas was not found in local node_modules.');
  }
}

function ensureCanvasGlobals(canvasModule) {
  if (canvasModule.DOMMatrix && !globalThis.DOMMatrix) {
    globalThis.DOMMatrix = canvasModule.DOMMatrix;
  }
  if (canvasModule.ImageData && !globalThis.ImageData) {
    globalThis.ImageData = canvasModule.ImageData;
  }
  if (canvasModule.Path2D && !globalThis.Path2D) {
    globalThis.Path2D = canvasModule.Path2D;
  }
}

function countNonwhitePixels(imageData) {
  const bytes = imageData.data;
  let count = 0;
  for (let index = 0; index < bytes.length; index += 4) {
    const r = bytes[index];
    const g = bytes[index + 1];
    const b = bytes[index + 2];
    const alpha = bytes[index + 3];
    if (alpha > 0 && (r < 245 || g < 245 || b < 245)) {
      count += 1;
    }
  }
  return count;
}

export async function inspectPdfWithPdfjsRender(filePath, {
  pdfjsModule = null,
  canvasModule = null,
  scale = DEFAULTS.renderScale,
  renderAllPages = false,
} = {}) {
  const pdfjs = pdfjsModule || await loadPdfjs();
  const canvas = canvasModule || await loadCanvas();
  ensureCanvasGlobals(canvas);

  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await pdfjs.getDocument({
    data,
    disableFontFace: true,
    disableWorker: true,
    useSystemFonts: false,
    isEvalSupported: false,
  }).promise;

  const pageCount = pdf.numPages;
  let firstPageTextSample = '';
  let firstPageTextAvailable = false;
  const renderedPageNumbers = representativePageNumbers(pageCount, renderAllPages);
  const nonwhiteByPage = {};

  try {
    for (const pageNumber of renderedPageNumbers) {
      const page = await pdf.getPage(pageNumber);
      try {
        if (pageNumber === 1) {
          try {
            const textContent = await page.getTextContent();
            firstPageTextSample = (textContent.items || [])
              .map((item) => String(item?.str || '').trim())
              .filter(Boolean)
              .join(' ')
              .replace(/\s+/g, ' ')
              .slice(0, 1000);
            firstPageTextAvailable = firstPageTextSample.length > 0;
          } catch {
            firstPageTextSample = '';
            firstPageTextAvailable = false;
          }
        }
        const viewport = page.getViewport({ scale });
        const renderCanvas = canvas.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const canvasContext = renderCanvas.getContext('2d');
        await page.render({ canvasContext, viewport }).promise;
        const image = canvasContext.getImageData(0, 0, renderCanvas.width, renderCanvas.height);
        nonwhiteByPage[pageNumber] = countNonwhitePixels(image);
      } finally {
        page.cleanup();
      }
    }
  } finally {
    await pdf.destroy();
  }

  const nonwhiteCounts = Object.values(nonwhiteByPage);
  const nonblankPages = nonwhiteCounts.filter((count) => count > 25).length;
  const firstPageNonblank = Number(nonwhiteByPage[1] || 0) > 25;

  return {
    parse_success: true,
    page_count: pageCount,
    first_page_text_sample: firstPageTextSample,
    first_page_text_available: firstPageTextAvailable,
    render_sanity: {
      renderer: 'pdfjs-dist + @napi-rs/canvas',
      render_mode: renderAllPages ? 'all_pages' : 'representative',
      scale,
      pages_rendered: renderedPageNumbers.length,
      rendered_page_numbers: renderedPageNumbers,
      nonblank_pages: nonblankPages,
      blank_pages: renderedPageNumbers.length - nonblankPages,
      first_page_nonblank: firstPageNonblank,
      min_nonwhite_pixels: nonwhiteCounts.length > 0 ? Math.min(...nonwhiteCounts) : 0,
      max_nonwhite_pixels: nonwhiteCounts.length > 0 ? Math.max(...nonwhiteCounts) : 0,
      nonwhite_pixels_by_page: nonwhiteByPage,
      status: renderedPageNumbers.length > 0 && nonblankPages > 0 && firstPageNonblank ? 'pass' : 'failed',
    },
  };
}

async function buildRecord({
  rootDir,
  repoPath,
  promotionEvidence,
  inspectPdf,
  renderScale,
  renderAllPages,
}) {
  const blockers = [];
  const meta = parse9702SourcePdfPath(repoPath);
  if (!meta) {
    blockers.push({
      check: 'canonical_source_path_parse_failed',
      source_path: repoPath,
      reason: 'expected data/past-papers/9702Physics/paperN/9702_<session>_qp_<component>.pdf',
    });
  } else if (meta.paper_number !== Number(meta.paper.replace('paper', ''))) {
    blockers.push({
      check: 'paper_directory_component_mismatch',
      source_path: repoPath,
      paper_directory: meta.paper,
      component_id: meta.component_id,
    });
  }

  const filePath = resolveFromRoot(rootDir, repoPath);
  if (!fs.existsSync(filePath)) {
    blockers.push({ check: 'source_pdf_missing', source_path: repoPath });
    return {
      source_path: repoPath,
      ...(meta || {}),
      status: 'blocked',
      blockers,
    };
  }

  const stat = fs.statSync(filePath);
  const signature = pdfSignatureEvidence(filePath);
  if (!signature.starts_with_pdf_signature) {
    blockers.push({ check: 'pdf_signature_missing', source_path: repoPath });
  }

  let inspection;
  try {
    inspection = await inspectPdf(filePath, { scale: renderScale, renderAllPages });
  } catch (error) {
    inspection = {
      parse_success: false,
      page_count: null,
      first_page_text_sample: '',
      first_page_text_available: false,
      render_sanity: {
        renderer: 'pdfjs-dist + @napi-rs/canvas',
        scale: renderScale,
        pages_rendered: 0,
        rendered_page_numbers: [],
        nonblank_pages: 0,
        blank_pages: 0,
        min_nonwhite_pixels: 0,
        max_nonwhite_pixels: 0,
        status: 'failed',
      },
      parse_error: error?.message || String(error),
    };
  }

  const pageCount = Number(inspection.page_count ?? inspection.pages ?? 0);
  if (!inspection.parse_success) {
    blockers.push({
      check: 'pdfjs_parse_failed',
      source_path: repoPath,
      error: inspection.parse_error || 'unknown',
    });
  }
  if (!Number.isInteger(pageCount) || pageCount <= 0) {
    blockers.push({ check: 'page_count_missing_or_zero', source_path: repoPath, page_count: inspection.page_count ?? null });
  }

  const firstPageIdentity = meta
    ? buildFirstPageIdentity(meta, inspection)
    : {
        text_layer_available: false,
        status: 'not_checked_unparsed_source_path',
        subject_9702: null,
        session_year: null,
        component: null,
        first_page_text_sample: normalizeText(inspection.first_page_text_sample || ''),
      };
  if (firstPageIdentity.text_layer_available && firstPageIdentity.status !== 'pass') {
    blockers.push({
      check: 'first_page_identity_failed',
      source_path: repoPath,
      subject_9702: firstPageIdentity.subject_9702,
      session_year: firstPageIdentity.session_year,
      component: firstPageIdentity.component,
    });
  }

  const renderSanity = inspection.render_sanity || {};
  if (renderSanity.status !== 'pass') {
    blockers.push({
      check: 'render_sanity_failed',
      source_path: repoPath,
      pages_rendered: renderSanity.pages_rendered ?? 0,
      nonblank_pages: renderSanity.nonblank_pages ?? 0,
      first_page_nonblank: renderSanity.first_page_nonblank ?? null,
    });
  }

  const posture = sourcePostureForPath(repoPath, promotionEvidence);
  if (posture.classification === 'ambiguous_or_blocked') {
    blockers.push({
      check: 'source_posture_ambiguous_or_blocked',
      source_path: repoPath,
      evidence: posture.evidence,
    });
  }

  return {
    source_path: repoPath,
    ...(meta || {}),
    byte_size: stat.size,
    sha256: fileSha256(filePath),
    pdf_signature: signature,
    parser: {
      engine: 'pdfjs-dist',
      parse_success: Boolean(inspection.parse_success),
      page_count: Number.isInteger(pageCount) && pageCount > 0 ? pageCount : null,
      error: inspection.parse_error || null,
    },
    first_page_identity: firstPageIdentity,
    render_sanity: renderSanity,
    source_posture: posture,
    status: blockers.length === 0 ? 'pass' : 'blocked',
    blockers,
  };
}

export async function build9702SourceTruthInventory({
  rootDir = ROOT,
  generatedOn = DEFAULTS.generatedOn,
  sourceRoot = DEFAULTS.sourceRoot,
  manifestRoot = DEFAULTS.manifestRoot,
  promotionJson = DEFAULTS.promotionJson,
  sourceGapReport = DEFAULTS.sourceGapReport,
  candidateDownloadReport = DEFAULTS.candidateDownloadReport,
  promotionReport = DEFAULTS.promotionReport,
  trackedSourcePaths = null,
  inspectPdf = inspectPdfWithPdfjsRender,
  renderScale = DEFAULTS.renderScale,
  renderAllPages = false,
} = {}) {
  const discoveredPaths = trackedSourcePaths
    ? [...trackedSourcePaths].map(toPosix)
    : discoverTrackedSourcePaths(rootDir, sourceRoot);
  const duplicatePaths = discoveredPaths.filter((sourcePath, index) => discoveredPaths.indexOf(sourcePath) !== index);
  const uniquePaths = uniqueSorted(discoveredPaths);
  const promotionEvidence = loadPromotionRows(rootDir, promotionJson);
  const manifestPaths = list9702ManifestPaths(rootDir, manifestRoot);
  const rootExists = fs.existsSync(resolveFromRoot(rootDir, sourceRoot));

  const records = [];
  for (const repoPath of uniquePaths) {
    records.push(await buildRecord({
      rootDir,
      repoPath,
      promotionEvidence,
      inspectPdf,
      renderScale,
      renderAllPages,
    }));
  }

  const blockers = [];
  if (!rootExists) {
    blockers.push({ check: 'source_root_missing', source_root: sourceRoot });
  }
  for (const sourcePath of uniqueSorted(duplicatePaths)) {
    blockers.push({ check: 'duplicate_tracked_source_path', source_path: sourcePath });
  }
  for (const record of records) {
    blockers.push(...(record.blockers || []));
  }

  const postureCounts = Object.fromEntries(POSTURE_KEYS.map((key) => [key, 0]));
  for (const record of records) {
    const key = record.source_posture?.classification || 'ambiguous_or_blocked';
    postureCounts[key] = (postureCounts[key] || 0) + 1;
  }

  const pageCountTotal = records.reduce((sum, record) => sum + Number(record.parser?.page_count || 0), 0);
  const summary = {
    tracked_source_pdf_count: discoveredPaths.length,
    represented_once_count: uniquePaths.length,
    source_root_exists: rootExists,
    by_paper: sortedObject(countBy(records, (record) => record.paper || 'unparsed')),
    by_session: sortedObject(countBy(records, (record) => record.session_id || 'unparsed')),
    by_year: sortedObject(countBy(records, (record) => record.year || 'unparsed')),
    by_component: sortedObject(countBy(records, (record) => record.component_id || 'unparsed')),
    page_count_total: pageCountTotal,
    byte_size_total: records.reduce((sum, record) => sum + Number(record.byte_size || 0), 0),
    pdf_signature_pass_count: records.filter((record) => record.pdf_signature?.starts_with_pdf_signature).length,
    pdfjs_parse_success_count: records.filter((record) => record.parser?.parse_success).length,
    page_count_present_count: records.filter((record) => Number.isInteger(record.parser?.page_count) && record.parser.page_count > 0).length,
    first_page_identity_pass_count: records.filter((record) => (
      record.first_page_identity?.status === 'pass' ||
      record.first_page_identity?.status === 'not_checked_text_layer_unavailable'
    )).length,
    render_sanity_pass_count: records.filter((record) => record.render_sanity?.status === 'pass').length,
    blocker_count: blockers.length,
    production_ready_claimed: false,
  };

  return {
    schema_version: '9702_source_truth_inventory_v1',
    generated_on: generatedOn,
    subject_code: '9702',
    status: blockers.length === 0 ? 'pass' : 'blocked',
    production_ready_claimed: false,
    boundary: {
      source_truth_inventory_only: true,
      row_surface_truth_claimed: false,
      accepted_question_rows_created: false,
      page_chain_extraction_run: false,
      crop_generation_run: false,
      vlm_or_ocr_run: false,
      db_import_run: false,
      search_gate_run: false,
      release_preflight_run: false,
      production_ready_status_update_run: false,
      production_ready_claimed: false,
    },
    inputs: {
      source_root: sourceRoot,
      source_gap_report: sourceGapReport,
      candidate_download_report: candidateDownloadReport,
      promotion_report: promotionReport,
      promotion_json: promotionJson,
      promotion_json_exists: promotionEvidence.exists,
      render_engine: 'pdfjs-dist + @napi-rs/canvas',
      render_scale: renderScale,
      render_mode: renderAllPages ? 'all_pages' : 'representative',
      tracked_source_discovery: trackedSourcePaths ? 'injected_tracked_source_paths' : 'git ls-files data/past-papers/9702Physics/**/9702_*_qp_*.pdf',
    },
    row_surface_truth: {
      manifest_root: manifestRoot,
      manifest_pattern_checked: `${manifestRoot}/9702*.json`,
      manifest_paths: manifestPaths,
      manifest_count: manifestPaths.length,
      row_surface_truth_present: manifestPaths.length > 0,
      separation_statement: 'Source PDF truth is separated from row-surface/page-chain truth; this inventory does not create or accept 9702 question rows.',
    },
    source_posture: {
      classification_counts: sortedObject(postureCounts),
      promoted_public_mirror_candidate_count: postureCounts.public_mirror_candidate_promoted_2026_06_02,
      historical_repo_source_count: postureCounts.historical_repo_source,
      official_restricted_or_user_supplied_count: postureCounts.official_restricted_or_user_supplied,
      ambiguous_or_blocked_count: postureCounts.ambiguous_or_blocked,
      promotion_evidence: {
        artifact: promotionEvidence.artifact,
        exists: promotionEvidence.exists,
        source_posture: promotionEvidence.source_posture,
        subject_9702_row_count: promotionEvidence.subject_9702_row_count,
      },
    },
    summary,
    records,
    blockers,
  };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell)).join(' | ')} |`),
  ].join('\n');
}

function countRows(objectLike) {
  return Object.entries(objectLike || {}).map(([key, value]) => [`\`${key}\``, value]);
}

export function render9702SourceTruthInventoryMarkdown(inventory) {
  const s = inventory.summary;
  const artifacts = inventory.artifacts || {
    json: DEFAULTS.jsonOut,
    markdown: DEFAULTS.markdownOut,
    helper_script: 'scripts/learning/build_9702_source_truth_inventory.js',
  };
  const lines = [
    '# 9702 source truth inventory',
    '',
    `Date: ${inventory.generated_on}`,
    '',
    '## Verdict',
    '',
    `Status: \`${inventory.status}\``,
    '',
    `production_ready_claimed=false`,
    '',
    'This is a source-truth inventory and source-posture gate for Cambridge 9702 Physics question-paper PDFs only.',
    'No page-chain extraction, VLM/OCR, DB import, search gate, release preflight, or production-ready status update was run.',
    'Source truth is separate from row-surface truth: no accepted 9702 question rows are created by this report.',
    '',
    '## Summary',
    '',
    markdownTable(['Metric', 'Value'], [
      ['tracked source PDFs', s.tracked_source_pdf_count],
      ['represented once', s.represented_once_count],
      ['PDF signature pass', s.pdf_signature_pass_count],
      ['pdfjs parse success', s.pdfjs_parse_success_count],
      ['page count present', s.page_count_present_count],
      ['render sanity pass', s.render_sanity_pass_count],
      ['first-page identity pass or text-layer unavailable', s.first_page_identity_pass_count],
      ['total pages', s.page_count_total],
      ['blockers', s.blocker_count],
    ]),
    '',
    '## Counts By Paper',
    '',
    markdownTable(['Paper', 'Tracked QP PDFs'], countRows(s.by_paper)),
    '',
    '## Counts By Session',
    '',
    markdownTable(['Session', 'Tracked QP PDFs'], countRows(s.by_session)),
    '',
    '## Counts By Year',
    '',
    markdownTable(['Year', 'Tracked QP PDFs'], countRows(s.by_year)),
    '',
    '## Counts By Component',
    '',
    markdownTable(['Component', 'Tracked QP PDFs'], countRows(s.by_component)),
    '',
    '## Source Posture',
    '',
    markdownTable(['Classification', 'PDFs'], countRows(inventory.source_posture.classification_counts)),
    '',
    '- Historical repo source means a tracked 9702 PDF was not listed in the 2026-06-02 public-mirror promotion evidence.',
    '- Public mirror candidate promoted on 2026-06-02 means the tracked path is listed as a verified 9702 row in the promotion JSON.',
    '- No official restricted/user-supplied evidence was found in the re-read inputs for this phase.',
    '',
    '## Row-Surface Separation',
    '',
    markdownTable(['Check', 'Value'], [
      ['manifest pattern checked', `\`${inventory.row_surface_truth.manifest_pattern_checked}\``],
      ['9702 manifest count', inventory.row_surface_truth.manifest_count],
      ['row-surface truth present', `\`${inventory.row_surface_truth.row_surface_truth_present}\``],
    ]),
    '',
    inventory.row_surface_truth.manifest_paths.length > 0
      ? markdownTable(['9702 manifest paths found'], inventory.row_surface_truth.manifest_paths.map((item) => [`\`${item}\``]))
      : 'No `data/manifests/9702*.json` files were found.',
    '',
    '## Render And Identity Evidence',
    '',
    `Every represented source PDF has byte size, SHA256, %PDF- signature evidence, pdfjs parse status, page count, first-page identity status, and ${inventory.inputs.render_mode} render sanity evidence in the JSON inventory.`,
    '',
    '## Blockers',
    '',
  ];

  if (inventory.blockers.length === 0) {
    lines.push('Blocker count: `0`.');
  } else {
    lines.push(markdownTable(['Check', 'Source Path', 'Reason'], inventory.blockers.map((blocker) => [
      `\`${blocker.check}\``,
      blocker.source_path ? `\`${blocker.source_path}\`` : '',
      blocker.reason || blocker.error || '',
    ])));
  }

  lines.push(
    '',
    '## Artifacts',
    '',
    `- Machine inventory: \`${artifacts.json}\``,
    `- Markdown report: \`${artifacts.markdown}\``,
    `- Helper script: \`${artifacts.helper_script}\``,
    '',
    '## Explicit Non-Steps',
    '',
    '- Page-chain extraction: not run.',
    '- Crop generation: not run.',
    '- VLM/OCR: not run.',
    '- DB import or production DB writes: not run.',
    '- Search/read-model/RAG gate: not run.',
    '- Release preflight: not run.',
    '- Production-ready status update: not run.',
  );

  return `${lines.join('\n')}\n`;
}

export function write9702SourceTruthInventoryOutputs({
  rootDir = ROOT,
  inventory,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
} = {}) {
  inventory.artifacts = {
    json: jsonOut,
    markdown: markdownOut,
    helper_script: 'scripts/learning/build_9702_source_truth_inventory.js',
  };
  const markdown = render9702SourceTruthInventoryMarkdown(inventory);
  writeJsonFile(rootDir, jsonOut, inventory);
  writeTextFile(rootDir, markdownOut, markdown);
  return {
    json: jsonOut,
    markdown: markdownOut,
  };
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    printUsage();
    return;
  }

  const inventory = await build9702SourceTruthInventory({
    rootDir: ROOT,
    generatedOn: options.generatedOn,
    sourceRoot: options.sourceRoot,
    manifestRoot: options.manifestRoot,
    promotionJson: options.promotionJson,
    trackedSourcePaths: null,
    renderScale: options.renderScale,
    renderAllPages: options.renderAllPages,
  });

  if (options.writeArtifacts) {
    write9702SourceTruthInventoryOutputs({
      rootDir: ROOT,
      inventory,
      jsonOut: options.jsonOut,
      markdownOut: options.markdownOut,
    });
  }

  writeStdoutLine(`status: ${inventory.status}`);
  writeStdoutLine(`tracked_source_pdf_count: ${inventory.summary.tracked_source_pdf_count}`);
  writeStdoutLine(`represented_once_count: ${inventory.summary.represented_once_count}`);
  writeStdoutLine(`pdf_signature_pass_count: ${inventory.summary.pdf_signature_pass_count}`);
  writeStdoutLine(`pdfjs_parse_success_count: ${inventory.summary.pdfjs_parse_success_count}`);
  writeStdoutLine(`render_sanity_pass_count: ${inventory.summary.render_sanity_pass_count}`);
  writeStdoutLine(`first_page_identity_pass_count: ${inventory.summary.first_page_identity_pass_count}`);
  writeStdoutLine(`row_surface_manifest_count: ${inventory.row_surface_truth.manifest_count}`);
  writeStdoutLine(`blocker_count: ${inventory.summary.blocker_count}`);
  writeStdoutLine(`production_ready_claimed: ${inventory.production_ready_claimed}`);

  if (inventory.status !== 'pass') {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    fs.writeSync(2, `${error.stack || error.message || String(error)}\n`);
    process.exitCode = 1;
  });
}
