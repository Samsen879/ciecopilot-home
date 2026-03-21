-- Create learning-runtime read-model views for the canonical persistence layer.

CREATE OR REPLACE VIEW public.learning_question_registry_projection AS
SELECT
  qb.question_id,
  qb.source_kind,
  qb.subject_code,
  qb.paper_scope,
  qb.primary_topic_id,
  qb.secondary_topic_ids,
  qb.family_id,
  lf.title AS family_title,
  qb.primary_question_type_id,
  lqt.title AS primary_question_type_title,
  qb.secondary_question_type_ids,
  qb.variant_tags,
  qb.release_scope_status,
  qb.classification_snapshot_ref,
  qb.prompt_representation,
  qb.provenance_summary,
  lqas.classification_confidence,
  lqas.candidate_rubric_refs
FROM public.question_bank qb
LEFT JOIN public.learning_question_families lf
  ON lf.family_id = qb.family_id
LEFT JOIN public.learning_question_types lqt
  ON lqt.question_type_id = qb.primary_question_type_id
LEFT JOIN public.learning_question_analysis_snapshots lqas
  ON lqas.question_id = qb.question_id
 AND lqas.superseded_by_snapshot_id IS NULL;

CREATE OR REPLACE VIEW public.learning_session_resume_projection AS
SELECT
  s.session_id,
  s.user_id,
  s.subject_code,
  s.session_goal,
  s.mode,
  s.state,
  s.active_scope_bundle,
  s.current_anchor_kind,
  s.current_anchor_ref,
  s.current_question_id,
  s.current_question_type_id,
  s.summary_state,
  s.open_questions,
  s.key_artifact_refs,
  s.misconceptions_in_focus,
  s.lineage_ref,
  s.created_at,
  s.updated_at,
  l.parent_session_id,
  l.handoff_kind,
  l.summary_snapshot
FROM public.learning_sessions s
LEFT JOIN public.learning_session_lineage l
  ON l.child_session_id = s.session_id;

CREATE OR REPLACE VIEW public.learning_workspace_projection AS
SELECT
  w.workspace_id,
  w.user_id,
  w.topic_id,
  w.topic_path,
  w.slot_state,
  w.linked_reference_summary,
  w.created_at,
  w.updated_at,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'workspace_slot_id', s.workspace_slot_id,
        'slot_key', s.slot_key,
        'primary_artifact_ref', s.primary_artifact_ref,
        'linked_reference_refs', s.linked_reference_refs,
        'updated_at', s.updated_at
      )
      ORDER BY s.slot_key
    ) FILTER (WHERE s.workspace_slot_id IS NOT NULL),
    '[]'::jsonb
  ) AS slots
FROM public.learning_workspaces w
LEFT JOIN public.learning_workspace_slots s
  ON s.workspace_id = w.workspace_id
GROUP BY
  w.workspace_id,
  w.user_id,
  w.topic_id,
  w.topic_path,
  w.slot_state,
  w.linked_reference_summary,
  w.created_at,
  w.updated_at;

CREATE OR REPLACE VIEW public.learning_review_queue_projection AS
SELECT
  rt.review_task_id,
  rt.user_id,
  rt.target_kind,
  rt.target_topic_id,
  cn.topic_path::text AS target_topic_path,
  rt.target_family_id,
  lf.title AS target_family_title,
  rt.target_question_type_id,
  lqt.title AS target_question_type_title,
  rt.target_misconception_tags,
  rt.related_artifact_refs,
  rt.source_question_id,
  rt.source_attempt_ref,
  rt.trigger_type,
  rt.mode,
  rt.due_at,
  rt.priority,
  rt.estimated_minutes,
  rt.success_criteria,
  rt.completion_evidence,
  rt.status,
  rt.created_at,
  rt.updated_at
FROM public.learning_review_tasks rt
LEFT JOIN public.curriculum_nodes cn
  ON cn.node_id = rt.target_topic_id
LEFT JOIN public.learning_question_families lf
  ON lf.family_id = rt.target_family_id
LEFT JOIN public.learning_question_types lqt
  ON lqt.question_type_id = rt.target_question_type_id;
