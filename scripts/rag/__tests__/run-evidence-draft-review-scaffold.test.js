import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { invokeCliMain } from './helpers/cli-main-harness.js';
import { main as reviewScaffoldMain } from '../run_evidence_draft_review_scaffold.js';

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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-draft-review-scaffold-'));
}

function copyFixtureBundle(workspaceRoot) {
  const targetDir = path.join(workspaceRoot, 'tmp', 'sample_draft_bundle');
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  fs.cpSync(FIXTURE_DIR, targetDir, { recursive: true });
  return targetDir;
}

describe('run_evidence_draft_review_scaffold cli', () => {
  test('writes a decision scaffold json and optional markdown report', async () => {
    const workspaceRoot = makeTempWorkspace();
    copyFixtureBundle(workspaceRoot);

    const result = await invokeCliMain(
      reviewScaffoldMain,
      [
        '--bundle-dir',
        'tmp/sample_draft_bundle',
        '--out-json',
        'tmp/out/decision.json',
        '--out-md',
        'tmp/out/review.md',
        '--reviewer',
        'operator-a',
      ],
      { cwd: workspaceRoot },
    );

    const decision = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'tmp/out/decision.json'), 'utf8'));
    const markdown = fs.readFileSync(path.join(workspaceRoot, 'tmp/out/review.md'), 'utf8');

    expect(result.exitCode).toBe(0);
    expect(decision).toMatchObject({
      schema_version: 'evidence_draft_review_v1',
      source_bundle_id: 'phase_c_evidence_draft_20260317',
      reviewer: 'operator-a',
      review_status: 'pending',
    });
    expect(decision.item_reviews).toHaveLength(3);
    expect(markdown).toContain('# Evidence Draft Review Decision');
    expect(markdown).toContain('operator-a');
    expect(markdown).toContain('phase_c_evidence_draft_20260317');
  });

  test('accepts explicit manifest, items, and review file inputs', async () => {
    const workspaceRoot = makeTempWorkspace();
    copyFixtureBundle(workspaceRoot);

    const result = await invokeCliMain(
      reviewScaffoldMain,
      [
        '--manifest',
        'tmp/sample_draft_bundle/manifest.json',
        '--items-json',
        'tmp/sample_draft_bundle/items.json',
        '--review-md',
        'tmp/sample_draft_bundle/review.md',
        '--out-json',
        'tmp/out/decision.json',
        '--reviewer',
        'operator-b',
      ],
      { cwd: workspaceRoot },
    );

    const decision = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'tmp/out/decision.json'), 'utf8'));

    expect(result.exitCode).toBe(0);
    expect(decision.source_bundle_path).toBe('tmp/sample_draft_bundle');
    expect(decision.reviewer).toBe('operator-b');
  });

  test('fails when bundle-dir and explicit file inputs are mixed', async () => {
    const workspaceRoot = makeTempWorkspace();
    copyFixtureBundle(workspaceRoot);

    const result = await invokeCliMain(
      reviewScaffoldMain,
      [
        '--bundle-dir',
        'tmp/sample_draft_bundle',
        '--manifest',
        'tmp/sample_draft_bundle/manifest.json',
        '--items-json',
        'tmp/sample_draft_bundle/items.json',
        '--out-json',
        'tmp/out/decision.json',
        '--reviewer',
        'operator-c',
      ],
      { cwd: workspaceRoot },
    );

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('bundle input must use either --bundle-dir or explicit --manifest/--items-json paths');
  });
});
