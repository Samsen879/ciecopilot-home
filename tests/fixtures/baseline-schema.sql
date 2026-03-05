-- =============================================================================
-- Baseline Schema for CI Migration Replay
-- 
-- Purpose: Simulate "old production state" before syllabus boundary migrations
-- This file creates the MINIMAL chunks table that migration 2 expects to ALTER.
-- 
-- IMPORTANT:
-- - DO NOT include: topic_path, fts, syllabus_code, node_id, curriculum_nodes
-- - These should be created by migrations 2, 3, 4
-- - DO NOT create ltree extension (migration 1 does this)
-- =============================================================================

BEGIN;

-- pgvector extension (required for embedding column)
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing tables to ensure clean state
DROP TABLE IF EXISTS public.chunks CASCADE;
DROP TABLE IF EXISTS public.curriculum_nodes CASCADE;

-- Create baseline chunks table (pre-syllabus-boundary state)
-- This matches the production schema BEFORE PR-1 migrations
CREATE TABLE public.chunks (
  id bigserial PRIMARY KEY,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Basic embedding index (existed before syllabus boundary)
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON public.chunks 
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

COMMIT;
