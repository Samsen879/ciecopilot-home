import {
  REQUIRED_9702_PRODUCTION_DB_ZERO_FIELDS,
  build9702ProductionBatchConfig,
  build9702ProductionBatchPlan,
  build9702ProductionReadyAggregate,
  build9702ReadyRows,
} from '../run_9702_production_ready_gate.js';

const NORMALIZED_TEXT_SOURCE = 'question_plain_text_v2.normalized_plain_text';

function baseV2Row(overrides = {}) {
  return {
    storage_key: '9702/s25_qp_11/questions/q01.png',
    subject_code: '9702',
    year: 2025,
    session: 's',
    paper: 1,
    variant: 1,
    q_number: 1,
    source_pdf: 'data/past-papers/9702Physics/paper1/9702_s25_qp_11.pdf',
    source_version: '9702_phase5_visual_accepted_surface_v1',
    primary_topic_path: '9702.p1',
    source_v1_text_layer: 'docs/reports/2026-06-10-9702-question-plain-text-v1.json',
    source_surface_manifest: 'data/manifests/9702_p1_s_promoted_public_001_page_chain_surface_v1.json',
    normalized_plain_text: '1 Which quantity is a vector?\nA pressure\nB temperature\nC weight\nD work',
    text_source: 'pdfjs_page_chain_text_layer',
    text_only_addressable: true,
    requires_image_context: false,
    has_diagram: false,
    table_heavy: false,
    formula_dense: false,
    math_expression_count: 0,
    image_assets: [
      'data/crops/9702-full-scaleout/question-crops/9702_s25_qp_11/q01/q01_page_003.png',
    ],
    rendered_pdf_page_paths: [
      'data/crops/9702-full-scaleout/renders/9702_s25_qp_11/9702_s25_qp_11_page_003.png',
    ],
    provenance: {
      v1_provenance: {
        visual_review_status: 'accepted',
        visual_review_evidence_path: 'docs/reports/2026-06-09-9702-visual-review-gate.json',
        locator_method: 'fitz_text_words_left_margin_9702_full_scaleout_v1',
      },
    },
    ...overrides,
  };
}

function baseAuthorityRow(overrides = {}) {
  return {
    storage_key: '9702/s25_qp_11/questions/q01.png',
    primary_topic_path: '9702.p1',
    authority_alignment_status: 'component_aligned_topic_hint_recorded',
    canonical_syllabus_detailed_topic_claimed: false,
    component_authority: {
      status: 'component_aligned_from_paper_code',
      component_id: '11',
      component_path: '9702.p1.c11',
    },
    topic_authority: {
      status: 'deterministic_topic_hint_assigned',
      topic_path: '9702.p1',
    },
    ...overrides,
  };
}

function baseConsumptionRow(overrides = {}) {
  const normalized = '1 Which quantity is a vector?\nA pressure\nB temperature\nC weight\nD work';
  return {
    storage_key: '9702/s25_qp_11/questions/q01.png',
    normalized_plain_text: normalized,
    question_plain_text_source: NORMALIZED_TEXT_SOURCE,
    text_consumption_status: 'text_only_ready',
    search: {
      search_text: normalized,
      search_text_source: NORMALIZED_TEXT_SOURCE,
    },
    read_model: {
      prompt_representation: {
        type: 'text',
        value: normalized,
      },
    },
    rag: {
      content: normalized,
      content_source: NORMALIZED_TEXT_SOURCE,
    },
    ...overrides,
  };
}

function baseGateRows({ rows = 1 } = {}) {
  return {
    dbCoverage: {
      status: 'pass',
      metrics: {
        manifest_count: rows,
        present: rows,
        joined_snapshots: rows,
        missing_registry: 0,
        prompt_missing: 0,
        provenance_missing: 0,
        normalized_plain_text_missing: 0,
        search_text_missing: 0,
        search_text_source_not_normalized: 0,
        snapshot_ref_missing: 0,
        snapshot_missing: 0,
        materialized_classifier_missing: 0,
        duplicate_storage_key_q_number_rows: 0,
        rag_chunk_missing: 0,
      },
    },
    searchGate: {
      status: 'pass',
      metrics: {
        rows,
        search_rows_using_normalized_plain_text: rows,
        search_text_matches_normalized_plain_text: rows,
      },
    },
    readModelGate: {
      status: 'pass',
      metrics: {
        rows,
        read_model_rows_using_normalized_plain_text: rows,
        read_model_normalized_text_matches: rows,
        prompt_representation_matches_normalized_plain_text: rows,
      },
    },
    ragGate: {
      status: 'pass',
      metrics: {
        rows,
        rag_chunks_present: rows,
        rag_rows_using_normalized_plain_text: rows,
        rag_content_matches_normalized_plain_text: rows,
        rag_chunks_with_fts: rows,
      },
    },
  };
}

function evidenceGate() {
  return {
    generated_on: '2026-06-10',
    summary: {
      selected_rows: 3,
      blockers: 0,
    },
    artifacts: {
      visual_gate_json: 'docs/reports/2026-06-09-9702-visual-review-gate.json',
      plain_text_v1_json: 'docs/reports/2026-06-10-9702-question-plain-text-v1.json',
      plain_text_v2_json: 'docs/reports/2026-06-10-9702-question-plain-text-v2.json',
      authority_json: 'docs/reports/2026-06-10-9702-authority-alignment.json',
      consumption_json: 'docs/reports/2026-06-10-9702-question-plain-text-v2-consumption.json',
      json: 'docs/reports/2026-06-10-9702-evidence-layers-gate.json',
    },
    shards: [
      {
        shard_id: '9702_p1_s_promoted_public_001',
        summary: {
          rows: 2,
          text_only_ready_rows: 1,
          image_context_required_rows: 1,
          blockers: 0,
        },
        rows: [
          {
            storage_key: '9702/s25_qp_11/questions/q01.png',
            q_number: 1,
            source_manifest: 'data/manifests/9702_p1_s_promoted_public_001_page_chain_surface_v1.json',
            normalized_plain_text: '1 Which quantity is a vector?\nA pressure\nB temperature\nC weight\nD work',
          },
          {
            storage_key: '9702/s25_qp_11/questions/q02.png',
            q_number: 2,
            source_manifest: 'data/manifests/9702_p1_s_promoted_public_001_page_chain_surface_v1.json',
            normalized_plain_text: '2 A second accepted row.',
          },
        ],
      },
      {
        shard_id: '9702_p2_w_promoted_public_001',
        summary: {
          rows: 1,
          text_only_ready_rows: 1,
          image_context_required_rows: 0,
          blockers: 0,
        },
        rows: [
          {
            storage_key: '9702/w25_qp_21/questions/q01.png',
            q_number: 1,
            source_manifest: 'data/manifests/9702_p2_w_promoted_public_001_page_chain_surface_v1.json',
            normalized_plain_text: '1 A deterministic paper two row.',
          },
        ],
      },
    ],
  };
}

describe('9702 production-ready gate', () => {
  test('builds deterministic Phase 7 production batches from the Phase 6 shard inventory', () => {
    const plan = build9702ProductionBatchPlan({
      evidenceGate: evidenceGate(),
      generatedOn: '2026-06-10',
    });

    expect(plan.status).toBe('ready');
    expect(plan.production_ready_claimed).toBe(false);
    expect(plan.summary).toMatchObject({
      selected_rows: 3,
      batches: 2,
      blockers: 0,
    });
    expect(plan.batches.map((batch) => batch.batch_id)).toEqual([
      'p1_s_promoted_public_001',
      'p2_w_promoted_public_001',
    ]);
    expect(plan.batches[0]).toMatchObject({
      shard_id: '9702_p1_s_promoted_public_001',
      expected_rows: 2,
      ready_manifest: 'data/manifests/9702_p1_s_promoted_public_001_production_surface_2026_06_10_manifest_v1.json',
    });
  });

  test('constructs ready rows with normalized text provenance and exact batch scope', () => {
    const batchConfig = build9702ProductionBatchConfig('p1_s_promoted_public_001', {
      generatedOn: '2026-06-10',
      evidenceGate: evidenceGate(),
    });
    const readyRows = build9702ReadyRows({
      batchConfig,
      v2Artifacts: [{ artifact_path: batchConfig.artifacts.plain_text_v2_json, items: [baseV2Row()] }],
      authorityArtifacts: [{ artifact_path: batchConfig.artifacts.authority_json, items: [baseAuthorityRow()] }],
      consumptionArtifacts: [{ artifact_path: batchConfig.artifacts.consumption_json, items: [baseConsumptionRow()] }],
    });

    expect(readyRows).toHaveLength(1);
    expect(readyRows[0]).toMatchObject({
      subject_code: '9702',
      shard_id: '9702_p1_s_promoted_public_001',
      batch_id: 'p1_s_promoted_public_001',
      question_plain_text_source: NORMALIZED_TEXT_SOURCE,
      normalized_plain_text: '1 Which quantity is a vector?\nA pressure\nB temperature\nC weight\nD work',
      production_ready_claimed: true,
      db_consumption_claimed: true,
      search_consumption_claimed: true,
      read_model_consumption_claimed: true,
      rag_consumption_claimed: true,
    });
    expect(readyRows[0].provenance_artifacts).toMatchObject({
      source_surface_manifest: 'data/manifests/9702_p1_s_promoted_public_001_page_chain_surface_v1.json',
      visual_review: 'docs/reports/2026-06-09-9702-visual-review-gate.json',
      question_plain_text_v2: 'docs/reports/2026-06-10-9702-question-plain-text-v2.json',
      authority_alignment: 'docs/reports/2026-06-10-9702-authority-alignment.json',
      local_consumption: 'docs/reports/2026-06-10-9702-question-plain-text-v2-consumption.json',
    });
  });

  test('passes only when every #409 production DB/search/read-model/RAG metric covers selected rows', () => {
    const batchConfig = build9702ProductionBatchConfig('p1_s_promoted_public_001', {
      generatedOn: '2026-06-10',
      evidenceGate: evidenceGate(),
    });
    const readyRows = [baseV2Row()];
    const aggregate = build9702ProductionReadyAggregate({
      batchConfig: {
        ...batchConfig,
        expectedRows: readyRows.length,
      },
      generatedOn: '2026-06-10',
      readyRows,
      readyManifestPath: batchConfig.readyManifest,
      ...baseGateRows({ rows: readyRows.length }),
    });

    expect(REQUIRED_9702_PRODUCTION_DB_ZERO_FIELDS).toEqual([
      'missing_registry',
      'prompt_missing',
      'provenance_missing',
      'normalized_plain_text_missing',
      'search_text_missing',
      'search_text_source_not_normalized',
      'snapshot_ref_missing',
      'snapshot_missing',
      'materialized_classifier_missing',
      'duplicate_storage_key_q_number_rows',
      'rag_chunk_missing',
    ]);
    expect(aggregate.status).toBe('pass');
    expect(aggregate.production_ready_claimed).toBe(true);
    expect(aggregate.summary.gate_counts).toEqual({
      db_coverage: 1,
      production_search: 1,
      production_read_model: 1,
      production_rag: 1,
    });
    expect(aggregate.boundaries).toEqual(expect.arrayContaining([
      expect.stringContaining('does not claim full all-9702 production readiness'),
      expect.stringContaining('#410'),
    ]));
  });

  test('blocks production-ready claim when read-model normalized text or RAG FTS coverage is incomplete', () => {
    const batchConfig = build9702ProductionBatchConfig('p1_s_promoted_public_001', {
      generatedOn: '2026-06-10',
      evidenceGate: evidenceGate(),
    });
    const gates = baseGateRows({ rows: 1 });
    gates.readModelGate.metrics.read_model_normalized_text_matches = 0;
    gates.ragGate.metrics.rag_chunks_with_fts = 0;

    const aggregate = build9702ProductionReadyAggregate({
      batchConfig: {
        ...batchConfig,
        expectedRows: 1,
      },
      generatedOn: '2026-06-10',
      readyRows: [baseV2Row()],
      readyManifestPath: batchConfig.readyManifest,
      ...gates,
    });

    expect(aggregate.status).toBe('blocked');
    expect(aggregate.production_ready_claimed).toBe(false);
    expect(aggregate.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ check: 'production_read_model_gate' }),
      expect.objectContaining({ check: 'production_rag_gate' }),
    ]));
  });
});
