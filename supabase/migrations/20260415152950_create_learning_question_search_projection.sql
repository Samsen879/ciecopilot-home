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
        NULLIF(BTRIM(qb.provenance_summary ->> 'search_text'), ''),
        NULLIF(BTRIM(descriptor_rows.summary), ''),
        NULLIF(BTRIM(qb.provenance_summary ->> 'summary'), ''),
        NULLIF(BTRIM(qb.prompt_representation ->> 'value'), ''),
        NULLIF(BTRIM(qb.provenance_summary ->> 'title'), '')
      ) AS search_text
    FROM public.question_bank qb
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
