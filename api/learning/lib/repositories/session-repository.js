import {
  buildLineageSummarySnapshot,
  normalizeSessionHandoffKind,
} from '../session-runtime/session-handoff.js';

function buildLineageRef({
  parent_session_id = null,
  handoff_kind = null,
} = {}) {
  return {
    parent_session_id,
    handoff_kind: normalizeSessionHandoffKind(handoff_kind),
  };
}

function buildLineageSummary(summaryState) {
  return buildLineageSummarySnapshot(summaryState);
}

function hydrateSession(sessionRow, lineageRow) {
  const lineage = {
    parent_session_id:
      lineageRow?.parent_session_id ?? sessionRow?.lineage_ref?.parent_session_id ?? null,
    handoff_kind: lineageRow?.handoff_kind ?? sessionRow?.lineage_ref?.handoff_kind ?? null,
    summary_snapshot:
      lineageRow?.summary_snapshot ?? buildLineageSummary(sessionRow?.summary_state),
  };

  return {
    ...sessionRow,
    lineage,
  };
}

export async function insertSession(client, input) {
  const lineage_ref = buildLineageRef({
    parent_session_id: input.parent_session_id ?? null,
    handoff_kind: input.handoff_kind ?? null,
  });
  const sessionRow = {
    session_id: input.session_id ?? undefined,
    user_id: input.user_id,
    subject_code: input.subject_code,
    session_goal: input.session_goal ?? null,
    mode: input.mode,
    state: input.state ?? 'active',
    active_scope_bundle: input.active_scope_bundle,
    current_anchor_kind: input.current_anchor_kind,
    current_anchor_ref: input.current_anchor_ref,
    current_question_id: input.current_question_id ?? null,
    current_question_type_id: input.current_question_type_id ?? null,
    summary_state: input.summary_state ?? {},
    open_questions: input.open_questions ?? [],
    key_artifact_refs: input.key_artifact_refs ?? [],
    misconceptions_in_focus: input.misconceptions_in_focus ?? [],
    lineage_ref,
  };

  if (typeof sessionRow.session_id === 'undefined') {
    delete sessionRow.session_id;
  }

  const { data: insertedSession, error: sessionError } = await client
    .from('learning_sessions')
    .insert(sessionRow)
    .select('*')
    .single();

  if (sessionError || !insertedSession) {
    throw new Error(`Failed to insert learning session: ${sessionError?.message || 'no data returned'}`);
  }

  const lineageRow = {
    parent_session_id: lineage_ref.parent_session_id,
    child_session_id: insertedSession.session_id,
    handoff_kind: lineage_ref.handoff_kind,
    summary_snapshot: buildLineageSummary(
      input.lineage_summary_snapshot ?? insertedSession.summary_state,
    ),
  };

  const { data: insertedLineage, error: lineageError } = await client
    .from('learning_session_lineage')
    .insert(lineageRow)
    .select('*')
    .single();

  if (lineageError || !insertedLineage) {
    throw new Error(
      `Failed to insert learning session lineage stub: ${lineageError?.message || 'no data returned'}`,
    );
  }

  return hydrateSession(insertedSession, insertedLineage);
}

export async function getSession(client, { sessionId, userId } = {}) {
  let query = client
    .from('learning_session_resume_projection')
    .select('*')
    .eq('session_id', sessionId);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Failed to load learning session: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return hydrateSession(data, {
    parent_session_id: data.parent_session_id ?? null,
    handoff_kind: data.handoff_kind ?? null,
    summary_snapshot: data.summary_snapshot ?? buildLineageSummary(data.summary_state),
  });
}
