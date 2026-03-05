-- Expand public.chunks with canonical corpus contract fields for provenance and reconciliation.
-- This migration is additive and intentionally does not change hybrid_search_v2 inputs/outputs.

ALTER TABLE public.chunks
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_ref jsonb,
  ADD COLUMN IF NOT EXISTS corpus_version text,
  ADD COLUMN IF NOT EXISTS content_hash text;

-- Backfill existing rows conservatively so the canonical online path becomes auditable.
UPDATE public.chunks
SET
  source_type = COALESCE(source_type, 'legacy_chunk'),
  source_ref = COALESCE(
    source_ref,
    jsonb_build_object(
      'asset_id', 'chunk:' || id::text,
      'question_id', id::text
    )
  ),
  corpus_version = COALESCE(corpus_version, 'pre_corpus_unification_v0'),
  content_hash = COALESCE(content_hash, md5(content))
WHERE source_type IS NULL
   OR source_ref IS NULL
   OR corpus_version IS NULL
   OR content_hash IS NULL;

ALTER TABLE public.chunks
  ALTER COLUMN source_type SET NOT NULL,
  ALTER COLUMN source_ref SET NOT NULL,
  ALTER COLUMN corpus_version SET NOT NULL,
  ALTER COLUMN content_hash SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.chunks'::regclass
      AND conname = 'chk_chunks_source_ref_object'
  ) THEN
    ALTER TABLE public.chunks
      ADD CONSTRAINT chk_chunks_source_ref_object
      CHECK (jsonb_typeof(source_ref) = 'object');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chunks_content_hash ON public.chunks(content_hash);
CREATE INDEX IF NOT EXISTS idx_chunks_corpus_version ON public.chunks(corpus_version);
CREATE INDEX IF NOT EXISTS idx_chunks_source_type ON public.chunks(source_type);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.chunks'::regclass
      AND conname = 'fk_chunks_node_id_curriculum_nodes'
  ) THEN
    ALTER TABLE public.chunks
      ADD CONSTRAINT fk_chunks_node_id_curriculum_nodes
      FOREIGN KEY (node_id) REFERENCES public.curriculum_nodes(node_id) NOT VALID;
  END IF;
END $$;
