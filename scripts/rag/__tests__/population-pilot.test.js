import {
  shouldContinueAfterIngest,
  summarizePilotRetrievalAvailability,
} from '../lib/population-pilot.js';

describe('population pilot helpers', () => {
  test('continues after partial ingest success when completed summary has canonical inserts', () => {
    expect(
      shouldContinueAfterIngest({
        ingestStep: { ok: false, exit_code: 1 },
        ingestSummary: {
          status: 'completed',
          counts: {
            files_processed: 9,
            canonical_inserts: 155,
          },
        },
      }),
    ).toBe(true);
  });

  test('does not continue when ingest completed without successful inserts', () => {
    expect(
      shouldContinueAfterIngest({
        ingestStep: { ok: false, exit_code: 1 },
        ingestSummary: {
          status: 'completed',
          counts: {
            files_processed: 0,
            canonical_inserts: 0,
          },
        },
      }),
    ).toBe(false);
  });

  test('surfaces scope audit from retrieval availability eval', () => {
    expect(
      summarizePilotRetrievalAvailability({
        status: 'pass',
        total_requests: 6,
        fallback_reason_counts: {},
        s2_empty_evidence_reason_counts: {},
        subject_scope_audit: {
          manifest_subject_scope: 'single_subject',
          manifest_subject_codes: ['9702'],
          corpus_version_subject_scope: 'unknown',
        },
      }),
    ).toEqual({
      status: 'pass',
      case_count: 6,
      fallback_reason_counts: {},
      s2_empty_evidence_reason_counts: {},
      subject_scope_audit: {
        manifest_subject_scope: 'single_subject',
        manifest_subject_codes: ['9702'],
        corpus_version_subject_scope: 'unknown',
      },
    });
  });
});
