import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  build9702EvidenceLayersGate,
  write9702EvidenceLayersArtifacts,
} from '../build_9702_evidence_layers_gate.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9702-evidence-layers-'));
}

function writeJson(root, repoPath, payload) {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function readJson(root, repoPath) {
  return JSON.parse(fs.readFileSync(path.join(root, repoPath), 'utf8'));
}

function baseRow(overrides = {}) {
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
    crop_status: 'complete',
    surface_evidence_status: 'local_full_crop_render_complete_pending_visual_review',
    page_chain_surface_status: 'full_crop_render_complete_pending_visual_review',
    text_evidence_status: 'not_extracted',
    normalized_plain_text: null,
    text_consumption_status: 'not_ready_missing_question_plain_text',
    text_only_ready: false,
    image_context_required: true,
    production_ready_claimed: false,
    db_consumption_claimed: false,
    search_consumption_claimed: false,
    rag_consumption_claimed: false,
    ...overrides,
  };
}

function writeFixture(root, { includeConsumption = true } = {}) {
  const row = baseRow();
  const surfaceManifest = row.source_locator_surface_manifest_path;
  writeJson(root, surfaceManifest, {
    schema_version: '9702_full_page_chain_surface_v1',
    manifest_id: '9702_p1_m_historical_001_page_chain_surface_v1',
    subject_code: '9702',
    item_count: 1,
    items: [row],
  });
  writeJson(root, 'data/manifests/9702_visual_review_2026_06_09_manifest_v1.json', {
    schema_version: '9702_visual_review_sidecar_manifest_v1',
    subject_code: '9702',
    item_count: 1,
    items: [{
      storage_key: row.storage_key,
      source_pdf: row.source_pdf,
      source_locator_surface_manifest_path: surfaceManifest,
      q_number: row.q_number,
      subject_code: '9702',
      visual_review_status: 'accepted',
      visual_evidence_paths: ['data/crops/9702/q01.png'],
      external_vlm_or_api_used: true,
      production_ready_claimed: false,
      db_search_read_model_rag_writes: 0,
    }],
  });
  writeJson(root, 'docs/reports/2026-06-09-9702-visual-review-gate.json', {
    schema_version: '9702_visual_review_gate_v1',
    gate_status: 'passed',
    production_ready_claimed: false,
    counts: {
      selected_rows: 1,
      accepted_rows: 1,
      rejected_rows: 0,
      missing_review_rows: 0,
      blocker_count: 0,
    },
  });
  writeJson(root, 'docs/reports/2026-06-10-9702-question-plain-text-v1.json', {
    schema_version: '9702_question_plain_text_v1',
    status: 'pass',
    summary: {
      production_rows: 1,
      plain_text_rows: 1,
      blockers: 0,
    },
    blockers: [],
    items: [{
      ...row,
      plain_text: 'Which expression has the same base units as pressure?',
    }],
  });
  writeJson(root, 'docs/reports/2026-06-10-9702-question-plain-text-v2.json', {
    schema_version: '9702_question_plain_text_v2',
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
    blockers: [],
    items: [{
      ...row,
      normalized_plain_text: 'Which expression has the same base units as pressure?',
      text_only_addressable: true,
      requires_image_context: false,
      primary_topic_path: '9702.p1',
    }],
  });
  writeJson(root, 'docs/reports/2026-06-10-9702-authority-alignment.json', {
    schema_version: '9702_authority_alignment_v1',
    status: 'pass',
    summary: {
      rows: 1,
      component_aligned_rows: 1,
      topic_hint_rows: 1,
      detailed_topic_unresolved_rows: 0,
      canonical_syllabus_detailed_topic_claimed_rows: 0,
      blockers: 0,
    },
    blockers: [],
    items: [{
      ...row,
      primary_topic_path: '9702.p1',
      authority_alignment_status: 'component_aligned_topic_hint_recorded',
      canonical_syllabus_detailed_topic_claimed: false,
      component_authority: {
        status: 'component_aligned_from_paper_code',
        component_path: '9702.p1.c12',
      },
    }],
  });
  writeJson(root, 'docs/reports/2026-06-10-9702-question-plain-text-v2-consumption.json', {
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
    blockers: [],
    items: includeConsumption
      ? [{
        ...row,
        normalized_plain_text: 'Which expression has the same base units as pressure?',
        text_consumption_status: 'text_only_ready',
        search: {
          search_text: 'Which expression has the same base units as pressure?',
          search_text_source: 'question_plain_text_v2.normalized_plain_text',
        },
        read_model: {
          prompt_representation: {
            type: 'text',
            value: 'Which expression has the same base units as pressure?',
          },
        },
        rag: {
          content: 'Which expression has the same base units as pressure?',
          content_source: 'question_plain_text_v2.normalized_plain_text',
        },
      }]
      : [],
  });
}

describe('9702 evidence layers aggregate gate', () => {
  test('passes local evidence layers and writes durable evidence back to source surfaces', () => {
    const root = fixtureRoot();
    writeFixture(root);

    const result = build9702EvidenceLayersGate({
      rootDir: root,
      generatedOn: '2026-06-10',
    });
    write9702EvidenceLayersArtifacts(result, { rootDir: root });

    expect(result.status).toBe('pass');
    expect(result.production_ready_claimed).toBe(false);
    expect(result.summary).toMatchObject({
      selected_surface_manifests: 1,
      selected_rows: 1,
      visual_review_accepted_rows: 1,
      plain_text_v1_rows: 1,
      normalized_plain_text_rows: 1,
      text_only_ready_rows: 1,
      image_context_required_rows: 0,
      authority_component_aligned_rows: 1,
      search_rows_using_normalized_plain_text: 1,
      read_model_rows_using_normalized_plain_text: 1,
      rag_rows_using_normalized_plain_text: 1,
      legacy_search_text_only_rows: 0,
      blockers: 0,
    });

    const surface = readJson(root, 'data/manifests/9702_p1_m_historical_001_page_chain_surface_v1.json');
    expect(surface.evidence_layers_gate).toMatchObject({
      schema_version: '9702_evidence_layers_surface_gate_v1',
      status: 'pass',
      selected_rows: 1,
      local_consumption_gate_proven: true,
      production_ready_claimed: false,
      live_db_consumption_claimed: false,
    });
    expect(surface.items[0]).toMatchObject({
      text_evidence_status: 'question_plain_text_v2_ready',
      normalized_plain_text: 'Which expression has the same base units as pressure?',
      text_consumption_status: 'text_only_ready',
      text_only_ready: true,
      image_context_required: false,
      primary_topic_path: '9702.p1',
      local_consumption_gate_status: 'text_only_ready',
      search_read_model_rag_local_consumption_gate_passed: true,
      production_ready_claimed: false,
      db_consumption_claimed: false,
      search_consumption_claimed: false,
      rag_consumption_claimed: false,
    });
    expect(fs.existsSync(path.join(
      root,
      'docs/reports/2026-06-10-9702-p1-m-historical-001-evidence-layers-closeout.json',
    ))).toBe(true);
  });

  test('blocks if any accepted row is missing local consumption evidence', () => {
    const root = fixtureRoot();
    writeFixture(root, { includeConsumption: false });

    const result = build9702EvidenceLayersGate({
      rootDir: root,
      generatedOn: '2026-06-10',
    });

    expect(result.status).toBe('blocked');
    expect(result.blockers).toContainEqual(expect.objectContaining({
      check: 'missing_consumption_row',
      storage_key: '9702/m17_qp_12/questions/q01.png',
    }));
  });
});
