function normalizeString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
}

function normalizeStringList(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => normalizeString(value)).filter(Boolean))];
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeEntry(rawEntry) {
  const entry = normalizeObject(rawEntry);
  return {
    bundle_id: normalizeString(entry.bundle_id),
    subject_codes: normalizeStringList(entry.subject_codes),
    rollout_state: normalizeString(entry.rollout_state),
    corpus_versions: normalizeStringList(entry.corpus_versions),
    allowed_source_types: normalizeStringList(entry.allowed_source_types),
  };
}

function toNullableList(values = []) {
  return Array.isArray(values) && values.length > 0 ? values : null;
}

const PRODUCTION_EVIDENCE_SOURCE_TYPES = Object.freeze([
  'evidence_authored',
  'evidence_transformed',
  'evidence_reserved',
]);

export function resolveProductionEvidenceRetrievalRollout({
  retrievalConfig = null,
  subjectCode = '',
} = {}) {
  const config = normalizeObject(retrievalConfig);
  const subjectKey = normalizeString(subjectCode);
  const baseCorpusVersions = normalizeStringList(config.corpusVersions);
  const excludedSourceTypes = normalizeStringList(config.excludedSourceTypes);
  const excludedCorpusVersions = normalizeStringList(config.excludedCorpusVersions);
  const gateEnabled = config.productionEvidenceRolloutEnabled !== false;
  const requireBaseCorpusVersions = config.productionEvidenceRolloutRequireBaseCorpusVersions !== false;
  const gate = normalizeObject(config.productionEvidenceRolloutGate);
  const allEntries = Array.isArray(gate.entries) ? gate.entries.map(normalizeEntry) : [];
  const allGatedCorpusVersions = normalizeStringList(allEntries.flatMap((entry) => entry.corpus_versions));
  const baselineCorpusVersions =
    gateEnabled && allGatedCorpusVersions.length > 0
      ? baseCorpusVersions.filter((value) => !allGatedCorpusVersions.includes(value))
      : baseCorpusVersions;
  const matchedEntries = subjectKey
    ? allEntries.filter((entry) => entry.subject_codes.includes(subjectKey))
    : [];
  const onlineEntries = matchedEntries.filter((entry) => entry.rollout_state === 'online_enabled');
  const onlineCorpusVersions = normalizeStringList(onlineEntries.flatMap((entry) => entry.corpus_versions));
  const onlineSourceTypes = normalizeStringList(onlineEntries.flatMap((entry) => entry.allowed_source_types));
  const blockedSourceTypes =
    gateEnabled
      ? normalizeStringList([...excludedSourceTypes, ...PRODUCTION_EVIDENCE_SOURCE_TYPES])
      : excludedSourceTypes;
  const blockedCorpusVersions =
    gateEnabled && allGatedCorpusVersions.length > 0
      ? normalizeStringList([
        ...excludedCorpusVersions,
        ...allGatedCorpusVersions,
      ])
      : excludedCorpusVersions;
  const gatedExcludedCorpusVersions =
    gateEnabled && allGatedCorpusVersions.length > 0
      ? normalizeStringList([
        ...blockedCorpusVersions,
        ...allGatedCorpusVersions.filter((value) => !onlineCorpusVersions.includes(value)),
      ])
      : blockedCorpusVersions;

  const audit = {
    gate_enabled: gateEnabled,
    gate_present: allEntries.length > 0,
    subject_code: subjectKey || null,
    matched_bundle_ids: matchedEntries.map((entry) => entry.bundle_id),
    online_bundle_ids: onlineEntries.map((entry) => entry.bundle_id),
    online_corpus_versions: onlineCorpusVersions,
    unblocked_source_types: onlineSourceTypes,
    active: false,
    reason: null,
  };

  if (!gateEnabled) {
    audit.reason = 'rollout_gate_disabled';
    return {
      corpusVersions: toNullableList(baseCorpusVersions),
      excludedSourceTypes: toNullableList(excludedSourceTypes),
      excludedCorpusVersions: toNullableList(excludedCorpusVersions),
      audit,
    };
  }
  if (!audit.gate_present) {
    audit.reason = 'rollout_gate_missing';
    return {
      corpusVersions: toNullableList(baseCorpusVersions),
      excludedSourceTypes: toNullableList(blockedSourceTypes),
      excludedCorpusVersions: toNullableList(excludedCorpusVersions),
      audit,
    };
  }
  if (!subjectKey) {
    audit.reason = 'subject_code_missing';
    return {
      corpusVersions: toNullableList(baselineCorpusVersions),
      excludedSourceTypes: toNullableList(blockedSourceTypes),
      excludedCorpusVersions: toNullableList(gatedExcludedCorpusVersions),
      audit,
    };
  }
  if (matchedEntries.length === 0) {
    audit.reason = 'no_subject_match';
    return {
      corpusVersions: toNullableList(baselineCorpusVersions),
      excludedSourceTypes: toNullableList(blockedSourceTypes),
      excludedCorpusVersions: toNullableList(gatedExcludedCorpusVersions),
      audit,
    };
  }
  if (onlineEntries.length === 0) {
    audit.reason = 'matched_entries_offline';
    return {
      corpusVersions: toNullableList(baselineCorpusVersions),
      excludedSourceTypes: toNullableList(blockedSourceTypes),
      excludedCorpusVersions: toNullableList(gatedExcludedCorpusVersions),
      audit,
    };
  }
  if (requireBaseCorpusVersions && baselineCorpusVersions.length === 0) {
    audit.reason = 'baseline_corpus_versions_required';
    return {
      corpusVersions: null,
      excludedSourceTypes: toNullableList(blockedSourceTypes),
      excludedCorpusVersions: toNullableList(blockedCorpusVersions),
      audit,
    };
  }

  const mergedCorpusVersions = normalizeStringList([...baselineCorpusVersions, ...onlineCorpusVersions]);
  const filteredExcludedSourceTypes = blockedSourceTypes.filter((value) => !onlineSourceTypes.includes(value));
  const filteredExcludedCorpusVersions = gatedExcludedCorpusVersions.filter((value) => !onlineCorpusVersions.includes(value));

  audit.active = true;
  audit.reason = 'online_enabled_subject_match';

  return {
    corpusVersions: toNullableList(mergedCorpusVersions),
    excludedSourceTypes: toNullableList(filteredExcludedSourceTypes),
    excludedCorpusVersions: toNullableList(filteredExcludedCorpusVersions),
    audit,
  };
}
