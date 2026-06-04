import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  build9231WmSourceFreezeGate,
  render9231WmSourceFreezeMarkdown,
  write9231WmSourceFreezeOutputs,
} from '../build_9231_wm_source_freeze_gate.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9231-wm-source-freeze-'));
}

function writeJson(root, repoPath, payload) {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
  return filePath;
}

function surfacePayload(shardId, items) {
  return {
    schema_version: '9231_question_shard_split_page_chain_surface_v1',
    manifest_id: `${shardId}_page_chain_surface_v1`,
    shard_id: shardId,
    surface_status: 'locator_rows_ready_pending_crop_render_visual_review',
    item_count: items.length,
    items,
  };
}

function row(overrides = {}) {
  return {
    storage_key: '9231/s20_qp_11/questions/q01.png',
    source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_11.pdf',
    source_pdf_stem: 'WM_9231_s20_qp_11',
    q_number: 1,
    crop_status: 'complete',
    text_only_ready: false,
    image_context_required: true,
    production_ready_claimed: false,
    db_consumption_claimed: false,
    search_consumption_claimed: false,
    rag_consumption_claimed: false,
    ...overrides,
  };
}

describe('9231 WM source freeze gate', () => {
  test('freezes only WM source rows while preserving deterministic crop status', () => {
    const root = fixtureRoot();
    const wmShardId = '9231_p1_s20_standard_001';
    const cleanShardId = '9231_p1_s24_standard_001';
    writeJson(root, 'data/manifests/9231_question_shard_split_2026_06_04_manifest_v1.json', {
      shards: [
        {
          shard_id: wmShardId,
          page_chain_surface_manifest_path: `data/manifests/${wmShardId}_page_chain_surface_v1.json`,
        },
        {
          shard_id: cleanShardId,
          page_chain_surface_manifest_path: `data/manifests/${cleanShardId}_page_chain_surface_v1.json`,
        },
      ],
    });
    writeJson(root, `data/manifests/${wmShardId}_page_chain_surface_v1.json`, surfacePayload(wmShardId, [
      row(),
      row({
        storage_key: '9231/s20_qp_11/questions/q02.png',
        q_number: 2,
      }),
    ]));
    writeJson(root, `data/manifests/${cleanShardId}_page_chain_surface_v1.json`, surfacePayload(cleanShardId, [
      row({
        storage_key: '9231/s24_qp_11/questions/q01.png',
        source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/9231_s24_qp_11.pdf',
        source_pdf_stem: '9231_s24_qp_11',
      }),
    ]));

    const result = build9231WmSourceFreezeGate({
      rootDir: root,
      generatedOn: '2026-06-05',
    });

    expect(result.gate_status).toBe('wm_source_frozen_pending_source_remediation');
    expect(result.summary).toMatchObject({
      current_surface_manifest_count: 2,
      scanned_row_count: 3,
      frozen_row_count: 2,
      frozen_source_pdf_count: 1,
      affected_shard_count: 1,
      clean_source_row_count: 1,
      frozen_crop_status_counts: { complete: 2 },
      mechanical_crop_blocker_rows: 0,
      production_ready_claimed: false,
      db_search_rag_consumption_claimed: false,
    });
    expect(result.freeze_manifest.items).toHaveLength(2);
    expect(result.updated_surfaces).toHaveLength(1);

    const frozen = result.updated_surfaces[0].payload.items[0];
    expect(frozen.crop_status).toBe('complete');
    expect(frozen.source_freeze_status).toBe('frozen_pending_source_remediation');
    expect(frozen.source_cleanliness_status).toBe('watermarked_source_frozen');
    expect(frozen.eligible_for_clean_source_wave).toBe(false);
    expect(frozen.eligible_for_question_plain_text_v1).toBe(false);
    expect(frozen.eligible_for_question_plain_text_v2).toBe(false);
    expect(frozen.eligible_for_normalized_plain_text_consumption_gate).toBe(false);
    expect(frozen.production_ready_claimed).toBe(false);
    expect(frozen.db_consumption_claimed).toBe(false);
    expect(frozen.search_consumption_claimed).toBe(false);
    expect(frozen.rag_consumption_claimed).toBe(false);
  });

  test('writes freeze manifest, reports, and affected surface updates', () => {
    const root = fixtureRoot();
    const shardId = '9231_p2_w19_standard_001';
    const surfacePath = `data/manifests/${shardId}_page_chain_surface_v1.json`;
    writeJson(root, 'data/manifests/9231_question_shard_split_2026_06_04_manifest_v1.json', {
      shards: [{ shard_id: shardId, page_chain_surface_manifest_path: surfacePath }],
    });
    writeJson(root, surfacePath, surfacePayload(shardId, [
      row({
        storage_key: '9231/w19_qp_21/questions/q01.png',
        source_pdf: 'data/past-papers/9231Further-Mathematics/paper2/WM_9231_w19_qp_21.pdf',
        source_pdf_stem: 'WM_9231_w19_qp_21',
      }),
    ]));

    const result = build9231WmSourceFreezeGate({
      rootDir: root,
      generatedOn: '2026-06-05',
    });
    const paths = write9231WmSourceFreezeOutputs(result, {
      rootDir: root,
      manifestOut: 'data/manifests/9231_wm_source_freeze_2026_06_05_manifest_v1.json',
      jsonOut: 'docs/reports/2026-06-05-9231-wm-source-freeze-gate.json',
      markdownOut: 'docs/reports/2026-06-05-9231-wm-source-freeze-gate.md',
    });

    expect(fs.existsSync(path.join(root, paths.manifestOut))).toBe(true);
    expect(fs.existsSync(path.join(root, paths.jsonOut))).toBe(true);
    expect(fs.existsSync(path.join(root, paths.markdownOut))).toBe(true);
    const persistedSurface = JSON.parse(fs.readFileSync(path.join(root, surfacePath), 'utf8'));
    expect(persistedSurface.source_freeze_gate.frozen_row_count).toBe(1);
    expect(persistedSurface.items[0].source_freeze_status).toBe('frozen_pending_source_remediation');
  });

  test('renders bounded markdown without turning WM freeze into production or consumption readiness', () => {
    const markdown = render9231WmSourceFreezeMarkdown({
      generated_on: '2026-06-05',
      gate_status: 'wm_source_frozen_pending_source_remediation',
      summary: {
        current_surface_manifest_count: 64,
        scanned_row_count: 1593,
        frozen_row_count: 150,
        frozen_source_pdf_count: 18,
        affected_shard_count: 6,
        clean_source_row_count: 1443,
        frozen_crop_status_counts: { complete: 84, not_generated: 66 },
        mechanical_crop_blocker_rows: 0,
      },
      affected_shards: {
        '9231_p1_s20_standard_001': { frozen_row_count: 21, frozen_source_pdf_count: 3 },
      },
      affected_source_pdfs: {
        'data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_11.pdf': 7,
      },
      artifacts: {
        freeze_manifest: 'data/manifests/9231_wm_source_freeze_2026_06_05_manifest_v1.json',
      },
    });

    expect(markdown).toContain('WM Source Freeze Gate');
    expect(markdown).toContain('frozen rows');
    expect(markdown).toContain('Frozen Crop Status');
    expect(markdown).toContain('not_generated');
    expect(markdown).toContain('mechanical crop blocker rows');
    expect(markdown).toContain('not production-ready');
    expect(markdown).toContain('DB/search/RAG consumption claimed: false');
    expect(markdown).not.toContain('9231 production-ready');
  });
});
