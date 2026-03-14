import fs from 'node:fs';
import path from 'node:path';
import { validateProductionEvidenceRolloutGate } from '../lib/production-evidence-rollout-gate.js';

function readJson(rootDir, relPath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relPath), 'utf8'));
}

describe('production evidence retrieval rollout gate', () => {
  const rootDir = process.cwd();
  const whitelistPath = 'data/evidence/production/whitelist_v1.json';
  const rolloutGatePath = 'data/evidence/production/rollout_gate_v1.json';

  test('keeps the checked-in rollout gate online for the first 9702 rollout while referencing a ready bundle', () => {
    const whitelist = readJson(rootDir, whitelistPath);
    const rolloutGate = readJson(rootDir, rolloutGatePath);

    const result = validateProductionEvidenceRolloutGate({
      rolloutGate,
      whitelist,
    });

    expect(result.ok).toBe(true);
    expect(result.summary.online_bundle_ids).toEqual(['phase_b_pilot_ready_v1']);
    expect(result.summary.online_subject_codes).toEqual(['9702']);
    expect(result.summary.online_corpus_versions).toEqual(['rag_production_evidence_pilot_20260313']);
    expect(result.summary.offline_bundle_ids).toEqual([]);
  });

  test('allows an online-enabled entry only when it points at a ready-for-ingest whitelisted bundle', () => {
    const whitelist = readJson(rootDir, whitelistPath);
    const rolloutGate = readJson(rootDir, rolloutGatePath);
    const promotedGate = structuredClone(rolloutGate);
    promotedGate.entries[0].rollout_state = 'online_enabled';

    const result = validateProductionEvidenceRolloutGate({
      rolloutGate: promotedGate,
      whitelist,
    });

    expect(result.ok).toBe(true);
    expect(result.summary.online_bundle_ids).toEqual(['phase_b_pilot_ready_v1']);
    expect(result.summary.online_subject_codes).toEqual(['9702']);
    expect(result.summary.online_corpus_versions).toEqual(['rag_production_evidence_pilot_20260313']);
  });

  test('rejects corpus version drift that is not approved by the whitelist entry', () => {
    const whitelist = readJson(rootDir, whitelistPath);
    const rolloutGate = readJson(rootDir, rolloutGatePath);
    const driftedGate = structuredClone(rolloutGate);
    driftedGate.entries[0].corpus_versions = ['totally_wrong_corpus'];

    const result = validateProductionEvidenceRolloutGate({
      rolloutGate: driftedGate,
      whitelist,
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('entries[0] corpus_versions must match the whitelist approved_corpus_versions');
  });

  test('treats subject codes and allowed source types as sets instead of ordered lists', () => {
    const whitelist = readJson(rootDir, whitelistPath);
    const rolloutGate = readJson(rootDir, rolloutGatePath);
    const reorderedWhitelist = structuredClone(whitelist);
    const reorderedGate = structuredClone(rolloutGate);

    reorderedWhitelist.entries[1].subject_scope = 'mixed_subject';
    reorderedWhitelist.entries[1].subject_codes = ['9702', '9231'];
    reorderedWhitelist.entries[1].allowed_source_types = ['evidence_authored', 'evidence_transformed'];

    reorderedGate.entries[0].subject_scope = 'mixed_subject';
    reorderedGate.entries[0].subject_codes = ['9231', '9702'];
    reorderedGate.entries[0].allowed_source_types = ['evidence_transformed', 'evidence_authored'];

    const result = validateProductionEvidenceRolloutGate({
      rolloutGate: reorderedGate,
      whitelist: reorderedWhitelist,
    });

    expect(result.ok).toBe(true);
  });
});
