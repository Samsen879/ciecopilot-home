#!/usr/bin/env node

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { getServiceClient } from '../../api/lib/supabase/client.js';
import { searchQuestions } from '../../api/learning/lib/questions/question-search-service.js';

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEFAULT_CURRICULUM_VERSION_TAG = '2025-2027_v1';

export const DEFAULT_QUESTION_SEARCH_GATE_THRESHOLDS = Object.freeze({
  exact_structured_match_rate: 0.9,
  subject_leakage_rate: 0,
  metadata_completeness_rate: 0.95,
  null_summary_rate: 0.05,
});

const STRUCTURED_FILTER_FIELDS = Object.freeze([
  'subject_code',
  'primary_topic_id',
  'family_id',
  'primary_question_type_id',
  'year',
  'session',
  'paper_number',
  'variant',
  'q_number',
]);

function resolvePath(targetPath) {
  if (!targetPath) return null;
  return path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(PROJECT_ROOT, targetPath);
}

function ensureArray(value, message) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(message);
  }
  return value;
}

function normalizeThresholds(input = {}) {
  return {
    ...DEFAULT_QUESTION_SEARCH_GATE_THRESHOLDS,
    ...(input || {}),
  };
}

function normalizeCurriculumVersionTag(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || DEFAULT_CURRICULUM_VERSION_TAG;
}

function isPresent(value) {
  if (value === null || typeof value === 'undefined') {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

function roundRate(value) {
  return Number(value.toFixed(4));
}

function ratio(numerator, denominator) {
  if (!denominator) {
    return 0;
  }
  return roundRate(numerator / denominator);
}

function sqlLiteral(value) {
  if (value === null || typeof value === 'undefined') {
    return 'NULL';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Unsupported numeric literal: ${value}`);
    }
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildCaseQuerySummary(testCase) {
  const parts = [];
  if (isPresent(testCase.query.topic_path)) {
    parts.push(`topic=${testCase.query.topic_path}`);
  }
  if (Number.isInteger(testCase.query.year)) {
    parts.push(`year=${testCase.query.year}`);
  }
  if (isPresent(testCase.query.session)) {
    parts.push(`session=${testCase.query.session}`);
  }
  if (Number.isInteger(testCase.query.paper_number)) {
    parts.push(`paper=${testCase.query.paper_number}`);
  }
  if (Number.isInteger(testCase.query.q_number)) {
    parts.push(`q=${testCase.query.q_number}`);
  }
  if (isPresent(testCase.query.primary_question_type_id)) {
    parts.push(`type=${testCase.query.primary_question_type_id}`);
  }
  if (isPresent(testCase.query.query)) {
    parts.push(`text~${testCase.query.query}`);
  }
  return parts.join(', ');
}

function buildMarkdownTable(headers, rows) {
  const headerLine = `| ${headers.join(' | ')} |`;
  const dividerLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map((cell) => String(cell)).join(' | ')} |`);
  return [headerLine, dividerLine, ...body].join('\n');
}

function parseJsonFixture(source, fixturePath) {
  const fixture = JSON.parse(source);
  if (!isPresent(fixture?.subject_code)) {
    throw new Error(`Fixture ${fixturePath} is missing subject_code.`);
  }
  const cases = ensureArray(
    fixture?.cases,
    `Fixture ${fixturePath} must contain a non-empty cases array.`,
  );

  cases.forEach((testCase, index) => {
    if (!isPresent(testCase?.id)) {
      throw new Error(`Fixture case at index ${index} is missing id.`);
    }
    if (!isPresent(testCase?.description)) {
      throw new Error(`Fixture case ${testCase.id} is missing description.`);
    }
    if (typeof testCase?.query !== 'object' || testCase.query === null) {
      throw new Error(`Fixture case ${testCase.id} is missing query.`);
    }
    if (typeof testCase?.expected !== 'object' || testCase.expected === null) {
      throw new Error(`Fixture case ${testCase.id} is missing expected.`);
    }
    if (typeof testCase.expected?.match !== 'object' || testCase.expected.match === null) {
      throw new Error(`Fixture case ${testCase.id} is missing expected.match.`);
    }
    ensureArray(
      testCase.expected?.required_metadata,
      `Fixture case ${testCase.id} must declare required_metadata.`,
    );
    if (!['allow_null', 'require_non_null'].includes(testCase.expected?.summary_policy)) {
      throw new Error(
        `Fixture case ${testCase.id} must use summary_policy allow_null or require_non_null.`,
      );
    }
  });

  return {
    ...fixture,
    curriculum_version_tag: normalizeCurriculumVersionTag(fixture?.curriculum_version_tag),
    thresholds: normalizeThresholds(fixture?.thresholds),
  };
}

export function loadQuestionSearchGoldFixture(fixturePath) {
  const resolvedPath = resolvePath(fixturePath);
  if (!resolvedPath) {
    throw new Error('Fixture path is required.');
  }
  return parseJsonFixture(
    fs.readFileSync(resolvedPath, 'utf8'),
    resolvedPath,
  );
}

export function buildCurriculumNodeResolutionSql({
  subjectCode,
  topicPath,
  curriculumVersionTag = DEFAULT_CURRICULUM_VERSION_TAG,
}) {
  return [
    'SELECT COALESCE(',
    '  (',
    '    SELECT to_json(node_id::text)',
    '    FROM public.curriculum_nodes',
    `    WHERE syllabus_code = ${sqlLiteral(subjectCode)}`,
    `      AND topic_path::text = ${sqlLiteral(topicPath)}`,
    `      AND version_tag = ${sqlLiteral(curriculumVersionTag)}`,
    '    ORDER BY node_id ASC',
    '    LIMIT 1',
    '  ),',
    '  \'null\'::json',
    ')::text;',
  ].join('\n');
}

function buildSearchInput(subjectCode, query, primaryTopicId) {
  const searchInput = {
    subject_code: query.subject_code || subjectCode,
  };

  if (isPresent(primaryTopicId)) {
    searchInput.primary_topic_id = primaryTopicId;
  }

  STRUCTURED_FILTER_FIELDS
    .filter((field) => field !== 'subject_code' && field !== 'primary_topic_id')
    .forEach((field) => {
      if (isPresent(query[field])) {
        searchInput[field] = query[field];
      }
    });

  if (isPresent(query.query)) {
    searchInput.query = query.query;
  }

  return searchInput;
}

function computeMetadataStatus(topResult, requiredMetadata) {
  const missing = [];
  let present = 0;

  for (const field of requiredMetadata) {
    if (isPresent(topResult?.[field])) {
      present += 1;
    } else {
      missing.push(field);
    }
  }

  return {
    present,
    total: requiredMetadata.length,
    missing,
  };
}

function exactStructuredMatch(topResult, expectedMatch) {
  if (!topResult) {
    return false;
  }
  return Object.entries(expectedMatch).every(([field, value]) => topResult[field] === value);
}

export function evaluateQuestionSearchGateThresholds(metrics, thresholds = DEFAULT_QUESTION_SEARCH_GATE_THRESHOLDS) {
  const checks = [
    {
      metric: 'exact_structured_match_rate',
      required: thresholds.exact_structured_match_rate,
      actual: metrics.exact_structured_match_rate,
      comparator: '>=',
      pass: metrics.exact_structured_match_rate >= thresholds.exact_structured_match_rate,
    },
    {
      metric: 'subject_leakage_rate',
      required: thresholds.subject_leakage_rate,
      actual: metrics.subject_leakage_rate,
      comparator: '<=',
      pass: metrics.subject_leakage_rate <= thresholds.subject_leakage_rate,
    },
    {
      metric: 'metadata_completeness_rate',
      required: thresholds.metadata_completeness_rate,
      actual: metrics.metadata_completeness_rate,
      comparator: '>=',
      pass: metrics.metadata_completeness_rate >= thresholds.metadata_completeness_rate,
    },
    {
      metric: 'null_summary_rate',
      required: thresholds.null_summary_rate,
      actual: metrics.null_summary_rate,
      comparator: '<=',
      pass: metrics.null_summary_rate <= thresholds.null_summary_rate,
    },
  ];

  return {
    pass: checks.every((check) => check.pass),
    checks,
    failing_checks: checks.filter((check) => !check.pass),
  };
}

function buildResidualRisks(environment, caseResults, gate) {
  const risks = [];
  const questionBank9709 = environment?.surfaces?.question_bank_9709 || {};
  const projection9709 = getProjectionSurface(environment);
  const v0 = environment?.surfaces?.question_descriptions_v0 || {};
  const prod = environment?.surfaces?.question_descriptions_prod_v1 || {};

  if ((questionBank9709.paper_question ?? 0) === 0) {
    risks.push(
      `The local 9709 question_bank slice has paper_question: ${questionBank9709.paper_question ?? 0}, so paper-backed pinned cases cannot pass until seeded paper-backed rows exist.`,
    );
  }

  if (prod.exists !== true && (v0.count_9709 ?? 0) === 0) {
    risks.push(
      'Descriptor surfaces are empty for 9709 in the checked environment, so summary-bearing paper-backed retrieval remains blocked by data posture rather than runner logic.',
    );
  }

  if ((projection9709.paper_question ?? 0) === 0) {
    risks.push(
      `learning_question_search_projection currently exposes paper_question: ${projection9709.paper_question ?? 0} for 9709, which means the gate is exercising imported fallback more than descriptor-backed retrieval.`,
    );
  }

  if (caseResults.some((result) => result.resolution_error === 'topic_path_not_found')) {
    risks.push(
      'At least one pinned paper-backed topic_path could not be resolved from curriculum_nodes in the checked environment.',
    );
  }

  if (!gate.pass) {
    risks.push(
      'The structured-retrieval gate is blocking release for this checked environment until the failing thresholds are addressed.',
    );
  }

  return [...new Set(risks)];
}

function getProjectionSurface(environment) {
  return (
    environment?.surfaces?.learning_question_search_projection_9709
    || environment?.surfaces?.learning_question_search_projection
    || {}
  );
}

function buildOutcomeLines(gate, caseResults) {
  const lines = [
    `- live_gate_status: \`${gate.pass ? 'pass' : 'fail'}\``,
  ];

  if (gate.pass) {
    lines.push('- All fixture cases met the structured-retrieval thresholds in the checked environment.');
    return lines;
  }

  const importedPassCount = caseResults.filter((result) => (
    result.exact_structured_match === true
    && result.summary_required === false
  )).length;
  const pinnedFailures = caseResults.filter((result) => result.exact_structured_match === false);

  lines.push(`- imported_fallback_cases_passing: \`${importedPassCount}\``);
  lines.push(`- pinned_case_failures: \`${pinnedFailures.length}\``);

  if (pinnedFailures.some((result) => result.resolution_error === 'topic_path_not_found')) {
    lines.push('- Paper-backed pinned cases are currently failing at topic resolution in the checked environment.');
  }

  if (gate.failing_checks.length > 0) {
    lines.push(`- failing_metrics: \`${gate.failing_checks.map((check) => check.metric).join(', ')}\``);
  }

  return lines;
}

export function renderQuestionSearchGateReport({
  fixture,
  fixturePath,
  gateCommand,
  nowIso,
  environment,
  caseResults,
  metrics,
  gate,
}) {
  const fixtureRows = fixture.cases.map((testCase) => [
    testCase.id,
    buildCaseQuerySummary(testCase) || '(none)',
    testCase.expected.summary_policy,
    testCase.expected.match.source_kind || '(unspecified)',
  ]);

  const projectionSurface = getProjectionSurface(environment);
  const surfaceRows = [
    [
      'question_descriptions_prod_v1',
      environment?.surfaces?.question_descriptions_prod_v1?.exists === true ? 'yes' : 'no',
      environment?.surfaces?.question_descriptions_prod_v1?.count ?? 'n/a',
      environment?.surfaces?.question_descriptions_prod_v1?.count_9709 ?? 'n/a',
    ],
    [
      'question_descriptions_v1',
      environment?.surfaces?.question_descriptions_v1?.exists === true ? 'yes' : 'no',
      environment?.surfaces?.question_descriptions_v1?.count ?? 'n/a',
      environment?.surfaces?.question_descriptions_v1?.count_9709 ?? 'n/a',
    ],
    [
      'question_descriptions_v0',
      environment?.surfaces?.question_descriptions_v0?.exists === true ? 'yes' : 'no',
      environment?.surfaces?.question_descriptions_v0?.count ?? 'n/a',
      environment?.surfaces?.question_descriptions_v0?.count_9709 ?? 'n/a',
    ],
    [
      'learning_question_search_projection_9709',
      'yes',
      projectionSurface.total ?? projectionSurface.count ?? 'n/a',
      `paper_question: ${projectionSurface.paper_question ?? 'n/a'}, imported_question: ${projectionSurface.imported_question ?? 'n/a'}`,
    ],
    [
      'question_bank_9709',
      'yes',
      environment?.surfaces?.question_bank_9709?.total ?? 'n/a',
      `paper_question: ${environment?.surfaces?.question_bank_9709?.paper_question ?? 'n/a'}, imported_question: ${environment?.surfaces?.question_bank_9709?.imported_question ?? 'n/a'}`,
    ],
    [
      'curriculum_nodes_9709',
      'yes',
      environment?.surfaces?.curriculum_nodes_9709?.count ?? 'n/a',
      'topic_path::text like 9709.%',
    ],
  ];

  const caseRows = caseResults.map((result) => [
    result.id,
    result.resolution_error || result.query_summary || '(none)',
    result.top_result_question_id || '(none)',
    result.exact_structured_match ? 'pass' : 'fail',
    `${result.metadata_present_count}/${result.metadata_required_count}`,
    result.summary_required ? (result.summary_present ? 'present' : 'missing') : 'n/a',
    result.subject_leakage ? 'yes' : 'no',
  ]);

  const thresholdRows = gate.checks.map((check) => [
    check.metric,
    check.comparator,
    check.required,
    check.actual,
    check.pass ? 'pass' : 'fail',
  ]);

  const residualRisks = buildResidualRisks(environment, caseResults, gate);
  const outcomeLines = buildOutcomeLines(gate, caseResults);

  return [
    '# 2026-04-15 Question Search Slice V1 Report',
    '',
    '## Scope',
    '',
    'This report records the stage-3 structured question-search gate run for the `9709` pilot slice.',
    'It reuses the stage-1 descriptor fallback contract and adds release-style retrieval metrics on top of the stage-2 question-search projection.',
    '',
    '## Runner Output',
    '',
    'All sections below this heading are emitted by `scripts/evaluation/run_question_search_gate.js`.',
    'If the checked-in report contains sections above this heading, those sections are manual supplements and are not regenerated by the runner.',
    '',
    '## Commands',
    '',
    '```bash',
    gateCommand,
    '```',
    '',
    '## Fixture',
    '',
    `- Fixture path: \`${fixturePath}\``,
    `- Generated at (UTC): \`${nowIso}\``,
    `- Case count: \`${fixture.cases.length}\``,
    '',
    buildMarkdownTable(
      ['Case', 'Query', 'Summary Policy', 'Expected Source Kind'],
      fixtureRows,
    ),
    '',
    '## Descriptor Source',
    '',
    `Selected branch: \`${environment?.selected_branch || 'unknown'}\``,
    `Curriculum version tag for topic resolution: \`${fixture.curriculum_version_tag}\``,
    '',
    buildMarkdownTable(
      ['Surface', 'Exists', 'Count', '9709 Detail'],
      surfaceRows,
    ),
    '',
    '## Frozen Descriptor Fallback Contract',
    '',
    '- Prefer `public.question_descriptions_prod_v1` when that relation exists.',
    '- Otherwise fall back to `public.question_descriptions_v0` filtered to `status = \'ok\'`.',
    '- `question_descriptions_v1` is counted for descriptor-surface visibility only; it is not an independent fallback branch for this gate.',
    `- Resolve curriculum nodes with \`syllabus_code + topic_path + version_tag\`, using \`${fixture.curriculum_version_tag}\` for this fixture.`,
    '',
    '## Case Results',
    '',
    buildMarkdownTable(
      ['Case', 'Resolution / Query', 'Top Result', 'Exact Match', 'Metadata', 'Summary', 'Subject Leakage'],
      caseRows,
    ),
    '',
    '## Threshold Results',
    '',
    buildMarkdownTable(
      ['Metric', 'Comparator', 'Required', 'Actual', 'Status'],
      thresholdRows,
    ),
    '',
    '## Metrics',
    '',
    `- exact_structured_match_rate: \`${metrics.exact_structured_match_rate}\``,
    `- subject_leakage_rate: \`${metrics.subject_leakage_rate}\``,
    `- metadata_completeness_rate: \`${metrics.metadata_completeness_rate}\``,
    `- null_summary_rate: \`${metrics.null_summary_rate}\``,
    `- gate_pass: \`${gate.pass}\``,
    '',
    '## Outcome',
    '',
    ...outcomeLines,
    '',
    '## Residual Risks',
    '',
    ...residualRisks.map((risk) => `- ${risk}`),
    '',
  ].join('\n');
}

export async function runQuestionSearchGate({
  fixture,
  fixturePath = '(inline fixture)',
  gateCommand = 'node scripts/evaluation/run_question_search_gate.js',
  searchQuestionsFn,
  resolveTopicPathFn,
  inspectDescriptorSourceFn,
  nowIso = new Date().toISOString(),
} = {}) {
  if (!fixture) {
    throw new Error('Fixture is required.');
  }
  if (typeof searchQuestionsFn !== 'function') {
    throw new Error('searchQuestionsFn is required.');
  }
  if (typeof resolveTopicPathFn !== 'function') {
    throw new Error('resolveTopicPathFn is required.');
  }
  if (typeof inspectDescriptorSourceFn !== 'function') {
    throw new Error('inspectDescriptorSourceFn is required.');
  }

  const normalizedFixture = {
    ...fixture,
    curriculum_version_tag: normalizeCurriculumVersionTag(fixture.curriculum_version_tag),
    thresholds: normalizeThresholds(fixture.thresholds),
    cases: ensureArray(
      fixture.cases,
      'Question-search gate fixture must contain at least one case.',
    ),
  };

  const environment = await inspectDescriptorSourceFn();

  let exactMatchCount = 0;
  let leakageCaseCount = 0;
  let metadataPresentCount = 0;
  let metadataRequiredCount = 0;
  let summaryRequiredCount = 0;
  let missingSummaryCount = 0;

  const caseResults = [];

  for (const testCase of normalizedFixture.cases) {
    const caseSubject = testCase.query.subject_code || normalizedFixture.subject_code;
    let resolvedTopicId = null;
    let resolutionError = null;

    if (isPresent(testCase.query.topic_path)) {
      resolvedTopicId = await resolveTopicPathFn({
        subjectCode: caseSubject,
        topicPath: testCase.query.topic_path,
        curriculumVersionTag: normalizedFixture.curriculum_version_tag,
      });
      if (!isPresent(resolvedTopicId)) {
        resolutionError = 'topic_path_not_found';
      }
    }

    const searchInput = buildSearchInput(caseSubject, testCase.query, resolvedTopicId);
    const response = resolutionError
      ? { items: [], total: 0 }
      : await searchQuestionsFn(searchInput);

    const items = Array.isArray(response?.items) ? response.items : [];
    const topResult = items[0] || null;
    const metadataStatus = computeMetadataStatus(
      topResult,
      testCase.expected.required_metadata,
    );
    const exactMatch = exactStructuredMatch(topResult, testCase.expected.match);
    const subjectLeakage = items.some((item) => item?.subject_code !== caseSubject);
    const summaryRequired = testCase.expected.summary_policy === 'require_non_null';
    const summaryPresent = summaryRequired
      ? isPresent(topResult?.summary)
      : false;

    if (exactMatch) {
      exactMatchCount += 1;
    }
    if (subjectLeakage) {
      leakageCaseCount += 1;
    }

    metadataPresentCount += metadataStatus.present;
    metadataRequiredCount += metadataStatus.total;

    if (summaryRequired) {
      summaryRequiredCount += 1;
      if (!summaryPresent) {
        missingSummaryCount += 1;
      }
    }

    caseResults.push({
      id: testCase.id,
      description: testCase.description,
      query_summary: buildCaseQuerySummary(testCase),
      resolved_query: searchInput,
      resolution_error: resolutionError,
      total_results: Number.isInteger(response?.total) ? response.total : items.length,
      top_result_question_id: topResult?.question_id || null,
      exact_structured_match: exactMatch,
      subject_leakage: subjectLeakage,
      metadata_present_count: metadataStatus.present,
      metadata_required_count: metadataStatus.total,
      missing_metadata: metadataStatus.missing,
      summary_required: summaryRequired,
      summary_present: summaryPresent,
    });
  }

  const metrics = {
    exact_structured_match_rate: ratio(exactMatchCount, normalizedFixture.cases.length),
    subject_leakage_rate: ratio(leakageCaseCount, normalizedFixture.cases.length),
    metadata_completeness_rate: ratio(metadataPresentCount, metadataRequiredCount),
    null_summary_rate: ratio(missingSummaryCount, summaryRequiredCount),
  };

  const gate = evaluateQuestionSearchGateThresholds(
    metrics,
    normalizedFixture.thresholds,
  );

  const reportMarkdown = renderQuestionSearchGateReport({
    fixture: normalizedFixture,
    fixturePath,
    gateCommand,
    nowIso,
    environment,
    caseResults,
    metrics,
    gate,
  });

  return {
    fixture: normalizedFixture,
    environment,
    case_results: caseResults,
    metrics,
    gate,
    report_markdown: reportMarkdown,
  };
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL
    || process.env.SUPABASE_DB_URL
    || process.env.SUPABASE_DATABASE_URL
    || null;
}

async function runPsql(sql) {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL (or SUPABASE_DB_URL / SUPABASE_DATABASE_URL) is required.');
  }

  const { stdout } = await execFileAsync(
    'psql',
    [databaseUrl, '-X', '-A', '-t', '-q', '-c', sql],
    {
      cwd: PROJECT_ROOT,
      maxBuffer: 1024 * 1024 * 4,
      env: process.env,
    },
  );

  return stdout.trim();
}

async function resolveTopicPathFromDatabase({
  subjectCode,
  topicPath,
  curriculumVersionTag = DEFAULT_CURRICULUM_VERSION_TAG,
}) {
  const sql = buildCurriculumNodeResolutionSql({
    subjectCode,
    topicPath,
    curriculumVersionTag,
  });
  return JSON.parse(await runPsql(sql));
}

async function searchProjectionFromDatabase(searchInput) {
  return searchQuestions(getServiceClient(), searchInput, {
    productMode: true,
  });
}

async function inspectDescriptorSourceFromDatabase(subjectCode) {
  const prodExists = await relationExists('public.question_descriptions_prod_v1');
  const v1Exists = await relationExists('public.question_descriptions_v1');
  const v0Exists = await relationExists('public.question_descriptions_v0');

  return {
    selected_branch: prodExists
      ? 'question_descriptions_prod_v1'
      : (v0Exists ? 'question_descriptions_v0_status_ok' : 'descriptor_source_missing'),
    surfaces: {
      question_descriptions_prod_v1: {
        exists: prodExists,
        count: prodExists ? await countRows('public.question_descriptions_prod_v1') : null,
        count_9709: prodExists
          ? await countRows('public.question_descriptions_prod_v1', `syllabus_code = ${sqlLiteral(subjectCode)}`)
          : null,
      },
      question_descriptions_v1: {
        exists: v1Exists,
        count: v1Exists ? await countRows('public.question_descriptions_v1') : null,
        count_9709: v1Exists
          ? await countRows('public.question_descriptions_v1', `syllabus_code = ${sqlLiteral(subjectCode)}`)
          : null,
      },
      question_descriptions_v0: {
        exists: v0Exists,
        count: v0Exists ? await countRows('public.question_descriptions_v0') : null,
        count_9709: v0Exists
          ? await countRows(
            'public.question_descriptions_v0',
            `syllabus_code = ${sqlLiteral(subjectCode)} AND status = 'ok'`,
          )
          : null,
      },
      learning_question_search_projection_9709: {
        total: await countRows(
          'public.learning_question_search_projection',
          `subject_code = ${sqlLiteral(subjectCode)}`,
        ),
        paper_question: await countRows(
          'public.learning_question_search_projection',
          `subject_code = ${sqlLiteral(subjectCode)} AND source_kind = 'paper_question'`,
        ),
        imported_question: await countRows(
          'public.learning_question_search_projection',
          `subject_code = ${sqlLiteral(subjectCode)} AND source_kind = 'imported_question'`,
        ),
      },
      question_bank_9709: {
        total: await countRows(
          'public.question_bank',
          `subject_code = ${sqlLiteral(subjectCode)}`,
        ),
        paper_question: await countRows(
          'public.question_bank',
          `subject_code = ${sqlLiteral(subjectCode)} AND source_kind = 'paper_question'`,
        ),
        imported_question: await countRows(
          'public.question_bank',
          `subject_code = ${sqlLiteral(subjectCode)} AND source_kind = 'imported_question'`,
        ),
      },
      curriculum_nodes_9709: {
        count: await countRows(
          'public.curriculum_nodes',
          `topic_path::text LIKE ${sqlLiteral(`${subjectCode}.%`)}`,
        ),
      },
    },
  };
}

async function relationExists(relationName) {
  const sql = `SELECT (to_regclass(${sqlLiteral(relationName)}) IS NOT NULL)::text;`;
  return (await runPsql(sql)) === 'true';
}

async function countRows(relationName, whereClause = null) {
  const sql = [
    'SELECT COUNT(*)::text',
    `FROM ${relationName}`,
    whereClause ? `WHERE ${whereClause}` : '',
    ';',
  ].join('\n');
  return Number.parseInt(await runPsql(sql), 10);
}

function parseArgs(argv) {
  const args = {
    fixture: null,
    report: null,
    jsonOut: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--fixture') {
      args.fixture = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--report') {
      args.report = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--json-out') {
      args.jsonOut = argv[index + 1] || null;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!args.fixture) {
    throw new Error('--fixture is required.');
  }
  if (!args.report) {
    throw new Error('--report is required.');
  }

  return args;
}

function buildGateCommand(args) {
  const tokens = [
    'node scripts/evaluation/run_question_search_gate.js',
    '--fixture',
    args.fixture,
    '--report',
    args.report,
  ];
  if (args.jsonOut) {
    tokens.push('--json-out', args.jsonOut);
  }
  return tokens.join(' ');
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const fixturePath = resolvePath(args.fixture);
  const reportPath = resolvePath(args.report);
  const jsonOutPath = args.jsonOut ? resolvePath(args.jsonOut) : null;
  const fixture = loadQuestionSearchGoldFixture(fixturePath);

  const result = await runQuestionSearchGate({
    fixture,
    fixturePath: path.relative(PROJECT_ROOT, fixturePath),
    gateCommand: buildGateCommand(args),
    searchQuestionsFn: searchProjectionFromDatabase,
    resolveTopicPathFn: resolveTopicPathFromDatabase,
    inspectDescriptorSourceFn: () => inspectDescriptorSourceFromDatabase(fixture.subject_code),
  });

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, result.report_markdown, 'utf8');

  if (jsonOutPath) {
    fs.mkdirSync(path.dirname(jsonOutPath), { recursive: true });
    fs.writeFileSync(
      jsonOutPath,
      `${JSON.stringify({
        fixture_path: path.relative(PROJECT_ROOT, fixturePath),
        metrics: result.metrics,
        gate: result.gate,
        environment: result.environment,
        case_results: result.case_results,
      }, null, 2)}\n`,
      'utf8',
    );
  }

  const failingMetrics = result.gate.failing_checks.map((check) => check.metric).join(', ') || '(none)';
  console.log(`fixture=${path.relative(PROJECT_ROOT, fixturePath)}`);
  console.log(`report=${path.relative(PROJECT_ROOT, reportPath)}`);
  if (jsonOutPath) {
    console.log(`json_out=${path.relative(PROJECT_ROOT, jsonOutPath)}`);
  }
  console.log(`exact_structured_match_rate=${result.metrics.exact_structured_match_rate}`);
  console.log(`subject_leakage_rate=${result.metrics.subject_leakage_rate}`);
  console.log(`metadata_completeness_rate=${result.metrics.metadata_completeness_rate}`);
  console.log(`null_summary_rate=${result.metrics.null_summary_rate}`);
  console.log(`descriptor_source=${result.environment.selected_branch}`);
  console.log(`gate_pass=${result.gate.pass}`);
  console.log(`failing_metrics=${failingMetrics}`);

  return result.gate.pass ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error) => {
      console.error(error?.stack || String(error));
      process.exitCode = 1;
    },
  );
}
