-- Migration: Create mark_runs table (Layer 1 - Evidence Ledger)
-- Part of Learning Evidence Ledger feature
-- Requirements: 3.1, 3.2, 7.1, 7.2, 7.3, 7.4

-- Create mark_runs table
CREATE TABLE IF NOT EXISTS public.mark_runs (
  mark_run_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id           UUID        NOT NULL REFERENCES public.attempts(attempt_id) ON DELETE RESTRICT,
  run_idempotency_key  TEXT,
  engine_version       TEXT        NOT NULL,
  rubric_version       TEXT        NOT NULL,
  total_awarded        INT         NOT NULL DEFAULT 0,
  total_available      INT         NOT NULL DEFAULT 0,
  status               TEXT        NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending', 'completed', 'failed')),
  decision_write_status TEXT       NOT NULL DEFAULT 'pending'
                                   CHECK (decision_write_status IN ('success', 'failed', 'pending')),
  flags                TEXT[]      NOT NULL DEFAULT '{}',
  request_summary      JSONB       NOT NULL DEFAULT '{}',
  response_summary     JSONB       NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique index: idempotency per attempt when run_idempotency_key is provided
CREATE UNIQUE INDEX IF NOT EXISTS uq_mark_runs_attempt_run_idem
  ON public.mark_runs (attempt_id, run_idempotency_key)
  WHERE run_idempotency_key IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mark_runs_attempt
  ON public.mark_runs (attempt_id);

CREATE INDEX IF NOT EXISTS idx_mark_runs_created
  ON public.mark_runs (created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.mark_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: authenticated users can only SELECT mark_runs for their own attempts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'mark_runs_select_own' AND tablename = 'mark_runs'
  ) THEN
    CREATE POLICY mark_runs_select_own ON public.mark_runs
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.attempts a
          WHERE a.attempt_id = mark_runs.attempt_id
            AND a.user_id = auth.uid()
        )
      );
  END IF;
END $$;
