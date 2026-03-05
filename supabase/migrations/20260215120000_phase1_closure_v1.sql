-- Phase 1 Production Closure: marking_runs_v1 + user_errors constraint upgrade
-- Idempotent migration – safe to re-run (IF NOT EXISTS / IF EXISTS / DO blocks)
--
-- Execution order (critical):
--   1. Create marking_runs_v1 table + indexes
--   2. Data repair on user_errors.source (BEFORE CHECK constraints)
--   3. Drop old unique index
--   4. Add CHECK constraints (idempotent via DO blocks)
--   5. Add partial unique indexes
--   6. Add source index
--   7. Expression index compatibility verification

-- ============================================================
-- 1. marking_runs_v1 – online scoring run audit table
-- ============================================================
--
-- RETENTION POLICY
-- ~~~~~~~~~~~~~~~~
-- This table grows with every online scoring request.  Rows older than the
-- retention window (default 90 days) should be periodically purged.
--
-- Cleanup script:  scripts/marking/cleanup_marking_runs_v1.py
--   --dry-run           Count eligible rows without deleting
--   --retention-days N  Override the 90-day default
--
-- Recommended cadence: weekly cron or manual run before each release.
-- See docs/reports/phase1_closure_readiness_report.md §Retention Runbook
-- for full operational guidance.
--
-- The idx_marking_runs_v1_user_created index supports efficient
-- range-scan deletes on (user_id, created_at DESC).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marking_runs_v1 (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  storage_key TEXT NOT NULL,
  q_number INT NOT NULL,
  subpart TEXT,
  rubric_source_version TEXT NOT NULL,
  scoring_engine_version TEXT NOT NULL,
  request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_book_write_status TEXT NOT NULL
    CHECK (error_book_write_status IN ('success','partial','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marking_runs_v1_user_created
  ON public.marking_runs_v1(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marking_runs_v1_storage_q
  ON public.marking_runs_v1(storage_key, q_number, COALESCE(subpart,''));


-- ============================================================
-- 2. Data repair on user_errors.source (MUST precede CHECK)
-- ============================================================
-- 2a. Fill NULL sources with 'manual'
UPDATE public.user_errors
SET source = 'manual'
WHERE source IS NULL;

-- 2b. Normalise any non-standard source values to 'manual'
--     (preserves a log line via RAISE NOTICE for audit)
DO $$
DECLARE
  _count BIGINT;
BEGIN
  SELECT count(*) INTO _count
  FROM public.user_errors
  WHERE source NOT IN ('manual', 'mark_engine_auto');

  IF _count > 0 THEN
    RAISE NOTICE '[phase1_closure_v1] Normalising % user_errors rows with non-standard source to manual', _count;
    UPDATE public.user_errors
    SET source = 'manual'
    WHERE source NOT IN ('manual', 'mark_engine_auto');
  END IF;
END $$;

-- ============================================================
-- 3. Drop old unique index
-- ============================================================
DROP INDEX IF EXISTS idx_user_errors_user_storage_key_unique;

-- ============================================================
-- 4. CHECK constraints (idempotent via DO blocks)
-- ============================================================

-- 4a. chk_user_errors_source
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_user_errors_source'
      AND conrelid = 'public.user_errors'::regclass
  ) THEN
    ALTER TABLE public.user_errors
      ADD CONSTRAINT chk_user_errors_source
      CHECK (source IN ('manual','mark_engine_auto'));
  END IF;
END $$;

-- 4b. chk_user_errors_auto_requirements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_user_errors_auto_requirements'
      AND conrelid = 'public.user_errors'::regclass
  ) THEN
    ALTER TABLE public.user_errors
      ADD CONSTRAINT chk_user_errors_auto_requirements
      CHECK (
        source <> 'mark_engine_auto'
        OR (
          q_number IS NOT NULL
          AND metadata ? 'rubric_id'
          AND metadata ? 'run_id'
          AND metadata ? 'rubric_source_version'
        )
      );
  END IF;
END $$;

-- ============================================================
-- 5. Partial unique indexes
-- ============================================================

-- 5a. Auto-record unique key (per rubric point per version)
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_errors_auto_point
  ON public.user_errors(
    user_id,
    storage_key,
    q_number,
    COALESCE(metadata->>'rubric_id',''),
    COALESCE(metadata->>'rubric_source_version','')
  )
  WHERE source='mark_engine_auto' AND storage_key IS NOT NULL;

-- 5b. Manual-record unique key (per user per storage_key)
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_errors_manual_storage
  ON public.user_errors(user_id, storage_key)
  WHERE source<>'mark_engine_auto' AND storage_key IS NOT NULL;

-- ============================================================
-- 6. Source index for filtering
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_errors_source
  ON public.user_errors(source);

-- ============================================================
-- 7. Expression index compatibility verification
--    Inserts a test row, verifies the expression index path
--    metadata->>'rubric_id' works, then cleans up.
--    Uses a real auth.users row to satisfy FK; skips if empty.
-- ============================================================
DO $$
DECLARE
  _test_user_id UUID;
  _test_storage TEXT := '__phase1_closure_v1_compat_test__';
  _conflict_ok BOOLEAN := FALSE;
BEGIN
  -- Pick an existing auth user to satisfy FK constraint
  SELECT id INTO _test_user_id FROM auth.users LIMIT 1;

  IF _test_user_id IS NULL THEN
    RAISE NOTICE '[phase1_closure_v1] No auth.users rows – skipping expression index compat verification (will be validated in E2E gate)';
    RETURN;
  END IF;

  -- Clean up any leftover test rows from a previous partial run
  DELETE FROM public.user_errors
  WHERE user_id = _test_user_id
    AND storage_key = _test_storage;

  -- Insert a test row exercising the auto-point expression index
  INSERT INTO public.user_errors (
    user_id, storage_key, q_number, source, question, metadata
  ) VALUES (
    _test_user_id,
    _test_storage,
    999,
    'mark_engine_auto',
    '__compat_test__',
    jsonb_build_object(
      'rubric_id', 'compat-test-rubric',
      'run_id', 'compat-test-run',
      'rubric_source_version', 'compat-test-version'
    )
  );

  -- Attempt a conflicting insert – should be caught by unique index
  BEGIN
    INSERT INTO public.user_errors (
      user_id, storage_key, q_number, source, question, metadata
    ) VALUES (
      _test_user_id,
      _test_storage,
      999,
      'mark_engine_auto',
      '__compat_test_dup__',
      jsonb_build_object(
        'rubric_id', 'compat-test-rubric',
        'run_id', 'compat-test-run-2',
        'rubric_source_version', 'compat-test-version'
      )
    );
    -- If we get here, the unique index did NOT fire – that's a problem
    RAISE EXCEPTION '[phase1_closure_v1] Expression index uq_user_errors_auto_point did NOT prevent duplicate – compat check FAILED';
  EXCEPTION
    WHEN unique_violation THEN
      _conflict_ok := TRUE;
      RAISE NOTICE '[phase1_closure_v1] Expression index compatibility verified – duplicate correctly rejected';
  END;

  -- Clean up test rows
  DELETE FROM public.user_errors
  WHERE user_id = _test_user_id
    AND storage_key = _test_storage;

  IF NOT _conflict_ok THEN
    RAISE EXCEPTION '[phase1_closure_v1] Expression index compatibility check did not complete as expected';
  END IF;
END $$;
