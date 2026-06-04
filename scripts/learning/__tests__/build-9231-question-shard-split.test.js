import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildQuestionShardSplit,
  groupRowsIntoSessionYearShards,
  renderQuestionShardSplitMarkdown,
  shardIdForRow,
} from '../build_9231_question_shard_split.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9231-question-shard-split-'));
}

function writeJson(root, repoPath, payload) {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function baseRow(overrides = {}) {
  return {
    storage_key: '9231/s25_qp_11/questions/q01.png',
    subject_code: '9231',
    syllabus_code: '9231',
    year: 2025,
    session: 's',
    session_year: 's25',
    paper: 1,
    variant: 1,
    q_number: 1,
    source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf',
    source_pdf_page_count: 20,
    source_pdf_stem: '9231_s25_qp_11',
    paper_family: 'standard',
    group_key: 'p1',
    shard_id: '9231_p1_source_locator_001',
    locator_status: 'resolved',
    page_indices: [1],
    page_numbers: [2],
    crop_status: 'not_generated',
    surface_evidence_status: 'locator_resolved_pending_crop_render_and_visual_review',
    text_evidence_status: 'not_extracted',
    normalized_plain_text: null,
    text_only_ready: false,
    image_context_required: true,
    production_ready_claimed: false,
    ...overrides,
  };
}

describe('9231 question shard split builder', () => {
  test('uses 9709-style paper/sessionYear shard ids', () => {
    expect(shardIdForRow(baseRow())).toBe('9231_p1_s25_standard_001');
    expect(shardIdForRow(baseRow({
      paper: 4,
      session_year: 'w24',
      source_pdf: 'data/past-papers/9231Further-Mathematics/paper4/9231_w24_qp_43.pdf',
      storage_key: '9231/w24_qp_43/questions/q06.png',
    }))).toBe('9231_p4_w24_standard_001');
  });

  test('groups rows by paper and session year with stable sorted ordering', () => {
    const groups = groupRowsIntoSessionYearShards([
      baseRow({ q_number: 2, storage_key: '9231/s25_qp_11/questions/q02.png' }),
      baseRow({
        paper: 2,
        session_year: 's25',
        variant: 1,
        storage_key: '9231/s25_qp_21/questions/q01.png',
        source_pdf: 'data/past-papers/9231Further-Mathematics/paper2/9231_s25_qp_21.pdf',
      }),
      baseRow({ q_number: 1 }),
      baseRow({
        session: 'w',
        session_year: 'w24',
        year: 2024,
        storage_key: '9231/w24_qp_11/questions/q01.png',
        source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/9231_w24_qp_11.pdf',
      }),
    ]);

    expect(groups.map((group) => group.shard_id)).toEqual([
      '9231_p1_s25_standard_001',
      '9231_p1_w24_standard_001',
      '9231_p2_s25_standard_001',
    ]);
    expect(groups[0].items.map((row) => row.q_number)).toEqual([1, 2]);
  });

  test('builds split manifests without claiming crop, text, production, or consumption readiness', () => {
    const root = fixtureRoot();
    writeJson(root, 'data/manifests/9231_p1_source_locator_001_page_chain_surface_v1.json', {
      schema_version: '9231_question_row_foundation_page_chain_surface_v1',
      manifest_id: '9231_p1_source_locator_001_page_chain_surface_v1',
      shard_id: '9231_p1_source_locator_001',
      items: [
        baseRow(),
        baseRow({ q_number: 2, storage_key: '9231/s25_qp_11/questions/q02.png' }),
        baseRow({
          session: 'w',
          session_year: 'w24',
          year: 2024,
          storage_key: '9231/w24_qp_11/questions/q01.png',
          source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/9231_w24_qp_11.pdf',
        }),
      ],
    });
    writeJson(root, 'data/manifests/9231_p2_source_locator_001_page_chain_surface_v1.json', {
      schema_version: '9231_question_row_foundation_page_chain_surface_v1',
      manifest_id: '9231_p2_source_locator_001_page_chain_surface_v1',
      shard_id: '9231_p2_source_locator_001',
      items: [
        baseRow({
          paper: 2,
          session_year: 's25',
          variant: 1,
          storage_key: '9231/s25_qp_21/questions/q01.png',
          source_pdf: 'data/past-papers/9231Further-Mathematics/paper2/9231_s25_qp_21.pdf',
        }),
      ],
    });

    const split = buildQuestionShardSplit({
      rootDir: root,
      generatedOn: '2026-06-04',
    });

    expect(split.gate_status).toBe('shard_split_ready_pending_crop_render_text_gates');
    expect(split.summary).toMatchObject({
      source_surface_manifest_count: 2,
      source_row_count: 4,
      shard_count: 3,
      input_manifest_count: 3,
      page_chain_surface_manifest_count: 3,
      question_row_count: 4,
      text_only_ready_rows: 0,
      image_context_required_rows: 4,
      blocker_count: 0,
    });
    expect(split.artifacts.input_manifests[0]).toMatchObject({
      path: 'data/manifests/9231_p1_s25_standard_001_input_v1.json',
      item_count: 2,
    });
    expect(split.artifacts.page_chain_surface_manifests[0]).toMatchObject({
      path: 'data/manifests/9231_p1_s25_standard_001_page_chain_surface_v1.json',
      item_count: 2,
    });
    expect(split.artifacts.page_chain_surface_manifests[0].payload.items[0]).toMatchObject({
      shard_id: '9231_p1_s25_standard_001',
      group_key: 'p1_s25_standard',
      source_locator_shard_id: '9231_p1_source_locator_001',
      crop_status: 'not_generated',
      normalized_plain_text: null,
      production_ready_claimed: false,
      db_consumption_claimed: false,
      search_consumption_claimed: false,
      rag_consumption_claimed: false,
    });
  });

  test('renders a bounded shard split report', () => {
    const split = {
      generated_on: '2026-06-04',
      gate_status: 'shard_split_ready_pending_crop_render_text_gates',
      boundary: {
        production_ready_claimed: false,
      },
      summary: {
        source_row_count: 4,
        shard_count: 3,
        question_row_count: 4,
        text_only_ready_rows: 0,
        image_context_required_rows: 4,
        blocker_count: 0,
        shards_by_paper: { p1: 2, p2: 1 },
        question_rows_by_paper: { p1: 3, p2: 1 },
      },
      artifacts: {
        combined_manifest: { path: 'data/manifests/9231_question_shard_split_2026_06_04_manifest_v1.json' },
        input_manifests: [],
        page_chain_surface_manifests: [],
        reports: { json: 'x.json', markdown: 'x.md' },
      },
      blockers: [],
      workflow_gaps: [],
      verification_inputs: [],
    };

    const markdown = renderQuestionShardSplitMarkdown(split);

    expect(markdown).toContain('shard_split_ready_pending_crop_render_text_gates');
    expect(markdown).toContain('text-only ready rows');
    expect(markdown).toContain('image-context required rows');
    expect(markdown).toContain('not production-ready');
    expect(markdown).toContain('DB/search/RAG consumption claimed | false');
    expect(markdown).not.toContain('9231 production-ready');
  });
});
