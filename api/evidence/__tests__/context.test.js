import { getEvidenceContext } from '../context.js';

function createEvidenceDb() {
  const sessionRow = {
    session_id: 'session-1',
    user_id: 'student-1',
    subject_code: '9709',
    session_goal: 'Repair trigonometric equations',
    mode: 'spaced_review',
    state: 'active',
    active_scope_bundle: {
      primary_topic_id: 'topic-1',
      primary_topic_path: '9709/trigonometry/equations',
      secondary_topics_in_scope: [
        { kind: 'topic', topic_id: 'topic-2', topic_path: '9709/trigonometry/identities' },
      ],
      allowed_prerequisites: [],
      paper_context: null,
      mode: 'spaced_review',
      session_goal: 'Repair trigonometric equations',
      current_anchor_kind: 'review_task',
      current_anchor_ref: { kind: 'review_task', review_task_id: 'review-queued-1' },
      current_question_ref: { kind: 'question', question_id: 'question-1' },
      current_question_type_ref: {
        kind: 'question_type',
        question_type_id: '9709.trigonometry.equations',
      },
    },
    current_anchor_kind: 'review_task',
    current_anchor_ref: { kind: 'review_task', review_task_id: 'review-queued-1' },
    current_question_id: 'question-1',
    current_question_type_id: '9709.trigonometry.equations',
    summary_state: {},
    open_questions: [],
    key_artifact_refs: [],
    misconceptions_in_focus: ['domain:interval'],
    lineage_ref: { parent_session_id: null, handoff_kind: null },
    created_at: '2026-03-22T08:00:00.000Z',
    updated_at: '2026-03-22T08:00:00.000Z',
    parent_session_id: null,
    handoff_kind: null,
    summary_snapshot: {},
  };

  const workspaceRow = {
    workspace_id: 'workspace-1',
    user_id: 'student-1',
    topic_id: 'topic-1',
    topic_path: '9709/trigonometry/equations',
    slot_state: {
      common_traps: 'active',
      review_queue: 'active',
    },
    linked_reference_summary: {
      total_linked_references: 2,
    },
    updated_at: '2026-03-22T08:05:00.000Z',
    slots: [
      {
        workspace_slot_id: 'slot-common-traps',
        slot_key: 'common_traps',
        primary_artifact_ref: {
          kind: 'artifact',
          artifact_id: 'artifact-primary',
        },
        linked_reference_refs: [
          { kind: 'artifact', artifact_id: 'artifact-linked-1' },
        ],
        updated_at: '2026-03-22T08:05:00.000Z',
      },
    ],
  };

  class QueryBuilder {
    constructor(table) {
      this.table = table;
      this.filters = [];
    }

    select() {
      return this;
    }

    eq(column, value) {
      this.filters.push({ column, value });
      return this;
    }

    async maybeSingle() {
      if (this.table === 'learning_session_resume_projection') {
        return { data: sessionRow, error: null };
      }

      if (this.table === 'learning_workspace_projection') {
        return { data: workspaceRow, error: null };
      }

      throw new Error(`Unexpected maybeSingle table: ${this.table}`);
    }
  }

  return {
    async rpc(name) {
      if (name !== 'get_evidence_context') {
        throw new Error(`Unexpected RPC: ${name}`);
      }

      return {
        data: {
          mastery: {
            score: 0.42,
            sample_count: 4,
            weighted_sample_count: 5.5,
            low_confidence: true,
          },
          recent_decisions: [],
          misconception_tags: [
            { tag: 'domain:interval', weighted_count: 2 },
          ],
          recent_errors: [],
        },
        error: null,
      };
    },
    from(table) {
      return new QueryBuilder(table);
    },
  };
}

describe('evidence context learning-runtime extension', () => {
  test('evidence context exposes learning-runtime anchor and workspace state for projections', async () => {
    const payload = await getEvidenceContext(
      {
        client: createEvidenceDb(),
      },
      {
        userId: 'student-1',
        topicPath: '9709/trigonometry/equations',
        topicId: 'topic-1',
        sessionId: 'session-1',
        limit: 5,
      },
    );

    expect(payload.learning_runtime.current_anchor_kind).toBe('review_task');
    expect(payload.learning_runtime.current_anchor_ref).toEqual({
      kind: 'review_task',
      review_task_id: 'review-queued-1',
    });
    expect(payload.learning_runtime.current_question_ref).toEqual({
      kind: 'question',
      question_id: 'question-1',
    });
    expect(payload.learning_runtime.workspace).toMatchObject({
      workspace_id: 'workspace-1',
      topic_id: 'topic-1',
      slots: {
        common_traps: {
          workspace_slot_id: 'slot-common-traps',
          primary_artifact_ref: {
            kind: 'artifact',
            artifact_id: 'artifact-primary',
          },
          linked_references: [
            { kind: 'artifact', artifact_id: 'artifact-linked-1' },
          ],
        },
      },
    });
  });
});
