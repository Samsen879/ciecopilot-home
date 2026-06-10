import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  build9702QuestionPlainTextV1Layer,
} from '../build_9702_question_plain_text_v1.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9702-question-text-v1-'));
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

function surfaceRow(overrides = {}) {
  return {
    storage_key: '9702/m17_qp_12/questions/q01.png',
    subject_code: '9702',
    syllabus_code: '9702',
    year: 2017,
    session: 'm',
    paper: 1,
    component: '12',
    variant: 2,
    q_number: 1,
    source_pdf: 'data/past-papers/9702Physics/paper1/9702_m17_qp_12.pdf',
    source_locator_surface_manifest_path: 'data/manifests/9702_p1_m_historical_001_page_chain_surface_v1.json',
    locator_status: 'resolved',
    locator_method: 'fitz_text_words_left_margin_question_header_9702_v1',
    locator: {
      method: 'fitz_text_words_left_margin_question_header_9702_v1',
      page_index: 3,
      page_number: 4,
      text: '1',
      x: 49.6,
      y: 82,
    },
    page_indices: [3],
    page_numbers: [4],
    page_range: {
      start_page_index: 3,
      end_page_index: 3,
      start_page_number: 4,
      end_page_number: 4,
    },
    rendered_pdf_page_paths: ['data/crops/9702/page_004.png'],
    crop_paths: ['data/crops/9702/q01.png'],
    review_crop_paths: ['data/crops/9702/q01.png'],
    crop_status: 'complete',
    surface_evidence_status: 'local_full_crop_render_complete_pending_visual_review',
    production_ready_claimed: false,
    db_consumption_claimed: false,
    search_consumption_claimed: false,
    rag_consumption_claimed: false,
    ...overrides,
  };
}

function visualRow(row, overrides = {}) {
  return {
    storage_key: row.storage_key,
    source_pdf: row.source_pdf,
    source_locator_surface_manifest_path: row.source_locator_surface_manifest_path,
    q_number: row.q_number,
    page_numbers: row.page_numbers,
    subject_code: '9702',
    visual_review_status: 'accepted',
    review_method: 'external_vlm',
    reviewed_by: 'qwen_vlm_external_authorized',
    reviewed_on: '2026-06-09',
    review_reason: 'Full question boundary visible; text and options legible; no cuts.',
    review_warnings: [],
    visual_evidence_paths: row.review_crop_paths,
    external_vlm_or_api_used: true,
    production_ready_claimed: false,
    normalized_text_generated: false,
    authority_alignment_generated: false,
    db_search_read_model_rag_writes: 0,
    ...overrides,
  };
}

describe('9702 question plain text v1 builder', () => {
  test('uses Phase 5 visual sidecar rows to select accepted 9702 surfaces', async () => {
    const root = fixtureRoot();
    const q1 = surfaceRow();
    const q2 = surfaceRow({
      storage_key: '9702/m17_qp_12/questions/q02.png',
      q_number: 2,
      locator: {
        method: 'fitz_text_words_left_margin_question_header_9702_v1',
        page_index: 3,
        page_number: 4,
        text: '2',
        x: 49.6,
        y: 142,
      },
      page_range: {
        start_page_index: 3,
        end_page_index: 3,
        start_page_number: 4,
        end_page_number: 4,
      },
    });

    writeJson(root, 'data/manifests/9702_p1_m_historical_001_page_chain_surface_v1.json', {
      schema_version: '9702_full_page_chain_surface_v1',
      manifest_id: '9702_p1_m_historical_001_page_chain_surface_v1',
      subject_code: '9702',
      item_count: 2,
      items: [q1, q2],
    });
    writeJson(root, 'data/manifests/9702_visual_review_2026_06_09_manifest_v1.json', {
      schema_version: '9702_visual_review_sidecar_manifest_v1',
      subject_code: '9702',
      item_count: 2,
      items: [visualRow(q1), visualRow(q2)],
    });

    const layer = await build9702QuestionPlainTextV1Layer({
      rootDir: root,
      generatedOn: '2026-06-10',
      pdfTextBySourcePdf: {
        [q1.source_pdf]: {
          status: 'available',
          page_heights: {
            3: 842,
          },
          pages: {
            3: [
              textItem('1', 49, 760),
              textItem('Which expression has the same base units as pressure?', 72, 760),
              textItem('A', 72, 735),
              textItem('force', 92, 735),
              textItem('x', 130, 735),
              textItem('area', 142, 735),
              textItem('B force / area', 72, 715),
              textItem('2', 49, 700),
              textItem('The diagram shows a ray passing through glass.', 72, 700),
              textItem('Calculate the angle of refraction.', 72, 680),
              textItem('9702/12/F/M/17', 470, 650),
            ],
          },
        },
      },
    });

    expect(layer.status).toBe('pass');
    expect(layer.schema_version).toBe('9702_question_plain_text_v1');
    expect(layer.summary).toMatchObject({
      production_rows: 2,
      plain_text_rows: 2,
      visual_review_accepted_rows: 2,
      text_only_ready_rows: 1,
      image_context_required_rows: 1,
      blockers: 0,
    });
    expect(layer.items[0]).toMatchObject({
      storage_key: q1.storage_key,
      subject_code: '9702',
      source_surface_manifest: q1.source_locator_surface_manifest_path,
      source_surface_manifest_index: 0,
      text_only_ready: true,
      image_context_required: false,
    });
    expect(layer.items[0].plain_text).toContain('A force x area');
    expect(layer.items[0].plain_text).toContain('B force / area');
    expect(layer.items[1]).toMatchObject({
      storage_key: q2.storage_key,
      has_diagram: true,
      image_context_required: true,
      quality_flags: [],
    });
    expect(layer.items[1].plain_text).not.toContain('9702/12/F/M/17');
  });
});
