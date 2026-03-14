import { resolveSourcePolicy } from './source-policy.js';

const GOVERNANCE_SEED_BUNDLE_ID = 'phase_b_seed_v1';
const GOVERNANCE_SEED_RELEASE_CHANNEL = 'offline_governance_only';
const REQUIRED_RESTRICTED_OFFICIAL_POSTURE = 'internal_context_only';

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

function normalizeEntry(rawEntry) {
  const entry = normalizeObject(rawEntry);
  return {
    bundle_id: normalizeString(entry.bundle_id),
    manifest_path: normalizeString(entry.manifest_path),
    subject_scope: normalizeString(entry.subject_scope),
    subject_codes: normalizeStringArray(entry.subject_codes),
    allowed_source_types: normalizeStringArray(entry.allowed_source_types),
    approved_corpus_versions: normalizeStringArray(entry.approved_corpus_versions),
    release_channel: normalizeString(entry.release_channel),
    ingest_allowed: Boolean(entry.ingest_allowed),
    release_ready_expected: Boolean(entry.release_ready_expected),
  };
}

export function findProductionEvidenceWhitelistEntry({
  whitelist = null,
  manifest = null,
  manifestPath = '',
} = {}) {
  const whitelistObject = normalizeObject(whitelist);
  const manifestObject = normalizeObject(manifest);
  const entries = Array.isArray(whitelistObject.entries) ? whitelistObject.entries.map(normalizeEntry) : [];
  const wantedBundleId = normalizeString(manifestObject.bundle_id);
  const wantedManifestPath = normalizeString(manifestPath);

  return entries.find((entry) => {
    if (!wantedBundleId) return false;
    if (entry.bundle_id !== wantedBundleId) return false;
    if (wantedManifestPath && entry.manifest_path !== wantedManifestPath) return false;
    return true;
  }) || null;
}

export function validateProductionEvidenceWhitelist({
  whitelist = null,
  manifest = null,
  manifestPath = '',
} = {}) {
  const errors = [];
  const policy = resolveSourcePolicy('production_evidence');
  const whitelistObject = normalizeObject(whitelist);
  const manifestObject = normalizeObject(manifest);
  const allowedSourceTypes = normalizeStringArray(whitelistObject.allowed_source_types);
  const reservedSourceTypes = normalizeStringArray(whitelistObject.reserved_source_types);
  const allowedBundleIds = normalizeStringArray(whitelistObject.allowed_bundle_ids);
  const allowedManifestPaths = normalizeStringArray(whitelistObject.allowed_manifest_paths);
  const entries = Array.isArray(whitelistObject.entries) ? whitelistObject.entries.map(normalizeEntry) : [];
  const normalizedManifestPath = normalizeString(manifestPath);

  if (whitelistObject.manifest_role !== 'production_evidence_whitelist') {
    pushError(errors, 'manifest_role must be production_evidence_whitelist');
  }
  if (whitelistObject.evidence_layer !== 'production_evidence') {
    pushError(errors, 'evidence_layer must be production_evidence');
  }
  if (whitelistObject.policy_mode !== 'production_evidence') {
    pushError(errors, 'policy_mode must be production_evidence');
  }
  if (!isNonEmptyString(whitelistObject.schema_version)) {
    pushError(errors, 'schema_version is required');
  }
  if (!isNonEmptyString(whitelistObject.generated_at)) {
    pushError(errors, 'generated_at is required');
  }
  if (normalizeString(whitelistObject.required_restricted_official_posture) !== REQUIRED_RESTRICTED_OFFICIAL_POSTURE) {
    pushError(
      errors,
      `required_restricted_official_posture must be ${REQUIRED_RESTRICTED_OFFICIAL_POSTURE}`,
    );
  }
  if (allowedSourceTypes.join('|') !== policy.allowed_source_types.join('|')) {
    pushError(
      errors,
      `allowed_source_types must match the production_evidence manifest contract and must not include values such as ${policy.reserved_source_types.join(', ')}`,
    );
  }
  if (reservedSourceTypes.join('|') !== policy.reserved_source_types.join('|')) {
    pushError(errors, 'reserved_source_types must match the production_evidence policy');
  }
  if (entries.length === 0) {
    pushError(errors, 'entries must not be empty');
  }
  if (allowedBundleIds.length === 0) {
    pushError(errors, 'allowed_bundle_ids must not be empty');
  }
  if (allowedManifestPaths.length === 0) {
    pushError(errors, 'allowed_manifest_paths must not be empty');
  }

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
    if (entry.allowed_source_types.join('|') !== allowedSourceTypes.join('|')) {
      pushError(errors, `entries[${index}].allowed_source_types must match top-level allowed_source_types`);
    }
    if (entry.release_channel === 'ready_for_ingest' && entry.approved_corpus_versions.length === 0) {
      pushError(errors, `entries[${index}].approved_corpus_versions must not be empty for ready_for_ingest`);
    }
    if (!entry.release_channel) {
      pushError(errors, `entries[${index}].release_channel is required`);
    }
    if (entry.bundle_id === GOVERNANCE_SEED_BUNDLE_ID) {
      if (entry.ingest_allowed !== false) {
        pushError(errors, 'governance seed entry must keep ingest_allowed=false');
      }
      if (entry.release_ready_expected !== false) {
        pushError(errors, 'governance seed entry must keep release_ready_expected=false');
      }
      if (entry.release_channel !== GOVERNANCE_SEED_RELEASE_CHANNEL) {
        pushError(
          errors,
          `governance seed entry must keep release_channel=${GOVERNANCE_SEED_RELEASE_CHANNEL}`,
        );
      }
    }
  }

  let matchedEntry = null;
  if (manifestObject && Object.keys(manifestObject).length > 0) {
    if (!normalizeString(manifestObject.bundle_id)) {
      pushError(errors, 'manifest.bundle_id is required for whitelist matching');
    }
    if (!normalizedManifestPath) {
      pushError(errors, 'manifestPath is required for whitelist matching');
    }
    matchedEntry = findProductionEvidenceWhitelistEntry({
      whitelist: whitelistObject,
      manifest: manifestObject,
      manifestPath: normalizedManifestPath,
    });
    if (!matchedEntry) {
      const manifestBundleId = normalizeString(manifestObject.bundle_id);
      const sameBundleEntry = entries.find((entry) => entry.bundle_id === manifestBundleId);
      const samePathEntry = entries.find((entry) => entry.manifest_path === normalizedManifestPath);
      if (!allowedBundleIds.includes(manifestBundleId)) {
        pushError(errors, `bundle_id ${manifestBundleId} is not present in allowed_bundle_ids`);
      }
      if (!allowedManifestPaths.includes(normalizedManifestPath)) {
        pushError(errors, `manifest_path ${normalizedManifestPath} is not present in allowed_manifest_paths`);
      }
      if (!sameBundleEntry) {
        pushError(errors, `bundle_id ${manifestBundleId} is not whitelisted`);
      }
      if (!samePathEntry) {
        pushError(errors, `manifest_path ${normalizedManifestPath} is not whitelisted`);
      } else if (sameBundleEntry && sameBundleEntry.manifest_path !== normalizedManifestPath) {
        pushError(
          errors,
          `manifest_path ${normalizedManifestPath} does not match whitelist entry ${sameBundleEntry.manifest_path}`,
        );
      }
    } else {
      if (matchedEntry.subject_scope !== normalizeString(manifestObject.subject_scope)) {
        pushError(errors, 'whitelist subject_scope does not match manifest subject_scope');
      }
      if (matchedEntry.subject_codes.join('|') !== normalizeStringArray(manifestObject.subject_codes).join('|')) {
        pushError(errors, 'whitelist subject_codes do not match manifest subject_codes');
      }
      if (matchedEntry.allowed_source_types.join('|') !== normalizeStringArray(manifestObject.allowed_source_types).join('|')) {
        pushError(errors, 'whitelist allowed_source_types do not match manifest allowed_source_types');
      }
      if (normalizeString(manifestObject.restricted_official_posture) !== REQUIRED_RESTRICTED_OFFICIAL_POSTURE) {
        pushError(errors, 'manifest restricted_official_posture does not satisfy the whitelist posture requirement');
      }
      if (!allowedBundleIds.includes(matchedEntry.bundle_id)) {
        pushError(errors, `bundle_id ${matchedEntry.bundle_id} is not present in allowed_bundle_ids`);
      }
      if (!allowedManifestPaths.includes(matchedEntry.manifest_path)) {
        pushError(errors, `manifest_path ${matchedEntry.manifest_path} is not present in allowed_manifest_paths`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    entry: matchedEntry,
    summary: {
      bundle_id: normalizeString(manifestObject.bundle_id) || matchedEntry?.bundle_id || null,
      manifest_path: normalizedManifestPath || matchedEntry?.manifest_path || null,
      release_channel: matchedEntry?.release_channel || null,
      ingest_allowed: matchedEntry?.ingest_allowed ?? null,
      release_ready_expected: matchedEntry?.release_ready_expected ?? null,
      allowed_source_types: allowedSourceTypes,
      reserved_source_types: reservedSourceTypes,
    },
  };
}

export function renderProductionEvidenceWhitelistReport(result = {}) {
  const lines = [
    '# Production Evidence Whitelist Check',
    '',
    `- bundle_id: \`${result.summary?.bundle_id || 'unknown'}\``,
    `- manifest_path: \`${result.summary?.manifest_path || 'unknown'}\``,
    `- ok: \`${Boolean(result.ok)}\``,
    `- release_channel: \`${result.summary?.release_channel || 'unknown'}\``,
    `- ingest_allowed: \`${result.summary?.ingest_allowed}\``,
    `- release_ready_expected: \`${result.summary?.release_ready_expected}\``,
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
