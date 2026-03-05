-- Migration: Phase2 Marking Contract
-- Goal: Stabilize marking DB contract for FT/StrictFT/CAO + explainability fields.

-- 1) rubric_points: add phase2 contract fields
ALTER TABLE public.rubric_points
  ADD COLUMN IF NOT EXISTS is_cao BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS symbolic_rule JSONB,
  ADD COLUMN IF NOT EXISTS accuracy_policy JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.rubric_points
SET is_cao = false
WHERE is_cao IS NULL;

UPDATE public.rubric_points
SET accuracy_policy = '{}'::jsonb
WHERE accuracy_policy IS NULL;

-- 2) mark_decisions: add explainability columns
ALTER TABLE public.mark_decisions
  ADD COLUMN IF NOT EXISTS alignment_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS evidence_spans JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.mark_decisions
SET evidence_spans = '[]'::jsonb
WHERE evidence_spans IS NULL;

-- 3) Expand allowed reason values with phase2-safe result
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_mark_decisions_reason'
  ) THEN
    ALTER TABLE public.mark_decisions DROP CONSTRAINT chk_mark_decisions_reason;
  END IF;
END $$;

ALTER TABLE public.mark_decisions
  ADD CONSTRAINT chk_mark_decisions_reason
  CHECK (reason IN (
    'best_match',
    'below_threshold',
    'borderline_score',
    'dependency_not_met',
    'dependency_error',
    'no_match',
    'uncertain'
  ));

-- 4) Upgrade RPC with optional phase2 fields (backward compatible)
DROP FUNCTION IF EXISTS public.insert_mark_decisions(UUID, JSONB);

CREATE OR REPLACE FUNCTION public.insert_mark_decisions(
  p_mark_run_id UUID,
  p_decisions JSONB
)
RETURNS TABLE(
  mark_decision_id UUID,
  rubric_id TEXT,
  mark_label TEXT,
  awarded BOOLEAN,
  awarded_marks INT,
  reason TEXT,
  alignment_confidence NUMERIC,
  evidence_spans JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  RETURN QUERY
  INSERT INTO public.mark_decisions (
    mark_run_id,
    rubric_id,
    mark_label,
    awarded,
    awarded_marks,
    reason,
    alignment_confidence,
    evidence_spans
  )
  SELECT
    p_mark_run_id,
    (d->>'rubric_id')::TEXT,
    (d->>'mark_label')::TEXT,
    (d->>'awarded')::BOOLEAN,
    (d->>'awarded_marks')::INT,
    (d->>'reason')::TEXT,
    NULLIF((d->>'alignment_confidence'), '')::NUMERIC,
    COALESCE(d->'evidence_spans', '[]'::jsonb)
  FROM jsonb_array_elements(p_decisions) AS d
  RETURNING
    mark_decisions.mark_decision_id,
    mark_decisions.rubric_id,
    mark_decisions.mark_label,
    mark_decisions.awarded,
    mark_decisions.awarded_marks,
    mark_decisions.reason,
    mark_decisions.alignment_confidence,
    mark_decisions.evidence_spans;
END;
$fn$;

-- 5) Data quality constraints + indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_mark_decisions_alignment_confidence_range'
  ) THEN
    ALTER TABLE public.mark_decisions
      ADD CONSTRAINT chk_mark_decisions_alignment_confidence_range
      CHECK (
        alignment_confidence IS NULL OR
        (alignment_confidence >= 0 AND alignment_confidence <= 1)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mark_decisions_alignment_confidence
  ON public.mark_decisions (alignment_confidence);

CREATE INDEX IF NOT EXISTS idx_mark_decisions_evidence_spans_gin
  ON public.mark_decisions USING GIN (evidence_spans);
