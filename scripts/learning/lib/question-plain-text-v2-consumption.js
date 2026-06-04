import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SCHEMA_VERSION = 'question_plain_text_v2_consumption_v1';
const NORMALIZED_TEXT_SOURCE = 'question_plain_text_v2.normalized_plain_text';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter((entry) => entry !== null && typeof entry !== 'undefined') : [];
}

function normalizeStringArray(value) {
  return [...new Set(normalizeArray(value).map((entry) => normalizeString(entry)).filter(Boolean))];
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return null;
}

function normalizePositiveInteger(value) {
  return Number.isInteger(value) && value > 0 ? value : null;
}

function contentHash(value) {
  return crypto.createHash('sha1').update(String(value || '')).digest('hex');
}

function toPaperId(item) {
  const parts = [
    item?.subject_code,
    item?.session,
    Number.isInteger(item?.year) ? String(item.year).slice(-2) : null,
    item?.paper,
    item?.variant,
  ].map((part) => normalizeNullableString(part));

  if (parts.every(Boolean)) {
    return `${parts[0]}_${parts[1]}${parts[2]}_${parts[3]}${parts[4]}`;
  }
  return null;
}

function buildTextConsumptionStatus({ normalizedPlainText, textOnlyAddressable, requiresImageContext }) {
  if (!normalizedPlainText) {
    return 'blocked_missing_text';
  }
  if (requiresImageContext) {
    return 'image_context_required';
  }
  if (textOnlyAddressable) {
    return 'text_only_ready';
  }
  return 'blocked_not_text_only_ready';
}

function buildSourceRef(item, {
  index,
  sourceArtifactPath,
  textConsumptionStatus,
  textOnlyAddressable,
  requiresImageContext,
  imageAssets,
}) {
  const qNumber = normalizePositiveInteger(item?.q_number);
  const storageKey = normalizeString(item?.storage_key);
  const sourceRef = {
    asset_id: storageKey || `question_plain_text_v2:${index}`,
    storage_key: storageKey || null,
    q_number: qNumber,
    question_id: storageKey && qNumber ? `${storageKey}#q${qNumber}` : `question_plain_text_v2:${index}`,
    chunk_index: 0,
    chunk_kind: 'question_plain_text_v2',
    source_artifact: sourceArtifactPath,
    text_consumption_status: textConsumptionStatus,
    text_only_addressable: textOnlyAddressable,
    requires_image_context: requiresImageContext,
  };

  const paperId = toPaperId(item);
  if (paperId) {
    sourceRef.paper_id = paperId;
  }
  if (imageAssets.length > 0) {
    sourceRef.image_assets = imageAssets;
  }
  return sourceRef;
}

function buildConsumptionItem(item, {
  index,
  sourceArtifactPath,
}) {
  const normalizedPlainText = normalizeString(item?.normalized_plain_text);
  const imageAssets = normalizeStringArray(item?.image_assets);
  const requiresImageContext =
    normalizeBoolean(item?.requires_image_context) === true
    || normalizeString(item?.answering_mode) === 'image_context_required';
  const textOnlyAddressable =
    normalizeBoolean(item?.text_only_addressable) === true
    && !requiresImageContext
    && Boolean(normalizedPlainText);
  const textConsumptionStatus = buildTextConsumptionStatus({
    normalizedPlainText,
    textOnlyAddressable,
    requiresImageContext,
  });
  const sourceRef = buildSourceRef(item, {
    index,
    sourceArtifactPath,
    textConsumptionStatus,
    textOnlyAddressable,
    requiresImageContext,
    imageAssets,
  });

  const base = {
    schema_version: SCHEMA_VERSION,
    storage_key: normalizeNullableString(item?.storage_key),
    subject_code: normalizeNullableString(item?.subject_code),
    year: Number.isInteger(item?.year) ? item.year : null,
    session: normalizeNullableString(item?.session),
    paper_number: Number.isInteger(item?.paper) ? item.paper : null,
    variant: Number.isInteger(item?.variant) ? item.variant : null,
    q_number: normalizePositiveInteger(item?.q_number),
    source_pdf: normalizeNullableString(item?.source_pdf),
    source_version: normalizeNullableString(item?.source_version),
    primary_topic_path: normalizeNullableString(item?.primary_topic_path),
    normalized_plain_text: normalizedPlainText,
    question_plain_text_source: NORMALIZED_TEXT_SOURCE,
    text_source: normalizeNullableString(item?.text_source),
    text_consumption_status: textConsumptionStatus,
    text_only_addressable: textOnlyAddressable,
    requires_image_context: requiresImageContext,
    has_diagram: normalizeBoolean(item?.has_diagram) === true,
    table_heavy: normalizeBoolean(item?.table_heavy) === true,
    formula_dense: normalizeBoolean(item?.formula_dense) === true,
    math_expression_count: Number.isInteger(item?.math_expression_count) ? item.math_expression_count : 0,
    image_assets: imageAssets,
  };

  return {
    ...base,
    search: {
      search_text: normalizedPlainText,
      search_text_source: normalizedPlainText ? NORMALIZED_TEXT_SOURCE : null,
      summary: normalizedPlainText || null,
      primary_topic_path: base.primary_topic_path,
      text_consumption_status: textConsumptionStatus,
      requires_image_context: requiresImageContext,
      text_only_addressable: textOnlyAddressable,
    },
    read_model: {
      prompt_representation: normalizedPlainText
        ? {
          type: 'text',
          value: normalizedPlainText,
        }
        : null,
      provenance_summary: {
        storage_key: base.storage_key,
        q_number: base.q_number,
        source_kind: 'paper_question',
        normalized_plain_text: normalizedPlainText || null,
        question_plain_text_version: 'v2',
        question_plain_text_source: NORMALIZED_TEXT_SOURCE,
        question_plain_text_artifact: sourceArtifactPath,
        text_source: base.text_source,
        text_consumption_status: textConsumptionStatus,
        search_text: normalizedPlainText || null,
        search_text_source: normalizedPlainText ? NORMALIZED_TEXT_SOURCE : null,
        text_only_addressable: textOnlyAddressable,
        requires_image_context: requiresImageContext,
        image_assets: imageAssets,
      },
    },
    rag: {
      content: normalizedPlainText,
      content_hash: normalizedPlainText ? contentHash(normalizedPlainText) : null,
      syllabus_code: base.subject_code,
      topic_path: base.primary_topic_path || 'unmapped',
      source_type: 'question_plain_text_v2',
      source_ref: sourceRef,
      corpus_version: 'question_plain_text_v2_consumption_v1',
      content_source: normalizedPlainText ? NORMALIZED_TEXT_SOURCE : null,
      retrieval_context: textConsumptionStatus,
    },
  };
}

function makeBlocker(check, message, {
  severity = 'blocker',
  count = null,
  samples = [],
} = {}) {
  return {
    check,
    severity,
    message,
    count,
    sample_storage_keys: samples.slice(0, 10),
  };
}

function numberFromSummary(summary, field) {
  const value = summary?.[field];
  return Number.isInteger(value) ? value : null;
}

function countRows(rows, predicate) {
  return rows.filter(predicate).length;
}

function buildBlockers(layer, rows, summary) {
  const blockers = [];
  const sourceSummary = layer?.summary || {};

  if (normalizeString(layer?.status) !== 'pass' && normalizeString(layer?.verdict) !== 'pass') {
    blockers.push(makeBlocker(
      'source_artifact_not_pass',
      'The source question_plain_text_v2 artifact is not marked pass.',
    ));
  }

  if (normalizeArray(layer?.blockers).length > 0 || Number(sourceSummary.blockers || 0) > 0) {
    blockers.push(makeBlocker(
      'source_artifact_blockers',
      'The source question_plain_text_v2 artifact reports blockers.',
      { count: normalizeArray(layer?.blockers).length || Number(sourceSummary.blockers || 0) },
    ));
  }

  const missingTextRows = rows.filter((row) => !row.normalized_plain_text);
  if (missingTextRows.length > 0) {
    blockers.push(makeBlocker(
      'missing_normalized_plain_text',
      'Every consumption row must have normalized_plain_text.',
      {
        count: missingTextRows.length,
        samples: missingTextRows.map((row) => row.storage_key).filter(Boolean),
      },
    ));
  }

  const imageMissingRows = rows.filter((row) => row.requires_image_context && row.image_assets.length === 0);
  if (imageMissingRows.length > 0) {
    blockers.push(makeBlocker(
      'missing_image_asset',
      'Rows requiring image context must carry at least one image asset reference.',
      {
        count: imageMissingRows.length,
        samples: imageMissingRows.map((row) => row.storage_key).filter(Boolean),
      },
    ));
  }

  const expectedPairs = [
    ['production_rows', summary.rows_read],
    ['v2_rows', summary.rows_read],
    ['normalized_plain_text_rows', summary.normalized_plain_text_rows],
    ['text_only_ready_rows', summary.text_only_ready_rows],
    ['image_context_required_rows', summary.image_context_required_rows],
    ['image_context_rows_with_assets', summary.image_context_rows_with_assets],
  ];
  const mismatches = expectedPairs
    .map(([field, actual]) => ({
      field,
      expected: numberFromSummary(sourceSummary, field),
      actual,
    }))
    .filter((entry) => entry.expected !== null && entry.expected !== entry.actual);

  if (mismatches.length > 0) {
    blockers.push(makeBlocker(
      'summary_mismatch',
      'Computed consumption counts do not match the source v2 summary.',
      { count: mismatches.length },
    ));
  }

  for (const [check, field] of [
    ['search_not_using_normalized_plain_text', 'search_rows_using_normalized_plain_text'],
    ['read_model_not_using_normalized_plain_text', 'read_model_rows_using_normalized_plain_text'],
    ['rag_not_using_normalized_plain_text', 'rag_rows_using_normalized_plain_text'],
  ]) {
    if (summary[field] !== summary.rows_read) {
      blockers.push(makeBlocker(
        check,
        `${field} must equal rows_read.`,
        { count: summary.rows_read - summary[field] },
      ));
    }
  }

  return blockers;
}

function buildSummary(layer, rows, sourceArtifactPath) {
  return {
    source_artifact: sourceArtifactPath,
    source_schema_version: normalizeNullableString(layer?.schema_version),
    source_status: normalizeNullableString(layer?.status || layer?.verdict),
    rows_read: rows.length,
    normalized_plain_text_rows: countRows(rows, (row) => Boolean(row.normalized_plain_text)),
    text_only_ready_rows: countRows(rows, (row) => row.text_consumption_status === 'text_only_ready'),
    image_context_required_rows: countRows(rows, (row) => row.text_consumption_status === 'image_context_required'),
    image_context_rows_with_assets: countRows(
      rows,
      (row) => row.text_consumption_status === 'image_context_required' && row.image_assets.length > 0,
    ),
    search_rows_using_normalized_plain_text: countRows(
      rows,
      (row) => row.search.search_text_source === NORMALIZED_TEXT_SOURCE && row.search.search_text === row.normalized_plain_text,
    ),
    read_model_rows_using_normalized_plain_text: countRows(
      rows,
      (row) => row.read_model.prompt_representation?.value === row.normalized_plain_text
        && row.read_model.provenance_summary.search_text_source === NORMALIZED_TEXT_SOURCE,
    ),
    rag_rows_using_normalized_plain_text: countRows(
      rows,
      (row) => row.rag.content_source === NORMALIZED_TEXT_SOURCE && row.rag.content === row.normalized_plain_text,
    ),
    legacy_search_text_only_rows: countRows(
      rows,
      (row) => row.search.search_text && row.search.search_text_source !== NORMALIZED_TEXT_SOURCE,
    ),
  };
}

export function buildQuestionPlainTextV2Consumption(layer, {
  generatedOn = new Date().toISOString().slice(0, 10),
  sourceArtifactPath = 'docs/reports/2026-06-04-9709-question-plain-text-v2.json',
  workflowGaps = [],
} = {}) {
  const sourceItems = normalizeArray(layer?.items);
  const items = sourceItems.map((item, index) => buildConsumptionItem(item, {
    index,
    sourceArtifactPath,
  }));
  const summary = buildSummary(layer, items, sourceArtifactPath);
  const blockers = buildBlockers(layer, items, summary);

  return {
    schema_version: SCHEMA_VERSION,
    generated_on: generatedOn,
    source_artifact: sourceArtifactPath,
    status: blockers.length === 0 ? 'pass' : 'fail',
    summary,
    blockers,
    workflow_gaps: normalizeStringArray(workflowGaps),
    consumption_boundaries: {
      local_deterministic_gate: true,
      live_db_consumption_claimed: false,
      deployed_search_consumption_claimed: false,
      online_rag_ingestion_claimed: false,
      external_vlm_or_api_used: false,
    },
    consumption_contract: {
      primary_text_field: 'normalized_plain_text',
      search_text_source: NORMALIZED_TEXT_SOURCE,
      read_model_prompt_source: NORMALIZED_TEXT_SOURCE,
      rag_content_source: NORMALIZED_TEXT_SOURCE,
      text_only_status: 'text_only_ready',
      image_context_status: 'image_context_required',
    },
    items,
  };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell)).join(' | ')} |`),
  ].join('\n');
}

export function buildQuestionPlainTextV2ConsumptionMarkdown(result) {
  const s = result.summary;
  const subjectMatch = /^(\d{4})_question_plain_text_v2$/.exec(String(s.source_schema_version || ''));
  const subjectCode = subjectMatch?.[1] || result.items?.[0]?.subject_code || '9709';
  const lines = [
    `# ${subjectCode} Question Plain Text v2 Consumption Gate`,
    '',
    `- status: \`${result.status}\``,
    `- generated_on: \`${result.generated_on}\``,
    `- source artifact: \`${result.source_artifact}\``,
    `- rows read: \`${s.rows_read}\``,
    '- This is a local deterministic consumption gate.',
    '- It does not claim live DB, deployed search, or online RAG ingestion has already run.',
    '- It does not rerun OCR/VLM and does not call external APIs.',
    '',
    '## Gate Summary',
    '',
    markdownTable(['metric', 'value'], [
      ['rows read', s.rows_read],
      ['normalized_plain_text rows', s.normalized_plain_text_rows],
      ['text-only ready rows', s.text_only_ready_rows],
      ['image-context required rows', s.image_context_required_rows],
      ['image-context rows with assets', s.image_context_rows_with_assets],
      ['search rows using normalized_plain_text', s.search_rows_using_normalized_plain_text],
      ['read-model rows using normalized_plain_text', s.read_model_rows_using_normalized_plain_text],
      ['RAG rows using normalized_plain_text', s.rag_rows_using_normalized_plain_text],
      ['legacy search_text-only rows', s.legacy_search_text_only_rows],
    ]),
    '',
    '## Consumption Contract',
    '',
    '- search uses `question_plain_text_v2.normalized_plain_text` as `search_text`.',
    '- read-model rows use `normalized_plain_text` as `prompt_representation.value` and provenance `search_text`.',
    '- RAG candidate rows use `normalized_plain_text` as chunk `content` with source_type `question_plain_text_v2`.',
    '- `text_only_ready` rows are separable from `image_context_required` rows.',
    '',
    '## Blockers',
    '',
  ];

  if (result.blockers.length === 0) {
    lines.push('- none');
  } else {
    for (const blocker of result.blockers) {
      lines.push(`- ${blocker.check}: ${blocker.message}`);
    }
  }

  lines.push('', '## Workflow Gaps', '');
  if (!Array.isArray(result.workflow_gaps) || result.workflow_gaps.length === 0) {
    lines.push('- none');
  } else {
    for (const gap of result.workflow_gaps) {
      lines.push(`- ${gap}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export function readQuestionPlainTextV2Layer(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeQuestionPlainTextV2ConsumptionArtifacts(result, {
  jsonOut,
  markdownOut,
} = {}) {
  if (!jsonOut) {
    throw new Error('jsonOut is required.');
  }
  if (!markdownOut) {
    throw new Error('markdownOut is required.');
  }

  fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
  fs.mkdirSync(path.dirname(markdownOut), { recursive: true });
  fs.writeFileSync(jsonOut, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownOut, buildQuestionPlainTextV2ConsumptionMarkdown(result), 'utf8');
}
