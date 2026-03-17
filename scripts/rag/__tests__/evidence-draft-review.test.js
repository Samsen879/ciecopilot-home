import path from 'node:path';

import {
  buildEvidenceDraftReviewTemplate,
  loadEvidenceDraftBundle,
  renderEvidenceDraftReviewReport,
  validateEvidenceDraftReview,
} from '../lib/evidence-draft-review.js';

const FIXTURE_DIR = path.join(
  process.cwd(),
  'scripts',
  'rag',
  '__tests__',
  'fixtures',
  'evidence-drafts',
  'sample_draft_bundle',
);

describe('evidence draft review', () => {
  test('loads a draft bundle fixture and scaffolds a pending review template', () => {
    const bundle = loadEvidenceDraftBundle(FIXTURE_DIR);
    const review = buildEvidenceDraftReviewTemplate({
      bundle,
      reviewId: 'review-20260317-a',
      generatedAt: '2026-03-17T13:00:00.000Z',
      reviewer: 'reviewer-a',
    });

    expect(bundle.manifest.bundle_id).toBe('phase_c_evidence_draft_20260317');
    expect(bundle.items).toHaveLength(3);
    expect(review).toMatchObject({
      schema_version: 'evidence_draft_review_v1',
      review_id: 'review-20260317-a',
      generated_at: '2026-03-17T13:00:00.000Z',
      source_bundle_id: 'phase_c_evidence_draft_20260317',
      source_generation_mode: 'llm',
      review_status: 'pending',
      reviewer: 'reviewer-a',
    });
    expect(review.item_reviews).toEqual([
      expect.objectContaining({
        evidence_id: 'phase_c_evidence_draft_20260317-9231-9231-2-001',
        brief_id: 'evidence-gap-9231-9231-2',
        subject_code: '9231',
        legacy_target_topic_path: '9231.2',
        canonical_target_topic_path: '9231.fp2',
        decision: null,
        approved_patch: {},
      }),
      expect.objectContaining({
        evidence_id: 'phase_c_evidence_draft_20260317-9231-9231-2-002',
        subject_code: '9231',
        legacy_target_topic_path: '9231.2',
        canonical_target_topic_path: '9231.fp2',
        decision: null,
      }),
      expect.objectContaining({
        evidence_id: 'phase_c_evidence_draft_20260317-9702-9702-5-001',
        subject_code: '9702',
        legacy_target_topic_path: '9702.5',
        canonical_target_topic_path: '9702.as.work_energy_and_power',
        decision: null,
      }),
    ]);

    const report = renderEvidenceDraftReviewReport({ bundle, review });
    expect(report).toContain('# Evidence Draft Review Decision');
    expect(report).toContain('phase_c_evidence_draft_20260317');
    expect(report).toContain('review-20260317-a');
    expect(report).toContain('decision: `pending`');
  });

  test('fails validation when a completed review is missing decisions, reviewer, or reject reasons', () => {
    const bundle = loadEvidenceDraftBundle(FIXTURE_DIR);
    const review = buildEvidenceDraftReviewTemplate({
      bundle,
      reviewId: 'review-20260317-b',
      generatedAt: '2026-03-17T13:15:00.000Z',
      reviewer: '',
    });

    review.review_status = 'completed';
    review.item_reviews[0].decision = 'approve';
    review.item_reviews[1].decision = 'reject';
    review.item_reviews[2].decision = null;

    const result = validateEvidenceDraftReview({ review, bundle });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('reviewer is required');
    expect(result.errors.join('\n')).toContain('item_reviews[1].decision_reason is required');
    expect(result.errors.join('\n')).toContain('item_reviews[2].decision is required');
  });
});
