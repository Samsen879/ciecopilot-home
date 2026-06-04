import {
  REQUIRED_NEW_PAPER_V2_DB_ZERO_FIELDS,
  buildNewPaperV2Aggregate,
} from '../run_9709_new_paper_v2_production_ready_aggregate_gate.js';

function buildShardRecord(overrides = {}) {
  return {
    shard_id: 'p1_m25_standard_001',
    rows: 2,
    pdfs: 1,
    paper: 1,
    session: 'm25',
    surface_manifest: 'data/manifests/9709_p1_m25_standard_001_page_chain_surface_v2.json',
    ready_manifest: {
      path: 'docs/reports/2026-06-04-9709-p1-m25-standard-001-ready-manifest-final.json',
      count: 2,
    },
    release_preflight: {
      path: 'docs/reports/2026-06-04-9709-p1-m25-standard-001-release-preflight-final.json',
      status: 'pass',
      blockers: 0,
      warnings: 2,
    },
    search_gate: {
      path: 'docs/reports/2026-06-04-9709-p1-m25-standard-001-search-gate.json',
      pass: true,
    },
    db_coverage: {
      path: 'docs/reports/2026-06-04-9709-p1-m25-standard-001-db-coverage.json',
      metrics: {
        present: 2,
        manifest_count: 2,
        joined_snapshots: 2,
        missing_registry: 0,
        prompt_missing: 0,
        provenance_missing: 0,
        search_text_missing: 0,
        snapshot_ref_missing: 0,
        snapshot_missing: 0,
        materialized_classifier_missing: 0,
      },
    },
    production_ready_report: {
      json: 'docs/reports/2026-06-04-9709-p1-m25-standard-001-production-ready.json',
      markdown: 'docs/reports/2026-06-04-9709-p1-m25-standard-001-production-ready.md',
    },
    ...overrides,
  };
}

describe('9709 corrected-v2 new-paper production-ready aggregate gate', () => {
  test('passes only when ready, release, search, and DB coverage all match shard row counts', () => {
    const aggregate = buildNewPaperV2Aggregate({
      generatedOn: '2026-06-04',
      shardRecords: [buildShardRecord()],
    });

    expect(aggregate.status).toBe('pass');
    expect(aggregate.verdict).toBe('production-ready');
    expect(aggregate.scope).toMatchObject({
      subject_code: '9709',
      corrected_v2_shards: 1,
      corrected_v2_rows: 2,
      corrected_v2_pdfs: 1,
    });
    expect(aggregate.summary.gate_counts).toEqual({
      ready_manifest: 1,
      release_preflight: 1,
      search_gate: 1,
      db_coverage: 1,
      production_ready_closeout: 1,
    });
    expect(aggregate.blockers).toEqual([]);
  });

  test('blocks when any required DB zero field is non-zero', () => {
    const record = buildShardRecord({
      db_coverage: {
        path: 'docs/reports/2026-06-04-9709-p1-m25-standard-001-db-coverage.json',
        metrics: {
          present: 2,
          manifest_count: 2,
          joined_snapshots: 2,
          missing_registry: 0,
          prompt_missing: 1,
          provenance_missing: 0,
          search_text_missing: 0,
          snapshot_ref_missing: 0,
          snapshot_missing: 0,
          materialized_classifier_missing: 0,
        },
      },
    });

    const aggregate = buildNewPaperV2Aggregate({
      generatedOn: '2026-06-04',
      shardRecords: [record],
    });

    expect(REQUIRED_NEW_PAPER_V2_DB_ZERO_FIELDS).toContain('prompt_missing');
    expect(aggregate.status).toBe('blocked');
    expect(aggregate.summary.gate_counts.db_coverage).toBe(0);
    expect(aggregate.blockers).toContainEqual(expect.objectContaining({
      shard_id: 'p1_m25_standard_001',
      check: 'db_zero_missing',
    }));
  });
});
