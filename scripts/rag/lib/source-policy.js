const RESTRICTED_OFFICIAL_SOURCE_TYPES = ['past_paper_pdf', 'mark_scheme_pdf'];
const PRODUCTION_EVIDENCE_ENABLED_SOURCE_TYPES = ['evidence_authored', 'evidence_transformed'];
const PRODUCTION_EVIDENCE_RESERVED_SOURCE_TYPES = ['evidence_reserved'];

const SOURCE_POLICIES = {
  research: {
    mode: 'research',
    description: 'Research/advisory source policy. Includes note_md together with official PDF assets.',
    allowed_source_types: ['note_md', 'past_paper_pdf', 'mark_scheme_pdf'],
    required_source_types: ['note_md', 'past_paper_pdf', 'mark_scheme_pdf'],
    disallowed_source_types: [],
    notes: [
      'note_md currently resolves to src/data/data-notes in scripts/rag_ingest.js.',
      'This mode is acceptable for research/advisory evidence, not for restricted-official or user-facing production governance.',
    ],
  },
  restricted_official: {
    mode: 'restricted_official',
    description:
      'Restricted internal official corpus policy. Official question papers and mark schemes may be used for internal mapping, audit, coverage, and eval workflows, but this mode does not imply a user-facing public production corpus.',
    allowed_source_types: RESTRICTED_OFFICIAL_SOURCE_TYPES,
    required_source_types: RESTRICTED_OFFICIAL_SOURCE_TYPES,
    disallowed_source_types: ['note_md'],
    notes: [
      'note_md maps to src/data/data-notes and must not be counted as restricted-official evidence.',
      'This mode is for internal official corpus workflows such as mapping, coverage, retrieval diagnostics, and offline evaluation.',
      'Do not interpret restricted_official coverage as clearance for public redistribution or user-facing verbatim evidence serving.',
    ],
  },
  production: {
    mode: 'production',
    description:
      'Legacy compatibility alias for the restricted internal official corpus policy. Historical S1/S2 artifacts still use the name "production", but this mode should not be read as a public/user-facing production corpus.',
    allowed_source_types: RESTRICTED_OFFICIAL_SOURCE_TYPES,
    required_source_types: RESTRICTED_OFFICIAL_SOURCE_TYPES,
    disallowed_source_types: ['note_md'],
    notes: [
      'note_md maps to src/data/data-notes and must not be counted in this policy.',
      'This mode is retained only for backward compatibility with historical artifacts and scripts that already emitted --policy production outputs.',
      'For new Step 3 work, prefer the explicit mode name restricted_official.',
    ],
  },
  production_evidence: {
    mode: 'production_evidence',
    description:
      'Offline governance policy for authored/transformed product-safe evidence bundles. This mode is distinct from restricted_official and does not imply that official PDF assets are user-facing production evidence.',
    declared_source_types: [
      ...PRODUCTION_EVIDENCE_ENABLED_SOURCE_TYPES,
      ...PRODUCTION_EVIDENCE_RESERVED_SOURCE_TYPES,
    ],
    enabled_source_types: PRODUCTION_EVIDENCE_ENABLED_SOURCE_TYPES,
    reserved_source_types: PRODUCTION_EVIDENCE_RESERVED_SOURCE_TYPES,
    allowed_source_types: PRODUCTION_EVIDENCE_ENABLED_SOURCE_TYPES,
    required_source_types: PRODUCTION_EVIDENCE_ENABLED_SOURCE_TYPES,
    disallowed_source_types: [
      'evidence_reserved',
      'note_md',
      'past_paper_pdf',
      'mark_scheme_pdf',
    ],
    notes: [
      'Use this mode only for authored/transformed production-evidence governance artifacts.',
      'The reserved source type slot exists for future schema expansion, but it is inactive in v1 and must not appear in active items.',
      'restricted_official remains a separate internal official corpus layer and must not be relabeled as production evidence.',
    ],
  },
};

function clonePolicy(policy) {
  return {
    ...policy,
    declared_source_types: [...(policy.declared_source_types || [])],
    enabled_source_types: [...(policy.enabled_source_types || [])],
    reserved_source_types: [...(policy.reserved_source_types || [])],
    allowed_source_types: [...(policy.allowed_source_types || [])],
    required_source_types: [...(policy.required_source_types || [])],
    disallowed_source_types: [...(policy.disallowed_source_types || [])],
    notes: [...(policy.notes || [])],
  };
}

export function resolveSourcePolicy(mode = 'research') {
  const normalizedMode = String(mode || 'research').trim().toLowerCase();
  const selected = SOURCE_POLICIES[normalizedMode];
  if (!selected) {
    throw new Error(
      `Unknown source policy mode: ${mode}. Expected one of ${Object.keys(SOURCE_POLICIES).join(', ')}`,
    );
  }
  return clonePolicy(selected);
}

export function listSourcePolicies() {
  return Object.values(SOURCE_POLICIES).map(clonePolicy);
}

export function filterRowsBySourcePolicy(rows = [], policyMode = 'research') {
  const policy = resolveSourcePolicy(policyMode);
  const allowed = new Set(policy.allowed_source_types);
  const disallowed = new Set(policy.disallowed_source_types);

  const included_rows = [];
  const excluded_rows = [];
  const unknown_rows = [];

  for (const row of Array.isArray(rows) ? rows : []) {
    const sourceType = String(row?.source_type || 'unknown');
    if (allowed.has(sourceType)) {
      included_rows.push(row);
      continue;
    }
    if (disallowed.has(sourceType)) {
      excluded_rows.push(row);
      continue;
    }
    unknown_rows.push(row);
  }

  return {
    policy,
    included_rows,
    excluded_rows,
    unknown_rows,
  };
}
