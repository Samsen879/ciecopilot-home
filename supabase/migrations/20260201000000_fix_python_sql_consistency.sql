-- Migration: Fix Python/SQL consistency issues
-- Description: Add missing columns (diagram_elements, errors) and answer_form CHECK constraint
-- Idempotent: Yes (uses IF NOT EXISTS patterns)

-- ============================================================
-- 1. Add diagram_elements column (missing in SQL, exists in Python)
-- ============================================================
ALTER TABLE question_descriptions_v0
  ADD COLUMN IF NOT EXISTS diagram_elements TEXT[] DEFAULT '{}';

-- ============================================================
-- 2. Add errors column (missing in SQL, exists in Python)
-- ============================================================
ALTER TABLE question_descriptions_v0
  ADD COLUMN IF NOT EXISTS errors TEXT[] DEFAULT '{}';

-- ============================================================
-- 3. Add answer_form CHECK constraint (Python has Literal, SQL had none)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'question_descriptions_v0_answer_form_check'
      AND conrelid = 'question_descriptions_v0'::regclass
  ) THEN
    ALTER TABLE question_descriptions_v0
      ADD CONSTRAINT question_descriptions_v0_answer_form_check
      CHECK (answer_form IS NULL OR answer_form IN ('exact', 'approx', 'proof', 'graph', 'table', 'other'));
  END IF;
END $$;

-- ============================================================
-- 4. Create indexes for new columns (optional, for query performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_qd_v0_diagram_elements ON question_descriptions_v0 USING GIN (diagram_elements);
CREATE INDEX IF NOT EXISTS idx_qd_v0_errors ON question_descriptions_v0 USING GIN (errors);
