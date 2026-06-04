import fs from 'node:fs';
import path from 'node:path';

import {
  buildQuestionPlainTextV2Consumption,
  buildQuestionPlainTextV2ConsumptionMarkdown,
} from '../lib/question-plain-text-v2-consumption.js';

function makeLayer(overrides = {}) {
  const items = overrides.items ?? [
    {
      schema_version: 'question_plain_text_v2',
      storage_key: '9709/s24_qp_12/questions/q01.png',
      subject_code: '9709',
      year: 2024,
      session: 's',
      paper: 1,
      variant: 2,
      q_number: 1,
      source_pdf: 'data/past-papers/9709Mathematics/paper1/9709_s24_qp_12.pdf',
      source_version: 'v2',
      primary_topic_path: '9709.p1.series',
      normalized_plain_text: 'Find the coefficient of x^4 in (1 + 2x)^6.',
      text_source: 'evidence_ocr_text',
      answering_mode: 'text_only',
      text_only_addressable: true,
      requires_image_context: false,
      has_diagram: false,
      table_heavy: false,
      formula_dense: true,
      math_expression_count: 2,
      image_assets: ['tmp/crops/q01.png'],
      provenance: {
        v1_provenance: {
          search_text: 'legacy descriptor text that must not win',
        },
      },
    },
    {
      schema_version: 'question_plain_text_v2',
      storage_key: '9709/s24_qp_12/questions/q02.png',
      subject_code: '9709',
      year: 2024,
      session: 's',
      paper: 1,
      variant: 2,
      q_number: 2,
      source_pdf: 'data/past-papers/9709Mathematics/paper1/9709_s24_qp_12.pdf',
      source_version: 'v2',
      primary_topic_path: '9709.p1.vectors',
      normalized_plain_text: 'Use the diagram to find the vector AB.',
      text_source: 'evidence_ocr_text',
      answering_mode: 'image_context_required',
      text_only_addressable: false,
      requires_image_context: true,
      has_diagram: true,
      table_heavy: false,
      formula_dense: false,
      math_expression_count: 0,
      image_assets: ['tmp/crops/q02.png'],
    },
  ];

  return {
    schema_version: 'question_plain_text_v2',
    status: 'pass',
    verdict: 'pass',
    subject_code: '9709',
    summary: {
      production_rows: items.length,
      v2_rows: items.length,
      normalized_plain_text_rows: items.filter((item) => item.normalized_plain_text).length,
      text_only_ready_rows: items.filter((item) => item.text_only_addressable).length,
      image_context_required_rows: items.filter((item) => item.requires_image_context).length,
      image_context_rows_with_assets: items.filter((item) => item.requires_image_context && item.image_assets?.length > 0).length,
      blockers: 0,
      ...(overrides.summary || {}),
    },
    blockers: overrides.blockers ?? [],
    items,
    ...overrides,
  };
}

describe('question_plain_text_v2 consumption gate', () => {
  test('builds search, read-model, and RAG consumption rows from normalized_plain_text first', () => {
    const result = buildQuestionPlainTextV2Consumption(makeLayer(), {
      generatedOn: '2026-06-04',
      sourceArtifactPath: 'docs/reports/2026-06-04-9709-question-plain-text-v2.json',
    });

    expect(result.status).toBe('pass');
    expect(result.summary.rows_read).toBe(2);
    expect(result.summary.normalized_plain_text_rows).toBe(2);
    expect(result.summary.text_only_ready_rows).toBe(1);
    expect(result.summary.image_context_required_rows).toBe(1);
    expect(result.summary.search_rows_using_normalized_plain_text).toBe(2);
    expect(result.summary.read_model_rows_using_normalized_plain_text).toBe(2);
    expect(result.summary.rag_rows_using_normalized_plain_text).toBe(2);
    expect(result.summary.legacy_search_text_only_rows).toBe(0);

    expect(result.items[0]).toEqual(expect.objectContaining({
      storage_key: '9709/s24_qp_12/questions/q01.png',
      text_consumption_status: 'text_only_ready',
      search: expect.objectContaining({
        search_text: 'Find the coefficient of x^4 in (1 + 2x)^6.',
        search_text_source: 'question_plain_text_v2.normalized_plain_text',
      }),
      read_model: expect.objectContaining({
        prompt_representation: {
          type: 'text',
          value: 'Find the coefficient of x^4 in (1 + 2x)^6.',
        },
      }),
      rag: expect.objectContaining({
        content: 'Find the coefficient of x^4 in (1 + 2x)^6.',
        source_type: 'question_plain_text_v2',
      }),
    }));
    expect(result.items[0].search.search_text).not.toBe('legacy descriptor text that must not win');

    expect(result.items[1]).toEqual(expect.objectContaining({
      text_consumption_status: 'image_context_required',
      requires_image_context: true,
      text_only_addressable: false,
      image_assets: ['tmp/crops/q02.png'],
    }));
    expect(result.items[1].read_model.provenance_summary).toEqual(expect.objectContaining({
      normalized_plain_text: 'Use the diagram to find the vector AB.',
      question_plain_text_version: 'v2',
      search_text_source: 'question_plain_text_v2.normalized_plain_text',
      requires_image_context: true,
      text_only_addressable: false,
    }));
  });

  test('fails when image-context rows have no image assets or normalized text is missing', () => {
    const result = buildQuestionPlainTextV2Consumption(makeLayer({
      items: [
        {
          storage_key: '9709/s24_qp_12/questions/q03.png',
          subject_code: '9709',
          q_number: 3,
          normalized_plain_text: '',
          text_only_addressable: true,
          requires_image_context: false,
          image_assets: [],
        },
        {
          storage_key: '9709/s24_qp_12/questions/q04.png',
          subject_code: '9709',
          q_number: 4,
          normalized_plain_text: 'Use the graph to estimate k.',
          text_only_addressable: false,
          requires_image_context: true,
          image_assets: [],
        },
      ],
    }));

    expect(result.status).toBe('fail');
    expect(result.blockers.map((blocker) => blocker.check)).toEqual(expect.arrayContaining([
      'missing_normalized_plain_text',
      'missing_image_asset',
      'summary_mismatch',
    ]));
  });

  test('real v2 artifact passes the first consumption gate for all 3530 rows', () => {
    const artifactPath = path.join(
      process.cwd(),
      'docs/reports/2026-06-04-9709-question-plain-text-v2.json',
    );
    const layer = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    const result = buildQuestionPlainTextV2Consumption(layer, {
      generatedOn: '2026-06-04',
      sourceArtifactPath: 'docs/reports/2026-06-04-9709-question-plain-text-v2.json',
    });

    expect(result.status).toBe('pass');
    expect(result.summary.rows_read).toBe(3530);
    expect(result.summary.normalized_plain_text_rows).toBe(3530);
    expect(result.summary.text_only_ready_rows).toBe(2672);
    expect(result.summary.image_context_required_rows).toBe(858);
    expect(result.summary.image_context_rows_with_assets).toBe(858);
    expect(result.summary.search_rows_using_normalized_plain_text).toBe(3530);
    expect(result.summary.read_model_rows_using_normalized_plain_text).toBe(3530);
    expect(result.summary.rag_rows_using_normalized_plain_text).toBe(3530);
    expect(result.summary.legacy_search_text_only_rows).toBe(0);
    expect(result.blockers).toEqual([]);
  });

  test('markdown report states local consumption boundaries without DB/RAG claims', () => {
    const result = buildQuestionPlainTextV2Consumption(makeLayer(), {
      generatedOn: '2026-06-04',
      sourceArtifactPath: 'docs/reports/2026-06-04-9709-question-plain-text-v2.json',
    });
    const markdown = buildQuestionPlainTextV2ConsumptionMarkdown(result);

    expect(markdown).toContain('# 9709 Question Plain Text v2 Consumption Gate');
    expect(markdown).toContain('status: `pass`');
    expect(markdown).toContain('rows read: `2`');
    expect(markdown).toContain('This is a local deterministic consumption gate.');
    expect(markdown).toContain('does not claim live DB, deployed search, or online RAG ingestion has already run');
  });
});
