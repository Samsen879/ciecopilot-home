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
});
