#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const DEFAULTS = Object.freeze({
  generatedOn: '2026-06-05',
  selectionManifest: 'data/manifests/9231_production_ready_wave1_16_2026_06_05_manifest_v1.json',
  visualGateJson: 'docs/reports/2026-06-05-9231-visual-review-wave1-gate.json',
  plainTextV1Json: 'docs/reports/2026-06-05-9231-question-plain-text-v1.json',
  plainTextV2Json: 'docs/reports/2026-06-05-9231-question-plain-text-v2.json',
  authorityJson: 'docs/reports/2026-06-05-9231-authority-alignment-wave1.json',
  consumptionJson: 'docs/reports/2026-06-05-9231-question-plain-text-v2-consumption.json',
  jsonOut: 'docs/reports/2026-06-05-9231-evidence-layers-wave1-gate.json',
  markdownOut: 'docs/reports/2026-06-05-9231-evidence-layers-wave1-gate.md',
  reportsDir: 'docs/reports',
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
    'Usage: node scripts/learning/build_9231_evidence_layers_wave1_gate.js',
    '  [--generated-on <YYYY-MM-DD>]',
    '  [--selection-manifest <path>]',
    '  [--visual-gate-json <path>]',
    '  [--plain-text-v1-json <path>]',
    '  [--plain-text-v2-json <path>]',
    '  [--authority-json <path>]',
    '  [--consumption-json <path>]',
    '  [--json-out <path>]',
    '  [--markdown-out <path>]',
    '  [--reports-dir <path>]',
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
    if (token === '--selection-manifest') {
      options.selectionManifest = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--visual-gate-json') {
      options.visualGateJson = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--plain-text-v1-json') {
      options.plainTextV1Json = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--plain-text-v2-json') {
      options.plainTextV2Json = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--authority-json') {
      options.authorityJson = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--consumption-json') {
      options.consumptionJson = requiredValue(argv, index, token);
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
    if (token === '--reports-dir') {
      options.reportsDir = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }
  return options;
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

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => String(left).localeCompare(String(right)));
}

function countWhere(items, predicate) {
  return items.reduce((count, item) => count + (predicate(item) ? 1 : 0), 0);
}

function indexItems(items) {
  return new Map((items || []).filter((item) => item?.storage_key).map((item) => [item.storage_key, item]));
}

function kebabShardId(shardId) {
  return String(shardId).replaceAll('_', '-');
}

function shardCloseoutPaths({ generatedOn, reportsDir, shardId }) {
  const prefix = `${reportsDir}/${generatedOn}-${kebabShardId(shardId)}-evidence-layers-closeout`;
  return {
    json: `${prefix}.json`,
    markdown: `${prefix}.md`,
  };
}

function addBlocker(blockers, check, storageKey, extra = {}) {
  blockers.push({
    check,
    severity: 'blocker',
    storage_key: storageKey || null,
    ...extra,
  });
}

function buildRowEvidence({
  selectionItem,
  v1ByKey,
  v2ByKey,
  authorityByKey,
  consumptionByKey,
}) {
  const storageKey = selectionItem.storage_key;
  const v1 = v1ByKey.get(storageKey);
  const v2 = v2ByKey.get(storageKey);
  const authority = authorityByKey.get(storageKey);
  const consumption = consumptionByKey.get(storageKey);
  const blockers = [];

  if (selectionItem.visual_review_wave1_accepted !== true) {
    addBlocker(blockers, 'visual_review_not_accepted', storageKey);
  }
  if (!v1?.plain_text) {
    addBlocker(blockers, 'missing_question_plain_text_v1', storageKey);
  }
  if (!v2?.normalized_plain_text) {
    addBlocker(blockers, 'missing_question_plain_text_v2_normalized_plain_text', storageKey);
  }
  if (!authority || authority.component_authority?.status !== 'component_aligned_from_paper_code') {
    addBlocker(blockers, 'authority_component_alignment_missing', storageKey);
  }
  if (!consumption?.normalized_plain_text) {
    addBlocker(blockers, 'missing_consumption_row', storageKey);
  } else {
    if (consumption.search?.search_text_source !== 'question_plain_text_v2.normalized_plain_text') {
      addBlocker(blockers, 'search_not_using_normalized_plain_text', storageKey);
    }
    if (consumption.read_model?.prompt_representation?.value !== consumption.normalized_plain_text) {
      addBlocker(blockers, 'read_model_not_using_normalized_plain_text', storageKey);
    }
    if (consumption.rag?.content_source !== 'question_plain_text_v2.normalized_plain_text') {
      addBlocker(blockers, 'rag_not_using_normalized_plain_text', storageKey);
    }
  }

  return {
    storage_key: storageKey,
    shard_id: selectionItem.shard_id,
    source_manifest: selectionItem.source_manifest,
    source_manifest_index: selectionItem.source_manifest_index,
    source_pdf: selectionItem.source_pdf,
    q_number: selectionItem.q_number,
    visual_review_status: selectionItem.visual_review_wave1_status || null,
    plain_text_v1_ready: Boolean(v1?.plain_text),
    plain_text_v2_ready: Boolean(v2?.normalized_plain_text),
    normalized_plain_text: v2?.normalized_plain_text || null,
    text_only_ready: v2?.text_only_addressable === true,
    image_context_required: v2?.requires_image_context === true,
    primary_topic_path: authority?.primary_topic_path || v2?.primary_topic_path || null,
    authority_alignment_status: authority?.authority_alignment_status || null,
    canonical_syllabus_detailed_topic_claimed: authority?.canonical_syllabus_detailed_topic_claimed === true,
    local_consumption_gate_status: consumption ? consumption.text_consumption_status : null,
    search_uses_normalized_plain_text: consumption?.search?.search_text_source === 'question_plain_text_v2.normalized_plain_text',
    read_model_uses_normalized_plain_text: consumption?.read_model?.prompt_representation?.value === consumption?.normalized_plain_text,
    rag_uses_normalized_plain_text: consumption?.rag?.content_source === 'question_plain_text_v2.normalized_plain_text',
    blockers,
  };
}

function updateSurfaceItem(item, row, paths) {
  if (!row) {
    return item;
  }
  return {
    ...item,
    text_evidence_status: row.plain_text_v2_ready ? 'question_plain_text_v2_ready' : 'not_ready_missing_question_plain_text',
    normalized_plain_text: row.normalized_plain_text,
    text_consumption_status: row.local_consumption_gate_status || item.text_consumption_status,
    text_only_ready: row.text_only_ready,
    image_context_required: row.image_context_required,
    question_plain_text_v1_artifact: paths.plainTextV1Json,
    question_plain_text_v2_artifact: paths.plainTextV2Json,
    question_plain_text_v2_consumption_artifact: paths.consumptionJson,
    local_consumption_gate_status: row.local_consumption_gate_status,
    search_read_model_rag_local_consumption_gate_passed:
      row.search_uses_normalized_plain_text && row.read_model_uses_normalized_plain_text && row.rag_uses_normalized_plain_text,
    authority_alignment_artifact: paths.authorityJson,
    authority_alignment_status: row.authority_alignment_status,
    primary_topic_path: row.primary_topic_path,
    canonical_syllabus_detailed_topic_claimed: row.canonical_syllabus_detailed_topic_claimed,
    production_ready_claimed: false,
    db_consumption_claimed: false,
    search_consumption_claimed: false,
    rag_consumption_claimed: false,
  };
}

function summarizeShard({ shardId, rows, generatedOn, reportsDir }) {
  const blockers = rows.flatMap((row) => row.blockers || []);
  const paths = shardCloseoutPaths({ generatedOn, reportsDir, shardId });
  return {
    schema_version: '9231_evidence_layers_wave1_shard_closeout_v1',
    generated_on: generatedOn,
    subject_code: '9231',
    shard_id: shardId,
    status: blockers.length === 0 ? 'pass' : 'blocked',
    production_ready_claimed: false,
    summary: {
      rows: rows.length,
      visual_review_accepted_rows: countWhere(rows, (row) => row.visual_review_status === 'accepted'),
      normalized_plain_text_rows: countWhere(rows, (row) => row.plain_text_v2_ready),
      text_only_ready_rows: countWhere(rows, (row) => row.text_only_ready),
      image_context_required_rows: countWhere(rows, (row) => row.image_context_required),
      authority_component_aligned_rows: countWhere(rows, (row) => Boolean(row.authority_alignment_status)),
      local_consumption_gate_rows: countWhere(rows, (row) => row.search_uses_normalized_plain_text && row.read_model_uses_normalized_plain_text && row.rag_uses_normalized_plain_text),
      blockers: blockers.length,
    },
    artifacts: paths,
    blockers,
    rows,
  };
}

export function build9231EvidenceLayersWave1Gate({
  rootDir = ROOT,
  generatedOn = DEFAULTS.generatedOn,
  selectionManifest = DEFAULTS.selectionManifest,
  visualGateJson = DEFAULTS.visualGateJson,
  plainTextV1Json = DEFAULTS.plainTextV1Json,
  plainTextV2Json = DEFAULTS.plainTextV2Json,
  authorityJson = DEFAULTS.authorityJson,
  consumptionJson = DEFAULTS.consumptionJson,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
  reportsDir = DEFAULTS.reportsDir,
} = {}) {
  const selection = readJson(rootDir, selectionManifest);
  const visualGate = readJson(rootDir, visualGateJson);
  const v1 = readJson(rootDir, plainTextV1Json);
  const v2 = readJson(rootDir, plainTextV2Json);
  const authority = readJson(rootDir, authorityJson);
  const consumption = readJson(rootDir, consumptionJson);

  const v1ByKey = indexItems(v1.items);
  const v2ByKey = indexItems(v2.items);
  const authorityByKey = indexItems(authority.items);
  const consumptionByKey = indexItems(consumption.items);
  const rows = (selection.items || []).map((selectionItem) => buildRowEvidence({
    selectionItem,
    v1ByKey,
    v2ByKey,
    authorityByKey,
    consumptionByKey,
  }));
  const blockers = rows.flatMap((row) => row.blockers || []);
  if (visualGate.status !== 'pass') {
    addBlocker(blockers, 'visual_gate_not_pass', null, { status: visualGate.status });
  }
  for (const [artifactName, artifact] of [
    ['question_plain_text_v1', v1],
    ['question_plain_text_v2', v2],
    ['authority_alignment', authority],
    ['question_plain_text_v2_consumption', consumption],
  ]) {
    if (artifact.status !== 'pass') {
      addBlocker(blockers, `${artifactName}_artifact_not_pass`, null, { status: artifact.status });
    }
  }

  const rowsByStorageKey = new Map(rows.map((row) => [row.storage_key, row]));
  const sourceManifests = unique((selection.items || []).map((item) => item.source_manifest));
  const paths = { plainTextV1Json, plainTextV2Json, authorityJson, consumptionJson };
  const updatedSurfaces = sourceManifests.map((sourceManifest) => {
    const surface = readJson(rootDir, sourceManifest);
    return {
      path: sourceManifest,
      payload: {
        ...surface,
        items: (surface.items || []).map((item) => updateSurfaceItem(item, rowsByStorageKey.get(item.storage_key), paths)),
        evidence_layers_wave1_gate: {
          schema_version: '9231_evidence_layers_wave1_surface_gate_v1',
          generated_on: generatedOn,
          status: blockers.length === 0 ? 'pass' : 'blocked',
          gate_json: jsonOut,
          production_ready_claimed: false,
          live_db_consumption_claimed: false,
          deployed_search_consumption_claimed: false,
          online_rag_ingestion_claimed: false,
        },
      },
    };
  });

  const rowsByShard = new Map();
  for (const row of rows) {
    const shardRows = rowsByShard.get(row.shard_id) || [];
    shardRows.push(row);
    rowsByShard.set(row.shard_id, shardRows);
  }
  const shards = [...rowsByShard.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([shardId, shardRows]) => summarizeShard({
      shardId,
      rows: shardRows,
      generatedOn,
      reportsDir,
    }));

  const status = blockers.length === 0 ? 'pass' : 'blocked';
  const result = {
    schema_version: '9231_evidence_layers_wave1_gate_v1',
    generated_on: generatedOn,
    subject_code: '9231',
    status,
    verdict: status === 'pass' ? 'evidence-layers-ready-local-consumption-proven' : 'evidence-layers-blocked',
    production_ready_claimed: false,
    boundary: {
      external_vlm_or_api_used_for_visual_review: true,
      external_ocr_rerun_used: false,
      question_plain_text_v1_v2_ready: status === 'pass',
      local_search_read_model_rag_consumption_gate_proven: status === 'pass',
      live_db_consumption_claimed: false,
      deployed_search_consumption_claimed: false,
      online_rag_ingestion_claimed: false,
      canonical_syllabus_detailed_topic_claimed: false,
    },
    artifacts: {
      selection_manifest: selectionManifest,
      visual_gate_json: visualGateJson,
      plain_text_v1_json: plainTextV1Json,
      plain_text_v2_json: plainTextV2Json,
      authority_json: authorityJson,
      consumption_json: consumptionJson,
      json: jsonOut,
      markdown: markdownOut,
    },
    summary: {
      selected_shards: rowsByShard.size,
      selected_rows: rows.length,
      visual_review_accepted_rows: countWhere(rows, (row) => row.visual_review_status === 'accepted'),
      plain_text_v1_rows: countWhere(rows, (row) => row.plain_text_v1_ready),
      normalized_plain_text_rows: countWhere(rows, (row) => row.plain_text_v2_ready),
      text_only_ready_rows: countWhere(rows, (row) => row.text_only_ready),
      image_context_required_rows: countWhere(rows, (row) => row.image_context_required),
      authority_component_aligned_rows: authority.summary?.component_aligned_rows || 0,
      authority_topic_hint_rows: authority.summary?.topic_hint_rows || 0,
      authority_detailed_topic_unresolved_rows: authority.summary?.detailed_topic_unresolved_rows || 0,
      search_rows_using_normalized_plain_text: consumption.summary?.search_rows_using_normalized_plain_text || 0,
      read_model_rows_using_normalized_plain_text: consumption.summary?.read_model_rows_using_normalized_plain_text || 0,
      rag_rows_using_normalized_plain_text: consumption.summary?.rag_rows_using_normalized_plain_text || 0,
      legacy_search_text_only_rows: consumption.summary?.legacy_search_text_only_rows || 0,
      updated_surface_manifests: updatedSurfaces.length,
      blockers: blockers.length,
    },
    blockers,
    shards,
    rows,
    updated_surfaces: updatedSurfaces,
    updated_selection_manifest: {
      ...selection,
      evidence_layers_wave1_gate: {
        schema_version: '9231_evidence_layers_wave1_manifest_gate_v1',
        generated_on: generatedOn,
        status,
        gate_json: jsonOut,
        gate_markdown: markdownOut,
        production_ready_claimed: false,
        local_consumption_gate_proven: status === 'pass',
      },
      summary: {
        ...(selection.summary || {}),
        evidence_layers_wave1_rows: rows.length,
        evidence_layers_wave1_normalized_plain_text_rows: countWhere(rows, (row) => row.plain_text_v2_ready),
        evidence_layers_wave1_text_only_ready_rows: countWhere(rows, (row) => row.text_only_ready),
        evidence_layers_wave1_image_context_required_rows: countWhere(rows, (row) => row.image_context_required),
      },
      items: (selection.items || []).map((item) => {
        const row = rowsByStorageKey.get(item.storage_key);
        return {
          ...item,
          evidence_layers_wave1_status: row?.blockers?.length ? 'blocked' : status,
          normalized_plain_text_ready: row?.plain_text_v2_ready === true,
          text_only_ready: row?.text_only_ready === true,
          image_context_required: row?.image_context_required === true,
          primary_topic_path: row?.primary_topic_path || null,
          local_consumption_gate_status: row?.local_consumption_gate_status || null,
          production_ready_claimed: false,
        };
      }),
    },
  };

  return result;
}

function markdownTable(rows) {
  return rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
}

function renderShardMarkdown(shard) {
  const s = shard.summary;
  const blockerLines = shard.blockers.length
    ? shard.blockers.map((blocker) => `- ${blocker.check}: ${blocker.storage_key}`).join('\n')
    : '- none';
  return [
    `# 9231 ${shard.shard_id} Evidence Layers Closeout`,
    '',
    `- status: \`${shard.status}\``,
    `- production_ready_claimed: \`${shard.production_ready_claimed}\``,
    '',
    '## Counts',
    '',
    markdownTable([
      ['metric', 'value'],
      ['rows', String(s.rows)],
      ['visual review accepted rows', String(s.visual_review_accepted_rows)],
      ['normalized_plain_text rows', String(s.normalized_plain_text_rows)],
      ['text-only ready rows', String(s.text_only_ready_rows)],
      ['image-context required rows', String(s.image_context_required_rows)],
      ['authority component aligned rows', String(s.authority_component_aligned_rows)],
      ['local consumption gate rows', String(s.local_consumption_gate_rows)],
      ['blockers', String(s.blockers)],
    ]),
    '',
    '## Blockers',
    '',
    blockerLines,
    '',
  ].join('\n');
}

export function render9231EvidenceLayersWave1Markdown(result) {
  const s = result.summary;
  const blockerLines = result.blockers.length
    ? result.blockers.slice(0, 25).map((blocker) => `- ${blocker.check}: ${blocker.storage_key || 'artifact'}`).join('\n')
    : '- none';
  return [
    '# 9231 evidence layers wave1 gate',
    '',
    `- status: \`${result.status}\``,
    `- verdict: \`${result.verdict}\``,
    `- production_ready_claimed: \`${result.production_ready_claimed}\``,
    '- Boundary: local evidence layers and local consumption are proven; live DB/deployed search/online RAG ingestion are not claimed.',
    '- Authority boundary: component-level alignment and deterministic topic hints are recorded; canonical syllabus detailed topic is not claimed.',
    '',
    '## Counts',
    '',
    markdownTable([
      ['metric', 'value'],
      ['selected shards', String(s.selected_shards)],
      ['selected rows', String(s.selected_rows)],
      ['visual review accepted rows', String(s.visual_review_accepted_rows)],
      ['plain_text_v1 rows', String(s.plain_text_v1_rows)],
      ['normalized_plain_text rows', String(s.normalized_plain_text_rows)],
      ['text-only ready rows', String(s.text_only_ready_rows)],
      ['image-context required rows', String(s.image_context_required_rows)],
      ['authority component aligned rows', String(s.authority_component_aligned_rows)],
      ['authority topic hint rows', String(s.authority_topic_hint_rows)],
      ['authority detailed topic unresolved rows', String(s.authority_detailed_topic_unresolved_rows)],
      ['search rows using normalized_plain_text', String(s.search_rows_using_normalized_plain_text)],
      ['read-model rows using normalized_plain_text', String(s.read_model_rows_using_normalized_plain_text)],
      ['RAG rows using normalized_plain_text', String(s.rag_rows_using_normalized_plain_text)],
      ['legacy search_text-only rows', String(s.legacy_search_text_only_rows)],
      ['updated surface manifests', String(s.updated_surface_manifests)],
      ['blockers', String(s.blockers)],
    ]),
    '',
    '## Shards',
    '',
    '| shard | status | rows | text-only | image-context | blockers | closeout |',
    '| --- | --- | ---: | ---: | ---: | ---: | --- |',
    ...result.shards.map((shard) => `| \`${shard.shard_id}\` | \`${shard.status}\` | ${shard.summary.rows} | ${shard.summary.text_only_ready_rows} | ${shard.summary.image_context_required_rows} | ${shard.summary.blockers} | \`${shard.artifacts.markdown}\` |`),
    '',
    '## Blockers',
    '',
    blockerLines,
    '',
  ].join('\n');
}

export function write9231EvidenceLayersWave1Artifacts(result, {
  rootDir = ROOT,
  selectionManifest = DEFAULTS.selectionManifest,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
} = {}) {
  for (const surface of result.updated_surfaces) {
    writeJson(rootDir, surface.path, surface.payload);
  }
  writeJson(rootDir, selectionManifest, result.updated_selection_manifest);
  for (const shard of result.shards) {
    writeJson(rootDir, shard.artifacts.json, shard);
    writeText(rootDir, shard.artifacts.markdown, renderShardMarkdown(shard));
  }
  const persisted = {
    ...result,
    updated_surfaces: result.updated_surfaces.map((surface) => ({
      path: surface.path,
      item_count: surface.payload.items?.length || 0,
    })),
    updated_selection_manifest: selectionManifest,
  };
  writeJson(rootDir, jsonOut, persisted);
  writeText(rootDir, markdownOut, render9231EvidenceLayersWave1Markdown(result));
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return 0;
  }
  const result = build9231EvidenceLayersWave1Gate(options);
  write9231EvidenceLayersWave1Artifacts(result, {
    rootDir: options.rootDir || ROOT,
    selectionManifest: options.selectionManifest,
    jsonOut: options.jsonOut,
    markdownOut: options.markdownOut,
  });
  writeStdoutLine(JSON.stringify({
    status: result.status,
    verdict: result.verdict,
    production_ready_claimed: result.production_ready_claimed,
    summary: result.summary,
  }, null, 2));
  if (result.status !== 'pass') {
    throw new Error('9231 evidence layers wave1 gate failed.');
  }
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    writeStderrLine(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
