-- Add paper workspace read-model fields without replacing topic-owned truth.

CREATE OR REPLACE VIEW public.learning_paper_workspace_projection AS
WITH
slot_keys(slot_key) AS (
  VALUES
    ('overview_map'),
    ('core_method_derivation'),
    ('canonical_worked_example'),
    ('common_traps'),
    ('my_notes'),
    ('review_queue')
),
topic_section_rows AS (
  SELECT
    pw.paper_workspace_id,
    jsonb_build_object(
      'paper_workspace_topic_section_id', ts.paper_workspace_topic_section_id,
      'topic_id', ts.topic_id,
      'topic_workspace_id', COALESCE(ts.topic_workspace_id, lwp.workspace_id),
      'topic_path', ts.topic_path,
      'section_state', ts.section_state,
      'canonical_ownership', jsonb_build_object(
        'owner_kind', 'topic',
        'topic_id', ts.topic_id,
        'topic_path', ts.topic_path
      ),
      'topic_workspace',
        CASE
          WHEN lwp.workspace_id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'workspace_id', lwp.workspace_id,
            'slot_state', lwp.slot_state,
            'linked_reference_summary', lwp.linked_reference_summary,
            'slots', lwp.slots,
            'updated_at', lwp.updated_at
          )
        END,
      'created_at', ts.created_at,
      'updated_at', ts.updated_at
    ) AS topic_section
  FROM public.learning_paper_workspaces pw
  JOIN public.learning_paper_workspace_topic_sections ts
    ON ts.paper_workspace_id = pw.paper_workspace_id
  LEFT JOIN public.learning_topic_workspace_compatibility_projection lwp
    ON lwp.user_id = pw.user_id
   AND lwp.topic_id = ts.topic_id
),
topic_sections AS (
  SELECT
    paper_workspace_id,
    jsonb_agg(
      topic_section
      ORDER BY topic_section ->> 'topic_path', topic_section ->> 'topic_id'
    ) AS topic_sections
  FROM topic_section_rows
  GROUP BY paper_workspace_id
),
paper_slot_topic_sections AS (
  SELECT
    pw.paper_workspace_id,
    sk.slot_key,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'paper_workspace_topic_section_id', ts.paper_workspace_topic_section_id,
          'topic_id', ts.topic_id,
          'topic_path', ts.topic_path,
          'workspace_slot_id', slot_row.slot ->> 'workspace_slot_id',
          'primary_artifact_ref', slot_row.slot -> 'primary_artifact_ref',
          'slot_state', pw_slot_state.value,
          'updated_at', slot_row.slot ->> 'updated_at'
        )
        ORDER BY ts.topic_path, ts.topic_id
      ) FILTER (WHERE ts.paper_workspace_topic_section_id IS NOT NULL),
      '[]'::jsonb
    ) AS topic_sections
  FROM public.learning_paper_workspaces pw
  CROSS JOIN slot_keys sk
  LEFT JOIN public.learning_paper_workspace_topic_sections ts
    ON ts.paper_workspace_id = pw.paper_workspace_id
  LEFT JOIN public.learning_topic_workspace_compatibility_projection lwp
    ON lwp.user_id = pw.user_id
   AND lwp.topic_id = ts.topic_id
  LEFT JOIN LATERAL (
    SELECT slot_item.value AS slot
    FROM jsonb_array_elements(COALESCE(lwp.slots, '[]'::jsonb)) AS slot_item(value)
    WHERE slot_item.value ->> 'slot_key' = sk.slot_key
    LIMIT 1
  ) slot_row ON TRUE
  LEFT JOIN LATERAL (
    SELECT lwp.slot_state -> sk.slot_key AS value
  ) pw_slot_state ON TRUE
  GROUP BY pw.paper_workspace_id, sk.slot_key
),
paper_artifact_summary_rows AS (
  SELECT DISTINCT ON (pw.paper_workspace_id, a.artifact_id)
    pw.paper_workspace_id,
    a.slot_key,
    jsonb_build_object(
      'artifact_id', a.artifact_id,
      'artifact_kind', a.artifact_kind,
      'canonical_home_topic_id', a.canonical_home_topic_id,
      'topic_section_id', ts.paper_workspace_topic_section_id,
      'topic_id', ts.topic_id,
      'topic_path', ts.topic_path,
      'slot_key', a.slot_key,
      'placement_status', a.placement_status,
      'trust_status', a.trust_status,
      'lifecycle_status', a.lifecycle_status,
      'artifact_state', a.artifact_state,
      'target_question_type_id', a.target_question_type_id,
      'updated_at', a.updated_at
    ) AS artifact_summary
  FROM public.learning_paper_workspaces pw
  JOIN public.learning_paper_workspace_topic_sections ts
    ON ts.paper_workspace_id = pw.paper_workspace_id
  JOIN public.learning_artifacts a
    ON a.canonical_home_topic_id = ts.topic_id
  WHERE a.placement_status = 'pinned'
    AND a.lifecycle_status <> 'superseded'
  ORDER BY pw.paper_workspace_id, a.artifact_id, ts.topic_path, a.updated_at DESC
),
paper_slot_artifacts AS (
  SELECT
    pw.paper_workspace_id,
    sk.slot_key,
    COALESCE(
      jsonb_agg(
        ar.artifact_summary
        ORDER BY
          ar.artifact_summary ->> 'topic_path',
          ar.artifact_summary ->> 'updated_at' DESC,
          ar.artifact_summary ->> 'artifact_id'
      ) FILTER (WHERE ar.artifact_summary IS NOT NULL),
      '[]'::jsonb
    ) AS artifact_summaries
  FROM public.learning_paper_workspaces pw
  CROSS JOIN slot_keys sk
  LEFT JOIN paper_artifact_summary_rows ar
    ON ar.paper_workspace_id = pw.paper_workspace_id
   AND ar.slot_key = sk.slot_key
  GROUP BY pw.paper_workspace_id, sk.slot_key
),
paper_pinned_artifacts AS (
  SELECT
    paper_workspace_id,
    jsonb_agg(
      artifact_summary
      ORDER BY
        artifact_summary ->> 'topic_path',
        artifact_summary ->> 'slot_key',
        artifact_summary ->> 'updated_at' DESC,
        artifact_summary ->> 'artifact_id'
    ) AS pinned_artifact_summaries
  FROM paper_artifact_summary_rows
  GROUP BY paper_workspace_id
),
paper_slot_linked_ref_rows AS (
  SELECT DISTINCT
    pw.paper_workspace_id,
    sk.slot_key,
    ref.value AS linked_reference_ref
  FROM public.learning_paper_workspaces pw
  JOIN public.learning_paper_workspace_topic_sections ts
    ON ts.paper_workspace_id = pw.paper_workspace_id
  JOIN public.learning_topic_workspace_compatibility_projection lwp
    ON lwp.user_id = pw.user_id
   AND lwp.topic_id = ts.topic_id
  JOIN slot_keys sk
    ON TRUE
  JOIN LATERAL jsonb_array_elements(COALESCE(lwp.slots, '[]'::jsonb)) AS slot_item(value)
    ON slot_item.value ->> 'slot_key' = sk.slot_key
  JOIN LATERAL jsonb_array_elements(
    COALESCE(slot_item.value -> 'linked_reference_refs', '[]'::jsonb)
  ) AS ref(value)
    ON TRUE
),
paper_slot_linked_refs AS (
  SELECT
    pw.paper_workspace_id,
    sk.slot_key,
    COALESCE(
      jsonb_agg(lr.linked_reference_ref ORDER BY lr.linked_reference_ref)
        FILTER (WHERE lr.linked_reference_ref IS NOT NULL),
      '[]'::jsonb
    ) AS linked_reference_refs
  FROM public.learning_paper_workspaces pw
  CROSS JOIN slot_keys sk
  LEFT JOIN paper_slot_linked_ref_rows lr
    ON lr.paper_workspace_id = pw.paper_workspace_id
   AND lr.slot_key = sk.slot_key
  GROUP BY pw.paper_workspace_id, sk.slot_key
),
paper_linked_refs AS (
  SELECT
    paper_workspace_id,
    jsonb_agg(linked_reference_ref ORDER BY linked_reference_ref) AS linked_reference_refs
  FROM (
    SELECT DISTINCT paper_workspace_id, linked_reference_ref
    FROM paper_slot_linked_ref_rows
  ) refs
  GROUP BY paper_workspace_id
),
paper_review_task_rows AS (
  SELECT DISTINCT ON (pw.paper_workspace_id, rt.review_task_id)
    pw.paper_workspace_id,
    rt.review_task_id,
    jsonb_build_object(
      'kind', 'review_task',
      'review_task_id', rt.review_task_id,
      'target_topic_id', rt.target_topic_id,
      'target_topic_path', rt.target_topic_path,
      'target_question_type_id', rt.target_question_type_id,
      'status', rt.status,
      'due_at', rt.due_at,
      'updated_at', rt.updated_at
    ) AS review_task_ref
  FROM public.learning_paper_workspaces pw
  JOIN public.learning_paper_workspace_topic_sections ts
    ON ts.paper_workspace_id = pw.paper_workspace_id
  JOIN public.learning_review_queue_projection rt
    ON rt.user_id = pw.user_id
   AND rt.target_topic_id = ts.topic_id
  ORDER BY pw.paper_workspace_id, rt.review_task_id, rt.due_at NULLS LAST, rt.updated_at DESC
),
paper_review_shape AS (
  SELECT
    pw.paper_workspace_id,
    jsonb_build_object(
      'scope', 'paper_workspace_review_projection',
      'paper_scope', pw.paper_scope,
      'topic_filter_ready', TRUE,
      'topic_ids',
        COALESCE(
          (
            SELECT jsonb_agg(topic_rows.topic_id ORDER BY topic_rows.topic_path, topic_rows.topic_id)
            FROM (
              SELECT DISTINCT ts.topic_id, ts.topic_path
              FROM public.learning_paper_workspace_topic_sections ts
              WHERE ts.paper_workspace_id = pw.paper_workspace_id
            ) topic_rows
          ),
          '[]'::jsonb
        ),
      'review_task_refs',
        COALESCE(
          jsonb_agg(pr.review_task_ref ORDER BY pr.review_task_ref ->> 'due_at', pr.review_task_ref ->> 'review_task_id')
            FILTER (WHERE pr.review_task_ref IS NOT NULL),
          '[]'::jsonb
        )
    ) AS review_queue_projection_shape
  FROM public.learning_paper_workspaces pw
  LEFT JOIN paper_review_task_rows pr
    ON pr.paper_workspace_id = pw.paper_workspace_id
  GROUP BY pw.paper_workspace_id, pw.paper_scope
),
paper_stable_slots AS (
  SELECT
    pw.paper_workspace_id,
    jsonb_object_agg(
      sk.slot_key,
      jsonb_build_object(
        'slot_key', sk.slot_key,
        'topic_sections', COALESCE(psts.topic_sections, '[]'::jsonb),
        'artifact_summaries', COALESCE(psa.artifact_summaries, '[]'::jsonb),
        'linked_references', COALESCE(pslr.linked_reference_refs, '[]'::jsonb),
        'updated_at', NULL
      )
      ORDER BY sk.slot_key
    ) AS stable_slots
  FROM public.learning_paper_workspaces pw
  CROSS JOIN slot_keys sk
  LEFT JOIN paper_slot_topic_sections psts
    ON psts.paper_workspace_id = pw.paper_workspace_id
   AND psts.slot_key = sk.slot_key
  LEFT JOIN paper_slot_artifacts psa
    ON psa.paper_workspace_id = pw.paper_workspace_id
   AND psa.slot_key = sk.slot_key
  LEFT JOIN paper_slot_linked_refs pslr
    ON pslr.paper_workspace_id = pw.paper_workspace_id
   AND pslr.slot_key = sk.slot_key
  GROUP BY pw.paper_workspace_id
)
SELECT
  pw.paper_workspace_id,
  pw.user_id,
  pw.subject_code,
  pw.paper_scope,
  pw.workspace_kind,
  pw.visible_organization_summary,
  pw.linked_topic_summary,
  pw.created_at,
  pw.updated_at,
  COALESCE(ts.topic_sections, '[]'::jsonb) AS topic_sections,
  COALESCE(ps.stable_slots, '{}'::jsonb) AS stable_slots,
  COALESCE(pa.pinned_artifact_summaries, '[]'::jsonb) AS pinned_artifact_summaries,
  COALESCE(plr.linked_reference_refs, '[]'::jsonb) AS linked_reference_refs,
  COALESCE(
    prs.review_queue_projection_shape,
    jsonb_build_object(
      'scope', 'paper_workspace_review_projection',
      'paper_scope', pw.paper_scope,
      'topic_filter_ready', TRUE,
      'topic_ids', '[]'::jsonb,
      'review_task_refs', '[]'::jsonb
    )
  ) AS review_queue_projection_shape
FROM public.learning_paper_workspaces pw
LEFT JOIN topic_sections ts
  ON ts.paper_workspace_id = pw.paper_workspace_id
LEFT JOIN paper_stable_slots ps
  ON ps.paper_workspace_id = pw.paper_workspace_id
LEFT JOIN paper_pinned_artifacts pa
  ON pa.paper_workspace_id = pw.paper_workspace_id
LEFT JOIN paper_linked_refs plr
  ON plr.paper_workspace_id = pw.paper_workspace_id
LEFT JOIN paper_review_shape prs
  ON prs.paper_workspace_id = pw.paper_workspace_id;

COMMENT ON VIEW public.learning_paper_workspace_projection IS
  'Paper Workspace owns visible organization, stable slot grouping, and topic sections; canonical topic ownership remains on artifacts and review tasks.';
