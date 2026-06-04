import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  build9231EvidenceLayersWave1Gate,
  write9231EvidenceLayersWave1Artifacts,
} from '../build_9231_evidence_layers_wave1_gate.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9231-evidence-layers-wave1-'));
}

function writeJson(root, repoPath, payload) {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function readJson(root, repoPath) {
  return JSON.parse(fs.readFileSync(path.join(root, repoPath), 'utf8'));
}

function baseRow() {
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
    visual_review_status: 'accepted',
    crop_status: 'complete',
    production_ready_claimed: false,
    db_consumption_claimed: false,
    search_consumption_claimed: false,
    rag_consumption_claimed: false,
  };
}

function writeFixture(root, { includeConsumption = true } = {}) {
  const row = baseRow();
  writeJson(root, 'data/manifests/9231_production_ready_wave1_16_2026_06_05_manifest_v1.json', {
    schema_version: '9231_production_ready_wave1_manifest_v1',
    subject_code: '9231',
    summary: {
      selected_rows: 1,
    },
    items: [{
      shard_id: row.shard_id,
      source_manifest: 'data/manifests/9231_p1_s16_standard_001_page_chain_surface_v1.json',
      source_manifest_index: 0,
      storage_key: row.storage_key,
      source_pdf: row.source_pdf,
      q_number: row.q_number,
      visual_review_wave1_status: 'accepted',
      visual_review_wave1_accepted: true,
      production_ready_claimed: false,
    }],
  });
  writeJson(root, 'data/manifests/9231_p1_s16_standard_001_page_chain_surface_v1.json', {
    schema_version: '9231_question_shard_split_page_chain_surface_v1',
    subject_code: '9231',
    shard_id: row.shard_id,
    items: [row],
  });
  writeJson(root, 'docs/reports/2026-06-05-9231-visual-review-wave1-gate.json', {
    schema_version: '9231_visual_review_wave1_gate_v1',
    status: 'pass',
    items: [row],
  });
  writeJson(root, 'docs/reports/2026-06-05-9231-question-plain-text-v1.json', {
    schema_version: '9231_question_plain_text_v1',
    status: 'pass',
    items: [{
      ...row,
      plain_text: 'Find the cubic equation.',
    }],
  });
  writeJson(root, 'docs/reports/2026-06-05-9231-question-plain-text-v2.json', {
    schema_version: '9231_question_plain_text_v2',
    status: 'pass',
    items: [{
      ...row,
      normalized_plain_text: 'Find the cubic equation.',
      text_only_addressable: true,
      requires_image_context: false,
      primary_topic_path: null,
    }],
  });
  writeJson(root, 'docs/reports/2026-06-05-9231-authority-alignment-wave1.json', {
    schema_version: '9231_authority_alignment_wave1_v1',
    status: 'pass',
    summary: {
      component_aligned_rows: 1,
      topic_hint_rows: 1,
      detailed_topic_unresolved_rows: 0,
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
  writeJson(root, 'docs/reports/2026-06-05-9231-question-plain-text-v2-consumption.json', {
    schema_version: 'question_plain_text_v2_consumption_v1',
    status: 'pass',
    summary: {
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

describe('9231 evidence layers wave1 gate', () => {
  test('passes aligned evidence artifacts and writes normalized text back to surfaces', () => {
    const root = fixtureRoot();
    writeFixture(root);

    const result = build9231EvidenceLayersWave1Gate({ rootDir: root });
    write9231EvidenceLayersWave1Artifacts(result, { rootDir: root });

    expect(result.status).toBe('pass');
    expect(result.production_ready_claimed).toBe(false);
    expect(result.summary).toMatchObject({
      selected_rows: 1,
      visual_review_accepted_rows: 1,
      plain_text_v1_rows: 1,
      normalized_plain_text_rows: 1,
      search_rows_using_normalized_plain_text: 1,
      read_model_rows_using_normalized_plain_text: 1,
      rag_rows_using_normalized_plain_text: 1,
      blockers: 0,
    });
    const surface = readJson(root, 'data/manifests/9231_p1_s16_standard_001_page_chain_surface_v1.json');
    expect(surface.items[0]).toMatchObject({
      text_evidence_status: 'question_plain_text_v2_ready',
      normalized_plain_text: 'Find the cubic equation.',
      primary_topic_path: '9231.p1.polynomials_roots',
      search_read_model_rag_local_consumption_gate_passed: true,
      production_ready_claimed: false,
      db_consumption_claimed: false,
      search_consumption_claimed: false,
      rag_consumption_claimed: false,
    });
  });

  test('blocks when the local consumption row is missing', () => {
    const root = fixtureRoot();
    writeFixture(root, { includeConsumption: false });

    const result = build9231EvidenceLayersWave1Gate({ rootDir: root });

    expect(result.status).toBe('blocked');
    expect(result.blockers).toContainEqual(expect.objectContaining({
      check: 'missing_consumption_row',
      storage_key: '9231/s16_qp_11/questions/q01.png',
    }));
  });
});
