import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  build9231WmFinalEvidenceLayersGate,
  write9231WmFinalEvidenceLayersArtifacts,
} from '../build_9231_wm_final_evidence_layers_gate.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9231-wm-final-evidence-'));
}

function writeJson(root, repoPath, payload) {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function readJson(root, repoPath) {
  return JSON.parse(fs.readFileSync(path.join(root, repoPath), 'utf8'));
}

function sourceManifestPath(shardId) {
  return `data/manifests/${shardId}_page_chain_surface_v1.json`;
}

function baseRow(overrides = {}) {
  return {
    storage_key: '9231/w19_qp_11/questions/q01.png',
    subject_code: '9231',
    syllabus_code: '9231',
    year: 2019,
    session: 'w',
    paper: 1,
    variant: 1,
    q_number: 1,
    source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/WM_9231_w19_qp_11.pdf',
    shard_id: '9231_p1_w19_standard_001',
    crop_status: 'complete',
    surface_evidence_status: 'external_vlm_wm_final_visual_review_accepted',
    page_chain_surface_status: 'wm_final_crop_render_external_vlm_visual_review_accepted',
    visual_review_status: 'accepted',
    production_ready_claimed: false,
    db_consumption_claimed: false,
    search_consumption_claimed: false,
    rag_consumption_claimed: false,
    ...overrides,
  };
}

function writeFixture(root, { includeConsumption = true } = {}) {
  const row = baseRow();
  const shardId = row.shard_id;
  writeJson(root, sourceManifestPath(shardId), {
    schema_version: '9231_question_shard_split_page_chain_surface_v1',
    subject_code: '9231',
    shard_id: shardId,
    item_count: 1,
    items: [row],
  });
  writeJson(root, 'docs/reports/2026-06-07-9231-wm-final-visual-review-gate.json', {
    schema_version: '9231_wm_final_visual_review_gate_v1',
    status: 'pass',
    summary: {
      selected_shards: 1,
      expected_rows: 1,
      selected_rows: 1,
      accepted_rows: 1,
      rejected_rows: 0,
      missing_review_rows: 0,
      blocker_count: 0,
    },
    actual_shard_counts: {
      [shardId]: 1,
    },
  });
  writeJson(root, 'docs/reports/2026-06-07-9231-wm-final-question-plain-text-v1.json', {
    schema_version: '9231_question_plain_text_v1',
    status: 'pass',
    summary: {
      production_rows: 1,
      plain_text_rows: 1,
      blockers: 0,
    },
    items: [{
      ...row,
      plain_text: 'Find the cubic equation.',
    }],
  });
  writeJson(root, 'docs/reports/2026-06-07-9231-wm-final-question-plain-text-v2.json', {
    schema_version: '9231_question_plain_text_v2',
    status: 'pass',
    summary: {
      production_rows: 1,
      v2_rows: 1,
      normalized_plain_text_rows: 1,
      text_only_ready_rows: 1,
      image_context_required_rows: 0,
      image_context_rows_with_assets: 0,
      blockers: 0,
    },
    items: [{
      ...row,
      normalized_plain_text: 'Find the cubic equation.',
      text_only_addressable: true,
      requires_image_context: false,
      primary_topic_path: null,
    }],
  });
  writeJson(root, 'docs/reports/2026-06-07-9231-wm-final-authority-alignment.json', {
    schema_version: '9231_authority_alignment_wave1_v1',
    status: 'pass',
    summary: {
      rows: 1,
      component_aligned_rows: 1,
      topic_hint_rows: 1,
      detailed_topic_unresolved_rows: 0,
      blockers: 0,
    },
    items: [{
      ...row,
      primary_topic_path: '9231.p1.polynomials_roots',
      authority_alignment_status: 'component_aligned_topic_hint_recorded',
      canonical_syllabus_detailed_topic_claimed: false,
      component_authority: {
        status: 'component_aligned_from_paper_code',
      },
    }],
  });
  writeJson(root, 'docs/reports/2026-06-07-9231-wm-final-question-plain-text-v2-consumption.json', {
    schema_version: 'question_plain_text_v2_consumption_v1',
    status: 'pass',
    summary: {
      rows_read: includeConsumption ? 1 : 0,
      normalized_plain_text_rows: includeConsumption ? 1 : 0,
      search_rows_using_normalized_plain_text: includeConsumption ? 1 : 0,
      read_model_rows_using_normalized_plain_text: includeConsumption ? 1 : 0,
      rag_rows_using_normalized_plain_text: includeConsumption ? 1 : 0,
      legacy_search_text_only_rows: 0,
    },
    items: includeConsumption
      ? [{
        ...row,
        normalized_plain_text: 'Find the cubic equation.',
        text_consumption_status: 'text_only_ready',
        search: {
          search_text: 'Find the cubic equation.',
          search_text_source: 'question_plain_text_v2.normalized_plain_text',
        },
        read_model: {
          prompt_representation: {
            type: 'text',
            value: 'Find the cubic equation.',
          },
        },
        rag: {
          content: 'Find the cubic equation.',
          content_source: 'question_plain_text_v2.normalized_plain_text',
        },
      }]
      : [],
  });
}

describe('9231 WM-final evidence layers gate', () => {
  test('passes exact WM-final evidence and writes normalized text back to surfaces', () => {
    const root = fixtureRoot();
    writeFixture(root);

    const result = build9231WmFinalEvidenceLayersGate({
      rootDir: root,
      expectedShardCounts: {
        '9231_p1_w19_standard_001': 1,
      },
      generatedOn: '2026-06-07',
    });
    write9231WmFinalEvidenceLayersArtifacts(result, { rootDir: root });

    expect(result.status).toBe('pass');
    expect(result.production_ready_claimed).toBe(false);
    expect(result.summary).toMatchObject({
      selected_shards: 1,
      selected_rows: 1,
      visual_review_accepted_rows: 1,
      plain_text_v1_rows: 1,
      normalized_plain_text_rows: 1,
      authority_component_aligned_rows: 1,
      search_rows_using_normalized_plain_text: 1,
      read_model_rows_using_normalized_plain_text: 1,
      rag_rows_using_normalized_plain_text: 1,
      legacy_search_text_only_rows: 0,
      blockers: 0,
    });

    const surface = readJson(root, sourceManifestPath('9231_p1_w19_standard_001'));
    expect(surface.evidence_layers_wm_final_gate).toMatchObject({
      status: 'pass',
      selected_rows: 1,
      local_consumption_gate_proven: true,
      live_db_consumption_claimed: false,
    });
    expect(surface.items[0]).toMatchObject({
      text_evidence_status: 'question_plain_text_v2_ready',
      normalized_plain_text: 'Find the cubic equation.',
      text_consumption_status: 'text_only_ready',
      text_only_ready: true,
      image_context_required: false,
      primary_topic_path: '9231.p1.polynomials_roots',
      local_consumption_gate_status: 'text_only_ready',
      search_read_model_rag_local_consumption_gate_passed: true,
      production_ready_claimed: false,
      db_consumption_claimed: false,
      search_consumption_claimed: false,
      rag_consumption_claimed: false,
    });
    expect(fs.existsSync(path.join(
      root,
      'docs/reports/2026-06-07-9231-p1-w19-standard-001-evidence-layers-closeout.json',
    ))).toBe(true);
  });

  test('blocks when a WM-final local consumption row is missing', () => {
    const root = fixtureRoot();
    writeFixture(root, { includeConsumption: false });

    const result = build9231WmFinalEvidenceLayersGate({
      rootDir: root,
      expectedShardCounts: {
        '9231_p1_w19_standard_001': 1,
      },
    });

    expect(result.status).toBe('blocked');
    expect(result.blockers).toContainEqual(expect.objectContaining({
      check: 'missing_consumption_row',
      storage_key: '9231/w19_qp_11/questions/q01.png',
    }));
  });
});
