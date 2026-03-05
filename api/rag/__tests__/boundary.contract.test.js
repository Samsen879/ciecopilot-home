import { resolveBoundary } from '../lib/boundary-resolver.js';
import { BOUNDARY_ERROR_CODES } from '../lib/constants.js';

function createBoundarySupabase({ row = null, error = null } = {}) {
  return {
    from(table) {
      expect(table).toBe('curriculum_nodes');
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: row, error };
                },
              };
            },
          };
        },
      };
    },
  };
}

function createRetryBoundarySupabase({ failures = 0, finalRow }) {
  let callCount = 0;
  return {
    from(table) {
      expect(table).toBe('curriculum_nodes');
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  callCount += 1;
                  if (callCount <= failures) {
                    throw new TypeError('fetch failed');
                  }
                  return { data: finalRow, error: null };
                },
              };
            },
          };
        },
      };
    },
    getCallCount() {
      return callCount;
    },
  };
}

describe('RAG boundary contract', () => {
  it('returns TOPIC_PATH_MISSING when syllabus_node_id is absent', async () => {
    await expect(resolveBoundary({}, { supabase: createBoundarySupabase() })).rejects.toMatchObject({
      code: BOUNDARY_ERROR_CODES.TOPIC_PATH_MISSING,
      status: 400,
    });
  });

  it('returns TOPIC_PATH_NOT_FOUND when node is missing', async () => {
    await expect(
      resolveBoundary(
        { syllabus_node_id: 'missing-id' },
        { supabase: createBoundarySupabase({ row: null, error: null }) },
      ),
    ).rejects.toMatchObject({
      code: BOUNDARY_ERROR_CODES.TOPIC_PATH_NOT_FOUND,
      status: 404,
    });
  });

  it('returns TOPIC_PATH_FORBIDDEN when requested subject mismatches', async () => {
    await expect(
      resolveBoundary(
        {
          syllabus_node_id: 'node-1',
          requested_subject_code: '9702',
        },
        {
          supabase: createBoundarySupabase({
            row: {
              node_id: 'node-1',
              topic_path: '9709.P1',
              syllabus_code: '9709',
            },
          }),
        },
      ),
    ).rejects.toMatchObject({
      code: BOUNDARY_ERROR_CODES.TOPIC_PATH_FORBIDDEN,
      status: 403,
    });
  });

  it('resolves boundary successfully when node is valid', async () => {
    const resolved = await resolveBoundary(
      { syllabus_node_id: 'node-1' },
      {
        supabase: createBoundarySupabase({
          row: {
            node_id: 'node-1',
            topic_path: '9709.P1',
            syllabus_code: '9709',
            title: 'Pure 1',
            description: 'Paper 1',
          },
        }),
      },
    );
    expect(resolved.current_topic_path).toBe('9709.P1');
    expect(resolved.subject_code).toBe('9709');
  });

  it('retries transient fetch failures and succeeds within retry budget', async () => {
    const supabase = createRetryBoundarySupabase({
      failures: 2,
      finalRow: {
        node_id: 'node-1',
        topic_path: '9709.P1',
        syllabus_code: '9709',
        title: 'Pure 1',
        description: 'Paper 1',
      },
    });

    const resolved = await resolveBoundary(
      { syllabus_node_id: 'node-1' },
      {
        supabase,
        logger: () => {},
      },
    );

    expect(resolved.current_topic_path).toBe('9709.P1');
    expect(supabase.getCallCount()).toBe(3);
  });

  it('fails after retry budget is exhausted for transient fetch failures', async () => {
    const supabase = createRetryBoundarySupabase({
      failures: 3,
      finalRow: null,
    });

    await expect(
      resolveBoundary(
        { syllabus_node_id: 'node-1' },
        {
          supabase,
          logger: () => {},
        },
      ),
    ).rejects.toMatchObject({
      code: 'RAG_BOUNDARY_LOOKUP_FAILED',
      status: 500,
      details: { retryable: true },
    });

    expect(supabase.getCallCount()).toBe(3);
  });
});
