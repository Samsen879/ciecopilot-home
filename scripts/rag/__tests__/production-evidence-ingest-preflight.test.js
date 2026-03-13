import fs from 'node:fs';
import path from 'node:path';
import { buildProductionEvidenceIngestPreflight } from '../lib/production-evidence-ingest-preflight.js';

function readJson(rootDir, relPath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relPath), 'utf8'));
}

describe('production evidence ingest preflight', () => {
  const rootDir = process.cwd();
  const manifestPath = 'data/evidence/production/seed_v1/manifest.json';

  function loadBaseInputs() {
    return {
      manifest: readJson(rootDir, manifestPath),
      items: readJson(rootDir, 'data/evidence/production/seed_v1/items.json'),
      whitelist: readJson(rootDir, 'data/evidence/production/whitelist_v1.json'),
    };
  }

  test('blocks the current governance seed from ingest', () => {
    const { manifest, items, whitelist } = loadBaseInputs();
    const result = buildProductionEvidenceIngestPreflight({
      rootDir,
      manifest,
      items,
      manifestPath,
      whitelist,
    });

    expect(result.status).toBe('blocked');
    expect(result.ingest_permitted).toBe(false);
    expect(result.blocked_reasons).toEqual(
      expect.arrayContaining(['ingest_not_allowed', 'release_not_ready']),
    );
  });

  test('blocks a non-whitelisted manifest', () => {
    const { manifest, items, whitelist } = loadBaseInputs();
    whitelist.allowed_bundle_ids = ['phase_b_seed_other'];
    whitelist.entries[0].bundle_id = 'phase_b_seed_other';

    const result = buildProductionEvidenceIngestPreflight({
      rootDir,
      manifest,
      items,
      manifestPath,
      whitelist,
    });

    expect(result.status).toBe('blocked');
    expect(result.blocked_reasons).toContain('bundle_not_whitelisted');
  });

  test('blocks a whitelist-matched bundle when release gate says not ready', () => {
    const { manifest, items, whitelist } = loadBaseInputs();
    whitelist.entries[0].ingest_allowed = true;

    const result = buildProductionEvidenceIngestPreflight({
      rootDir,
      manifest,
      items,
      manifestPath,
      whitelist,
    });

    expect(result.status).toBe('blocked');
    expect(result.blocked_reasons).toContain('release_not_ready');
  });
});
