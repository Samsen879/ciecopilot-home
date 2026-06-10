import {
  NORMALIZED_TEXT_SOURCE,
  build9702FullProductionReadyAggregate,
} from '../run_9702_full_production_ready_aggregate_gate.js';

function readyRow(overrides = {}) {
  return {
    storage_key: '9702/m17_qp_12/questions/q01.png',
    q_number: 1,
    shard_id: '9702_p1_m_historical_001',
    source_pdf: 'data/past-papers/9702Physics/paper1/9702_m17_qp_12.pdf',
    paper: 1,
    normalized_plain_text: 'Which expression has the same SI base units as pressure?',
    question_plain_text_source: NORMALIZED_TEXT_SOURCE,
    text_consumption_status: 'text_only_ready',
    production_ready_claimed: true,
    db_consumption_claimed: true,
    search_consumption_claimed: true,
    read_model_consumption_claimed: true,
    rag_consumption_claimed: true,
    local_search_text_source: NORMALIZED_TEXT_SOURCE,
    local_read_model_prompt_source: NORMALIZED_TEXT_SOURCE,
    local_rag_content_source: NORMALIZED_TEXT_SOURCE,
    production_wave: '9702_p1_m_historical_001',
    ...overrides,
  };
}

function productionManifest({ rows, wave = 'p1_m_historical_001' }) {
  return {
    artifact_path: `data/manifests/9702_${wave}_production_surface_2026_06_10_manifest_v1.json`,
    manifest_id: `9702_${wave}_production_surface_2026_06_10_manifest_v1`,
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

function fullRowSurfaceManifest({ rows, shards, sourcePdfs }) {
  return {
    manifest_id: '9702_full_row_surface_2026_06_09_manifest_v1',
    item_count: rows,
    shard_count: shards,
    source_pdf_count: sourcePdfs,
    accepted_source_pdf_count: sourcePdfs,
    shards: [
      {
        shard_id: '9702_p1_m_historical_001',
        page_chain_surface_manifest_path: 'data/manifests/9702_p1_m_historical_001_page_chain_surface_v1.json',
        accepted_rows: 2,
        source_pdf_count: 1,
      },
      {
        shard_id: '9702_p2_s_promoted_public_001',
        page_chain_surface_manifest_path: 'data/manifests/9702_p2_s_promoted_public_001_page_chain_surface_v1.json',
        accepted_rows: 1,
        source_pdf_count: 1,
      },
    ],
    items: [
      readyRow({ production_ready_claimed: false, db_consumption_claimed: false }),
      readyRow({
        storage_key: '9702/m17_qp_12/questions/q02.png',
        q_number: 2,
        production_ready_claimed: false,
        db_consumption_claimed: false,
      }),
      readyRow({
        storage_key: '9702/s25_qp_22/questions/q01.png',
        q_number: 1,
        shard_id: '9702_p2_s_promoted_public_001',
        source_pdf: 'data/past-papers/9702Physics/paper2/9702_s25_qp_22.pdf',
        paper: 2,
        text_consumption_status: 'image_context_required',
        production_ready_claimed: false,
        db_consumption_claimed: false,
      }),
    ],
  };
}

function pageChainSurfaces(rows) {
  return [
    {
      artifact_path: 'data/manifests/9702_p1_m_historical_001_page_chain_surface_v1.json',
      manifest_id: '9702_p1_m_historical_001_page_chain_surface_v1',
      surface_status: 'full_crop_render_complete_pending_visual_review',
      evidence_layers_gate: { status: 'pass' },
      item_count: 2,
      source_pdf_count: 1,
      items: rows.slice(0, 2).map((row) => ({
        ...row,
        source_inventory_record: {
          status: 'pass',
          render_sanity_status: 'pass',
          parser_page_count: 20,
        },
        text_evidence_status: 'question_plain_text_v2_ready',
        search_read_model_rag_local_consumption_gate_passed: true,
      })),
    },
    {
      artifact_path: 'data/manifests/9702_p2_s_promoted_public_001_page_chain_surface_v1.json',
      manifest_id: '9702_p2_s_promoted_public_001_page_chain_surface_v1',
      surface_status: 'full_crop_render_complete_pending_visual_review',
      evidence_layers_gate: { status: 'pass' },
      item_count: 1,
      source_pdf_count: 1,
      items: rows.slice(2).map((row) => ({
        ...row,
        source_inventory_record: {
          status: 'pass',
          render_sanity_status: 'pass',
          parser_page_count: 18,
        },
        text_evidence_status: 'question_plain_text_v2_ready',
        search_read_model_rag_local_consumption_gate_passed: true,
      })),
    },
  ];
}

function sourceInventory(sourcePdfs) {
  return {
    schema_version: '9702_source_truth_inventory_v1',
    status: 'pass',
    summary: {
      tracked_source_pdf_count: sourcePdfs.length,
      represented_once_count: sourcePdfs.length,
      pdf_signature_pass_count: sourcePdfs.length,
      pdfjs_parse_success_count: sourcePdfs.length,
      render_sanity_pass_count: sourcePdfs.length,
      first_page_identity_pass_count: sourcePdfs.length,
      blocker_count: 0,
    },
    records: sourcePdfs.map((sourcePath) => ({
      source_path: sourcePath,
      repo_path: sourcePath,
      status: 'pass',
      pdf_signature: {
        starts_with_pdf_signature: true,
        eof_marker_present: true,
      },
      parser: {
        parse_success: true,
        page_count: 20,
      },
      first_page_identity: {
        status: 'pass',
      },
      render_sanity: {
        status: 'pass',
      },
      blockers: [],
    })),
    blockers: [],
  };
}

function dbReadback(rows) {
  return {
    status: 'pass',
    metrics: {
      manifest_count: rows,
      question_bank_registry_rows: rows,
      present: rows,
      joined_snapshots: rows,
      db_question_bank_registry_coverage: rows,
      search_rows_using_normalized_plain_text: rows,
      search_text_matches_normalized_plain_text: rows,
      projection_normalized_plain_text_matches: rows,
      read_model_rows_using_normalized_plain_text: rows,
      read_model_normalized_text_matches: rows,
      registry_normalized_plain_text_matches: rows,
      prompt_representation_matches_normalized_plain_text: rows,
      provenance_normalized_plain_text_matches: rows,
      rag_chunks_present: rows,
      rag_rows_using_normalized_plain_text: rows,
      rag_content_matches_normalized_plain_text: rows,
      rag_chunks_with_fts: rows,
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

function productionBatchPlan({ rows, batches }) {
  return {
    schema_version: '9702_phase7_production_batch_plan_v1',
    status: 'ready',
    summary: {
      selected_rows: rows,
      source_selected_rows: rows,
      batches,
      blockers: 0,
    },
    batches: [
      {
        batch_id: 'p1_m_historical_001',
        shard_id: '9702_p1_m_historical_001',
        expected_rows: 2,
        ready_manifest: 'data/manifests/9702_p1_m_historical_001_production_surface_2026_06_10_manifest_v1.json',
      },
      {
        batch_id: 'p2_s_promoted_public_001',
        shard_id: '9702_p2_s_promoted_public_001',
        expected_rows: 1,
        ready_manifest: 'data/manifests/9702_p2_s_promoted_public_001_production_surface_2026_06_10_manifest_v1.json',
      },
    ],
    blockers: [],
  };
}

function passingFixture() {
  const rows = [
    readyRow(),
    readyRow({
      storage_key: '9702/m17_qp_12/questions/q02.png',
      q_number: 2,
    }),
    readyRow({
      storage_key: '9702/s25_qp_22/questions/q01.png',
      q_number: 1,
      shard_id: '9702_p2_s_promoted_public_001',
      source_pdf: 'data/past-papers/9702Physics/paper2/9702_s25_qp_22.pdf',
      paper: 2,
      text_consumption_status: 'image_context_required',
      production_wave: '9702_p2_s_promoted_public_001',
    }),
  ];
  const sourcePdfs = [...new Set(rows.map((row) => row.source_pdf))];
  return {
    rows,
    sourcePdfs,
    aggregateArgs: {
      generatedOn: '2026-06-10',
      expected: {
        rows: 3,
        shards: 2,
        sourcePdfs: 2,
        productionBatches: 2,
      },
      productionManifests: [
        productionManifest({ rows: rows.slice(0, 2) }),
        productionManifest({ rows: rows.slice(2), wave: 'p2_s_promoted_public_001' }),
      ],
      fullRowSurfaceManifest: fullRowSurfaceManifest({ rows: 3, shards: 2, sourcePdfs: 2 }),
      pageChainSurfaces: pageChainSurfaces(rows),
      sourceInventory: sourceInventory(sourcePdfs),
      productionBatchPlan: productionBatchPlan({ rows: 3, batches: 2 }),
      dbReadback: dbReadback(3),
      sourceFileExists: () => true,
    },
  };
}

describe('9702 full production-ready aggregate gate', () => {
  test('passes only when source, surface, production, and DB/readback coverage are complete', () => {
    const { aggregateArgs } = passingFixture();

    const aggregate = build9702FullProductionReadyAggregate(aggregateArgs);

    expect(aggregate).toMatchObject({
      status: 'pass',
      production_ready_claimed: true,
      scope: {
        subject_code: '9702',
        rows: 3,
        expected_rows: 3,
        shards: 2,
        expected_shards: 2,
        source_pdfs: 2,
        expected_source_pdfs: 2,
        production_batches: 2,
        expected_production_batches: 2,
      },
      summary: {
        text_only_ready_rows: 2,
        image_context_required_rows: 1,
        duplicate_storage_key_q_number_rows: 0,
        production_search_coverage: 3,
        production_read_model_coverage: 3,
        production_rag_chunk_coverage: 3,
        blockers: 0,
      },
    });
    expect(aggregate.acceptance.production_search_coverage.source).toBe(NORMALIZED_TEXT_SOURCE);
    expect(aggregate.blockers).toEqual([]);
    expect(aggregate.boundaries).toContain(
      'This is row-level question-text production readiness, not a claim of perfect semantic retrieval quality, mark-scheme scoring quality, or complete detailed physics syllabus taxonomy.',
    );
  });

  test('blocks when production rows do not match accepted row-surface identities', () => {
    const { aggregateArgs } = passingFixture();
    aggregateArgs.productionManifests[1].rows[0] = {
      ...aggregateArgs.productionManifests[1].rows[0],
      storage_key: '9702/s25_qp_22/questions/q99.png',
      q_number: 99,
    };

    const aggregate = build9702FullProductionReadyAggregate(aggregateArgs);

    expect(aggregate.status).toBe('blocked');
    expect(aggregate.production_ready_claimed).toBe(false);
    expect(aggregate.summary.production_rows_missing_from_surface_rows).toBe(1);
    expect(aggregate.summary.production_rows_extra_beyond_surface_rows).toBe(1);
    expect(aggregate.blockers).toContainEqual(expect.objectContaining({
      check: 'production_rows_missing_from_surface_rows',
      expected: 0,
      actual: 1,
    }));
  });

  test('blocks when source inventory parse/render posture is incomplete', () => {
    const { aggregateArgs, sourcePdfs } = passingFixture();
    aggregateArgs.sourceInventory = sourceInventory(sourcePdfs).records.reduce((inventory, record, index) => {
      inventory.records.push(index === 0
        ? {
            ...record,
            parser: { ...record.parser, parse_success: false },
            render_sanity: { ...record.render_sanity, status: 'blocked' },
            status: 'blocked',
          }
        : record);
      return inventory;
    }, {
      ...sourceInventory([]),
      records: [],
      summary: {
        ...sourceInventory([]).summary,
        tracked_source_pdf_count: sourcePdfs.length,
        represented_once_count: sourcePdfs.length,
        pdf_signature_pass_count: sourcePdfs.length,
        pdfjs_parse_success_count: sourcePdfs.length - 1,
        render_sanity_pass_count: sourcePdfs.length - 1,
        first_page_identity_pass_count: sourcePdfs.length,
        blocker_count: 1,
      },
      blockers: [{ check: 'source_parse' }],
    });

    const aggregate = build9702FullProductionReadyAggregate(aggregateArgs);

    expect(aggregate.status).toBe('blocked');
    expect(aggregate.blockers).toContainEqual(expect.objectContaining({
      check: 'source_inventory_blocker_count',
      expected: 0,
      actual: 1,
    }));
    expect(aggregate.blockers).toContainEqual(expect.objectContaining({
      check: 'source_inventory_records_not_parse_render_pass',
      expected: 0,
      actual: 1,
    }));
  });

  test('blocks when a production consumer is not sourced from normalized_plain_text', () => {
    const { aggregateArgs } = passingFixture();
    aggregateArgs.dbReadback.metrics.search_rows_using_normalized_plain_text = 2;
    aggregateArgs.dbReadback.metrics.search_text_source_not_normalized = 1;

    const aggregate = build9702FullProductionReadyAggregate(aggregateArgs);

    expect(aggregate.status).toBe('blocked');
    expect(aggregate.production_ready_claimed).toBe(false);
    expect(aggregate.blockers).toContainEqual(expect.objectContaining({
      check: 'production_search_coverage',
      expected: 3,
      actual: 2,
    }));
    expect(aggregate.blockers).toContainEqual(expect.objectContaining({
      check: 'db_search_text_source_not_normalized',
      expected: 0,
      actual: 1,
    }));
  });
});
