#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const RED_PIXEL_RULE = 'r > 150 && g < 110 && b < 110';
const DEFAULT_GENERATED_ON = '2026-06-06';
const DEFAULT_FREEZE_MANIFEST = 'data/manifests/9231_wm_source_freeze_2026_06_05_manifest_v1.json';

function defaultsForDate(generatedOn) {
  const dateToken = generatedOn.replaceAll('-', '_');
  return {
    generatedOn,
    freezeManifest: DEFAULT_FREEZE_MANIFEST,
    candidateDir: `tmp/9231_source_candidates/${generatedOn}`,
    manifestOut: `data/manifests/9231_wm_source_remediation_${dateToken}_manifest_v1.json`,
    jsonOut: `docs/reports/${generatedOn}-9231-wm-source-remediation-gate.json`,
    markdownOut: `docs/reports/${generatedOn}-9231-wm-source-remediation-gate.md`,
  };
}

function toPosix(value) {
  return String(value || '').replace(/\\/g, '/');
}

function resolveFromRoot(rootDir, repoPath) {
  return path.isAbsolute(repoPath) ? repoPath : path.resolve(rootDir, repoPath);
}

function displayPath(rootDir, filePath) {
  const resolved = resolveFromRoot(rootDir, filePath);
  const relative = path.relative(rootDir, resolved);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
    ? toPosix(relative)
    : toPosix(resolved);
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

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function pdfSignatureStatus(filePath) {
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

function unique(values) {
  return [...new Set(values)];
}

function sortedObject(objectLike) {
  return Object.fromEntries(Object.entries(objectLike || {}).sort(([left], [right]) => left.localeCompare(right)));
}

function parseTargetSourcePdf(sourcePdf) {
  const match = path.basename(sourcePdf).match(/^WM_9231_([sw]\d{2})_qp_(\d{2})\.pdf$/);
  if (!match) {
    throw new Error(`Unsupported 9231 WM source PDF name: ${sourcePdf}`);
  }
  const [, series, paperId] = match;
  const session = series.startsWith('s') ? 'summer' : 'winter';
  const year = `20${series.slice(1)}`;
  return {
    series,
    paper_id: paperId,
    session,
    year,
    clean_stem: `9231_${series}_qp_${paperId}`,
    expected_text: series.startsWith('s')
      ? `9231/${paperId}/M/J/${series.slice(1)}`
      : `9231/${paperId}/O/N/${series.slice(1)}`,
  };
}

function candidateNames(meta) {
  return [
    `${meta.clean_stem}.qualifiedquest.pdf`,
    `${meta.clean_stem}.pdf`,
  ];
}

function qualifiedQuestUrl(meta) {
  return `https://qualifiedquest.com/papers/a-level/mathematics-further-9231/${meta.year}/${meta.clean_stem}.pdf`;
}

function candidatePathForSource(rootDir, candidateDir, meta) {
  const dir = resolveFromRoot(rootDir, candidateDir);
  for (const name of candidateNames(meta)) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.join(dir, candidateNames(meta)[0]);
}

function normalizeRedPixelSummary(summary, pageCount) {
  return {
    scale: summary?.scale ?? 1.5,
    red_pixel_rule: RED_PIXEL_RULE,
    sum_red_pixels: summary?.sum_red_pixels ?? summary?.sumRedPixels ?? 0,
    max_red_pixels: summary?.max_red_pixels ?? summary?.maxRedPixels ?? 0,
    positive_red_pages: summary?.positive_red_pages ?? summary?.positiveRedPages ?? 0,
    total_pages_rendered: summary?.total_pages_rendered ?? summary?.totalPagesRendered ?? pageCount,
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

export async function inspectPdfWithRenderedRedPixelGate(filePath, {
  pdfjsModule = null,
  canvasModule = null,
  scale = 1.5,
} = {}) {
  const pdfjs = pdfjsModule || await loadPdfjs();
  const canvas = canvasModule || await loadCanvas();
  if (canvas.DOMMatrix && !globalThis.DOMMatrix) {
    globalThis.DOMMatrix = canvas.DOMMatrix;
  }
  if (canvas.ImageData && !globalThis.ImageData) {
    globalThis.ImageData = canvas.ImageData;
  }
  if (canvas.Path2D && !globalThis.Path2D) {
    globalThis.Path2D = canvas.Path2D;
  }

  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await pdfjs.getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false,
    isEvalSupported: false,
  }).promise;

  let title = null;
  let firstPageTextSample = '';
  let sumRedPixels = 0;
  let maxRedPixels = 0;
  let positiveRedPages = 0;

  try {
    try {
      const metadata = await pdf.getMetadata();
      title = metadata?.info?.Title || null;
    } catch {
      title = null;
    }

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      if (pageNumber === 1) {
        const textContent = await page.getTextContent();
        firstPageTextSample = (textContent.items || [])
          .map((item) => String(item?.str || '').trim())
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .slice(0, 220);
      }

      const viewport = page.getViewport({ scale });
      const renderCanvas = canvas.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const canvasContext = renderCanvas.getContext('2d');
      await page.render({ canvasContext, viewport }).promise;
      const image = canvasContext.getImageData(0, 0, renderCanvas.width, renderCanvas.height);
      const bytes = image.data;
      let pageRedPixels = 0;
      for (let index = 0; index < bytes.length; index += 4) {
        const r = bytes[index];
        const g = bytes[index + 1];
        const b = bytes[index + 2];
        if (r > 150 && g < 110 && b < 110) {
          pageRedPixels += 1;
        }
      }
      sumRedPixels += pageRedPixels;
      maxRedPixels = Math.max(maxRedPixels, pageRedPixels);
      if (pageRedPixels > 0) {
        positiveRedPages += 1;
      }
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }

  return {
    page_count: pdf.numPages,
    title,
    first_page_text_sample: firstPageTextSample,
    red_pixel_summary: {
      scale,
      red_pixel_rule: RED_PIXEL_RULE,
      sum_red_pixels: sumRedPixels,
      max_red_pixels: maxRedPixels,
      positive_red_pages: positiveRedPages,
      total_pages_rendered: pdf.numPages,
    },
  };
}

async function collectPdfEvidence({ rootDir, repoPath, inspectPdf }) {
  const resolved = resolveFromRoot(rootDir, repoPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`PDF not found: ${repoPath}`);
  }
  const stat = fs.statSync(resolved);
  const inspection = await inspectPdf(resolved);
  const pageCount = inspection.page_count ?? inspection.pages ?? null;
  return {
    file: displayPath(rootDir, repoPath),
    bytes: stat.size,
    sha256: sha256(resolved),
    pdf_signature_status: pdfSignatureStatus(resolved),
    page_count: pageCount,
    title: inspection.title || null,
    first_page_text_sample: inspection.first_page_text_sample || inspection.firstPageTextSample || '',
    red_pixel_summary: normalizeRedPixelSummary(inspection.red_pixel_summary, pageCount),
  };
}

function identityPass(evidence, meta) {
  const haystack = `${evidence.title || ''} ${evidence.first_page_text_sample || ''}`;
  return haystack.includes(meta.expected_text) || haystack.includes(`FURTHER MATHEMATICS 9231/${meta.paper_id}`);
}

function signaturePass(evidence) {
  return Boolean(
    evidence.pdf_signature_status?.starts_with_pdf_signature &&
    evidence.pdf_signature_status?.eof_marker_present,
  );
}

function redClean(evidence) {
  return evidence.red_pixel_summary.sum_red_pixels === 0 &&
    evidence.red_pixel_summary.positive_red_pages === 0;
}

function createStopError(stopConditions, records) {
  const error = new Error(`9231 WM source remediation stop conditions: ${unique(stopConditions).join(', ')}`);
  error.code = '9231_WM_SOURCE_REMEDIATION_STOP';
  error.stop_conditions = unique(stopConditions);
  error.records = records;
  return error;
}

function buildManifest(result) {
  return {
    schema_version: '9231_wm_source_remediation_manifest_v1',
    manifest_id: `9231_wm_source_remediation_${result.generated_on.replaceAll('-', '_')}_manifest_v1`,
    generated_on: result.generated_on,
    subject_code: '9231',
    source_freeze_manifest: result.inputs.source_freeze_manifest,
    source_remediation_status: result.gate_status === 'pass'
      ? 'unfrozen_by_machine_source_remediation_gate'
      : 'blocked_by_source_remediation_gate',
    summary: result.summary,
    affected_shards: result.affected_shards,
    records: result.records,
  };
}

export async function build9231WmSourceRemediationGate({
  rootDir = ROOT,
  generatedOn = DEFAULT_GENERATED_ON,
  freezeManifest = DEFAULT_FREEZE_MANIFEST,
  candidateDir = defaultsForDate(generatedOn).candidateDir,
  replace = false,
  inspectPdf = inspectPdfWithRenderedRedPixelGate,
} = {}) {
  const freeze = readJson(rootDir, freezeManifest);
  const affectedSourcePdfs = Object.keys(freeze.affected_source_pdfs || {}).sort();
  const stopConditions = [];
  const records = [];

  for (const sourcePdf of affectedSourcePdfs) {
    const meta = parseTargetSourcePdf(sourcePdf);
    const candidatePath = candidatePathForSource(rootDir, candidateDir, meta);
    if (!fs.existsSync(candidatePath)) {
      stopConditions.push('candidate_pdf_missing');
      records.push({
        source_pdf: sourcePdf,
        candidate: {
          expected_local_path: displayPath(rootDir, candidatePath),
          provenance: 'QualifiedQuest public past-paper mirror',
          source_url: qualifiedQuestUrl(meta),
          disposition: 'missing',
        },
      });
      continue;
    }

    const before = await collectPdfEvidence({ rootDir, repoPath: sourcePdf, inspectPdf });
    const candidate = await collectPdfEvidence({ rootDir, repoPath: candidatePath, inspectPdf });
    const candidateIdentityPass = identityPass(candidate, meta);
    const candidateRedClean = redClean(candidate);
    const candidateSignaturePass = signaturePass(candidate);
    const pageCountMatches = before.page_count === candidate.page_count;
    const replacementNeeded = !redClean(before) || before.sha256 !== candidate.sha256;

    if (!candidateSignaturePass) {
      stopConditions.push('candidate_pdf_signature_failed');
    }
    if (!pageCountMatches) {
      stopConditions.push('candidate_page_count_mismatch');
    }
    if (!candidateIdentityPass) {
      stopConditions.push('candidate_identity_ambiguous');
    }
    if (!candidateRedClean) {
      stopConditions.push('candidate_red_pixel_blocker');
    }

    const baseRecord = {
      source_pdf: sourcePdf,
      frozen_row_count: freeze.affected_source_pdfs[sourcePdf],
      affected_shards: unique((freeze.items || [])
        .filter((item) => item.source_pdf === sourcePdf)
        .map((item) => item.shard_id))
        .sort(),
      expected_identity_text: meta.expected_text,
      before,
      candidate: {
        ...candidate,
        local_path: displayPath(rootDir, candidatePath),
        provenance: 'QualifiedQuest public past-paper mirror',
        source_url: qualifiedQuestUrl(meta),
        identity_pass: candidateIdentityPass,
        red_clean: candidateRedClean,
        page_count_matches_before: pageCountMatches,
        disposition: candidateSignaturePass && pageCountMatches && candidateIdentityPass && candidateRedClean
          ? 'selected_clean_replacement'
          : 'rejected_stop_condition',
      },
      replacement: {
        replace_requested: replace,
        replacement_needed: replacementNeeded,
        action: 'not_attempted',
      },
    };

    if (stopConditions.length > 0 && baseRecord.candidate.disposition === 'rejected_stop_condition') {
      records.push(baseRecord);
      continue;
    }

    if (replace && replacementNeeded) {
      fs.copyFileSync(candidatePath, resolveFromRoot(rootDir, sourcePdf));
      baseRecord.replacement.action = 'replaced_bytes_in_place';
    } else if (replacementNeeded) {
      baseRecord.replacement.action = 'replacement_required_not_requested';
      stopConditions.push('replacement_needed_but_not_requested');
    } else {
      baseRecord.replacement.action = 'current_bytes_already_clean';
      baseRecord.candidate.disposition = 'verified_not_applied_current_clean';
    }

    const after = await collectPdfEvidence({ rootDir, repoPath: sourcePdf, inspectPdf });
    baseRecord.after = after;
    baseRecord.after_identity_pass = identityPass(after, meta);
    baseRecord.after_red_clean = redClean(after);
    baseRecord.after_page_count_matches_before = after.page_count === before.page_count;
    baseRecord.after_sha_matches_candidate = after.sha256 === candidate.sha256;

    if (!signaturePass(after)) {
      stopConditions.push('after_pdf_signature_failed');
    }
    if (!baseRecord.after_identity_pass) {
      stopConditions.push('after_identity_ambiguous');
    }
    if (!baseRecord.after_red_clean) {
      stopConditions.push('after_red_pixel_blocker');
    }
    if (!baseRecord.after_page_count_matches_before) {
      stopConditions.push('after_page_count_mismatch');
    }
    if (replace && baseRecord.replacement.action === 'replaced_bytes_in_place' && !baseRecord.after_sha_matches_candidate) {
      stopConditions.push('after_sha_mismatch_candidate');
    }
    records.push(baseRecord);
  }

  if (stopConditions.length > 0) {
    throw createStopError(stopConditions, records);
  }

  const replacedCount = records.filter((record) => record.replacement.action === 'replaced_bytes_in_place').length;
  const verifiedOrReplacedCount = records.filter((record) => (
    record.after &&
    signaturePass(record.after) &&
    record.after_identity_pass &&
    record.after_red_clean &&
    record.after_page_count_matches_before
  )).length;
  const redPixelGatePassCount = records.filter((record) => record.after_red_clean).length;
  const provenancePassCount = records.filter((record) => record.candidate.provenance && record.candidate.source_url).length;
  const pageCountMatchCount = records.filter((record) => record.after_page_count_matches_before).length;
  const pdfSignaturePassCount = records.filter((record) => signaturePass(record.before) && signaturePass(record.after)).length;
  const totalBeforeRedPixels = records.reduce((sum, record) => sum + record.before.red_pixel_summary.sum_red_pixels, 0);
  const totalAfterRedPixels = records.reduce((sum, record) => sum + record.after.red_pixel_summary.sum_red_pixels, 0);
  const expectedTargetSourcePdfCount = freeze.summary?.frozen_source_pdf_count || 18;
  const gatePass = affectedSourcePdfs.length === expectedTargetSourcePdfCount &&
    verifiedOrReplacedCount === affectedSourcePdfs.length &&
    redPixelGatePassCount === affectedSourcePdfs.length &&
    provenancePassCount === affectedSourcePdfs.length &&
    pageCountMatchCount === affectedSourcePdfs.length &&
    pdfSignaturePassCount === affectedSourcePdfs.length &&
    totalAfterRedPixels === 0;

  const result = {
    schema_version: '9231_wm_source_remediation_gate_v1',
    generated_on: generatedOn,
    subject_code: '9231',
    gate_status: gatePass ? 'pass' : 'blocked',
    boundary: {
      source_pdf_bytes_only: true,
      tracked_wm_paths_preserved: true,
      red_pixel_rule: RED_PIXEL_RULE,
      renderer: 'pdfjs-dist + @napi-rs/canvas',
      render_scale: 1.5,
      crop_visual_text_or_production_work_run: false,
      production_ready_claimed: false,
      question_plain_text_v1_or_v2_claimed: false,
      db_search_rag_consumption_claimed: false,
    },
    inputs: {
      source_freeze_manifest: freezeManifest,
      source_freeze_report: 'docs/reports/2026-06-05-9231-wm-source-freeze-gate.md',
      candidate_dir: displayPath(rootDir, candidateDir),
      replace_requested: replace,
    },
    summary: {
      target_source_pdf_count: affectedSourcePdfs.length,
      expected_target_source_pdf_count: expectedTargetSourcePdfCount,
      verified_or_replaced_count: verifiedOrReplacedCount,
      replaced_count: replacedCount,
      current_bytes_already_clean_count: records.length - replacedCount,
      red_pixel_gate_pass_count: redPixelGatePassCount,
      provenance_pass_count: provenancePassCount,
      page_count_match_count: pageCountMatchCount,
      pdf_signature_pass_count: pdfSignaturePassCount,
      total_before_red_pixels: totalBeforeRedPixels,
      total_after_red_pixels: totalAfterRedPixels,
      affected_frozen_rows: Object.values(freeze.affected_source_pdfs || {}).reduce((sum, count) => sum + count, 0),
      affected_shard_count: Object.keys(freeze.affected_shards || {}).length,
      freeze_posture_lifted_by_machine_gate: gatePass,
      production_ready_claimed: false,
      db_search_rag_consumption_claimed: false,
    },
    affected_shards: sortedObject(freeze.affected_shards),
    records,
  };
  return {
    ...result,
    remediation_manifest: buildManifest(result),
  };
}

export function render9231WmSourceRemediationMarkdown(result) {
  const summary = result.summary;
  const lines = [
    '# 9231 WM Source Remediation Gate',
    '',
    `- generated_on: \`${result.generated_on}\``,
    `- gate_status: \`${result.gate_status}\``,
    `- Freeze posture lifted by machine gate: \`${summary.freeze_posture_lifted_by_machine_gate}\``,
    '- Tracked `WM_*.pdf` paths were preserved; only source PDF bytes were eligible for replacement.',
    '- DB/search/RAG consumption claimed: false.',
    '- No crop, visual, text, authority, DB, search, RAG, or release work was run.',
    '',
    '## Gate Counts',
    '',
    '| metric | value |',
    '| --- | ---: |',
    `| target source PDFs | ${summary.target_source_pdf_count} |`,
    `| verified or replaced source PDFs | ${summary.verified_or_replaced_count} |`,
    `| replaced source PDFs | ${summary.replaced_count} |`,
    `| red-pixel gate passes | ${summary.red_pixel_gate_pass_count} |`,
    `| provenance records | ${summary.provenance_pass_count} |`,
    `| page-count matches | ${summary.page_count_match_count} |`,
    `| PDF signature passes | ${summary.pdf_signature_pass_count} |`,
    `| affected frozen rows | ${summary.affected_frozen_rows} |`,
    `| affected shards | ${summary.affected_shard_count} |`,
    `| before red pixels | ${summary.total_before_red_pixels} |`,
    `| after red pixels | ${summary.total_after_red_pixels} |`,
    '',
    '## Render Gate',
    '',
    `- renderer: \`${result.boundary.renderer}\``,
    `- scale: \`${result.boundary.render_scale}\``,
    `- red pixel rule: \`${result.boundary.red_pixel_rule}\``,
    '',
    '## Affected Shards',
    '',
    '| shard | frozen rows |',
    '| --- | ---: |',
  ];

  for (const [shardId, rows] of Object.entries(result.affected_shards || {})) {
    lines.push(`| \`${shardId}\` | ${rows} |`);
  }

  lines.push(
    '',
    '## Source Replacement Matrix',
    '',
    '| source PDF | before SHA256 | after SHA256 | bytes before | bytes after | pages | before red pixels | after red pixels | action | provenance |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |',
  );

  for (const record of result.records) {
    lines.push([
      `| \`${record.source_pdf}\``,
      `\`${record.before.sha256}\``,
      `\`${record.after.sha256}\``,
      record.before.bytes,
      record.after.bytes,
      record.after.page_count,
      record.before.red_pixel_summary.sum_red_pixels,
      record.after.red_pixel_summary.sum_red_pixels,
      `\`${record.replacement.action}\``,
      `[QualifiedQuest](${record.candidate.source_url}) |`,
    ].join(' | '));
  }

  lines.push(
    '',
    '## Artifacts',
    '',
    `- source freeze manifest: \`${result.inputs.source_freeze_manifest}\``,
    `- source freeze report: \`${result.inputs.source_freeze_report}\``,
    '',
    '## Boundary',
    '',
    '- This gate only proves clean source PDF bytes at the 18 tracked paths listed by the freeze gate.',
    '- Downstream crop, visual review, question text, authority, DB, search, RAG, and release gates remain separate work.',
  );
  return `${lines.join('\n')}\n`;
}

export function write9231WmSourceRemediationOutputs(result, {
  rootDir = ROOT,
  manifestOut = defaultsForDate(result.generated_on).manifestOut,
  jsonOut = defaultsForDate(result.generated_on).jsonOut,
  markdownOut = defaultsForDate(result.generated_on).markdownOut,
} = {}) {
  writeJson(rootDir, manifestOut, result.remediation_manifest || buildManifest(result));
  writeJson(rootDir, jsonOut, {
    ...result,
    remediation_manifest: undefined,
  });
  writeText(rootDir, markdownOut, render9231WmSourceRemediationMarkdown(result));
  return { manifestOut, jsonOut, markdownOut };
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--replace') {
      parsed.replace = true;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      parsed[key] = argv[index + 1];
      index += 1;
    }
  }
  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedOn = args.generatedOn || DEFAULT_GENERATED_ON;
  const defaults = defaultsForDate(generatedOn);
  const result = await build9231WmSourceRemediationGate({
    rootDir: args.rootDir || ROOT,
    generatedOn,
    freezeManifest: args.freezeManifest || defaults.freezeManifest,
    candidateDir: args.candidateDir || defaults.candidateDir,
    replace: Boolean(args.replace),
  });
  const artifacts = write9231WmSourceRemediationOutputs(result, {
    rootDir: args.rootDir || ROOT,
    manifestOut: args.manifestOut || defaults.manifestOut,
    jsonOut: args.jsonOut || defaults.jsonOut,
    markdownOut: args.markdownOut || defaults.markdownOut,
  });
  console.log(JSON.stringify({
    gate_status: result.gate_status,
    summary: result.summary,
    artifacts,
  }, null, 2));
}

if (process.argv[1] === __filename) {
  main().catch((error) => {
    const payload = {
      gate_status: 'blocked',
      code: error.code || '9231_WM_SOURCE_REMEDIATION_ERROR',
      message: error.message,
      stop_conditions: error.stop_conditions || [],
    };
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  });
}
