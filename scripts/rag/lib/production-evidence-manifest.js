import { resolveSourcePolicy } from './source-policy.js';

const RESTRICTED_OFFICIAL_POSTURE = 'internal_context_only';
const PROVENANCE_CONTEXT_USAGE = 'provenance_context';
const RESTRICTED_OFFICIAL_PROVENANCE_SOURCE_TYPES = new Set(['past_paper_pdf', 'mark_scheme_pdf']);

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

function normalizeSourceType(value) {
  return normalizeString(value).toLowerCase();
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeObjectArray(values) {
  if (!Array.isArray(values)) return [];
  return values.map((item) => normalizeObject(item));
}

function pushError(errors, message) {
  errors.push(message);
}

export function validateProductionEvidenceManifest({ manifest = null, items = [] } = {}) {
  const errors = [];
  const policy = resolveSourcePolicy('production_evidence');
  const manifestObject = normalizeObject(manifest);
  const bundleItems = Array.isArray(items) ? items : [];

  if (manifestObject.manifest_role !== 'production_evidence_bundle') {
    pushError(errors, 'manifest_role must be production_evidence_bundle');
  }
  if (manifestObject.evidence_layer !== 'production_evidence') {
    pushError(errors, 'evidence_layer must be production_evidence');
  }
  if (manifestObject.policy_mode !== 'production_evidence') {
    pushError(errors, 'policy_mode must be production_evidence');
  }
  if (!isNonEmptyString(manifestObject.bundle_id)) {
    pushError(errors, 'bundle_id is required');
  }
  if (!isNonEmptyString(manifestObject.schema_version)) {
    pushError(errors, 'schema_version is required');
  }
  if (!isNonEmptyString(manifestObject.generated_at)) {
    pushError(errors, 'generated_at is required');
  }

  const manifestSubjectScope = normalizeString(manifestObject.subject_scope);
  const manifestSubjectCodes = normalizeStringArray(manifestObject.subject_codes);
  const declaredSourceTypes = normalizeStringArray(manifestObject.declared_source_types);
  const enabledSourceTypes = normalizeStringArray(manifestObject.enabled_source_types);
  const allowedSourceTypes = normalizeStringArray(manifestObject.allowed_source_types);
  const reservedSourceTypes = normalizeStringArray(manifestObject.reserved_source_types);
  const enabledSourceTypeSet = new Set(policy.enabled_source_types.map((item) => normalizeSourceType(item)));
  const allowedSourceTypeSet = new Set(policy.allowed_source_types.map((item) => normalizeSourceType(item)));
  const disallowedSourceTypeSet = new Set(policy.disallowed_source_types.map((item) => normalizeSourceType(item)));
  const reservedSourceTypeSet = new Set(policy.reserved_source_types.map((item) => normalizeSourceType(item)));

  if (manifestSubjectScope !== 'single_subject' && manifestSubjectScope !== 'mixed_subject') {
    pushError(errors, 'subject_scope must be single_subject or mixed_subject');
  }
  if (manifestSubjectCodes.length === 0) {
    pushError(errors, 'subject_codes must not be empty');
  }
  if (manifestSubjectScope === 'single_subject' && manifestSubjectCodes.length !== 1) {
    pushError(errors, 'subject scope single_subject must declare exactly one subject code');
  }
  if (manifestSubjectScope === 'mixed_subject' && manifestSubjectCodes.length < 2) {
    pushError(errors, 'subject scope mixed_subject must declare at least two subject codes');
  }

  if (declaredSourceTypes.length === 0) {
    pushError(errors, 'declared_source_types must not be empty');
  }
  if (!isNonEmptyString(manifestObject.items_file)) {
    pushError(errors, 'items_file is required');
  }
  if (!Number.isInteger(manifestObject.bundle_item_count) || manifestObject.bundle_item_count < 0) {
    pushError(errors, 'bundle_item_count must be a non-negative integer');
  }
  if (normalizeString(manifestObject.restricted_official_posture) !== RESTRICTED_OFFICIAL_POSTURE) {
    pushError(
      errors,
      `restricted_official_posture must be ${RESTRICTED_OFFICIAL_POSTURE} to keep restricted_official as internal context only`,
    );
  }
  if (declaredSourceTypes.join('|') !== (policy.declared_source_types || []).join('|')) {
    pushError(errors, 'declared_source_types must match the v1 production_evidence declared source types');
  }
  if (enabledSourceTypes.join('|') !== policy.enabled_source_types.join('|')) {
    pushError(errors, 'enabled_source_types must match the v1 production_evidence enabled source types');
  }
  if (allowedSourceTypes.join('|') !== policy.allowed_source_types.join('|')) {
    pushError(errors, 'allowed_source_types must match the v1 production_evidence allowed source types');
  }
  if (reservedSourceTypes.join('|') !== policy.reserved_source_types.join('|')) {
    pushError(errors, 'reserved_source_types must match the v1 production_evidence reserved source types');
  }
  for (const type of enabledSourceTypes) {
    if (!declaredSourceTypes.includes(type)) {
      pushError(errors, `declared_source_types is missing enabled source type ${type}`);
    }
  }
  for (const type of reservedSourceTypes) {
    if (!declaredSourceTypes.includes(type)) {
      pushError(errors, `declared_source_types is missing reserved source type ${type}`);
    }
  }
  for (const type of allowedSourceTypes) {
    if (!enabledSourceTypeSet.has(type)) {
      pushError(errors, `allowed_source_types contains inactive source type ${type}`);
    }
  }

  const activeSourceTypes = new Set();
  const provenanceSourceTypes = new Set();
  const itemSubjectCodes = new Set();
  for (const [index, rawItem] of bundleItems.entries()) {
    const item = normalizeObject(rawItem);
    const sourceType = normalizeSourceType(item.source_type);
    const subjectCode = normalizeString(item.subject_code);
    const topicPaths = normalizeStringArray(item.topic_paths);
    const provenance = normalizeObject(item.provenance);
    const provenanceMethod = normalizeString(provenance.method);
    const upstreamSourceClass = normalizeString(provenance.upstream_source_class);
    const upstreamRefs = normalizeObjectArray(provenance.upstream_refs);
    const review = normalizeObject(item.review);

    if (!isNonEmptyString(item.evidence_id)) {
      pushError(errors, `items[${index}].evidence_id is required`);
    }
    if (!isNonEmptyString(item.title)) {
      pushError(errors, `items[${index}].title is required`);
    }
    if (!isNonEmptyString(item.statement)) {
      pushError(errors, `items[${index}].statement is required`);
    }
    if (!subjectCode) {
      pushError(errors, `items[${index}].subject_code is required`);
    }
    if (topicPaths.length === 0) {
      pushError(errors, `items[${index}].topic_paths must not be empty`);
    }
    if (!isNonEmptyString(provenance.method)) {
      pushError(errors, `items[${index}].provenance.method is required`);
    }
    if (!isNonEmptyString(provenance.origin_layer)) {
      pushError(errors, `items[${index}].provenance.origin_layer is required`);
    }
    if (!isNonEmptyString(provenance.upstream_source_class)) {
      pushError(errors, `items[${index}].provenance.upstream_source_class is required`);
    }
    if (!Array.isArray(provenance.upstream_refs)) {
      pushError(errors, `items[${index}].provenance.upstream_refs must be an array`);
    }
    if (!isNonEmptyString(review.status)) {
      pushError(errors, `items[${index}].review.status is required`);
    }

    if (sourceType) {
      activeSourceTypes.add(sourceType);
    }
    if (subjectCode) {
      itemSubjectCodes.add(subjectCode);
    }

    if (!sourceType) {
      pushError(errors, `items[${index}].source_type is required`);
      continue;
    }
    if (reservedSourceTypeSet.has(sourceType)) {
      pushError(errors, `items[${index}].source_type ${sourceType} is reserved and must remain inactive`);
      continue;
    }
    if (disallowedSourceTypeSet.has(sourceType) || !allowedSourceTypeSet.has(sourceType)) {
      pushError(errors, `items[${index}].source_type ${sourceType} is not allowed in production_evidence`);
    }
    if (subjectCode && !manifestSubjectCodes.includes(subjectCode)) {
      pushError(errors, `items[${index}].subject_code ${subjectCode} is outside manifest subject_codes`);
    }

    if (sourceType === 'evidence_authored') {
      if (provenanceMethod !== 'authored') {
        pushError(errors, `items[${index}] authored evidence must use provenance.method authored`);
      }
      if (upstreamSourceClass !== 'none') {
        pushError(errors, `items[${index}] authored evidence must use provenance.upstream_source_class none`);
      }
      if (upstreamRefs.length > 0) {
        pushError(errors, `items[${index}] authored evidence must not declare provenance.upstream_refs`);
      }
    }

    if (sourceType === 'evidence_transformed') {
      if (provenanceMethod !== 'transformed') {
        pushError(errors, `items[${index}] transformed evidence must use provenance.method transformed`);
      }
      if (upstreamSourceClass !== 'restricted_official_context') {
        pushError(
          errors,
          `items[${index}] transformed evidence must use provenance.upstream_source_class restricted_official_context`,
        );
      }
      if (upstreamRefs.length === 0) {
        pushError(errors, `items[${index}] transformed evidence must declare provenance.upstream_refs`);
      }
    }

    for (const [refIndex, rawRef] of upstreamRefs.entries()) {
      const ref = normalizeObject(rawRef);
      const refId = normalizeString(ref.ref_id);
      const refSourceType = normalizeSourceType(ref.source_type);
      const refUsage = normalizeString(ref.usage);
      const refSourcePath = normalizeString(ref.source_path);

      if (!refId) {
        pushError(errors, `items[${index}].provenance.upstream_refs[${refIndex}].ref_id is required`);
      }
      if (!refSourceType) {
        pushError(errors, `items[${index}].provenance.upstream_refs[${refIndex}].source_type is required`);
      }
      if (!refUsage) {
        pushError(errors, `items[${index}].provenance.upstream_refs[${refIndex}].usage is required`);
      }

      if (refSourceType) {
        provenanceSourceTypes.add(refSourceType);
      }
      if (refSourceType === 'note_md') {
        pushError(
          errors,
          `items[${index}].provenance.upstream_refs[${refIndex}] source_type note_md is not allowed as production evidence provenance`,
        );
      }
      if (refSourcePath.toLowerCase().includes('data-notes')) {
        pushError(
          errors,
          `items[${index}].provenance.upstream_refs[${refIndex}] source_path must not reference data-notes`,
        );
      }
      if (sourceType === 'evidence_transformed') {
        if (!RESTRICTED_OFFICIAL_PROVENANCE_SOURCE_TYPES.has(refSourceType)) {
          pushError(
            errors,
            `items[${index}].provenance.upstream_refs[${refIndex}] source_type ${refSourceType} is not allowed for transformed evidence provenance`,
          );
        }
        if (refUsage !== PROVENANCE_CONTEXT_USAGE) {
          pushError(
            errors,
            `items[${index}].provenance.upstream_refs[${refIndex}] usage ${refUsage} is invalid; expected ${PROVENANCE_CONTEXT_USAGE}`,
          );
        }
      }
    }
  }

  if (manifestSubjectScope === 'single_subject' && itemSubjectCodes.size > 1) {
    pushError(errors, 'subject scope single_subject conflicts with item subject codes');
  }
  if (Number.isInteger(manifestObject.bundle_item_count) && manifestObject.bundle_item_count !== bundleItems.length) {
    pushError(
      errors,
      `bundle_item_count ${manifestObject.bundle_item_count} does not match loaded items ${bundleItems.length}`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      bundle_id: normalizeString(manifestObject.bundle_id) || null,
      subject_scope: manifestSubjectScope || null,
      subject_codes: manifestSubjectCodes,
      active_source_types: [...activeSourceTypes].sort(),
      provenance_source_types: [...provenanceSourceTypes].sort(),
      reserved_source_types: reservedSourceTypes,
      item_count: bundleItems.length,
      items_file: normalizeString(manifestObject.items_file) || null,
      restricted_official_posture: normalizeString(manifestObject.restricted_official_posture) || null,
    },
  };
}

export function renderProductionEvidenceManifestReport(result = {}) {
  const lines = [
    '# Production Evidence Manifest Check',
    '',
    `- bundle_id: \`${result.summary?.bundle_id || 'unknown'}\``,
    `- ok: \`${Boolean(result.ok)}\``,
    `- subject_scope: \`${result.summary?.subject_scope || 'unknown'}\``,
    `- subject_codes: \`${JSON.stringify(result.summary?.subject_codes || [])}\``,
    `- active_source_types: \`${JSON.stringify(result.summary?.active_source_types || [])}\``,
    `- provenance_source_types: \`${JSON.stringify(result.summary?.provenance_source_types || [])}\``,
    `- reserved_source_types: \`${JSON.stringify(result.summary?.reserved_source_types || [])}\``,
    `- item_count: \`${result.summary?.item_count || 0}\``,
    `- items_file: \`${result.summary?.items_file || 'unknown'}\``,
    `- restricted_official_posture: \`${result.summary?.restricted_official_posture || 'unknown'}\``,
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
