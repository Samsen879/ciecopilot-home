import { jest } from '@jest/globals';

const mockQuery = jest.fn();
const mockEnd = jest.fn();
const MockPool = jest.fn(() => ({
  query: mockQuery,
  end: mockEnd,
}));

jest.unstable_mockModule('pg', () => ({
  Pool: MockPool,
}));

const {
  getPgCompatClient,
  resetPgCompatClient,
} = await import('../pg-compat-client.js');

describe('pg-compat-client', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    mockQuery.mockReset();
    mockEnd.mockReset();
    MockPool.mockClear();
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  });

  afterEach(async () => {
    await resetPgCompatClient();
  });

  afterAll(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
      return;
    }
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  test('supports select.eq(...).is(...).maybeSingle() chains for null filters', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const client = getPgCompatClient();
    const result = await client
      .from('learning_question_analysis_snapshots')
      .select('classification_snapshot_id')
      .eq('question_id', 'question-1')
      .is('superseded_by_snapshot_id', null)
      .maybeSingle();

    expect(result).toEqual({ data: null, error: null });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('t."superseded_by_snapshot_id" IS NULL'),
      ['question-1'],
    );
  });

  test('supports select.in(...).eq(...) chains for batched current-content filters', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          artifact_content_version_id: 'content-1',
          artifact_id: 'artifact-1',
          is_current: true,
        },
        {
          artifact_content_version_id: 'content-2',
          artifact_id: 'artifact-2',
          is_current: true,
        },
      ],
    });

    const client = getPgCompatClient();
    const result = await client
      .from('learning_artifact_content_versions')
      .select('*')
      .in('artifact_id', ['artifact-1', 'artifact-2'])
      .eq('is_current', true);

    expect(result).toEqual({
      data: [
        {
          artifact_content_version_id: 'content-1',
          artifact_id: 'artifact-1',
          is_current: true,
        },
        {
          artifact_content_version_id: 'content-2',
          artifact_id: 'artifact-2',
          is_current: true,
        },
      ],
      error: null,
    });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('t."artifact_id" IN ($1, $2) AND t."is_current" = $3'),
      ['artifact-1', 'artifact-2', true],
    );
  });

  test('casts learning snapshot, question event, and question bank JSONB fields explicitly', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ classification_snapshot_id: 'snapshot-1' }],
      })
      .mockResolvedValueOnce({
        rows: [{ question_event_id: 'event-1' }],
      })
      .mockResolvedValueOnce({
        rows: [],
      });

    const client = getPgCompatClient();

    await client
      .from('learning_question_analysis_snapshots')
      .insert({
        question_id: 'question-1',
        secondary_topic_ids: ['topic-2'],
        secondary_question_type_ids: ['type-2'],
        variant_tags: ['algebraic'],
        candidate_rubric_refs: [{ rubric_id: 'rubric-1' }],
        prerequisite_topic_ids: ['topic-prereq-1'],
        canonical_step_skeleton_summary: { steps: ['step 1'] },
        difficulty_signal: { band: 'medium' },
        analysis_audit_metadata: { source: 'bundle' },
        evidence_source_event_ref: { question_event_id: 'event-0' },
        low_confidence_posture: { reason: 'ambiguous' },
      })
      .select('classification_snapshot_id')
      .single();

    await client
      .from('learning_question_events')
      .insert({
        event_type: 'QuestionClassified',
        question_id: 'question-1',
        classification_snapshot_id: 'snapshot-1',
        event_payload: { event: 'classified' },
        provenance: { source: 'analysis_backfill' },
      })
      .select('question_event_id')
      .single();

    await client
      .from('question_bank')
      .update({
        paper_scope: { year: 2019 },
        secondary_topic_ids: ['topic-2'],
        secondary_question_type_ids: ['type-2'],
        variant_tags: ['algebraic'],
        classification_snapshot_ref: { kind: 'snapshot', id: 'snapshot-1' },
        prompt_representation: { type: 'text', value: 'Prompt' },
        provenance_summary: { summary: 'Summary' },
      })
      .eq('question_id', 'question-1');

    expect(mockQuery.mock.calls[0][0]).toContain('$2::jsonb');
    expect(mockQuery.mock.calls[0][0]).toContain('$9::jsonb');
    expect(mockQuery.mock.calls[0][1]).toEqual(expect.arrayContaining([
      JSON.stringify(['topic-2']),
      JSON.stringify({ source: 'bundle' }),
      JSON.stringify({ reason: 'ambiguous' }),
    ]));

    expect(mockQuery.mock.calls[1][0]).toContain('$4::jsonb');
    expect(mockQuery.mock.calls[1][0]).toContain('$5::jsonb');
    expect(mockQuery.mock.calls[1][1]).toEqual(expect.arrayContaining([
      JSON.stringify({ event: 'classified' }),
      JSON.stringify({ source: 'analysis_backfill' }),
    ]));

    expect(mockQuery.mock.calls[2][0]).toContain('"paper_scope" = $1::jsonb');
    expect(mockQuery.mock.calls[2][0]).toContain('"provenance_summary" = $7::jsonb');
    expect(mockQuery.mock.calls[2][1]).toEqual(expect.arrayContaining([
      JSON.stringify({ year: 2019 }),
      JSON.stringify(['topic-2']),
      JSON.stringify({ summary: 'Summary' }),
    ]));
  });

  test('supports delete filters with returning projections for reset flows', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          question_id: 'question-1',
          storage_key: '9709/s17_qp_11/questions/q03.png',
        },
      ],
    });

    const client = getPgCompatClient();
    const result = await client
      .from('question_bank')
      .delete()
      .eq('source_kind', 'paper_question')
      .in('question_id', ['question-1'])
      .select('question_id, storage_key');

    expect(result).toEqual({
      data: [
        {
          question_id: 'question-1',
          storage_key: '9709/s17_qp_11/questions/q03.png',
        },
      ],
      error: null,
    });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM public."question_bank"'),
      ['paper_question', 'question-1'],
    );
    expect(mockQuery.mock.calls[0][0]).toContain('RETURNING "question_id", "storage_key"');
  });
});
