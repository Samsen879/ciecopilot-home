import {
  buildChildSessionLineage,
} from '../lib/session-runtime/session-handoff.js';
import { getSession, insertSession } from '../lib/repositories/session-repository.js';

function createSessionDb() {
  const inserts = [];
  const selects = [];

  const resumeProjectionRow = {
    session_id: 'session-1',
    user_id: 'user-1',
    subject_code: '9709',
    session_goal: 'Practice trig identities',
    mode: 'guided_solve',
    state: 'active',
    active_scope_bundle: {
      primary_topic_id: 'topic-1',
      primary_topic_path: '9709/trigonometry/identities',
      secondary_topics_in_scope: [],
      allowed_prerequisites: [],
      paper_context: null,
      mode: 'guided_solve',
      session_goal: 'Practice trig identities',
      current_anchor_kind: 'question',
      current_anchor_ref: { kind: 'question', question_id: 'question-1' },
      current_question_ref: { kind: 'question', question_id: 'question-1' },
      current_question_type_ref: {
        kind: 'question_type',
        question_type_id: '9709.trigonometry.identities',
      },
    },
    current_anchor_kind: 'question',
    current_anchor_ref: { kind: 'question', question_id: 'question-1' },
    current_question_id: 'question-1',
    current_question_type_id: '9709.trigonometry.identities',
    summary_state: { progress: 'started' },
    open_questions: [],
    key_artifact_refs: [],
    misconceptions_in_focus: [],
    lineage_ref: { parent_session_id: null, handoff_kind: null },
    created_at: '2026-03-21T10:00:00.000Z',
    updated_at: '2026-03-21T10:00:00.000Z',
    parent_session_id: null,
    handoff_kind: null,
    summary_snapshot: { progress: 'started' },
  };

  return {
    inserts,
    selects,
    from(table) {
      return {
        insert(payload) {
          return {
            select() {
              return this;
            },
            async single() {
              inserts.push({ table, payload });

              if (table === 'learning_sessions') {
                return {
                  data: {
                    session_id: 'session-1',
                    created_at: '2026-03-21T10:00:00.000Z',
                    updated_at: '2026-03-21T10:00:00.000Z',
                    ...payload,
                  },
                  error: null,
                };
              }

              if (table === 'learning_session_lineage') {
                return {
                  data: {
                    lineage_id: 'lineage-1',
                    created_at: '2026-03-21T10:00:00.000Z',
                    ...payload,
                  },
                  error: null,
                };
              }

              throw new Error(`Unexpected insert table: ${table}`);
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

              if (table !== 'learning_session_resume_projection') {
                throw new Error(`Unexpected select table: ${table}`);
              }

              return {
                data: resumeProjectionRow,
                error: null,
              };
            },
          };
        },
      };
    },
  };
}

describe('session-repository', () => {
  test('buildChildSessionLineage prefers the carried lineage snapshot when the immediate parent summary is empty', () => {
    const lineage = buildChildSessionLineage({
      parentSessionId: '11111111-1111-4111-8111-111111111111',
      handoffKind: 'explicit_new_session',
      parentSession: {
        summary_state: {},
        lineage: {
          summary_snapshot: {
            recap: 'Inherited ancestor recap that should survive the next child handoff.',
          },
        },
      },
    });

    expect(lineage).toEqual({
      parent_session_id: '11111111-1111-4111-8111-111111111111',
      handoff_kind: 'explicit_new_session',
      lineage_summary_snapshot: {
        recap: 'Inherited ancestor recap that should survive the next child handoff.',
      },
    });
  });

  test('insertSession records a lineage stub with parent_session_id = null on create', async () => {
    const db = createSessionDb();

    const payload = {
      user_id: 'user-1',
      subject_code: '9709',
      session_goal: 'Practice trig identities',
      mode: 'guided_solve',
      active_scope_bundle: {
        primary_topic_id: 'topic-1',
        primary_topic_path: '9709/trigonometry/identities',
        secondary_topics_in_scope: [],
        allowed_prerequisites: [],
        paper_context: null,
        mode: 'guided_solve',
        session_goal: 'Practice trig identities',
        current_anchor_kind: 'question',
        current_anchor_ref: { kind: 'question', question_id: 'question-1' },
        current_question_ref: { kind: 'question', question_id: 'question-1' },
        current_question_type_ref: {
          kind: 'question_type',
          question_type_id: '9709.trigonometry.identities',
        },
      },
      current_anchor_kind: 'question',
      current_anchor_ref: { kind: 'question', question_id: 'question-1' },
      current_question_id: 'question-1',
      current_question_type_id: '9709.trigonometry.identities',
      summary_state: { progress: 'started' },
      open_questions: [],
      key_artifact_refs: [],
      misconceptions_in_focus: [],
    };

    const session = await insertSession(db, payload);

    expect(db.inserts).toEqual([
      {
        table: 'learning_sessions',
        payload: {
          ...payload,
          state: 'active',
          lineage_ref: {
            parent_session_id: null,
            handoff_kind: null,
          },
        },
      },
      {
        table: 'learning_session_lineage',
        payload: {
          parent_session_id: null,
          child_session_id: 'session-1',
          handoff_kind: null,
          summary_snapshot: { progress: 'started' },
        },
      },
    ]);

    expect(session.lineage).toEqual({
      parent_session_id: null,
      handoff_kind: null,
      summary_snapshot: { progress: 'started' },
    });
    expect(session.lineage_ref).toEqual({
      parent_session_id: null,
      handoff_kind: null,
    });
  });

  test('insertSession persists parent lineage and summary handoff snapshots for explicit child sessions', async () => {
    const db = createSessionDb();

    const payload = {
      user_id: 'user-1',
      subject_code: '9709',
      session_goal: 'Continue trig review from a compacted handoff',
      mode: 'learn_concept',
      active_scope_bundle: {
        primary_topic_id: 'topic-1',
        primary_topic_path: '9709/trigonometry/identities',
        secondary_topics_in_scope: [],
        allowed_prerequisites: [],
        paper_context: null,
        mode: 'learn_concept',
        session_goal: 'Continue trig review from a compacted handoff',
        current_anchor_kind: 'concept',
        current_anchor_ref: {
          kind: 'concept',
          topic_id: 'topic-1',
          topic_path: '9709/trigonometry/identities',
        },
        current_question_ref: null,
        current_question_type_ref: {
          kind: 'question_type',
          question_type_id: '9709.trigonometry.identities',
        },
      },
      current_anchor_kind: 'concept',
      current_anchor_ref: {
        kind: 'concept',
        topic_id: 'topic-1',
        topic_path: '9709/trigonometry/identities',
      },
      current_question_id: null,
      current_question_type_id: '9709.trigonometry.identities',
      summary_state: {
        recap: 'Start from the identities summary rather than the full prior thread.',
      },
      parent_session_id: 'session-parent-1',
      handoff_kind: 'explicit_new_session',
      lineage_summary_snapshot: {
        recap: 'Parent session compacted after a long review thread.',
        open_threads: ['double-angle', 'factorisation'],
      },
      open_questions: [],
      key_artifact_refs: [],
      misconceptions_in_focus: [],
    };

    const session = await insertSession(db, payload);

    expect(db.inserts).toEqual([
      {
        table: 'learning_sessions',
        payload: {
          user_id: 'user-1',
          subject_code: '9709',
          session_goal: 'Continue trig review from a compacted handoff',
          mode: 'learn_concept',
          active_scope_bundle: {
            primary_topic_id: 'topic-1',
            primary_topic_path: '9709/trigonometry/identities',
            secondary_topics_in_scope: [],
            allowed_prerequisites: [],
            paper_context: null,
            mode: 'learn_concept',
            session_goal: 'Continue trig review from a compacted handoff',
            current_anchor_kind: 'concept',
            current_anchor_ref: {
              kind: 'concept',
              topic_id: 'topic-1',
              topic_path: '9709/trigonometry/identities',
            },
            current_question_ref: null,
            current_question_type_ref: {
              kind: 'question_type',
              question_type_id: '9709.trigonometry.identities',
            },
          },
          current_anchor_kind: 'concept',
          current_anchor_ref: {
            kind: 'concept',
            topic_id: 'topic-1',
            topic_path: '9709/trigonometry/identities',
          },
          current_question_id: null,
          current_question_type_id: '9709.trigonometry.identities',
          summary_state: {
            recap: 'Start from the identities summary rather than the full prior thread.',
          },
          open_questions: [],
          key_artifact_refs: [],
          misconceptions_in_focus: [],
          state: 'active',
          lineage_ref: {
            parent_session_id: 'session-parent-1',
            handoff_kind: 'explicit_new_session',
          },
        },
      },
      {
        table: 'learning_session_lineage',
        payload: {
          parent_session_id: 'session-parent-1',
          child_session_id: 'session-1',
          handoff_kind: 'explicit_new_session',
          summary_snapshot: {
            recap: 'Parent session compacted after a long review thread.',
            open_threads: ['double-angle', 'factorisation'],
          },
        },
      },
    ]);

    expect(session.lineage).toEqual({
      parent_session_id: 'session-parent-1',
      handoff_kind: 'explicit_new_session',
      summary_snapshot: {
        recap: 'Parent session compacted after a long review thread.',
        open_threads: ['double-angle', 'factorisation'],
      },
    });
    expect(session.lineage_ref).toEqual({
      parent_session_id: 'session-parent-1',
      handoff_kind: 'explicit_new_session',
    });
  });

  test('getSession reads the resume projection and preserves lineage handoff data for resume flows', async () => {
    const db = createSessionDb();

    const session = await getSession(db, {
      sessionId: 'session-1',
      userId: 'user-1',
    });

    expect(db.selects).toEqual([
      {
        table: 'learning_session_resume_projection',
        selection: '*',
        filters: [
          { column: 'session_id', value: 'session-1' },
          { column: 'user_id', value: 'user-1' },
        ],
      },
    ]);

    expect(session).toMatchObject({
      session_id: 'session-1',
      lineage_ref: {
        parent_session_id: null,
        handoff_kind: null,
      },
      lineage: {
        parent_session_id: null,
        handoff_kind: null,
        summary_snapshot: { progress: 'started' },
      },
    });
  });
});
