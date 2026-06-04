import {
  buildQuestionRowFoundationFromScannedPdfs,
  buildQuestionRowsForPdf,
  detectQuestionHeadersFromTextItems,
  parseQuestionPaperSourcePath,
  renderQuestionRowFoundationMarkdown,
} from '../build_9231_question_row_foundation.js';

describe('9231 question row foundation builder', () => {
  test('parses 9231 source PDF metadata from repo paths', () => {
    expect(parseQuestionPaperSourcePath(
      'data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf',
    )).toEqual({
      subject_code: '9231',
      session: 's',
      session_year: 's25',
      year: 2025,
      paper: 1,
      variant: 1,
      source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf',
      pdf_stem: '9231_s25_qp_11',
    });
  });

  test('detects strict left-margin printed question headers and ignores furniture/formula tokens', () => {
    const headers = detectQuestionHeadersFromTextItems([
      { str: '2', transform: [1, 0, 0, 1, 294.8, 794.85] },
      { str: '9231/11/M/J/25', transform: [1, 0, 0, 1, 272.27, 36.87] },
      { str: '1', transform: [1, 0, 0, 1, 49.64, 769.3] },
      { str: '3', transform: [1, 0, 0, 1, 82.4, 748.5] },
      { str: '0', transform: [1, 0, 0, 1, 49.64, 422.6] },
      { str: '21', transform: [1, 0, 0, 1, 49.64, 410.0] },
      { str: '1', transform: [1, 0, 0, 1, 49.64, 100.0] },
    ], {
      pageIndex: 1,
      pageNumber: 2,
    });

    expect(headers).toEqual([
      {
        q_number: 1,
        page_index: 1,
        page_number: 2,
        text: '1',
        x: 49.64,
        y: 769.3,
      },
    ]);
  });

  test('builds stable source-locator question rows without claiming text or crop readiness', () => {
    const meta = parseQuestionPaperSourcePath(
      'data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf',
    );
    const rows = buildQuestionRowsForPdf({
      meta,
      pageCount: 5,
      questionHeaders: [
        { q_number: 1, page_index: 1, page_number: 2, text: '1', x: 49.64, y: 769.3 },
        { q_number: 2, page_index: 3, page_number: 4, text: '2', x: 49.64, y: 765.5 },
        { q_number: 3, page_index: 3, page_number: 4, text: '3', x: 49.64, y: 500.5 },
      ],
    });

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      storage_key: '9231/s25_qp_11/questions/q01.png',
      source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf',
      q_number: 1,
      page_indices: [1, 2],
      page_numbers: [2, 3],
      page_range: {
        start_page_index: 1,
        end_page_index: 2,
        start_page_number: 2,
        end_page_number: 3,
      },
      surface_evidence_status: 'locator_resolved_pending_crop_render_and_visual_review',
      text_evidence_status: 'not_extracted',
      crop_status: 'not_generated',
      normalized_plain_text: null,
      text_only_ready: false,
      image_context_required: true,
      production_ready_claimed: false,
    });
    expect(rows[1].page_indices).toEqual([3]);
    expect(rows[2].page_indices).toEqual([3, 4]);
  });

  test('builds paper-level input and page-chain surface manifests from scanned PDFs', () => {
    const foundation = buildQuestionRowFoundationFromScannedPdfs({
      generatedOn: '2026-06-04',
      scannedPdfs: [
        {
          source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf',
          page_count: 5,
          question_headers: [
            { q_number: 1, page_index: 1, page_number: 2, text: '1', x: 49.64, y: 769.3 },
            { q_number: 2, page_index: 3, page_number: 4, text: '2', x: 49.64, y: 765.5 },
          ],
        },
        {
          source_pdf: 'data/past-papers/9231Further-Mathematics/paper2/9231_s25_qp_21.pdf',
          page_count: 6,
          question_headers: [
            { q_number: 1, page_index: 1, page_number: 2, text: '1', x: 49.64, y: 765.4 },
          ],
        },
      ],
    });

    expect(foundation.summary).toMatchObject({
      source_pdf_count: 2,
      question_row_count: 3,
      text_only_ready_rows: 0,
      image_context_required_rows: 3,
      blocker_count: 0,
    });
    expect(foundation.combined_manifest.shards).toHaveLength(2);
    expect(foundation.artifacts.input_manifests[0]).toMatchObject({
      path: 'data/manifests/9231_p1_source_locator_001_input_v1.json',
      item_count: 2,
    });
    expect(foundation.artifacts.page_chain_surface_manifests[0]).toMatchObject({
      path: 'data/manifests/9231_p1_source_locator_001_page_chain_surface_v1.json',
      item_count: 2,
    });
    expect(foundation.gate_status).toBe('row_foundation_ready_pending_text_image_gates');
  });

  test('renders a bounded report that does not claim production readiness or consumption', () => {
    const foundation = buildQuestionRowFoundationFromScannedPdfs({
      generatedOn: '2026-06-04',
      scannedPdfs: [
        {
          source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf',
          page_count: 5,
          question_headers: [
            { q_number: 1, page_index: 1, page_number: 2, text: '1', x: 49.64, y: 769.3 },
          ],
        },
      ],
    });

    const markdown = renderQuestionRowFoundationMarkdown(foundation);

    expect(markdown).toContain('row_foundation_ready_pending_text_image_gates');
    expect(markdown).toContain('text-only ready rows');
    expect(markdown).toContain('image-context required rows');
    expect(markdown).toContain('not production-ready');
    expect(markdown).toContain('DB/search/RAG consumption claimed | false');
    expect(markdown).not.toContain('9231 production-ready');
  });
});
