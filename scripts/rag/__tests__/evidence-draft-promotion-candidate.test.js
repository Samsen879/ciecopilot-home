import path from 'node:path';

import {
  buildEvidenceDraftPromotionCandidate,
} from '../lib/evidence-draft-promotion-candidate.js';
import {
  buildEvidenceDraftReviewTemplate,
  loadEvidenceDraftBundle,
} from '../lib/evidence-draft-review.js';
import { validateProductionEvidenceManifest } from '../lib/production-evidence-manifest.js';

const FIXTURE_DIR = path.join(
  process.cwd(),
  'scripts',
  'rag',
  '__tests__',
  'fixtures',
  'evidence-drafts',
  'sample_draft_bundle',
);

function buildCompletedReview(bundle) {
  const review = buildEvidenceDraftReviewTemplate({
    bundle,
    reviewId: 'review-20260317-compile',
    generatedAt: '2026-03-17T14:00:00.000Z',
    reviewer: 'operator-a',
  });

  review.review_status = 'completed';
  review.reviewed_at = '2026-03-17T14:05:00.000Z';
  review.review_notes = 'Approved one narrow 9231 patch and held the rest back.';
  review.item_reviews[0].decision = 'approve';
  review.item_reviews[0].decision_reason = 'Aligned with syllabus anchors and narrow enough for production evidence.';
  review.item_reviews[0].approved_patch = {
    title: 'Reviewed Hyperbolic Functions Anchor',
    statement:
      'Reviewed evidence should define hyperbolic functions from exponentials, connect inverse forms, and stay inside the FP2 hyperbolic functions syllabus boundary.',
    topic_paths: ['9231.2'],
  };
  review.item_reviews[1].decision = 'reject';
  review.item_reviews[1].decision_reason = 'Too broad for the current evidence gap.';
  review.item_reviews[2].decision = 'revise';
  review.item_reviews[2].decision_reason = 'Needs a tighter statement before promotion.';

  return review;
}

describe('evidence draft promotion candidate', () => {
  test('compiles approved draft items into a governance-seed production evidence candidate', () => {
    const bundle = loadEvidenceDraftBundle(FIXTURE_DIR);
    const review = buildCompletedReview(bundle);

    const result = buildEvidenceDraftPromotionCandidate({
      bundle,
      review,
      candidateBundleId: 'phase_d_gap_fill_candidate_20260317_review_20260317_compile',
      generatedAt: '2026-03-17T14:10:00.000Z',
    });

    expect(result.manifest).toMatchObject({
      manifest_role: 'production_evidence_bundle',
      evidence_layer: 'production_evidence',
      policy_mode: 'production_evidence',
      schema_version: 'v1',
      bundle_id: 'phase_d_gap_fill_candidate_20260317_review_20260317_compile',
      bundle_status: 'governance_seed_only',
      subject_scope: 'single_subject',
      subject_codes: ['9231'],
      bundle_item_count: 1,
      review: {
        status: 'approved',
        owner: 'operator-a',
      },
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        evidence_id: 'phase_d_gap_fill_candidate_20260317_review_20260317_compile-001',
        source_type: 'evidence_authored',
        subject_code: '9231',
        title: 'Reviewed Hyperbolic Functions Anchor',
        topic_paths: ['9231.2'],
        statement:
          'Reviewed evidence should define hyperbolic functions from exponentials, connect inverse forms, and stay inside the FP2 hyperbolic functions syllabus boundary.',
        provenance: {
          method: 'authored',
          origin_layer: 'production_evidence',
          upstream_source_class: 'none',
          upstream_refs: [],
        },
        review: {
          status: 'approved',
        },
        review_trace: expect.objectContaining({
          source_draft_bundle_id: 'phase_c_evidence_draft_20260317',
          source_draft_evidence_id: 'phase_c_evidence_draft_20260317-9231-9231-2-001',
          source_brief_id: 'evidence-gap-9231-9231-2',
          canonical_target_topic_path: '9231.fp2',
          operator_decision_reason: 'Aligned with syllabus anchors and narrow enough for production evidence.',
          operator_patch_applied: true,
        }),
      }),
    ]);

    expect(result.decision_summary).toMatchObject({
      approved_count: 1,
      rejected_count: 1,
      revise_count: 1,
    });

    const validation = validateProductionEvidenceManifest({
      manifest: result.manifest,
      items: result.items,
    });
    expect(validation.ok).toBe(true);
  });

  test('fails closed when no items are approved or the review is incomplete', () => {
    const bundle = loadEvidenceDraftBundle(FIXTURE_DIR);
    const review = buildCompletedReview(bundle);

    review.item_reviews[0].decision = 'reject';
    review.item_reviews[0].decision_reason = 'No approved items remain.';

    expect(() =>
      buildEvidenceDraftPromotionCandidate({
        bundle,
        review,
        candidateBundleId: 'phase_d_gap_fill_candidate_20260317_zero_approved',
        generatedAt: '2026-03-17T14:15:00.000Z',
      }),
    ).toThrow('approved item count must be greater than zero');

    review.item_reviews[0].decision = 'approve';
    review.item_reviews[0].decision_reason = 'Recovered one approved item.';
    review.review_status = 'completed';
    review.reviewer = '';

    expect(() =>
      buildEvidenceDraftPromotionCandidate({
        bundle,
        review,
        candidateBundleId: 'phase_d_gap_fill_candidate_20260317_missing_reviewer',
        generatedAt: '2026-03-17T14:20:00.000Z',
      }),
    ).toThrow('review decision is invalid');
  });
});
