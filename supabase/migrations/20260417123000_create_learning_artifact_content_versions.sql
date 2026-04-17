CREATE TABLE IF NOT EXISTS public.learning_artifact_content_versions (
  artifact_content_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES public.learning_artifacts(artifact_id) ON DELETE CASCADE,
  version_number INT NOT NULL CHECK (version_number > 0),
  lineage_parent_version_id UUID REFERENCES public.learning_artifact_content_versions(artifact_content_version_id) ON DELETE SET NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  title TEXT NOT NULL,
  summary TEXT,
  body_markdown TEXT NOT NULL DEFAULT '',
  content_format TEXT NOT NULL DEFAULT 'markdown',
  render_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  materialization_kind TEXT NOT NULL DEFAULT 'runtime_candidate',
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artifact_id, version_number),
  CHECK (lineage_parent_version_id IS NULL OR lineage_parent_version_id <> artifact_content_version_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_artifact_content_versions_artifact
  ON public.learning_artifact_content_versions (artifact_id, version_number DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_artifact_content_versions_current
  ON public.learning_artifact_content_versions (artifact_id)
  WHERE is_current;

DROP FUNCTION IF EXISTS public.create_learning_artifact_content_version(
  UUID,
  INT,
  UUID,
  BOOLEAN,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  JSONB,
  TEXT,
  JSONB,
  TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION public.create_learning_artifact_content_version(
  p_artifact_id UUID,
  p_version_number INT DEFAULT NULL,
  p_lineage_parent_version_id UUID DEFAULT NULL,
  p_is_current BOOLEAN DEFAULT true,
  p_title TEXT DEFAULT NULL,
  p_summary TEXT DEFAULT NULL,
  p_body_markdown TEXT DEFAULT '',
  p_content_format TEXT DEFAULT 'markdown',
  p_render_payload JSONB DEFAULT '{}'::jsonb,
  p_materialization_kind TEXT DEFAULT 'runtime_candidate',
  p_source_refs JSONB DEFAULT '[]'::jsonb,
  p_created_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS public.learning_artifact_content_versions
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_current public.learning_artifact_content_versions%ROWTYPE;
  v_inserted public.learning_artifact_content_versions%ROWTYPE;
BEGIN
  SELECT *
  INTO v_current
  FROM public.learning_artifact_content_versions
  WHERE artifact_id = p_artifact_id
    AND is_current = true
  ORDER BY version_number DESC
  LIMIT 1
  FOR UPDATE;

  IF COALESCE(p_is_current, true) AND v_current.artifact_content_version_id IS NOT NULL THEN
    UPDATE public.learning_artifact_content_versions
    SET is_current = false
    WHERE artifact_content_version_id = v_current.artifact_content_version_id;
  END IF;

  INSERT INTO public.learning_artifact_content_versions (
    artifact_id,
    version_number,
    lineage_parent_version_id,
    is_current,
    title,
    summary,
    body_markdown,
    content_format,
    render_payload,
    materialization_kind,
    source_refs,
    created_at
  )
  VALUES (
    p_artifact_id,
    CASE
      WHEN p_version_number IS NOT NULL AND p_version_number > 0 THEN p_version_number
      ELSE COALESCE(v_current.version_number, 0) + 1
    END,
    COALESCE(p_lineage_parent_version_id, v_current.artifact_content_version_id),
    COALESCE(p_is_current, true),
    COALESCE(NULLIF(BTRIM(p_title), ''), FORMAT('Artifact %s', p_artifact_id)),
    NULLIF(BTRIM(p_summary), ''),
    COALESCE(p_body_markdown, ''),
    COALESCE(NULLIF(BTRIM(p_content_format), ''), 'markdown'),
    COALESCE(p_render_payload, '{}'::jsonb),
    COALESCE(NULLIF(BTRIM(p_materialization_kind), ''), 'runtime_candidate'),
    COALESCE(p_source_refs, '[]'::jsonb),
    COALESCE(p_created_at, now())
  )
  RETURNING *
  INTO v_inserted;

  RETURN v_inserted;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.create_learning_artifact_content_version(
  UUID,
  INT,
  UUID,
  BOOLEAN,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  JSONB,
  TEXT,
  JSONB,
  TIMESTAMPTZ
) TO service_role;
