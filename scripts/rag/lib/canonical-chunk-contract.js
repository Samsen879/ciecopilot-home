export const CANONICAL_CHUNK_COLUMNS = Object.freeze([
  'id',
  'content',
  'embedding',
  'syllabus_code',
  'topic_path',
  'node_id',
  'source_type',
  'source_ref',
  'corpus_version',
  'content_hash',
]);

export function isResolvableSourceRef(sourceRef) {
  if (!sourceRef || typeof sourceRef !== 'object') return false;
  if (typeof sourceRef.asset_id !== 'string' || !sourceRef.asset_id.trim()) return false;
  const hasPageNo = Number.isInteger(sourceRef.page_no) && sourceRef.page_no > 0;
  const hasQuestionId = typeof sourceRef.question_id === 'string' && sourceRef.question_id.trim().length > 0;
  return hasPageNo || hasQuestionId;
}

export function summarizeCanonicalChunkContract({
  columnPresence = {},
  rows = [],
  probeErrors = {},
} = {}) {
  const availableColumns = CANONICAL_CHUNK_COLUMNS.filter((column) => columnPresence[column] === true);
  const missingColumns = CANONICAL_CHUNK_COLUMNS.filter((column) => columnPresence[column] !== true);
  const total = rows.length || 1;
  const sourceRefCoverage = rows.filter((row) => isResolvableSourceRef(row.source_ref)).length;
  const corpusVersionCoverage = rows.filter((row) => typeof row.corpus_version === 'string' && row.corpus_version.trim()).length;
  const contentHashCoverage = rows.filter((row) => typeof row.content_hash === 'string' && row.content_hash.trim()).length;

  let status = 'pass';
  if (missingColumns.length > 0) {
    status = 'pending_schema_expansion';
  } else if (rows.length === 0) {
    status = 'empty_canonical_corpus';
  }

  return {
    generated_at: new Date().toISOString(),
    expected_columns: CANONICAL_CHUNK_COLUMNS,
    available_columns: availableColumns,
    missing_columns: missingColumns,
    probe_errors: probeErrors,
    total_chunks_sampled: rows.length,
    metrics: {
      source_ref_resolvability_rate: Number((sourceRefCoverage / total).toFixed(6)),
      corpus_version_coverage_rate: Number((corpusVersionCoverage / total).toFixed(6)),
      content_hash_coverage_rate: Number((contentHashCoverage / total).toFixed(6)),
      empty_corpus: rows.length === 0,
    },
    status,
  };
}

export function renderCanonicalChunkContractReport(summary) {
  const lines = [
    '# Canonical Chunk Contract',
    '',
    `- Generated at: \`${summary.generated_at}\``,
    `- Status: \`${summary.status}\``,
    '',
    '## Expected Columns',
    '',
    `- \`${summary.expected_columns.join(', ')}\``,
    '',
    '## Availability',
    '',
    `- available_columns: \`${summary.available_columns.join(', ') || 'NONE'}\``,
    `- missing_columns: \`${summary.missing_columns.join(', ') || 'NONE'}\``,
    '',
    '## Metrics',
    '',
    `- empty_corpus: \`${summary.metrics.empty_corpus}\``,
    `- source_ref_resolvability_rate: \`${(summary.metrics.source_ref_resolvability_rate * 100).toFixed(2)}%\``,
    `- corpus_version_coverage_rate: \`${(summary.metrics.corpus_version_coverage_rate * 100).toFixed(2)}%\``,
    `- content_hash_coverage_rate: \`${(summary.metrics.content_hash_coverage_rate * 100).toFixed(2)}%\``,
    '',
    '## Probe Errors',
    '',
  ];

  if (Object.keys(summary.probe_errors || {}).length === 0) {
    lines.push('- None');
  } else {
    for (const [column, error] of Object.entries(summary.probe_errors)) {
      lines.push(`- \`${column}\`: \`${error}\``);
    }
  }

  lines.push(
    '',
    '## Repro',
    '',
    '```bash',
    'node scripts/rag/run_canonical_chunk_contract.js',
    '```',
    '',
  );
  return lines.join('\n');
}
