import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  run9702QuestionPlainTextV2ConsumptionGate,
} from '../run_9702_question_plain_text_v2_consumption_gate.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9702-consumption-gate-'));
}

function writeJson(root, repoPath, payload) {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function v2Item(overrides = {}) {
  return {
    schema_version: 'question_plain_text_v2',
    storage_key: '9702/m17_qp_12/questions/q01.png',
    subject_code: '9702',
    year: 2017,
    session: 'm',
    paper: 1,
    variant: 2,
    q_number: 1,
    source_pdf: 'data/past-papers/9702Physics/paper1/9702_m17_qp_12.pdf',
    source_version: '9702_phase5_visual_accepted_surface_v1',
    primary_topic_path: '9702.p1',
    normalized_plain_text: 'Which expression has the same base units as pressure?',
    text_source: 'pdfjs_page_chain_text_layer',
    answering_mode: 'text_only',
    text_only_addressable: true,
    requires_image_context: false,
    has_diagram: false,
    table_heavy: false,
    formula_dense: false,
    math_expression_count: 0,
    image_assets: ['data/crops/9702/q01.png'],
    ...overrides,
  };
}

describe('9702 question plain text v2 consumption gate runner', () => {
  test('writes local search/read-model/RAG rows from normalized_plain_text', () => {
    const root = fixtureRoot();
    const inputJson = 'docs/reports/2026-06-10-9702-question-plain-text-v2.json';
    const jsonOut = 'docs/reports/2026-06-10-9702-question-plain-text-v2-consumption.json';
    const markdownOut = 'docs/reports/2026-06-10-9702-question-plain-text-v2-consumption-gate.md';
    writeJson(root, inputJson, {
      schema_version: '9702_question_plain_text_v2',
      status: 'pass',
      subject_code: '9702',
      summary: {
        production_rows: 1,
        v2_rows: 1,
        normalized_plain_text_rows: 1,
        text_only_ready_rows: 1,
        image_context_required_rows: 0,
        image_context_rows_with_assets: 0,
        blockers: 0,
      },
      blockers: [],
      items: [v2Item()],
    });

    const result = run9702QuestionPlainTextV2ConsumptionGate({
      generatedOn: '2026-06-10',
      inputJson: path.join(root, inputJson),
      jsonOut: path.join(root, jsonOut),
      markdownOut: path.join(root, markdownOut),
    });

    expect(result.status).toBe('pass');
    expect(result.summary).toMatchObject({
      rows_read: 1,
      normalized_plain_text_rows: 1,
      search_rows_using_normalized_plain_text: 1,
      read_model_rows_using_normalized_plain_text: 1,
      rag_rows_using_normalized_plain_text: 1,
      legacy_search_text_only_rows: 0,
    });
    expect(result.items[0].search.search_text_source).toBe('question_plain_text_v2.normalized_plain_text');
    expect(result.items[0].read_model.prompt_representation.value).toBe(result.items[0].normalized_plain_text);
    expect(result.items[0].rag.content_source).toBe('question_plain_text_v2.normalized_plain_text');
    expect(fs.readFileSync(path.join(root, markdownOut), 'utf8')).toContain('9702 Question Plain Text v2 Consumption Gate');
  });
});
