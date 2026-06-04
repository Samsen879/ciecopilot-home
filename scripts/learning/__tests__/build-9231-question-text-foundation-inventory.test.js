import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildQuestionTextFoundationInventory,
  renderQuestionTextFoundationInventoryMarkdown,
} from '../build_9231_question_text_foundation_inventory.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9231-question-text-foundation-'));
}

function writeFile(root, repoPath, content = '') {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
}

function writeJson(root, repoPath, payload) {
  writeFile(root, repoPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function writePdfStub(root, repoPath) {
  writeFile(root, repoPath, '%PDF-1.4\n% fixture only\n');
}

describe('9231 question text foundation inventory', () => {
  test('counts source PDFs and blocks the foundation when no row-level surface exists', () => {
    const root = fixtureRoot();
    writePdfStub(root, 'data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf');
    writePdfStub(root, 'data/past-papers/9231Further-Mathematics/paper2/9231_s25_qp_21.pdf');
    writePdfStub(root, 'data/mark-schemes/9231Further-Mathematics/9231_s25_ms_11.pdf');
    writePdfStub(root, 'data/mark-schemes/9231Further-Mathematics/9231_s25_gt.pdf');
    writeJson(root, 'docs/reports/2026-06-02-9231-9702-new-paper-source-promotion.json', {
      rows: [
        {
          subject_code: '9231',
          status: 'verified',
          repo_source_path: 'data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf',
        },
      ],
    });

    const inventory = buildQuestionTextFoundationInventory({
      rootDir: root,
      generatedOn: '2026-06-04',
      workflowGaps: ['preflight missing'],
    });

    expect(inventory.status).toBe('blocked');
    expect(inventory.verdict).toBe('foundation blocked-by-missing-row-surface');
    expect(inventory.source_coverage.question_paper_pdf_count).toBe(2);
    expect(inventory.source_coverage.question_papers_by_paper).toEqual({ p1: 1, p2: 1 });
    expect(inventory.source_coverage.mark_scheme_pdf_count).toBe(1);
    expect(inventory.source_coverage.grade_threshold_pdf_count).toBe(1);
    expect(inventory.source_coverage.latest_source_promotion).toMatchObject({
      artifact: 'docs/reports/2026-06-02-9231-9702-new-paper-source-promotion.json',
      promoted_question_papers: 1,
      verified_question_papers: 1,
    });
    expect(inventory.row_surface.page_chain_surface_manifest_count).toBe(0);
    expect(inventory.row_surface.question_row_count).toBe(0);
    expect(inventory.gap_inventory.blockers).toContainEqual(expect.objectContaining({
      check: 'missing_page_chain_surface_manifest',
    }));
    expect(inventory.text_evidence.evidence_bundle_files).toBe(0);
    expect(inventory.consumption_paths.db_consumed_claimed).toBe(false);
    expect(inventory.workflow_gaps).toEqual(['preflight missing']);
  });

  test('counts existing row-level surface rows without treating RAG eval samples as foundation rows', () => {
    const root = fixtureRoot();
    writePdfStub(root, 'data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf');
    writeJson(root, 'data/manifests/9231_p1_s25_standard_001_page_chain_surface_v1.json', {
      items: [
        { storage_key: '9231/s25_qp_11/questions/q01.png' },
        { storage_key: '9231/s25_qp_11/questions/q02.png' },
      ],
    });
    writeJson(root, 'data/manifests/9231_p1_s25_standard_001_authority_sidecar_v1.json', {
      items: [{ storage_key: '9231/s25_qp_11/questions/q01.png' }],
    });
    writeJson(root, 'data/manifests/9231_p1_s25_standard_001_input_v1.json', {
      items: [{ source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf' }],
    });
    writeJson(root, 'data/eval/rag_step3_retrieval_availability_sample_9231.json', [
      {
        subject_code: '9231',
        query: 'Further Mathematics topic planning',
      },
    ]);

    const inventory = buildQuestionTextFoundationInventory({
      rootDir: root,
      generatedOn: '2026-06-04',
    });

    expect(inventory.row_surface.page_chain_surface_manifest_count).toBe(1);
    expect(inventory.row_surface.authority_sidecar_manifest_count).toBe(1);
    expect(inventory.row_surface.input_manifest_count).toBe(1);
    expect(inventory.row_surface.question_row_count).toBe(2);
    expect(inventory.rag_seed_or_eval_artifacts.eval_sample_files).toBe(1);
    expect(inventory.rag_seed_or_eval_artifacts.foundation_equivalent).toBe(false);
    expect(inventory.gap_inventory.blockers).not.toContainEqual(expect.objectContaining({
      check: 'missing_page_chain_surface_manifest',
    }));
  });

  test('prefers shard-split row surfaces over source-locator surfaces when both exist', () => {
    const root = fixtureRoot();
    writePdfStub(root, 'data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf');
    writeJson(root, 'data/manifests/9231_p1_source_locator_001_page_chain_surface_v1.json', {
      items: [
        { storage_key: '9231/s25_qp_11/questions/q01.png' },
        { storage_key: '9231/s25_qp_11/questions/q02.png' },
      ],
    });
    writeJson(root, 'data/manifests/9231_p1_s25_standard_001_page_chain_surface_v1.json', {
      items: [
        { storage_key: '9231/s25_qp_11/questions/q01.png' },
        { storage_key: '9231/s25_qp_11/questions/q02.png' },
      ],
    });
    writeJson(root, 'data/manifests/9231_p1_s25_standard_001_input_v1.json', {
      items: [
        { storage_key: '9231/s25_qp_11/questions/q01.png' },
        { storage_key: '9231/s25_qp_11/questions/q02.png' },
      ],
    });

    const inventory = buildQuestionTextFoundationInventory({
      rootDir: root,
      generatedOn: '2026-06-04',
    });

    expect(inventory.row_surface.page_chain_surface_manifest_count).toBe(2);
    expect(inventory.row_surface.source_locator_surface_manifest_count).toBe(1);
    expect(inventory.row_surface.shard_split_surface_manifest_count).toBe(1);
    expect(inventory.row_surface.current_surface_family).toBe('shard_split');
    expect(inventory.row_surface.question_row_count).toBe(2);
    expect(inventory.row_surface.duplicate_storage_keys).toBe(0);
    expect(inventory.row_surface.all_surface_duplicate_storage_keys).toBe(2);
  });

  test('detects normalized_plain_text schema contracts while keeping live consumption claims false', () => {
    const root = fixtureRoot();
    writeFile(root, 'supabase/migrations/20260415152950_create_learning_question_search_projection.sql', [
      "NULLIF(BTRIM(qb.provenance_summary ->> 'normalized_plain_text'), '') AS normalized_plain_text",
      "COALESCE(qb.normalized_plain_text, NULLIF(BTRIM(qb.provenance_summary ->> 'search_text'), '')) AS search_text",
      "WHEN qb.normalized_plain_text IS NOT NULL THEN 'question_plain_text_v2.normalized_plain_text'",
    ].join('\n'));
    writeFile(root, 'supabase/migrations/20260413110000_phase_a_question_classified_events.sql', [
      "NULLIF(BTRIM(qb.provenance_summary ->> 'normalized_plain_text'), '') AS normalized_plain_text",
      "NULLIF(BTRIM(qb.provenance_summary ->> 'text_consumption_status'), '') AS text_consumption_status",
    ].join('\n'));

    const inventory = buildQuestionTextFoundationInventory({
      rootDir: root,
      generatedOn: '2026-06-04',
    });

    expect(inventory.consumption_paths.search_normalized_plain_text_priority_contract).toBe('present');
    expect(inventory.consumption_paths.read_model_normalized_plain_text_contract).toBe('present');
    expect(inventory.consumption_paths.local_consumption_gate_artifacts).toBe(0);
    expect(inventory.consumption_paths.db_consumed_claimed).toBe(false);
    expect(inventory.consumption_paths.search_consumed_claimed).toBe(false);
    expect(inventory.consumption_paths.rag_consumed_claimed).toBe(false);
  });

  test('renders partial crop coverage instead of saying crop assets are missing', () => {
    const root = fixtureRoot();
    writePdfStub(root, 'data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf');
    writeFile(root, 'data/crops/9231-pilot-shards/9231_p1_s25_standard_001/question-crops/q01.png', 'png');
    writeJson(root, 'data/manifests/9231_p1_s25_standard_001_page_chain_surface_v1.json', {
      items: [
        {
          storage_key: '9231/s25_qp_11/questions/q01.png',
          crop_paths: ['data/crops/9231-pilot-shards/9231_p1_s25_standard_001/question-crops/q01.png'],
        },
        {
          storage_key: '9231/s25_qp_11/questions/q02.png',
          crop_paths: [],
        },
      ],
    });

    const inventory = buildQuestionTextFoundationInventory({
      rootDir: root,
      generatedOn: '2026-06-04',
    });
    const markdown = renderQuestionTextFoundationInventoryMarkdown(inventory);

    expect(inventory.row_surface.surface_crop_asset_rows).toBe(1);
    expect(inventory.row_surface.surface_rows_missing_crop_assets).toBe(1);
    expect(markdown).toContain('crop/image assets are partial: `1/2` current rows have manifest-backed crop references');
    expect(markdown).not.toContain('crop/image assets, OCR/text evidence');
  });

  test('renders a bounded markdown report for the blocked foundation state', () => {
    const root = fixtureRoot();
    const inventory = buildQuestionTextFoundationInventory({
      rootDir: root,
      generatedOn: '2026-06-04',
    });
    const markdown = renderQuestionTextFoundationInventoryMarkdown(inventory);

    expect(markdown).toContain('foundation blocked-by-missing-row-surface');
    expect(markdown).toContain('Raw PDF Source Coverage');
    expect(markdown).toContain('Row-Level Surface');
    expect(markdown).toContain('This is not a production-ready claim');
    expect(markdown).not.toContain('9231 production-ready');
  });
});
