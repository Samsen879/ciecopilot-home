#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const DEFAULTS = Object.freeze({
  generatedOn: '2026-06-10',
  inputJson: 'docs/reports/2026-06-10-9702-question-plain-text-v2.json',
  authorityContractJson: 'data/contracts/9702_physics_authority_contract_v1.json',
  jsonOut: 'docs/reports/2026-06-10-9702-authority-alignment.json',
  markdownOut: 'docs/reports/2026-06-10-9702-authority-alignment.md',
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
    'Usage: node scripts/learning/build_9702_authority_alignment.js',
    '  [--generated-on <YYYY-MM-DD>]',
    '  [--input-json <path>]',
    '  [--authority-contract-json <path>]',
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
    if (token === '--input-json') {
      options.inputJson = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--authority-contract-json') {
      options.authorityContractJson = requiredValue(argv, index, token);
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

function countWhere(items, predicate) {
  return items.reduce((count, item) => count + (predicate(item) ? 1 : 0), 0);
}

function componentIdFromItem(item) {
  const direct = normalizeString(item?.component);
  if (/^\d{2}$/.test(direct)) {
    return direct;
  }
  const fromPdf = /_qp_(\d{2})\.pdf$/i.exec(normalizeString(item?.source_pdf));
  if (fromPdf) {
    return fromPdf[1];
  }
  const paper = Number.isInteger(item?.paper) ? item.paper : Number.parseInt(item?.paper, 10);
  const variant = Number.isInteger(item?.variant) ? item.variant : Number.parseInt(item?.variant, 10);
  if (Number.isInteger(paper) && Number.isInteger(variant)) {
    return `${paper}${variant}`;
  }
  return null;
}

function componentMapFromContract(contract) {
  return new Map(normalizeArray(contract?.components).map((component) => [
    normalizeString(component.component_id),
    component,
  ]).filter(([componentId]) => componentId));
}

export function build9702AuthorityAlignmentItem(item, {
  sourceArtifactPath = DEFAULTS.inputJson,
  componentById,
} = {}) {
  const componentId = componentIdFromItem(item);
  const component = componentId ? componentById.get(componentId) || null : null;
  const acceptedComponent = component?.status === 'accepted';
  const topicHint = normalizeArray(component?.deterministic_topic_hints)[0] || null;
  const fallbackTopicPath = normalizeString(topicHint?.topic_path)
    || normalizeString(component?.component_scope?.fallback_authority_topic_path)
    || (component?.paper ? `9702.p${component.paper}` : null);
  const blockers = [];
  const warnings = [];

  if (!componentId) {
    blockers.push({
      check: 'component_id_unresolved_from_row',
      severity: 'blocker',
      storage_key: item.storage_key || null,
    });
  } else if (!component) {
    blockers.push({
      check: 'component_not_found_in_9702_authority_contract',
      severity: 'blocker',
      storage_key: item.storage_key || null,
      component_id: componentId,
    });
  } else if (!acceptedComponent) {
    blockers.push({
      check: 'component_not_accepted_in_9702_authority_contract',
      severity: 'blocker',
      storage_key: item.storage_key || null,
      component_id: componentId,
      component_status: component.status || null,
    });
  }
  if (!fallbackTopicPath) {
    warnings.push('deterministic_topic_hint_unavailable');
  }

  return {
    schema_version: '9702_authority_alignment_item_v1',
    storage_key: item.storage_key || null,
    subject_code: item.subject_code || '9702',
    year: item.year ?? null,
    session: item.session ?? null,
    paper: item.paper ?? component?.paper ?? null,
    component_id: componentId,
    variant: item.variant ?? null,
    q_number: item.q_number ?? null,
    source_pdf: item.source_pdf ?? null,
    source_question_plain_text_v2: sourceArtifactPath,
    component_authority: acceptedComponent
      ? {
        status: 'component_aligned_from_paper_code',
        component_id: component.component_id,
        component_path: component.component_path,
        component_scope: component.component_scope,
        evidence: {
          source: '9702_physics_authority_contract_v1',
          source_component_id: componentId,
          source_pdf: item.source_pdf || null,
        },
      }
      : {
        status: 'component_unresolved',
        component_id: componentId,
        component_path: null,
        component_scope: null,
        evidence: {
          source: '9702_physics_authority_contract_v1',
          source_component_id: componentId,
          source_pdf: item.source_pdf || null,
        },
      },
    topic_authority: fallbackTopicPath
      ? {
        status: 'deterministic_topic_hint_assigned',
        topic_path: fallbackTopicPath,
        hint_status: topicHint?.hint_status || 'paper_scope_fallback',
        evidence: {
          method: 'phase2_component_contract_deterministic_topic_hint',
          contract_component_id: componentId,
          contract_evidence: topicHint?.evidence || null,
        },
      }
      : {
        status: 'detailed_topic_unresolved',
        topic_path: null,
        hint_status: null,
        evidence: {
          method: 'phase2_component_contract_deterministic_topic_hint',
          contract_component_id: componentId,
          contract_evidence: null,
        },
      },
    primary_topic_path: fallbackTopicPath,
    authority_alignment_status: acceptedComponent
      ? 'component_aligned_topic_hint_recorded'
      : 'component_unresolved',
    canonical_syllabus_detailed_topic_claimed: false,
    warnings,
    blockers,
  };
}

function buildBlockers(items) {
  return items.flatMap((item) => item.blockers || []);
}

export function build9702AuthorityAlignment({
  rootDir = ROOT,
  generatedOn = DEFAULTS.generatedOn,
  inputJson = DEFAULTS.inputJson,
  authorityContractJson = DEFAULTS.authorityContractJson,
} = {}) {
  const sourceLayer = readJson(rootDir, inputJson);
  const authorityContract = readJson(rootDir, authorityContractJson);
  const componentById = componentMapFromContract(authorityContract);
  const sourceItems = normalizeArray(sourceLayer.items);
  const items = sourceItems.map((item) => build9702AuthorityAlignmentItem(item, {
    sourceArtifactPath: inputJson,
    componentById,
  }));
  const blockers = buildBlockers(items);
  const status = blockers.length === 0 ? 'pass' : 'blocked';
  return {
    schema_version: '9702_authority_alignment_v1',
    generated_on: generatedOn,
    subject_code: '9702',
    status,
    verdict: status === 'pass'
      ? 'component-authority-and-topic-hints-recorded'
      : 'authority-alignment-blocked',
    production_ready_claimed: false,
    source_contract: {
      input_question_plain_text_v2: inputJson,
      authority_contract_json: authorityContractJson,
      authority_contract_schema_version: authorityContract.schema_version || null,
      component_authority_source: '9702 Phase 2 physics component authority contract',
      topic_hint_source: 'deterministic paper-scope hints from 9702 Phase 2 contract',
      canonical_syllabus_detailed_topic_claimed: false,
      boundary: 'This sidecar records component-level alignment and deterministic topic hints only. It is not a detailed Cambridge syllabus topic proof.',
    },
    summary: {
      rows: items.length,
      component_aligned_rows: countWhere(items, (item) => item.component_authority.status === 'component_aligned_from_paper_code'),
      topic_hint_rows: countWhere(items, (item) => item.topic_authority.status === 'deterministic_topic_hint_assigned'),
      detailed_topic_unresolved_rows: countWhere(items, (item) => item.canonical_syllabus_detailed_topic_claimed === false),
      component_unresolved_rows: countWhere(items, (item) => item.component_authority.status === 'component_unresolved'),
      canonical_syllabus_detailed_topic_claimed_rows: 0,
      blockers: blockers.length,
    },
    blockers,
    items,
  };
}

function markdownTable(rows) {
  return rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
}

export function render9702AuthorityAlignmentMarkdown(layer, { inputJson, jsonOut }) {
  const s = layer.summary;
  const blockerLines = layer.blockers.length === 0
    ? '- none'
    : layer.blockers.slice(0, 25).map((blocker) => `- ${blocker.check}: ${blocker.storage_key}`).join('\n');
  return [
    '# 9702 authority alignment',
    '',
    `- generated_on: \`${layer.generated_on}\``,
    `- status: \`${layer.status}\``,
    `- input: \`${inputJson}\``,
    `- JSON artifact: \`${jsonOut}\``,
    '- Boundary: component-level alignment and deterministic topic hints only; no Cambridge syllabus-canonical detailed topic claim.',
    '',
    '## Counts',
    '',
    markdownTable([
      ['metric', 'value'],
      ['rows', String(s.rows)],
      ['component aligned rows', String(s.component_aligned_rows)],
      ['topic hint rows', String(s.topic_hint_rows)],
      ['detailed topic unresolved rows', String(s.detailed_topic_unresolved_rows)],
      ['component unresolved rows', String(s.component_unresolved_rows)],
      ['canonical syllabus detailed topic claimed rows', String(s.canonical_syllabus_detailed_topic_claimed_rows)],
      ['blockers', String(s.blockers)],
    ]),
    '',
    '## Blockers',
    '',
    blockerLines,
    '',
  ].join('\n');
}

export function write9702AuthorityAlignmentArtifacts({
  rootDir = ROOT,
  layer,
  inputJson = DEFAULTS.inputJson,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
} = {}) {
  writeJson(rootDir, jsonOut, layer);
  writeText(rootDir, markdownOut, render9702AuthorityAlignmentMarkdown(layer, { inputJson, jsonOut }));
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return 0;
  }
  const layer = build9702AuthorityAlignment(options);
  write9702AuthorityAlignmentArtifacts({ layer, ...options });
  writeStdoutLine(JSON.stringify({
    status: layer.status,
    verdict: layer.verdict,
    summary: layer.summary,
    json_out: options.jsonOut,
    markdown_out: options.markdownOut,
  }, null, 2));
  return layer.status === 'pass' ? 0 : 1;
}

if (process.argv[1] === __filename) {
  try {
    process.exitCode = main();
  } catch (error) {
    writeStderrLine(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
