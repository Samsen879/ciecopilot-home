import { fetchWorkspaceProjection } from '../lib/repositories/workspace-repository.js';

function createWorkspaceDb() {
  const selects = [];

  return {
    selects,
    from(table) {
      return {
        select(selection) {
          const filters = [];

          return {
            eq(column, value) {
              filters.push({ column, value });
              return this;
            },
            async maybeSingle() {
              selects.push({ table, selection, filters });

              if (table !== 'learning_workspace_projection') {
                throw new Error(`Unexpected select table: ${table}`);
              }

              return {
                data: {
                  workspace_id: 'workspace-1',
                  user_id: 'user-1',
                  topic_id: 'topic-1',
                  topic_path: '9709/trigonometry/equations',
                  slot_state: {
                    canonical_worked_example: 'fresh',
                    review_queue: 'active',
                  },
                  linked_reference_summary: {
                    total_linked_references: 3,
                  },
                  updated_at: '2026-03-21T10:00:00.000Z',
                  slots: [
                    {
                      workspace_slot_id: 'slot-1',
                      slot_key: 'canonical_worked_example',
                      primary_artifact_ref: {
                        kind: 'artifact',
                        artifact_id: 'artifact-1',
                      },
                      linked_reference_refs: [
                        { kind: 'artifact', artifact_id: 'artifact-2' },
                        { kind: 'artifact', artifact_id: 'artifact-3' },
                      ],
                      updated_at: '2026-03-21T10:00:00.000Z',
                    },
                    {
                      workspace_slot_id: 'slot-2',
                      slot_key: 'review_queue',
                      primary_artifact_ref: null,
                      linked_reference_refs: [
                        { kind: 'review_task', review_task_id: 'review-1' },
                      ],
                      updated_at: '2026-03-21T10:05:00.000Z',
                    },
                  ],
                },
                error: null,
              };
            },
          };
        },
      };
    },
  };
}

describe('workspace-repository', () => {
  test('fetchWorkspaceProjection returns stable slot payloads and linked references separately', async () => {
    const db = createWorkspaceDb();

    const payload = await fetchWorkspaceProjection(db, {
      userId: 'user-1',
      topicId: 'topic-1',
    });

    expect(db.selects).toEqual([
      {
        table: 'learning_workspace_projection',
        selection: '*',
        filters: [
          { column: 'user_id', value: 'user-1' },
          { column: 'topic_id', value: 'topic-1' },
        ],
      },
    ]);

    expect(payload.workspace_id).toBe('workspace-1');
    expect(payload.slots).toMatchObject({
      overview_map: null,
      core_method_derivation: null,
      canonical_worked_example: {
        workspace_slot_id: 'slot-1',
        primary_artifact_ref: {
          kind: 'artifact',
          artifact_id: 'artifact-1',
        },
        updated_at: '2026-03-21T10:00:00.000Z',
      },
      common_traps: null,
      my_notes: null,
      review_queue: {
        workspace_slot_id: 'slot-2',
        primary_artifact_ref: null,
        updated_at: '2026-03-21T10:05:00.000Z',
      },
    });
    expect(payload.slots.canonical_worked_example).not.toHaveProperty('linked_reference_refs');

    expect(payload.linked_references).toEqual({
      overview_map: [],
      core_method_derivation: [],
      canonical_worked_example: [
        { kind: 'artifact', artifact_id: 'artifact-2' },
        { kind: 'artifact', artifact_id: 'artifact-3' },
      ],
      common_traps: [],
      my_notes: [],
      review_queue: [
        { kind: 'review_task', review_task_id: 'review-1' },
      ],
    });
    expect(payload.linked_reference_summary).toEqual({
      total_linked_references: 3,
    });
  });
});
