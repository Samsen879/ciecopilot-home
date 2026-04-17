ALTER TABLE public.learning_event_effects
  ADD COLUMN IF NOT EXISTS proposal_key TEXT;

ALTER TABLE public.learning_event_effects
  ADD COLUMN IF NOT EXISTS receipt_state TEXT NOT NULL DEFAULT 'pending'
  CHECK (
    receipt_state IN ('pending', 'persisted', 'retrying', 'reconciled', 'needs_manual_review')
  );

ALTER TABLE public.learning_event_effects
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.learning_event_effects
  ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMPTZ;

ALTER TABLE public.learning_event_effects
  ADD COLUMN IF NOT EXISTS last_error JSONB;

ALTER TABLE public.learning_event_effects
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_learning_event_effects_proposal_receipt
  ON public.learning_event_effects (proposal_key, receipt_state, last_attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_event_effects_retry_attention
  ON public.learning_event_effects (receipt_state, retry_count DESC, last_attempted_at DESC)
  WHERE receipt_state IN ('retrying', 'needs_manual_review');
