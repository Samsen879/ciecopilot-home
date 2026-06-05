import {
  resolvePaperWorkspaceEntryAnchor,
} from '../lib/workspaces/paper-workspace-entry-resolver.js';

function createResolverDb(overrides = {}) {
  const queries = [];
  const topics = overrides.topics ?? [
    {
      node_id: 'topic-1',
      topic_path: '9709/trigonometry/equations',
    },
    {
      node_id: 'topic-2',
      topic_path: '9709/trigonometry/identities',
    },
    {
      node_id: 'topic-3',
      topic_path: '9709/calculus/differentiation',
    },
  ];
  const questions = overrides.questions ?? [
    {
      question_id: 'question-strong',
      subject_code: '9709',
      paper_scope: { paper_scope: '9709:paper:p1' },
      primary_topic_id: 'topic-1',
      secondary_topic_ids: ['topic-2'],
      primary_question_type_id: '9709.trigonometry.equations',
      secondary_question_type_ids: ['9709.trigonometry.identities'],
    },
    {
      question_id: 'question-mixed-source',
      subject_code: '9709',
      paper_scope: { paper_scope_key: '9709:paper:p1' },
      primary_topic_id: 'topic-1',
      secondary_topic_ids: ['topic-2'],
      primary_question_type_id: '9709.trigonometry.equations',
      secondary_question_type_ids: ['9709.trigonometry.identities'],
    },
    {
      question_id: 'question-legacy-paper',
      subject_code: '9709',
      paper_scope: {
        storage_key: '9709/s19_qp_11/questions/q06.png',
        q_number: 6,
      },
      primary_topic_id: 'topic-1',
      secondary_topic_ids: [],
      primary_question_type_id: '9709.trigonometry.equations',
      secondary_question_type_ids: [],
    },
  ];
  const reviewTasks = overrides.reviewTasks ?? [
    {
      review_task_id: 'review-mixed-target',
      user_id: 'student-1',
      target_topic_id: 'topic-2',
      target_topic_path: '9709/trigonometry/identities',
      target_question_type_id: '9709.trigonometry.identities',
      source_question_id: 'question-mixed-source',
      status: 'open',
    },
  ];
  const artifacts = overrides.artifacts ?? [
    {
      artifact_id: 'artifact-topic-2',
      canonical_home_topic_id: 'topic-2',
      source_session_id: 'session-paper-p1',
      target_question_type_id: '9709.trigonometry.identities',
      lifecycle_status: 'active',
    },
  ];
  const sessions = overrides.sessions ?? [
    {
      session_id: 'session-paper-p1',
      user_id: 'student-1',
      active_scope_bundle: {
        primary_topic_id: 'topic-2',
        primary_topic_path: '9709/trigonometry/identities',
        paper_context: {
          paper_scope: '9709:paper:p1',
        },
      },
    },
  ];
  const workspaces = overrides.workspaces ?? [
    {
      workspace_id: 'workspace-topic-1',
      user_id: 'student-1',
      topic_id: 'topic-1',
      topic_path: '9709/trigonometry/equations',
    },
    {
      workspace_id: 'workspace-topic-2',
      user_id: 'student-1',
      topic_id: 'topic-2',
      topic_path: '9709/trigonometry/identities',
    },
  ];
  const paperWorkspaceProjections = overrides.paperWorkspaceProjections ?? [
    {
      paper_workspace_id: 'paper-workspace-p1',
      user_id: 'student-1',
      subject_code: '9709',
      paper_scope: '9709:paper:p1',
      workspace_kind: 'paper_main',
      visible_organization_summary: { label: 'Pure Mathematics 1' },
      linked_topic_summary: { total_topic_sections: 2 },
      created_at: '2026-06-05T08:00:00.000Z',
      updated_at: '2026-06-05T08:05:00.000Z',
      topic_sections: [
        {
          paper_workspace_topic_section_id: 'section-topic-1',
          topic_id: 'topic-1',
          topic_workspace_id: 'workspace-topic-1',
          topic_path: '9709/trigonometry/equations',
          section_state: { order: 1 },
          created_at: '2026-06-05T08:01:00.000Z',
          updated_at: '2026-06-05T08:03:00.000Z',
        },
        {
          paper_workspace_topic_section_id: 'section-topic-2',
          topic_id: 'topic-2',
          topic_workspace_id: 'workspace-topic-2',
          topic_path: '9709/trigonometry/identities',
          section_state: { order: 2 },
          created_at: '2026-06-05T08:02:00.000Z',
          updated_at: '2026-06-05T08:04:00.000Z',
        },
      ],
    },
  ];

  function filterRows(table, filters) {
    let rows;

    if (table === 'curriculum_nodes') {
      rows = topics;
    } else if (table === 'question_bank') {
      rows = questions;
    } else if (table === 'learning_review_queue_projection') {
      rows = reviewTasks;
    } else if (table === 'learning_artifacts') {
      rows = artifacts;
    } else if (table === 'learning_sessions') {
      rows = sessions;
    } else if (table === 'learning_workspaces') {
      rows = workspaces;
    } else if (table === 'learning_paper_workspace_projection') {
      rows = paperWorkspaceProjections;
    } else {
      throw new Error(`Unexpected resolver fixture table: ${table}`);
    }

    return rows.filter((row) =>
      filters.every((filter) => row[filter.column] === filter.value));
  }

  class QueryBuilder {
    constructor(table) {
      this.table = table;
      this.selection = '*';
      this.filters = [];
    }

    select(selection) {
      this.selection = selection;
      return this;
    }

    eq(column, value) {
      this.filters.push({ column, value });
      return this;
    }

    async maybeSingle() {
      queries.push({
        table: this.table,
        selection: this.selection,
        filters: [...this.filters],
        maybeSingle: true,
      });
      return {
        data: filterRows(this.table, this.filters)[0] ?? null,
        error: null,
      };
    }

    then(resolve, reject) {
      queries.push({
        table: this.table,
        selection: this.selection,
        filters: [...this.filters],
        maybeSingle: false,
      });
      return Promise.resolve({
        data: filterRows(this.table, this.filters),
        error: null,
      }).then(resolve, reject);
    }
  }

  return {
    queries,
    from(table) {
      return new QueryBuilder(table);
    },
  };
}

describe('paper-workspace-entry-resolver', () => {
  test('direct paper-scope input resolves the paper workspace without inventing topic focus', async () => {
    const db = createResolverDb();

    const result = await resolvePaperWorkspaceEntryAnchor(db, {
      userId: 'student-1',
      anchorKind: 'paper_scope',
      anchorRef: { kind: 'paper_scope', paper_scope: '9709:paper:p1' },
    });

    expect(result).toMatchObject({
      ok: true,
      resolution_status: 'resolved',
      paper_workspace: {
        paper_workspace_id: 'paper-workspace-p1',
        paper_scope: '9709:paper:p1',
        subject_code: '9709',
      },
      topic_section_focus: null,
      canonical_topic_ownership: null,
      linked_reference_posture: {
        posture: 'paper_scope_only',
        reason_code: 'direct_paper_scope_anchor',
      },
      active_scope_compatibility: {
        status: 'degraded',
        reason_code: 'paper_scope_anchor_requires_formal_topic_or_object_anchor',
      },
    });
    expect(result.active_scope_bundle).toBeNull();
    expect(result.browse_scope_context).toMatchObject({
      paper_scope: '9709:paper:p1',
      current_anchor_kind: 'paper_scope',
    });
  });

  test('topic id resolves to paper workspace and active-scope-compatible concept focus', async () => {
    const db = createResolverDb();

    const result = await resolvePaperWorkspaceEntryAnchor(db, {
      userId: 'student-1',
      anchorKind: 'topic',
      anchorRef: { kind: 'topic', topic_id: 'topic-1' },
    });

    expect(result).toMatchObject({
      ok: true,
      paper_workspace: {
        paper_scope: '9709:paper:p1',
      },
      topic_section_focus: {
        paper_workspace_topic_section_id: 'section-topic-1',
        topic_id: 'topic-1',
        topic_path: '9709/trigonometry/equations',
        topic_workspace_id: 'workspace-topic-1',
      },
      canonical_topic_ownership: {
        owner_kind: 'topic',
        topic_id: 'topic-1',
        topic_path: '9709/trigonometry/equations',
        authority: 'canonical_home',
      },
      active_scope_bundle: {
        primary_topic_id: 'topic-1',
        primary_topic_path: '9709/trigonometry/equations',
        paper_context: {
          paper_scope: '9709:paper:p1',
        },
        current_anchor_kind: 'concept',
        current_anchor_ref: {
          kind: 'concept',
          topic_id: 'topic-1',
          topic_path: '9709/trigonometry/equations',
        },
        current_question_ref: null,
        current_question_type_ref: null,
      },
    });
    expect(result.active_scope_compatibility.status).toBe('compatible');
  });

  test('question anchor resolves paper scope, canonical topic ownership, and secondary linked references', async () => {
    const db = createResolverDb();

    const result = await resolvePaperWorkspaceEntryAnchor(db, {
      userId: 'student-1',
      anchorKind: 'question',
      anchorRef: { kind: 'question', question_id: 'question-strong' },
    });

    expect(result).toMatchObject({
      ok: true,
      paper_workspace: {
        paper_scope: '9709:paper:p1',
      },
      topic_section_focus: {
        topic_id: 'topic-1',
      },
      canonical_topic_ownership: {
        owner_kind: 'topic',
        topic_id: 'topic-1',
        topic_path: '9709/trigonometry/equations',
        authority: 'canonical_home',
        source: 'question.primary_topic',
      },
      linked_reference_posture: {
        posture: 'canonical_home_with_secondary_links',
        secondary_topic_refs: [
          {
            kind: 'topic',
            topic_id: 'topic-2',
            topic_path: '9709/trigonometry/identities',
          },
        ],
      },
      active_scope_bundle: {
        primary_topic_id: 'topic-1',
        secondary_topics_in_scope: [
          {
            kind: 'topic',
            topic_id: 'topic-2',
            topic_path: '9709/trigonometry/identities',
          },
        ],
        current_anchor_kind: 'question',
        current_anchor_ref: { kind: 'question', question_id: 'question-strong' },
        current_question_ref: { kind: 'question', question_id: 'question-strong' },
        current_question_type_ref: {
          kind: 'question_type',
          question_type_id: '9709.trigonometry.equations',
        },
      },
    });
  });

  test('review-task anchor uses target topic as canonical home and source question as linked attribution', async () => {
    const db = createResolverDb();

    const result = await resolvePaperWorkspaceEntryAnchor(db, {
      userId: 'student-1',
      anchorKind: 'review_task',
      anchorRef: { kind: 'review_task', review_task_id: 'review-mixed-target' },
    });

    expect(result).toMatchObject({
      ok: true,
      topic_section_focus: {
        topic_id: 'topic-2',
        topic_path: '9709/trigonometry/identities',
      },
      canonical_topic_ownership: {
        owner_kind: 'topic',
        topic_id: 'topic-2',
        topic_path: '9709/trigonometry/identities',
        authority: 'canonical_home',
        source: 'review_task.target_topic',
      },
      linked_reference_posture: {
        posture: 'canonical_home_with_source_attribution',
        source_refs: [
          { kind: 'question', question_id: 'question-mixed-source' },
          {
            kind: 'topic',
            topic_id: 'topic-1',
            topic_path: '9709/trigonometry/equations',
          },
        ],
      },
      active_scope_bundle: {
        primary_topic_id: 'topic-2',
        current_anchor_kind: 'review_task',
        current_anchor_ref: {
          kind: 'review_task',
          review_task_id: 'review-mixed-target',
        },
        current_question_ref: { kind: 'question', question_id: 'question-mixed-source' },
        current_question_type_ref: {
          kind: 'question_type',
          question_type_id: '9709.trigonometry.identities',
        },
      },
    });
  });

  test('artifact anchor resolves through source session paper context and canonical home topic', async () => {
    const db = createResolverDb();

    const result = await resolvePaperWorkspaceEntryAnchor(db, {
      userId: 'student-1',
      anchorKind: 'artifact',
      anchorRef: { kind: 'artifact', artifact_id: 'artifact-topic-2' },
    });

    expect(result).toMatchObject({
      ok: true,
      paper_workspace: {
        paper_scope: '9709:paper:p1',
      },
      topic_section_focus: {
        topic_id: 'topic-2',
      },
      canonical_topic_ownership: {
        topic_id: 'topic-2',
        source: 'artifact.canonical_home_topic',
      },
      active_scope_bundle: {
        current_anchor_kind: 'artifact',
        current_anchor_ref: {
          kind: 'artifact',
          artifact_id: 'artifact-topic-2',
        },
      },
    });
  });

  test('workspace-slot anchor resolves the owning topic section where currently supported', async () => {
    const db = createResolverDb();

    const result = await resolvePaperWorkspaceEntryAnchor(db, {
      userId: 'student-1',
      anchorKind: 'workspace_slot',
      anchorRef: {
        kind: 'workspace_slot',
        workspace_id: 'workspace-topic-2',
        slot_key: 'review_queue',
      },
    });

    expect(result).toMatchObject({
      ok: true,
      paper_workspace: {
        paper_scope: '9709:paper:p1',
      },
      topic_section_focus: {
        topic_id: 'topic-2',
      },
      active_scope_bundle: {
        primary_topic_id: 'topic-2',
        current_anchor_kind: 'workspace_slot',
        current_anchor_ref: {
          kind: 'workspace_slot',
          workspace_id: 'workspace-topic-2',
          slot_key: 'review_queue',
        },
      },
    });
  });

  test('legacy question without resolvable paper scope degrades instead of guessing from topic membership', async () => {
    const db = createResolverDb();

    const result = await resolvePaperWorkspaceEntryAnchor(db, {
      userId: 'student-1',
      anchorKind: 'question',
      anchorRef: { kind: 'question', question_id: 'question-legacy-paper' },
    });

    expect(result).toMatchObject({
      ok: false,
      resolution_status: 'degraded',
      paper_workspace: null,
      topic_section_focus: null,
      canonical_topic_ownership: {
        topic_id: 'topic-1',
        topic_path: '9709/trigonometry/equations',
      },
      linked_reference_posture: {
        posture: 'degraded_missing_paper_scope',
        reason_code: 'legacy_question_paper_scope_unresolved',
      },
      error: {
        code: 'paper_scope_unresolved',
      },
    });
  });

  test('ambiguous weak topic anchors fail closed when more than one paper workspace matches', async () => {
    const db = createResolverDb({
      paperWorkspaceProjections: [
        {
          paper_workspace_id: 'paper-workspace-p1',
          user_id: 'student-1',
          subject_code: '9709',
          paper_scope: '9709:paper:p1',
          workspace_kind: 'paper_main',
          topic_sections: [
            {
              paper_workspace_topic_section_id: 'section-p1-topic-1',
              topic_id: 'topic-1',
              topic_workspace_id: 'workspace-topic-1',
              topic_path: '9709/trigonometry/equations',
            },
          ],
        },
        {
          paper_workspace_id: 'paper-workspace-p3',
          user_id: 'student-1',
          subject_code: '9709',
          paper_scope: '9709:paper:p3',
          workspace_kind: 'paper_main',
          topic_sections: [
            {
              paper_workspace_topic_section_id: 'section-p3-topic-1',
              topic_id: 'topic-1',
              topic_workspace_id: 'workspace-topic-1',
              topic_path: '9709/trigonometry/equations',
            },
          ],
        },
      ],
    });

    const result = await resolvePaperWorkspaceEntryAnchor(db, {
      userId: 'student-1',
      anchorKind: 'topic',
      anchorRef: { kind: 'topic', topic_id: 'topic-1' },
    });

    expect(result).toMatchObject({
      ok: false,
      resolution_status: 'failed_closed',
      linked_reference_posture: {
        posture: 'ambiguous_paper_scope',
        reason_code: 'multiple_paper_workspaces_match_topic',
      },
      error: {
        code: 'ambiguous_paper_scope',
      },
    });
  });

  test('missing and unsupported anchors fail closed with explicit errors', async () => {
    const db = createResolverDb();

    await expect(resolvePaperWorkspaceEntryAnchor(db, {
      userId: 'student-1',
      anchorKind: 'question',
      anchorRef: { kind: 'question', question_id: 'missing-question' },
    })).resolves.toMatchObject({
      ok: false,
      resolution_status: 'failed_closed',
      error: {
        code: 'anchor_target_not_found',
      },
    });

    await expect(resolvePaperWorkspaceEntryAnchor(db, {
      userId: 'student-1',
      anchorKind: 'free_chat',
      anchorRef: { kind: 'free_chat' },
    })).resolves.toMatchObject({
      ok: false,
      resolution_status: 'failed_closed',
      error: {
        code: 'unsupported_anchor_kind',
      },
    });
  });
});
