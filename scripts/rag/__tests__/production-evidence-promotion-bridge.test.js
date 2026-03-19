import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { writeEvidenceDraftPromotionCandidateOutputs } from '../lib/evidence-draft-promotion-candidate.js';
import { validateProductionEvidenceManifest } from '../lib/production-evidence-manifest.js';
import {
  buildPilotReadyBundle,
  buildPilotReadyWhitelistEntry,
  executeProductionEvidencePromotionBridge,
  loadPromotionCandidateBundle,
  previewProductionEvidencePromotionBridge,
} from '../lib/production-evidence-promotion-bridge.js';

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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'production-evidence-promotion-bridge-'));
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

function readTrackedWhitelist() {
  return JSON.parse(fs.readFileSync(TRACKED_WHITELIST_PATH, 'utf8'));
}

function copyGovernanceInputs(workspaceRoot) {
  const whitelistPath = path.join(workspaceRoot, 'data', 'evidence', 'production', 'whitelist_v1.json');
  const rolloutGatePath = path.join(workspaceRoot, 'data', 'evidence', 'production', 'rollout_gate_v1.json');
  fs.mkdirSync(path.dirname(whitelistPath), { recursive: true });
  fs.copyFileSync(TRACKED_WHITELIST_PATH, whitelistPath);
  fs.copyFileSync(TRACKED_ROLLOUT_GATE_PATH, rolloutGatePath);
}

describe('production evidence promotion bridge builders', () => {
  test('loads a reviewed governance-seed candidate bundle', () => {
    const workspaceRoot = makeTempWorkspace();
    const candidate = buildReviewedCandidate(workspaceRoot);

    const loaded = loadPromotionCandidateBundle({
      rootDir: workspaceRoot,
      manifestPath: path.relative(workspaceRoot, candidate.manifestPath),
    });

    expect(loaded.manifest.bundle_id).toBe('phase_d_gap_fill_candidate_9231_v1');
    expect(loaded.manifest.bundle_status).toBe('governance_seed_only');
    expect(loaded.items).toHaveLength(1);
    expect(loaded.manifestPath).toBe('tmp/review_candidates/phase_d_gap_fill_candidate_9231_v1/manifest.json');
  });

  test('builds a pilot-ready bundle from a reviewed candidate while preserving review trace', () => {
    const workspaceRoot = makeTempWorkspace();
    const candidate = buildReviewedCandidate(workspaceRoot);

    const result = buildPilotReadyBundle({
      candidateManifest: candidate.manifest,
      candidateItems: candidate.items,
      targetBundleId: 'phase_e_pilot_ready_9231_v1',
      promotedAt: '2026-03-18T10:00:00.000Z',
      sourceReviewId: candidate.review_id,
    });

    expect(result.manifest).toMatchObject({
      bundle_id: 'phase_e_pilot_ready_9231_v1',
      bundle_status: 'pilot_ready_for_ingest',
      generated_at: '2026-03-18T10:00:00.000Z',
      subject_scope: 'single_subject',
      subject_codes: ['9231'],
      bundle_item_count: 1,
      items_file: 'items.json',
      review: {
        status: 'approved',
        owner: 'fixture-reviewer',
      },
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].review_trace).toMatchObject(candidate.items[0].review_trace);
    expect(validateProductionEvidenceManifest({ manifest: result.manifest, items: result.items }).ok).toBe(true);
  });

  test('builds a ready-for-ingest whitelist entry for the promoted bundle', () => {
    const workspaceRoot = makeTempWorkspace();
    const candidate = buildReviewedCandidate(workspaceRoot);
    const targetBundle = buildPilotReadyBundle({
      candidateManifest: candidate.manifest,
      candidateItems: candidate.items,
      targetBundleId: 'phase_e_pilot_ready_9231_v1',
      promotedAt: '2026-03-18T10:00:00.000Z',
      sourceReviewId: candidate.review_id,
    });

    const entry = buildPilotReadyWhitelistEntry({
      targetManifest: targetBundle.manifest,
      manifestPath: 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json',
      approvedCorpusVersions: ['rag_production_evidence_pilot_9231_20260318'],
    });

    expect(entry).toMatchObject({
      bundle_id: 'phase_e_pilot_ready_9231_v1',
      manifest_path: 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json',
      subject_scope: 'single_subject',
      subject_codes: ['9231'],
      release_channel: 'ready_for_ingest',
      ingest_allowed: true,
      release_ready_expected: true,
      approved_corpus_versions: ['rag_production_evidence_pilot_9231_20260318'],
    });
  });

  test('upserts a promoted ready-for-ingest entry into the canonical whitelist deterministically', () => {
    const workspaceRoot = makeTempWorkspace();
    const candidate = buildReviewedCandidate(workspaceRoot);

    const result = previewProductionEvidencePromotionBridge({
      whitelist: readTrackedWhitelist(),
      candidateManifest: candidate.manifest,
      candidateItems: candidate.items,
      targetBundleId: 'phase_e_pilot_ready_9231_v1',
      targetManifestPath: 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json',
      approvedCorpusVersions: ['rag_production_evidence_pilot_9231_20260318'],
      promotedAt: '2026-03-18T10:00:00.000Z',
      sourceReviewId: candidate.review_id,
    });

    expect(result.whitelistChanged).toBe(true);
    expect(result.whitelist.entries.find((entry) => entry.bundle_id === 'phase_e_pilot_ready_9231_v1')).toMatchObject({
      release_channel: 'ready_for_ingest',
      ingest_allowed: true,
      release_ready_expected: true,
      approved_corpus_versions: ['rag_production_evidence_pilot_9231_20260318'],
    });
    expect(result.whitelist.allowed_bundle_ids).toEqual([...result.whitelist.allowed_bundle_ids].slice().sort());
    expect(result.whitelist.allowed_manifest_paths).toEqual([...result.whitelist.allowed_manifest_paths].slice().sort());
    expect(result.whitelist.entries.map((entry) => entry.bundle_id)).toEqual(
      [...result.whitelist.entries.map((entry) => entry.bundle_id)].slice().sort(),
    );
  });

  test('replays idempotently when the promoted whitelist entry already exists', () => {
    const workspaceRoot = makeTempWorkspace();
    const candidate = buildReviewedCandidate(workspaceRoot);

    const firstPass = previewProductionEvidencePromotionBridge({
      whitelist: readTrackedWhitelist(),
      candidateManifest: candidate.manifest,
      candidateItems: candidate.items,
      targetBundleId: 'phase_e_pilot_ready_9231_v1',
      targetManifestPath: 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json',
      approvedCorpusVersions: ['rag_production_evidence_pilot_9231_20260318'],
      promotedAt: '2026-03-18T10:00:00.000Z',
      sourceReviewId: candidate.review_id,
    });
    const secondPass = previewProductionEvidencePromotionBridge({
      whitelist: firstPass.whitelist,
      candidateManifest: candidate.manifest,
      candidateItems: candidate.items,
      targetBundleId: 'phase_e_pilot_ready_9231_v1',
      targetManifestPath: 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json',
      approvedCorpusVersions: ['rag_production_evidence_pilot_9231_20260318'],
      promotedAt: '2026-03-18T10:00:00.000Z',
      sourceReviewId: candidate.review_id,
    });

    expect(secondPass.whitelistChanged).toBe(false);
    expect(secondPass.whitelist).toEqual(firstPass.whitelist);
  });

  test('runs the governance chain in preview and emits receipt metadata without touching rollout', () => {
    const workspaceRoot = makeTempWorkspace();
    const candidate = buildReviewedCandidate(workspaceRoot);

    const result = previewProductionEvidencePromotionBridge({
      whitelist: readTrackedWhitelist(),
      candidateManifest: candidate.manifest,
      candidateItems: candidate.items,
      sourceCandidateManifestPath: path.relative(workspaceRoot, candidate.manifestPath).replace(/\\/g, '/'),
      targetBundleId: 'phase_e_pilot_ready_9231_v1',
      targetManifestPath: 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json',
      approvedCorpusVersions: ['rag_production_evidence_pilot_9231_20260318'],
      promotedAt: '2026-03-18T10:00:00.000Z',
      sourceReviewId: candidate.review_id,
      whitelistPath: 'data/evidence/production/whitelist_v1.json',
      rolloutGatePath: 'data/evidence/production/rollout_gate_v1.json',
      receiptPath: 'docs/reports/receipts/phase_e_promotion_9231_v1.json',
      receiptMdPath: 'docs/reports/receipts/phase_e_promotion_9231_v1.md',
    });

    expect(result.validation).toMatchObject({
      manifest_valid: true,
      whitelist_valid: true,
      release_ready: true,
      ingest_permitted: true,
    });
    expect(result.receipt.rollout_gate).toEqual({
      touched: false,
      path: 'data/evidence/production/rollout_gate_v1.json',
    });
  });

  test('fails closed on conflicting approved corpus versions for the same bundle id', () => {
    const workspaceRoot = makeTempWorkspace();
    const candidate = buildReviewedCandidate(workspaceRoot);
    const whitelist = readTrackedWhitelist();
    whitelist.entries.push({
      bundle_id: 'phase_e_pilot_ready_9231_v1',
      manifest_path: 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json',
      subject_scope: 'single_subject',
      subject_codes: ['9231'],
      allowed_source_types: ['evidence_authored', 'evidence_transformed'],
      approved_corpus_versions: ['rag_production_evidence_pilot_9231_20260317'],
      release_channel: 'ready_for_ingest',
      ingest_allowed: true,
      release_ready_expected: true,
    });
    whitelist.allowed_bundle_ids.push('phase_e_pilot_ready_9231_v1');
    whitelist.allowed_manifest_paths.push('data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json');

    expect(() =>
      previewProductionEvidencePromotionBridge({
        whitelist,
        candidateManifest: candidate.manifest,
        candidateItems: candidate.items,
        targetBundleId: 'phase_e_pilot_ready_9231_v1',
        targetManifestPath: 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json',
        approvedCorpusVersions: ['rag_production_evidence_pilot_9231_20260318'],
        promotedAt: '2026-03-18T10:00:00.000Z',
        sourceReviewId: candidate.review_id,
      }),
    ).toThrow('conflicts with existing whitelist entry');
  });

  test('fails closed when approved corpus versions are empty', () => {
    const workspaceRoot = makeTempWorkspace();
    const candidate = buildReviewedCandidate(workspaceRoot);
    const targetBundle = buildPilotReadyBundle({
      candidateManifest: candidate.manifest,
      candidateItems: candidate.items,
      targetBundleId: 'phase_e_pilot_ready_9231_v1',
      promotedAt: '2026-03-18T10:00:00.000Z',
      sourceReviewId: candidate.review_id,
    });

    expect(() =>
      buildPilotReadyWhitelistEntry({
        targetManifest: targetBundle.manifest,
        manifestPath: 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json',
        approvedCorpusVersions: [],
      }),
    ).toThrow('approved corpus versions must not be empty');
  });

  test('apply writes canonical bundle files, whitelist, and tracked receipt without touching rollout gate', () => {
    const workspaceRoot = makeTempWorkspace();
    copyGovernanceInputs(workspaceRoot);
    const candidate = buildReviewedCandidate(workspaceRoot);
    const rolloutGateBefore = fs.readFileSync(
      path.join(workspaceRoot, 'data', 'evidence', 'production', 'rollout_gate_v1.json'),
      'utf8',
    );

    const result = executeProductionEvidencePromotionBridge({
      rootDir: workspaceRoot,
      mode: 'apply',
      candidateManifestPath: path.relative(workspaceRoot, candidate.manifestPath),
      targetBundleId: 'phase_e_pilot_ready_9231_v1',
      targetManifestPath: 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json',
      approvedCorpusVersions: ['rag_production_evidence_pilot_9231_20260318'],
      promotedAt: '2026-03-18T10:00:00.000Z',
      sourceReviewId: candidate.review_id,
      whitelistPath: 'data/evidence/production/whitelist_v1.json',
      rolloutGatePath: 'data/evidence/production/rollout_gate_v1.json',
    });

    expect(result.mode).toBe('apply');
    expect(result.paths).toMatchObject({
      receiptJsonPath: 'data/evidence/production/receipts/phase_e_pilot_ready_9231_v1_promotion_receipt.json',
      receiptMdPath: 'docs/reports/rag_phase_e_phase_e_pilot_ready_9231_v1_promotion_receipt.md',
    });
    expect(fs.existsSync(path.join(workspaceRoot, 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, 'data/evidence/production/phase_e_pilot_ready_9231_v1/items.json'))).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          workspaceRoot,
          'data/evidence/production/receipts/phase_e_pilot_ready_9231_v1_promotion_receipt.json',
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          workspaceRoot,
          'docs/reports/rag_phase_e_phase_e_pilot_ready_9231_v1_promotion_receipt.md',
        ),
      ),
    ).toBe(true);
    expect(result.writes).toMatchObject({
      bundle: true,
      whitelist: true,
      receipt: true,
      proposal: false,
    });

    const updatedWhitelist = JSON.parse(
      fs.readFileSync(path.join(workspaceRoot, 'data/evidence/production/whitelist_v1.json'), 'utf8'),
    );
    expect(updatedWhitelist.entries.find((entry) => entry.bundle_id === 'phase_e_pilot_ready_9231_v1')).toBeTruthy();
    expect(
      fs.readFileSync(path.join(workspaceRoot, 'data/evidence/production/rollout_gate_v1.json'), 'utf8'),
    ).toBe(rolloutGateBefore);
  });

  test('dry-run writes no canonical files', () => {
    const workspaceRoot = makeTempWorkspace();
    copyGovernanceInputs(workspaceRoot);
    const candidate = buildReviewedCandidate(workspaceRoot);
    const rolloutGateBefore = fs.readFileSync(
      path.join(workspaceRoot, 'data', 'evidence', 'production', 'rollout_gate_v1.json'),
      'utf8',
    );
    const whitelistBefore = fs.readFileSync(
      path.join(workspaceRoot, 'data', 'evidence', 'production', 'whitelist_v1.json'),
      'utf8',
    );

    const result = executeProductionEvidencePromotionBridge({
      rootDir: workspaceRoot,
      mode: 'dry-run',
      candidateManifestPath: path.relative(workspaceRoot, candidate.manifestPath),
      targetBundleId: 'phase_e_pilot_ready_9231_v1',
      targetManifestPath: 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json',
      approvedCorpusVersions: ['rag_production_evidence_pilot_9231_20260318'],
      promotedAt: '2026-03-18T10:00:00.000Z',
      sourceReviewId: candidate.review_id,
      whitelistPath: 'data/evidence/production/whitelist_v1.json',
      rolloutGatePath: 'data/evidence/production/rollout_gate_v1.json',
      receiptJsonPath: 'tmp/receipts/phase_e_promotion_9231_v1.json',
      receiptMdPath: 'tmp/receipts/phase_e_promotion_9231_v1.md',
    });

    expect(result.mode).toBe('dry-run');
    expect(result.writes).toEqual({
      bundle: false,
      whitelist: false,
      receipt: false,
      proposal: false,
    });
    expect(fs.existsSync(path.join(workspaceRoot, 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json'))).toBe(false);
    expect(fs.existsSync(path.join(workspaceRoot, 'tmp/receipts/phase_e_promotion_9231_v1.json'))).toBe(false);
    expect(
      fs.readFileSync(path.join(workspaceRoot, 'data/evidence/production/whitelist_v1.json'), 'utf8'),
    ).toBe(whitelistBefore);
    expect(
      fs.readFileSync(path.join(workspaceRoot, 'data/evidence/production/rollout_gate_v1.json'), 'utf8'),
    ).toBe(rolloutGateBefore);
  });

  test('proposal-only writes only proposal outputs under the proposal directory', () => {
    const workspaceRoot = makeTempWorkspace();
    copyGovernanceInputs(workspaceRoot);
    const candidate = buildReviewedCandidate(workspaceRoot);
    const rolloutGateBefore = fs.readFileSync(
      path.join(workspaceRoot, 'data', 'evidence', 'production', 'rollout_gate_v1.json'),
      'utf8',
    );

    const result = executeProductionEvidencePromotionBridge({
      rootDir: workspaceRoot,
      mode: 'proposal-only',
      candidateManifestPath: path.relative(workspaceRoot, candidate.manifestPath),
      targetBundleId: 'phase_e_pilot_ready_9231_v1',
      targetManifestPath: 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json',
      approvedCorpusVersions: ['rag_production_evidence_pilot_9231_20260318'],
      promotedAt: '2026-03-18T10:00:00.000Z',
      sourceReviewId: candidate.review_id,
      whitelistPath: 'data/evidence/production/whitelist_v1.json',
      rolloutGatePath: 'data/evidence/production/rollout_gate_v1.json',
      proposalDir: 'tmp/proposal',
    });

    expect(result.mode).toBe('proposal-only');
    expect(result.writes).toEqual({
      bundle: false,
      whitelist: false,
      receipt: false,
      proposal: true,
    });
    expect(fs.existsSync(path.join(workspaceRoot, 'tmp/proposal/phase_e_pilot_ready_9231_v1/manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, 'tmp/proposal/phase_e_pilot_ready_9231_v1/items.json'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, 'tmp/proposal/whitelist_v1.json'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, 'tmp/proposal/promotion_receipt.json'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, 'tmp/proposal/promotion_receipt.md'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json'))).toBe(false);
    expect(
      fs.readFileSync(path.join(workspaceRoot, 'data/evidence/production/rollout_gate_v1.json'), 'utf8'),
    ).toBe(rolloutGateBefore);
  });

  test('replaying apply with identical inputs is a no-op', () => {
    const workspaceRoot = makeTempWorkspace();
    copyGovernanceInputs(workspaceRoot);
    const candidate = buildReviewedCandidate(workspaceRoot);

    const firstPass = executeProductionEvidencePromotionBridge({
      rootDir: workspaceRoot,
      mode: 'apply',
      candidateManifestPath: path.relative(workspaceRoot, candidate.manifestPath),
      targetBundleId: 'phase_e_pilot_ready_9231_v1',
      targetManifestPath: 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json',
      approvedCorpusVersions: ['rag_production_evidence_pilot_9231_20260318'],
      promotedAt: '2026-03-18T10:00:00.000Z',
      sourceReviewId: candidate.review_id,
      whitelistPath: 'data/evidence/production/whitelist_v1.json',
      rolloutGatePath: 'data/evidence/production/rollout_gate_v1.json',
      receiptJsonPath: 'tmp/receipts/phase_e_promotion_9231_v1.json',
      receiptMdPath: 'tmp/receipts/phase_e_promotion_9231_v1.md',
    });
    const secondPass = executeProductionEvidencePromotionBridge({
      rootDir: workspaceRoot,
      mode: 'apply',
      candidateManifestPath: path.relative(workspaceRoot, candidate.manifestPath),
      targetBundleId: 'phase_e_pilot_ready_9231_v1',
      targetManifestPath: 'data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json',
      approvedCorpusVersions: ['rag_production_evidence_pilot_9231_20260318'],
      promotedAt: '2026-03-18T10:00:00.000Z',
      sourceReviewId: candidate.review_id,
      whitelistPath: 'data/evidence/production/whitelist_v1.json',
      rolloutGatePath: 'data/evidence/production/rollout_gate_v1.json',
      receiptJsonPath: 'tmp/receipts/phase_e_promotion_9231_v1.json',
      receiptMdPath: 'tmp/receipts/phase_e_promotion_9231_v1.md',
    });

    expect(firstPass.writes.bundle).toBe(true);
    expect(secondPass.replayed).toBe(true);
    expect(secondPass.writes).toEqual({
      bundle: false,
      whitelist: false,
      receipt: false,
      proposal: false,
    });
  });
});
