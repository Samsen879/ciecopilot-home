import {
  NORMALIZED_TEXT_SOURCE,
  build9231FullProductionReadyAggregate,
} from '../run_9231_full_production_ready_aggregate_gate.js';

function readyRow(overrides = {}) {
  return {
    storage_key: '9231/s16_qp_11/questions/q01.png',
    q_number: 1,
    shard_id: '9231_p1_s16_standard_001',
    source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/9231_s16_qp_11.pdf',
    normalized_plain_text: 'Find the transformed polynomial roots.',
    question_plain_text_source: NORMALIZED_TEXT_SOURCE,
    production_ready_claimed: true,
    db_consumption_claimed: true,
    search_consumption_claimed: true,
    read_model_consumption_claimed: true,
    rag_consumption_claimed: true,
    local_search_text_source: NORMALIZED_TEXT_SOURCE,
    local_read_model_prompt_source: NORMALIZED_TEXT_SOURCE,
    local_rag_content_source: NORMALIZED_TEXT_SOURCE,
    production_wave: '9231_wave1',
    ...overrides,
  };
}

function productionManifest({ rows, wave = 'wave1' }) {
  return {
    artifact_path: `data/manifests/9231_${wave}_production_surface_2026_06_07_manifest_v1.json`,
    status: 'ready',
    production_ready_claimed: true,
    wave,
    summary: {
      rows: rows.length,
      shards: new Set(rows.map((row) => row.shard_id)).size,
      source_pdfs: new Set(rows.map((row) => row.source_pdf)).size,
    },
    rows,
  };
}

function shardSplitManifest({ rows, shards, sourcePdfs }) {
  return {
    manifest_id: '9231_question_shard_split_2026_06_04_manifest_v1',
    summary: {
      question_row_count: rows,
      shard_count: shards,
      source_pdf_count: sourcePdfs,
      blocker_count: 0,
    },
    shards: [
      {
        shard_id: '9231_p1_s16_standard_001',
        page_chain_surface_manifest_path: 'data/manifests/9231_p1_s16_standard_001_page_chain_surface_v1.json',
        question_row_count: 2,
        source_pdf_count: 1,
      },
      {
        shard_id: '9231_p2_s16_standard_001',
        page_chain_surface_manifest_path: 'data/manifests/9231_p2_s16_standard_001_page_chain_surface_v1.json',
        question_row_count: 1,
        source_pdf_count: 1,
      },
    ],
  };
}

function dbReadback(rows) {
  return {
    status: 'pass',
    metrics: {
      manifest_count: rows,
      question_bank_registry_rows: rows,
      joined_snapshots: rows,
      db_question_bank_registry_coverage: rows,
      search_rows_using_normalized_plain_text: rows,
      search_text_matches_normalized_plain_text: rows,
      read_model_rows_using_normalized_plain_text: rows,
      prompt_representation_matches_normalized_plain_text: rows,
      read_model_normalized_plain_text_matches: rows,
      rag_chunks_present: rows,
      rag_rows_using_normalized_plain_text: rows,
      rag_content_matches_normalized_plain_text: rows,
      missing_registry: 0,
      prompt_missing: 0,
      provenance_missing: 0,
      normalized_plain_text_missing: 0,
      search_text_missing: 0,
      search_text_source_not_normalized: 0,
      snapshot_ref_missing: 0,
      snapshot_missing: 0,
      materialized_classifier_missing: 0,
      rag_chunk_missing: 0,
      duplicate_storage_key_q_number_rows: 0,
    },
  };
}

describe('9231 full production-ready aggregate gate', () => {
  test('passes only when every row, shard, source PDF, and production consumption path is covered', () => {
    const rows = [
      readyRow(),
      readyRow({
        storage_key: '9231/s16_qp_12/questions/q01.png',
        source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/9231_s16_qp_12.pdf',
      }),
      readyRow({
        storage_key: '9231/s16_qp_21/questions/q01.png',
        shard_id: '9231_p2_s16_standard_001',
        source_pdf: 'data/past-papers/9231Further-Mathematics/paper2/9231_s16_qp_21.pdf',
        production_wave: '9231_wave2',
      }),
    ];

    const aggregate = build9231FullProductionReadyAggregate({
      generatedOn: '2026-06-07',
      expected: {
        rows: 3,
        shards: 2,
        sourcePdfs: 3,
      },
      productionManifests: [
        productionManifest({ rows: rows.slice(0, 2), wave: 'wave1' }),
        productionManifest({ rows: rows.slice(2), wave: 'wave2' }),
      ],
      shardSplitManifest: shardSplitManifest({ rows: 3, shards: 2, sourcePdfs: 3 }),
      dbReadback: dbReadback(3),
    });

    expect(aggregate).toMatchObject({
      status: 'pass',
      production_ready_claimed: true,
      scope: {
        rows: 3,
        expected_rows: 3,
        shards: 2,
        expected_shards: 2,
        source_pdfs: 3,
        expected_source_pdfs: 3,
      },
      summary: {
        blockers: 0,
        duplicate_storage_key_q_number_rows: 0,
        production_search_coverage: 3,
        production_read_model_coverage: 3,
        production_rag_chunk_coverage: 3,
      },
    });
    expect(aggregate.blockers).toEqual([]);
    expect(aggregate.boundaries).toContain(
      'This is row-level question-text production readiness, not a claim of perfect semantic retrieval quality or detailed syllabus-topic canonicalization.',
    );
  });

  test('blocks when production rows duplicate storage_key and q_number identity', () => {
    const rows = [
      readyRow(),
      readyRow({ normalized_plain_text: 'Duplicate row with same identity.' }),
    ];

    const aggregate = build9231FullProductionReadyAggregate({
      generatedOn: '2026-06-07',
      expected: {
        rows: 2,
        shards: 1,
        sourcePdfs: 1,
      },
      productionManifests: [productionManifest({ rows })],
      shardSplitManifest: shardSplitManifest({ rows: 2, shards: 1, sourcePdfs: 1 }),
      dbReadback: dbReadback(2),
    });

    expect(aggregate.status).toBe('blocked');
    expect(aggregate.production_ready_claimed).toBe(false);
    expect(aggregate.summary.duplicate_storage_key_q_number_rows).toBe(1);
    expect(aggregate.blockers).toContainEqual(expect.objectContaining({
      check: 'duplicate_storage_key_q_number_rows',
      expected: 0,
      actual: 1,
    }));
  });

  test('blocks when a production path does not consume normalized_plain_text', () => {
    const rows = [readyRow()];
    const readback = dbReadback(1);
    readback.metrics.search_rows_using_normalized_plain_text = 0;
    readback.metrics.search_text_source_not_normalized = 1;

    const aggregate = build9231FullProductionReadyAggregate({
      generatedOn: '2026-06-07',
      expected: {
        rows: 1,
        shards: 1,
        sourcePdfs: 1,
      },
      productionManifests: [productionManifest({ rows })],
      shardSplitManifest: shardSplitManifest({ rows: 1, shards: 1, sourcePdfs: 1 }),
      dbReadback: readback,
    });

    expect(aggregate.status).toBe('blocked');
    expect(aggregate.production_ready_claimed).toBe(false);
    expect(aggregate.blockers).toContainEqual(expect.objectContaining({
      check: 'production_search_coverage',
      expected: 1,
      actual: 0,
    }));
  });
});
