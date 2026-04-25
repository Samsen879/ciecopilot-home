import fs from 'node:fs';
import path from 'node:path';

import {
  applyHumanDiagramReviewToArtifacts,
  buildHumanDiagramReviewArtifact,
  defaultHumanDiagramReviewOut,
  recordHumanDiagramReviewDecision,
  summarizeHumanDiagramReview,
} from '../lib/9709-diagram-human-review.js';

const TMP_DIR = path.join(process.cwd(), 'tmp', '9709-diagram-human-review-test');

function buildManifest() {
  return {
    manifest_id: 'test_manifest',
    items: [
      {
        storage_key: '9709/s24_qp_13/questions/q09.png',
        paper: 1,
        variant: 3,
        q_number: 9,
        primary_topic_path: '9709.p1.integration',
        diagram_present: false,
      },
      {
        storage_key: '9709/s24_qp_32/questions/q06.png',
        paper: 3,
        variant: 2,
        q_number: 6,
        primary_topic_path: '9709.p3.integration',
        diagram_present: true,
      },
    ],
  };
}

function buildEvidenceBundles() {
  return {
    bundles: [
      {
        storage_key: '9709/s24_qp_13/questions/q09.png',
        evidence: { diagram_present: true },
        surface_posture: { diagram_present: true },
      },
      {
        storage_key: '9709/s24_qp_32/questions/q06.png',
        evidence: { diagram_present: true },
        surface_posture: { diagram_present: true },
      },
    ],
  };
}

describe('9709 human diagram-present review helpers', () => {
  beforeEach(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
    fs.mkdirSync(TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  test('builds review items with manifest, evidence, and surface posture values preserved', () => {
    const artifact = buildHumanDiagramReviewArtifact({
      manifest: buildManifest(),
      evidenceBundles: buildEvidenceBundles(),
      assetsRoot: '/assets',
      reviewOut: path.join(TMP_DIR, 'review.json'),
      nowIso: '2026-04-25T10:00:00.000Z',
    });

    expect(artifact).toMatchObject({
      schema_version: '9709_human_diagram_present_review_v1',
      review_id: 'test_manifest_human_diagram_present_review',
      source: {
        manifest_id: 'test_manifest',
        review_out: path.join(TMP_DIR, 'review.json'),
      },
      summary: {
        total: 2,
        reviewed: 0,
        skipped: 0,
        pending: 2,
      },
    });
    expect(artifact.items[0]).toMatchObject({
      storage_key: '9709/s24_qp_13/questions/q09.png',
      image_path: '/assets/9709/s24_qp_13/questions/q09.png',
      original: {
        manifest_diagram_present: false,
        evidence_diagram_present: true,
        surface_posture_diagram_present: true,
      },
      disposition: 'pending',
      reviewed_diagram_present: null,
    });
  });

  test('uses the Shanghai calendar date for the default review artifact name', () => {
    expect(defaultHumanDiagramReviewOut(new Date('2026-04-24T18:30:00.000Z'))).toBe(
      path.join('docs', 'reports', '2026-04-25-9709-human-diagram-present-review.json'),
    );
  });

  test('records a human decision and writes a resumable artifact', () => {
    const reviewOut = path.join(TMP_DIR, 'review.json');
    const artifact = buildHumanDiagramReviewArtifact({
      manifest: buildManifest(),
      evidenceBundles: buildEvidenceBundles(),
      assetsRoot: '/assets',
      reviewOut,
      nowIso: '2026-04-25T10:00:00.000Z',
    });

    const updated = recordHumanDiagramReviewDecision({
      artifact,
      reviewOut,
      storageKey: '9709/s24_qp_13/questions/q09.png',
      diagramPresent: true,
      note: 'Printed curve and axes are visible.',
      nowIso: '2026-04-25T10:05:00.000Z',
    });

    expect(updated.items[0]).toMatchObject({
      disposition: 'reviewed',
      reviewed_diagram_present: true,
      reviewed_at: '2026-04-25T10:05:00.000Z',
      note: 'Printed curve and axes are visible.',
    });
    expect(summarizeHumanDiagramReview(updated.items)).toEqual({
      total: 2,
      reviewed: 1,
      skipped: 0,
      pending: 1,
      present: 1,
      absent: 0,
    });
    expect(JSON.parse(fs.readFileSync(reviewOut, 'utf8'))).toMatchObject({
      schema_version: '9709_human_diagram_present_review_v1',
      items: expect.arrayContaining([
        expect.objectContaining({
          storage_key: '9709/s24_qp_13/questions/q09.png',
          reviewed_diagram_present: true,
        }),
      ]),
    });
  });

  test('applies completed human review decisions to manifest and evidence bundle diagram_present fields', () => {
    const artifact = buildHumanDiagramReviewArtifact({
      manifest: buildManifest(),
      evidenceBundles: buildEvidenceBundles(),
      assetsRoot: '/assets',
      reviewOut: path.join(TMP_DIR, 'review.json'),
      nowIso: '2026-04-25T10:00:00.000Z',
    });
    const completedArtifact = {
      ...artifact,
      items: artifact.items.map((item) => ({
        ...item,
        disposition: 'reviewed',
        reviewed_diagram_present: item.storage_key.endsWith('q09.png'),
        reviewed_at: '2026-04-25T11:00:00.000Z',
        reviewed_by: 'human',
      })),
    };

    const result = applyHumanDiagramReviewToArtifacts({
      manifest: buildManifest(),
      evidenceBundles: buildEvidenceBundles(),
      reviewArtifact: completedArtifact,
    });

    expect(result.summary).toEqual({
      total: 2,
      present: 1,
      absent: 1,
      manifest_updated: 2,
      evidence_updated: 2,
      surface_posture_updated: 2,
    });
    expect(result.manifest.items.map((item) => item.diagram_present)).toEqual([true, false]);
    expect(result.evidenceBundles.bundles.map((bundle) => bundle.evidence.diagram_present)).toEqual([true, false]);
    expect(result.evidenceBundles.bundles.map((bundle) => bundle.surface_posture.diagram_present)).toEqual([true, false]);
  });
});
