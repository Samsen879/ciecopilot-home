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

-- 2) Guardrail tests against public.hybrid_search_v2(text, vector(1536), ltree, int, int, int, real, real, int)
DO $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'hybrid_search_v2'
  ) INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'FAIL: required function public.hybrid_search_v2 not found';
  END IF;
END $$;

BEGIN;

-- Ensure at least one topic_path exists (rolled back at end)
INSERT INTO public.curriculum_nodes (syllabus_code, topic_path, title)
VALUES ('9709', '9709.test', 'Verification Node')
ON CONFLICT (topic_path) DO NOTHING;

DO $$
DECLARE
  v_topic ltree;
  v_total int;
  v_leak int;
  v_neg_null boolean := false;
  v_neg_empty boolean := false;
BEGIN
  -- Negative case: missing topic_path/current_topic_path
  BEGIN
    PERFORM public.hybrid_search_v2('test', NULL::vector(1536), NULL::ltree);
  EXCEPTION WHEN others THEN
    v_neg_null := true;
    RAISE NOTICE 'negative case (missing topic_path) error: %', SQLERRM;
  END;

  IF v_neg_null IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: missing topic_path did not error';
  END IF;

  -- Negative case: empty topic_path
  BEGIN
    PERFORM public.hybrid_search_v2('test', NULL::vector(1536), ''::ltree);
  EXCEPTION WHEN others THEN
    v_neg_empty := true;
    RAISE NOTICE 'negative case (empty topic_path) error: %', SQLERRM;
  END;

  IF v_neg_empty IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: empty topic_path did not error';
  END IF;

  SELECT topic_path INTO v_topic
  FROM public.curriculum_nodes
  WHERE topic_path <> 'unmapped'::ltree
  ORDER BY topic_path
  LIMIT 1;

  IF v_topic IS NULL THEN
    RAISE EXCEPTION 'FAIL: no curriculum_nodes rows available for positive case';
  END IF;

  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE NOT (topic_path <@ v_topic)) AS leakage_count
  INTO v_total, v_leak
  FROM public.hybrid_search_v2(
    'test',
    ARRAY_FILL(0::real, ARRAY[1536])::vector(1536),
    v_topic
  );

  IF v_leak <> 0 THEN
    RAISE EXCEPTION 'FAIL: leakage_count=%', v_leak;
  END IF;

  RAISE NOTICE 'positive case: total=% leakage_count=%', v_total, v_leak;
END $$;

ROLLBACK;
