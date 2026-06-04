-- Create a migration-owned question-search projection with explicit descriptor fallback.

DO $migration$
DECLARE
  descriptor_source_sql TEXT;
BEGIN
  IF to_regclass('public.question_descriptions_prod_v1') IS NOT NULL THEN
    descriptor_source_sql := 'public.question_descriptions_prod_v1';
  ELSE
    descriptor_source_sql := $fallback$
      (
        SELECT *
        FROM public.question_descriptions_v0
        WHERE status = 'ok'
      )
    $fallback$;
  END IF;

  EXECUTE format(
    $view$
    CREATE OR REPLACE VIEW public.learning_question_search_projection AS
    WITH descriptor_rows AS (
      SELECT
        qd.storage_key,
        qd.q_number,
        qd.summary,
        qd.question_type,
        qd.answer_form,
        qd.year,
        qd.session,
        qd.paper AS paper_number,
        qd.variant
      FROM %s qd
    ),
    question_rows AS (
      SELECT
        qb.*,
        NULLIF(BTRIM(qb.provenance_summary ->> 'normalized_plain_text'), '') AS normalized_plain_text,
        COALESCE(
          NULLIF(BTRIM(qb.provenance_summary ->> 'question_plain_text_source'), ''),
          CASE
            WHEN NULLIF(BTRIM(qb.provenance_summary ->> 'normalized_plain_text'), '') IS NOT NULL
              THEN 'question_plain_text_v2.normalized_plain_text'
            ELSE NULL
          END
        ) AS question_plain_text_source,
        NULLIF(BTRIM(qb.provenance_summary ->> 'text_consumption_status'), '') AS text_consumption_status,
        CASE LOWER(NULLIF(BTRIM(qb.provenance_summary ->> 'requires_image_context'), ''))
          WHEN 'true' THEN TRUE
          WHEN 'false' THEN FALSE
          ELSE NULL
        END AS requires_image_context,
        CASE LOWER(NULLIF(BTRIM(qb.provenance_summary ->> 'text_only_addressable'), ''))
          WHEN 'true' THEN TRUE
          WHEN 'false' THEN FALSE
          ELSE NULL
        END AS text_only_addressable
      FROM public.question_bank qb
    )
    SELECT
      qb.question_id,
      qb.source_kind,
      qb.subject_code,
      qb.release_scope_status,
      qb.primary_topic_id,
      cn.topic_path::text AS primary_topic_path,
      cn.title AS primary_topic_title,
      qb.family_id,
      qb.primary_question_type_id,
      qb.variant_tags,
      qb.storage_key,
      qb.q_number,
      qb.normalized_plain_text,
      qb.question_plain_text_source,
      qb.text_consumption_status,
      qb.requires_image_context,
      qb.text_only_addressable,
      COALESCE(
        NULLIF(BTRIM(descriptor_rows.summary), ''),
        NULLIF(BTRIM(qb.provenance_summary ->> 'summary'), ''),
        NULLIF(BTRIM(qb.provenance_summary ->> 'title'), ''),
        NULLIF(BTRIM(qb.prompt_representation ->> 'value'), '')
      ) AS summary,
      descriptor_rows.question_type,
      descriptor_rows.answer_form,
      COALESCE(
        descriptor_rows.year,
        (qb.paper_scope ->> 'year')::INTEGER
      ) AS year,
      COALESCE(
        descriptor_rows.session,
        qb.paper_scope ->> 'session'
      ) AS session,
      COALESCE(
        descriptor_rows.paper_number,
        (qb.paper_scope ->> 'paper')::INTEGER
      ) AS paper_number,
      COALESCE(
        descriptor_rows.variant,
        (qb.paper_scope ->> 'variant')::INTEGER
      ) AS variant,
      COALESCE(
        qb.normalized_plain_text,
        NULLIF(BTRIM(qb.provenance_summary ->> 'search_text'), ''),
        NULLIF(BTRIM(descriptor_rows.summary), ''),
        NULLIF(BTRIM(qb.provenance_summary ->> 'summary'), ''),
        NULLIF(BTRIM(qb.prompt_representation ->> 'value'), ''),
        NULLIF(BTRIM(qb.provenance_summary ->> 'title'), '')
      ) AS search_text,
      CASE
        WHEN qb.normalized_plain_text IS NOT NULL THEN 'question_plain_text_v2.normalized_plain_text'
        WHEN NULLIF(BTRIM(qb.provenance_summary ->> 'search_text'), '') IS NOT NULL THEN 'provenance_summary.search_text'
        WHEN NULLIF(BTRIM(descriptor_rows.summary), '') IS NOT NULL THEN 'descriptor_rows.summary'
        WHEN NULLIF(BTRIM(qb.provenance_summary ->> 'summary'), '') IS NOT NULL THEN 'provenance_summary.summary'
        WHEN NULLIF(BTRIM(qb.prompt_representation ->> 'value'), '') IS NOT NULL THEN 'prompt_representation.value'
        WHEN NULLIF(BTRIM(qb.provenance_summary ->> 'title'), '') IS NOT NULL THEN 'provenance_summary.title'
        ELSE NULL
      END AS search_text_source
    FROM question_rows qb
    LEFT JOIN public.curriculum_nodes cn
      ON cn.node_id = qb.primary_topic_id
    LEFT JOIN descriptor_rows
      ON descriptor_rows.storage_key = qb.storage_key
     AND descriptor_rows.q_number = qb.q_number
    $view$,
    descriptor_source_sql
  );
END
$migration$;
