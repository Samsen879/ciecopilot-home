#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const DEFAULTS = Object.freeze({
  subject: '9709',
  generatedOn: '2026-06-04',
  inputJson: 'docs/reports/2026-06-04-9709-question-plain-text-v1.json',
  jsonOut: 'docs/reports/2026-06-04-9709-question-plain-text-v2.json',
  markdownOut: 'docs/reports/2026-06-04-9709-question-plain-text-v2-coverage.md',
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
  [/\u03a0/g, 'Pi'],
  [/\u03b8/g, 'theta'],
  [/\u0398/g, 'Theta'],
  [/\u03b1/g, 'alpha'],
  [/\u03b2/g, 'beta'],
  [/\u03b3/g, 'gamma'],
  [/\u03bb/g, 'lambda'],
  [/\u00b0/g, ' degrees'],
  [/\u00b2/g, '^2'],
  [/\u00b3/g, '^3'],
  [/\u2070/g, '^0'],
  [/\u00b9/g, '^1'],
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
    'Usage: node scripts/learning/build_9709_question_plain_text_v2.js',
    '  [--subject <subject-code>]',
    '  [--generated-on <YYYY-MM-DD>]',
    '  [--input-json <path>]',
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
    if (token === '--input-json') {
      options.inputJson = requiredValue(argv, index, token);
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

function readJson(rootDir, repoPath) {
  return JSON.parse(fs.readFileSync(resolveFromRoot(rootDir, repoPath), 'utf8'));
}

function writeJson(rootDir, repoPath, payload) {
  const resolved = resolveFromRoot(rootDir, repoPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeText(rootDir, repoPath, text) {
  const resolved = resolveFromRoot(rootDir, repoPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, text, 'utf8');
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

function normalizeMathAscii(value) {
  let normalized = normalizeString(value);
  for (const [pattern, replacement] of UNICODE_MATH_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:)\]])/g, '$1')
    .replace(/([(])\s+/g, '$1')
    .trim();
}

function normalizePlainText(value) {
  let normalized = typeof value === 'string' ? value.replace(/\r\n/g, '\n') : '';
  for (const [pattern, replacement] of UNICODE_MATH_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseMarks(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const text = normalizeString(value);
  if (!text) {
    return null;
  }
  const match = /-?\d+/.exec(text);
  return match ? Number.parseInt(match[0], 10) : null;
}

function parsePythonLikeStringField(text, field) {
  const quotedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`['"]${quotedField}['"]\\s*:\\s*(?:None|null|(['"])(.*?)\\1)`, 's');
  const match = pattern.exec(text);
  if (!match) {
    return null;
  }
  return typeof match[2] === 'string' ? match[2] : null;
}

function parsePythonLikeMarks(text) {
  const stringValue = parsePythonLikeStringField(text, 'marks');
  if (stringValue !== null) {
    return parseMarks(stringValue);
  }

  const match = /['"]marks['"]\s*:\s*(-?\d+)/s.exec(text);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

export function normalizeSubquestionBlock(block, { index = 0 } = {}) {
  if (typeof block === 'string') {
    const label = normalizeString(parsePythonLikeStringField(block, 'label'));
    const text = normalizePlainText(parsePythonLikeStringField(block, 'text'));
    const marks = parsePythonLikeMarks(block);
    return {
      label: label || null,
      text: text || null,
      marks,
      source: 'evidence_subquestion_block',
      source_index: index,
      parse_status: label || text || marks !== null ? 'parsed' : 'unparsed_string',
      raw_block: block,
    };
  }

  if (block && typeof block === 'object') {
    return {
      label: normalizeString(block.label) || null,
      text: normalizePlainText(block.text) || null,
      marks: parseMarks(block.marks),
      source: 'evidence_subquestion_block',
      source_index: index,
      parse_status: 'parsed',
      raw_block: block,
    };
  }

  return {
    label: null,
    text: null,
    marks: null,
    source: 'evidence_subquestion_block',
    source_index: index,
    parse_status: 'empty',
    raw_block: block ?? null,
  };
}

function expressionKind(normalized) {
  if (/[<>]=?|!=|=/.test(normalized)) {
    return 'relation';
  }
  if (/\^[0-9A-Za-z(]/.test(normalized)) {
    return 'power';
  }
  if (/\b(sin|cos|tan|ln|log|exp|sqrt)\b/i.test(normalized)) {
    return 'function';
  }
  return 'expression';
}

export function normalizeFormulaExpression(rawValue, { source = 'formula_latex_list', index = 0 } = {}) {
  const rawText = normalizeString(rawValue);
  const normalizedAscii = normalizeMathAscii(rawText);
  if (!normalizedAscii) {
    return null;
  }

  return {
    raw_text: rawText,
    normalized_ascii: normalizedAscii,
    expression_kind: expressionKind(normalizedAscii),
    source,
    source_index: index,
  };
}

function cleanInlineCandidate(candidate) {
  return normalizeMathAscii(candidate)
    .replace(/\s*\[\d+\]\s*$/, '')
    .replace(/^[,.;:\s]+/, '')
    .replace(/[,.;:\s]+$/, '')
    .trim();
}

function extractInlineMathCandidates(plainText) {
  const text = normalizePlainText(plainText);
  const candidates = [];
  const addCandidate = (candidate, source) => {
    const cleaned = cleanInlineCandidate(candidate);
    if (cleaned && /[A-Za-z0-9\\]/.test(cleaned)) {
      candidates.push({
        value: cleaned,
        source,
      });
    }
  };

  const latexDelimiterPatterns = [
    /\\\((.*?)\\\)/gs,
    /\\\[(.*?)\\\]/gs,
    /\$([^$]+)\$/g,
  ];
  for (const pattern of latexDelimiterPatterns) {
    for (const match of text.matchAll(pattern)) {
      addCandidate(match[1], 'plain_text_latex_delimiter');
    }
  }

  const patterns = [
    /\b[A-Za-z][A-Za-z0-9]*\^-?[0-9A-Za-z()]+/g,
    /\b(?:d2y\/dx2|d\^2y\/dx\^2|dy\/dx)\b/g,
    /\b(?:sin|cos|tan|ln|log|exp|sqrt)\s*\([^)]{1,50}\)/gi,
    /[A-Za-z0-9().+\-*/^ ]{1,70}\s*(?:<=|>=|!=|=|<|>)\s*[A-Za-z0-9().+\-*/^ ]{1,70}/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      addCandidate(match[0], 'plain_text_heuristic');
    }
  }

  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = `${candidate.source}:${candidate.value}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildMathExpressions(item, normalizedPlainText) {
  const expressions = [];
  const seen = new Set();

  const addExpression = (rawValue, source, index) => {
    const expression = normalizeFormulaExpression(rawValue, { source, index });
    if (!expression || seen.has(expression.normalized_ascii)) {
      return;
    }
    seen.add(expression.normalized_ascii);
    expressions.push(expression);
  };

  for (const [index, rawValue] of normalizeArray(item.formula_latex_list).entries()) {
    addExpression(rawValue, 'formula_latex_list', index);
  }

  for (const [index, candidate] of extractInlineMathCandidates(normalizedPlainText).entries()) {
    addExpression(candidate.value, candidate.source, index);
  }

  return expressions;
}

function buildSubquestionBlocks(item, normalizedPlainText) {
  const sourceBlocks = normalizeArray(item.subquestion_blocks);
  if (sourceBlocks.length === 0) {
    return {
      blocks: [
        {
          label: null,
          text: normalizedPlainText || null,
          marks: null,
          source: 'plain_text_fallback',
          source_index: 0,
          parse_status: normalizedPlainText ? 'fallback_from_plain_text' : 'empty',
          raw_block: null,
        },
      ],
      status: normalizedPlainText ? 'fallback' : 'missing',
    };
  }

  const blocks = sourceBlocks.map((block, index) => normalizeSubquestionBlock(block, { index }));
  const parsedCount = blocks.filter((block) => block.parse_status === 'parsed').length;
  const textCount = blocks.filter((block) => Boolean(block.text)).length;
  const status = parsedCount === blocks.length && textCount === blocks.length
    ? 'structured'
    : parsedCount > 0
      ? 'partial'
      : 'unstructured';

  return {
    blocks,
    status,
  };
}

function sumMarks(blocks) {
  const marks = blocks.map((block) => block.marks).filter((mark) => typeof mark === 'number');
  if (marks.length === 0) {
    return null;
  }
  return marks.reduce((total, mark) => total + mark, 0);
}

function answeringMode(item) {
  return item.needs_image_asset || item.has_diagram || item.table_heavy
    ? 'text_plus_image_context'
    : 'text_only';
}

function buildTextQualityFlags({ item, normalizedPlainText, subquestionStatus, mathExpressions, imageAssets }) {
  const flags = [];
  if (!normalizedPlainText) {
    flags.push('missing_normalized_plain_text');
  }
  if (subquestionStatus !== 'structured') {
    flags.push(`subquestion_structure_${subquestionStatus}`);
  }
  if (item.formula_dense && mathExpressions.length === 0) {
    flags.push('formula_dense_without_math_expression_candidates');
  }
  if (item.needs_image_asset && imageAssets.length === 0) {
    flags.push('missing_image_asset_for_image_context_row');
  }
  return flags;
}

function buildV2Item(item) {
  const normalizedPlainText = normalizePlainText(item.plain_text);
  const mathExpressions = buildMathExpressions(item, normalizedPlainText);
  const subquestionResult = buildSubquestionBlocks(item, normalizedPlainText);
  const imageAssets = normalizeStringArray(item.image_assets);
  const mode = answeringMode(item);

  return {
    schema_version: 'question_plain_text_v2',
    storage_key: item.storage_key,
    subject_code: item.subject_code,
    year: item.year,
    session: item.session,
    paper: item.paper,
    variant: item.variant,
    q_number: item.q_number,
    source_pdf: item.source_pdf ?? null,
    source_version: item.source_version ?? null,
    primary_topic_path: item.primary_topic_path ?? null,
    source_v1_text_layer: DEFAULTS.inputJson,
    source_surface_manifest: item.source_surface_manifest ?? null,
    source_evidence_bundle: item.source_evidence_bundle ?? null,
    original_plain_text: item.plain_text ?? '',
    normalized_plain_text: normalizedPlainText,
    text_source: item.text_source ?? null,
    answering_mode: mode,
    text_only_addressable: mode === 'text_only' && Boolean(normalizedPlainText),
    requires_image_context: mode === 'text_plus_image_context',
    has_diagram: Boolean(item.has_diagram),
    table_heavy: Boolean(item.table_heavy),
    formula_dense: Boolean(item.formula_dense),
    math_expressions: mathExpressions,
    math_expression_count: mathExpressions.length,
    subquestion_blocks_v2: subquestionResult.blocks,
    structured_text_status: subquestionResult.status,
    marks_total: sumMarks(subquestionResult.blocks),
    image_assets: imageAssets,
    rendered_pdf_page_paths: normalizeStringArray(item.rendered_pdf_page_paths),
    provenance: {
      v1_schema_version: item.schema_version ?? null,
      v1_source_version: item.source_version ?? null,
      v1_text_source: item.text_source ?? null,
      v1_quality_flags: normalizeStringArray(item.quality_flags),
      v1_provenance: item.provenance ?? null,
    },
    text_quality_flags: buildTextQualityFlags({
      item,
      normalizedPlainText,
      subquestionStatus: subquestionResult.status,
      mathExpressions,
      imageAssets,
    }),
  };
}

function countDuplicates(items) {
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

function emptyVersionSummary() {
  return {
    rows: 0,
    normalized_plain_text_rows: 0,
    text_only_ready_rows: 0,
    image_context_required_rows: 0,
    image_context_rows_with_assets: 0,
    diagram_rows: 0,
    table_heavy_rows: 0,
    formula_dense_rows: 0,
    formula_dense_rows_with_math_expressions: 0,
    formula_dense_rows_without_math_expressions: 0,
    structured_rows: 0,
    partial_structured_rows: 0,
    unstructured_rows: 0,
    fallback_text_block_rows: 0,
  };
}

function incrementVersion(summary, item) {
  const version = item.source_version ?? 'unknown';
  const stats = summary.source_versions[version] ?? emptyVersionSummary();
  stats.rows += 1;
  if (item.normalized_plain_text) {
    stats.normalized_plain_text_rows += 1;
  }
  if (item.text_only_addressable) {
    stats.text_only_ready_rows += 1;
  }
  if (item.requires_image_context) {
    stats.image_context_required_rows += 1;
    if (item.image_assets.length > 0) {
      stats.image_context_rows_with_assets += 1;
    }
  }
  if (item.has_diagram) {
    stats.diagram_rows += 1;
  }
  if (item.table_heavy) {
    stats.table_heavy_rows += 1;
  }
  if (item.formula_dense) {
    stats.formula_dense_rows += 1;
    if (item.math_expressions.length > 0) {
      stats.formula_dense_rows_with_math_expressions += 1;
    } else {
      stats.formula_dense_rows_without_math_expressions += 1;
    }
  }
  if (item.structured_text_status === 'structured') {
    stats.structured_rows += 1;
  }
  if (item.structured_text_status === 'partial') {
    stats.partial_structured_rows += 1;
  }
  if (item.structured_text_status === 'unstructured') {
    stats.unstructured_rows += 1;
  }
  if (item.structured_text_status === 'fallback') {
    stats.fallback_text_block_rows += 1;
  }
  summary.source_versions[version] = stats;
}

function buildBlockers(items, duplicateKeys) {
  const blockers = [];
  for (const storageKey of duplicateKeys) {
    blockers.push({
      storage_key: storageKey,
      check: 'duplicate_storage_key',
    });
  }

  for (const item of items) {
    if (!item.normalized_plain_text) {
      blockers.push({
        storage_key: item.storage_key,
        check: 'missing_normalized_plain_text',
      });
    }
    if (item.requires_image_context && item.image_assets.length === 0) {
      blockers.push({
        storage_key: item.storage_key,
        check: 'missing_image_asset_for_image_context_row',
      });
    }
  }

  return blockers;
}

function buildSummary(items, duplicateKeys, blockers) {
  const summary = {
    production_rows: items.length,
    v2_rows: items.length,
    normalized_plain_text_rows: 0,
    text_only_ready_rows: 0,
    image_context_required_rows: 0,
    image_context_rows_with_assets: 0,
    diagram_rows: 0,
    table_heavy_rows: 0,
    formula_dense_rows: 0,
    formula_dense_rows_with_math_expressions: 0,
    formula_dense_rows_without_math_expressions: 0,
    rows_with_math_expressions: 0,
    structured_rows: 0,
    partial_structured_rows: 0,
    unstructured_rows: 0,
    fallback_text_block_rows: 0,
    duplicate_storage_keys: duplicateKeys.size,
    missing_normalized_plain_text: 0,
    missing_image_asset: 0,
    blockers: blockers.length,
    source_versions: {},
  };

  for (const item of items) {
    if (item.normalized_plain_text) {
      summary.normalized_plain_text_rows += 1;
    } else {
      summary.missing_normalized_plain_text += 1;
    }
    if (item.text_only_addressable) {
      summary.text_only_ready_rows += 1;
    }
    if (item.requires_image_context) {
      summary.image_context_required_rows += 1;
      if (item.image_assets.length > 0) {
        summary.image_context_rows_with_assets += 1;
      } else {
        summary.missing_image_asset += 1;
      }
    }
    if (item.has_diagram) {
      summary.diagram_rows += 1;
    }
    if (item.table_heavy) {
      summary.table_heavy_rows += 1;
    }
    if (item.formula_dense) {
      summary.formula_dense_rows += 1;
      if (item.math_expressions.length > 0) {
        summary.formula_dense_rows_with_math_expressions += 1;
      } else {
        summary.formula_dense_rows_without_math_expressions += 1;
      }
    }
    if (item.math_expressions.length > 0) {
      summary.rows_with_math_expressions += 1;
    }
    if (item.structured_text_status === 'structured') {
      summary.structured_rows += 1;
    }
    if (item.structured_text_status === 'partial') {
      summary.partial_structured_rows += 1;
    }
    if (item.structured_text_status === 'unstructured') {
      summary.unstructured_rows += 1;
    }
    if (item.structured_text_status === 'fallback') {
      summary.fallback_text_block_rows += 1;
    }
    incrementVersion(summary, item);
  }

  return summary;
}

export function buildQuestionPlainTextV2Layer({
  rootDir = ROOT,
  subject = DEFAULTS.subject,
  generatedOn = DEFAULTS.generatedOn,
  inputJson = DEFAULTS.inputJson,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
  v1Layer = null,
  writeArtifacts = false,
} = {}) {
  const sourceLayer = v1Layer ?? readJson(rootDir, inputJson);
  const sourceItems = normalizeArray(sourceLayer.items);
  const items = sourceItems.map((item) => ({
    ...buildV2Item(item),
    source_v1_text_layer: inputJson,
  }));
  const duplicateKeys = countDuplicates(items);
  const blockers = buildBlockers(items, duplicateKeys);
  const summary = buildSummary(items, duplicateKeys, blockers);
  const status = blockers.length === 0 ? 'pass' : 'blocked';
  const layer = {
    schema_version: `${subject}_question_plain_text_v2`,
    status,
    verdict: status === 'pass' ? 'question-plain-text-v2-ready' : 'question-plain-text-v2-blocked',
    generated_on: generatedOn,
    subject_code: subject,
    source_contract: {
      input_text_layer: inputJson,
      input_schema_version: sourceLayer.schema_version ?? null,
      v2_scope: [
        'normalize plain text into ASCII math-friendly text',
        'normalize formula_latex_list and inline math candidates into math_expressions',
        'normalize mixed subquestion block formats into subquestion_blocks_v2',
        'separate text_only rows from rows requiring image context',
      ],
      gate_zero_fields: [
        'duplicate_storage_keys',
        'missing_normalized_plain_text',
        'missing_image_asset for image_context rows',
      ],
      boundary: 'local deterministic transform from question_plain_text_v1 only; no OCR rerun, no external VLM/API call, no DB write, no RAG/search mutation',
    },
    summary,
    blockers,
    items,
  };

  if (writeArtifacts) {
    writeQuestionPlainTextV2Artifacts({ rootDir, layer, jsonOut, markdownOut });
  }

  return layer;
}

function markdownTable(rows) {
  return rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
}

export function buildMarkdownReport(layer, { inputJson, jsonOut }) {
  const s = layer.summary;
  const subjectLabel = layer.subject_code === '9709' ? '9709 Mathematics' : layer.subject_code;
  const versionRows = [
    ['source version', 'rows', 'normalized text', 'text-only ready', 'image context + assets', 'formula dense + math', 'formula dense no math', 'structured', 'partial', 'unstructured', 'fallback'],
    ...Object.entries(s.source_versions).sort(([left], [right]) => left.localeCompare(right)).map(([version, stats]) => [
      version,
      String(stats.rows),
      String(stats.normalized_plain_text_rows),
      String(stats.text_only_ready_rows),
      `${stats.image_context_rows_with_assets}/${stats.image_context_required_rows}`,
      `${stats.formula_dense_rows_with_math_expressions}/${stats.formula_dense_rows}`,
      String(stats.formula_dense_rows_without_math_expressions),
      String(stats.structured_rows),
      String(stats.partial_structured_rows),
      String(stats.unstructured_rows),
      String(stats.fallback_text_block_rows),
    ]),
  ];
  const blockerLines = layer.blockers.length === 0
    ? '- none'
    : layer.blockers.slice(0, 25).map((blocker) => `- ${blocker.check}: ${blocker.storage_key}`).join('\n');
  const blockerSuffix = layer.blockers.length > 25
    ? `\n- ... ${layer.blockers.length - 25} more blocker(s) omitted from markdown; see JSON.`
    : '';

  return [
    `# ${layer.subject_code} question plain text v2 coverage`,
    '',
    layer.status === 'pass'
      ? 'Verdict: pass. The v1 text layer has been normalized into v2 with text-only/image-context classification and zero gate blockers.'
      : `Verdict: blocked. ${layer.blockers.length} blocker(s) must be fixed before v2 is ready.`,
    '',
    '## Scope',
    '',
    `- Subject: ${subjectLabel}`,
    `- Generated on: ${layer.generated_on}`,
    `- Input artifact: ${inputJson}`,
    `- JSON artifact: ${jsonOut}`,
    '- Boundary: deterministic local transform from v1 only; no OCR rerun, no external VLM/API call, no DB write, no RAG/search mutation.',
    '- v2 additions: normalized text, math expression candidates, normalized subquestion blocks, marks totals, text-only vs image-context answering mode.',
    '',
    '## Aggregate Gate',
    '',
    markdownTable([
      ['metric', 'value'],
      ['production rows', String(s.production_rows)],
      ['v2 rows', String(s.v2_rows)],
      ['normalized plain text rows', String(s.normalized_plain_text_rows)],
      ['strict text-only ready rows', String(s.text_only_ready_rows)],
      ['image-context rows with assets', `${s.image_context_rows_with_assets}/${s.image_context_required_rows}`],
      ['diagram rows', String(s.diagram_rows)],
      ['table-heavy rows', String(s.table_heavy_rows)],
      ['rows with math expressions', String(s.rows_with_math_expressions)],
      ['formula-dense rows with math expressions', `${s.formula_dense_rows_with_math_expressions}/${s.formula_dense_rows}`],
      ['formula-dense rows without math expressions', String(s.formula_dense_rows_without_math_expressions)],
      ['structured subquestion rows', String(s.structured_rows)],
      ['partial subquestion rows', String(s.partial_structured_rows)],
      ['unstructured subquestion rows', String(s.unstructured_rows)],
      ['fallback text-block rows', String(s.fallback_text_block_rows)],
      ['duplicate storage keys', String(s.duplicate_storage_keys)],
      ['missing normalized plain text', String(s.missing_normalized_plain_text)],
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

export function writeQuestionPlainTextV2Artifacts({
  rootDir = ROOT,
  layer,
  inputJson = DEFAULTS.inputJson,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
} = {}) {
  writeJson(rootDir, jsonOut, layer);
  writeText(rootDir, markdownOut, buildMarkdownReport(layer, { inputJson, jsonOut }));
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return 0;
  }

  const layer = buildQuestionPlainTextV2Layer({
    ...options,
    writeArtifacts: true,
  });
  writeStdoutLine(JSON.stringify({
    status: layer.status,
    verdict: layer.verdict,
    summary: layer.summary,
    input_json: options.inputJson,
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
