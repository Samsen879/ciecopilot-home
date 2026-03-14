import { findProductionEvidenceWhitelistEntry } from './production-evidence-whitelist.js';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeString(value) {
  return isNonEmptyString(value) ? value.trim() : '';
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((item) => normalizeString(item)).filter(Boolean))];
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function pushError(errors, message) {
  errors.push(message);
}

function sameStringSet(left = [], right = []) {
  return normalizeStringArray(left).sort().join('|') === normalizeStringArray(right).sort().join('|');
}

function normalizeEntry(rawEntry) {
  const entry = normalizeObject(rawEntry);
  return {
    bundle_id: normalizeString(entry.bundle_id),
    manifest_path: normalizeString(entry.manifest_path),
    subject_scope: normalizeString(entry.subject_scope),
    subject_codes: normalizeStringArray(entry.subject_codes),
    rollout_state: normalizeString(entry.rollout_state),
    corpus_versions: normalizeStringArray(entry.corpus_versions),
    allowed_source_types: normalizeStringArray(entry.allowed_source_types),
  };
}

export function validateProductionEvidenceRolloutGate({
  rolloutGate = null,
  whitelist = null,
} = {}) {
  const errors = [];
  const rolloutGateObject = normalizeObject(rolloutGate);
  const whitelistObject = normalizeObject(whitelist);
  const entries = Array.isArray(rolloutGateObject.entries)
    ? rolloutGateObject.entries.map(normalizeEntry)
    : [];

  if (rolloutGateObject.manifest_role !== 'production_evidence_rollout_gate') {
    pushError(errors, 'manifest_role must be production_evidence_rollout_gate');
  }
  if (rolloutGateObject.evidence_layer !== 'production_evidence') {
    pushError(errors, 'evidence_layer must be production_evidence');
  }
  if (rolloutGateObject.policy_mode !== 'production_evidence') {
    pushError(errors, 'policy_mode must be production_evidence');
  }
  if (!isNonEmptyString(rolloutGateObject.schema_version)) {
    pushError(errors, 'schema_version is required');
  }
  if (!isNonEmptyString(rolloutGateObject.generated_at)) {
    pushError(errors, 'generated_at is required');
  }
  if (normalizeString(rolloutGateObject.default_retrieval_state) !== 'blocked') {
    pushError(errors, 'default_retrieval_state must be blocked');
  }
  if (entries.length === 0) {
    pushError(errors, 'entries must not be empty');
  }

  const onlineBundleIds = [];
  const offlineBundleIds = [];
  const onlineSubjectCodes = [];
  const onlineCorpusVersions = [];

  for (const [index, entry] of entries.entries()) {
    if (!entry.bundle_id) {
      pushError(errors, `entries[${index}].bundle_id is required`);
    }
    if (!entry.manifest_path) {
      pushError(errors, `entries[${index}].manifest_path is required`);
    }
    if (entry.subject_scope !== 'single_subject' && entry.subject_scope !== 'mixed_subject') {
      pushError(errors, `entries[${index}].subject_scope must be single_subject or mixed_subject`);
    }
    if (entry.subject_codes.length === 0) {
      pushError(errors, `entries[${index}].subject_codes must not be empty`);
    }
    if (entry.rollout_state !== 'offline_default' && entry.rollout_state !== 'online_enabled') {
      pushError(errors, `entries[${index}].rollout_state must be offline_default or online_enabled`);
    }
    if (entry.corpus_versions.length === 0) {
      pushError(errors, `entries[${index}].corpus_versions must not be empty`);
    }
    if (entry.allowed_source_types.length === 0) {
      pushError(errors, `entries[${index}].allowed_source_types must not be empty`);
    }

    const whitelistEntry = findProductionEvidenceWhitelistEntry({
      whitelist: whitelistObject,
      manifest: { bundle_id: entry.bundle_id },
      manifestPath: entry.manifest_path,
    });

    if (!whitelistEntry) {
      pushError(
        errors,
        `entries[${index}] bundle_id ${entry.bundle_id || 'unknown'} is not matched by the whitelist`,
      );
      continue;
    }

    if (whitelistEntry.release_channel !== 'ready_for_ingest') {
      pushError(errors, `entries[${index}] whitelist release_channel must be ready_for_ingest`);
    }
    if (whitelistEntry.ingest_allowed !== true) {
      pushError(errors, `entries[${index}] whitelist ingest_allowed must be true`);
    }
    if (whitelistEntry.release_ready_expected !== true) {
      pushError(errors, `entries[${index}] whitelist release_ready_expected must be true`);
    }
    if (whitelistEntry.subject_scope !== entry.subject_scope) {
      pushError(errors, `entries[${index}] subject_scope must match the whitelist entry`);
    }
    if (!sameStringSet(whitelistEntry.subject_codes, entry.subject_codes)) {
      pushError(errors, `entries[${index}] subject_codes must match the whitelist entry`);
    }
    if (!sameStringSet(whitelistEntry.allowed_source_types, entry.allowed_source_types)) {
      pushError(errors, `entries[${index}] allowed_source_types must match the whitelist entry`);
    }
    if (!sameStringSet(whitelistEntry.approved_corpus_versions, entry.corpus_versions)) {
      pushError(errors, `entries[${index}] corpus_versions must match the whitelist approved_corpus_versions`);
    }

    if (entry.rollout_state === 'online_enabled') {
      onlineBundleIds.push(entry.bundle_id);
      onlineSubjectCodes.push(...entry.subject_codes);
      onlineCorpusVersions.push(...entry.corpus_versions);
    } else {
      offlineBundleIds.push(entry.bundle_id);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      online_bundle_ids: [...new Set(onlineBundleIds)],
      offline_bundle_ids: [...new Set(offlineBundleIds)],
      online_subject_codes: [...new Set(onlineSubjectCodes)],
      online_corpus_versions: [...new Set(onlineCorpusVersions)],
    },
  };
}

export function renderProductionEvidenceRolloutGateReport(result = {}) {
  const lines = [
    '# Production Evidence Retrieval Rollout Gate',
    '',
    `- ok: \`${Boolean(result.ok)}\``,
    `- online_bundle_ids: \`${(result.summary?.online_bundle_ids || []).join(', ') || 'none'}\``,
    `- offline_bundle_ids: \`${(result.summary?.offline_bundle_ids || []).join(', ') || 'none'}\``,
    `- online_subject_codes: \`${(result.summary?.online_subject_codes || []).join(', ') || 'none'}\``,
    `- online_corpus_versions: \`${(result.summary?.online_corpus_versions || []).join(', ') || 'none'}\``,
    '',
    '## Errors',
    '',
  ];

  if (!Array.isArray(result.errors) || result.errors.length === 0) {
    lines.push('- none');
  } else {
    for (const error of result.errors) {
      lines.push(`- ${error}`);
    }
  }

  return `${lines.join('\n')}\n`;
}
