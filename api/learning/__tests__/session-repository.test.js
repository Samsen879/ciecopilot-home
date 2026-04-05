import {
  buildChildSessionLineage,
} from '../lib/session-runtime/session-handoff.js';
import {
  findSessionById,
  getSession,
  insertSession,
  updateSessionState,
} from '../lib/repositories/session-repository.js';

function createSessionDb() {
  const inserts = [];
  const selects = [];
  const updates = [];
  const lineageUpdates = [];

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
    updates,
    lineageUpdates,
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
                    session_id: payload.session_id || 'session-1',
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
        update(payload) {
          const filters = [];

          const builder = {
            eq(column, value) {
              filters.push({ column, value });
              return builder;
            },
            select() {
              return builder;
            },
            async single() {
              if (table === 'learning_sessions') {
                updates.push({ table, payload, filters });

                return {
                  data: {
                    ...resumeProjectionRow,
                    ...payload,
                  },
                  error: null,
                };
              }

              if (table === 'learning_session_lineage') {
                lineageUpdates.push({ table, payload, filters });

                return {
                  data: {
                    parent_session_id: resumeProjectionRow.parent_session_id,
                    child_session_id: resumeProjectionRow.session_id,
                    handoff_kind: resumeProjectionRow.handoff_kind,
                    summary_snapshot: payload.summary_snapshot,
                  },
                  error: null,
                };
              }

              throw new Error(`Unexpected update table: ${table}`);
            },
          };

          return builder;
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
      session_id: 'session-fixed-1',
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
          child_session_id: 'session-fixed-1',
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
    expect(session.session_id).toBe('session-fixed-1');
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

  test('findSessionById reads the resume projection and preserves lineage handoff data for resume flows', async () => {
    const db = createSessionDb();

    const session = await findSessionById(db, {
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

  test('updateSessionState patches the stored session row and preserves the lineage stub shape', async () => {
    const db = createSessionDb();

    const session = await updateSessionState(db, {
      sessionId: 'session-1',
      userId: 'user-1',
      state: 'handed_off',
      summary_state: {
        progress: 'started',
        handoff: { kind: 'explicit_new_session' },
      },
    });

    expect(db.updates).toEqual([
      {
        table: 'learning_sessions',
        payload: {
          state: 'handed_off',
          summary_state: {
            progress: 'started',
            handoff: { kind: 'explicit_new_session' },
          },
        },
        filters: [
          { column: 'session_id', value: 'session-1' },
          { column: 'user_id', value: 'user-1' },
        ],
      },
    ]);
    expect(db.lineageUpdates).toEqual([
      {
        table: 'learning_session_lineage',
        payload: {
          summary_snapshot: {
            progress: 'started',
          },
        },
        filters: [{ column: 'child_session_id', value: 'session-1' }],
      },
    ]);
    expect(session).toMatchObject({
      session_id: 'session-1',
      state: 'handed_off',
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
