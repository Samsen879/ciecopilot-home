import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'rag', 'run_evidence_draft_review_scaffold.js');
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

describe('run_evidence_draft_review_scaffold cli', () => {
  test('writes a decision scaffold json and optional markdown report', () => {
    const workspaceRoot = makeTempWorkspace();
    copyFixtureBundle(workspaceRoot);

    const result = runCli(
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

    expect(result.status).toBe(0);
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
});
