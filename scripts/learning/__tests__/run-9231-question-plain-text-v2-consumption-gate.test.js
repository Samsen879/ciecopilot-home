import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  run9231QuestionPlainTextV2ConsumptionGate,
} from '../run_9231_question_plain_text_v2_consumption_gate.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9231-consumption-gate-'));
}

function writeJson(root, repoPath, payload) {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function v2Item(overrides = {}) {
  return {
    schema_version: 'question_plain_text_v2',
    storage_key: '9231/s16_qp_11/questions/q01.png',
    subject_code: '9231',
    year: 2016,
    session: 's',
    paper: 1,
    variant: 1,
    q_number: 1,
    source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/9231_s16_qp_11.pdf',
    source_version: '9231_wave1_surface_v1',
    primary_topic_path: '9231.p1.polynomials_roots',
    normalized_plain_text: 'Find the cubic equation whose roots are transformed.',
    text_source: 'pdfjs_page_chain_text_layer',
    answering_mode: 'text_only',
    text_only_addressable: true,
    requires_image_context: false,
    has_diagram: false,
    table_heavy: false,
    formula_dense: true,
    math_expression_count: 1,
    image_assets: ['data/crops/9231/q01.png'],
    ...overrides,
  };
}

describe('9231 question plain text v2 consumption gate runner', () => {
  test('writes 9231 consumption artifacts using normalized_plain_text for search, read-model, and RAG', () => {
    const root = fixtureRoot();
    const inputJson = 'docs/reports/2026-06-05-9231-question-plain-text-v2.json';
    const jsonOut = 'docs/reports/2026-06-05-9231-question-plain-text-v2-consumption.json';
    const markdownOut = 'docs/reports/2026-06-05-9231-question-plain-text-v2-consumption-gate.md';
    writeJson(root, inputJson, {
      schema_version: '9231_question_plain_text_v2',
      status: 'pass',
      subject_code: '9231',
      summary: {
        production_rows: 2,
        v2_rows: 2,
        normalized_plain_text_rows: 2,
        text_only_ready_rows: 1,
        image_context_required_rows: 1,
        image_context_rows_with_assets: 1,
        blockers: 0,
      },
      blockers: [],
      items: [
        v2Item(),
        v2Item({
          storage_key: '9231/s16_qp_11/questions/q02.png',
          q_number: 2,
          normalized_plain_text: 'The diagram shows a curve. Find the gradient.',
          answering_mode: 'text_plus_image_context',
          text_only_addressable: false,
          requires_image_context: true,
          has_diagram: true,
        }),
      ],
    });

    const result = run9231QuestionPlainTextV2ConsumptionGate({
      generatedOn: '2026-06-05',
      inputJson: path.join(root, inputJson),
      jsonOut: path.join(root, jsonOut),
      markdownOut: path.join(root, markdownOut),
    });

    expect(result.status).toBe('pass');
    expect(result.summary).toMatchObject({
      rows_read: 2,
      normalized_plain_text_rows: 2,
      search_rows_using_normalized_plain_text: 2,
      read_model_rows_using_normalized_plain_text: 2,
      rag_rows_using_normalized_plain_text: 2,
      legacy_search_text_only_rows: 0,
    });
    expect(result.items[0].search.search_text_source).toBe('question_plain_text_v2.normalized_plain_text');
    expect(result.items[0].read_model.prompt_representation.value).toBe(result.items[0].normalized_plain_text);
    expect(result.items[0].rag.content_source).toBe('question_plain_text_v2.normalized_plain_text');
    expect(fs.readFileSync(path.join(root, markdownOut), 'utf8')).toContain('9231 Question Plain Text v2 Consumption Gate');
  });
});
