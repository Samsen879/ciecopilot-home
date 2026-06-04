import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  build9231VisualReviewWave1Gate,
  write9231VisualReviewWave1GateArtifacts,
} from '../build_9231_visual_review_wave1_gate.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9231-visual-review-wave1-'));
}

function writeJson(root, repoPath, payload) {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function readJson(root, repoPath) {
  return JSON.parse(fs.readFileSync(path.join(root, repoPath), 'utf8'));
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
    crop_status: 'complete',
    surface_evidence_status: 'local_pilot_crop_render_complete_pending_visual_review',
    page_chain_surface_status: 'pilot_crop_render_complete_pending_visual_review',
    text_evidence_status: 'not_extracted',
    normalized_plain_text: null,
    text_only_ready: false,
    image_context_required: true,
    visual_review_required: true,
    production_ready_claimed: false,
    db_consumption_claimed: false,
    search_consumption_claimed: false,
    rag_consumption_claimed: false,
    external_vlm_or_api_used: false,
    external_ocr_rerun_used: false,
    ...overrides,
  };
}

function baseSelectionItem(overrides = {}) {
  const surfaceItem = baseSurfaceItem(overrides);
  return {
    shard_id: surfaceItem.shard_id,
    source_manifest: 'data/manifests/9231_p1_s16_standard_001_page_chain_surface_v1.json',
    source_manifest_index: 0,
    storage_key: surfaceItem.storage_key,
    source_pdf: surfaceItem.source_pdf,
    q_number: surfaceItem.q_number,
    crop_status: surfaceItem.crop_status,
    production_ready_wave1_status: 'production_blocked_pending_visual_text_authority_consumption',
    local_surface_ready: true,
    production_ready_claimed: false,
  };
}

function baseAcceptedReview(overrides = {}) {
  return {
    storage_key: '9231/s16_qp_11/questions/q01.png',
    source_pdf_path: 'data/past-papers/9231Further-Mathematics/paper1/9231_s16_qp_11.pdf',
    shard_id: '9231_p1_s16_standard_001',
    q_number: 1,
    page_numbers: [2],
    review_crop_paths: ['data/crops/9231/q01.png'],
    targeted_stack_image_path: 'tmp/9231-visual-review-wave1/stacks/q01.png',
    status: 'accepted',
    visual_review_status: 'accepted',
    reviewed_by: 'qwen_vlm_external_authorized',
    reviewed_on: '2026-06-05',
    external_vlm_or_api_used: true,
    vlm_model: 'qwen3-vl-plus',
    vlm_transport: 'qwen_openai_client_v1',
    vlm_response_id: 'chatcmpl-test',
    vlm_checked: {
      question_boundary_accepted: true,
      visual_legibility_accepted: true,
      cross_page_continuity_accepted: null,
      diagram_or_table_presence_accepted: true,
    },
    vlm_blockers: [],
    vlm_warnings: [],
    vlm_notes: '',
    ...overrides,
  };
}

function writeFixture(root, { selectionItems, surfaceItems, reviewItems }) {
  writeJson(root, 'data/manifests/9231_production_ready_wave1_16_2026_06_05_manifest_v1.json', {
    schema_version: '9231_production_ready_wave1_manifest_v1',
    generated_on: '2026-06-05',
    subject_code: '9231',
    boundary: {
      not_question_plain_text_v1_or_v2: true,
      not_db_search_rag_consumption_gate: true,
      not_final_production_ready: true,
    },
    summary: {
      selected_shards: 1,
      selected_rows: selectionItems.length,
    },
    items: selectionItems,
  });
  writeJson(root, 'data/manifests/9231_p1_s16_standard_001_page_chain_surface_v1.json', {
    schema_version: '9231_question_shard_split_page_chain_surface_v1',
    subject_code: '9231',
    shard_id: '9231_p1_s16_standard_001',
    items: surfaceItems,
  });
  writeJson(root, 'docs/reports/2026-06-05-9231-visual-review-wave1-vlm.json', {
    schema_version: '9231_visual_review_wave1_vlm_v1',
    generated_on: '2026-06-05',
    summary: {
      items: reviewItems.length,
      accepted: reviewItems.filter((item) => item.status === 'accepted').length,
      rejected: reviewItems.filter((item) => item.status !== 'accepted').length,
    },
    items: reviewItems,
  });
}

describe('9231 visual review wave1 gate', () => {
  test('marks accepted VLM visual review rows on surfaces and selection manifest', () => {
    const root = fixtureRoot();
    writeFixture(root, {
      selectionItems: [baseSelectionItem()],
      surfaceItems: [baseSurfaceItem()],
      reviewItems: [baseAcceptedReview()],
    });

    const result = build9231VisualReviewWave1Gate({
      rootDir: root,
    });

    expect(result.status).toBe('pass');
    expect(result.summary).toMatchObject({
      selected_rows: 1,
      reviewed_rows: 1,
      accepted_rows: 1,
      rejected_rows: 0,
      missing_review_rows: 0,
      updated_surface_manifests: 1,
      blocker_count: 0,
    });
    expect(result.updated_surfaces[0].payload.items[0]).toMatchObject({
      surface_evidence_status: 'external_vlm_visual_review_accepted',
      page_chain_surface_status: 'crop_render_complete_external_vlm_visual_review_accepted',
      visual_review_status: 'accepted',
      visual_review_required: false,
      visual_review_method: 'qwen_vlm_external_authorized',
      external_vlm_or_api_used: true,
      external_ocr_rerun_used: false,
      production_ready_claimed: false,
      db_consumption_claimed: false,
      search_consumption_claimed: false,
      rag_consumption_claimed: false,
    });

    write9231VisualReviewWave1GateArtifacts(result, { rootDir: root });
    const persistedSurface = readJson(root, 'data/manifests/9231_p1_s16_standard_001_page_chain_surface_v1.json');
    const persistedSelection = readJson(root, 'data/manifests/9231_production_ready_wave1_16_2026_06_05_manifest_v1.json');
    expect(persistedSurface.visual_review_wave1_gate).toMatchObject({
      status: 'pass',
      external_vlm_or_api_used_for_visual_review: true,
      production_ready_claimed: false,
    });
    expect(persistedSelection.visual_review_wave1_gate).toMatchObject({
      status: 'pass',
      accepted_rows: 1,
      blocked_rows: 0,
    });
  });

  test('blocks rows missing VLM visual review evidence', () => {
    const root = fixtureRoot();
    const reviewed = baseSurfaceItem();
    const missing = baseSurfaceItem({
      storage_key: '9231/s16_qp_11/questions/q02.png',
      q_number: 2,
    });
    writeFixture(root, {
      selectionItems: [
        baseSelectionItem(),
        baseSelectionItem({
          storage_key: missing.storage_key,
          q_number: 2,
        }),
      ],
      surfaceItems: [reviewed, missing],
      reviewItems: [baseAcceptedReview()],
    });

    const result = build9231VisualReviewWave1Gate({
      rootDir: root,
    });

    expect(result.status).toBe('blocked');
    expect(result.summary).toMatchObject({
      selected_rows: 2,
      reviewed_rows: 1,
      accepted_rows: 1,
      missing_review_rows: 1,
      blocker_count: 1,
    });
    expect(result.blockers[0]).toMatchObject({
      check: 'missing_vlm_visual_review',
      storage_key: missing.storage_key,
    });
    expect(result.updated_surfaces[0].payload.items[1]).toMatchObject({
      visual_review_status: 'missing',
      visual_review_required: true,
      production_ready_claimed: false,
    });
  });
});
