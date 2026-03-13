const KNOWN_SUBJECT_CODES = Object.freeze(['9700', '9702', '9709', '9231']);

function normalizeSubjectCode(value) {
  const normalized = String(value || '').trim();
  return KNOWN_SUBJECT_CODES.includes(normalized) ? normalized : null;
}

function normalizeSubjectScope(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'single_subject') return 'single_subject';
  if (normalized === 'mixed_subject') return 'mixed_subject';
  if (normalized === 'empty') return 'empty';
  return null;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function inferSubjectCodesFromCorpusVersion(version) {
  const text = String(version || '');
  const hits = [];
  for (const subjectCode of KNOWN_SUBJECT_CODES) {
    const pattern = new RegExp(`(?:^|[^0-9])${subjectCode}(?:[^0-9]|$)`);
    if (pattern.test(text)) hits.push(subjectCode);
  }
  return hits;
}

export function summarizeDatasetSubjectScope(selectedCases = []) {
  const subjectCodes = uniqueSorted(
    (Array.isArray(selectedCases) ? selectedCases : []).map((item) => normalizeSubjectCode(item?.subject_code)),
  );

  if (subjectCodes.length === 0) {
    return {
      scope: 'empty',
      subject_codes: [],
      total_cases: Array.isArray(selectedCases) ? selectedCases.length : 0,
    };
  }

  return {
    scope: subjectCodes.length === 1 ? 'single_subject' : 'mixed_subject',
    subject_codes: subjectCodes,
    total_cases: Array.isArray(selectedCases) ? selectedCases.length : 0,
  };
}

export function inferCorpusVersionSubjectScope(corpusVersions = []) {
  const normalizedVersions = Array.isArray(corpusVersions)
    ? corpusVersions.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const subjectCodes = uniqueSorted(normalizedVersions.flatMap((item) => inferSubjectCodesFromCorpusVersion(item)));

  let scope = 'none';
  if (normalizedVersions.length > 0) {
    if (subjectCodes.length === 1) scope = 'single_subject';
    else if (subjectCodes.length > 1) scope = 'mixed_subject';
    else scope = 'unknown';
  }

  return {
    scope,
    subject_codes: subjectCodes,
    corpus_versions: normalizedVersions,
  };
}

export function validateBenchmarkScope({
  manifest = null,
  selectedCases = [],
  corpusVersions = [],
} = {}) {
  const datasetAudit = summarizeDatasetSubjectScope(selectedCases);
  const corpusAudit = inferCorpusVersionSubjectScope(corpusVersions);
  const manifestSubjectScope =
    normalizeSubjectScope(manifest?.subject_scope) ||
    (datasetAudit.scope === 'single_subject' || datasetAudit.scope === 'mixed_subject' ? datasetAudit.scope : 'empty');
  const manifestSubjectCodes = uniqueSorted(
    Array.isArray(manifest?.subject_codes)
      ? manifest.subject_codes.map((item) => normalizeSubjectCode(item))
      : datasetAudit.subject_codes,
  );

  if (manifestSubjectScope === 'mixed_subject' && corpusAudit.scope === 'single_subject') {
    throw new Error('mixed-subject benchmark cannot run with a single-subject corpus scope');
  }

  if (
    manifestSubjectScope === 'single_subject' &&
    manifestSubjectCodes.length === 1 &&
    corpusAudit.scope === 'single_subject' &&
    corpusAudit.subject_codes[0] !== manifestSubjectCodes[0]
  ) {
    throw new Error('single-subject benchmark corpus scope does not match manifest subject scope');
  }

  return {
    dataset_subject_scope: datasetAudit.scope,
    dataset_subject_codes: datasetAudit.subject_codes,
    dataset_total_cases: datasetAudit.total_cases,
    manifest_subject_scope: manifestSubjectScope,
    manifest_subject_codes: manifestSubjectCodes,
    benchmark_profile: String(manifest?.benchmark_profile || '').trim() || null,
    corpus_version_subject_scope: corpusAudit.scope,
    corpus_version_subject_codes: corpusAudit.subject_codes,
    corpus_versions: corpusAudit.corpus_versions,
  };
}
