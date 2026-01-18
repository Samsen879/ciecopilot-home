-- Ensure curriculum_nodes has topic_path (ltree) and required indexes

CREATE EXTENSION IF NOT EXISTS ltree;

ALTER TABLE public.curriculum_nodes
  ADD COLUMN IF NOT EXISTS topic_path ltree;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'curriculum_nodes' AND column_name = 'topic_path_text'
  ) THEN
    UPDATE public.curriculum_nodes
    SET topic_path = topic_path_text::ltree
    WHERE topic_path IS NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'curriculum_nodes' AND column_name = 'node_path'
  ) THEN
    UPDATE public.curriculum_nodes
    SET topic_path = node_path::ltree
    WHERE topic_path IS NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'curriculum_nodes' AND column_name = 'path'
  ) THEN
    UPDATE public.curriculum_nodes
    SET topic_path = path::ltree
    WHERE topic_path IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_curriculum_nodes_topic_path_gist
  ON public.curriculum_nodes USING GIST (topic_path);
