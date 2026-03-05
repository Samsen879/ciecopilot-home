export const SHORT_CONTENT_LENGTH = 24;
export const DERIVED_CORPUS_VERSION = 'implicit_public_chunks_legacy_v1';

export function buildChunkSourceRef(row = {}) {
  return {
    asset_id: `chunk:${row.id}`,
    question_id: String(row.id),
  };
}

export function isSourceRefResolvable(sourceRef) {
  if (!sourceRef || typeof sourceRef !== 'object') return false;
  if (!sourceRef.asset_id || typeof sourceRef.asset_id !== 'string') return false;
  const hasPageNo = Number.isInteger(sourceRef.page_no) && sourceRef.page_no > 0;
  const hasQuestionId = typeof sourceRef.question_id === 'string' && sourceRef.question_id.trim().length > 0;
  return hasPageNo || hasQuestionId;
}

export function normalizeChunkRow(row = {}) {
  const sourceRef = buildChunkSourceRef(row);
  const explicitCorpusVersion =
    typeof row.corpus_version === 'string' && row.corpus_version.trim().length > 0 ? row.corpus_version.trim() : null;
  const content = String(row.content || '');
  return {
    id: row.id,
    syllabus_code: row.syllabus_code || null,
    topic_path: row.topic_path || null,
    node_id: row.node_id || null,
    content,
    snippet: content.trim().slice(0, 240),
    source_type: 'chunk',
    source_ref: sourceRef,
    source_ref_resolvable: isSourceRefResolvable(sourceRef),
    explicit_corpus_version: explicitCorpusVersion,
    corpus_version: explicitCorpusVersion || DERIVED_CORPUS_VERSION,
    corpus_version_origin: explicitCorpusVersion ? 'explicit' : 'derived_legacy_fallback',
    anomalies: {
      missing_topic_path: !String(row.topic_path || '').trim(),
      missing_source_ref: !sourceRef.asset_id,
      unresolvable_source_ref: !isSourceRefResolvable(sourceRef),
      empty_snippet: !content.trim(),
      short_content: content.trim().length > 0 && content.trim().length < SHORT_CONTENT_LENGTH,
      missing_explicit_corpus_version: !explicitCorpusVersion,
    },
  };
}

export function auditChunkRows(rows = []) {
  const normalizedRows = rows.map(normalizeChunkRow);
  const total = normalizedRows.length || 1;
  const emptyCorpus = normalizedRows.length === 0;

  const anomalyCounts = normalizedRows.reduce(
    (acc, row) => {
      for (const [key, value] of Object.entries(row.anomalies)) {
        if (value) acc[key] += 1;
      }
      return acc;
    },
    {
      empty_corpus: 0,
      missing_topic_path: 0,
      missing_source_ref: 0,
      unresolvable_source_ref: 0,
      empty_snippet: 0,
      short_content: 0,
      missing_explicit_corpus_version: 0,
    },
  );

  if (emptyCorpus) {
    anomalyCounts.empty_corpus = 1;
  }

  const sourceTypeCounts = normalizedRows.reduce((acc, row) => {
    const key = row.source_type || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const corpusVersionCounts = normalizedRows.reduce((acc, row) => {
    const key = row.corpus_version || 'missing';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const originCounts = normalizedRows.reduce((acc, row) => {
    const key = row.corpus_version_origin || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const unresolvableRows = normalizedRows.filter((row) => row.anomalies.unresolvable_source_ref).slice(0, 10);
  const emptyRows = normalizedRows.filter((row) => row.anomalies.empty_snippet).slice(0, 10);

  return {
    generated_at: new Date().toISOString(),
    total_chunks: normalizedRows.length,
    chunk_field_contract: ['id', 'content', 'syllabus_code', 'topic_path', 'node_id'],
    source_ref_contract: {
      metric_semantics: 'chunk-level resolvable source_ref rate',
      derived_source_type: 'chunk',
      derived_source_ref_shape: { asset_id: 'chunk:<id>', question_id: '<id>' },
    },
    corpus_version_contract: {
      explicit_field_required_long_term: true,
      current_fallback_version: DERIVED_CORPUS_VERSION,
      current_origin_counts: originCounts,
    },
    metrics: {
      empty_corpus: emptyCorpus,
      source_ref_resolvability_rate: Number(
        (
          normalizedRows.filter((row) => row.source_ref_resolvable).length /
          total
        ).toFixed(6),
      ),
      explicit_corpus_version_coverage_rate: Number(
        ((normalizedRows.length - anomalyCounts.missing_explicit_corpus_version) / total).toFixed(6),
      ),
    },
    anomaly_counts: anomalyCounts,
    source_type_counts: sourceTypeCounts,
    corpus_version_counts: corpusVersionCounts,
    examples: {
      unresolvable_source_ref: unresolvableRows,
      empty_snippet: emptyRows,
    },
    rows: normalizedRows,
  };
}

export function renderCorpusAuditReport(summary) {
  const lines = [
    '# RAG Corpus Audit',
    '',
    `- Generated at: \`${summary.generated_at}\``,
    `- Total chunks: \`${summary.total_chunks}\``,
    '',
    '## Contracts',
    '',
    `- chunk fields: \`${summary.chunk_field_contract.join(', ')}\``,
    `- source_ref metric semantics: \`${summary.source_ref_contract.metric_semantics}\``,
    `- current corpus_version fallback: \`${summary.corpus_version_contract.current_fallback_version}\``,
    '',
    '## Metrics',
    '',
    `- empty_corpus: \`${summary.metrics.empty_corpus}\``,
    `- source_ref_resolvability_rate: \`${(summary.metrics.source_ref_resolvability_rate * 100).toFixed(2)}%\``,
    `- explicit_corpus_version_coverage_rate: \`${(summary.metrics.explicit_corpus_version_coverage_rate * 100).toFixed(2)}%\``,
    '',
    '## Anomaly Counts',
    '',
  ];

  for (const [key, value] of Object.entries(summary.anomaly_counts)) {
    lines.push(`- \`${key}\`: \`${value}\``);
  }

  lines.push('', '## Source Type Counts', '');
  for (const [key, value] of Object.entries(summary.source_type_counts)) {
    lines.push(`- \`${key}\`: \`${value}\``);
  }

  lines.push('', '## Corpus Version Counts', '');
  for (const [key, value] of Object.entries(summary.corpus_version_counts)) {
    lines.push(`- \`${key}\`: \`${value}\``);
  }

  lines.push(
    '',
    '## Repro',
    '',
    '```bash',
    'node scripts/rag/run_corpus_audit.js',
    '```',
    '',
  );

  return lines.join('\n');
}
