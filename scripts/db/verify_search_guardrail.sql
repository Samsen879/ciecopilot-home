-- Verify syllabus-boundary search guardrails

-- 1) List candidate search/hybrid functions
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname ILIKE '%search%'
ORDER BY p.proname;

-- 2) Guardrail tests against public.hybrid_search_v2(text, vector(1536), ltree, int, int, int, real, real, int, text[])
DO $$
DECLARE
  v_signature regprocedure;
BEGIN
  SELECT to_regprocedure(
    'public.hybrid_search_v2(text, vector(1536), ltree, integer, integer, integer, real, real, integer, text[])'
  ) INTO v_signature;

  IF v_signature IS NULL THEN
    RAISE EXCEPTION 'FAIL: required function public.hybrid_search_v2(text, vector(1536), ltree, integer, integer, integer, real, real, integer, text[]) not found';
  END IF;
END $$;

BEGIN;

DO $$
DECLARE
  v_subject text;
  v_topic ltree;
  v_total int;
  v_leak int;
  v_neg_null boolean := false;
  v_neg_empty boolean := false;
BEGIN
  -- Negative case: missing topic_path/current_topic_path
  BEGIN
    PERFORM public.hybrid_search_v2('test', NULL::vector(1536), NULL::ltree, 12, 50, 50, 0.3, 0.7, 60, NULL);
  EXCEPTION WHEN others THEN
    v_neg_null := true;
    RAISE NOTICE 'negative case (missing topic_path) error: %', SQLERRM;
  END;

  IF v_neg_null IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: missing topic_path did not error';
  END IF;

  -- Negative case: empty topic_path
  BEGIN
    PERFORM public.hybrid_search_v2('test', NULL::vector(1536), ''::ltree, 12, 50, 50, 0.3, 0.7, 60, NULL);
  EXCEPTION WHEN others THEN
    v_neg_empty := true;
    RAISE NOTICE 'negative case (empty topic_path) error: %', SQLERRM;
  END;

  IF v_neg_empty IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: empty topic_path did not error';
  END IF;

  FOREACH v_subject IN ARRAY ARRAY['9709', '9702', '9231']
  LOOP
    SELECT topic_path INTO v_topic
    FROM public.curriculum_nodes
    WHERE syllabus_code = v_subject
      AND topic_path = v_subject::ltree
    LIMIT 1;

    IF v_topic IS NULL THEN
      SELECT topic_path INTO v_topic
      FROM public.curriculum_nodes
      WHERE syllabus_code = v_subject
        AND topic_path <> 'unmapped'::ltree
      ORDER BY topic_path
      LIMIT 1;
    END IF;

    IF v_topic IS NULL THEN
      RAISE EXCEPTION 'FAIL: no curriculum_nodes rows available for subject %', v_subject;
    END IF;

    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (
        WHERE split_part(topic_path::text, '.', 1) <> v_subject
           OR NOT (topic_path <@ v_topic)
      ) AS leakage_count
    INTO v_total, v_leak
    FROM public.hybrid_search_v2(
      'test',
      ARRAY_FILL(0::real, ARRAY[1536])::vector(1536),
      v_topic,
      12,
      50,
      50,
      0.3,
      0.7,
      60,
      NULL
    );

    IF v_leak <> 0 THEN
      RAISE EXCEPTION 'FAIL: subject % leakage_count=%', v_subject, v_leak;
    END IF;

    RAISE NOTICE 'positive case: subject=% total=% leakage_count=%', v_subject, v_total, v_leak;
  END LOOP;
END $$;

ROLLBACK;
