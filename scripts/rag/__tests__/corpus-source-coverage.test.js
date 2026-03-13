import {
  renderCorpusSourceCoverageReport,
  summarizeCorpusSourceCoverage,
} from '../lib/corpus-source-coverage.js';

describe('RAG corpus source coverage', () => {
  it('excludes note_md from production policy evaluation', () => {
    const summary = summarizeCorpusSourceCoverage([
      {
        id: 'n1',
        syllabus_code: '9702',
        topic_path: '9702.P2.Waves',
        source_type: 'note_md',
        source_ref: { asset_id: 'src/data/data-notes/9702/ch1.md', question_id: '9702-note-1' },
        corpus_version: 'research_v1',
      },
      {
        id: 'p1',
        syllabus_code: '9702',
        topic_path: '9702.P2.Waves',
        source_type: 'past_paper_pdf',
        source_ref: { asset_id: '9702_s23_qp_21.pdf', page_no: 1 },
        corpus_version: 'prod_v1',
      },
      {
        id: 'm1',
        syllabus_code: '9702',
        topic_path: '9702.P2.Waves',
        source_type: 'mark_scheme_pdf',
        source_ref: { asset_id: '9702_s23_ms_21.pdf', page_no: 1 },
        corpus_version: 'prod_v1',
      },
    ], { policyMode: 'production' });

    expect(summary.policy.mode).toBe('production');
    expect(summary.canonical_totals.total_rows).toBe(2);
    expect(summary.scan_totals.total_rows_scanned).toBe(3);
    expect(summary.scan_totals.blocked_by_policy_rows).toBe(1);
    expect(summary.source_type_counts.note_md).toBeUndefined();
    expect(summary.blocked_source_type_counts.note_md).toBe(1);
    expect(summary.threshold_checks.required_source_types_all_present).toBe(true);
  });

  it('renders policy details and blocked counts in report', () => {
    const summary = summarizeCorpusSourceCoverage([
      {
        id: 'n1',
        syllabus_code: '9702',
        topic_path: '9702.P2.Waves',
        source_type: 'note_md',
        source_ref: { asset_id: 'src/data/data-notes/9702/ch1.md', question_id: '9702-note-1' },
      },
      {
        id: 'p1',
        syllabus_code: '9702',
        topic_path: '9702.P2.Waves',
        source_type: 'past_paper_pdf',
        source_ref: { asset_id: '9702_s23_qp_21.pdf', page_no: 1 },
      },
      {
        id: 'm1',
        syllabus_code: '9702',
        topic_path: '9702.P2.Waves',
        source_type: 'mark_scheme_pdf',
        source_ref: { asset_id: '9702_s23_ms_21.pdf', page_no: 1 },
      },
    ], { policyMode: 'production' });

    const report = renderCorpusSourceCoverageReport(summary);
    expect(report).toContain('## Policy');
    expect(report).toContain('blocked_by_policy_rows');
    expect(report).toContain('## Blocked Source Type Counts');
    expect(report).toContain('note_md');
  });
});
