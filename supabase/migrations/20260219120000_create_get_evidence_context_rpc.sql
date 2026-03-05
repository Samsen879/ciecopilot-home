-- Context API optimization:
-- Collapse multi-query context retrieval into one RPC call.
-- Target: support Requirement 9.4 (P95 <= 200ms) by reducing round trips.

CREATE OR REPLACE FUNCTION public.get_evidence_context(
  p_user_id UUID,
  p_topic_path ltree,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject_code TEXT;
  v_node_id UUID;
  v_profile RECORD;
  v_mastery JSONB := 'null'::jsonb;
  v_recent_decisions JSONB := '[]'::jsonb;
  v_misconception_tags JSONB := '[]'::jsonb;
  v_recent_errors JSONB := '[]'::jsonb;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 10;
  END IF;

  IF p_limit > 50 THEN
    p_limit := 50;
  END IF;

  v_subject_code := split_part(p_topic_path::text, '.', 1);

  SELECT node_id
  INTO v_node_id
  FROM public.curriculum_nodes
  WHERE topic_path = p_topic_path
  LIMIT 1;

  SELECT mastery_by_node, misconception_frequencies
  INTO v_profile
  FROM public.user_learning_profiles
  WHERE user_id = p_user_id
    AND subject_code = v_subject_code
  LIMIT 1;

  IF v_profile IS NOT NULL AND v_node_id IS NOT NULL
     AND COALESCE(v_profile.mastery_by_node, '{}'::jsonb) ? v_node_id::text THEN
    v_mastery := v_profile.mastery_by_node -> v_node_id::text;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'rubric_id', x.rubric_id,
        'mark_label', x.mark_label,
        'awarded', x.awarded,
        'reason', x.reason,
        'created_at', x.created_at
      )
      ORDER BY x.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_recent_decisions
  FROM (
    SELECT md.rubric_id, md.mark_label, md.awarded, md.reason, md.created_at
    FROM public.attempts a
    JOIN public.mark_runs mr ON mr.attempt_id = a.attempt_id
    JOIN public.mark_decisions md ON md.mark_run_id = mr.mark_run_id
    WHERE a.user_id = p_user_id
      AND a.topic_path IS NOT NULL
      AND a.topic_path <@ p_topic_path
    ORDER BY md.created_at DESC
    LIMIT p_limit
  ) x;

  IF v_profile IS NOT NULL THEN
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'tag', t.key,
          'weighted_count', COALESCE((t.value->>'weighted_count')::numeric, 0),
          'last_seen', t.value->>'last_seen'
        )
      ),
      '[]'::jsonb
    )
    INTO v_misconception_tags
    FROM (
      SELECT key, value
      FROM jsonb_each(COALESCE(v_profile.misconception_frequencies, '{}'::jsonb))
      ORDER BY COALESCE((value->>'weighted_count')::numeric, 0) DESC
      LIMIT 10
    ) t;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'misconception_tag', e.misconception_tag,
        'severity', e.severity,
        'topic_path', e.topic_path::text,
        'created_at', e.created_at
      )
      ORDER BY e.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_recent_errors
  FROM (
    SELECT misconception_tag, severity, topic_path, created_at
    FROM public.error_events
    WHERE user_id = p_user_id
      AND topic_path IS NOT NULL
      AND topic_path <@ p_topic_path
    ORDER BY created_at DESC
    LIMIT 5
  ) e;

  RETURN jsonb_build_object(
    'mastery', v_mastery,
    'recent_decisions', v_recent_decisions,
    'misconception_tags', v_misconception_tags,
    'recent_errors', v_recent_errors
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_evidence_context(UUID, ltree, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_evidence_context(UUID, ltree, INTEGER) TO service_role;

CREATE INDEX IF NOT EXISTS idx_error_events_topic_path_gist
  ON public.error_events USING GIST (topic_path);

