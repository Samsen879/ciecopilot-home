import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  main as firstOnlineRolloutMain,
} from '../run_production_evidence_first_online_rollout_verification.js';
import {
  main as rolloutGateMain,
} from '../run_production_evidence_rollout_gate.js';
import {
  main as rolloutStatusMain,
  resolveCliPath,
} from '../run_production_evidence_rollout_status.js';
import { invokeCliMain } from './helpers/cli-main-harness.js';

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

async function runCli(args, options = {}) {
  return invokeCliMain(rolloutStatusMain, args, options);
}

async function seedVerificationArtifact(workspaceRoot) {
  return invokeCliMain(firstOnlineRolloutMain, [], { cwd: workspaceRoot });
}

async function seedRolloutGateArtifact(workspaceRoot) {
  return invokeCliMain(
    rolloutGateMain,
    [
      '--rollout-gate',
      'data/evidence/production/rollout_gate_v1.json',
      '--whitelist',
      'data/evidence/production/whitelist_v1.json',
      '--out-json',
      'runs/backend/rag_phase_b_production_evidence_rollout_gate.json',
    ],
    { cwd: workspaceRoot },
  );
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

  test('writes the default output paths when no explicit outputs are provided', async () => {
    const workspaceRoot = makeTempWorkspace();
    copyIntoWorkspace(workspaceRoot, 'data/evidence/production/rollout_gate_v1.json');
    copyIntoWorkspace(workspaceRoot, 'data/evidence/production/whitelist_v1.json');
    expect((await seedRolloutGateArtifact(workspaceRoot)).exitCode).toBe(0);
    expect((await seedVerificationArtifact(workspaceRoot)).exitCode).toBe(0);

    const result = await runCli([], { cwd: workspaceRoot });

    expect(result.exitCode).toBe(0);
    expect(
      fs.existsSync(path.join(workspaceRoot, 'runs/backend/rag_phase_b_production_evidence_rollout_status.json')),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(workspaceRoot, 'docs/reports/rag_phase_b_production_evidence_rollout_status.md')),
    ).toBe(true);
  });

  test('writes explicit output paths when requested', async () => {
    const workspaceRoot = makeTempWorkspace();
    copyIntoWorkspace(workspaceRoot, 'data/evidence/production/rollout_gate_v1.json');
    copyIntoWorkspace(workspaceRoot, 'data/evidence/production/whitelist_v1.json');
    expect((await seedRolloutGateArtifact(workspaceRoot)).exitCode).toBe(0);
    expect((await seedVerificationArtifact(workspaceRoot)).exitCode).toBe(0);

    const outJson = 'tmp/rollout-status.json';
    const outMd = 'tmp/rollout-status.md';
    const result = await runCli(['--out-json', outJson, '--out-md', outMd], { cwd: workspaceRoot });

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(path.join(workspaceRoot, outJson))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, outMd))).toBe(true);
  });

  test('does not infer entry mapping metadata for non-default verification artifact paths', async () => {
    const workspaceRoot = makeTempWorkspace();
    copyIntoWorkspace(workspaceRoot, 'data/evidence/production/rollout_gate_v1.json');
    copyIntoWorkspace(workspaceRoot, 'data/evidence/production/whitelist_v1.json');
    expect((await seedRolloutGateArtifact(workspaceRoot)).exitCode).toBe(0);
    expect((await seedVerificationArtifact(workspaceRoot)).exitCode).toBe(0);

    const customArtifactRelPath = 'runs/backend/custom_rollout_9702.json';
    fs.copyFileSync(
      path.join(workspaceRoot, 'runs/backend/rag_phase_b_first_online_rollout_9702.json'),
      path.join(workspaceRoot, customArtifactRelPath),
    );

    const result = await runCli(['--verification-artifact', customArtifactRelPath], { cwd: workspaceRoot });
    const payload = JSON.parse(
      fs.readFileSync(
        path.join(workspaceRoot, 'runs/backend/rag_phase_b_production_evidence_rollout_status.json'),
        'utf8',
      ),
    );

    expect(result.exitCode).toBe(1);
    expect(payload.rollback_required).toBe(true);
    expect(payload.verification_mapping.mapped_online_entries).toBe(0);
    expect(payload.rollback_reasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining('online_entry_missing_verification_artifact_mapping:phase_b_pilot_ready_v1'),
      ]),
    );
  });

  test('accepts explicit verification mappings for custom artifact paths', async () => {
    const workspaceRoot = makeTempWorkspace();
    const rolloutGatePath = copyIntoWorkspace(workspaceRoot, 'data/evidence/production/rollout_gate_v1.json');
    copyIntoWorkspace(workspaceRoot, 'data/evidence/production/whitelist_v1.json');
    const gateArtifactPath = copyIntoWorkspace(
      workspaceRoot,
      'data/evidence/production/rollout_gate_v1.json',
    );
    const generatedGateArtifactPath = path.join(
      workspaceRoot,
      'runs/backend/rag_phase_b_production_evidence_rollout_gate.json',
    );
    expect((await seedRolloutGateArtifact(workspaceRoot)).exitCode).toBe(0);
    expect((await seedVerificationArtifact(workspaceRoot)).exitCode).toBe(0);

    const custom9702RelPath = 'runs/backend/custom_rollout_9702.json';
    const custom9231RelPath = 'runs/backend/custom_rollout_9231.json';
    fs.copyFileSync(
      path.join(workspaceRoot, 'runs/backend/rag_phase_b_first_online_rollout_9702.json'),
      path.join(workspaceRoot, custom9702RelPath),
    );
    fs.copyFileSync(
      path.join(workspaceRoot, 'runs/backend/rag_phase_b_first_online_rollout_9702.json'),
      path.join(workspaceRoot, custom9231RelPath),
    );

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

    const gateArtifact = JSON.parse(fs.readFileSync(generatedGateArtifactPath, 'utf8'));
    gateArtifact.summary.online_bundle_ids = ['phase_b_pilot_ready_v1', 'phase_b_extra_ready_v2'];
    gateArtifact.summary.online_subject_codes = ['9702', '9231'];
    gateArtifact.summary.online_corpus_versions = [
      'rag_production_evidence_pilot_20260313',
      'rag_production_evidence_pilot_20260314',
    ];
    fs.writeFileSync(generatedGateArtifactPath, `${JSON.stringify(gateArtifact, null, 2)}\n`, 'utf8');

    const result = await runCli(
      [
        '--verification-mapping',
        `phase_b_pilot_ready_v1|9702|${custom9702RelPath}`,
        '--verification-mapping',
        `phase_b_extra_ready_v2|9231|${custom9231RelPath}`,
      ],
      { cwd: workspaceRoot },
    );
    const payload = JSON.parse(
      fs.readFileSync(
        path.join(workspaceRoot, 'runs/backend/rag_phase_b_production_evidence_rollout_status.json'),
        'utf8',
      ),
    );

    expect(result.exitCode).toBe(0);
    expect(payload.rollback_required).toBe(false);
    expect(payload.verification_mapping.mapped_online_entries).toBe(2);
    expect(payload.verification_mapping.unmapped_online_entries).toHaveLength(0);
    expect(payload.source_artifacts.verification_artifacts.map((item) => item.path)).toEqual(
      expect.arrayContaining([custom9702RelPath, custom9231RelPath]),
    );
  });

  test('returns a nonzero exit when the rollout status is unhealthy', async () => {
    const workspaceRoot = makeTempWorkspace();
    const rolloutGatePath = copyIntoWorkspace(workspaceRoot, 'data/evidence/production/rollout_gate_v1.json');
    copyIntoWorkspace(workspaceRoot, 'data/evidence/production/whitelist_v1.json');
    const gateArtifactPath = copyIntoWorkspace(
      workspaceRoot,
      'data/evidence/production/rollout_gate_v1.json',
    );
    const generatedGateArtifactPath = path.join(
      workspaceRoot,
      'runs/backend/rag_phase_b_production_evidence_rollout_gate.json',
    );
    expect((await seedRolloutGateArtifact(workspaceRoot)).exitCode).toBe(0);
    expect((await seedVerificationArtifact(workspaceRoot)).exitCode).toBe(0);

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

    const gateArtifact = JSON.parse(fs.readFileSync(generatedGateArtifactPath, 'utf8'));
    gateArtifact.summary.online_bundle_ids = ['phase_b_pilot_ready_v1', 'phase_b_extra_ready_v2'];
    gateArtifact.summary.online_subject_codes = ['9702', '9231'];
    gateArtifact.summary.online_corpus_versions = [
      'rag_production_evidence_pilot_20260313',
      'rag_production_evidence_pilot_20260314',
    ];
    fs.writeFileSync(generatedGateArtifactPath, `${JSON.stringify(gateArtifact, null, 2)}\n`, 'utf8');

    const result = await runCli([], { cwd: workspaceRoot });
    const payload = JSON.parse(
      fs.readFileSync(
        path.join(workspaceRoot, 'runs/backend/rag_phase_b_production_evidence_rollout_status.json'),
        'utf8',
      ),
    );

    expect(result.exitCode).toBe(1);
    expect(payload.rollback_required).toBe(true);
    expect(payload.recommended_action).toBe('rollback_to_offline');
  });
});
