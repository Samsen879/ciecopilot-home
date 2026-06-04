#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const DEFAULTS = Object.freeze({
  generatedOn: '2026-06-05',
  inputJson: 'docs/reports/2026-06-05-9231-question-plain-text-v2.json',
  jsonOut: 'docs/reports/2026-06-05-9231-authority-alignment-wave1.json',
  markdownOut: 'docs/reports/2026-06-05-9231-authority-alignment-wave1.md',
});

const COMPONENTS = Object.freeze({
  1: {
    component_path: '9231.p1',
    component_title: 'Further Pure Mathematics 1',
  },
  2: {
    component_path: '9231.p2',
    component_title: 'Further Pure Mathematics 2',
  },
  3: {
    component_path: '9231.p3',
    component_title: 'Further Mechanics',
  },
  4: {
    component_path: '9231.p4',
    component_title: 'Further Probability and Statistics',
  },
});

const TOPIC_RULES = Object.freeze([
  {
    topic_id: 'complex_numbers',
    label: 'Complex numbers',
    pattern: /\b(complex|argand|modulus|argument|roots of unity|locus)\b/i,
  },
  {
    topic_id: 'matrices',
    label: 'Matrices and linear transformations',
    pattern: /\b(matrix|matrices|determinant|eigenvalue|eigenvector|linear transformation)\b/i,
  },
  {
    topic_id: 'polynomials_roots',
    label: 'Polynomials and roots',
    pattern: /\b(roots? of|cubic equation|quartic|polynomial|factor theorem|remainder theorem)\b/i,
  },
  {
    topic_id: 'series_and_induction',
    label: 'Series, proof, and induction',
    pattern: /\b(series|summation|induction|prove by induction|binomial expansion|maclaurin)\b/i,
  },
  {
    topic_id: 'calculus',
    label: 'Calculus',
    pattern: /\b(differentiat|integrat|derivative|stationary|gradient|parametric|polar|differential equation|rate of change)\b/i,
  },
  {
    topic_id: 'hyperbolic_functions',
    label: 'Hyperbolic functions',
    pattern: /\b(hyperbolic|sinh|cosh|tanh)\b/i,
  },
  {
    topic_id: 'vectors',
    label: 'Vectors',
    pattern: /\b(vector|scalar product|cross product|plane|line equation)\b/i,
  },
  {
    topic_id: 'mechanics_forces_motion',
    label: 'Forces, motion, energy, and momentum',
    pattern: /\b(particle|force|momentum|impulse|collision|projectile|circular motion|work|energy|friction|equilibrium|centre of mass)\b/i,
  },
  {
    topic_id: 'probability_distributions',
    label: 'Probability and distributions',
    pattern: /\b(probability|random variable|normal distribution|poisson|binomial|geometric distribution|variance|expectation)\b/i,
  },
  {
    topic_id: 'statistical_inference',
    label: 'Statistical inference',
    pattern: /\b(hypothesis|significance|confidence interval|test statistic|critical region|chi-squared|t-test)\b/i,
  },
  {
    topic_id: 'correlation_regression',
    label: 'Correlation and regression',
    pattern: /\b(correlation|regression|least squares|product moment)\b/i,
  },
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
    'Usage: node scripts/learning/build_9231_authority_alignment_wave1.js',
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

function inferTopic(item) {
  const text = normalizeString(item.normalized_plain_text || item.original_plain_text || '');
  for (const rule of TOPIC_RULES) {
    if (rule.pattern.test(text)) {
      return rule;
    }
  }
  return null;
}

export function buildAuthorityAlignmentItem(item, {
  sourceArtifactPath = DEFAULTS.inputJson,
} = {}) {
  const paper = Number.isInteger(item?.paper) ? item.paper : Number.parseInt(item?.paper, 10);
  const component = COMPONENTS[paper] || null;
  const topic = inferTopic(item);
  const componentPath = component?.component_path || `9231.p${paper || 'unknown'}`;
  const primaryTopicPath = topic ? `${componentPath}.${topic.topic_id}` : componentPath;
  const warnings = [];
  if (!component) {
    warnings.push('component_not_recognized_from_paper_number');
  }
  if (!topic) {
    warnings.push('detailed_topic_unresolved_by_local_heuristic');
  }

  return {
    schema_version: '9231_authority_alignment_wave1_item_v1',
    storage_key: item.storage_key || null,
    subject_code: item.subject_code || '9231',
    year: item.year ?? null,
    session: item.session ?? null,
    paper,
    variant: item.variant ?? null,
    q_number: item.q_number ?? null,
    source_pdf: item.source_pdf ?? null,
    source_question_plain_text_v2: sourceArtifactPath,
    component_authority: component
      ? {
        status: 'component_aligned_from_paper_code',
        component_path: component.component_path,
        component_title: component.component_title,
        evidence: {
          paper_number: paper,
          source: '9231 question paper code and component map in build_9231_authority_alignment_wave1.js',
        },
      }
      : {
        status: 'component_unresolved',
        component_path: null,
        component_title: null,
        evidence: {
          paper_number: paper || null,
          source: 'paper number missing or outside 1-4',
        },
      },
    topic_authority: topic
      ? {
        status: 'deterministic_topic_hint_assigned',
        primary_topic_path: primaryTopicPath,
        topic_id: topic.topic_id,
        topic_label: topic.label,
        evidence: {
          method: 'regex_over_question_plain_text_v1',
          pattern: String(topic.pattern),
        },
      }
      : {
        status: 'detailed_topic_unresolved',
        primary_topic_path: primaryTopicPath,
        topic_id: null,
        topic_label: null,
        evidence: {
          method: 'regex_over_question_plain_text_v1',
          pattern: null,
        },
      },
    primary_topic_path: primaryTopicPath,
    authority_alignment_status: component ? 'component_aligned_topic_hint_recorded' : 'component_unresolved',
    canonical_syllabus_detailed_topic_claimed: false,
    warnings,
    blockers: component ? [] : [{
      check: 'component_authority_unresolved',
      severity: 'blocker',
      storage_key: item.storage_key || null,
    }],
  };
}

function buildBlockers(items) {
  return items.flatMap((item) => item.blockers || []);
}

export function build9231AuthorityAlignmentWave1({
  rootDir = ROOT,
  generatedOn = DEFAULTS.generatedOn,
  inputJson = DEFAULTS.inputJson,
} = {}) {
  const sourceLayer = readJson(rootDir, inputJson);
  const sourceItems = normalizeArray(sourceLayer.items);
  const items = sourceItems.map((item) => buildAuthorityAlignmentItem(item, {
    sourceArtifactPath: inputJson,
  }));
  const blockers = buildBlockers(items);
  const status = blockers.length === 0 ? 'pass' : 'blocked';
  return {
    schema_version: '9231_authority_alignment_wave1_v1',
    generated_on: generatedOn,
    subject_code: '9231',
    status,
    verdict: status === 'pass'
      ? 'component-authority-and-topic-hints-recorded'
      : 'authority-alignment-blocked',
    production_ready_claimed: false,
    source_contract: {
      input_question_plain_text_v2: inputJson,
      component_authority_source: 'local 9231 paper-number component map',
      topic_hint_source: 'deterministic regex over normalized_plain_text',
      canonical_syllabus_detailed_topic_claimed: false,
      boundary: 'This sidecar records component-level alignment and deterministic topic hints. It is not a Cambridge syllabus-canonical detailed topic proof.',
    },
    summary: {
      rows: items.length,
      component_aligned_rows: countWhere(items, (item) => item.component_authority.status === 'component_aligned_from_paper_code'),
      topic_hint_rows: countWhere(items, (item) => item.topic_authority.status === 'deterministic_topic_hint_assigned'),
      detailed_topic_unresolved_rows: countWhere(items, (item) => item.topic_authority.status === 'detailed_topic_unresolved'),
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

export function render9231AuthorityAlignmentMarkdown(layer, { inputJson, jsonOut }) {
  const s = layer.summary;
  const blockerLines = layer.blockers.length === 0
    ? '- none'
    : layer.blockers.slice(0, 25).map((blocker) => `- ${blocker.check}: ${blocker.storage_key}`).join('\n');
  return [
    '# 9231 authority alignment wave1',
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

export function write9231AuthorityAlignmentArtifacts({
  rootDir = ROOT,
  layer,
  inputJson = DEFAULTS.inputJson,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
} = {}) {
  writeJson(rootDir, jsonOut, layer);
  writeText(rootDir, markdownOut, render9231AuthorityAlignmentMarkdown(layer, { inputJson, jsonOut }));
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return 0;
  }
  const layer = build9231AuthorityAlignmentWave1(options);
  write9231AuthorityAlignmentArtifacts({ layer, ...options });
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
  try {
    process.exitCode = main();
  } catch (error) {
    writeStderrLine(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
