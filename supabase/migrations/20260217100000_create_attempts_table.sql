-- Migration: Create attempts table (Layer 1 - Evidence Ledger)
-- Part of Learning Evidence Ledger feature
-- Requirements: 1.1, 1.2, 1.4, 1.5, 7.1, 7.3, 7.4

-- Ensure ltree extension is available (idempotent)
CREATE EXTENSION IF NOT EXISTS ltree;

-- Create attempts table
CREATE TABLE IF NOT EXISTS public.attempts (
  attempt_id     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID           NOT NULL REFERENCES auth.users(id),
  question_id    UUID           NOT NULL,
  paper_id       UUID,
  storage_key    TEXT           NOT NULL,
  q_number       INT            NOT NULL,
  subpart        TEXT,
  syllabus_code  TEXT           NOT NULL,
  node_id        UUID           REFERENCES public.curriculum_nodes(node_id) ON DELETE SET NULL,
  topic_path     ltree,
  topic_source   TEXT,
  topic_confidence NUMERIC(5,4),
  topic_resolved_at TIMESTAMPTZ,
  submitted_steps JSONB         NOT NULL DEFAULT '[]',
  idempotency_key TEXT          NOT NULL,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Unique constraint: user_id + idempotency_key (幂等性保证)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_attempts_user_idempotency'
  ) THEN
    ALTER TABLE public.attempts
      ADD CONSTRAINT uq_attempts_user_idempotency UNIQUE (user_id, idempotency_key);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attempts_user_created
  ON public.attempts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attempts_storage_q
  ON public.attempts (storage_key, q_number);

CREATE INDEX IF NOT EXISTS idx_attempts_question
  ON public.attempts (question_id);

CREATE INDEX IF NOT EXISTS idx_attempts_topic_path_gist
  ON public.attempts USING GIST (topic_path);

-- Enable Row Level Security
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: authenticated users can only SELECT their own attempts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'attempts_select_own' AND tablename = 'attempts'
  ) THEN
    CREATE POLICY attempts_select_own ON public.attempts
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;
