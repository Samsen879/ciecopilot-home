CREATE TABLE IF NOT EXISTS public.learning_event_deliveries (
  delivery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_idempotency_key TEXT NOT NULL,
  attempt_id UUID NOT NULL REFERENCES public.attempts(attempt_id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  subject_code TEXT NOT NULL,
  mark_run_id UUID REFERENCES public.mark_runs(mark_run_id) ON DELETE SET NULL,
  truth_revision INTEGER NULL CHECK (truth_revision IS NULL OR truth_revision >= 1),
  delivery_state TEXT NOT NULL DEFAULT 'pending' CHECK (
    delivery_state IN ('pending', 'persisted', 'retrying', 'reconciled', 'needs_manual_review')
  ),
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  last_attempted_at TIMESTAMPTZ NULL,
  last_error JSONB NULL,
  persisted_event_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  persisted_event_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  reconciliation_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stable_idempotency_key),
  CHECK (last_error IS NULL OR jsonb_typeof(last_error) = 'object'),
  CHECK (jsonb_typeof(persisted_event_types) = 'array'),
  CHECK (jsonb_typeof(persisted_event_ids) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_learning_event_deliveries_state_attempted
  ON public.learning_event_deliveries (delivery_state, last_attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_event_deliveries_retry_attention
  ON public.learning_event_deliveries (retry_count DESC, updated_at DESC)
  WHERE delivery_state IN ('pending', 'retrying', 'needs_manual_review');

CREATE INDEX IF NOT EXISTS idx_learning_event_deliveries_attempt
  ON public.learning_event_deliveries (attempt_id, mark_run_id);
