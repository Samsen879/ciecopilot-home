#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const DEFAULTS = Object.freeze({
  subject: '9709',
  generatedOn: '2026-06-04',
  surfaceRoot: 'data/manifests',
  evidenceRoot: 'docs/reports',
  jsonOut: 'docs/reports/2026-06-04-9709-question-plain-text-v1.json',
  markdownOut: 'docs/reports/2026-06-04-9709-question-plain-text-v1-coverage.md',
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
    'Usage: node scripts/learning/build_9709_question_plain_text_v1.js',
    '  [--subject <subject-code>]',
    '  [--generated-on <YYYY-MM-DD>]',
    '  [--surface-root <path>]',
    '  [--evidence-root <path>]',
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
    if (token === '--surface-root') {
      options.surfaceRoot = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--evidence-root') {
      options.evidenceRoot = requiredValue(argv, index, token);
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
  return path.resolve(rootDir, repoPath);
}

function toRepoPath(rootDir, filePath) {
  return path.relative(rootDir, path.resolve(filePath)).replaceAll(path.sep, '/');
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(rootDir, repoPath, payload) {
  const resolved = resolveFromRoot(rootDir, repoPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeTextFile(rootDir, repoPath, text) {
  const resolved = resolveFromRoot(rootDir, repoPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, text, 'utf8');
}

function listJsonFiles(rootDir, repoDir) {
  const resolvedRoot = resolveFromRoot(rootDir, repoDir);
  if (!fs.existsSync(resolvedRoot)) {
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
      if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(entryPath);
      }
    }
  };

  visit(resolvedRoot);
  return files.sort((left, right) => toRepoPath(rootDir, left).localeCompare(toRepoPath(rootDir, right)));
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePlainText(value) {
  return normalizeString(value)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter((entry) => entry !== null && typeof entry !== 'undefined') : [];
}

function normalizeStringArray(value) {
  return [...new Set(normalizeArray(value).map((entry) => normalizeString(entry)).filter(Boolean))];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function firstNonEmptyString(...values) {
  for (const value of values) {
    const normalized = normalizePlainText(value);
    if (normalized) {
      return normalized;
    }
  }
  return '';
}

function firstPresent(...values) {
  for (const value of values) {
    if (value !== null && typeof value !== 'undefined') {
      return value;
    }
  }
  return null;
}

function toBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

function sourceVersionFromSurfacePath(repoPath) {
  return repoPath.endsWith('_v2.json') ? 'v2' : 'v1';
}

function isSurfaceManifestFile(repoPath, subject) {
  const fileName = path.basename(repoPath);
  return new RegExp(`^${subject}_.*page_chain_surface_.*\\.json$`).test(fileName);
}

function isEvidenceBundleFile(repoPath, subject) {
  const fileName = path.basename(repoPath);
  return new RegExp(`${subject}.*evidence-bundles.*\\.json$`).test(fileName);
}

function parseDateScore(repoPath) {
  const match = /(?<date>\d{4}-\d{2}-\d{2})/.exec(path.basename(repoPath));
  if (!match?.groups?.date) {
    return 0;
  }
  const compact = match.groups.date.replaceAll('-', '');
  return Number.parseInt(compact, 10) || 0;
}

export function scoreEvidenceFile(repoPath) {
  const fileName = path.basename(repoPath);
  let score = parseDateScore(repoPath);
  if (fileName.endsWith('-final.json')) {
    score += 100000000;
  }
  if (fileName.includes('-authority-evidence-bundles')) {
    score += 1000000;
  }
  if (fileName.includes('human-preserve')) {
    score += 100000;
  }
  if (fileName.includes('override')) {
    score += 50000;
  }
  return score;
}

function compareEvidenceCandidates(left, right) {
  const leftScore = scoreEvidenceFile(left.source_evidence_bundle);
  const rightScore = scoreEvidenceFile(right.source_evidence_bundle);
  if (leftScore !== rightScore) {
    return rightScore - leftScore;
  }
  return right.source_evidence_bundle.localeCompare(left.source_evidence_bundle);
}

export function collectProductionSurfaceRows({
  rootDir = ROOT,
  subject = DEFAULTS.subject,
  surfaceRoot = DEFAULTS.surfaceRoot,
} = {}) {
  const surfaceFiles = listJsonFiles(rootDir, surfaceRoot)
    .filter((filePath) => isSurfaceManifestFile(toRepoPath(rootDir, filePath), subject));

  const rows = [];
  const duplicateGroups = new Map();
  const seen = new Map();
  const manifestCountsByVersion = {};

  for (const filePath of surfaceFiles) {
    const repoPath = toRepoPath(rootDir, filePath);
    const sourceVersion = sourceVersionFromSurfacePath(repoPath);
    manifestCountsByVersion[sourceVersion] = (manifestCountsByVersion[sourceVersion] ?? 0) + 1;
    const payload = readJsonFile(filePath);
    for (const [manifestIndex, item] of (payload.items ?? []).entries()) {
      if (!item?.storage_key) {
        continue;
      }
      const row = {
        item,
        manifest: payload,
        manifest_index: manifestIndex,
        source_surface_manifest: repoPath,
        source_version: sourceVersion,
      };
      rows.push(row);

      const previous = seen.get(item.storage_key);
      if (previous) {
        const duplicateRows = duplicateGroups.get(item.storage_key) ?? [previous];
        duplicateRows.push(row);
        duplicateGroups.set(item.storage_key, duplicateRows);
      } else {
        seen.set(item.storage_key, row);
      }
    }
  }

  return {
    surface_files: surfaceFiles.map((filePath) => toRepoPath(rootDir, filePath)),
    manifest_counts_by_version: manifestCountsByVersion,
    rows,
    duplicate_groups: duplicateGroups,
  };
}

export function collectEvidenceByStorageKey({
  rootDir = ROOT,
  subject = DEFAULTS.subject,
  evidenceRoot = DEFAULTS.evidenceRoot,
} = {}) {
  const evidenceFiles = listJsonFiles(rootDir, evidenceRoot)
    .filter((filePath) => isEvidenceBundleFile(toRepoPath(rootDir, filePath), subject));

  const byStorageKey = new Map();
  for (const filePath of evidenceFiles) {
    const repoPath = toRepoPath(rootDir, filePath);
    const payload = readJsonFile(filePath);
    const bundles = payload.bundles ?? payload.items ?? [];
    for (const [bundleIndex, bundle] of bundles.entries()) {
      if (!bundle?.storage_key) {
        continue;
      }
      const candidates = byStorageKey.get(bundle.storage_key) ?? [];
      candidates.push({
        bundle,
        source_evidence_bundle: repoPath,
        evidence_bundle_index: bundleIndex,
      });
      byStorageKey.set(bundle.storage_key, candidates);
    }
  }

  for (const candidates of byStorageKey.values()) {
    candidates.sort(compareEvidenceCandidates);
  }

  return {
    evidence_files: evidenceFiles.map((filePath) => toRepoPath(rootDir, filePath)),
    by_storage_key: byStorageKey,
  };
}

function parseCropPathsFromLayoutHints(layoutHints) {
  const paths = [];
  for (const hint of normalizeStringArray(layoutHints)) {
    if (!hint.includes('crop')) {
      continue;
    }
    const quotedMatches = hint.matchAll(/['"]([^'"]*crop[^'"]*)['"]/g);
    for (const match of quotedMatches) {
      if (match[1]) {
        paths.push(match[1]);
      }
    }
  }
  return paths;
}

function collectImageAssets(surfaceItem, bundle) {
  const cropRecordPaths = normalizeArray(surfaceItem.crop_records)
    .map((record) => normalizeString(record?.crop_path))
    .filter(Boolean);

  return unique([
    ...normalizeStringArray(surfaceItem.image_assets),
    ...normalizeStringArray(surfaceItem.review_crop_paths),
    ...normalizeStringArray(surfaceItem.crop_paths),
    ...cropRecordPaths,
    ...parseCropPathsFromLayoutHints(bundle?.evidence?.layout_hints),
  ]);
}

function collectRenderedPagePaths(surfaceItem) {
  const cropRecordRendered = normalizeArray(surfaceItem.crop_records)
    .map((record) => normalizeString(record?.rendered_pdf_page_path))
    .filter(Boolean);

  return unique([
    ...normalizeStringArray(surfaceItem.source_rendered_page_paths),
    ...normalizeStringArray(surfaceItem.rendered_pdf_page_paths),
    ...cropRecordRendered,
  ]);
}

function identityFrom(surfaceItem, bundle) {
  const questionIdentity = bundle?.question_identity ?? {};
  return {
    subject_code: String(firstPresent(
      questionIdentity.subject_code,
      surfaceItem.syllabus_code,
      surfaceItem.subject_code,
      DEFAULTS.subject,
    )),
    year: firstPresent(questionIdentity.year, surfaceItem.year),
    session: firstPresent(questionIdentity.session, surfaceItem.session),
    paper: firstPresent(questionIdentity.paper, surfaceItem.paper),
    variant: firstPresent(questionIdentity.variant, surfaceItem.variant),
    q_number: firstPresent(questionIdentity.q_number, surfaceItem.q_number),
  };
}

function topicPathFrom(surfaceItem, bundle) {
  return firstNonEmptyString(
    bundle?.question_identity?.primary_topic_path,
    bundle?.analysis_hints?.topic_path_hint,
    surfaceItem.visual_disposition?.authority_topic_path,
    surfaceItem.primary_topic_path,
  ) || null;
}

function buildQualityFlags({ surfaceItem, bundle, evidenceCandidateCount, hasDiagram, needsImageAsset, imageAssets, textSource }) {
  const flags = [];
  if (surfaceItem.formula_dense === true || bundle?.surface_posture?.formula_dense === true) {
    flags.push('formula_dense');
  }
  if (surfaceItem.table_heavy === true || bundle?.surface_posture?.table_heavy === true) {
    flags.push('table_heavy');
  }
  if (hasDiagram === true) {
    flags.push('diagram_present');
  }
  if (needsImageAsset && imageAssets.length === 0) {
    flags.push('missing_image_asset_for_layout_dependent_question');
  }
  if (evidenceCandidateCount > 1) {
    flags.push('multiple_evidence_bundle_candidates');
  }
  if (textSource === 'missing') {
    flags.push('missing_plain_text');
  }
  return flags;
}

function buildPlainTextItem(surfaceRow, evidenceCandidates) {
  const surfaceItem = surfaceRow.item;
  const selectedEvidence = evidenceCandidates[0] ?? null;
  const bundle = selectedEvidence?.bundle ?? null;
  const surfaceQuestionText = normalizePlainText(surfaceItem.visual_disposition?.question_text);
  const evidenceOcrText = normalizePlainText(bundle?.evidence?.ocr_text);
  const plainText = firstNonEmptyString(surfaceQuestionText, evidenceOcrText);
  const textSource = surfaceQuestionText
    ? 'surface_visual_disposition_question_text'
    : evidenceOcrText
      ? 'evidence_ocr_text'
      : 'missing';
  const hasDiagram = firstPresent(
    toBoolean(surfaceItem.diagram_present),
    toBoolean(bundle?.evidence?.diagram_present),
    toBoolean(bundle?.surface_posture?.diagram_present),
  );
  const tableHeavy = Boolean(surfaceItem.table_heavy === true || bundle?.surface_posture?.table_heavy === true);
  const needsImageAsset = Boolean(hasDiagram === true || tableHeavy);
  const imageAssets = collectImageAssets(surfaceItem, bundle);
  const renderedPdfPagePaths = collectRenderedPagePaths(surfaceItem);
  const identity = identityFrom(surfaceItem, bundle);
  const topicPath = topicPathFrom(surfaceItem, bundle);

  return {
    schema_version: 'question_plain_text_v1',
    storage_key: surfaceItem.storage_key,
    subject_code: identity.subject_code,
    year: identity.year,
    session: identity.session,
    paper: identity.paper,
    variant: identity.variant,
    q_number: identity.q_number,
    source_pdf: surfaceItem.source_pdf ?? null,
    source_version: surfaceRow.source_version,
    source_surface_manifest: surfaceRow.source_surface_manifest,
    source_surface_manifest_index: surfaceRow.manifest_index,
    source_evidence_bundle: selectedEvidence?.source_evidence_bundle ?? null,
    source_evidence_bundle_index: selectedEvidence?.evidence_bundle_index ?? null,
    source_evidence_bundle_candidate_count: evidenceCandidates.length,
    primary_topic_path: topicPath,
    has_diagram: hasDiagram === true,
    formula_dense: Boolean(surfaceItem.formula_dense === true || bundle?.surface_posture?.formula_dense === true),
    table_heavy: tableHeavy,
    needs_image_asset: needsImageAsset,
    plain_text: plainText,
    text_source: textSource,
    formula_latex_list: normalizeArray(bundle?.evidence?.formula_latex_list),
    subquestion_blocks: normalizeArray(bundle?.evidence?.subquestion_blocks),
    diagram_elements: normalizeStringArray(
      surfaceItem.visual_disposition?.diagram_elements?.length
        ? surfaceItem.visual_disposition.diagram_elements
        : bundle?.evidence?.diagram_elements,
    ),
    spatial_evidence: normalizeStringArray(
      surfaceItem.visual_disposition?.spatial_evidence?.length
        ? surfaceItem.visual_disposition.spatial_evidence
        : bundle?.evidence?.spatial_evidence,
    ),
    image_assets: imageAssets,
    rendered_pdf_page_paths: renderedPdfPagePaths,
    page_indices: normalizeArray(surfaceItem.page_indices),
    page_range: surfaceItem.page_range ?? null,
    provenance: {
      surface_evidence_status: surfaceItem.surface_evidence_status ?? bundle?.surface_posture?.surface_evidence_status ?? null,
      visual_review_status: surfaceItem.visual_review_status ?? null,
      visual_review_method: surfaceItem.visual_review_method ?? null,
      route_hint: surfaceItem.route_hint ?? bundle?.surface_posture?.route_hint ?? null,
      evidence_route: bundle?.route?.route ?? null,
      model_provenance: normalizeArray(bundle?.model_provenance),
      original_image_asset: bundle?.original_image_asset ?? null,
      lazy_attach_original_image: Boolean(bundle?.lazy_attach_original_image),
      lazy_attach_reasons: normalizeStringArray(bundle?.lazy_attach_reasons),
    },
    quality_flags: buildQualityFlags({
      surfaceItem,
      bundle,
      evidenceCandidateCount: evidenceCandidates.length,
      hasDiagram,
      needsImageAsset,
      imageAssets,
      textSource,
    }),
  };
}

function emptyVersionSummary(manifestCount = 0) {
  return {
    surface_manifests: manifestCount,
    production_rows: 0,
    plain_text_rows: 0,
    no_diagram_rows: 0,
    no_diagram_plain_text_rows: 0,
    diagram_rows: 0,
    diagram_rows_with_text_and_image_asset: 0,
    image_asset_required_rows: 0,
    image_asset_required_rows_with_assets: 0,
    missing_evidence_bundle: 0,
    missing_plain_text: 0,
  };
}

function incrementVersionSummary(summary, item, hasEvidence) {
  const versionSummary = summary.source_versions[item.source_version] ?? emptyVersionSummary();
  versionSummary.production_rows += 1;
  if (item.plain_text) {
    versionSummary.plain_text_rows += 1;
  }
  if (item.has_diagram) {
    versionSummary.diagram_rows += 1;
    if (item.plain_text && item.image_assets.length > 0) {
      versionSummary.diagram_rows_with_text_and_image_asset += 1;
    }
  } else {
    versionSummary.no_diagram_rows += 1;
    if (item.plain_text) {
      versionSummary.no_diagram_plain_text_rows += 1;
    }
  }
  if (item.needs_image_asset) {
    versionSummary.image_asset_required_rows += 1;
    if (item.image_assets.length > 0) {
      versionSummary.image_asset_required_rows_with_assets += 1;
    }
  }
  if (!hasEvidence) {
    versionSummary.missing_evidence_bundle += 1;
  }
  if (!item.plain_text) {
    versionSummary.missing_plain_text += 1;
  }
  summary.source_versions[item.source_version] = versionSummary;
}

function buildSummary({ items, surface, evidence, blockers }) {
  const summary = {
    surface_manifest_files: surface.surface_files.length,
    evidence_bundle_files: evidence.evidence_files.length,
    production_rows: items.length,
    plain_text_rows: 0,
    no_diagram_rows: 0,
    no_diagram_plain_text_rows: 0,
    diagram_rows: 0,
    diagram_rows_with_text_and_image_asset: 0,
    image_asset_required_rows: 0,
    image_asset_required_rows_with_assets: 0,
    duplicate_storage_keys: surface.duplicate_groups.size,
    missing_evidence_bundle: 0,
    missing_plain_text: 0,
    missing_image_asset: 0,
    blockers: blockers.length,
    source_versions: {},
  };

  for (const [version, manifestCount] of Object.entries(surface.manifest_counts_by_version)) {
    summary.source_versions[version] = emptyVersionSummary(manifestCount);
  }

  for (const item of items) {
    const hasEvidence = Boolean(item.source_evidence_bundle);
    if (item.plain_text) {
      summary.plain_text_rows += 1;
    }
    if (item.has_diagram) {
      summary.diagram_rows += 1;
      if (item.plain_text && item.image_assets.length > 0) {
        summary.diagram_rows_with_text_and_image_asset += 1;
      }
    } else {
      summary.no_diagram_rows += 1;
      if (item.plain_text) {
        summary.no_diagram_plain_text_rows += 1;
      }
    }
    if (item.needs_image_asset) {
      summary.image_asset_required_rows += 1;
      if (item.image_assets.length > 0) {
        summary.image_asset_required_rows_with_assets += 1;
      } else {
        summary.missing_image_asset += 1;
      }
    }
    if (!hasEvidence) {
      summary.missing_evidence_bundle += 1;
    }
    if (!item.plain_text) {
      summary.missing_plain_text += 1;
    }
    incrementVersionSummary(summary, item, hasEvidence);
  }

  return summary;
}

function buildBlockers({ items, surface, evidenceByStorageKey }) {
  const blockers = [];
  for (const [storageKey, duplicateRows] of surface.duplicate_groups.entries()) {
    blockers.push({
      storage_key: storageKey,
      check: 'duplicate_surface_storage_key',
      count: duplicateRows.length,
      source_surface_manifests: duplicateRows.map((row) => row.source_surface_manifest),
    });
  }

  for (const item of items) {
    if (!evidenceByStorageKey.has(item.storage_key)) {
      blockers.push({
        storage_key: item.storage_key,
        check: 'missing_evidence_bundle',
        source_surface_manifest: item.source_surface_manifest,
      });
    }
    if (!item.plain_text) {
      blockers.push({
        storage_key: item.storage_key,
        check: 'missing_plain_text',
        source_surface_manifest: item.source_surface_manifest,
        source_evidence_bundle: item.source_evidence_bundle,
      });
    }
    if (item.needs_image_asset && item.image_assets.length === 0) {
      blockers.push({
        storage_key: item.storage_key,
        check: 'missing_image_asset_for_layout_dependent_question',
        source_surface_manifest: item.source_surface_manifest,
        source_evidence_bundle: item.source_evidence_bundle,
      });
    }
  }

  return blockers;
}

export function buildQuestionPlainTextLayer({
  rootDir = ROOT,
  subject = DEFAULTS.subject,
  generatedOn = DEFAULTS.generatedOn,
  surfaceRoot = DEFAULTS.surfaceRoot,
  evidenceRoot = DEFAULTS.evidenceRoot,
} = {}) {
  const surface = collectProductionSurfaceRows({ rootDir, subject, surfaceRoot });
  const evidence = collectEvidenceByStorageKey({ rootDir, subject, evidenceRoot });
  const items = surface.rows.map((surfaceRow) => buildPlainTextItem(
    surfaceRow,
    evidence.by_storage_key.get(surfaceRow.item.storage_key) ?? [],
  ));
  const blockers = buildBlockers({
    items,
    surface,
    evidenceByStorageKey: evidence.by_storage_key,
  });
  const summary = buildSummary({ items, surface, evidence, blockers });
  const status = blockers.length === 0 ? 'pass' : 'blocked';

  return {
    schema_version: '9709_question_plain_text_v1',
    status,
    verdict: status === 'pass' ? 'question-plain-text-ready' : 'question-plain-text-blocked',
    generated_on: generatedOn,
    subject_code: subject,
    source_contract: {
      production_surface_manifest_pattern: `${surfaceRoot}/${subject}_*_page_chain_surface_*.json`,
      evidence_bundle_pattern: `${evidenceRoot}/*${subject}*evidence-bundles*.json`,
      text_priority: [
        'surface.visual_disposition.question_text',
        'selected_evidence_bundle.evidence.ocr_text',
      ],
      evidence_selection: 'highest scoreEvidenceFile(repo_path), final > authority > date, deterministic path tie-break',
      scope_boundary: 'local canonical text export only; no OCR rerun, no external VLM/API call, no DB write, no RAG/search mutation',
      diagram_boundary: 'diagram/layout-dependent rows retain image_assets; no-diagram rows still carry audit crop/render provenance',
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
  const verdictLine = layer.status === 'pass'
    ? 'Verdict: pass. All production surface rows have canonical plain text; diagram/layout-dependent rows retain image asset references.'
    : `Verdict: blocked. ${layer.blockers.length} blocker(s) must be fixed before this text layer is complete.`;
  const s = layer.summary;
  const versionRows = [
    ['source version', 'surface manifests', 'rows', 'plain text', 'no diagram text', 'diagram text + image', 'missing evidence', 'missing text'],
    ...Object.entries(s.source_versions).sort(([left], [right]) => left.localeCompare(right)).map(([version, stats]) => [
      version,
      String(stats.surface_manifests),
      String(stats.production_rows),
      String(stats.plain_text_rows),
      `${stats.no_diagram_plain_text_rows}/${stats.no_diagram_rows}`,
      `${stats.diagram_rows_with_text_and_image_asset}/${stats.diagram_rows}`,
      String(stats.missing_evidence_bundle),
      String(stats.missing_plain_text),
    ]),
  ];

  const blockerLines = layer.blockers.length === 0
    ? '- none'
    : layer.blockers.slice(0, 25).map((blocker) => `- ${blocker.check}: ${blocker.storage_key}`).join('\n');
  const blockerSuffix = layer.blockers.length > 25
    ? `\n- ... ${layer.blockers.length - 25} more blocker(s) omitted from markdown; see JSON.`
    : '';

  return [
    '# 9709 question plain text v1 coverage',
    '',
    verdictLine,
    '',
    '## Scope',
    '',
    '- Subject: 9709 Mathematics',
    `- Generated on: ${layer.generated_on}`,
    `- JSON artifact: ${jsonOut}`,
    '- Boundary: local canonical text export only; no OCR rerun, no external VLM/API call, no DB write, no RAG/search mutation.',
    '- Text priority: `surface.visual_disposition.question_text`, then selected `evidence.ocr_text`.',
    '- Diagram/layout-dependent questions keep `image_assets`; no-diagram questions are text-addressable and still retain provenance paths.',
    '',
    '## Aggregate Gate',
    '',
    markdownTable([
      ['metric', 'value'],
      ['surface manifest files', String(s.surface_manifest_files)],
      ['evidence bundle files', String(s.evidence_bundle_files)],
      ['production rows', String(s.production_rows)],
      ['plain text rows', String(s.plain_text_rows)],
      ['no-diagram rows with plain text', `${s.no_diagram_plain_text_rows}/${s.no_diagram_rows}`],
      ['diagram rows with text + image asset', `${s.diagram_rows_with_text_and_image_asset}/${s.diagram_rows}`],
      ['layout-dependent rows with image asset', `${s.image_asset_required_rows_with_assets}/${s.image_asset_required_rows}`],
      ['duplicate storage keys', String(s.duplicate_storage_keys)],
      ['missing evidence bundle', String(s.missing_evidence_bundle)],
      ['missing plain text', String(s.missing_plain_text)],
      ['missing image asset', String(s.missing_image_asset)],
      ['blockers', String(s.blockers)],
    ]),
    '',
    '## Source Split',
    '',
    markdownTable(versionRows),
    '',
    '## Blockers',
    '',
    `${blockerLines}${blockerSuffix}`,
    '',
  ].join('\n');
}

export function writeQuestionPlainTextArtifacts({
  rootDir = ROOT,
  layer,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
} = {}) {
  writeJsonFile(rootDir, jsonOut, layer);
  writeTextFile(rootDir, markdownOut, buildMarkdownReport(layer, { jsonOut }));
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return 0;
  }

  const layer = buildQuestionPlainTextLayer(options);
  writeQuestionPlainTextArtifacts({ layer, ...options });
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
