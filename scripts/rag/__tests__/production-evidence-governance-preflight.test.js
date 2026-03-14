import { buildManifest, buildItems, buildWhitelist } from './helpers/production-evidence-fixtures.js';
import { buildProductionEvidenceGovernancePreflight } from '../lib/production-evidence-governance-preflight.js';

describe('production evidence governance preflight', () => {
  test('runs the full lower chain and blocks the current governance seed', () => {
    const result = buildProductionEvidenceGovernancePreflight({
      manifest: buildManifest(),
      items: buildItems(),
      manifestPath: 'data/evidence/production/seed_v1/manifest.json',
      whitelist: buildWhitelist(),
    });

    expect(result.status).toBe('pass');
    expect(result.summary.governance_valid).toBe(true);
    expect(result.summary.release_ready).toBe(false);
    expect(result.summary.ingest_permitted).toBe(false);
    expect(result.blocked_reasons).toEqual(
      expect.arrayContaining(['ingest_not_allowed', 'release_not_ready']),
    );
  });

  test('fails when whitelist validation fails', () => {
    const result = buildProductionEvidenceGovernancePreflight({
      manifest: buildManifest(),
      items: buildItems(),
      manifestPath: 'data/evidence/production/seed_v1/manifest.json',
      whitelist: buildWhitelist({ entries: [] }),
    });

    expect(result.status).toBe('fail');
    expect(result.summary.governance_valid).toBe(false);
    expect(result.blocked_reasons).toContain('bundle_not_whitelisted');
  });

  test('fails when manifest validation fails', () => {
    const result = buildProductionEvidenceGovernancePreflight({
      manifest: buildManifest({ allowed_source_types: ['evidence_reserved'] }),
      items: buildItems(),
      manifestPath: 'data/evidence/production/seed_v1/manifest.json',
      whitelist: buildWhitelist(),
    });

    expect(result.status).toBe('fail');
    expect(result.summary.governance_valid).toBe(false);
    expect(result.blocked_reasons).toContain('manifest_invalid');
  });
});
