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
