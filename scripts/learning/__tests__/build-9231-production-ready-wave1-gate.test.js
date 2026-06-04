import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  DEFAULT_SELECTED_9231_PRODUCTION_READY_WAVE1_SHARDS,
  build9231ProductionReadyWave1Gate,
  render9231ProductionReadyShardMarkdown,
  write9231ProductionReadyWave1Outputs,
} from '../build_9231_production_ready_wave1_gate.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9231-production-ready-wave1-'));
}

function writeJson(root, repoPath, payload) {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function writeText(root, repoPath, text = 'x') {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function row(overrides = {}) {
  return {
    storage_key: '9231/s25_qp_11/questions/q01.png',
    source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf',
    source_pdf_stem: '9231_s25_qp_11',
    q_number: 1,
    locator_status: 'resolved',
    crop_status: 'complete',
    crop_paths: ['data/crops/9231-pilot-shards/9231_p1_s25_standard_001/question-crops/9231_s25_qp_11/q01/q01_page_002.png'],
    review_crop_paths: ['data/crops/9231-pilot-shards/9231_p1_s25_standard_001/question-crops/9231_s25_qp_11/q01/q01_page_002.png'],
    rendered_pdf_page_paths: ['data/crops/9231-pilot-shards/9231_p1_s25_standard_001/renders/9231_s25_qp_11/9231_s25_qp_11_page_002.png'],
    text_evidence_status: 'not_extracted',
    normalized_plain_text: null,
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

function surface(shardId, items) {
  return {
    schema_version: '9231_question_shard_split_page_chain_surface_v1',
    manifest_id: `${shardId}_page_chain_surface_v1`,
    subject_code: '9231',
    shard_id: shardId,
    paper: 1,
    session_year: 's25',
    surface_status: 'pilot_crop_render_complete_pending_visual_review',
    item_count: items.length,
    source_pdf_count: 1,
    items,
  };
}

describe('9231 production-ready wave1 gate', () => {
  test('default selected shard set contains 16 shard ids', () => {
    expect(DEFAULT_SELECTED_9231_PRODUCTION_READY_WAVE1_SHARDS).toHaveLength(16);
    expect(DEFAULT_SELECTED_9231_PRODUCTION_READY_WAVE1_SHARDS).toContain('9231_p4_w25_standard_001');
  });

  test('marks a clean crop-complete shard local-surface-ready while blocking production readiness', () => {
    const root = fixtureRoot();
    const shardId = '9231_p1_s25_standard_001';
    const surfacePath = `data/manifests/${shardId}_page_chain_surface_v1.json`;
    writeJson(root, 'data/manifests/9231_question_shard_split_2026_06_04_manifest_v1.json', {
      shards: [{ shard_id: shardId, page_chain_surface_manifest_path: surfacePath }],
    });
    writeJson(root, surfacePath, surface(shardId, [row()]));
    writeText(root, 'data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf');
    writeText(root, 'data/crops/9231-pilot-shards/9231_p1_s25_standard_001/question-crops/9231_s25_qp_11/q01/q01_page_002.png');
    writeText(root, 'data/crops/9231-pilot-shards/9231_p1_s25_standard_001/renders/9231_s25_qp_11/9231_s25_qp_11_page_002.png');

    const result = build9231ProductionReadyWave1Gate({
      rootDir: root,
      generatedOn: '2026-06-05',
      selectedShardIds: [shardId],
      inspectPdfTextLayer: false,
    });

    expect(result.summary).toMatchObject({
      selected_shards: 1,
      selected_rows: 1,
      local_surface_ready_shards: 1,
      production_ready_shards: 0,
      production_blocked_shards: 1,
      frozen_wm_rows: 0,
      positive_consumption_claims: 0,
    });
    expect(result.shards[0]).toMatchObject({
      shard_id: shardId,
      gate_status: 'production_blocked_pending_visual_text_authority_consumption',
      local_surface_ready: true,
      production_ready_claimed: false,
      db_search_rag_consumption_claimed: false,
    });
    expect(result.shards[0].blockers.map((blocker) => blocker.check)).toEqual([
      'visual_review_not_accepted',
      'question_plain_text_not_ready',
      'authority_alignment_missing',
      'db_search_rag_consumption_not_proven',
    ]);
  });

  test('blocks a shard containing frozen WM rows before local surface readiness', () => {
    const root = fixtureRoot();
    const shardId = '9231_p1_s20_standard_001';
    const surfacePath = `data/manifests/${shardId}_page_chain_surface_v1.json`;
    writeJson(root, 'data/manifests/9231_question_shard_split_2026_06_04_manifest_v1.json', {
      shards: [{ shard_id: shardId, page_chain_surface_manifest_path: surfacePath }],
    });
    writeJson(root, surfacePath, surface(shardId, [row({
      source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_11.pdf',
      source_freeze_status: 'frozen_pending_source_remediation',
      source_cleanliness_status: 'watermarked_source_frozen',
    })]));

    const result = build9231ProductionReadyWave1Gate({
      rootDir: root,
      generatedOn: '2026-06-05',
      selectedShardIds: [shardId],
      inspectPdfTextLayer: false,
    });

    expect(result.shards[0].local_surface_ready).toBe(false);
    expect(result.shards[0].blockers).toContainEqual(expect.objectContaining({
      check: 'frozen_wm_source_rows_present',
      count: 1,
    }));
  });

  test('writes aggregate report, per-shard reports, and updates selected surfaces', () => {
    const root = fixtureRoot();
    const shardId = '9231_p1_s25_standard_001';
    const surfacePath = `data/manifests/${shardId}_page_chain_surface_v1.json`;
    writeJson(root, 'data/manifests/9231_question_shard_split_2026_06_04_manifest_v1.json', {
      shards: [{ shard_id: shardId, page_chain_surface_manifest_path: surfacePath }],
    });
    writeJson(root, surfacePath, surface(shardId, [row()]));
    writeText(root, 'data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf');
    writeText(root, 'data/crops/9231-pilot-shards/9231_p1_s25_standard_001/question-crops/9231_s25_qp_11/q01/q01_page_002.png');
    writeText(root, 'data/crops/9231-pilot-shards/9231_p1_s25_standard_001/renders/9231_s25_qp_11/9231_s25_qp_11_page_002.png');

    const result = build9231ProductionReadyWave1Gate({
      rootDir: root,
      generatedOn: '2026-06-05',
      selectedShardIds: [shardId],
      inspectPdfTextLayer: false,
    });
    const paths = write9231ProductionReadyWave1Outputs(result, { rootDir: root });

    expect(fs.existsSync(path.join(root, paths.jsonOut))).toBe(true);
    expect(fs.existsSync(path.join(root, paths.markdownOut))).toBe(true);
    expect(fs.existsSync(path.join(root, 'docs/reports/2026-06-05-9231-p1-s25-standard-001-production-ready-closeout.md'))).toBe(true);
    const updatedSurface = JSON.parse(fs.readFileSync(path.join(root, surfacePath), 'utf8'));
    expect(updatedSurface.production_ready_wave1_gate.gate_status)
      .toBe('production_blocked_pending_visual_text_authority_consumption');
    expect(updatedSurface.items[0].production_ready_claimed).toBe(false);
  });

  test('renders markdown without claiming 9231 production-ready', () => {
    const markdown = render9231ProductionReadyShardMarkdown({
      generated_on: '2026-06-05',
      shard_id: '9231_p1_s25_standard_001',
      gate_status: 'production_blocked_pending_visual_text_authority_consumption',
      local_surface_ready: true,
      production_ready_claimed: false,
      db_search_rag_consumption_claimed: false,
      summary: {
        row_count: 1,
        source_pdf_count: 1,
        crop_complete_rows: 1,
        frozen_wm_rows: 0,
      },
      blockers: [{ check: 'question_plain_text_not_ready', count: 1 }],
      artifacts: {
        surface_manifest: 'data/manifests/9231_p1_s25_standard_001_page_chain_surface_v1.json',
      },
    });

    expect(markdown).toContain('production_blocked_pending_visual_text_authority_consumption');
    expect(markdown).toContain('production_ready_claimed: `false`');
    expect(markdown).not.toContain('9231 production-ready');
  });
});
