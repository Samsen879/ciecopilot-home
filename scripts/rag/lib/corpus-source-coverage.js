function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSourceRefResolvable(sourceRef) {
  if (!sourceRef || typeof sourceRef !== 'object') return false;
  if (!isNonEmptyString(sourceRef.asset_id)) return false;
  const hasPageNo = Number.isInteger(sourceRef.page_no) && sourceRef.page_no > 0;
  const hasQuestionId = isNonEmptyString(sourceRef.question_id);
  return hasPageNo || hasQuestionId;
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = String(keyFn(item) || 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export function summarizeCorpusSourceCoverage(
  rows = [],
  {
    requiredSourceTypes = ['note_md', 'past_paper_pdf', 'mark_scheme_pdf'],
    sourceRefResolvableRateMin = 0.95,
    topicPathCoverageRateMin = 0.95,
  } = {},
) {
  const allRows = Array.isArray(rows) ? rows : [];
  const total = allRows.length;

  const sourceTypeCounts = countBy(allRows, (row) => row.source_type || 'unknown');
  const corpusVersionCounts = countBy(allRows, (row) => row.corpus_version || 'unknown');
  const subjectCounts = countBy(allRows, (row) => row.syllabus_code || 'unknown');

  const subjectBySourceType = {};
  for (const row of allRows) {
    const sourceType = String(row.source_type || 'unknown');
    const subject = String(row.syllabus_code || 'unknown');
    subjectBySourceType[sourceType] ||= {};
    subjectBySourceType[sourceType][subject] = (subjectBySourceType[sourceType][subject] || 0) + 1;
  }

  const sourceRefResolvableRows = allRows.filter((row) => isSourceRefResolvable(row.source_ref));
  const mappedTopicPathRows = allRows.filter((row) => {
    const topicPath = String(row.topic_path || '').trim();
    return topicPath.length > 0 && topicPath.toLowerCase() !== 'unmapped';
  });

  const sourceRefResolvableRate = total > 0 ? sourceRefResolvableRows.length / total : 0;
  const topicPathCoverageRate = total > 0 ? mappedTopicPathRows.length / total : 0;

  const requiredSourceTypeChecks = Object.fromEntries(
    requiredSourceTypes.map((type) => [type, Number(sourceTypeCounts[type] || 0) > 0]),
  );

  const missingAssetExamples = allRows
    .filter((row) => !isSourceRefResolvable(row.source_ref))
    .slice(0, 50)
    .map((row) => ({
      id: row.id,
      source_type: row.source_type || null,
      syllabus_code: row.syllabus_code || null,
      topic_path: row.topic_path || null,
      source_ref: row.source_ref || null,
      corpus_version: row.corpus_version || null,
    }));

  const payload = {
    generated_at: new Date().toISOString(),
    table: 'public.chunks',
    canonical_totals: {
      total_rows: total,
      mapped_topic_path_rows: mappedTopicPathRows.length,
      source_ref_resolvable_rows: sourceRefResolvableRows.length,
    },
    source_type_counts: sourceTypeCounts,
    subject_counts: subjectCounts,
    corpus_version_counts: corpusVersionCounts,
    subject_by_source_type: subjectBySourceType,
    metrics: {
      source_ref_resolvability_rate: Number(sourceRefResolvableRate.toFixed(6)),
      topic_path_coverage_rate: Number(topicPathCoverageRate.toFixed(6)),
    },
    required_source_types: requiredSourceTypes,
    threshold_checks: {
      required_source_types_present: requiredSourceTypeChecks,
      required_source_types_all_present: Object.values(requiredSourceTypeChecks).every(Boolean),
      source_ref_resolvability_rate:
        Number(sourceRefResolvableRate.toFixed(6)) >= sourceRefResolvableRateMin,
      topic_path_coverage_rate:
        Number(topicPathCoverageRate.toFixed(6)) >= topicPathCoverageRateMin,
    },
    missing_asset_examples: missingAssetExamples,
  };

  payload.status =
    payload.threshold_checks.required_source_types_all_present &&
    payload.threshold_checks.source_ref_resolvability_rate &&
    payload.threshold_checks.topic_path_coverage_rate
      ? 'pass'
      : 'warn';

  return payload;
}

export function renderCorpusSourceCoverageReport(summary) {
  const lines = [
    '# RAG S1.3 Corpus Source Coverage',
    '',
    `- Generated at: \`${summary.generated_at}\``,
    `- Table: \`${summary.table}\``,
    `- Total rows: \`${summary.canonical_totals?.total_rows || 0}\``,
    `- Status: \`${summary.status}\``,
    '',
    '## Threshold Checks',
    '',
    `- required_source_types_all_present: \`${summary.threshold_checks?.required_source_types_all_present}\``,
    `- source_ref_resolvability_rate >= 0.95: \`${summary.threshold_checks?.source_ref_resolvability_rate}\``,
    `- topic_path_coverage_rate >= 0.95: \`${summary.threshold_checks?.topic_path_coverage_rate}\``,
    '',
    '## Required Source Types',
    '',
  ];

  const required = summary.threshold_checks?.required_source_types_present || {};
  for (const [type, ok] of Object.entries(required)) {
    lines.push(`- ${type}: \`${ok}\``);
  }

  lines.push('', '## Source Type Counts', '');
  for (const [type, count] of Object.entries(summary.source_type_counts || {})) {
    lines.push(`- ${type}: \`${count}\``);
  }

  lines.push('', '## Metrics', '');
  lines.push(
    `- source_ref_resolvability_rate: \`${((summary.metrics?.source_ref_resolvability_rate || 0) * 100).toFixed(2)}%\``,
  );
  lines.push(
    `- topic_path_coverage_rate: \`${((summary.metrics?.topic_path_coverage_rate || 0) * 100).toFixed(2)}%\``,
  );

  lines.push('', '## Missing Asset Examples (Top 20)', '');
  const examples = Array.isArray(summary.missing_asset_examples) ? summary.missing_asset_examples : [];
  if (examples.length === 0) {
    lines.push('- none');
  } else {
    for (const item of examples.slice(0, 20)) {
      lines.push(
        `- id=\`${item.id}\` source_type=\`${item.source_type || 'null'}\` topic=\`${item.topic_path || 'null'}\` source_ref=\`${JSON.stringify(item.source_ref)}\``,
      );
    }
  }

  return `${lines.join('\n')}\n`;
}
