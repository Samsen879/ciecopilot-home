import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { writeEvidenceDraftPromotionCandidateOutputs } from '../lib/evidence-draft-promotion-candidate.js';
import { main as bridgeMain } from '../run_production_evidence_promotion_bridge.js';
import { invokeCliMain } from './helpers/cli-main-harness.js';

const DRAFT_FIXTURE_DIR = path.join(
  process.cwd(),
  'scripts',
  'rag',
  '__tests__',
  'fixtures',
  'evidence-drafts',
  'sample_draft_bundle',
);
const REVIEW_FIXTURE_PATH = path.join(
  process.cwd(),
  'scripts',
  'rag',
  '__tests__',
  'fixtures',
  'evidence-drafts',
  'sample_completed_review.json',
);
const TRACKED_WHITELIST_PATH = path.join(process.cwd(), 'data', 'evidence', 'production', 'whitelist_v1.json');
const TRACKED_ROLLOUT_GATE_PATH = path.join(process.cwd(), 'data', 'evidence', 'production', 'rollout_gate_v1.json');

function makeTempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'run-production-evidence-promotion-bridge-'));
}

function copyFixtureBundle(workspaceRoot) {
  const targetDir = path.join(workspaceRoot, 'tmp', 'sample_draft_bundle');
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  fs.cpSync(DRAFT_FIXTURE_DIR, targetDir, { recursive: true });
  return targetDir;
}

function copyCompletedReview(workspaceRoot) {
  const targetPath = path.join(workspaceRoot, 'tmp', 'sample_completed_review.json');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(REVIEW_FIXTURE_PATH, targetPath);
  return targetPath;
}

function copyGovernanceInputs(workspaceRoot) {
  const whitelistPath = path.join(workspaceRoot, 'data', 'evidence', 'production', 'whitelist_v1.json');
  const rolloutGatePath = path.join(workspaceRoot, 'data', 'evidence', 'production', 'rollout_gate_v1.json');
  fs.mkdirSync(path.dirname(whitelistPath), { recursive: true });
  fs.copyFileSync(TRACKED_WHITELIST_PATH, whitelistPath);
  fs.copyFileSync(TRACKED_ROLLOUT_GATE_PATH, rolloutGatePath);
}

function buildReviewedCandidate(workspaceRoot) {
  const bundleDir = copyFixtureBundle(workspaceRoot);
  const reviewPath = copyCompletedReview(workspaceRoot);
  const candidateDir = path.join(workspaceRoot, 'tmp', 'review_candidates', 'phase_d_gap_fill_candidate_9231_v1');

  return writeEvidenceDraftPromotionCandidateOutputs({
    bundleDir,
    decisionJsonPath: reviewPath,
    candidateDir,
    candidateBundleId: 'phase_d_gap_fill_candidate_9231_v1',
    generatedAt: '2026-03-18T09:00:00.000Z',
  });
}

async function runCli(argv, workspaceRoot) {
  return invokeCliMain(bridgeMain, argv, { cwd: workspaceRoot });
}

describe('run_production_evidence_promotion_bridge cli', () => {
  test('default apply mode writes canonical bundle, whitelist, and receipt', async () => {
    const workspaceRoot = makeTempWorkspace();
    copyGovernanceInputs(workspaceRoot);
    buildReviewedCandidate(workspaceRoot);

    const result = await runCli(
      [
        '--candidate-dir',
        'tmp/review_candidates/phase_d_gap_fill_candidate_9231_v1',
        '--target-bundle-id',
        'phase_e_pilot_ready_9231_v1',
        '--approved-corpus-version',
        'rag_production_evidence_pilot_9231_20260318',
        '--receipt-json',
        'tmp/receipts/phase_e_promotion_9231_v1.json',
        '--receipt-md',
        'tmp/receipts/phase_e_promotion_9231_v1.md',
      ],
      workspaceRoot,
    );
    const summary = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(summary.mode).toBe('apply');
    expect(summary.validation.release_ready).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, 'tmp/receipts/phase_e_promotion_9231_v1.json'))).toBe(true);
  });

  test('collects repeated approved corpus version args', async () => {
    const workspaceRoot = makeTempWorkspace();
    copyGovernanceInputs(workspaceRoot);
    buildReviewedCandidate(workspaceRoot);

    const result = await runCli(
      [
        '--candidate-dir',
        'tmp/review_candidates/phase_d_gap_fill_candidate_9231_v1',
        '--target-bundle-id',
        'phase_e_pilot_ready_9231_v1',
        '--approved-corpus-version',
        'rag_production_evidence_pilot_9231_20260318',
        '--approved-corpus-version',
        'rag_production_evidence_pilot_9231_20260319',
        '--receipt-json',
        'tmp/receipts/phase_e_promotion_9231_v1.json',
        '--receipt-md',
        'tmp/receipts/phase_e_promotion_9231_v1.md',
      ],
      workspaceRoot,
    );
    const whitelist = JSON.parse(
      fs.readFileSync(path.join(workspaceRoot, 'data/evidence/production/whitelist_v1.json'), 'utf8'),
    );

    expect(result.exitCode).toBe(0);
    expect(whitelist.entries.find((entry) => entry.bundle_id === 'phase_e_pilot_ready_9231_v1')).toMatchObject({
      approved_corpus_versions: [
        'rag_production_evidence_pilot_9231_20260318',
        'rag_production_evidence_pilot_9231_20260319',
      ],
    });
  });

  test('dry-run prints a preview result and writes no canonical outputs', async () => {
    const workspaceRoot = makeTempWorkspace();
    copyGovernanceInputs(workspaceRoot);
    buildReviewedCandidate(workspaceRoot);

    const result = await runCli(
      [
        '--candidate-dir',
        'tmp/review_candidates/phase_d_gap_fill_candidate_9231_v1',
        '--target-bundle-id',
        'phase_e_pilot_ready_9231_v1',
        '--approved-corpus-version',
        'rag_production_evidence_pilot_9231_20260318',
        '--dry-run',
      ],
      workspaceRoot,
    );
    const summary = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(summary.mode).toBe('dry-run');
    expect(summary.validation.release_ready).toBe(true);
    expect(summary.validation.ingest_permitted).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json'))).toBe(false);
  });

  test('proposal-only writes only proposal outputs under the proposal directory', async () => {
    const workspaceRoot = makeTempWorkspace();
    copyGovernanceInputs(workspaceRoot);
    buildReviewedCandidate(workspaceRoot);

    const result = await runCli(
      [
        '--candidate-dir',
        'tmp/review_candidates/phase_d_gap_fill_candidate_9231_v1',
        '--target-bundle-id',
        'phase_e_pilot_ready_9231_v1',
        '--approved-corpus-version',
        'rag_production_evidence_pilot_9231_20260318',
        '--proposal-only',
        '--proposal-dir',
        'tmp/proposal',
      ],
      workspaceRoot,
    );
    const summary = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(summary.mode).toBe('proposal-only');
    expect(fs.existsSync(path.join(workspaceRoot, 'tmp/proposal/phase_e_pilot_ready_9231_v1/manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, 'tmp/proposal/promotion_receipt.json'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json'))).toBe(false);
  });

  test('accepts explicit manifest and items paths for the reviewed candidate', async () => {
    const workspaceRoot = makeTempWorkspace();
    copyGovernanceInputs(workspaceRoot);
    const candidate = buildReviewedCandidate(workspaceRoot);

    const result = await runCli(
      [
        '--manifest',
        path.relative(workspaceRoot, candidate.manifestPath).replace(/\\/g, '/'),
        '--items-json',
        path.relative(workspaceRoot, candidate.itemsPath).replace(/\\/g, '/'),
        '--target-bundle-id',
        'phase_e_pilot_ready_9231_v1',
        '--approved-corpus-version',
        'rag_production_evidence_pilot_9231_20260318',
        '--dry-run',
      ],
      workspaceRoot,
    );

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).validation.release_ready).toBe(true);
  });

  test('returns a nonzero exit code on conflict', async () => {
    const workspaceRoot = makeTempWorkspace();
    copyGovernanceInputs(workspaceRoot);
    buildReviewedCandidate(workspaceRoot);

    expect(
      (
        await runCli(
          [
            '--candidate-dir',
            'tmp/review_candidates/phase_d_gap_fill_candidate_9231_v1',
            '--target-bundle-id',
            'phase_e_pilot_ready_9231_v1',
            '--approved-corpus-version',
            'rag_production_evidence_pilot_9231_20260318',
            '--receipt-json',
            'tmp/receipts/phase_e_promotion_9231_v1.json',
            '--receipt-md',
            'tmp/receipts/phase_e_promotion_9231_v1.md',
          ],
          workspaceRoot,
        )
      ).exitCode,
    ).toBe(0);

    const conflictResult = await runCli(
      [
        '--candidate-dir',
        'tmp/review_candidates/phase_d_gap_fill_candidate_9231_v1',
        '--target-bundle-id',
        'phase_e_pilot_ready_9231_v1',
        '--approved-corpus-version',
        'rag_production_evidence_pilot_9231_20260319',
        '--receipt-json',
        'tmp/receipts/phase_e_promotion_9231_v1.json',
        '--receipt-md',
        'tmp/receipts/phase_e_promotion_9231_v1.md',
      ],
      workspaceRoot,
    );

    expect(conflictResult.exitCode).not.toBe(0);
    expect(conflictResult.stderr).toContain('conflicts with existing whitelist entry');
  });

  test('fails closed when target bundle id is missing', async () => {
    const workspaceRoot = makeTempWorkspace();
    copyGovernanceInputs(workspaceRoot);
    buildReviewedCandidate(workspaceRoot);

    const result = await runCli(
      [
        '--candidate-dir',
        'tmp/review_candidates/phase_d_gap_fill_candidate_9231_v1',
        '--approved-corpus-version',
        'rag_production_evidence_pilot_9231_20260318',
      ],
      workspaceRoot,
    );

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('target bundle id is required');
  });
});
