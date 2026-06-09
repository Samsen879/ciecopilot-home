import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  build9702SourceTruthInventory,
  parse9702SourcePdfPath,
  render9702SourceTruthInventoryMarkdown,
} from '../build_9702_source_truth_inventory.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9702-source-truth-'));
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

function writePdfStub(root, repoPath, content = 'fixture') {
  writeFile(root, repoPath, `%PDF-1.7\n${content}\n%%EOF\n`);
}

function fakeInspection(overrides = {}) {
  return async (absolutePath) => {
    const basename = path.basename(absolutePath);
    return {
      parse_success: true,
      page_count: 16,
      first_page_text_sample: `Cambridge International AS & A Level PHYSICS 9702/12 May/June 2025 Paper 12`,
      first_page_text_available: true,
      render_sanity: {
        renderer: 'fixture-renderer',
        scale: 0.4,
        pages_rendered: 3,
        rendered_page_numbers: [1, 8, 16],
        nonblank_pages: 3,
        blank_pages: 0,
        min_nonwhite_pixels: 100,
        max_nonwhite_pixels: 250,
        status: 'pass',
      },
      ...(overrides[basename] || {}),
    };
  };
}

describe('9702 source truth inventory', () => {
  test('parses canonical 9702 source paths into paper, session, year, and component identity', () => {
    expect(parse9702SourcePdfPath('data/past-papers/9702Physics/paper5/9702_w25_qp_54.pdf'))
      .toEqual({
        canonical_paper_id: '9702_w25_qp_54',
        component_id: '54',
        file_name: '9702_w25_qp_54.pdf',
        paper: 'paper5',
        paper_number: 5,
        repo_path: 'data/past-papers/9702Physics/paper5/9702_w25_qp_54.pdf',
        session_code: 'w',
        session_id: 'w25',
        session_label: 'Oct/Nov',
        variant: 4,
        year: 2025,
      });
  });

  test('builds exact tracked-source counts and separates source truth from row-surface truth', async () => {
    const root = fixtureRoot();
    const historical = 'data/past-papers/9702Physics/paper1/9702_m24_qp_12.pdf';
    const promoted = 'data/past-papers/9702Physics/paper1/9702_s25_qp_12.pdf';
    writePdfStub(root, historical, 'historical');
    writePdfStub(root, promoted, 'promoted');
    writeJson(root, 'docs/reports/2026-06-02-9231-9702-new-paper-source-promotion.json', {
      source_posture: 'public_mirror_candidate_only_not_repo_source_truth',
      rows: [
        {
          subject_code: '9702',
          paper_id: '9702_s25_qp_12',
          repo_source_path: promoted,
          candidate_source_url: 'https://xtrapapers.co/example/9702_s25_qp_12.pdf/raw',
          status: 'verified',
        },
      ],
    });

    const inventory = await build9702SourceTruthInventory({
      rootDir: root,
      generatedOn: '2026-06-08',
      trackedSourcePaths: [historical, promoted],
      inspectPdf: fakeInspection({
        '9702_m24_qp_12.pdf': {
          first_page_text_sample: 'PHYSICS 9702/12 February/March 2024 Paper 12',
        },
      }),
    });
    const markdown = render9702SourceTruthInventoryMarkdown(inventory);

    expect(inventory.status).toBe('pass');
    expect(inventory.production_ready_claimed).toBe(false);
    expect(inventory.summary).toMatchObject({
      tracked_source_pdf_count: 2,
      represented_once_count: 2,
      pdf_signature_pass_count: 2,
      pdfjs_parse_success_count: 2,
      render_sanity_pass_count: 2,
      first_page_identity_pass_count: 2,
      blocker_count: 0,
    });
    expect(inventory.summary.by_paper).toEqual({ paper1: 2 });
    expect(inventory.summary.by_session).toEqual({ m24: 1, s25: 1 });
    expect(inventory.summary.by_year).toEqual({ 2024: 1, 2025: 1 });
    expect(inventory.summary.by_component).toEqual({ 12: 2 });
    expect(inventory.source_posture.classification_counts).toEqual({
      historical_repo_source: 1,
      public_mirror_candidate_promoted_2026_06_02: 1,
      official_restricted_or_user_supplied: 0,
      ambiguous_or_blocked: 0,
    });
    expect(inventory.row_surface_truth.row_surface_truth_present).toBe(false);
    expect(inventory.row_surface_truth.manifest_paths).toEqual([]);
    expect(inventory.boundary.page_chain_extraction_run).toBe(false);
    expect(inventory.boundary.vlm_or_ocr_run).toBe(false);
    expect(inventory.boundary.db_import_run).toBe(false);
    expect(inventory.boundary.search_gate_run).toBe(false);
    expect(inventory.boundary.release_preflight_run).toBe(false);
    expect(markdown).toContain('production_ready_claimed=false');
    expect(markdown).toContain('No page-chain extraction, VLM/OCR, DB import, search gate, release preflight, or production-ready status update was run.');
  });

  test('blocks duplicate tracked source paths before claiming exact representation', async () => {
    const root = fixtureRoot();
    const source = 'data/past-papers/9702Physics/paper2/9702_s25_qp_22.pdf';
    writePdfStub(root, source);

    const inventory = await build9702SourceTruthInventory({
      rootDir: root,
      generatedOn: '2026-06-08',
      trackedSourcePaths: [source, source],
      inspectPdf: fakeInspection({
        '9702_s25_qp_22.pdf': {
          first_page_text_sample: 'PHYSICS 9702/22 May/June 2025 Paper 22',
        },
      }),
    });

    expect(inventory.status).toBe('blocked');
    expect(inventory.summary.tracked_source_pdf_count).toBe(2);
    expect(inventory.summary.represented_once_count).toBe(1);
    expect(inventory.summary.blocker_count).toBe(1);
    expect(inventory.blockers).toContainEqual(expect.objectContaining({
      check: 'duplicate_tracked_source_path',
      source_path: source,
    }));
  });
});
