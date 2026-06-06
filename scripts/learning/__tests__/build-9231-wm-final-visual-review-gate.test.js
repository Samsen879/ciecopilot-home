import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  build9231WmFinalVisualReviewGate,
  write9231WmFinalVisualReviewGateArtifacts,
} from '../build_9231_wm_final_visual_review_gate.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9231-wm-final-visual-review-'));
}

function writeJson(root, repoPath, payload) {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeFile(root, repoPath, contents = 'stack') {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function readJson(root, repoPath) {
  return JSON.parse(fs.readFileSync(path.join(root, repoPath), 'utf8'));
}

function sourceManifestPath(shardId) {
  return `data/manifests/${shardId}_page_chain_surface_v1.json`;
}

function baseSurfaceItem(overrides = {}) {
  return {
    storage_key: '9231/w19_qp_11/questions/q01.png',
    subject_code: '9231',
    syllabus_code: '9231',
    shard_id: '9231_p1_w19_standard_001',
    source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/WM_9231_w19_qp_11.pdf',
    q_number: 1,
    crop_status: 'complete',
    review_crop_paths: [
      'data/crops/9231-wm-final/9231_p1_w19_standard_001/question-crops/WM_9231_w19_qp_11/q01/q01_page_002.png',
    ],
    surface_evidence_status: 'local_wm_final_crop_render_complete_pending_visual_review',
    page_chain_surface_status: 'wm_final_crop_render_complete_pending_visual_review',
    visual_review_required: true,
    visual_review_reason: 'local_wm_final_crop_render_complete_pending_visual_review_not_vlm_reviewed',
    production_ready_claimed: false,
    db_consumption_claimed: false,
    search_consumption_claimed: false,
    rag_consumption_claimed: false,
    external_vlm_or_api_used: false,
    external_ocr_rerun_used: false,
    source_remediation_status: 'source_bytes_clean_red_pixel_gate_pass',
    source_freeze_status: 'source_remediated_crop_render_complete',
    source_cleanliness_status: 'wm_source_remediated_machine_gate_pass',
    ...overrides,
  };
}

function baseCropItem(overrides = {}) {
  const surface = baseSurfaceItem(overrides);
  return {
    storage_key: surface.storage_key,
    shard_id: surface.shard_id,
    source_pdf: surface.source_pdf,
    q_number: surface.q_number,
    crop_status: surface.crop_status,
    review_crop_paths: surface.review_crop_paths,
    wm_final_crop_phase: 'w19_generated_after_source_remediation',
    source_remediation_status: 'source_bytes_clean_red_pixel_gate_pass',
    source_freeze_status: 'source_remediated_crop_render_complete',
    source_cleanliness_status: 'wm_source_remediated_machine_gate_pass',
    production_ready_claimed: false,
    db_consumption_claimed: false,
    search_consumption_claimed: false,
    rag_consumption_claimed: false,
    external_vlm_or_api_used: false,
    external_ocr_rerun_used: false,
    ...overrides,
  };
}

function baseAcceptedReview(overrides = {}) {
  return {
    storage_key: '9231/w19_qp_11/questions/q01.png',
    source_pdf_path: 'data/past-papers/9231Further-Mathematics/paper1/WM_9231_w19_qp_11.pdf',
    shard_id: '9231_p1_w19_standard_001',
    q_number: 1,
    page_numbers: [2],
    review_crop_paths: [
      'data/crops/9231-wm-final/9231_p1_w19_standard_001/question-crops/WM_9231_w19_qp_11/q01/q01_page_002.png',
    ],
    targeted_stack_image_path: 'data/crops/9231-wm-final-visual-review-stacks/9231_p1_w19_standard_001/WM_9231_w19_qp_11_q01_visual_review.png',
    status: 'accepted',
    visual_review_status: 'accepted',
    reviewed_by: 'qwen_vlm_external_authorized',
    reviewed_on: '2026-06-07',
    external_vlm_or_api_used: true,
    vlm_model: 'qwen3-vl-plus',
    vlm_transport: 'qwen_openai_client_v1',
    vlm_response_id: 'chatcmpl-test',
    vlm_usage: {
      prompt_tokens: 120,
      completion_tokens: 18,
      total_tokens: 138,
    },
    vlm_checked: {
      question_boundary_accepted: true,
      visual_legibility_accepted: true,
      cross_page_continuity_accepted: null,
      diagram_or_table_presence_accepted: true,
    },
    vlm_blockers: [],
    vlm_warnings: [],
    vlm_notes: 'The crop is legible and contains the printed question boundary.',
    ...overrides,
  };
}

function writeFixture(root, { cropItems, surfaceItemsByShard, reviewItems }) {
  writeJson(root, 'docs/reports/2026-06-06-9231-wm-source-remediation-gate.json', {
    schema_version: '9231_wm_source_remediation_gate_v1',
    gate_status: 'pass',
    summary: {
      affected_frozen_rows: cropItems.length,
      affected_shard_count: Object.keys(surfaceItemsByShard).length,
      total_after_red_pixels: 0,
      freeze_posture_lifted_by_machine_gate: true,
    },
  });
  writeJson(root, 'docs/reports/2026-06-06-9231-wm-final-crop-render-gate.json', {
    schema_version: '9231_wm_final_crop_render_gate_v1',
    gate_status: 'wm_final_crop_render_complete_pending_visual_review',
    summary: {
      surface_rows_updated: cropItems.length,
      total_rows: cropItems.length,
      crop_rows_complete: cropItems.length,
      missing_crops: 0,
      blocker_rows: 0,
      row_identity_preserved: true,
    },
  });
  writeJson(root, 'data/manifests/9231_wm_final_crop_manifest_2026_06_06_v1.json', {
    schema_version: '9231_wm_final_crop_manifest_v1',
    generated_on: '2026-06-06',
    item_count: cropItems.length,
    items: cropItems,
  });
  for (const [shardId, surfaceItems] of Object.entries(surfaceItemsByShard)) {
    writeJson(root, sourceManifestPath(shardId), {
      schema_version: '9231_question_shard_split_page_chain_surface_v1',
      subject_code: '9231',
      shard_id: shardId,
      item_count: surfaceItems.length,
      items: surfaceItems,
    });
  }
  writeJson(root, 'docs/reports/2026-06-07-9231-wm-final-visual-review-vlm.json', {
    schema_version: '9231_wm_final_visual_review_vlm_v1',
    generated_on: '2026-06-07',
    reviewed_by: 'qwen_vlm_external_authorized',
    transport: 'qwen_openai_client_v1',
    model: 'qwen3-vl-plus',
    summary: {
      items: reviewItems.length,
      accepted: reviewItems.filter((item) => item.status === 'accepted').length,
      rejected: reviewItems.filter((item) => item.status !== 'accepted').length,
    },
    items: reviewItems,
  });
  for (const item of reviewItems) {
    if (item.targeted_stack_image_path) {
      writeFile(root, item.targeted_stack_image_path);
    }
  }
}

describe('9231 WM-final visual review gate', () => {
  test('marks accepted VLM review rows on WM-final surfaces', () => {
    const root = fixtureRoot();
    const secondShard = '9231_p2_w19_standard_001';
    const secondStorageKey = '9231/w19_qp_21/questions/q01.png';
    const secondSurface = baseSurfaceItem({
      storage_key: secondStorageKey,
      shard_id: secondShard,
      source_pdf: 'data/past-papers/9231Further-Mathematics/paper2/WM_9231_w19_qp_21.pdf',
    });
    writeFixture(root, {
      cropItems: [baseCropItem(), baseCropItem(secondSurface)],
      surfaceItemsByShard: {
        '9231_p1_w19_standard_001': [baseSurfaceItem()],
        [secondShard]: [secondSurface],
      },
      reviewItems: [
        baseAcceptedReview(),
        baseAcceptedReview({
          storage_key: secondStorageKey,
          shard_id: secondShard,
          source_pdf_path: secondSurface.source_pdf,
          vlm_response_id: 'chatcmpl-test-2',
        }),
      ],
    });

    const result = build9231WmFinalVisualReviewGate({
      rootDir: root,
      expectedShardCounts: {
        '9231_p1_w19_standard_001': 1,
        [secondShard]: 1,
      },
    });

    expect(result.status).toBe('pass');
    expect(result.summary).toMatchObject({
      selected_shards: 2,
      selected_rows: 2,
      reviewed_rows: 2,
      accepted_rows: 2,
      rejected_rows: 0,
      missing_review_rows: 0,
      updated_surface_manifests: 2,
      blocker_count: 0,
    });
    expect(result.summary.vlm_usage).toEqual({
      prompt_tokens: 240,
      completion_tokens: 36,
      total_tokens: 276,
    });

    write9231WmFinalVisualReviewGateArtifacts(result, { rootDir: root });
    const persistedSurface = readJson(root, sourceManifestPath('9231_p1_w19_standard_001'));
    expect(persistedSurface.visual_review_wm_final_gate).toMatchObject({
      status: 'pass',
      accepted_rows: 1,
      source_vlm_review_json: 'docs/reports/2026-06-07-9231-wm-final-visual-review-vlm.json',
      external_vlm_or_api_used_for_visual_review: true,
    });
    expect(persistedSurface.items[0]).toMatchObject({
      surface_evidence_status: 'external_vlm_wm_final_visual_review_accepted',
      page_chain_surface_status: 'wm_final_crop_render_external_vlm_visual_review_accepted',
      visual_review_status: 'accepted',
      visual_review_required: false,
      visual_review_method: 'qwen_vlm_external_authorized',
      visual_review_vlm_response_id: 'chatcmpl-test',
      external_vlm_or_api_used: true,
      external_ocr_rerun_used: false,
      production_ready_claimed: false,
      db_consumption_claimed: false,
      search_consumption_claimed: false,
      rag_consumption_claimed: false,
    });
  });

  test('blocks missing or rejected VLM evidence', () => {
    const root = fixtureRoot();
    const rejectedStorageKey = '9231/w19_qp_11/questions/q02.png';
    writeFixture(root, {
      cropItems: [
        baseCropItem(),
        baseCropItem({ storage_key: rejectedStorageKey, q_number: 2 }),
      ],
      surfaceItemsByShard: {
        '9231_p1_w19_standard_001': [
          baseSurfaceItem(),
          baseSurfaceItem({ storage_key: rejectedStorageKey, q_number: 2 }),
        ],
      },
      reviewItems: [
        baseAcceptedReview(),
        baseAcceptedReview({
          storage_key: rejectedStorageKey,
          q_number: 2,
          status: 'rejected',
          visual_review_status: 'rejected',
          vlm_checked: {
            question_boundary_accepted: false,
            visual_legibility_accepted: true,
            cross_page_continuity_accepted: null,
            diagram_or_table_presence_accepted: true,
          },
          vlm_blockers: ['question boundary is cut off'],
        }),
      ],
    });

    const result = build9231WmFinalVisualReviewGate({
      rootDir: root,
      expectedShardCounts: {
        '9231_p1_w19_standard_001': 2,
      },
    });

    expect(result.status).toBe('blocked');
    expect(result.summary).toMatchObject({
      selected_rows: 2,
      reviewed_rows: 2,
      accepted_rows: 1,
      rejected_rows: 1,
      missing_review_rows: 0,
      blocker_count: 1,
    });
    expect(result.blockers[0]).toMatchObject({
      check: 'vlm_visual_review_not_accepted',
      storage_key: rejectedStorageKey,
    });
    expect(result.updated_surfaces[0].payload.items[1]).toMatchObject({
      visual_review_status: 'rejected',
      visual_review_required: true,
      production_ready_claimed: false,
    });
  });
});
