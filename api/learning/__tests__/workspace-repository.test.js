import {
  ensurePaperWorkspaceExists,
  ensureWorkspaceExists,
  fetchPaperWorkspaceProjection,
  fetchWorkspaceProjection,
  loadPaperWorkspaceByScope,
} from '../lib/repositories/workspace-repository.js';

function createWorkspaceDb() {
  const inserts = [];
  const selects = [];
  let insertError = null;
  let workspaceAfterInsertError = null;
  let existingWorkspace = null;
  let existingPaperWorkspace = null;
  const paperWorkspaceProjection = {
    paper_workspace_id: 'paper-workspace-1',
    user_id: 'user-1',
    subject_code: '9709',
    paper_scope: '9709:paper:p1',
    workspace_kind: 'paper_main',
    visible_organization_summary: {
      label: 'Pure Mathematics 1',
    },
    linked_topic_summary: {
      total_topic_sections: 2,
    },
    created_at: '2026-06-05T08:00:00.000Z',
    updated_at: '2026-06-05T08:05:00.000Z',
    topic_sections: [
      {
        paper_workspace_topic_section_id: 'section-2',
        topic_id: 'topic-2',
        topic_workspace_id: 'workspace-topic-2',
        topic_path: '9709/trigonometry/identities',
        section_state: {
          visibility: 'secondary',
        },
        created_at: '2026-06-05T08:01:00.000Z',
        updated_at: '2026-06-05T08:02:00.000Z',
      },
      {
        paper_workspace_topic_section_id: 'section-1',
        topic_id: 'topic-1',
        topic_workspace_id: 'workspace-topic-1',
        topic_path: '9709/trigonometry/equations',
        section_state: {
          visibility: 'primary',
        },
        created_at: '2026-06-05T08:00:00.000Z',
        updated_at: '2026-06-05T08:03:00.000Z',
      },
    ],
  };

  return {
    inserts,
    selects,
    setExistingWorkspace(workspace) {
      existingWorkspace = workspace;
    },
    setExistingPaperWorkspace(workspace) {
      existingPaperWorkspace = workspace;
    },
    setInsertError(error, nextWorkspace = null) {
      insertError = error;
      workspaceAfterInsertError = nextWorkspace;
    },
    from(table) {
      return {
        insert(payload) {
          return {
            select() {
              return this;
            },
            async single() {
              inserts.push({ table, payload });

              if (table === 'learning_paper_workspaces') {
                const row = {
                  paper_workspace_id: 'paper-workspace-created-1',
                  created_at: '2026-06-05T08:00:00.000Z',
                  updated_at: '2026-06-05T08:00:00.000Z',
                  ...payload,
                };
                existingPaperWorkspace = row;
                return { data: row, error: null };
              }

              if (table !== 'learning_workspaces') {
                throw new Error(`Unexpected insert table: ${table}`);
              }

              if (insertError) {
                if (workspaceAfterInsertError) {
                  existingWorkspace = workspaceAfterInsertError;
                }

                return { data: null, error: insertError };
              }

              const row = {
                workspace_id: 'workspace-created-1',
                updated_at: '2026-03-21T10:10:00.000Z',
                ...payload,
              };
              existingWorkspace = row;
              return { data: row, error: null };
            },
          };
        },
        select(selection) {
          const filters = [];

          return {
            eq(column, value) {
              filters.push({ column, value });
              return this;
            },
            async maybeSingle() {
              selects.push({ table, selection, filters });

              if (table === 'learning_workspaces') {
                return {
                  data: existingWorkspace,
                  error: null,
                };
              }

              if (table === 'learning_paper_workspaces') {
                return {
                  data: existingPaperWorkspace,
                  error: null,
                };
              }

              if (table === 'learning_paper_workspace_projection') {
                const userId = filters.find((filter) => filter.column === 'user_id')?.value;
                const paperScope = filters.find((filter) => filter.column === 'paper_scope')?.value;

                return {
                  data:
                    userId === paperWorkspaceProjection.user_id
                    && paperScope === paperWorkspaceProjection.paper_scope
                      ? paperWorkspaceProjection
                      : null,
                  error: null,
                };
              }

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
  test('loadPaperWorkspaceByScope loads an existing paper workspace without touching topic workspace rows', async () => {
    const db = createWorkspaceDb();
    db.setExistingPaperWorkspace({
      paper_workspace_id: 'paper-workspace-existing-1',
      user_id: 'user-1',
      subject_code: '9709',
      paper_scope: '9709:paper:p1',
      workspace_kind: 'paper_main',
      visible_organization_summary: {},
      linked_topic_summary: {},
      created_at: '2026-06-05T08:00:00.000Z',
      updated_at: '2026-06-05T08:05:00.000Z',
    });

    const workspace = await loadPaperWorkspaceByScope(db, {
      userId: 'user-1',
      paperScope: '9709:paper:p1',
    });

    expect(db.selects).toEqual([
      {
        table: 'learning_paper_workspaces',
        selection: '*',
        filters: [
          { column: 'user_id', value: 'user-1' },
          { column: 'paper_scope', value: '9709:paper:p1' },
        ],
      },
    ]);
    expect(db.inserts).toEqual([]);
    expect(workspace).toMatchObject({
      paper_workspace_id: 'paper-workspace-existing-1',
      user_id: 'user-1',
      paper_scope: '9709:paper:p1',
    });
  });

  test('ensureWorkspaceExists creates a canonical workspace row when one does not exist yet', async () => {
    const db = createWorkspaceDb();

    const workspace = await ensureWorkspaceExists(db, {
      userId: 'user-1',
      topicId: 'topic-1',
      topicPath: '9709/trigonometry/equations',
    });

    expect(db.selects).toEqual([
      {
        table: 'learning_workspaces',
        selection: '*',
        filters: [
          { column: 'user_id', value: 'user-1' },
          { column: 'topic_id', value: 'topic-1' },
        ],
      },
    ]);
    expect(db.inserts).toEqual([
      {
        table: 'learning_workspaces',
        payload: {
          user_id: 'user-1',
          topic_id: 'topic-1',
          topic_path: '9709/trigonometry/equations',
          slot_state: {},
          linked_reference_summary: {},
        },
      },
    ]);
    expect(workspace).toMatchObject({
      workspace_id: 'workspace-created-1',
      user_id: 'user-1',
      topic_id: 'topic-1',
      topic_path: '9709/trigonometry/equations',
    });
  });

  test('ensureWorkspaceExists retries by re-reading when the insert loses a unique-key race', async () => {
    const db = createWorkspaceDb();
    db.setInsertError(
      {
        code: '23505',
        message:
          'duplicate key value violates unique constraint "learning_workspaces_user_id_topic_id_key"',
      },
      {
        workspace_id: 'workspace-raced-1',
        user_id: 'user-1',
        topic_id: 'topic-1',
        topic_path: '9709/trigonometry/equations',
        slot_state: {},
        linked_reference_summary: {},
      },
    );

    const workspace = await ensureWorkspaceExists(db, {
      userId: 'user-1',
      topicId: 'topic-1',
      topicPath: '9709/trigonometry/equations',
    });

    expect(db.selects).toEqual([
      {
        table: 'learning_workspaces',
        selection: '*',
        filters: [
          { column: 'user_id', value: 'user-1' },
          { column: 'topic_id', value: 'topic-1' },
        ],
      },
      {
        table: 'learning_workspaces',
        selection: '*',
        filters: [
          { column: 'user_id', value: 'user-1' },
          { column: 'topic_id', value: 'topic-1' },
        ],
      },
    ]);
    expect(workspace).toMatchObject({
      workspace_id: 'workspace-raced-1',
      user_id: 'user-1',
      topic_id: 'topic-1',
    });
  });

  test('ensurePaperWorkspaceExists creates a paper workspace row without touching topic workspaces', async () => {
    const db = createWorkspaceDb();

    const paperWorkspace = await ensurePaperWorkspaceExists(db, {
      userId: 'user-1',
      subjectCode: '9709',
      paperScope: '9709:paper:p6',
    });

    expect(db.selects).toEqual([
      {
        table: 'learning_paper_workspaces',
        selection: '*',
        filters: [
          { column: 'user_id', value: 'user-1' },
          { column: 'paper_scope', value: '9709:paper:p6' },
        ],
      },
    ]);
    expect(db.inserts).toEqual([
      {
        table: 'learning_paper_workspaces',
        payload: {
          user_id: 'user-1',
          subject_code: '9709',
          paper_scope: '9709:paper:p6',
          workspace_kind: 'paper_main',
          visible_organization_summary: {},
          linked_topic_summary: {},
        },
      },
    ]);
    expect(paperWorkspace).toMatchObject({
      paper_workspace_id: 'paper-workspace-created-1',
      user_id: 'user-1',
      subject_code: '9709',
      paper_scope: '9709:paper:p6',
    });
  });

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

  test('fetchPaperWorkspaceProjection returns paper scope and deterministic topic sections', async () => {
    const db = createWorkspaceDb();

    const payload = await fetchPaperWorkspaceProjection(db, {
      userId: 'user-1',
      paperScope: '9709:paper:p1',
    });

    expect(db.selects).toEqual([
      {
        table: 'learning_paper_workspace_projection',
        selection: '*',
        filters: [
          { column: 'user_id', value: 'user-1' },
          { column: 'paper_scope', value: '9709:paper:p1' },
        ],
      },
    ]);

    expect(payload).toMatchObject({
      paper_workspace_id: 'paper-workspace-1',
      user_id: 'user-1',
      subject_code: '9709',
      paper_scope: '9709:paper:p1',
      workspace_kind: 'paper_main',
      visible_organization_summary: {
        label: 'Pure Mathematics 1',
      },
      linked_topic_summary: {
        total_topic_sections: 2,
      },
      created_at: '2026-06-05T08:00:00.000Z',
      updated_at: '2026-06-05T08:05:00.000Z',
    });
    expect(payload.topic_sections).toEqual([
      {
        paper_workspace_topic_section_id: 'section-1',
        topic_id: 'topic-1',
        topic_workspace_id: 'workspace-topic-1',
        topic_path: '9709/trigonometry/equations',
        section_state: {
          visibility: 'primary',
        },
        created_at: '2026-06-05T08:00:00.000Z',
        updated_at: '2026-06-05T08:03:00.000Z',
      },
      {
        paper_workspace_topic_section_id: 'section-2',
        topic_id: 'topic-2',
        topic_workspace_id: 'workspace-topic-2',
        topic_path: '9709/trigonometry/identities',
        section_state: {
          visibility: 'secondary',
        },
        created_at: '2026-06-05T08:01:00.000Z',
        updated_at: '2026-06-05T08:02:00.000Z',
      },
    ]);
  });
});
