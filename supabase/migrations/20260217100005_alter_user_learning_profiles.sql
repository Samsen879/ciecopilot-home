-- Migration: Add Learning Evidence Ledger fields to user_learning_profiles
-- Adds mastery_by_node, misconception_frequencies, and last_aggregated_at
-- for Layer 2 learner model aggregation (Requirement 6.3)

CREATE TABLE IF NOT EXISTS public.user_learning_profiles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, subject_code)
);

DO $$
BEGIN
  -- Add mastery_by_node: {node_id: {score, sample_count, weighted_sample_count, low_confidence, last_updated}}
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_learning_profiles' AND column_name = 'mastery_by_node'
  ) THEN
    ALTER TABLE public.user_learning_profiles ADD COLUMN mastery_by_node JSONB DEFAULT '{}';
  END IF;

  -- Add misconception_frequencies: {tag: {count, weighted_count, last_seen}}
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_learning_profiles' AND column_name = 'misconception_frequencies'
  ) THEN
    ALTER TABLE public.user_learning_profiles ADD COLUMN misconception_frequencies JSONB DEFAULT '{}';
  END IF;

  -- Add last_aggregated_at: timestamp of most recent aggregation run
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_learning_profiles' AND column_name = 'last_aggregated_at'
  ) THEN
    ALTER TABLE public.user_learning_profiles ADD COLUMN last_aggregated_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_user_learning_profiles_user_subject
  ON public.user_learning_profiles (user_id, subject_code);

ALTER TABLE public.user_learning_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_learning_profiles'
      AND policyname = 'user_learning_profiles_select_own'
  ) THEN
    CREATE POLICY user_learning_profiles_select_own
      ON public.user_learning_profiles
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;
