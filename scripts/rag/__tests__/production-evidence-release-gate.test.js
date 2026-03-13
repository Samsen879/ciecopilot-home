import fs from 'node:fs';
import path from 'node:path';
import { buildProductionEvidenceReleaseGate } from '../lib/production-evidence-release-gate.js';

function readJson(rootDir, relPath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relPath), 'utf8'));
}

describe('production evidence release gate', () => {
  const rootDir = process.cwd();

  test('governance-valid seed bundle passes the gate but is not release-ready', () => {
    const manifest = readJson(rootDir, 'data/evidence/production/seed_v1/manifest.json');
    const items = readJson(rootDir, 'data/evidence/production/seed_v1/items.json');
    const whitelist = readJson(rootDir, 'data/evidence/production/whitelist_v1.json');

    const result = buildProductionEvidenceReleaseGate({
      rootDir,
      manifest,
      items,
      manifestPath: 'data/evidence/production/seed_v1/manifest.json',
      whitelist,
    });

    expect(result.status).toBe('pass');
    expect(result.release_ready).toBe(false);
    expect(result.blocked_reasons).toEqual(
      expect.arrayContaining(['release_channel_offline_governance_only', 'release_ready_expected_false']),
    );
  });

  test('fails when the whitelist does not match the bundle', () => {
    const manifest = readJson(rootDir, 'data/evidence/production/seed_v1/manifest.json');
    const items = readJson(rootDir, 'data/evidence/production/seed_v1/items.json');
    const whitelist = readJson(rootDir, 'data/evidence/production/whitelist_v1.json');
    whitelist.allowed_bundle_ids = ['phase_b_seed_other'];

    const result = buildProductionEvidenceReleaseGate({
      rootDir,
      manifest,
      items,
      manifestPath: 'data/evidence/production/seed_v1/manifest.json',
      whitelist,
    });

    expect(result.status).toBe('fail');
    expect(result.blocked_reasons).toContain('bundle_not_whitelisted');
  });

  test('fails when the manifest is invalid', () => {
    const manifest = readJson(rootDir, 'data/evidence/production/seed_v1/manifest.json');
    const items = readJson(rootDir, 'data/evidence/production/seed_v1/items.json');
    const whitelist = readJson(rootDir, 'data/evidence/production/whitelist_v1.json');

    manifest.allowed_source_types = ['evidence_reserved'];

    const result = buildProductionEvidenceReleaseGate({
      rootDir,
      manifest,
      items,
      manifestPath: 'data/evidence/production/seed_v1/manifest.json',
      whitelist,
    });

    expect(result.status).toBe('fail');
    expect(result.blocked_reasons).toContain('manifest_invalid');
  });
});
