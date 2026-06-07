import {
  REQUIRED_9231_PRODUCTION_DB_ZERO_FIELDS,
  build9231ProductionBatchConfig,
  build9231ProductionReadyAggregate,
  build9231ReadyRows,
  build9231Wave4ProductionReadyAggregate,
  build9231Wave4ReadyRows,
} from '../run_9231_wave4_production_ready_gate.js';

function baseV2Row(overrides = {}) {
  return {
    storage_key: '9231/w23_qp_21/questions/q01.png',
    subject_code: '9231',
    year: 2023,
    session: 'w',
    paper: 2,
    variant: 1,
    q_number: 1,
    source_pdf: 'data/past-papers/9231Further-Mathematics/paper2/9231_w23_qp_21.pdf',
    source_surface_manifest: 'data/manifests/9231_p2_w23_standard_001_page_chain_surface_v1.json',
    normalized_plain_text: 'Show that the system of equations does not have a unique solution.',
    text_consumption_status: 'text_only_ready',
    text_only_addressable: true,
    requires_image_context: false,
    image_assets: [
      'data/crops/9231-crop-repair-wave4/9231_p2_w23_standard_001/question-crops/9231_w23_qp_21/q01/q01_page_003.png',
    ],
    rendered_pdf_page_paths: [
      'data/crops/9231-crop-repair-wave4/9231_p2_w23_standard_001/renders/9231_w23_qp_21/9231_w23_qp_21_page_003.png',
    ],
    ...overrides,
  };
}

function baseAuthorityRow(overrides = {}) {
  return {
    storage_key: '9231/w23_qp_21/questions/q01.png',
    primary_topic_path: '9231.p2',
    authority_alignment_status: 'component_aligned_topic_hint_recorded',
    canonical_syllabus_detailed_topic_claimed: false,
    component_authority: {
      component_path: '9231.p2',
      component_title: 'Further Pure Mathematics 2',
    },
    ...overrides,
  };
}

function baseConsumptionRow(overrides = {}) {
  return {
    storage_key: '9231/w23_qp_21/questions/q01.png',
    normalized_plain_text: 'Show that the system of equations does not have a unique solution.',
    search: {
      search_text: 'Show that the system of equations does not have a unique solution.',
      search_text_source: 'question_plain_text_v2.normalized_plain_text',
    },
    read_model: {
      prompt_representation: {
        type: 'text',
        value: 'Show that the system of equations does not have a unique solution.',
      },
    },
    rag: {
      content: 'Show that the system of equations does not have a unique solution.',
      content_source: 'question_plain_text_v2.normalized_plain_text',
    },
    ...overrides,
  };
}

function baseGateRows({ rows = 1 } = {}) {
  return {
    dbCoverage: {
      status: 'pass',
      metrics: {
        present: rows,
        manifest_count: rows,
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
        rag_chunk_missing: 0,
      },
    },
    searchGate: {
      status: 'pass',
      metrics: {
        rows: rows,
        search_rows_using_normalized_plain_text: rows,
        search_text_matches_normalized_plain_text: rows,
      },
    },
    readModelGate: {
      status: 'pass',
      metrics: {
        rows: rows,
        read_model_rows_using_normalized_plain_text: rows,
        prompt_representation_matches_normalized_plain_text: rows,
      },
    },
    ragGate: {
      status: 'pass',
      metrics: {
        rows: rows,
        rag_rows_using_normalized_plain_text: rows,
        rag_content_matches_normalized_plain_text: rows,
      },
    },
  };
}

describe('9231 wave4 production-ready gate', () => {
  test('configures the wave3 plus wave2 batch2 production-ready batch without wave4 hardcoding', () => {
    const batchConfig = build9231ProductionBatchConfig('wave3_wave2_batch2', {
      generatedOn: '2026-06-06',
    });
    const wave3Text = 'Find an expression for v in terms of t.';
    const wave2Text = 'Prove by mathematical induction that the expression is divisible by 15.';
    const readyRows = build9231ReadyRows({
      batchConfig,
      v2Artifacts: [
        {
          artifact_path: 'docs/reports/2026-06-05-9231-wave3-question-plain-text-v2.json',
          items: [
            baseV2Row({
              storage_key: '9231/s21_qp_31/questions/q01.png',
              source_pdf: 'data/past-papers/9231Further-Mathematics/paper3/9231_s21_qp_31.pdf',
              source_surface_manifest: 'data/manifests/9231_p3_s21_standard_001_page_chain_surface_v1.json',
              paper: 3,
              normalized_plain_text: wave3Text,
            }),
          ],
        },
        {
          artifact_path: 'docs/reports/2026-06-05-9231-wave2-batch2-question-plain-text-v2.json',
          items: [
            baseV2Row({
              storage_key: '9231/s21_qp_11/questions/q01.png',
              source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/9231_s21_qp_11.pdf',
              source_surface_manifest: 'data/manifests/9231_p1_s21_standard_001_page_chain_surface_v1.json',
              paper: 1,
              normalized_plain_text: wave2Text,
            }),
          ],
        },
      ],
      authorityArtifacts: [
        {
          items: [
            baseAuthorityRow({
              storage_key: '9231/s21_qp_31/questions/q01.png',
              primary_topic_path: '9231.p3',
            }),
          ],
        },
        {
          items: [
            baseAuthorityRow({
              storage_key: '9231/s21_qp_11/questions/q01.png',
              primary_topic_path: '9231.p1',
            }),
          ],
        },
      ],
      consumptionArtifacts: [
        {
          items: [
            baseConsumptionRow({
              storage_key: '9231/s21_qp_31/questions/q01.png',
              normalized_plain_text: wave3Text,
              search: {
                search_text: wave3Text,
                search_text_source: 'question_plain_text_v2.normalized_plain_text',
              },
              read_model: {
                prompt_representation: {
                  type: 'text',
                  value: wave3Text,
                },
              },
              rag: {
                content: wave3Text,
                content_source: 'question_plain_text_v2.normalized_plain_text',
              },
            }),
          ],
        },
        {
          items: [
            baseConsumptionRow({
              storage_key: '9231/s21_qp_11/questions/q01.png',
              normalized_plain_text: wave2Text,
              search: {
                search_text: wave2Text,
                search_text_source: 'question_plain_text_v2.normalized_plain_text',
              },
              read_model: {
                prompt_representation: {
                  type: 'text',
                  value: wave2Text,
                },
              },
              rag: {
                content: wave2Text,
                content_source: 'question_plain_text_v2.normalized_plain_text',
              },
            }),
          ],
        },
      ],
    });
    const aggregate = build9231ProductionReadyAggregate({
      batchConfig: {
        ...batchConfig,
        expectedRows: readyRows.length,
      },
      generatedOn: '2026-06-06',
      readyRows,
      readyManifestPath: batchConfig.readyManifest,
      ...baseGateRows({ rows: readyRows.length }),
    });

    expect(batchConfig).toMatchObject({
      batchId: 'wave3_wave2_batch2',
      expectedRows: 334,
      productionWave: '9231_wave3_wave2_batch2',
      readyManifest: 'data/manifests/9231_wave3_wave2_batch2_production_surface_2026_06_06_manifest_v1.json',
    });
    expect(batchConfig.v2Artifacts).toEqual([
      'docs/reports/2026-06-05-9231-wave3-question-plain-text-v2.json',
      'docs/reports/2026-06-05-9231-wave2-batch2-question-plain-text-v2.json',
    ]);
    expect(readyRows.map((row) => row.shard_id)).toEqual([
      '9231_p1_s21_standard_001',
      '9231_p3_s21_standard_001',
    ]);
    expect(new Set(readyRows.map((row) => row.production_wave))).toEqual(new Set(['9231_wave3_wave2_batch2']));
    expect(readyRows.map((row) => row.question_plain_text_artifact)).toEqual([
      'docs/reports/2026-06-05-9231-wave2-batch2-question-plain-text-v2.json',
      'docs/reports/2026-06-05-9231-wave3-question-plain-text-v2.json',
    ]);
    expect(aggregate).toMatchObject({
      status: 'pass',
      production_ready_claimed: true,
      scope: {
        wave: 'wave3_wave2_batch2',
        rows: 2,
        shards: 2,
      },
    });
    expect(aggregate.boundaries[0]).toContain('wave3 + wave2 batch2');
  });

  test('configures the next_wave_16 production-ready batch', () => {
    const batchConfig = build9231ProductionBatchConfig('next_wave_16', {
      generatedOn: '2026-06-06',
    });

    expect(batchConfig).toMatchObject({
      batchId: 'next_wave_16',
      expectedRows: 477,
      productionWave: '9231_next_wave_16',
      readyManifest: 'data/manifests/9231_next_wave_16_production_surface_2026_06_06_manifest_v1.json',
    });
    expect(batchConfig.v2Artifacts).toEqual([
      'docs/reports/2026-06-05-9231-next-wave-question-plain-text-v2.json',
    ]);
    expect(batchConfig.authorityArtifacts).toEqual([
      'docs/reports/2026-06-05-9231-next-wave-authority-alignment.json',
    ]);
    expect(batchConfig.consumptionArtifacts).toEqual([
      'docs/reports/2026-06-05-9231-next-wave-question-plain-text-v2-consumption.json',
    ]);
    expect(batchConfig.evidenceGateArtifacts).toEqual([
      'docs/reports/2026-06-05-9231-next-wave-evidence-layers-gate.json',
    ]);
  });

  test('configures the wave1 production-ready batch', () => {
    const batchConfig = build9231ProductionBatchConfig('wave1', {
      generatedOn: '2026-06-06',
    });

    expect(batchConfig).toMatchObject({
      batchId: 'wave1',
      expectedRows: 441,
      productionWave: '9231_wave1',
      readyManifest: 'data/manifests/9231_wave1_production_surface_2026_06_06_manifest_v1.json',
    });
    expect(batchConfig.v2Artifacts).toEqual([
      'docs/reports/2026-06-05-9231-question-plain-text-v2.json',
    ]);
    expect(batchConfig.authorityArtifacts).toEqual([
      'docs/reports/2026-06-05-9231-authority-alignment-wave1.json',
    ]);
    expect(batchConfig.consumptionArtifacts).toEqual([
      'docs/reports/2026-06-05-9231-question-plain-text-v2-consumption.json',
    ]);
    expect(batchConfig.evidenceGateArtifacts).toEqual([
      'docs/reports/2026-06-05-9231-evidence-layers-wave1-gate.json',
    ]);
  });

  test('configures the WM-final 150 production-ready batch with the final evidence artifacts', () => {
    const batchConfig = build9231ProductionBatchConfig('wm_final_150');

    expect(batchConfig).toMatchObject({
      batchId: 'wm_final_150',
      expectedRows: 150,
      productionWave: '9231_wm_final_150',
      readyManifest: 'data/manifests/9231_wm_final_150_production_surface_2026_06_07_manifest_v1.json',
    });
    expect(batchConfig.v2Artifacts).toEqual([
      'docs/reports/2026-06-07-9231-wm-final-question-plain-text-v2.json',
    ]);
    expect(batchConfig.authorityArtifacts).toEqual([
      'docs/reports/2026-06-07-9231-wm-final-authority-alignment.json',
    ]);
    expect(batchConfig.consumptionArtifacts).toEqual([
      'docs/reports/2026-06-07-9231-wm-final-question-plain-text-v2-consumption.json',
    ]);
    expect(batchConfig.evidenceGateArtifacts).toEqual([
      'docs/reports/2026-06-07-9231-wm-final-evidence-layers-gate.json',
    ]);
  });

  test('builds ready rows only when v2, authority, and local consumption agree on normalized_plain_text', () => {
    const rows = build9231Wave4ReadyRows({
      v2Artifact: {
        items: [baseV2Row()],
      },
      authorityArtifact: {
        items: [baseAuthorityRow()],
      },
      consumptionArtifact: {
        items: [baseConsumptionRow()],
      },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      storage_key: '9231/w23_qp_21/questions/q01.png',
      shard_id: '9231_p2_w23_standard_001',
      normalized_plain_text: 'Show that the system of equations does not have a unique solution.',
      production_ready_claimed: true,
      db_consumption_claimed: true,
      search_consumption_claimed: true,
      read_model_consumption_claimed: true,
      rag_consumption_claimed: true,
      question_plain_text_source: 'question_plain_text_v2.normalized_plain_text',
      primary_topic_path: '9231.p2',
    });
  });

  test('removes NUL characters from normalized_plain_text before production DB promotion', () => {
    const textWithNul = 'Find x when y\u0000 is positive.';
    const expectedText = 'Find x when y is positive.';
    const rows = build9231Wave4ReadyRows({
      v2Artifact: {
        items: [baseV2Row({
          normalized_plain_text: textWithNul,
        })],
      },
      authorityArtifact: {
        items: [baseAuthorityRow()],
      },
      consumptionArtifact: {
        items: [baseConsumptionRow({
          normalized_plain_text: textWithNul,
          search: {
            search_text: textWithNul,
            search_text_source: 'question_plain_text_v2.normalized_plain_text',
          },
          read_model: {
            prompt_representation: {
              type: 'text',
              value: textWithNul,
            },
          },
          rag: {
            content: textWithNul,
            content_source: 'question_plain_text_v2.normalized_plain_text',
          },
        })],
      },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].normalized_plain_text).toBe(expectedText);
    expect(rows[0].normalized_plain_text).not.toContain('\u0000');
  });

  test('passes only when DB, search, read-model, and RAG gates cover every row', () => {
    const rows = build9231Wave4ReadyRows({
      v2Artifact: { items: [baseV2Row()] },
      authorityArtifact: { items: [baseAuthorityRow()] },
      consumptionArtifact: { items: [baseConsumptionRow()] },
    });
    const aggregate = build9231Wave4ProductionReadyAggregate({
      generatedOn: '2026-06-06',
      readyRows: rows,
      ...baseGateRows({ rows: rows.length }),
    });

    expect(aggregate.status).toBe('pass');
    expect(aggregate.verdict).toBe('production-ready');
    expect(aggregate.production_ready_claimed).toBe(true);
    expect(aggregate.scope).toMatchObject({
      subject_code: '9231',
      wave: 'wave4',
      shards: 1,
      rows: 1,
    });
    expect(aggregate.summary.gate_counts).toEqual({
      db_coverage: 1,
      production_search: 1,
      production_read_model: 1,
      production_rag: 1,
    });
    expect(aggregate.blockers).toEqual([]);
  });

  test('blocks and withholds production_ready_claimed when any production consumption layer is short', () => {
    const rows = build9231Wave4ReadyRows({
      v2Artifact: { items: [baseV2Row()] },
      authorityArtifact: { items: [baseAuthorityRow()] },
      consumptionArtifact: { items: [baseConsumptionRow()] },
    });
    const gates = baseGateRows({ rows: rows.length });
    gates.ragGate = {
      status: 'blocked',
      metrics: {
        rows: 1,
        rag_rows_using_normalized_plain_text: 0,
        rag_content_matches_normalized_plain_text: 0,
      },
    };

    const aggregate = build9231Wave4ProductionReadyAggregate({
      generatedOn: '2026-06-06',
      readyRows: rows,
      ...gates,
    });

    expect(REQUIRED_9231_PRODUCTION_DB_ZERO_FIELDS).toContain('normalized_plain_text_missing');
    expect(aggregate.status).toBe('blocked');
    expect(aggregate.production_ready_claimed).toBe(false);
    expect(aggregate.summary.gate_counts.production_rag).toBe(0);
    expect(aggregate.blockers).toContainEqual(expect.objectContaining({
      check: 'production_rag_gate',
      expected_rows: 1,
      actual_rows: 0,
    }));
  });
});
