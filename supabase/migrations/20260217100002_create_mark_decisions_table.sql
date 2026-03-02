-- Migration: Create mark_decisions table (Layer 1 - Evidence Ledger)
-- Part of Learning Evidence Ledger feature
-- Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.3, 7.4

-- Create mark_decisions table
CREATE TABLE IF NOT EXISTS public.mark_decisions (
  mark_decision_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_run_id       UUID        NOT NULL REFERENCES public.mark_runs(mark_run_id) ON DELETE RESTRICT,
  rubric_id         TEXT        NOT NULL,
  mark_label        TEXT,
  awarded           BOOLEAN     NOT NULL,
  awarded_marks     INT         NOT NULL DEFAULT 0,
  reason            TEXT        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one decision per rubric point per mark run
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_mark_decisions_run_rubric'
  ) THEN
    ALTER TABLE public.mark_decisions
      ADD CONSTRAINT uq_mark_decisions_run_rubric UNIQUE (mark_run_id, rubric_id);
  END IF;
END $$;

-- CHECK constraint: reason must be one of the allowed Decision Engine values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_mark_decisions_reason'
  ) THEN
    ALTER TABLE public.mark_decisions
      ADD CONSTRAINT chk_mark_decisions_reason
      CHECK (reason IN (
        'best_match',
        'below_threshold',
        'borderline_score',
        'dependency_not_met',
        'dependency_error',
        'no_match'
      ));
  END IF;
END $$;

-- Index: mark_run_id for join lookups
CREATE INDEX IF NOT EXISTS idx_mark_decisions_run
  ON public.mark_decisions (mark_run_id);

-- Enable Row Level Security
ALTER TABLE public.mark_decisions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: authenticated users can only SELECT decisions for their own attempts
-- (mark_decisions -> mark_runs -> attempts chain)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'mark_decisions_select_own' AND tablename = 'mark_decisions'
  ) THEN
    CREATE POLICY mark_decisions_select_own ON public.mark_decisions
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.mark_runs mr
          JOIN public.attempts a ON a.attempt_id = mr.attempt_id
          WHERE mr.mark_run_id = mark_decisions.mark_run_id
            AND a.user_id = auth.uid()
        )
      );
  END IF;
END $$;


-- RPC function: insert_mark_decisions
-- Batch insert mark decisions in a single transaction for atomicity (Requirement 2.4)
-- Returns inserted rows with fields needed by downstream error-event extraction.
CREATE OR REPLACE FUNCTION public.insert_mark_decisions(
  p_mark_run_id UUID,
  p_decisions JSONB  -- [{rubric_id, mark_label, awarded, awarded_marks, reason}]
)
RETURNS TABLE(
  mark_decision_id UUID,
  rubric_id TEXT,
  mark_label TEXT,
  awarded BOOLEAN,
  awarded_marks INT,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  RETURN QUERY
  INSERT INTO public.mark_decisions (mark_run_id, rubric_id, mark_label, awarded, awarded_marks, reason)
  SELECT
    p_mark_run_id,
    (d->>'rubric_id')::TEXT,
    (d->>'mark_label')::TEXT,
    (d->>'awarded')::BOOLEAN,
    (d->>'awarded_marks')::INT,
    (d->>'reason')::TEXT
  FROM jsonb_array_elements(p_decisions) AS d
  RETURNING
    mark_decisions.mark_decision_id,
    mark_decisions.rubric_id,
    mark_decisions.mark_label,
    mark_decisions.awarded,
    mark_decisions.awarded_marks,
    mark_decisions.reason;
END;
$fn$;
