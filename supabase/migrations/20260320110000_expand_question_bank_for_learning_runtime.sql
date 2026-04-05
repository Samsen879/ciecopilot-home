-- Widen question_bank into the canonical learning-runtime question registry.

ALTER TABLE IF EXISTS public.question_bank
  ADD COLUMN IF NOT EXISTS source_kind TEXT,
  ADD COLUMN IF NOT EXISTS subject_code TEXT,
  ADD COLUMN IF NOT EXISTS paper_scope JSONB,
  ADD COLUMN IF NOT EXISTS primary_topic_id UUID,
  ADD COLUMN IF NOT EXISTS secondary_topic_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS family_id TEXT,
  ADD COLUMN IF NOT EXISTS primary_question_type_id TEXT,
  ADD COLUMN IF NOT EXISTS secondary_question_type_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variant_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS release_scope_status TEXT,
  ADD COLUMN IF NOT EXISTS classification_snapshot_ref JSONB,
  ADD COLUMN IF NOT EXISTS prompt_representation JSONB,
  ADD COLUMN IF NOT EXISTS provenance_summary JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.question_bank
  ALTER COLUMN storage_key DROP NOT NULL,
  ALTER COLUMN q_number DROP NOT NULL;

ALTER TABLE IF EXISTS public.question_bank
  DROP CONSTRAINT IF EXISTS uq_question_bank_storage_q;

DROP INDEX IF EXISTS public.uq_question_bank_storage_q;

CREATE UNIQUE INDEX IF NOT EXISTS uq_question_bank_storage_q_present
  ON public.question_bank (storage_key, q_number)
  WHERE storage_key IS NOT NULL AND q_number IS NOT NULL;

UPDATE public.question_bank
SET
  source_kind = COALESCE(source_kind, 'paper_question'),
  subject_code = COALESCE(subject_code, NULLIF(split_part(storage_key, '/', 1), '')),
  paper_scope = COALESCE(
    paper_scope,
    CASE
      WHEN storage_key IS NULL AND q_number IS NULL THEN NULL
      ELSE jsonb_build_object(
        'storage_key', storage_key,
        'q_number', q_number
      )
    END
  ),
  provenance_summary = CASE
    WHEN provenance_summary = '{}'::jsonb AND storage_key IS NOT NULL THEN
      jsonb_build_object(
        'storage_key', storage_key,
        'q_number', q_number,
        'source_kind', COALESCE(source_kind, 'paper_question')
      )
    ELSE provenance_summary
  END
WHERE
  source_kind IS NULL
  OR subject_code IS NULL
  OR paper_scope IS NULL
  OR provenance_summary = '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_question_bank_source_kind'
      AND conrelid = 'public.question_bank'::regclass
  ) THEN
    ALTER TABLE public.question_bank
      ADD CONSTRAINT chk_question_bank_source_kind
      CHECK (source_kind IN ('paper_question', 'imported_question'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_question_bank_release_scope_status'
      AND conrelid = 'public.question_bank'::regclass
  ) THEN
    ALTER TABLE public.question_bank
      ADD CONSTRAINT chk_question_bank_release_scope_status
      CHECK (release_scope_status IN ('released_scoring', 'non_released_fallback'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_question_bank_source_kind
  ON public.question_bank (source_kind);

CREATE INDEX IF NOT EXISTS idx_question_bank_subject_code
  ON public.question_bank (subject_code);

CREATE INDEX IF NOT EXISTS idx_question_bank_primary_topic_id
  ON public.question_bank (primary_topic_id);

CREATE INDEX IF NOT EXISTS idx_question_bank_family_id
  ON public.question_bank (family_id);

CREATE INDEX IF NOT EXISTS idx_question_bank_primary_question_type_id
  ON public.question_bank (primary_question_type_id);
