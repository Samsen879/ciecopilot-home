import {
  buildQuestionEvidenceBundlesV1,
  summarizeQuestionEvidenceBundlesV1,
} from '../lib/question-evidence-bundle-v1.js';

function buildManifest(items) {
  return {
    schema_version: 'v1',
    manifest_id: 'test_manifest',
    items,
  };
}

function buildLaneOutput({
  inputAssetId,
  route,
  model,
  confidence = 0.9,
  failureReason = null,
  inputAssetHash = 'hash-1',
  warnings = [],
  evidence = {},
} = {}) {
  return {
    model,
    route,
    prompt_template_version: 'v1',
    region: 'dashscope-cn',
    base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    api_key_scope: 'DASHSCOPE_API_KEY',
    input_asset_id: inputAssetId,
    input_asset_hash: inputAssetHash,
    response_schema_version: 'v1',
    confidence,
    failure_reason: failureReason,
    output: {
      summary: null,
      evidence: Object.entries(evidence).map(([field, value]) => ({ field, value })),
      warnings,
    },
  };
}

describe('question evidence bundle v1', () => {
  test('builds a structured AO bundle without attaching the original image for non-conflict OCR rows', () => {
    const manifest = buildManifest([
      {
        storage_key: '9709/s24_qp_31/questions/q08.png',
        syllabus_code: '9709',
        year: 2024,
        session: 's',
        paper: 3,
        variant: 1,
        q_number: 8,
        primary_topic_path: '9709.p3.integration',
        route_hint: 'ocr_lane',
        diagram_present: false,
        formula_dense: true,
        table_heavy: false,
        surface_evidence_status: 'verified_primary_asset',
        gate_critical: false,
        requires_review: false,
      },
    ]);

    const bundles = buildQuestionEvidenceBundlesV1({
      manifest,
      laneOutputs: [
        buildLaneOutput({
          inputAssetId: '9709/s24_qp_31/questions/q08.png',
          route: 'ocr_lane',
          model: 'qwen-vl-ocr',
          evidence: {
            ocr_text: 'Find the value of the integral of (2x + 1)(x^2 + x)^4 dx.',
            formula_latex_list: ['\\int (2x + 1)(x^2 + x)^4 \\, dx'],
            subquestion_blocks: ['(a) Find the value of the integral.'],
            layout_hints: ['single_column_prompt'],
          },
        }),
      ],
    });

    expect(bundles).toHaveLength(1);
    expect(bundles[0]).toMatchObject({
      schema_version: 'question_evidence_bundle_v1',
      manifest_id: 'test_manifest',
      storage_key: '9709/s24_qp_31/questions/q08.png',
      analysis_hints: {
        topic_path_hint: '9709.p3.integration',
      },
      evidence: {
        ocr_text: 'Find the value of the integral of (2x + 1)(x^2 + x)^4 dx.',
        formula_latex_list: ['\\int (2x + 1)(x^2 + x)^4 \\, dx'],
        subquestion_blocks: ['(a) Find the value of the integral.'],
        layout_hints: ['single_column_prompt'],
        diagram_present: false,
        diagram_elements: [],
        spatial_evidence: [],
      },
      route: {
        route: 'ocr_lane',
        model: 'qwen-vl-ocr',
        region: 'dashscope-cn',
        prompt_template_version: 'v1',
        response_schema_version: 'v1',
      },
      lazy_attach_original_image: false,
      original_image_asset: null,
      review_posture: {
        requires_review: false,
        gate_critical: false,
      },
    });
    expect(bundles[0].model_provenance).toEqual([
      expect.objectContaining({
        route: 'ocr_lane',
        model: 'qwen-vl-ocr',
        input_asset_id: '9709/s24_qp_31/questions/q08.png',
      }),
    ]);
  });

  test('marks lazy image attachment explicitly for gate-critical or low-confidence rows', () => {
    const manifest = buildManifest([
      {
        storage_key: '9709/s19_qp_11/questions/q06.png',
        syllabus_code: '9709',
        year: 2019,
        session: 's',
        paper: 1,
        variant: 1,
        q_number: 6,
        primary_topic_path: '9709.p1.trigonometry',
        route_hint: 'review_lane',
        diagram_present: null,
        formula_dense: null,
        table_heavy: null,
        surface_evidence_status: 'unknown_requires_primary_asset_replay',
        gate_critical: true,
        requires_review: true,
      },
    ]);

    const bundles = buildQuestionEvidenceBundlesV1({
      manifest,
      laneOutputs: [
        buildLaneOutput({
          inputAssetId: '9709/s19_qp_11/questions/q06.png',
          route: 'review_lane',
          model: 'qwen3.6-plus',
          confidence: 0.41,
          warnings: ['requires_review', 'lazy_attach_original_image'],
          evidence: {
            requires_review: true,
            review_reasons: ['unknown_surface_flags'],
            ambiguity_flags: ['low_legibility'],
            review_summary: 'Needs AO review with the original image attached.',
          },
        }),
      ],
    });

    expect(bundles).toHaveLength(1);
    expect(bundles[0]).toMatchObject({
      lazy_attach_original_image: true,
      original_image_asset: {
        input_asset_id: '9709/s19_qp_11/questions/q06.png',
        input_asset_hash: 'hash-1',
      },
      review_posture: {
        requires_review: true,
        gate_critical: true,
        review_reasons: ['unknown_surface_flags'],
        ambiguity_flags: ['low_legibility'],
      },
    });
    expect(bundles[0].lazy_attach_reasons).toEqual(expect.arrayContaining([
      'route_requires_original_image',
      'gate_critical',
      'requires_review',
      'low_confidence',
    ]));
  });

  test('uses review-lane structured evidence when review-routed rows have no OCR or diagram lane outputs', () => {
    const manifest = buildManifest([
      {
        storage_key: '9709/s19_qp_11/questions/q06.png',
        syllabus_code: '9709',
        year: 2019,
        session: 's',
        paper: 1,
        variant: 1,
        q_number: 6,
        primary_topic_path: '9709.p1.trigonometry',
        route_hint: 'review_lane',
        diagram_present: null,
        formula_dense: null,
        table_heavy: null,
        surface_evidence_status: 'unknown_requires_primary_asset_replay',
        gate_critical: true,
        requires_review: true,
      },
    ]);

    const bundles = buildQuestionEvidenceBundlesV1({
      manifest,
      laneOutputs: [
        buildLaneOutput({
          inputAssetId: '9709/s19_qp_11/questions/q06.png',
          route: 'review_lane',
          model: 'qwen3.6-plus',
          confidence: 0.86,
          warnings: ['requires_review', 'lazy_attach_original_image'],
          evidence: {
            ocr_text: 'Solve the differential equation dy/dx = 2xy given that y = 1 when x = 0.',
            formula_latex_list: ['\\frac{dy}{dx} = 2xy'],
            subquestion_blocks: ['(a) Solve the differential equation.'],
            layout_hints: ['single_column_prompt'],
            diagram_present: false,
            diagram_elements: [],
            spatial_evidence: [],
            requires_review: true,
            review_reasons: ['unknown_surface_flags'],
            ambiguity_flags: ['low_legibility'],
            review_summary: 'Review lane recovered structured evidence but still requires AO review.',
          },
        }),
      ],
    });

    expect(bundles).toHaveLength(1);
    expect(bundles[0]).toMatchObject({
      evidence: {
        ocr_text: 'Solve the differential equation dy/dx = 2xy given that y = 1 when x = 0.',
        formula_latex_list: ['\\frac{dy}{dx} = 2xy'],
        subquestion_blocks: ['(a) Solve the differential equation.'],
        layout_hints: ['single_column_prompt'],
        diagram_present: false,
        diagram_elements: [],
        spatial_evidence: [],
      },
      route: {
        route: 'review_lane',
        model: 'qwen3.6-plus',
        confidence: 0.86,
      },
      model_provenance: [
        expect.objectContaining({
          route: 'review_lane',
          model: 'qwen3.6-plus',
          confidence: 0.86,
        }),
      ],
    });
  });

  test('does not copy model or confidence from an unrelated fallback lane when the decided lane output is missing', () => {
    const manifest = buildManifest([
      {
        storage_key: '9709/s19_qp_11/questions/q06.png',
        syllabus_code: '9709',
        year: 2019,
        session: 's',
        paper: 1,
        variant: 1,
        q_number: 6,
        primary_topic_path: '9709.p1.trigonometry',
        route_hint: 'review_lane',
        diagram_present: null,
        formula_dense: null,
        table_heavy: null,
        surface_evidence_status: 'unknown_requires_primary_asset_replay',
        gate_critical: true,
        requires_review: true,
      },
    ]);

    const bundles = buildQuestionEvidenceBundlesV1({
      manifest,
      laneOutputs: [
        buildLaneOutput({
          inputAssetId: '9709/s19_qp_11/questions/q06.png',
          route: 'ocr_lane',
          model: 'qwen-vl-ocr',
          confidence: 0.99,
          evidence: {
            ocr_text: 'Unrelated OCR output that should not override review-lane provenance.',
          },
        }),
      ],
    });

    expect(bundles).toHaveLength(1);
    expect(bundles[0].route).toMatchObject({
      route: 'review_lane',
      model: 'qwen3.6-plus',
      region: 'dashscope-cn',
      base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      api_key_scope: 'DASHSCOPE_API_KEY',
      prompt_template_version: 'v1',
      response_schema_version: 'v1',
      input_asset_id: '9709/s19_qp_11/questions/q06.png',
      input_asset_hash: null,
      confidence: null,
      failure_reason: null,
    });
  });

  test('summarizes route and lazy-attach counts for a bundle set', () => {
    const bundles = buildQuestionEvidenceBundlesV1({
      manifest: buildManifest([
        {
          storage_key: '9709/s24_qp_31/questions/q08.png',
          syllabus_code: '9709',
          year: 2024,
          session: 's',
          paper: 3,
          variant: 1,
          q_number: 8,
          primary_topic_path: '9709.p3.integration',
          route_hint: 'ocr_lane',
          diagram_present: false,
          formula_dense: true,
          table_heavy: false,
          surface_evidence_status: 'verified_primary_asset',
          gate_critical: false,
          requires_review: false,
        },
        {
          storage_key: '9709/s19_qp_11/questions/q06.png',
          syllabus_code: '9709',
          year: 2019,
          session: 's',
          paper: 1,
          variant: 1,
          q_number: 6,
          primary_topic_path: '9709.p1.trigonometry',
          route_hint: 'review_lane',
          diagram_present: null,
          formula_dense: null,
          table_heavy: null,
          surface_evidence_status: 'unknown_requires_primary_asset_replay',
          gate_critical: true,
          requires_review: true,
        },
      ]),
    });

    expect(summarizeQuestionEvidenceBundlesV1(bundles)).toMatchObject({
      bundles_planned: 2,
      lazy_attach_original_image: 1,
      route_counts: {
        ocr_lane: 1,
        review_lane: 1,
      },
    });
  });
});
