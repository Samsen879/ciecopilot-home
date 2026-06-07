#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const DEFAULT_EXPECTED_SHARD_COUNTS = Object.freeze({
  '9231_p1_s20_standard_001': 21,
  '9231_p1_w19_standard_001': 33,
  '9231_p2_s20_standard_001': 24,
  '9231_p2_w19_standard_001': 33,
  '9231_p3_s20_standard_001': 21,
  '9231_p4_s20_standard_001': 18,
});

const DEFAULTS = Object.freeze({
  generatedOn: '2026-06-07',
  visualGateJson: 'docs/reports/2026-06-07-9231-wm-final-visual-review-gate.json',
  plainTextV1Json: 'docs/reports/2026-06-07-9231-wm-final-question-plain-text-v1.json',
  plainTextV2Json: 'docs/reports/2026-06-07-9231-wm-final-question-plain-text-v2.json',
  authorityJson: 'docs/reports/2026-06-07-9231-wm-final-authority-alignment.json',
  consumptionJson: 'docs/reports/2026-06-07-9231-wm-final-question-plain-text-v2-consumption.json',
  jsonOut: 'docs/reports/2026-06-07-9231-wm-final-evidence-layers-gate.json',
  markdownOut: 'docs/reports/2026-06-07-9231-wm-final-evidence-layers-gate.md',
  reportsDir: 'docs/reports',
});

const NORMALIZED_TEXT_SOURCE = 'question_plain_text_v2.normalized_plain_text';

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
    'Usage: node scripts/learning/build_9231_wm_final_evidence_layers_gate.js',
    '  [--generated-on <YYYY-MM-DD>]',
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

function sourceManifestPath(shardId) {
  return `data/manifests/${shardId}_page_chain_surface_v1.json`;
}

function shardCloseoutPaths({ generatedOn, reportsDir, shardId }) {
  const prefix = `${reportsDir}/${generatedOn}-${kebabShardId(shardId)}-evidence-layers-closeout`;
  return {
    json: `${prefix}.json`,
    markdown: `${prefix}.md`,
  };
}

function addBlocker(blockers, check, storageKey = null, extra = {}) {
  blockers.push({
    check,
    severity: 'blocker',
    storage_key: storageKey || null,
    ...extra,
  });
}

function loadSurfaceRows(rootDir, expectedShardCounts, blockers) {
  const records = [];
  const rows = [];
  for (const [shardId, expectedCount] of Object.entries(expectedShardCounts)) {
    const sourceManifest = sourceManifestPath(shardId);
    const surface = readJson(rootDir, sourceManifest);
    const items = Array.isArray(surface.items) ? surface.items : [];
    if (items.length !== expectedCount || Number(surface.item_count || items.length) !== expectedCount) {
      addBlocker(blockers, 'surface_manifest_shard_count_mismatch', null, {
        shard_id: shardId,
        expected_rows: expectedCount,
        actual_rows: items.length,
        item_count: surface.item_count ?? null,
      });
    }
    const storageKeys = items.map((item) => item.storage_key).filter(Boolean);
    if (new Set(storageKeys).size !== storageKeys.length) {
      addBlocker(blockers, 'duplicate_surface_storage_key', null, { shard_id: shardId });
    }
    records.push({
      path: sourceManifest,
      payload: surface,
      shard_id: shardId,
      items,
    });
    items.forEach((item, index) => {
      rows.push({
        ...item,
        shard_id: item.shard_id || shardId,
        source_manifest: sourceManifest,
        source_manifest_index: index,
      });
    });
  }
  return {
    records,
    rows,
  };
}

function buildRowEvidence({
  surfaceRow,
  v1ByKey,
  v2ByKey,
  authorityByKey,
  consumptionByKey,
}) {
  const storageKey = surfaceRow.storage_key;
  const v1 = v1ByKey.get(storageKey);
  const v2 = v2ByKey.get(storageKey);
  const authority = authorityByKey.get(storageKey);
  const consumption = consumptionByKey.get(storageKey);
  const blockers = [];
  const visualAccepted = surfaceRow.visual_review_status === 'accepted'
    || surfaceRow.surface_evidence_status === 'external_vlm_wm_final_visual_review_accepted';

  if (!visualAccepted) {
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
    if (consumption.search?.search_text_source !== NORMALIZED_TEXT_SOURCE) {
      addBlocker(blockers, 'search_not_using_normalized_plain_text', storageKey);
    }
    if (consumption.read_model?.prompt_representation?.value !== consumption.normalized_plain_text) {
      addBlocker(blockers, 'read_model_not_using_normalized_plain_text', storageKey);
    }
    if (consumption.rag?.content_source !== NORMALIZED_TEXT_SOURCE) {
      addBlocker(blockers, 'rag_not_using_normalized_plain_text', storageKey);
    }
  }

  return {
    storage_key: storageKey,
    shard_id: surfaceRow.shard_id,
    source_manifest: surfaceRow.source_manifest,
    source_manifest_index: surfaceRow.source_manifest_index,
    source_pdf: surfaceRow.source_pdf,
    q_number: surfaceRow.q_number,
    visual_review_status: visualAccepted ? 'accepted' : surfaceRow.visual_review_status || null,
    plain_text_v1_ready: Boolean(v1?.plain_text),
    plain_text_v2_ready: Boolean(v2?.normalized_plain_text),
    normalized_plain_text: v2?.normalized_plain_text || null,
    text_only_ready: v2?.text_only_addressable === true,
    image_context_required: v2?.requires_image_context === true,
    primary_topic_path: authority?.primary_topic_path || v2?.primary_topic_path || null,
    authority_alignment_status: authority?.authority_alignment_status || null,
    canonical_syllabus_detailed_topic_claimed: authority?.canonical_syllabus_detailed_topic_claimed === true,
    local_consumption_gate_status: consumption ? consumption.text_consumption_status : null,
    search_uses_normalized_plain_text: consumption?.search?.search_text_source === NORMALIZED_TEXT_SOURCE,
    read_model_uses_normalized_plain_text: consumption?.read_model?.prompt_representation?.value === consumption?.normalized_plain_text,
    rag_uses_normalized_plain_text: consumption?.rag?.content_source === NORMALIZED_TEXT_SOURCE,
    blockers,
  };
}

function checkArtifactStatus(blockers, artifactName, artifact) {
  if (artifact.status !== 'pass') {
    addBlocker(blockers, `${artifactName}_artifact_not_pass`, null, { status: artifact.status || null });
  }
  if (Array.isArray(artifact.blockers) && artifact.blockers.length > 0) {
    addBlocker(blockers, `${artifactName}_artifact_has_blockers`, null, { blockers: artifact.blockers.length });
  }
  if (Number(artifact.summary?.blockers || 0) > 0) {
    addBlocker(blockers, `${artifactName}_summary_has_blockers`, null, { blockers: artifact.summary.blockers });
  }
}

function validateAggregateArtifacts({
  blockers,
  expectedRows,
  expectedShardCounts,
  visualGate,
  v1,
  v2,
  authority,
  consumption,
}) {
  if (
    visualGate.status !== 'pass'
    || Number(visualGate.summary?.selected_rows || 0) !== expectedRows
    || Number(visualGate.summary?.accepted_rows || 0) !== expectedRows
    || Number(visualGate.summary?.rejected_rows || 0) !== 0
    || Number(visualGate.summary?.missing_review_rows || 0) !== 0
    || Number(visualGate.summary?.blocker_count || 0) !== 0
  ) {
    addBlocker(blockers, 'visual_gate_not_pass_for_exact_wm_final_scope', null, {
      status: visualGate.status || null,
      summary: visualGate.summary || null,
    });
  }
  if (visualGate.actual_shard_counts) {
    for (const [shardId, expectedCount] of Object.entries(expectedShardCounts)) {
      if (Number(visualGate.actual_shard_counts[shardId] || 0) !== expectedCount) {
        addBlocker(blockers, 'visual_gate_shard_count_mismatch', null, {
          shard_id: shardId,
          expected_rows: expectedCount,
          actual_rows: Number(visualGate.actual_shard_counts[shardId] || 0),
        });
      }
    }
  }

  for (const [artifactName, artifact] of [
    ['question_plain_text_v1', v1],
    ['question_plain_text_v2', v2],
    ['authority_alignment', authority],
    ['question_plain_text_v2_consumption', consumption],
  ]) {
    checkArtifactStatus(blockers, artifactName, artifact);
  }

  const rowChecks = [
    ['question_plain_text_v1_rows', v1.summary?.plain_text_rows],
    ['question_plain_text_v1_production_rows', v1.summary?.production_rows],
    ['question_plain_text_v2_rows', v2.summary?.v2_rows],
    ['question_plain_text_v2_production_rows', v2.summary?.production_rows],
    ['question_plain_text_v2_normalized_rows', v2.summary?.normalized_plain_text_rows],
    ['authority_rows', authority.summary?.rows],
    ['authority_component_aligned_rows', authority.summary?.component_aligned_rows],
    ['consumption_rows_read', consumption.summary?.rows_read],
    ['consumption_normalized_rows', consumption.summary?.normalized_plain_text_rows],
    ['consumption_search_rows', consumption.summary?.search_rows_using_normalized_plain_text],
    ['consumption_read_model_rows', consumption.summary?.read_model_rows_using_normalized_plain_text],
    ['consumption_rag_rows', consumption.summary?.rag_rows_using_normalized_plain_text],
  ];
  for (const [check, value] of rowChecks) {
    if (Number(value || 0) !== expectedRows) {
      addBlocker(blockers, `${check}_mismatch`, null, {
        expected_rows: expectedRows,
        actual_rows: value ?? null,
      });
    }
  }
  if (Number(consumption.summary?.legacy_search_text_only_rows || 0) !== 0) {
    addBlocker(blockers, 'legacy_search_text_only_rows_not_zero', null, {
      actual_rows: consumption.summary?.legacy_search_text_only_rows,
    });
  }
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
    eligible_for_question_plain_text_v2: row.plain_text_v2_ready,
    eligible_for_normalized_plain_text_consumption_gate:
      row.search_uses_normalized_plain_text && row.read_model_uses_normalized_plain_text && row.rag_uses_normalized_plain_text,
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
    schema_version: '9231_wm_final_evidence_layers_shard_closeout_v1',
    generated_on: generatedOn,
    subject_code: '9231',
    shard_id: shardId,
    status: blockers.length === 0 ? 'pass' : 'blocked',
    production_ready_claimed: false,
    summary: {
      rows: rows.length,
      visual_review_accepted_rows: countWhere(rows, (row) => row.visual_review_status === 'accepted'),
      plain_text_v1_rows: countWhere(rows, (row) => row.plain_text_v1_ready),
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

export function build9231WmFinalEvidenceLayersGate({
  rootDir = ROOT,
  generatedOn = DEFAULTS.generatedOn,
  visualGateJson = DEFAULTS.visualGateJson,
  plainTextV1Json = DEFAULTS.plainTextV1Json,
  plainTextV2Json = DEFAULTS.plainTextV2Json,
  authorityJson = DEFAULTS.authorityJson,
  consumptionJson = DEFAULTS.consumptionJson,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
  reportsDir = DEFAULTS.reportsDir,
  expectedShardCounts = DEFAULT_EXPECTED_SHARD_COUNTS,
} = {}) {
  const blockers = [];
  const expectedRows = Object.values(expectedShardCounts).reduce((sum, count) => sum + count, 0);
  const visualGate = readJson(rootDir, visualGateJson);
  const v1 = readJson(rootDir, plainTextV1Json);
  const v2 = readJson(rootDir, plainTextV2Json);
  const authority = readJson(rootDir, authorityJson);
  const consumption = readJson(rootDir, consumptionJson);
  const { records: surfaceRecords, rows: surfaceRows } = loadSurfaceRows(rootDir, expectedShardCounts, blockers);

  if (surfaceRows.length !== expectedRows) {
    addBlocker(blockers, 'surface_row_count_mismatch', null, {
      expected_rows: expectedRows,
      actual_rows: surfaceRows.length,
    });
  }
  validateAggregateArtifacts({
    blockers,
    expectedRows,
    expectedShardCounts,
    visualGate,
    v1,
    v2,
    authority,
    consumption,
  });

  const v1ByKey = indexItems(v1.items);
  const v2ByKey = indexItems(v2.items);
  const authorityByKey = indexItems(authority.items);
  const consumptionByKey = indexItems(consumption.items);
  const rows = surfaceRows.map((surfaceRow) => buildRowEvidence({
    surfaceRow,
    v1ByKey,
    v2ByKey,
    authorityByKey,
    consumptionByKey,
  }));
  blockers.push(...rows.flatMap((row) => row.blockers || []));

  const rowsByStorageKey = new Map(rows.map((row) => [row.storage_key, row]));
  const paths = { plainTextV1Json, plainTextV2Json, authorityJson, consumptionJson };
  const status = blockers.length === 0 ? 'pass' : 'blocked';
  const updatedSurfaces = surfaceRecords.map((record) => {
    const updatedItems = record.items.map((item) => updateSurfaceItem(item, rowsByStorageKey.get(item.storage_key), paths));
    return {
      path: record.path,
      payload: {
        ...record.payload,
        items: updatedItems,
        evidence_layers_wm_final_gate: {
          schema_version: '9231_wm_final_evidence_layers_surface_gate_v1',
          generated_on: generatedOn,
          status,
          gate_json: jsonOut,
          gate_markdown: markdownOut,
          selected_rows: record.items.length,
          local_consumption_gate_proven: status === 'pass',
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

  return {
    schema_version: '9231_wm_final_evidence_layers_gate_v1',
    generated_on: generatedOn,
    subject_code: '9231',
    status,
    verdict: status === 'pass' ? 'wm-final-evidence-layers-ready-local-consumption-proven' : 'wm-final-evidence-layers-blocked',
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
      production_db_search_read_model_rag_gates_run: false,
    },
    expected_shard_counts: expectedShardCounts,
    artifacts: {
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
      expected_rows: expectedRows,
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
  };
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
    `# 9231 ${shard.shard_id} WM Final Evidence Layers Closeout`,
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
      ['plain_text_v1 rows', String(s.plain_text_v1_rows)],
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

export function render9231WmFinalEvidenceLayersMarkdown(result) {
  const s = result.summary;
  const blockerLines = result.blockers.length
    ? result.blockers.slice(0, 25).map((blocker) => `- ${blocker.check}: ${blocker.storage_key || 'artifact'}`).join('\n')
    : '- none';
  return [
    '# 9231 WM Final Evidence Layers Gate',
    '',
    `- status: \`${result.status}\``,
    `- verdict: \`${result.verdict}\``,
    `- production_ready_claimed: \`${result.production_ready_claimed}\``,
    '- Boundary: local v1/v2 text, component authority, and local normalized_plain_text consumption are proven; production DB/search/read-model/RAG gates were not run.',
    '- Authority boundary: component-level alignment and deterministic topic hints are recorded; canonical syllabus detailed topic is not claimed.',
    '',
    '## Counts',
    '',
    markdownTable([
      ['metric', 'value'],
      ['selected shards', String(s.selected_shards)],
      ['expected rows', String(s.expected_rows)],
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

export function write9231WmFinalEvidenceLayersArtifacts(result, {
  rootDir = ROOT,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
} = {}) {
  for (const surface of result.updated_surfaces) {
    writeJson(rootDir, surface.path, surface.payload);
  }
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
  };
  writeJson(rootDir, jsonOut, persisted);
  writeText(rootDir, markdownOut, render9231WmFinalEvidenceLayersMarkdown(result));
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return 0;
  }
  const result = build9231WmFinalEvidenceLayersGate(options);
  write9231WmFinalEvidenceLayersArtifacts(result, {
    rootDir: options.rootDir || ROOT,
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
    throw new Error('9231 WM-final evidence layers gate failed.');
  }
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main();
  } catch (error) {
    writeStderrLine(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
