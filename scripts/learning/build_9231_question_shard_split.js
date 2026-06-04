#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const SOURCE_SURFACE_SCHEMA_VERSION = '9231_question_row_foundation_page_chain_surface_v1';
const INPUT_SCHEMA_VERSION = '9231_question_shard_split_input_v1';
const SURFACE_SCHEMA_VERSION = '9231_question_shard_split_page_chain_surface_v1';
const COMBINED_SCHEMA_VERSION = '9231_question_shard_split_manifest_v1';
const REPORT_SCHEMA_VERSION = '9231_question_shard_split_gate_report_v1';

const DEFAULTS = Object.freeze({
  subject: '9231',
  generatedOn: '2026-06-04',
  manifestRoot: 'data/manifests',
  reportsRoot: 'docs/reports',
  combinedManifestOut: 'data/manifests/9231_question_shard_split_2026_06_04_manifest_v1.json',
  jsonOut: 'docs/reports/2026-06-04-9231-question-shard-split-gate.json',
  markdownOut: 'docs/reports/2026-06-04-9231-question-shard-split-gate.md',
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
    if (token === '--manifest-root') {
      options.manifestRoot = requiredValue(argv, index, token);
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
    'Usage: node scripts/learning/build_9231_question_shard_split.js',
    '  [--generated-on <YYYY-MM-DD>]',
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

function readJsonFile(rootDir, repoPath) {
  return JSON.parse(fs.readFileSync(resolveFromRoot(rootDir, repoPath), 'utf8'));
}

function listJsonFiles(rootDir, repoDir) {
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
      if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(entryPath);
      }
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

function rowSort(left, right) {
  return (
    String(left.session_year).localeCompare(String(right.session_year))
    || Number(left.variant) - Number(right.variant)
    || Number(left.q_number) - Number(right.q_number)
    || String(left.storage_key).localeCompare(String(right.storage_key))
  );
}

function groupSort(left, right) {
  return (
    Number(left.paper) - Number(right.paper)
    || String(left.session_year).localeCompare(String(right.session_year))
  );
}

export function shardIdForRow(row, subject = DEFAULTS.subject) {
  return `${subject}_p${row.paper}_${row.session_year}_standard_001`;
}

function groupKeyForRow(row) {
  return `p${row.paper}_${row.session_year}_standard`;
}

function inputManifestPathForShard(manifestRoot, shardId) {
  return `${manifestRoot}/${shardId}_input_v1.json`;
}

function surfaceManifestPathForShard(manifestRoot, shardId) {
  return `${manifestRoot}/${shardId}_page_chain_surface_v1.json`;
}

function loadSourceSurfaceRows({ rootDir, manifestRoot, subject }) {
  const sourceFiles = listJsonFiles(rootDir, manifestRoot)
    .map((filePath) => toRepoPath(rootDir, filePath))
    .filter((repoPath) => new RegExp(`^${manifestRoot}/${subject}_p\\d_source_locator_001_page_chain_surface_v1\\.json$`).test(repoPath));

  const rows = [];
  const blockers = [];
  for (const repoPath of sourceFiles) {
    const payload = readJsonFile(rootDir, repoPath);
    if (payload.schema_version !== SOURCE_SURFACE_SCHEMA_VERSION) {
      blockers.push({
        check: 'unexpected_source_surface_schema',
        severity: 'blocker',
        source_manifest: repoPath,
        schema_version: payload.schema_version || null,
      });
    }
    const items = Array.isArray(payload.items) ? payload.items : [];
    for (const [index, row] of items.entries()) {
      rows.push({
        ...row,
        source_locator_surface_manifest_path: repoPath,
        source_locator_surface_manifest_index: index,
        source_locator_shard_id: row.shard_id || payload.shard_id || null,
      });
    }
  }

  return { sourceFiles, rows, blockers };
}

function validateRows(rows) {
  const blockers = [];
  const seenStorageKeys = new Set();
  for (const row of rows) {
    for (const key of ['storage_key', 'source_pdf', 'paper', 'session_year', 'q_number']) {
      if (row[key] === undefined || row[key] === null || row[key] === '') {
        blockers.push({
          check: 'source_row_required_field_missing',
          severity: 'blocker',
          storage_key: row.storage_key || null,
          field: key,
        });
      }
    }
    if (seenStorageKeys.has(row.storage_key)) {
      blockers.push({
        check: 'duplicate_storage_key',
        severity: 'blocker',
        storage_key: row.storage_key,
      });
    }
    seenStorageKeys.add(row.storage_key);
  }
  return blockers;
}

export function groupRowsIntoSessionYearShards(rows, subject = DEFAULTS.subject) {
  const byShard = new Map();
  for (const row of rows) {
    const shardId = shardIdForRow(row, subject);
    if (!byShard.has(shardId)) {
      byShard.set(shardId, {
        shard_id: shardId,
        group_key: groupKeyForRow(row),
        paper: Number(row.paper),
        session_year: row.session_year,
        items: [],
      });
    }
    byShard.get(shardId).items.push(row);
  }

  return [...byShard.values()]
    .sort(groupSort)
    .map((group) => ({
      ...group,
      items: group.items.sort(rowSort),
    }));
}

function splitRow(row, group) {
  return {
    ...row,
    source_locator_shard_id: row.source_locator_shard_id || row.shard_id || null,
    source_locator_surface_manifest_path: row.source_locator_surface_manifest_path || null,
    source_locator_surface_manifest_index: row.source_locator_surface_manifest_index ?? null,
    shard_id: group.shard_id,
    group_key: group.group_key,
    paper_family: 'standard',
    route_hint: row.route_hint || 'pdf_page_chain_locator',
    surface_evidence_status: 'locator_resolved_pending_crop_render_and_visual_review',
    page_chain_surface_status: 'locator_rows_ready_pending_crop_render_visual_review',
    crop_status: 'not_generated',
    rendered_pdf_page_paths: [],
    crop_paths: [],
    review_crop_paths: [],
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
}

function inputItem(row) {
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
    source_locator_shard_id: row.source_locator_shard_id,
    source_locator_surface_manifest_path: row.source_locator_surface_manifest_path,
    source_locator_surface_manifest_index: row.source_locator_surface_manifest_index,
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
  groups,
  generatedOn,
  manifestRoot,
  combinedManifestId,
  subject,
}) {
  const inputManifests = [];
  const surfaceManifests = [];
  for (const group of groups) {
    const splitItems = group.items.map((row) => splitRow(row, group));
    const sourcePdfPaths = [...new Set(splitItems.map((row) => row.source_pdf))].sort();
    const inputPath = inputManifestPathForShard(manifestRoot, group.shard_id);
    const surfacePath = surfaceManifestPathForShard(manifestRoot, group.shard_id);
    const inputPayload = {
      schema_version: INPUT_SCHEMA_VERSION,
      manifest_id: `${group.shard_id}_input_v1`,
      generated_on: generatedOn,
      source_manifest_id: combinedManifestId,
      subject_code: subject,
      shard_id: group.shard_id,
      group_key: group.group_key,
      paper: group.paper,
      session_year: group.session_year,
      paper_set: [group.paper],
      session_year_set: [group.session_year],
      source_locator_surface_manifest_paths: [...new Set(splitItems.map((row) => row.source_locator_surface_manifest_path))].filter(Boolean).sort(),
      stage: 'deterministic source locator shard split input rows',
      item_count: splitItems.length,
      source_pdf_count: sourcePdfPaths.length,
      source_pdf_paths: sourcePdfPaths,
      boundary: {
        production_ready_claimed: false,
        canonical_question_text_claimed: false,
        normalized_plain_text_claimed: false,
        db_consumption_claimed: false,
        search_consumption_claimed: false,
        rag_consumption_claimed: false,
        external_vlm_or_api_used: false,
        external_ocr_rerun_used: false,
      },
      items: splitItems.map(inputItem),
    };
    inputManifests.push({ path: inputPath, item_count: splitItems.length, payload: inputPayload });

    const surfacePayload = {
      schema_version: SURFACE_SCHEMA_VERSION,
      manifest_id: `${group.shard_id}_page_chain_surface_v1`,
      generated_on: generatedOn,
      source_manifest_id: combinedManifestId,
      source_input_manifest_id: inputPayload.manifest_id,
      input_manifest_path: inputPath,
      subject_code: subject,
      shard_id: group.shard_id,
      group_key: group.group_key,
      paper: group.paper,
      session_year: group.session_year,
      paper_set: [group.paper],
      session_year_set: [group.session_year],
      source_locator_surface_manifest_paths: inputPayload.source_locator_surface_manifest_paths,
      stage: 'deterministic locator shard-split page-chain question-row surface',
      item_count: splitItems.length,
      source_pdf_count: sourcePdfPaths.length,
      source_pdf_paths: sourcePdfPaths,
      surface_status: 'locator_rows_ready_pending_crop_render_visual_review',
      boundary: {
        local_deterministic_shard_split: true,
        production_ready_claimed: false,
        canonical_question_text_claimed: false,
        normalized_plain_text_claimed: false,
        db_consumption_claimed: false,
        search_consumption_claimed: false,
        rag_consumption_claimed: false,
        external_vlm_or_api_used: false,
        external_ocr_rerun_used: false,
      },
      items: splitItems,
    };
    surfaceManifests.push({ path: surfacePath, item_count: splitItems.length, payload: surfacePayload });
  }

  return { inputManifests, surfaceManifests };
}

function artifactSummary({ combinedManifestOut, inputManifests, surfaceManifests, jsonOut, markdownOut }) {
  return {
    combined_manifest: { path: combinedManifestOut },
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

export function buildQuestionShardSplit({
  rootDir = ROOT,
  subject = DEFAULTS.subject,
  generatedOn = DEFAULTS.generatedOn,
  manifestRoot = DEFAULTS.manifestRoot,
  combinedManifestOut = DEFAULTS.combinedManifestOut,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
  workflowGaps = [],
} = {}) {
  const { sourceFiles, rows, blockers: loadBlockers } = loadSourceSurfaceRows({ rootDir, manifestRoot, subject });
  const rowBlockers = validateRows(rows);
  const groups = groupRowsIntoSessionYearShards(rows, subject);
  const blockers = [...loadBlockers, ...rowBlockers];
  const combinedManifestId = path.posix.basename(combinedManifestOut).replace(/\.json$/i, '');
  const { inputManifests, surfaceManifests } = buildShardPayloads({
    groups,
    generatedOn,
    manifestRoot,
    combinedManifestId,
    subject,
  });

  const surfaceItems = surfaceManifests.flatMap((manifest) => manifest.payload.items);
  const summary = {
    source_surface_manifest_count: sourceFiles.length,
    source_surface_manifest_paths: sourceFiles,
    source_row_count: rows.length,
    shard_count: groups.length,
    input_manifest_count: inputManifests.length,
    page_chain_surface_manifest_count: surfaceManifests.length,
    source_pdf_count: new Set(surfaceItems.map((row) => row.source_pdf)).size,
    question_row_count: surfaceItems.length,
    shards_by_paper: countBy(groups, (group) => `p${group.paper}`),
    question_rows_by_paper: countBy(surfaceItems, (row) => `p${row.paper}`),
    source_pdfs_by_paper: countBy(
      [...new Map(surfaceItems.map((row) => [row.source_pdf, row])).values()],
      (row) => `p${row.paper}`,
    ),
    question_rows_by_session_year: countBy(surfaceItems, (row) => row.session_year),
    text_only_ready_rows: surfaceItems.filter((row) => row.text_only_ready).length,
    image_context_required_rows: surfaceItems.filter((row) => row.image_context_required).length,
    blocker_count: blockers.length,
  };
  const gateStatus = blockers.length === 0 && summary.question_row_count > 0
    ? 'shard_split_ready_pending_crop_render_text_gates'
    : 'blocked_by_shard_split_gaps';

  const combinedManifest = {
    schema_version: COMBINED_SCHEMA_VERSION,
    manifest_id: combinedManifestId,
    generated_on: generatedOn,
    subject_code: subject,
    gate_status: gateStatus,
    scope: {
      stage: 'deterministic question-row shard split',
      source: '9231 paper-level source locator foundation manifests',
      shard_granularity: 'paper + session_year + standard source family',
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
      session_year: manifest.payload.session_year,
      input_manifest_path: manifest.payload.input_manifest_path,
      page_chain_surface_manifest_path: manifest.path,
      source_pdf_count: manifest.payload.source_pdf_count,
      question_row_count: manifest.item_count,
      surface_status: manifest.payload.surface_status,
    })),
    blockers,
  };

  return {
    schema_version: REPORT_SCHEMA_VERSION,
    generated_on: generatedOn,
    subject_code: subject,
    gate_status: gateStatus,
    boundary: {
      local_deterministic_shard_split_gate: true,
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
    summary,
    blockers,
    sample_shards: combinedManifest.shards.slice(0, 20),
    sample_rows: surfaceItems.slice(0, 10),
    combined_manifest: combinedManifest,
    artifacts: {
      combined_manifest: { path: combinedManifestOut, payload: combinedManifest },
      input_manifests: inputManifests,
      page_chain_surface_manifests: surfaceManifests,
      reports: { json: jsonOut, markdown: markdownOut },
    },
    workflow_gaps: [...workflowGaps],
    verification_inputs: [
      'git status --short --branch',
      'npm run workflow:codex-preflight -- --json',
      'data/manifests/9231_p{1..4}_source_locator_001_page_chain_surface_v1.json',
      'data/manifests/9231_p{1..4}_{sessionYear}_standard_001_input_v1.json',
      'data/manifests/9231_p{1..4}_{sessionYear}_standard_001_page_chain_surface_v1.json',
    ],
  };
}

function slimReport(split) {
  return {
    schema_version: split.schema_version,
    generated_on: split.generated_on,
    subject_code: split.subject_code,
    gate_status: split.gate_status,
    boundary: split.boundary,
    summary: split.summary,
    blockers: split.blockers,
    artifacts: artifactSummary({
      combinedManifestOut: split.artifacts.combined_manifest.path,
      inputManifests: split.artifacts.input_manifests,
      surfaceManifests: split.artifacts.page_chain_surface_manifests,
      jsonOut: split.artifacts.reports.json,
      markdownOut: split.artifacts.reports.markdown,
    }),
    sample_shards: split.sample_shards,
    sample_rows: split.sample_rows,
    workflow_gaps: split.workflow_gaps,
    verification_inputs: split.verification_inputs,
  };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell)).join(' | ')} |`),
  ].join('\n');
}

export function renderQuestionShardSplitMarkdown(split) {
  const summary = split.summary;
  const artifacts = artifactSummary({
    combinedManifestOut: split.artifacts.combined_manifest.path,
    inputManifests: split.artifacts.input_manifests,
    surfaceManifests: split.artifacts.page_chain_surface_manifests,
    jsonOut: split.artifacts.reports.json,
    markdownOut: split.artifacts.reports.markdown,
  });
  const lines = [
    '# 9231 Question Shard Split Gate',
    '',
    `- generated_on: \`${split.generated_on}\``,
    `- gate_status: \`${split.gate_status}\``,
    '- This is not production-ready and does not claim canonical question text.',
    '- No external VLM/API or OCR rerun was used.',
    '- DB/search/RAG consumption claimed: false.',
    '',
    '## Repo-Truth Conclusion',
    '',
    split.gate_status === 'shard_split_ready_pending_crop_render_text_gates'
      ? 'Conclusion: 9231 row foundation has been split into 9709-style paper/session-year shard manifests, pending local crop/render, OCR/text evidence, v1/v2 text, and normalized_plain_text consumption gates.'
      : 'Conclusion: 9231 shard split remains blocked by manifest gaps listed below.',
    '',
    '## Gate Counts',
    '',
    markdownTable(['metric', 'value'], [
      ['source row count', summary.source_row_count],
      ['shard count', summary.shard_count],
      ['input manifests', summary.input_manifest_count],
      ['page-chain surface manifests', summary.page_chain_surface_manifest_count],
      ['question row count', summary.question_row_count],
      ['text-only ready rows', summary.text_only_ready_rows],
      ['image-context required rows', summary.image_context_required_rows],
      ['blockers', summary.blocker_count],
      ['DB/search/RAG consumption claimed', false],
    ]),
    '',
    '## Paper Split',
    '',
    markdownTable(['paper', 'shards', 'question rows'], Object.keys(summary.shards_by_paper || {})
      .sort(numericPaperSort)
      .map((paper) => [
        paper,
        summary.shards_by_paper[paper],
        summary.question_rows_by_paper[paper] || 0,
      ])),
    '',
    '## Artifacts',
    '',
    markdownTable(['artifact', 'path', 'rows'], [
      ['combined manifest', artifacts.combined_manifest.path, summary.question_row_count],
      ['input manifests', `${artifacts.input_manifests.length} files`, summary.question_row_count],
      ['page-chain surface manifests', `${artifacts.page_chain_surface_manifests.length} files`, summary.question_row_count],
      ['report json', artifacts.reports.json, 'n/a'],
      ['report markdown', artifacts.reports.markdown, 'n/a'],
    ]),
    '',
    '## Blockers',
    '',
  ];

  if (split.blockers.length === 0) {
    lines.push('- none');
  } else {
    for (const blocker of split.blockers) {
      lines.push(`- ${blocker.check}: ${blocker.source_manifest || blocker.storage_key || ''}`);
    }
  }

  lines.push(
    '',
    '## Next Executable Gates',
    '',
    '- Choose one shard, for example `9231_p1_s25_standard_001`, and run local render/crop validation against only that shard.',
    '- Attach row-level OCR/text evidence for that shard without external VLM/API unless scope is explicitly expanded.',
    '- Build shard-scoped question_plain_text_v1/v2 after crop/text evidence exists.',
    '- Run shard-scoped normalized_plain_text consumption gate before claiming search/read-model/RAG consumption.',
    '',
    '## Verification Inputs',
    '',
  );
  for (const input of split.verification_inputs) {
    lines.push(`- \`${input}\``);
  }
  if (split.workflow_gaps.length > 0) {
    lines.push('', '## Workflow Gaps', '');
    for (const gap of split.workflow_gaps) {
      lines.push(`- ${gap}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export function writeQuestionShardSplitArtifacts(rootDir, split) {
  writeJsonFile(rootDir, split.artifacts.combined_manifest.path, split.artifacts.combined_manifest.payload);
  for (const manifest of split.artifacts.input_manifests) {
    writeJsonFile(rootDir, manifest.path, manifest.payload);
  }
  for (const manifest of split.artifacts.page_chain_surface_manifests) {
    writeJsonFile(rootDir, manifest.path, manifest.payload);
  }
  writeJsonFile(rootDir, split.artifacts.reports.json, slimReport(split));
  writeTextFile(rootDir, split.artifacts.reports.markdown, renderQuestionShardSplitMarkdown(split));
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return 0;
  }

  const split = buildQuestionShardSplit({
    rootDir: ROOT,
    ...options,
  });
  if (options.writeArtifacts) {
    writeQuestionShardSplitArtifacts(ROOT, split);
  }
  writeStdoutLine(JSON.stringify({
    gate_status: split.gate_status,
    source_row_count: split.summary.source_row_count,
    shard_count: split.summary.shard_count,
    question_row_count: split.summary.question_row_count,
    shards_by_paper: split.summary.shards_by_paper,
    question_rows_by_paper: split.summary.question_rows_by_paper,
    text_only_ready_rows: split.summary.text_only_ready_rows,
    image_context_required_rows: split.summary.image_context_required_rows,
    blockers: split.summary.blocker_count,
    artifacts: artifactSummary({
      combinedManifestOut: split.artifacts.combined_manifest.path,
      inputManifests: split.artifacts.input_manifests,
      surfaceManifests: split.artifacts.page_chain_surface_manifests,
      jsonOut: split.artifacts.reports.json,
      markdownOut: split.artifacts.reports.markdown,
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
