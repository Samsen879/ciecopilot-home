-- Hardening migration: explicit service_role write policies + error_events FK
-- Addresses:
--   1. RLS write policies for service_role on all Evidence Ledger tables
--   2. Missing FK on error_events.user_id → auth.users(id)

-- ============================================================
-- 1. Service-role write policies (explicit, not relying on implicit bypass)
-- ============================================================

-- attempts: service_role full access
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'attempts_service_role_all' AND tablename = 'attempts'
  ) THEN
    CREATE POLICY attempts_service_role_all ON public.attempts
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $;

-- mark_runs: service_role full access
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'mark_runs_service_role_all' AND tablename = 'mark_runs'
  ) THEN
    CREATE POLICY mark_runs_service_role_all ON public.mark_runs
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $;

-- mark_decisions: service_role full access
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'mark_decisions_service_role_all' AND tablename = 'mark_decisions'
  ) THEN
    CREATE POLICY mark_decisions_service_role_all ON public.mark_decisions
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $;

-- error_events: service_role full access
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'error_events_service_role_all' AND tablename = 'error_events'
  ) THEN
    CREATE POLICY error_events_service_role_all ON public.error_events
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $;

-- question_bank: service_role full access
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'question_bank_service_role_all' AND tablename = 'question_bank'
  ) THEN
    -- Enable RLS first (may not have been enabled)
    ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

    CREATE POLICY question_bank_service_role_all ON public.question_bank
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $;

-- user_learning_profiles: service_role full access
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_learning_profiles_service_role_all' AND tablename = 'user_learning_profiles'
  ) THEN
    CREATE POLICY user_learning_profiles_service_role_all ON public.user_learning_profiles
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $;

-- ============================================================
-- 2. FK on error_events.user_id → auth.users(id)
-- ============================================================
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_error_events_user_id'
  ) THEN
    ALTER TABLE public.error_events
      ADD CONSTRAINT fk_error_events_user_id
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END $;
