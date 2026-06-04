import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  build9231QuestionPlainTextV1Layer,
  extractQuestionTextFromPdfText,
} from '../build_9231_question_plain_text_v1.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9231-question-text-v1-'));
}

function writeJson(root, repoPath, payload) {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function textItem(str, x, y) {
  return {
    str,
    transform: [1, 0, 0, 1, x, y],
  };
}

function baseSurfaceItem(overrides = {}) {
  return {
    storage_key: '9231/s16_qp_11/questions/q01.png',
    subject_code: '9231',
    year: 2016,
    session: 's',
    paper: 1,
    variant: 1,
    q_number: 1,
    source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/9231_s16_qp_11.pdf',
    shard_id: '9231_p1_s16_standard_001',
    locator_status: 'resolved',
    locator_method: 'pdfjs_text_items_strict_left_margin_question_header_v1',
    locator: {
      method: 'pdfjs_text_items_strict_left_margin_question_header_v1',
      page_index: 1,
      page_number: 2,
      text: '1',
      x: 49.32,
      y: 760,
    },
    page_indices: [1],
    page_numbers: [2],
    page_range: {
      start_page_index: 1,
      end_page_index: 1,
      start_page_number: 2,
      end_page_number: 2,
    },
    rendered_pdf_page_paths: ['data/crops/9231/page_002.png'],
    crop_paths: ['data/crops/9231/q01.png'],
    review_crop_paths: ['data/crops/9231/q01.png'],
    crop_status: 'complete',
    surface_evidence_status: 'external_vlm_visual_review_accepted',
    visual_review_status: 'accepted',
    visual_review_method: 'qwen_vlm_external_authorized',
    external_vlm_or_api_used: true,
    external_ocr_rerun_used: false,
    production_ready_claimed: false,
    db_consumption_claimed: false,
    search_consumption_claimed: false,
    rag_consumption_claimed: false,
    ...overrides,
  };
}

function baseSelectionItem(overrides = {}) {
  const surfaceItem = baseSurfaceItem(overrides);
  return {
    shard_id: surfaceItem.shard_id,
    source_manifest: 'data/manifests/9231_p1_s16_standard_001_page_chain_surface_v1.json',
    source_manifest_index: surfaceItem.q_number - 1,
    storage_key: surfaceItem.storage_key,
    source_pdf: surfaceItem.source_pdf,
    q_number: surfaceItem.q_number,
    crop_status: surfaceItem.crop_status,
    production_ready_claimed: false,
    visual_review_wave1_status: surfaceItem.visual_review_status,
    visual_review_wave1_accepted: surfaceItem.visual_review_status === 'accepted',
  };
}

function writeFixture(root, surfaceItems) {
  writeJson(root, 'data/manifests/9231_production_ready_wave1_16_2026_06_05_manifest_v1.json', {
    schema_version: '9231_production_ready_wave1_manifest_v1',
    subject_code: '9231',
    summary: {
      selected_rows: surfaceItems.length,
    },
    items: surfaceItems.map((item) => baseSelectionItem(item)),
  });
  writeJson(root, 'data/manifests/9231_p1_s16_standard_001_page_chain_surface_v1.json', {
    schema_version: '9231_question_shard_split_page_chain_surface_v1',
    subject_code: '9231',
    shard_id: '9231_p1_s16_standard_001',
    items: surfaceItems,
  });
}

describe('9231 question plain text v1 builder', () => {
  test('extracts a question window from the PDF text layer before the next question header', () => {
    const row = baseSurfaceItem();
    const nextRow = baseSurfaceItem({
      storage_key: '9231/s16_qp_11/questions/q02.png',
      q_number: 2,
      locator: {
        method: 'pdfjs_text_items_strict_left_margin_question_header_v1',
        page_index: 1,
        page_number: 2,
        text: '2',
        x: 49.32,
        y: 700,
      },
      page_indices: [1],
      page_range: {
        start_page_index: 1,
        end_page_index: 1,
      },
    });
    const pdfText = {
      status: 'available',
      pages: {
        1: [
          textItem('1', 49, 760),
          textItem('Find ', 72, 760),
          textItem('x', 96, 760),
          textItem(' when x + 2 = 5.', 104, 760),
          textItem('Give your answer exactly.', 72, 740),
          textItem('2', 49, 700),
          textItem('This is question two.', 72, 700),
        ],
      },
    };

    const extracted = extractQuestionTextFromPdfText({ row, nextRow, pdfText });

    expect(extracted.extraction_status).toBe('extracted');
    expect(extracted.plain_text).toContain('Find x when x + 2 = 5.');
    expect(extracted.plain_text).toContain('Give your answer exactly.');
    expect(extracted.plain_text).not.toContain('This is question two.');
  });

  test('builds v1 rows with text-only/image-context split and visual provenance', async () => {
    const root = fixtureRoot();
    const q1 = baseSurfaceItem();
    const q2 = baseSurfaceItem({
      storage_key: '9231/s16_qp_11/questions/q02.png',
      q_number: 2,
      locator: {
        method: 'pdfjs_text_items_strict_left_margin_question_header_v1',
        page_index: 1,
        page_number: 2,
        text: '2',
        x: 49.32,
        y: 700,
      },
      page_range: {
        start_page_index: 1,
        end_page_index: 1,
      },
    });
    writeFixture(root, [q1, q2]);

    const layer = await build9231QuestionPlainTextV1Layer({
      rootDir: root,
      pdfTextBySourcePdf: {
        [q1.source_pdf]: {
          status: 'available',
          pages: {
            1: [
              textItem('1', 49, 760),
              textItem('Solve x + 2 = 5.', 72, 760),
              textItem('2', 49, 700),
              textItem('The diagram shows a curve.', 72, 700),
              textItem('Find the gradient at P.', 72, 680),
            ],
          },
        },
      },
    });

    expect(layer.status).toBe('pass');
    expect(layer.summary).toMatchObject({
      production_rows: 2,
      plain_text_rows: 2,
      text_only_ready_rows: 1,
      image_context_required_rows: 1,
      image_context_rows_with_assets: 1,
      blockers: 0,
    });
    expect(layer.items[0]).toMatchObject({
      storage_key: q1.storage_key,
      text_source: 'pdfjs_page_chain_text_layer',
      text_only_ready: true,
      image_context_required: false,
      source_evidence_bundle: null,
    });
    expect(layer.items[1]).toMatchObject({
      storage_key: q2.storage_key,
      has_diagram: true,
      needs_image_asset: true,
      text_only_ready: false,
      image_context_required: true,
      quality_flags: [],
    });
  });

  test('blocks rows that have text but no accepted visual review', async () => {
    const root = fixtureRoot();
    const row = baseSurfaceItem({
      surface_evidence_status: 'local_pilot_crop_render_complete_pending_visual_review',
      visual_review_status: 'missing',
      visual_review_method: null,
      external_vlm_or_api_used: false,
    });
    writeFixture(root, [row]);

    const layer = await build9231QuestionPlainTextV1Layer({
      rootDir: root,
      pdfTextBySourcePdf: {
        [row.source_pdf]: {
          status: 'available',
          pages: {
            1: [
              textItem('1', 49, 760),
              textItem('Solve x + 2 = 5.', 72, 760),
            ],
          },
        },
      },
    });

    expect(layer.status).toBe('blocked');
    expect(layer.blockers).toEqual([
      {
        storage_key: row.storage_key,
        check: 'visual_review_not_accepted',
        source_surface_manifest: 'data/manifests/9231_p1_s16_standard_001_page_chain_surface_v1.json',
      },
    ]);
  });
});
