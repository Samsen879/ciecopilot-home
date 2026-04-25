import fs from 'node:fs';
import path from 'node:path';

import {
  render9709ReleasePreflightMarkdown,
  validate9709ReleasePreflight,
} from '../lib/9709-release-preflight.js';

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8'));
}

function buildManifestItem(overrides = {}) {
  return {
    storage_key: '9709/s24_qp_13/questions/q09.png',
    syllabus_code: '9709',
    year: 2024,
    session: 's',
    paper: 1,
    variant: 3,
    q_number: 9,
    primary_topic_path: '9709.p1.integration',
    diagram_present: true,
    formula_dense: true,
    table_heavy: false,
    surface_evidence_status: 'backfilled_from_audit',
    review_reasons: [],
    ...overrides,
  };
}

function buildManifest(items = [buildManifestItem()]) {
  return {
    schema_version: 'v1',
    manifest_id: 'test_9709_manifest',
    subject_code: '9709',
    curriculum_version_tag: '2025-2027_v1',
    items,
  };
}

function buildAuthoritySidecarEntry(storageKey, canonicalTopicPath, overrides = {}) {
  return {
    storage_key: storageKey,
    authority_input_pack: {
      canonical_primary_topic_path: canonicalTopicPath,
      curriculum_version_tag: '2025-2027_v1',
      topic_authority_sources: ['manual_audit'],
      topic_authority_refs: [
        { kind: 'manual_audit', locator: `storage_key=${storageKey}`, note: null },
      ],
      cross_paper_dependency_note: null,
      ...overrides,
    },
  };
}

function buildAuthoritySidecar(items = [buildAuthoritySidecarEntry(
  '9709/s24_qp_13/questions/q09.png',
  '9709.p1.integration',
)]) {
  return {
    schema_version: 'v1',
    sidecar_id: 'test_9709_sidecar',
    subject_code: '9709',
    curriculum_version_tag: '2025-2027_v1',
    items,
  };
}

function buildCurriculumSeed(topicPaths = ['9709.p1.integration']) {
  return {
    syllabus_code: '9709',
    version_tag: '2025-2027_v1',
    nodes: topicPaths.map((topicPath) => ({
      syllabus_code: '9709',
      version_tag: '2025-2027_v1',
      topic_path: topicPath,
    })),
  };
}

function buildBundle(storageKey = '9709/s24_qp_13/questions/q09.png', overrides = {}) {
  return {
    schema_version: 'question_evidence_bundle_v1',
    storage_key: storageKey,
    evidence: {
      ocr_text: 'A curve is shown in the diagram.',
      diagram_present: true,
      diagram_elements: ['curve'],
      spatial_evidence: ['axes shown'],
    },
    surface_posture: {
      surface_evidence_status: 'backfilled_from_audit',
      diagram_present: true,
    },
    review_posture: {
      review_reasons: [],
    },
    ...overrides,
  };
}

describe('9709 release preflight', () => {
  test('passes the published 300-row authority-ready batch with no blockers', () => {
    const result = validate9709ReleasePreflight({
      manifest: readJson('data/manifests/9709_authority_ready_batch_300_v1.json'),
      authoritySidecar: readJson('data/manifests/9709_authority_ready_batch_300_authority_sidecar_v2.json'),
      curriculumSeed: readJson('data/curriculum/9709_authority_ready_batch_300_nodes_v2.json'),
      expectedManifestCount: 300,
    });

    expect(result.status).toBe('pass');
    expect(result.blockers).toHaveLength(0);
    expect(result.counts.manifest_items).toBe(300);
    expect(result.counts.diagram_present).toEqual({ true: 64, false: 236, invalid: 0 });
    expect(result.counts.sidecar_items).toBe(300);
    expect(result.counts.sidecar_canonical_missing).toBe(0);
    expect(result.counts.sidecar_distinct_topics).toBe(18);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason_code: 'paper_5_or_6_in_authority_ready_batch' }),
      ]),
    );
  });

  test('blocks null diagram_present values', () => {
    const result = validate9709ReleasePreflight({
      manifest: buildManifest([buildManifestItem({ diagram_present: null })]),
      authoritySidecar: buildAuthoritySidecar(),
      curriculumSeed: buildCurriculumSeed(),
      expectedManifestCount: 1,
    });

    expect(result.status).toBe('fail');
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          storage_key: '9709/s24_qp_13/questions/q09.png',
          reason_code: 'diagram_present_not_boolean',
        }),
      ]),
    );
  });

  test('blocks sidecar join and canonical topic failures', () => {
    const storageKey = '9709/s24_qp_13/questions/q09.png';
    const result = validate9709ReleasePreflight({
      manifest: buildManifest([buildManifestItem({ storage_key: storageKey })]),
      authoritySidecar: buildAuthoritySidecar([]),
      curriculumSeed: buildCurriculumSeed(),
      expectedManifestCount: 1,
    });

    expect(result.status).toBe('fail');
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ storage_key: storageKey, reason_code: 'missing_authority_sidecar_entry' }),
      ]),
    );

    const missingCanonical = validate9709ReleasePreflight({
      manifest: buildManifest([buildManifestItem({ storage_key: storageKey })]),
      authoritySidecar: buildAuthoritySidecar([
        buildAuthoritySidecarEntry(storageKey, null),
      ]),
      curriculumSeed: buildCurriculumSeed(),
      expectedManifestCount: 1,
    });

    expect(missingCanonical.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ storage_key: storageKey, reason_code: 'missing_canonical_primary_topic_path' }),
      ]),
    );
  });

  test('blocks canonical topics not present in the 9709 curriculum seed', () => {
    const storageKey = '9709/s24_qp_13/questions/q09.png';
    const result = validate9709ReleasePreflight({
      manifest: buildManifest([buildManifestItem({ storage_key: storageKey })]),
      authoritySidecar: buildAuthoritySidecar([
        buildAuthoritySidecarEntry(storageKey, '9709.p7.not_real'),
      ]),
      curriculumSeed: buildCurriculumSeed(['9709.p1.integration']),
      expectedManifestCount: 1,
    });

    expect(result.status).toBe('fail');
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ storage_key: storageKey, reason_code: 'canonical_topic_not_seeded' }),
      ]),
    );
  });

  test('blocks historical paper-1 vector rows that are not canonicalized to p3 vectors', () => {
    const storageKey = '9709/m18_qp_12/questions/q07.png';
    const result = validate9709ReleasePreflight({
      manifest: buildManifest([
        buildManifestItem({
          storage_key: storageKey,
          year: 2018,
          paper: 1,
          primary_topic_path: '9709.p1.coordinate_geometry',
          historical_topic_label: 'legacy_p1_vectors',
          syllabus_version: 'pre-2020',
        }),
      ]),
      authoritySidecar: buildAuthoritySidecar([
        buildAuthoritySidecarEntry(storageKey, '9709.p1.coordinate_geometry'),
      ]),
      curriculumSeed: buildCurriculumSeed(['9709.p1.coordinate_geometry', '9709.p3.vectors']),
      expectedManifestCount: 1,
    });

    expect(result.status).toBe('fail');
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ storage_key: storageKey, reason_code: 'legacy_p1_vector_not_canonical_p3_vectors' }),
      ]),
    );
  });

  test('blocks OCR-empty and image-unresolved rows without explicit acceptable status', () => {
    const storageKey = '9709/s24_qp_13/questions/q09.png';
    const result = validate9709ReleasePreflight({
      manifest: buildManifest([
        buildManifestItem({
          storage_key: storageKey,
          diagram_present: false,
          review_reasons: [],
        }),
      ]),
      authoritySidecar: buildAuthoritySidecar([
        buildAuthoritySidecarEntry(storageKey, '9709.p1.integration'),
      ]),
      curriculumSeed: buildCurriculumSeed(),
      evidenceBundles: [
        buildBundle(storageKey, {
          evidence: {
            ocr_text: '',
            diagram_present: false,
            diagram_elements: [],
            spatial_evidence: [],
          },
          route: {
            failure_reason: 'image_not_found',
          },
          review_posture: {
            review_reasons: [],
          },
          surface_posture: {
            surface_evidence_status: 'unknown_requires_primary_asset_replay',
            diagram_present: false,
          },
        }),
      ],
      expectedManifestCount: 1,
    });

    expect(result.status).toBe('fail');
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ storage_key: storageKey, reason_code: 'ocr_empty_without_explicit_status' }),
        expect.objectContaining({ storage_key: storageKey, reason_code: 'image_unresolved_without_fallback_or_reason' }),
      ]),
    );
  });

  test('warns but does not block when diagram elements are empty for diagram-present rows', () => {
    const storageKey = '9709/s24_qp_13/questions/q09.png';
    const result = validate9709ReleasePreflight({
      manifest: buildManifest([buildManifestItem({ storage_key: storageKey })]),
      authoritySidecar: buildAuthoritySidecar([
        buildAuthoritySidecarEntry(storageKey, '9709.p1.integration'),
      ]),
      curriculumSeed: buildCurriculumSeed(),
      evidenceBundles: [
        buildBundle(storageKey, {
          evidence: {
            ocr_text: 'A diagram is shown.',
            diagram_present: true,
            diagram_elements: [],
            spatial_evidence: [],
          },
        }),
      ],
      expectedManifestCount: 1,
    });

    expect(result.status).toBe('pass');
    expect(result.blockers).toHaveLength(0);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ storage_key: storageKey, reason_code: 'diagram_present_but_elements_empty' }),
        expect.objectContaining({ storage_key: storageKey, reason_code: 'diagram_present_but_spatial_evidence_empty' }),
      ]),
    );
  });

  test('blocks manifest and evidence bundle diagram_present mismatches', () => {
    const storageKey = '9709/s24_qp_13/questions/q09.png';
    const result = validate9709ReleasePreflight({
      manifest: buildManifest([
        buildManifestItem({
          storage_key: storageKey,
          diagram_present: false,
        }),
      ]),
      authoritySidecar: buildAuthoritySidecar([
        buildAuthoritySidecarEntry(storageKey, '9709.p1.integration'),
      ]),
      curriculumSeed: buildCurriculumSeed(),
      evidenceBundles: [
        buildBundle(storageKey, {
          evidence: {
            ocr_text: 'A text-only question asks the student to sketch a graph.',
            diagram_present: true,
            diagram_elements: [],
            spatial_evidence: [],
          },
          surface_posture: {
            surface_evidence_status: 'backfilled_from_audit',
            diagram_present: true,
          },
        }),
      ],
      expectedManifestCount: 1,
    });

    expect(result.status).toBe('fail');
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          storage_key: storageKey,
          reason_code: 'diagram_present_mismatch_between_manifest_and_evidence_bundle',
          details: {
            manifest_diagram_present: false,
            evidence_diagram_present: true,
            surface_posture_diagram_present: true,
          },
        }),
      ]),
    );
  });

  test('blocks evidence bundles missing surface_posture diagram_present', () => {
    const storageKey = '9709/s24_qp_13/questions/q09.png';
    const result = validate9709ReleasePreflight({
      manifest: buildManifest([
        buildManifestItem({
          storage_key: storageKey,
          diagram_present: true,
        }),
      ]),
      authoritySidecar: buildAuthoritySidecar([
        buildAuthoritySidecarEntry(storageKey, '9709.p1.integration'),
      ]),
      curriculumSeed: buildCurriculumSeed(),
      evidenceBundles: [
        buildBundle(storageKey, {
          surface_posture: {
            surface_evidence_status: 'backfilled_from_audit',
          },
        }),
      ],
      expectedManifestCount: 1,
    });

    expect(result.status).toBe('fail');
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          storage_key: storageKey,
          reason_code: 'diagram_present_mismatch_between_manifest_and_evidence_bundle',
          details: {
            manifest_diagram_present: true,
            evidence_diagram_present: true,
            surface_posture_diagram_present: null,
          },
        }),
      ]),
    );
  });

  test('blocks non-ready items in ready-to-write artifacts', () => {
    const storageKey = '9709/s24_qp_13/questions/q09.png';
    const result = validate9709ReleasePreflight({
      manifest: buildManifest([buildManifestItem({ storage_key: storageKey })]),
      authoritySidecar: buildAuthoritySidecar([
        buildAuthoritySidecarEntry(storageKey, '9709.p1.integration'),
      ]),
      curriculumSeed: buildCurriculumSeed(),
      readyManifest: {
        items: [
          {
            storage_key: storageKey,
            overall_alignment_verdict: 'blocked_for_review',
          },
        ],
      },
      expectedManifestCount: 1,
    });

    expect(result.status).toBe('fail');
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ storage_key: storageKey, reason_code: 'ready_artifact_contains_non_ready_item' }),
      ]),
    );
  });

  test('renders a markdown summary for operator review', () => {
    const result = validate9709ReleasePreflight({
      manifest: buildManifest(),
      authoritySidecar: buildAuthoritySidecar(),
      curriculumSeed: buildCurriculumSeed(),
      expectedManifestCount: 1,
    });

    const markdown = render9709ReleasePreflightMarkdown(result);

    expect(markdown).toContain('# 9709 Release Preflight');
    expect(markdown).toContain('status: `pass`');
    expect(markdown).toContain('manifest_items');
  });
});
