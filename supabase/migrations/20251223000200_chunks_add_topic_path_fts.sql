-- Add topic_path, syllabus_code, node_id, and fts columns to chunks table
-- Part of Syllabus Boundary System (PR-1)

-- Add new columns
ALTER TABLE public.chunks 
  ADD COLUMN IF NOT EXISTS syllabus_code text,
  ADD COLUMN IF NOT EXISTS topic_path ltree NOT NULL DEFAULT 'unmapped'::ltree,
  ADD COLUMN IF NOT EXISTS node_id uuid;

-- Add generated fts column for keyword search
-- Note: This requires content column to exist
ALTER TABLE public.chunks 
  ADD COLUMN IF NOT EXISTS fts tsvector 
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_chunks_topic_path_gist 
  ON public.chunks USING GIST (topic_path);
CREATE INDEX IF NOT EXISTS idx_chunks_fts_gin 
  ON public.chunks USING GIN (fts);
CREATE INDEX IF NOT EXISTS idx_chunks_syllabus_code 
  ON public.chunks (syllabus_code);
