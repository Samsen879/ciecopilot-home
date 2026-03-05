-- Migration: Create question_bank mapping table for stable question_id resolution
-- Part of Learning Evidence Ledger feature
-- Requirements: 1.1, 1.6

CREATE TABLE IF NOT EXISTS public.question_bank (
  question_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id     UUID,
  storage_key  TEXT        NOT NULL,
  q_number     INT         NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_question_bank_storage_q'
      AND conrelid = 'public.question_bank'::regclass
  ) THEN
    ALTER TABLE public.question_bank
      ADD CONSTRAINT uq_question_bank_storage_q UNIQUE (storage_key, q_number);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_question_bank_storage_key
  ON public.question_bank (storage_key);

CREATE INDEX IF NOT EXISTS idx_question_bank_paper_id
  ON public.question_bank (paper_id);
