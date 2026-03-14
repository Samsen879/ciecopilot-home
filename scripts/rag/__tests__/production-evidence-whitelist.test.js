import fs from 'node:fs';
import path from 'node:path';
import { validateProductionEvidenceWhitelist } from '../lib/production-evidence-whitelist.js';

function readJson(rootDir, relPath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relPath), 'utf8'));
}

describe('production evidence whitelist', () => {
  const rootDir = process.cwd();
  const manifestPath = 'data/evidence/production/seed_v1/manifest.json';

  test('accepts a valid whitelist entry matching the seed bundle', () => {
    const manifest = readJson(rootDir, manifestPath);
    const whitelist = readJson(rootDir, 'data/evidence/production/whitelist_v1.json');

    const result = validateProductionEvidenceWhitelist({
      whitelist,
      manifest,
      manifestPath,
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.summary.bundle_id).toBe('phase_b_seed_v1');
    expect(result.summary.release_channel).toBe('offline_governance_only');
    expect(result.summary.ingest_allowed).toBe(false);
    expect(result.summary.release_ready_expected).toBe(false);
  });

  test('rejects missing or mismatched bundle identity', () => {
    const manifest = readJson(rootDir, manifestPath);
    const whitelist = readJson(rootDir, 'data/evidence/production/whitelist_v1.json');
    whitelist.entries[0].bundle_id = 'phase_b_seed_v2';
    whitelist.entries[0].manifest_path = 'data/evidence/production/seed_v2/manifest.json';

    const result = validateProductionEvidenceWhitelist({
      whitelist,
      manifest,
      manifestPath,
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('bundle_id');
    expect(result.errors.join('\n')).toContain('manifest_path');
  });

  test('rejects enabling ingest for the governance seed', () => {
    const manifest = readJson(rootDir, manifestPath);
    const whitelist = readJson(rootDir, 'data/evidence/production/whitelist_v1.json');
    whitelist.entries[0].ingest_allowed = true;

    const result = validateProductionEvidenceWhitelist({
      whitelist,
      manifest,
      manifestPath,
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('ingest_allowed');
    expect(result.errors.join('\n')).toContain('governance seed');
  });

  test('rejects expanding allowed source types beyond the manifest contract', () => {
    const manifest = readJson(rootDir, manifestPath);
    const whitelist = readJson(rootDir, 'data/evidence/production/whitelist_v1.json');
    whitelist.allowed_source_types = ['evidence_authored', 'evidence_transformed', 'evidence_reserved'];
    whitelist.entries[0].allowed_source_types = ['evidence_authored', 'evidence_transformed', 'evidence_reserved'];

    const result = validateProductionEvidenceWhitelist({
      whitelist,
      manifest,
      manifestPath,
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('allowed_source_types');
    expect(result.errors.join('\n')).toContain('evidence_reserved');
  });
});
