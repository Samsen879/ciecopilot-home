import fs from 'node:fs';
import path from 'node:path';
import { validateProductionEvidenceManifest } from '../lib/production-evidence-manifest.js';

function buildManifest(overrides = {}) {
  return {
    manifest_role: 'production_evidence_bundle',
    evidence_layer: 'production_evidence',
    policy_mode: 'production_evidence',
    schema_version: 'v1',
    bundle_id: 'phase_b_seed_v1',
    generated_at: '2026-03-13T04:10:00.000Z',
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

function buildItems(overrides = []) {
  return [
    {
      evidence_id: 'pe-9702-001',
      source_type: 'evidence_authored',
      subject_code: '9702',
      title: 'Example authored evidence',
      topic_paths: ['9702.P1'],
      statement: 'This is a governance seed item.',
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
      evidence_id: 'pe-9231-001',
      source_type: 'evidence_transformed',
      subject_code: '9231',
      title: 'Example transformed evidence',
      topic_paths: ['9231.FP1'],
      statement: 'This is a transformed governance seed item.',
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

describe('production evidence manifest', () => {
  test('accepts a valid production evidence bundle', () => {
    const result = validateProductionEvidenceManifest({
      manifest: buildManifest(),
      items: buildItems(),
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.summary.active_source_types).toEqual(['evidence_authored', 'evidence_transformed']);
    expect(result.summary.reserved_source_types).toEqual(['evidence_reserved']);
  });

  test('rejects note_md and official pdf source types', () => {
    const result = validateProductionEvidenceManifest({
      manifest: buildManifest(),
      items: buildItems([
        {
          evidence_id: 'bad-1',
          source_type: 'note_md',
          subject_code: '9702',
          title: 'bad',
          topic_paths: ['9702.P1'],
          statement: 'bad',
          provenance: { method: 'authored', origin_layer: 'production_evidence', upstream_source_class: 'none' },
          review: { status: 'draft' },
        },
        {
          evidence_id: 'bad-2',
          source_type: 'past_paper_pdf',
          subject_code: '9231',
          title: 'bad',
          topic_paths: ['9231.FP1'],
          statement: 'bad',
          provenance: { method: 'transformed', origin_layer: 'production_evidence', upstream_source_class: 'restricted_official_context' },
          review: { status: 'draft' },
        },
      ]),
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('note_md');
    expect(result.errors.join('\n')).toContain('past_paper_pdf');
  });

  test('rejects data-notes and note_md provenance origins even when the active item type looks valid', () => {
    const result = validateProductionEvidenceManifest({
      manifest: buildManifest({
        bundle_item_count: 3,
      }),
      items: buildItems([
        {
          evidence_id: 'bad-provenance-1',
          source_type: 'evidence_transformed',
          subject_code: '9702',
          title: 'bad provenance',
          topic_paths: ['9702.P1'],
          statement: 'bad provenance',
          provenance: {
            method: 'transformed',
            origin_layer: 'production_evidence',
            upstream_source_class: 'restricted_official_context',
            upstream_refs: [
              {
                ref_id: 'note-source',
                source_type: 'note_md',
                usage: 'provenance_context',
                source_path: 'src/data/data-notes/9702/algebra.md',
              },
            ],
          },
          review: { status: 'draft' },
        },
      ]),
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('note_md');
    expect(result.errors.join('\n')).toContain('data-notes');
  });

  test('rejects transformed items that try to use restricted official refs as active evidence', () => {
    const result = validateProductionEvidenceManifest({
      manifest: buildManifest({
        bundle_item_count: 3,
      }),
      items: buildItems([
        {
          evidence_id: 'bad-active-upstream',
          source_type: 'evidence_transformed',
          subject_code: '9231',
          title: 'bad active upstream',
          topic_paths: ['9231.FP1'],
          statement: 'bad active upstream',
          provenance: {
            method: 'transformed',
            origin_layer: 'production_evidence',
            upstream_source_class: 'restricted_official_context',
            upstream_refs: [
              {
                ref_id: '9231-ms',
                source_type: 'mark_scheme_pdf',
                usage: 'active_evidence',
                source_path: 'data/mark-schemes/9231/9231_w23_ms_12.pdf',
              },
            ],
          },
          review: { status: 'draft' },
        },
      ]),
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('active_evidence');
    expect(result.errors.join('\n')).toContain('provenance_context');
  });

  test('rejects active use of the reserved source type', () => {
    const result = validateProductionEvidenceManifest({
      manifest: buildManifest(),
      items: buildItems([
        {
          evidence_id: 'bad-reserved',
          source_type: 'evidence_reserved',
          subject_code: '9702',
          title: 'reserved',
          topic_paths: ['9702.P1'],
          statement: 'reserved',
          provenance: { method: 'authored', origin_layer: 'production_evidence', upstream_source_class: 'none' },
          review: { status: 'draft' },
        },
      ]),
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('evidence_reserved');
  });

  test('rejects metadata-level activation of the reserved source type', () => {
    const result = validateProductionEvidenceManifest({
      manifest: buildManifest({
        enabled_source_types: ['evidence_authored', 'evidence_transformed', 'evidence_reserved'],
        allowed_source_types: ['evidence_authored', 'evidence_transformed', 'evidence_reserved'],
      }),
      items: buildItems(),
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('enabled_source_types');
    expect(result.errors.join('\n')).toContain('allowed_source_types');
  });

  test('rejects inconsistent single-subject scope declarations', () => {
    const result = validateProductionEvidenceManifest({
      manifest: buildManifest({
        subject_scope: 'single_subject',
        subject_codes: ['9702'],
      }),
      items: buildItems(),
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('subject scope');
  });

  test('rejects bundles with a broken manifest-to-items contract', () => {
    const result = validateProductionEvidenceManifest({
      manifest: buildManifest({
        items_file: '',
        bundle_item_count: 99,
      }),
      items: buildItems(),
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('items_file');
    expect(result.errors.join('\n')).toContain('bundle_item_count');
  });

  test('requires an explicit non-public posture for restricted official provenance', () => {
    const result = validateProductionEvidenceManifest({
      manifest: buildManifest({
        restricted_official_posture: 'public_production_corpus',
      }),
      items: buildItems(),
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('restricted_official_posture');
    expect(result.errors.join('\n')).toContain('internal_context_only');
  });

  test('checked-in governance seed bundle stays inside the enabled production evidence types', () => {
    const root = process.cwd();
    const manifestPath = path.join(root, 'data/evidence/production/seed_v1/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const itemsPath = path.join(path.dirname(manifestPath), manifest.items_file);
    const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));

    const result = validateProductionEvidenceManifest({
      manifest,
      items,
    });

    expect(result.ok).toBe(true);
    expect(result.summary.active_source_types).toEqual(['evidence_authored', 'evidence_transformed']);
    expect(result.summary.reserved_source_types).toEqual(['evidence_reserved']);
  });
});
