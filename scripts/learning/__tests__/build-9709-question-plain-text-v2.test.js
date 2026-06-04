import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildQuestionPlainTextV2Layer,
  normalizeFormulaExpression,
  normalizeSubquestionBlock,
} from '../build_9709_question_plain_text_v2.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9709-question-text-v2-'));
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function baseV1Item(overrides = {}) {
  return {
    schema_version: 'question_plain_text_v1',
    storage_key: '9709/m16_qp_12/questions/q01.png',
    subject_code: '9709',
    year: 2016,
    session: 'm',
    paper: 1,
    variant: 2,
    q_number: 1,
    source_pdf: 'data/past-papers/9709Mathematics/paper1/9709_m16_qp_12.pdf',
    source_version: 'v1',
    source_surface_manifest: 'data/manifests/9709_p1_m_standard_001_page_chain_surface_v1.json',
    source_evidence_bundle: 'docs/reports/2026-04-25-9709-surface-triage-evidence-bundles-final.json',
    primary_topic_path: '9709.p1.series',
    has_diagram: false,
    formula_dense: true,
    table_heavy: false,
    needs_image_asset: false,
    plain_text: '1 (i) Find the coefficients of x^4 and x^5 in the expansion of (1 - 2x)^5. [2]\n(ii) Find p when there is no term in x^5. [2]',
    text_source: 'evidence_ocr_text',
    formula_latex_list: [' x^4 ', 'x^5', '(1 - 2x)^5'],
    subquestion_blocks: [
      "{'label': '(i)', 'text': 'Find the coefficients of x^4 and x^5 in the expansion of (1 - 2x)^5.', 'marks': '[2]'}",
      { label: '(ii)', text: 'Find p when there is no term in x^5.', marks: 2 },
    ],
    image_assets: ['tmp/crops/q01.png'],
    rendered_pdf_page_paths: ['tmp/renders/page_002.png'],
    provenance: {
      route_hint: 'ocr_lane',
    },
    quality_flags: ['formula_dense'],
    ...overrides,
  };
}

function buildV1Layer(items) {
  return {
    schema_version: '9709_question_plain_text_v1',
    status: 'pass',
    generated_on: '2026-06-04',
    subject_code: '9709',
    summary: {
      production_rows: items.length,
    },
    items,
  };
}

describe('9709 question plain text v2 builder', () => {
  test('normalizes math expressions and parses mixed subquestion block formats', () => {
    expect(normalizeFormulaExpression('  (1 - 2x)^5  ', { source: 'formula_latex_list', index: 2 }))
      .toMatchObject({
        raw_text: '(1 - 2x)^5',
        normalized_ascii: '(1 - 2x)^5',
        source: 'formula_latex_list',
        source_index: 2,
      });

    expect(normalizeSubquestionBlock(
      "{'label': '(i)', 'text': 'Find x^4.', 'marks': '[2]'}",
      { index: 0 },
    )).toMatchObject({
      label: '(i)',
      text: 'Find x^4.',
      marks: 2,
      source: 'evidence_subquestion_block',
      source_index: 0,
      parse_status: 'parsed',
    });

    const layer = buildQuestionPlainTextV2Layer({
      v1Layer: buildV1Layer([baseV1Item()]),
      generatedOn: '2026-06-04',
    });

    expect(layer.status).toBe('pass');
    expect(layer.items[0]).toMatchObject({
      schema_version: 'question_plain_text_v2',
      normalized_plain_text: '1 (i) Find the coefficients of x^4 and x^5 in the expansion of (1 - 2x)^5. [2]\n(ii) Find p when there is no term in x^5. [2]',
      answering_mode: 'text_only',
      structured_text_status: 'structured',
      marks_total: 4,
    });
    expect(layer.items[0].math_expressions.map((entry) => entry.normalized_ascii))
      .toEqual(['x^4', 'x^5', '(1 - 2x)^5']);
    expect(layer.items[0].subquestion_blocks_v2).toHaveLength(2);
    expect(layer.items[0].subquestion_blocks_v2[0]).toMatchObject({
      label: '(i)',
      text: 'Find the coefficients of x^4 and x^5 in the expansion of (1 - 2x)^5.',
      marks: 2,
    });
  });

  test('classifies text-only, diagram, and table-heavy rows without losing image assets', () => {
    const textOnly = baseV1Item();
    const diagram = baseV1Item({
      storage_key: '9709/m16_qp_12/questions/q02.png',
      q_number: 2,
      has_diagram: true,
      needs_image_asset: true,
      table_heavy: false,
      image_assets: ['tmp/crops/q02.png'],
    });
    const table = baseV1Item({
      storage_key: '9709/m16_qp_12/questions/q03.png',
      q_number: 3,
      has_diagram: false,
      needs_image_asset: true,
      table_heavy: true,
      image_assets: ['tmp/crops/q03.png'],
    });

    const layer = buildQuestionPlainTextV2Layer({
      v1Layer: buildV1Layer([textOnly, diagram, table]),
      generatedOn: '2026-06-04',
    });

    expect(layer.status).toBe('pass');
    expect(layer.summary).toMatchObject({
      production_rows: 3,
      text_only_ready_rows: 1,
      image_context_required_rows: 2,
      image_context_rows_with_assets: 2,
      diagram_rows: 1,
      table_heavy_rows: 1,
      blockers: 0,
    });
    expect(layer.items.map((item) => item.answering_mode)).toEqual([
      'text_only',
      'text_plus_image_context',
      'text_plus_image_context',
    ]);
  });

  test('extracts LaTeX-delimited inline math candidates when formula list is absent', () => {
    const latexOnly = baseV1Item({
      formula_latex_list: [],
      plain_text: 'Find the exact value of $\\int_{3}^{\\infty} \\frac{2}{x^{2}} \\mathrm{d}x$.',
      subquestion_blocks: [],
    });

    const layer = buildQuestionPlainTextV2Layer({
      v1Layer: buildV1Layer([latexOnly]),
      generatedOn: '2026-06-04',
    });

    expect(layer.status).toBe('pass');
    expect(layer.items[0].math_expressions).toContainEqual(expect.objectContaining({
      raw_text: '\\int_{3}^{\\infty} \\frac{2}{x^{2}} \\mathrm{d}x',
      source: 'plain_text_latex_delimiter',
    }));
    expect(layer.summary.formula_dense_rows_with_math_expressions).toBe(1);
  });

  test('blocks missing normalized text, duplicate storage keys, and missing image assets', () => {
    const missingText = baseV1Item({
      storage_key: '9709/m16_qp_12/questions/q04.png',
      q_number: 4,
      plain_text: '   ',
    });
    const missingImage = baseV1Item({
      storage_key: '9709/m16_qp_12/questions/q05.png',
      q_number: 5,
      has_diagram: true,
      needs_image_asset: true,
      image_assets: [],
    });
    const duplicate = baseV1Item({
      storage_key: '9709/m16_qp_12/questions/q05.png',
      q_number: 6,
      has_diagram: true,
      needs_image_asset: true,
      image_assets: ['tmp/crops/q06.png'],
    });

    const layer = buildQuestionPlainTextV2Layer({
      v1Layer: buildV1Layer([missingText, missingImage, duplicate]),
      generatedOn: '2026-06-04',
    });

    expect(layer.status).toBe('blocked');
    expect(layer.summary).toMatchObject({
      duplicate_storage_keys: 1,
      missing_normalized_plain_text: 1,
      missing_image_asset: 1,
      blockers: 3,
    });
    expect(layer.blockers).toContainEqual(expect.objectContaining({
      storage_key: '9709/m16_qp_12/questions/q04.png',
      check: 'missing_normalized_plain_text',
    }));
    expect(layer.blockers).toContainEqual(expect.objectContaining({
      storage_key: '9709/m16_qp_12/questions/q05.png',
      check: 'duplicate_storage_key',
    }));
    expect(layer.blockers).toContainEqual(expect.objectContaining({
      storage_key: '9709/m16_qp_12/questions/q05.png',
      check: 'missing_image_asset_for_image_context_row',
    }));
  });

  test('writes artifacts from a v1 input JSON path', () => {
    const root = fixtureRoot();
    const inputPath = path.join(root, 'docs', 'reports', 'v1.json');
    const jsonOut = path.join(root, 'docs', 'reports', 'v2.json');
    const markdownOut = path.join(root, 'docs', 'reports', 'v2.md');
    writeJson(inputPath, buildV1Layer([baseV1Item()]));

    const layer = buildQuestionPlainTextV2Layer({
      rootDir: root,
      inputJson: 'docs/reports/v1.json',
      jsonOut: 'docs/reports/v2.json',
      markdownOut: 'docs/reports/v2.md',
      generatedOn: '2026-06-04',
      writeArtifacts: true,
    });

    expect(layer.status).toBe('pass');
    expect(fs.existsSync(jsonOut)).toBe(true);
    expect(fs.existsSync(markdownOut)).toBe(true);
    expect(JSON.parse(fs.readFileSync(jsonOut, 'utf8')).schema_version).toBe('9709_question_plain_text_v2');
    expect(fs.readFileSync(markdownOut, 'utf8')).toContain('9709 question plain text v2 coverage');
  });
});
