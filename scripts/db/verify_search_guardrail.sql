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
BEGIN
  -- Negative case: missing topic_path/current_topic_path
  BEGIN
    PERFORM public.hybrid_search_v2('test', NULL::vector(1536), NULL::ltree);
    RAISE EXCEPTION 'expected error did not occur';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'negative case (missing topic_path) error: %', SQLERRM;
  END;

  SELECT topic_path INTO v_topic
  FROM public.curriculum_nodes
  WHERE topic_path <> 'unmapped'::ltree
  ORDER BY topic_path
  LIMIT 1;

  IF v_topic IS NULL THEN
    RAISE NOTICE 'positive case skipped: no curriculum_nodes rows';
    RETURN;
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

  RAISE NOTICE 'positive case: total=% leakage_count=%', v_total, v_leak;
END $$;

ROLLBACK;
