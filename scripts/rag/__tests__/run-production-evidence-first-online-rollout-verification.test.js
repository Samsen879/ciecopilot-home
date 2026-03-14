import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveCliPath } from '../run_production_evidence_first_online_rollout_verification.js';

const SCRIPT_PATH = path.join(
  process.cwd(),
  'scripts',
  'rag',
  'run_production_evidence_first_online_rollout_verification.js',
);

function makeTempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rag-first-online-rollout-cli-'));
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

describe('run_production_evidence_first_online_rollout_verification cli', () => {
  test('preserves absolute Windows paths instead of joining them onto ROOT', () => {
    const filePath = 'C:\\tmp\\rollout_verification.json';
    expect(resolveCliPath(filePath)).toBe(filePath);
  });

  test('resolves relative paths from the current working directory', () => {
    const filePath = 'runs/backend/rag_phase_b_first_online_rollout_9702.json';
    expect(resolveCliPath(filePath)).toBe(path.join(process.cwd(), filePath));
  });

  test('writes the default output paths when no explicit outputs are provided', () => {
    const workspaceRoot = makeTempWorkspace();
    copyIntoWorkspace(workspaceRoot, 'data/evidence/production/rollout_gate_v1.json');
    copyIntoWorkspace(workspaceRoot, 'data/evidence/production/whitelist_v1.json');

    const result = runCli([], { cwd: workspaceRoot });

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(workspaceRoot, 'runs/backend/rag_phase_b_first_online_rollout_9702.json'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, 'docs/reports/rag_phase_b_first_online_rollout_9702.md'))).toBe(true);
  });

  test('writes explicit output paths when requested', () => {
    const workspaceRoot = makeTempWorkspace();
    copyIntoWorkspace(workspaceRoot, 'data/evidence/production/rollout_gate_v1.json');
    copyIntoWorkspace(workspaceRoot, 'data/evidence/production/whitelist_v1.json');

    const outJson = 'tmp/first-online-rollout.json';
    const outMd = 'tmp/first-online-rollout.md';
    const result = runCli(['--out-json', outJson, '--out-md', outMd], { cwd: workspaceRoot });

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(workspaceRoot, outJson))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, outMd))).toBe(true);
  });

  test('returns a nonzero exit when the verification payload status is fail', () => {
    const workspaceRoot = makeTempWorkspace();
    const rolloutGatePath = copyIntoWorkspace(workspaceRoot, 'data/evidence/production/rollout_gate_v1.json');
    copyIntoWorkspace(workspaceRoot, 'data/evidence/production/whitelist_v1.json');

    const offlineGate = JSON.parse(fs.readFileSync(rolloutGatePath, 'utf8'));
    offlineGate.entries[0].rollout_state = 'offline_default';
    fs.writeFileSync(rolloutGatePath, `${JSON.stringify(offlineGate, null, 2)}\n`, 'utf8');

    const result = runCli([], { cwd: workspaceRoot });
    const payload = JSON.parse(
      fs.readFileSync(path.join(workspaceRoot, 'runs/backend/rag_phase_b_first_online_rollout_9702.json'), 'utf8'),
    );

    expect(result.status).toBe(1);
    expect(payload.status).toBe('fail');
  });
});
