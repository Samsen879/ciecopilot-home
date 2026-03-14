import fs from 'node:fs';
import path from 'node:path';
import { validateProductionEvidenceManifest } from '../lib/production-evidence-manifest.js';
import { validateProductionEvidenceWhitelist } from '../lib/production-evidence-whitelist.js';
import { buildProductionEvidenceReleaseGate } from '../lib/production-evidence-release-gate.js';
import { buildProductionEvidenceGovernancePreflight } from '../lib/production-evidence-governance-preflight.js';

function readJson(rootDir, relPath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relPath), 'utf8'));
}

describe('production evidence ready-for-ingest pilot contract', () => {
  const rootDir = process.cwd();
  const whitelistPath = 'data/evidence/production/whitelist_v1.json';
  const seedManifestPath = 'data/evidence/production/seed_v1/manifest.json';
  const pilotManifestPath = 'data/evidence/production/pilot_ready_v1/manifest.json';

  test('keeps the governance seed blocked while allowing the ready pilot to become ingestable', () => {
    const whitelist = readJson(rootDir, whitelistPath);

    const seedManifest = readJson(rootDir, seedManifestPath);
    const seedItems = readJson(rootDir, path.posix.join(path.posix.dirname(seedManifestPath), seedManifest.items_file));
    const seedResult = buildProductionEvidenceGovernancePreflight({
      rootDir,
      manifest: seedManifest,
      items: seedItems,
      manifestPath: seedManifestPath,
      whitelist,
    });

    expect(seedResult.status).toBe('pass');
    expect(seedResult.summary.release_ready).toBe(false);
    expect(seedResult.summary.ingest_permitted).toBe(false);

    const pilotManifest = readJson(rootDir, pilotManifestPath);
    const pilotItems = readJson(rootDir, path.posix.join(path.posix.dirname(pilotManifestPath), pilotManifest.items_file));

    expect(validateProductionEvidenceManifest({ manifest: pilotManifest, items: pilotItems }).ok).toBe(true);

    const whitelistResult = validateProductionEvidenceWhitelist({
      whitelist,
      manifest: pilotManifest,
      manifestPath: pilotManifestPath,
    });
    expect(whitelistResult.ok).toBe(true);
    expect(whitelistResult.summary.release_channel).toBe('ready_for_ingest');
    expect(whitelistResult.summary.ingest_allowed).toBe(true);
    expect(whitelistResult.summary.release_ready_expected).toBe(true);

    const releaseGate = buildProductionEvidenceReleaseGate({
      rootDir,
      manifest: pilotManifest,
      items: pilotItems,
      manifestPath: pilotManifestPath,
      whitelist,
    });
    expect(releaseGate.status).toBe('pass');
    expect(releaseGate.release_ready).toBe(true);
    expect(releaseGate.blocked_reasons).toEqual([]);

    const preflight = buildProductionEvidenceGovernancePreflight({
      rootDir,
      manifest: pilotManifest,
      items: pilotItems,
      manifestPath: pilotManifestPath,
      whitelist,
    });
    expect(preflight.status).toBe('pass');
    expect(preflight.summary.governance_valid).toBe(true);
    expect(preflight.summary.release_ready).toBe(true);
    expect(preflight.summary.ingest_permitted).toBe(true);
    expect(preflight.blocked_reasons).toEqual([]);
  });
});
