import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveCliPath } from '../run_production_evidence_rollout_status.js';

const FIRST_ONLINE_SCRIPT_PATH = path.join(
  process.cwd(),
  'scripts',
  'rag',
  'run_production_evidence_first_online_rollout_verification.js',
);
const SCRIPT_PATH = path.join(
  process.cwd(),
  'scripts',
  'rag',
  'run_production_evidence_rollout_status.js',
);

function makeTempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rag-rollout-status-cli-'));
}

function copyIntoWorkspace(workspaceRoot, relPath) {
  const sourcePath = path.join(process.cwd(), relPath);
  const targetPath = path.join(workspaceRoot, relPath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
  return targetPath;
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [SCRIPT_PATH, ...args], {
    cwd: options.cwd,
    encoding: 'utf8',
  });
}

function seedVerificationArtifact(workspaceRoot) {
  return spawnSync(process.execPath, [FIRST_ONLINE_SCRIPT_PATH], {
    cwd: workspaceRoot,
    encoding: 'utf8',
  });
}

describe('run_production_evidence_rollout_status cli', () => {
  test('preserves absolute Windows paths instead of joining them onto ROOT', () => {
    const filePath = 'C:\\tmp\\rollout_status.json';
    expect(resolveCliPath(filePath)).toBe(filePath);
  });

  test('resolves relative paths from the current working directory', () => {
    const filePath = 'runs/backend/rag_phase_b_production_evidence_rollout_status.json';
    expect(resolveCliPath(filePath)).toBe(path.join(process.cwd(), filePath));
  });

  test('writes the default output paths when no explicit outputs are provided', () => {
    const workspaceRoot = makeTempWorkspace();
    copyIntoWorkspace(workspaceRoot, 'data/evidence/production/rollout_gate_v1.json');
    copyIntoWorkspace(workspaceRoot, 'data/evidence/production/whitelist_v1.json');
    copyIntoWorkspace(workspaceRoot, 'runs/backend/rag_phase_b_production_evidence_rollout_gate.json');
    expect(seedVerificationArtifact(workspaceRoot).status).toBe(0);

    const result = runCli([], { cwd: workspaceRoot });

    expect(result.status).toBe(0);
    expect(
      fs.existsSync(path.join(workspaceRoot, 'runs/backend/rag_phase_b_production_evidence_rollout_status.json')),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(workspaceRoot, 'docs/reports/rag_phase_b_production_evidence_rollout_status.md')),
    ).toBe(true);
  });

  test('writes explicit output paths when requested', () => {
    const workspaceRoot = makeTempWorkspace();
    copyIntoWorkspace(workspaceRoot, 'data/evidence/production/rollout_gate_v1.json');
    copyIntoWorkspace(workspaceRoot, 'data/evidence/production/whitelist_v1.json');
    copyIntoWorkspace(workspaceRoot, 'runs/backend/rag_phase_b_production_evidence_rollout_gate.json');
    expect(seedVerificationArtifact(workspaceRoot).status).toBe(0);

    const outJson = 'tmp/rollout-status.json';
    const outMd = 'tmp/rollout-status.md';
    const result = runCli(['--out-json', outJson, '--out-md', outMd], { cwd: workspaceRoot });

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(workspaceRoot, outJson))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, outMd))).toBe(true);
  });

  test('returns a nonzero exit when the rollout status is unhealthy', () => {
    const workspaceRoot = makeTempWorkspace();
    const rolloutGatePath = copyIntoWorkspace(workspaceRoot, 'data/evidence/production/rollout_gate_v1.json');
    copyIntoWorkspace(workspaceRoot, 'data/evidence/production/whitelist_v1.json');
    const gateArtifactPath = copyIntoWorkspace(
      workspaceRoot,
      'runs/backend/rag_phase_b_production_evidence_rollout_gate.json',
    );
    expect(seedVerificationArtifact(workspaceRoot).status).toBe(0);

    const rolloutGate = JSON.parse(fs.readFileSync(rolloutGatePath, 'utf8'));
    rolloutGate.entries.push({
      bundle_id: 'phase_b_extra_ready_v2',
      manifest_path: 'data/evidence/production/pilot_ready_v2/manifest.json',
      subject_scope: 'single_subject',
      subject_codes: ['9231'],
      rollout_state: 'online_enabled',
      corpus_versions: ['rag_production_evidence_pilot_20260314'],
      allowed_source_types: ['evidence_authored', 'evidence_transformed'],
    });
    fs.writeFileSync(rolloutGatePath, `${JSON.stringify(rolloutGate, null, 2)}\n`, 'utf8');

    const gateArtifact = JSON.parse(fs.readFileSync(gateArtifactPath, 'utf8'));
    gateArtifact.summary.online_bundle_ids = ['phase_b_pilot_ready_v1', 'phase_b_extra_ready_v2'];
    gateArtifact.summary.online_subject_codes = ['9702', '9231'];
    gateArtifact.summary.online_corpus_versions = [
      'rag_production_evidence_pilot_20260313',
      'rag_production_evidence_pilot_20260314',
    ];
    fs.writeFileSync(gateArtifactPath, `${JSON.stringify(gateArtifact, null, 2)}\n`, 'utf8');

    const result = runCli([], { cwd: workspaceRoot });
    const payload = JSON.parse(
      fs.readFileSync(
        path.join(workspaceRoot, 'runs/backend/rag_phase_b_production_evidence_rollout_status.json'),
        'utf8',
      ),
    );

    expect(result.status).toBe(1);
    expect(payload.rollback_required).toBe(true);
    expect(payload.recommended_action).toBe('rollback_to_offline');
  });
});
