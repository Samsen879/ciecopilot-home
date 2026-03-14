import {
  buildProductionEvidencePostWriteAudit,
} from '../lib/production-evidence-post-write-audit.js';

function buildIngestPayload() {
  return {
    status: 'pass',
    summary: {
      bundle_id: 'phase_b_pilot_ready_v1',
      corpus_version: 'rag_production_evidence_pilot_20260313',
    },
    row_counts: {
      attempted: 3,
      inserted: 1,
      updated: 1,
      skipped_existing: 1,
      failed: 0,
    },
    writes: [
      {
        operation: 'insert',
        row: { id: 101, source_type: 'evidence_authored', topic_path: '9702.P1.Dynamics', corpus_version: 'rag_production_evidence_pilot_20260313' },
        source_ref: { evidence_id: 'pilot-001', topic_path: '9702.P1.Dynamics' },
        topic_path: '9702.P1.Dynamics',
        source_type: 'evidence_authored',
        corpus_version: 'rag_production_evidence_pilot_20260313',
      },
      {
        operation: 'update',
        row: { id: 102, source_type: 'evidence_transformed', topic_path: '9702.P2.Electricity', corpus_version: 'rag_production_evidence_pilot_20260313' },
        source_ref: { evidence_id: 'pilot-002', topic_path: '9702.P2.Electricity' },
        topic_path: '9702.P2.Electricity',
        source_type: 'evidence_transformed',
        corpus_version: 'rag_production_evidence_pilot_20260313',
      },
      {
        operation: 'skip_existing',
        row: { id: 103, source_type: 'evidence_authored', topic_path: '9702.P2.Waves', corpus_version: 'rag_production_evidence_pilot_20260313' },
        source_ref: { evidence_id: 'pilot-003', topic_path: '9702.P2.Waves' },
        topic_path: '9702.P2.Waves',
        source_type: 'evidence_authored',
        corpus_version: 'rag_production_evidence_pilot_20260313',
      },
    ],
  };
}

describe('production evidence post-write audit', () => {
  test('summarizes row counts and validates readback rows against the ingest result', () => {
    const result = buildProductionEvidencePostWriteAudit({
      ingestPayload: buildIngestPayload(),
      readbackRows: [
        { id: 101, source_type: 'evidence_authored', topic_path: '9702.P1.Dynamics', corpus_version: 'rag_production_evidence_pilot_20260313' },
        { id: 102, source_type: 'evidence_transformed', topic_path: '9702.P2.Electricity', corpus_version: 'rag_production_evidence_pilot_20260313' },
        { id: 103, source_type: 'evidence_authored', topic_path: '9702.P2.Waves', corpus_version: 'rag_production_evidence_pilot_20260313' },
      ],
    });

    expect(result.status).toBe('pass');
    expect(result.summary.bundle_id).toBe('phase_b_pilot_ready_v1');
    expect(result.counts.inserted).toBe(1);
    expect(result.counts.updated).toBe(1);
    expect(result.counts.skipped_existing).toBe(1);
    expect(result.counts.verified).toBe(3);
  });

  test('fails when a readback row does not match the ingested row contract', () => {
    const result = buildProductionEvidencePostWriteAudit({
      ingestPayload: buildIngestPayload(),
      readbackRows: [
        { id: 101, source_type: 'note_md', topic_path: '9702.P1.Dynamics', corpus_version: 'rag_production_evidence_pilot_20260313' },
        { id: 102, source_type: 'evidence_transformed', topic_path: '9702.P2.Electricity', corpus_version: 'rag_production_evidence_pilot_20260313' },
        { id: 103, source_type: 'evidence_authored', topic_path: '9702.P2.Waves', corpus_version: 'rag_production_evidence_pilot_20260313' },
      ],
    });

    expect(result.status).toBe('fail');
    expect(result.errors.join('\n')).toContain('source_type');
    expect(result.counts.verified).toBe(2);
  });
});
