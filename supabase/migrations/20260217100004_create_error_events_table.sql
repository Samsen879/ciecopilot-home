-- Migration: Create error_events table (Layer 1 - Evidence Ledger)
-- Part of Learning Evidence Ledger feature
-- Requirements: 4.1, 4.2, 7.1, 7.3, 7.4

-- ============================================================
-- 1. Create error_events table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.error_events (
  error_event_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id        UUID        NOT NULL REFERENCES public.attempts(attempt_id) ON DELETE RESTRICT,
  user_id           UUID        NOT NULL,
  mark_decision_id  UUID        REFERENCES public.mark_decisions(mark_decision_id) ON DELETE SET NULL,
  topic_path        ltree,
  node_id           UUID,
  misconception_tag TEXT        NOT NULL DEFAULT 'unclassified',
  severity          TEXT        NOT NULL DEFAULT 'major',
  metadata          JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign key: misconception_tag must exist in taxonomy table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_error_events_misconception_tag'
  ) THEN
    ALTER TABLE public.error_events
      ADD CONSTRAINT fk_error_events_misconception_tag
      FOREIGN KEY (misconception_tag)
      REFERENCES public.misconception_taxonomy(tag)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- CHECK constraint: severity must be one of the allowed values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_error_events_severity'
  ) THEN
    ALTER TABLE public.error_events
      ADD CONSTRAINT chk_error_events_severity
      CHECK (severity IN ('minor', 'major', 'critical'));
  END IF;
END $$;

-- ============================================================
-- 2. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_error_events_attempt_topic
  ON public.error_events (attempt_id, topic_path);

CREATE INDEX IF NOT EXISTS idx_error_events_user_tag
  ON public.error_events (user_id, misconception_tag);

CREATE INDEX IF NOT EXISTS idx_error_events_user_created
  ON public.error_events (user_id, created_at DESC);

-- ============================================================
-- 3. Trigger function: sync user_id from attempts (Requirement 4.2)
-- On INSERT or UPDATE, force user_id = attempts.user_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_error_event_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.attempts
  WHERE attempt_id = NEW.attempt_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'attempt_id % not found when writing error_events', NEW.attempt_id;
  END IF;

  NEW.user_id := v_user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_error_event_user_id ON public.error_events;
CREATE TRIGGER trg_sync_error_event_user_id
  BEFORE INSERT OR UPDATE ON public.error_events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_error_event_user_id();

-- ============================================================
-- 4. Enable Row Level Security
-- ============================================================
ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS Policy: authenticated users can only SELECT their own error_events
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'error_events_select_own' AND tablename = 'error_events'
  ) THEN
    CREATE POLICY error_events_select_own ON public.error_events
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;
