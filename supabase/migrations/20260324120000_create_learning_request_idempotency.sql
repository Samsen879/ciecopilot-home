-- Create durable request idempotency storage for learning-runtime writes.

CREATE TABLE IF NOT EXISTS public.learning_request_idempotency (
  request_idempotency_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_path TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_kind TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
  resource_ref JSONB,
  response_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, request_path, idempotency_key),
  CHECK (jsonb_typeof(request_payload) = 'object'),
  CHECK (resource_ref IS NULL OR jsonb_typeof(resource_ref) = 'object'),
  CHECK (response_payload IS NULL OR jsonb_typeof(response_payload) = 'object'),
  CHECK (request_kind IN ('create_learning_session', 'import_learning_question'))
);

CREATE INDEX IF NOT EXISTS idx_learning_request_idempotency_user_created
  ON public.learning_request_idempotency (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_request_idempotency_status_created
  ON public.learning_request_idempotency (status, created_at);

ALTER TABLE public.learning_request_idempotency ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'learning_request_idempotency_service_role_all'
      AND tablename = 'learning_request_idempotency'
  ) THEN
    CREATE POLICY learning_request_idempotency_service_role_all
      ON public.learning_request_idempotency
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
