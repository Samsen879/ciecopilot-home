#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const DEFAULTS = Object.freeze({
  subject: '9231',
  generatedOn: '2026-06-04',
  questionPaperRoot: 'data/past-papers/9231Further-Mathematics',
  markSchemeRoot: 'data/mark-schemes/9231Further-Mathematics',
  manifestRoot: 'data/manifests',
  reportsRoot: 'docs/reports',
  evidenceProductionRoot: 'data/evidence/production',
  evalRoot: 'data/eval',
  jsonOut: 'docs/reports/2026-06-04-9231-question-text-foundation-inventory.json',
  markdownOut: 'docs/reports/2026-06-04-9231-question-text-foundation-inventory.md',
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

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    ...DEFAULTS,
    help: false,
    inspectPdfTextLayer: false,
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
    if (token === '--mark-scheme-root') {
      options.markSchemeRoot = requiredValue(argv, index, token);
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
    if (token === '--inspect-pdf-text-layer') {
      options.inspectPdfTextLayer = true;
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
    'Usage: node scripts/learning/build_9231_question_text_foundation_inventory.js',
    '  [--generated-on <YYYY-MM-DD>]',
    '  [--inspect-pdf-text-layer]',
    '  [--workflow-gap <text>]',
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

function parseQuestionPaperMeta(fileName, subject = DEFAULTS.subject) {
  const pattern = new RegExp(`^(?:WM_)?${subject}_([msw])(\\d{2})_qp_(\\d)(\\d)\\.pdf$`, 'i');
  const match = pattern.exec(fileName);
  if (!match) {
    return null;
  }
  return {
    session: `${match[1].toLowerCase()}${match[2]}`,
    paper: `p${match[3]}`,
    paper_number: Number.parseInt(match[3], 10),
    variant: Number.parseInt(match[4], 10),
  };
}

function parseMarkSchemeMeta(fileName, subject = DEFAULTS.subject) {
  const pattern = new RegExp(`^(?:WM_)?${subject}_([msw])(\\d{2})_ms_(\\d)(\\d)\\.pdf$`, 'i');
  const match = pattern.exec(fileName);
  if (!match) {
    return null;
  }
  return {
    session: `${match[1].toLowerCase()}${match[2]}`,
    paper: `p${match[3]}`,
    paper_number: Number.parseInt(match[3], 10),
    variant: Number.parseInt(match[4], 10),
  };
}

function isGradeThreshold(fileName, subject = DEFAULTS.subject) {
  return new RegExp(`^(?:WM_)?${subject}_[msw]\\d{2}_gt\\.pdf$`, 'i').test(fileName);
}

function scanQuestionPapers({ rootDir, subject, questionPaperRoot }) {
  const entries = listFilesRecursive(rootDir, questionPaperRoot, { extensions: ['.pdf'] })
    .map((filePath) => {
      const repoPath = toRepoPath(rootDir, filePath);
      const fileName = path.basename(filePath);
      const meta = parseQuestionPaperMeta(fileName, subject);
      return {
        path: repoPath,
        file_name: fileName,
        recognized_question_paper: Boolean(meta),
        ...(meta || {}),
      };
    });
  const questionPapers = entries.filter((entry) => entry.recognized_question_paper);

  return {
    root: questionPaperRoot,
    exists: fs.existsSync(resolveFromRoot(rootDir, questionPaperRoot)),
    total_pdf_count: entries.length,
    question_paper_pdf_count: questionPapers.length,
    by_paper: countBy(questionPapers, (entry) => entry.paper),
    by_session: countBy(questionPapers, (entry) => entry.session),
    samples: questionPapers.slice(0, 10).map((entry) => entry.path),
    rows: questionPapers,
  };
}

function scanMarkSchemes({ rootDir, subject, markSchemeRoot }) {
  const entries = listFilesRecursive(rootDir, markSchemeRoot, { extensions: ['.pdf'] })
    .map((filePath) => {
      const repoPath = toRepoPath(rootDir, filePath);
      const fileName = path.basename(filePath);
      const meta = parseMarkSchemeMeta(fileName, subject);
      return {
        path: repoPath,
        file_name: fileName,
        recognized_mark_scheme: Boolean(meta),
        grade_threshold: isGradeThreshold(fileName, subject),
        ...(meta || {}),
      };
    });
  const markSchemes = entries.filter((entry) => entry.recognized_mark_scheme);
  const gradeThresholds = entries.filter((entry) => entry.grade_threshold);

  return {
    root: markSchemeRoot,
    exists: fs.existsSync(resolveFromRoot(rootDir, markSchemeRoot)),
    total_pdf_count: entries.length,
    mark_scheme_pdf_count: markSchemes.length,
    grade_threshold_pdf_count: gradeThresholds.length,
    mark_schemes_by_paper: countBy(markSchemes, (entry) => entry.paper),
    mark_schemes_by_session: countBy(markSchemes, (entry) => entry.session),
    samples: markSchemes.slice(0, 10).map((entry) => entry.path),
    grade_threshold_samples: gradeThresholds.slice(0, 10).map((entry) => entry.path),
    rows: markSchemes,
  };
}

function scanLatestPromotion({ rootDir, subject, reportsRoot }) {
  const repoPath = `${reportsRoot}/2026-06-02-9231-9702-new-paper-source-promotion.json`;
  const payload = readJsonIfExists(rootDir, repoPath);
  const rows = Array.isArray(payload?.rows) ? payload.rows.filter((row) => row?.subject_code === subject) : [];
  const verifiedRows = rows.filter((row) => row.status === 'verified');
  return {
    artifact: repoPath,
    exists: Boolean(payload),
    promoted_question_papers: rows.length,
    verified_question_papers: verifiedRows.length,
    sessions: countBy(rows, (row) => {
      const match = new RegExp(`^${subject}_([msw]\\d{2})_qp_`, 'i').exec(row?.paper_id || row?.filename || '');
      return match?.[1]?.toLowerCase();
    }),
    sample_repo_source_paths: rows.slice(0, 10).map((row) => row.repo_source_path).filter(Boolean),
  };
}

function isSubjectManifestFile(fileName, subject) {
  return new RegExp(`^${subject}_.*\\.json$`).test(fileName);
}

function readManifestRows(rootDir, repoPath) {
  const payload = readJsonIfExists(rootDir, repoPath) || {};
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.questions)) return payload.questions;
  if (Array.isArray(payload)) return payload;
  return [];
}

function scanRowSurface({ rootDir, subject, manifestRoot }) {
  const manifestFiles = listFilesRecursive(rootDir, manifestRoot, { extensions: ['.json'] })
    .map((filePath) => toRepoPath(rootDir, filePath));
  const subjectFiles = manifestFiles.filter((repoPath) => isSubjectManifestFile(path.basename(repoPath), subject));
  const pageChainFiles = subjectFiles.filter((repoPath) => path.basename(repoPath).includes('page_chain_surface'));
  const sourceLocatorSurfaceFiles = pageChainFiles.filter((repoPath) => path.basename(repoPath).includes('source_locator'));
  const shardSplitSurfaceFiles = pageChainFiles.filter((repoPath) => (
    !path.basename(repoPath).includes('source_locator')
    && /_standard_001_page_chain_surface_v\d+\.json$/.test(path.basename(repoPath))
  ));
  const currentSurfaceFiles = shardSplitSurfaceFiles.length > 0 ? shardSplitSurfaceFiles : pageChainFiles;
  const authoritySidecarFiles = subjectFiles.filter((repoPath) => path.basename(repoPath).includes('authority_sidecar'));
  const inputFiles = subjectFiles.filter((repoPath) => path.basename(repoPath).includes('input'));

  const rowItems = [];
  const allSurfaceRows = [];
  let manifestBackedImageAssetRefs = 0;
  let surfaceImageAssetRows = 0;
  let surfaceCropAssetRows = 0;
  for (const repoPath of pageChainFiles) {
    for (const [index, row] of readManifestRows(rootDir, repoPath).entries()) {
      allSurfaceRows.push({
        source_manifest: repoPath,
        source_manifest_index: index,
        storage_key: row?.storage_key || null,
      });
    }
  }

  for (const repoPath of currentSurfaceFiles) {
    for (const [index, row] of readManifestRows(rootDir, repoPath).entries()) {
      const imageRefs = [
        ...(Array.isArray(row?.image_assets) ? row.image_assets : []),
        ...(Array.isArray(row?.rendered_pdf_page_paths) ? row.rendered_pdf_page_paths : []),
      ].filter(Boolean);
      const cropRefs = [
        ...(Array.isArray(row?.review_crop_paths) ? row.review_crop_paths : []),
        ...(Array.isArray(row?.crop_paths) ? row.crop_paths : []),
      ].filter(Boolean);
      manifestBackedImageAssetRefs += imageRefs.length + cropRefs.length;
      if (imageRefs.length > 0) surfaceImageAssetRows += 1;
      if (cropRefs.length > 0) surfaceCropAssetRows += 1;
      rowItems.push({
        source_manifest: repoPath,
        source_manifest_index: index,
        storage_key: row?.storage_key || null,
        source_pdf: row?.source_pdf || null,
        surface_evidence_status: row?.surface_evidence_status || null,
        crop_status: row?.crop_status || null,
      });
    }
  }

  const seen = new Set();
  const duplicates = new Set();
  for (const row of rowItems) {
    if (!row.storage_key) continue;
    if (seen.has(row.storage_key)) duplicates.add(row.storage_key);
    seen.add(row.storage_key);
  }
  const allSeen = new Set();
  const allDuplicates = new Set();
  for (const row of allSurfaceRows) {
    if (!row.storage_key) continue;
    if (allSeen.has(row.storage_key)) allDuplicates.add(row.storage_key);
    allSeen.add(row.storage_key);
  }

  return {
    manifest_root: manifestRoot,
    total_manifest_json_files: manifestFiles.length,
    subject_manifest_count: subjectFiles.length,
    page_chain_surface_manifest_count: pageChainFiles.length,
    source_locator_surface_manifest_count: sourceLocatorSurfaceFiles.length,
    shard_split_surface_manifest_count: shardSplitSurfaceFiles.length,
    current_surface_family: shardSplitSurfaceFiles.length > 0 ? 'shard_split' : 'all_page_chain_surfaces',
    current_page_chain_surface_manifest_count: currentSurfaceFiles.length,
    authority_sidecar_manifest_count: authoritySidecarFiles.length,
    input_manifest_count: inputFiles.length,
    question_row_count: rowItems.length,
    duplicate_storage_keys: duplicates.size,
    all_surface_row_count: allSurfaceRows.length,
    all_surface_duplicate_storage_keys: allDuplicates.size,
    manifest_backed_image_asset_refs: manifestBackedImageAssetRefs,
    surface_image_asset_rows: surfaceImageAssetRows,
    surface_crop_asset_rows: surfaceCropAssetRows,
    surface_rows_missing_crop_assets: Math.max(0, rowItems.length - surfaceCropAssetRows),
    page_chain_surface_manifests: pageChainFiles,
    current_page_chain_surface_manifests: currentSurfaceFiles,
    authority_sidecar_manifests: authoritySidecarFiles,
    input_manifests: inputFiles,
    sample_rows: rowItems.slice(0, 10),
  };
}

function scanTextEvidence({ rootDir, subject, reportsRoot, inspectPdfTextLayer, questionPaperRows }) {
  const reportFiles = listFilesRecursive(rootDir, reportsRoot, { extensions: ['.json'] })
    .map((filePath) => toRepoPath(rootDir, filePath));
  const evidenceBundleFiles = reportFiles.filter((repoPath) => {
    const fileName = path.basename(repoPath);
    return fileName.includes(subject) && fileName.includes('evidence-bundles');
  });
  const plainTextV1Artifacts = reportFiles.filter((repoPath) => {
    const fileName = path.basename(repoPath);
    return fileName.includes(subject) && fileName.includes('question-plain-text-v1');
  });
  const plainTextV2Artifacts = reportFiles.filter((repoPath) => {
    const fileName = path.basename(repoPath);
    return fileName.includes(subject) && fileName.includes('question-plain-text-v2');
  });
  const consumptionArtifacts = reportFiles.filter((repoPath) => {
    const fileName = path.basename(repoPath);
    return fileName.includes(subject) && fileName.includes('question-plain-text-v2-consumption');
  });

  return {
    evidence_bundle_files: evidenceBundleFiles.length,
    question_plain_text_v1_artifacts: plainTextV1Artifacts.length,
    question_plain_text_v2_artifacts: plainTextV2Artifacts.length,
    question_plain_text_v2_consumption_artifacts: consumptionArtifacts.length,
    evidence_bundle_paths: evidenceBundleFiles,
    question_plain_text_v1_paths: plainTextV1Artifacts,
    question_plain_text_v2_paths: plainTextV2Artifacts,
    pdf_text_layer: {
      inspected: Boolean(inspectPdfTextLayer),
      status: inspectPdfTextLayer ? 'pending_async_inspection' : 'not_inspected',
      boundary: 'Embedded PDF text inspection is source-layer evidence only; it is not OCR evidence bundle coverage or canonical row-level question text.',
      candidate_pdf_count: questionPaperRows.length,
    },
  };
}

async function inspectPdfTextLayer(rootDir, questionPaperRows) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const results = [];
  for (const row of questionPaperRows) {
    const filePath = resolveFromRoot(rootDir, row.path);
    try {
      const data = new Uint8Array(fs.readFileSync(filePath));
      const pdf = await pdfjs.getDocument({
        data,
        disableFontFace: true,
        isEvalSupported: false,
      }).promise;
      let pagesWithText = 0;
      let textItemCount = 0;
      let textCharCount = 0;
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => (typeof item.str === 'string' ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (pageText) {
          pagesWithText += 1;
          textCharCount += pageText.length;
          textItemCount += textContent.items.length;
        }
      }
      results.push({
        path: row.path,
        parse_ok: true,
        page_count: pdf.numPages,
        pages_with_text: pagesWithText,
        text_item_count: textItemCount,
        text_char_count: textCharCount,
      });
      await pdf.destroy();
    } catch (error) {
      results.push({
        path: row.path,
        parse_ok: false,
        error: error.message,
      });
    }
  }

  const parseOk = results.filter((item) => item.parse_ok).length;
  const pdfsWithAnyText = results.filter((item) => Number(item.text_char_count || 0) > 0).length;
  const pages = results.reduce((sum, item) => sum + Number(item.page_count || 0), 0);
  const pagesWithText = results.reduce((sum, item) => sum + Number(item.pages_with_text || 0), 0);
  const textChars = results.reduce((sum, item) => sum + Number(item.text_char_count || 0), 0);
  return {
    inspected: true,
    status: results.some((item) => !item.parse_ok) ? 'parsed_with_errors' : 'parsed',
    boundary: 'Embedded PDF text inspection is source-layer evidence only; it is not OCR evidence bundle coverage or canonical row-level question text.',
    candidate_pdf_count: questionPaperRows.length,
    pdfs_parse_ok: parseOk,
    pdfs_with_any_text: pdfsWithAnyText,
    pages,
    pages_with_text: pagesWithText,
    text_char_count: textChars,
    error_count: results.length - parseOk,
    sample_results: results.slice(0, 10),
  };
}

function scanImageAssets({ rootDir, subject, rowSurface }) {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
  const roots = ['outputs', 'tmp', 'data/question-assets', 'data/crops', 'public'];
  const existingRoots = roots.filter((repoPath) => fs.existsSync(resolveFromRoot(rootDir, repoPath)));
  const imageFiles = [];
  for (const repoPath of existingRoots) {
    imageFiles.push(...listFilesRecursive(rootDir, repoPath)
      .map((filePath) => toRepoPath(rootDir, filePath))
      .filter((filePath) => filePath.includes(subject))
      .filter((filePath) => imageExtensions.includes(path.extname(filePath).toLowerCase())));
  }

  return {
    scanned_roots: existingRoots,
    tracked_or_local_subject_image_files: imageFiles.length,
    sample_image_files: imageFiles.slice(0, 10),
    manifest_backed_image_asset_refs: rowSurface.manifest_backed_image_asset_refs,
    surface_image_asset_rows: rowSurface.surface_image_asset_rows,
    surface_crop_asset_rows: rowSurface.surface_crop_asset_rows,
    surface_rows_missing_crop_assets: rowSurface.surface_rows_missing_crop_assets,
  };
}

function scanRagSeedOrEvalArtifacts({ rootDir, subject, evidenceProductionRoot, evalRoot }) {
  const evalFiles = listFilesRecursive(rootDir, evalRoot, { extensions: ['.json'] })
    .map((filePath) => toRepoPath(rootDir, filePath))
    .filter((repoPath) => path.basename(repoPath).includes(subject));
  const productionEvidenceFiles = listFilesRecursive(rootDir, evidenceProductionRoot, { extensions: ['.json'] })
    .map((filePath) => toRepoPath(rootDir, filePath));
  const productionEvidenceSubjectFiles = productionEvidenceFiles.filter((repoPath) => {
    const payload = readJsonIfExists(rootDir, repoPath);
    return JSON.stringify(payload || {}).includes(subject);
  });

  return {
    eval_sample_files: evalFiles.length,
    production_evidence_files_mentioning_subject: productionEvidenceSubjectFiles.length,
    eval_sample_paths: evalFiles,
    production_evidence_paths_mentioning_subject: productionEvidenceSubjectFiles,
    foundation_equivalent: false,
    boundary: 'RAG seed/eval artifacts do not prove source-located row-level question-bank foundation rows.',
  };
}

function fileText(rootDir, repoPath) {
  const filePath = resolveFromRoot(rootDir, repoPath);
  if (!fs.existsSync(filePath)) {
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function detectConsumptionPaths({ rootDir, subject, reportsRoot }) {
  const searchMigration = 'supabase/migrations/20260415152950_create_learning_question_search_projection.sql';
  const registryMigration = 'supabase/migrations/20260413110000_phase_a_question_classified_events.sql';
  const searchSql = fileText(rootDir, searchMigration);
  const registrySql = fileText(rootDir, registryMigration);
  const normalizedIndex = searchSql.indexOf("provenance_summary ->> 'normalized_plain_text'");
  const legacySearchIndex = searchSql.indexOf("provenance_summary ->> 'search_text'");
  const searchContractPresent = normalizedIndex !== -1
    && legacySearchIndex !== -1
    && normalizedIndex < legacySearchIndex
    && searchSql.includes('question_plain_text_v2.normalized_plain_text');
  const readModelContractPresent = registrySql.includes("provenance_summary ->> 'normalized_plain_text'")
    && registrySql.includes("provenance_summary ->> 'text_consumption_status'");
  const consumptionArtifacts = listFilesRecursive(rootDir, reportsRoot, { extensions: ['.json'] })
    .map((filePath) => toRepoPath(rootDir, filePath))
    .filter((repoPath) => {
      const fileName = path.basename(repoPath);
      return fileName.includes(subject) && fileName.includes('question-plain-text-v2-consumption');
    });

  return {
    search_normalized_plain_text_priority_contract: searchContractPresent ? 'present' : 'missing',
    read_model_normalized_plain_text_contract: readModelContractPresent ? 'present' : 'missing',
    rag_normalized_plain_text_local_contract: 'present_for_question_plain_text_v2_artifacts',
    local_consumption_gate_artifacts: consumptionArtifacts.length,
    local_consumption_gate_paths: consumptionArtifacts,
    db_consumed_claimed: false,
    search_consumed_claimed: false,
    read_model_consumed_claimed: false,
    rag_consumed_claimed: false,
    boundary: 'Schema/code can prefer normalized_plain_text, but subject consumption is not claimed without 9231 row-level question_plain_text_v2 artifacts and a local consumption gate.',
  };
}

function buildGapInventory({ sourceCoverage, rowSurface, textEvidence, imageAssets, consumptionPaths }) {
  const blockers = [];
  const nextExecutableGates = [];
  const addBlocker = (check, message, evidence = {}) => {
    blockers.push({
      check,
      severity: 'blocker',
      message,
      evidence,
    });
  };

  if (sourceCoverage.question_paper_pdf_count === 0) {
    addBlocker('missing_question_paper_source_pdfs', 'No 9231 question-paper PDFs were found under the source root.', {
      root: sourceCoverage.question_paper_root,
    });
  }
  if (rowSurface.input_manifest_count === 0) {
    addBlocker('missing_input_manifest', 'No 9231 input/locator manifest exists under data/manifests.', {
      manifest_root: rowSurface.manifest_root,
    });
    nextExecutableGates.push('Build deterministic 9231 source/locator input manifests from data/past-papers/9231Further-Mathematics.');
  }
  if (rowSurface.page_chain_surface_manifest_count === 0) {
    addBlocker('missing_page_chain_surface_manifest', 'No 9231 page-chain surface manifest exists under data/manifests.', {
      manifest_root: rowSurface.manifest_root,
    });
    nextExecutableGates.push('Build and verify 9231 page-chain surface manifests with stable storage_key rows.');
  }
  if (rowSurface.question_row_count === 0) {
    addBlocker('missing_question_row_surface', 'No 9231 row-level question surface rows can be counted.', {
      page_chain_surface_manifest_count: rowSurface.page_chain_surface_manifest_count,
    });
  }
  if (rowSurface.duplicate_storage_keys > 0) {
    addBlocker('duplicate_surface_storage_keys', 'Duplicate 9231 surface storage keys exist.', {
      duplicate_storage_keys: rowSurface.duplicate_storage_keys,
    });
  }
  if (textEvidence.evidence_bundle_files === 0) {
    addBlocker('missing_ocr_evidence_bundle', 'No 9231 row-level evidence-bundle OCR/text artifact exists.', {
      reports_root: sourceCoverage.reports_root,
    });
  }
  if (textEvidence.question_plain_text_v1_artifacts === 0) {
    addBlocker('missing_question_plain_text_v1_artifact', 'No 9231 question_plain_text_v1 artifact exists.', {});
  }
  if (textEvidence.question_plain_text_v2_artifacts === 0) {
    addBlocker('missing_question_plain_text_v2_artifact', 'No 9231 question_plain_text_v2 artifact exists.', {});
  }
  if (consumptionPaths.local_consumption_gate_artifacts === 0) {
    addBlocker('missing_question_plain_text_v2_consumption_gate', 'No 9231 normalized_plain_text local consumption gate artifact exists.', {});
  }
  if (rowSurface.question_row_count === 0 && imageAssets.tracked_or_local_subject_image_files === 0) {
    addBlocker('missing_manifest_backed_image_or_crop_assets', 'No manifest-backed 9231 image/crop asset surface exists.', {});
  }
  if (rowSurface.question_row_count > 0 && imageAssets.surface_crop_asset_rows === 0) {
    addBlocker('missing_manifest_backed_crop_assets', '9231 row-level surface rows exist, but no manifest-backed crop assets are present yet.', {
      question_row_count: rowSurface.question_row_count,
      surface_crop_asset_rows: imageAssets.surface_crop_asset_rows,
    });
    nextExecutableGates.push('Generate local deterministic page render/crop assets for each row and count missing crops.');
  }
  if (textEvidence.evidence_bundle_files === 0) {
    nextExecutableGates.push('Attach OCR/text evidence bundles without external VLM/API calls unless scope is explicitly expanded.');
  }
  if (textEvidence.question_plain_text_v1_artifacts === 0 || textEvidence.question_plain_text_v2_artifacts === 0) {
    nextExecutableGates.push('Only after row/evidence coverage exists, run 9231 question_plain_text_v1/v2 gates.');
  }
  if (consumptionPaths.local_consumption_gate_artifacts === 0) {
    nextExecutableGates.push('Run a 9231 normalized_plain_text local consumption gate before claiming search/read-model/RAG consumption.');
  }

  return {
    foundation_status: rowSurface.question_row_count > 0 ? 'row-surface-present-needs-text-gates' : 'blocked-by-missing-row-surface',
    blockers,
    next_executable_gates: [...new Set(nextExecutableGates)],
  };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell)).join(' | ')} |`),
  ].join('\n');
}

export function renderQuestionTextFoundationInventoryMarkdown(inventory) {
  const source = inventory.source_coverage;
  const rowSurface = inventory.row_surface;
  const text = inventory.text_evidence;
  const image = inventory.image_assets;
  const consumption = inventory.consumption_paths;
  const gap = inventory.gap_inventory;

  const lines = [
    '# 9231 Question Text Foundation Inventory',
    '',
    `- generated_on: \`${inventory.generated_on}\``,
    `- status: \`${inventory.status}\``,
    `- verdict: \`${inventory.verdict}\``,
    '- This is not a production-ready claim.',
    '- This does not claim canonical 9231 question text, DB consumption, deployed search consumption, or online RAG ingestion.',
    '- No external VLM/API or OCR rerun is performed by this inventory gate.',
    '',
    '## Repo-Truth Conclusion',
    '',
    rowSurface.question_row_count > 0
      ? `Conclusion: \`${gap.foundation_status}\`. Deterministic local row-level locator surfaces exist, but crop/image assets, OCR/text evidence, question_plain_text_v1/v2, and normalized_plain_text consumption gates are still missing.`
      : `Conclusion: \`${gap.foundation_status}\`. Raw source PDFs exist, but row-level production surface evidence must be built before 9231 can enter question_plain_text_v1/v2.`,
    '',
    '## Raw PDF Source Coverage',
    '',
    markdownTable(['metric', 'value'], [
      ['question paper root', source.question_paper_root],
      ['question paper PDFs', source.question_paper_pdf_count],
      ['question papers by paper', JSON.stringify(source.question_papers_by_paper)],
      ['mark scheme root', source.mark_scheme_root],
      ['mark scheme PDFs', source.mark_scheme_pdf_count],
      ['mark schemes by paper', JSON.stringify(source.mark_schemes_by_paper)],
      ['grade threshold PDFs', source.grade_threshold_pdf_count],
      ['latest promoted 9231 QPs', source.latest_source_promotion.promoted_question_papers],
      ['latest verified 9231 QPs', source.latest_source_promotion.verified_question_papers],
    ]),
    '',
    '## Row-Level Surface',
    '',
    markdownTable(['metric', 'value'], [
      ['data/manifests JSON files', rowSurface.total_manifest_json_files],
      ['9231 subject manifests', rowSurface.subject_manifest_count],
      ['9231 input manifests', rowSurface.input_manifest_count],
      ['9231 page-chain surface manifests', rowSurface.page_chain_surface_manifest_count],
      ['9231 source-locator surface manifests', rowSurface.source_locator_surface_manifest_count],
      ['9231 shard-split surface manifests', rowSurface.shard_split_surface_manifest_count],
      ['9231 current surface family', rowSurface.current_surface_family],
      ['9231 authority sidecars', rowSurface.authority_sidecar_manifest_count],
      ['9231 question rows', rowSurface.question_row_count],
      ['duplicate storage keys', rowSurface.duplicate_storage_keys],
    ]),
    '',
    '## OCR And Text Evidence',
    '',
    markdownTable(['metric', 'value'], [
      ['evidence bundle files', text.evidence_bundle_files],
      ['question_plain_text_v1 artifacts', text.question_plain_text_v1_artifacts],
      ['question_plain_text_v2 artifacts', text.question_plain_text_v2_artifacts],
      ['question_plain_text_v2 consumption artifacts', text.question_plain_text_v2_consumption_artifacts],
      ['PDF text layer inspected', text.pdf_text_layer.inspected],
      ['PDF text layer status', text.pdf_text_layer.status],
    ]),
    '',
    '## Image And Crop Assets',
    '',
    markdownTable(['metric', 'value'], [
      ['scanned roots', JSON.stringify(image.scanned_roots)],
      ['subject image files', image.tracked_or_local_subject_image_files],
      ['surface image asset rows', image.surface_image_asset_rows],
      ['surface crop asset rows', image.surface_crop_asset_rows],
      ['surface rows missing crop assets', image.surface_rows_missing_crop_assets],
    ]),
    '',
    '## DB Search RAG Read-Model Paths',
    '',
    markdownTable(['metric', 'value'], [
      ['search normalized_plain_text priority schema contract', consumption.search_normalized_plain_text_priority_contract],
      ['read-model normalized_plain_text schema contract', consumption.read_model_normalized_plain_text_contract],
      ['local 9231 consumption gate artifacts', consumption.local_consumption_gate_artifacts],
      ['DB consumed claimed', consumption.db_consumed_claimed],
      ['search consumed claimed', consumption.search_consumed_claimed],
      ['read-model consumed claimed', consumption.read_model_consumed_claimed],
      ['RAG consumed claimed', consumption.rag_consumed_claimed],
    ]),
    '',
    '## RAG Seed Or Eval Artifacts',
    '',
    markdownTable(['metric', 'value'], [
      ['eval sample files', inventory.rag_seed_or_eval_artifacts.eval_sample_files],
      ['production evidence files mentioning 9231', inventory.rag_seed_or_eval_artifacts.production_evidence_files_mentioning_subject],
      ['foundation equivalent', inventory.rag_seed_or_eval_artifacts.foundation_equivalent],
    ]),
    '',
    '## Blockers',
    '',
  ];

  if (gap.blockers.length === 0) {
    lines.push('- none');
  } else {
    for (const blocker of gap.blockers) {
      lines.push(`- ${blocker.check}: ${blocker.message}`);
    }
  }

  lines.push('', '## Next Executable Gates', '');
  for (const nextGate of gap.next_executable_gates) {
    lines.push(`- ${nextGate}`);
  }

  lines.push('', '## Workflow Gaps', '');
  if (inventory.workflow_gaps.length === 0) {
    lines.push('- none');
  } else {
    for (const gapItem of inventory.workflow_gaps) {
      lines.push(`- ${gapItem}`);
    }
  }

  lines.push('', '## Verification Inputs', '');
  for (const input of inventory.verification_inputs) {
    lines.push(`- \`${input}\``);
  }

  return `${lines.join('\n')}\n`;
}

export function buildQuestionTextFoundationInventory({
  rootDir = ROOT,
  subject = DEFAULTS.subject,
  generatedOn = DEFAULTS.generatedOn,
  questionPaperRoot = DEFAULTS.questionPaperRoot,
  markSchemeRoot = DEFAULTS.markSchemeRoot,
  manifestRoot = DEFAULTS.manifestRoot,
  reportsRoot = DEFAULTS.reportsRoot,
  evidenceProductionRoot = DEFAULTS.evidenceProductionRoot,
  evalRoot = DEFAULTS.evalRoot,
  inspectPdfTextLayer = false,
  workflowGaps = [],
} = {}) {
  const questionPapers = scanQuestionPapers({ rootDir, subject, questionPaperRoot });
  const markSchemes = scanMarkSchemes({ rootDir, subject, markSchemeRoot });
  const latestSourcePromotion = scanLatestPromotion({ rootDir, subject, reportsRoot });
  const sourceCoverage = {
    question_paper_root: questionPaperRoot,
    mark_scheme_root: markSchemeRoot,
    reports_root: reportsRoot,
    question_paper_pdf_count: questionPapers.question_paper_pdf_count,
    question_papers_by_paper: questionPapers.by_paper,
    question_papers_by_session: questionPapers.by_session,
    question_paper_samples: questionPapers.samples,
    mark_scheme_pdf_count: markSchemes.mark_scheme_pdf_count,
    mark_schemes_by_paper: markSchemes.mark_schemes_by_paper,
    mark_schemes_by_session: markSchemes.mark_schemes_by_session,
    grade_threshold_pdf_count: markSchemes.grade_threshold_pdf_count,
    mark_scheme_samples: markSchemes.samples,
    grade_threshold_samples: markSchemes.grade_threshold_samples,
    latest_source_promotion: latestSourcePromotion,
  };
  const rowSurface = scanRowSurface({ rootDir, subject, manifestRoot });
  const textEvidence = scanTextEvidence({
    rootDir,
    subject,
    reportsRoot,
    inspectPdfTextLayer,
    questionPaperRows: questionPapers.rows,
  });
  const imageAssets = scanImageAssets({ rootDir, subject, rowSurface });
  const ragSeedOrEvalArtifacts = scanRagSeedOrEvalArtifacts({
    rootDir,
    subject,
    evidenceProductionRoot,
    evalRoot,
  });
  const consumptionPaths = detectConsumptionPaths({ rootDir, subject, reportsRoot });
  const gapInventory = buildGapInventory({
    sourceCoverage,
    rowSurface,
    textEvidence,
    imageAssets,
    consumptionPaths,
  });
  const status = gapInventory.foundation_status === 'blocked-by-missing-row-surface' ? 'blocked' : 'inventory_ready';

  return {
    schema_version: '9231_question_text_foundation_inventory_v1',
    generated_on: generatedOn,
    subject_code: subject,
    status,
    verdict: status === 'blocked'
      ? 'foundation blocked-by-missing-row-surface'
      : 'foundation row-surface-present-needs-text-gates',
    boundary: {
      local_deterministic_inventory: true,
      external_vlm_or_api_used: false,
      external_ocr_rerun_used: false,
      production_ready_claimed: false,
      db_consumption_claimed: false,
      search_consumption_claimed: false,
      rag_consumption_claimed: false,
    },
    source_coverage: sourceCoverage,
    row_surface: rowSurface,
    text_evidence: textEvidence,
    image_assets: imageAssets,
    rag_seed_or_eval_artifacts: ragSeedOrEvalArtifacts,
    consumption_paths: consumptionPaths,
    gap_inventory: gapInventory,
    workflow_gaps: [...workflowGaps],
    verification_inputs: [
      'git status --short --branch',
      'npm run workflow:codex-preflight -- --json',
      'data/past-papers/9231Further-Mathematics',
      'data/mark-schemes/9231Further-Mathematics',
      'data/manifests',
      'docs/reports/2026-06-02-9231-9702-new-paper-source-promotion.json',
      'supabase/migrations/20260415152950_create_learning_question_search_projection.sql',
      'supabase/migrations/20260413110000_phase_a_question_classified_events.sql',
    ],
  };
}

export async function buildQuestionTextFoundationInventoryAsync(options = {}) {
  const inventory = buildQuestionTextFoundationInventory(options);
  if (options.inspectPdfTextLayer) {
    const questionPapers = scanQuestionPapers({
      rootDir: options.rootDir || ROOT,
      subject: options.subject || DEFAULTS.subject,
      questionPaperRoot: options.questionPaperRoot || DEFAULTS.questionPaperRoot,
    });
    inventory.text_evidence.pdf_text_layer = await inspectPdfTextLayer(options.rootDir || ROOT, questionPapers.rows);
  }
  return inventory;
}

export function writeQuestionTextFoundationInventoryArtifacts(rootDir, inventory, { jsonOut, markdownOut } = {}) {
  writeJsonFile(rootDir, jsonOut, inventory);
  writeTextFile(rootDir, markdownOut, renderQuestionTextFoundationInventoryMarkdown(inventory));
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return 0;
  }

  const inventory = await buildQuestionTextFoundationInventoryAsync({
    rootDir: ROOT,
    ...options,
  });
  if (options.writeArtifacts) {
    writeQuestionTextFoundationInventoryArtifacts(ROOT, inventory, {
      jsonOut: options.jsonOut,
      markdownOut: options.markdownOut,
    });
  }
  writeStdoutLine(JSON.stringify({
    status: inventory.status,
    verdict: inventory.verdict,
    source_coverage: {
      question_paper_pdf_count: inventory.source_coverage.question_paper_pdf_count,
      question_papers_by_paper: inventory.source_coverage.question_papers_by_paper,
      mark_scheme_pdf_count: inventory.source_coverage.mark_scheme_pdf_count,
      grade_threshold_pdf_count: inventory.source_coverage.grade_threshold_pdf_count,
    },
    row_surface: {
      page_chain_surface_manifest_count: inventory.row_surface.page_chain_surface_manifest_count,
      question_row_count: inventory.row_surface.question_row_count,
    },
    blockers: inventory.gap_inventory.blockers.length,
  }, null, 2));
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    fs.writeSync(2, `${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
