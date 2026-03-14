import fs from 'node:fs';
import path from 'node:path';
import { jest } from '@jest/globals';
import {
  buildProductionEvidenceCanonicalRows,
  createProductionEvidenceLiveContext,
  executeProductionEvidenceIngest,
} from '../lib/production-evidence-ingest.js';

function readJson(rootDir, relPath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relPath), 'utf8'));
}

function loadPilotBundle(rootDir) {
  const manifestPath = 'data/evidence/production/pilot_ready_v1/manifest.json';
  const manifest = readJson(rootDir, manifestPath);
  const items = readJson(rootDir, path.posix.join(path.posix.dirname(manifestPath), manifest.items_file));
  const whitelist = readJson(rootDir, 'data/evidence/production/whitelist_v1.json');
  return {
    manifest,
    items,
    whitelist,
    manifestPath,
  };
}

describe('production evidence ingest', () => {
  const rootDir = process.cwd();

  test('builds deterministic canonical rows and expands one row per topic path', () => {
    const { manifest, items } = loadPilotBundle(rootDir);

    const rows = buildProductionEvidenceCanonicalRows({
      manifest,
      items,
      corpusVersion: 'rag_production_evidence_pilot_20260313',
    });

    expect(rows).toHaveLength(6);
    expect(rows[0].corpus_version).toBe('rag_production_evidence_pilot_20260313');
    expect(rows[0].source_type).toMatch(/^evidence_/);
    expect(rows[0].source_ref.bundle_id).toBe(manifest.bundle_id);
    expect(rows[0].source_ref.evidence_id).toBeTruthy();
    expect(rows[0].source_ref.topic_path).toBeTruthy();
    expect(rows[0].source_ref.provenance_method).toBeTruthy();
  });

  test('fails closed when governance preflight is not fully green', async () => {
    const { manifest, items, whitelist, manifestPath } = loadPilotBundle(rootDir);
    const blockedWhitelist = structuredClone(whitelist);
    const entry = blockedWhitelist.entries.find((candidate) => candidate.bundle_id === manifest.bundle_id);
    entry.ingest_allowed = false;
    entry.release_ready_expected = false;
    entry.release_channel = 'offline_governance_only';

    const result = await executeProductionEvidenceIngest({
      rootDir,
      manifest,
      items,
      manifestPath,
      whitelist: blockedWhitelist,
      corpusVersion: 'rag_production_evidence_pilot_20260313',
      dryRun: true,
    });

    expect(result.status).toBe('blocked');
    expect(result.summary.ingest_permitted).toBe(false);
    expect(result.blocked_reasons).toEqual(expect.arrayContaining(['ingest_not_allowed', 'release_not_ready']));
  });

  test('supports dry-run without attempting DB writes', async () => {
    const { manifest, items, whitelist, manifestPath } = loadPilotBundle(rootDir);
    const writeCanonicalRow = jest.fn();

    const result = await executeProductionEvidenceIngest({
      rootDir,
      manifest,
      items,
      manifestPath,
      whitelist,
      corpusVersion: 'rag_production_evidence_pilot_20260313',
      dryRun: true,
      writeCanonicalRow,
    });

    expect(result.status).toBe('pass');
    expect(result.mode).toBe('dry_run');
    expect(result.row_counts.attempted).toBe(6);
    expect(result.row_counts.inserted).toBe(0);
    expect(writeCanonicalRow).not.toHaveBeenCalled();
  });

  test('resolves live context without requiring OPENAI_API_KEY when vector embedding env is present', () => {
    const context = createProductionEvidenceLiveContext({
      env: {
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
        VECTOR_EMBEDDING_API_KEY: 'vector-key',
        VECTOR_EMBEDDING_BASE_URL: 'https://embeddings.example.com/v1',
        VECTOR_EMBEDDING_MODEL: 'embedding-model',
      },
      getServiceClientFn() {
        return { kind: 'supabase-stub' };
      },
      fetchImpl: async () => ({
        ok: true,
        async json() {
          return {
            data: [{ embedding: [0.1, 0.2, 0.3] }],
          };
        },
      }),
    });

    expect(context.supabase).toEqual({ kind: 'supabase-stub' });
    expect(context.embedding.model).toBe('embedding-model');
    expect(context.embedding.apiKey).toBe('vector-key');
  });
});
