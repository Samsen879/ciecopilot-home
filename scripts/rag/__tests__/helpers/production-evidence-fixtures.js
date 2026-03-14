export function buildManifest(overrides = {}) {
  return {
    manifest_role: 'production_evidence_bundle',
    evidence_layer: 'production_evidence',
    policy_mode: 'production_evidence',
    schema_version: 'v1',
    bundle_id: 'phase_b_seed_v1',
    generated_at: '2026-03-13T04:20:00.000Z',
    bundle_status: 'governance_seed_only',
    subject_scope: 'mixed_subject',
    subject_codes: ['9702', '9231'],
    language: 'en',
    declared_source_types: ['evidence_authored', 'evidence_transformed', 'evidence_reserved'],
    enabled_source_types: ['evidence_authored', 'evidence_transformed'],
    allowed_source_types: ['evidence_authored', 'evidence_transformed'],
    reserved_source_types: ['evidence_reserved'],
    restricted_official_posture: 'internal_context_only',
    items_file: 'items.json',
    bundle_item_count: 2,
    review: {
      status: 'draft',
      owner: 'phase_b_governance',
    },
    ...overrides,
  };
}

export function buildItems(overrides = []) {
  return [
    {
      evidence_id: 'phase-b-seed-9702-authored-001',
      source_type: 'evidence_authored',
      subject_code: '9702',
      title: 'Seed authored evidence for governance validation',
      topic_paths: ['9702.P1'],
      statement: 'Governance seed only.',
      provenance: {
        method: 'authored',
        origin_layer: 'production_evidence',
        upstream_source_class: 'none',
        upstream_refs: [],
      },
      review: {
        status: 'approved',
      },
    },
    {
      evidence_id: 'phase-b-seed-9231-transformed-001',
      source_type: 'evidence_transformed',
      subject_code: '9231',
      title: 'Seed transformed evidence for governance validation',
      topic_paths: ['9231.FP1'],
      statement: 'Governance seed only.',
      provenance: {
        method: 'transformed',
        origin_layer: 'production_evidence',
        upstream_source_class: 'restricted_official_context',
        upstream_refs: [
          {
            ref_id: '9231-w23-qp-12-q4',
            source_type: 'past_paper_pdf',
            usage: 'provenance_context',
            source_path: 'data/papers/9231/9231_w23_qp_12.pdf',
          },
        ],
      },
      review: {
        status: 'reviewed',
      },
    },
    ...overrides,
  ];
}

export function buildWhitelist(overrides = {}) {
  return {
    manifest_role: 'production_evidence_whitelist',
    evidence_layer: 'production_evidence',
    policy_mode: 'production_evidence',
    schema_version: 'v1',
    generated_at: '2026-03-13T05:30:00.000Z',
    required_restricted_official_posture: 'internal_context_only',
    allowed_bundle_ids: ['phase_b_seed_v1'],
    allowed_manifest_paths: ['data/evidence/production/seed_v1/manifest.json'],
    allowed_source_types: ['evidence_authored', 'evidence_transformed'],
    reserved_source_types: ['evidence_reserved'],
    entries: [
      {
        bundle_id: 'phase_b_seed_v1',
        manifest_path: 'data/evidence/production/seed_v1/manifest.json',
        subject_scope: 'mixed_subject',
        subject_codes: ['9702', '9231'],
        allowed_source_types: ['evidence_authored', 'evidence_transformed'],
        release_channel: 'offline_governance_only',
        ingest_allowed: false,
        release_ready_expected: false,
      },
    ],
    ...overrides,
  };
}
