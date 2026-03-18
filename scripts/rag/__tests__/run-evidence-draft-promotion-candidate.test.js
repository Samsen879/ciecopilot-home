import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  buildEvidenceDraftReviewTemplate,
  loadEvidenceDraftBundle,
} from '../lib/evidence-draft-review.js';

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'rag', 'run_evidence_draft_promotion_candidate.js');
const FIXTURE_DIR = path.join(
  process.cwd(),
  'scripts',
  'rag',
  '__tests__',
  'fixtures',
  'evidence-drafts',
  'sample_draft_bundle',
);

function makeTempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-draft-promotion-candidate-'));
}

function copyFixtureBundle(workspaceRoot) {
  const targetDir = path.join(workspaceRoot, 'tmp', 'sample_draft_bundle');
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  fs.cpSync(FIXTURE_DIR, targetDir, { recursive: true });
  return targetDir;
}

function writeCompletedReview(workspaceRoot, bundleDir, options = {}) {
  const bundle = loadEvidenceDraftBundle(bundleDir);
  const review = buildEvidenceDraftReviewTemplate({
    bundle,
    reviewId: options.reviewId || 'review-20260317-cli',
    generatedAt: '2026-03-17T14:30:00.000Z',
    reviewer: options.reviewer ?? 'operator-a',
  });

  review.review_status = options.reviewStatus || 'completed';
  review.reviewed_at = '2026-03-17T14:35:00.000Z';
  review.review_notes = 'CLI compile verification.';
  review.item_reviews[0].decision = 'approve';
  review.item_reviews[0].decision_reason = 'Approved for CLI verification.';
  review.item_reviews[0].approved_patch = {
    title: 'Reviewed Hyperbolic Functions Anchor',
    statement:
      'Reviewed evidence should define hyperbolic functions from exponentials and stay inside the FP2 syllabus boundary.',
    topic_paths: ['9231.2'],
  };
  review.item_reviews[1].decision = 'reject';
  review.item_reviews[1].decision_reason = 'Not needed for this compile test.';
  review.item_reviews[2].decision = options.thirdDecision ?? 'revise';
  review.item_reviews[2].decision_reason = options.thirdDecision ? 'Explicit test override.' : 'Needs revision.';

  const reviewPath = path.join(workspaceRoot, 'tmp', 'completed_review.json');
  fs.writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
  return reviewPath;
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [SCRIPT_PATH, ...args], {
    cwd: options.cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...(options.env || {}),
    },
  });
}

describe('run_evidence_draft_promotion_candidate cli', () => {
  test('writes a governance-seed candidate bundle and fixed-path reports', () => {
    const workspaceRoot = makeTempWorkspace();
    const bundleDir = copyFixtureBundle(workspaceRoot);
    const reviewPath = writeCompletedReview(workspaceRoot, bundleDir);

    const result = runCli(
      [
        '--bundle-dir',
        'tmp/sample_draft_bundle',
        '--decision-json',
        'tmp/completed_review.json',
        '--candidate-dir',
        'tmp/review_candidates/phase_d_fixture_candidate_v1',
        '--out-json',
        'tmp/out/promotion_candidate.json',
        '--out-md',
        'tmp/out/promotion_candidate.md',
      ],
      { cwd: workspaceRoot },
    );

    const manifest = JSON.parse(
      fs.readFileSync(path.join(workspaceRoot, 'tmp/review_candidates/phase_d_fixture_candidate_v1/manifest.json'), 'utf8'),
    );
    const items = JSON.parse(
      fs.readFileSync(path.join(workspaceRoot, 'tmp/review_candidates/phase_d_fixture_candidate_v1/items.json'), 'utf8'),
    );
    const summary = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'tmp/out/promotion_candidate.json'), 'utf8'));
    const markdown = fs.readFileSync(path.join(workspaceRoot, 'tmp/out/promotion_candidate.md'), 'utf8');

    expect(result.status).toBe(0);
    expect(manifest.bundle_status).toBe('governance_seed_only');
    expect(manifest.subject_codes).toEqual(['9231']);
    expect(items).toHaveLength(1);
    expect(summary.validation.ok).toBe(true);
    expect(summary.decision_summary).toMatchObject({
      approved_count: 1,
      rejected_count: 1,
      revise_count: 1,
    });
    expect(markdown).toContain('# Evidence Draft Promotion Candidate');
    expect(markdown).toContain('review-20260317-cli');
    expect(markdown).toContain('governance_seed_only');
    expect(reviewPath).toContain('completed_review.json');
  });

  test('accepts explicit manifest, items, and review file inputs', () => {
    const workspaceRoot = makeTempWorkspace();
    const bundleDir = copyFixtureBundle(workspaceRoot);
    writeCompletedReview(workspaceRoot, bundleDir);

    const result = runCli(
      [
        '--manifest',
        'tmp/sample_draft_bundle/manifest.json',
        '--items-json',
        'tmp/sample_draft_bundle/items.json',
        '--review-md',
        'tmp/sample_draft_bundle/review.md',
        '--decision-json',
        'tmp/completed_review.json',
        '--candidate-dir',
        'tmp/review_candidates/phase_d_fixture_candidate_v2',
      ],
      { cwd: workspaceRoot },
    );

    const manifest = JSON.parse(
      fs.readFileSync(path.join(workspaceRoot, 'tmp/review_candidates/phase_d_fixture_candidate_v2/manifest.json'), 'utf8'),
    );

    expect(result.status).toBe(0);
    expect(manifest.bundle_id).toBe('phase_d_fixture_candidate_v2');
    expect(manifest.bundle_status).toBe('governance_seed_only');
  });

  test('exits nonzero when the completed review is invalid', () => {
    const workspaceRoot = makeTempWorkspace();
    const bundleDir = copyFixtureBundle(workspaceRoot);
    writeCompletedReview(workspaceRoot, bundleDir, {
      reviewer: '',
      reviewStatus: 'completed',
      thirdDecision: '',
    });

    const result = runCli(
      [
        '--bundle-dir',
        'tmp/sample_draft_bundle',
        '--decision-json',
        'tmp/completed_review.json',
        '--candidate-dir',
        'tmp/review_candidates/phase_d_invalid_candidate_v1',
        '--out-json',
        'tmp/out/promotion_candidate.json',
      ],
      { cwd: workspaceRoot },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('review decision is invalid');
  });
});
