-- Create the canonical learning-runtime persistence layer.

CREATE TABLE IF NOT EXISTS public.learning_question_families (
  family_id TEXT PRIMARY KEY,
  subject_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  release_state TEXT NOT NULL CHECK (release_state IN ('draft', 'validated', 'released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_question_types (
  question_type_id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES public.learning_question_families(family_id) ON DELETE RESTRICT,
  subject_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  default_primary_topic_id UUID REFERENCES public.curriculum_nodes(node_id) ON DELETE SET NULL,
  allowed_variant_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  release_state TEXT NOT NULL CHECK (release_state IN ('draft', 'validated', 'released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_question_analysis_snapshots (
  classification_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.question_bank(question_id) ON DELETE CASCADE,
  primary_topic_id UUID REFERENCES public.curriculum_nodes(node_id) ON DELETE SET NULL,
  secondary_topic_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  family_id TEXT REFERENCES public.learning_question_families(family_id) ON DELETE SET NULL,
  primary_question_type_id TEXT REFERENCES public.learning_question_types(question_type_id) ON DELETE SET NULL,
  secondary_question_type_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  variant_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  classification_source TEXT NOT NULL,
  classification_confidence NUMERIC(5,4),
  candidate_rubric_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  superseded_by_snapshot_id UUID REFERENCES public.learning_question_analysis_snapshots(classification_snapshot_id) ON DELETE SET NULL,
  CHECK (classification_confidence IS NULL OR (classification_confidence >= 0 AND classification_confidence <= 1))
);

CREATE TABLE IF NOT EXISTS public.learning_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  session_goal TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('learn_concept', 'guided_solve', 'timed_practice', 'post_mortem_review', 'spaced_review')),
  state TEXT NOT NULL CHECK (state IN ('active', 'handoff_suggested', 'handed_off', 'closed')),
  active_scope_bundle JSONB NOT NULL,
  current_anchor_kind TEXT NOT NULL CHECK (current_anchor_kind IN ('concept', 'question', 'review_task', 'artifact', 'workspace_slot')),
  current_anchor_ref JSONB NOT NULL,
  current_question_id UUID REFERENCES public.question_bank(question_id) ON DELETE SET NULL,
  current_question_type_id TEXT REFERENCES public.learning_question_types(question_type_id) ON DELETE SET NULL,
  summary_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  open_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  key_artifact_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  misconceptions_in_focus JSONB NOT NULL DEFAULT '[]'::jsonb,
  lineage_ref JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(active_scope_bundle) = 'object'),
  CHECK (jsonb_typeof(current_anchor_ref) = 'object')
);

CREATE TABLE IF NOT EXISTS public.learning_session_lineage (
  lineage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_session_id UUID REFERENCES public.learning_sessions(session_id) ON DELETE SET NULL,
  child_session_id UUID NOT NULL REFERENCES public.learning_sessions(session_id) ON DELETE CASCADE,
  handoff_kind TEXT CHECK (handoff_kind IN ('internal_compaction', 'suggested_handoff', 'explicit_new_session')),
  summary_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_session_id)
);

CREATE TABLE IF NOT EXISTS public.learning_workspaces (
  workspace_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.curriculum_nodes(node_id) ON DELETE RESTRICT,
  topic_path TEXT NOT NULL,
  slot_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  linked_reference_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id)
);

CREATE TABLE IF NOT EXISTS public.learning_workspace_slots (
  workspace_slot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.learning_workspaces(workspace_id) ON DELETE CASCADE,
  slot_key TEXT NOT NULL CHECK (slot_key IN ('overview_map', 'core_method_derivation', 'canonical_worked_example', 'common_traps', 'my_notes', 'review_queue')),
  primary_artifact_ref JSONB,
  linked_reference_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slot_key),
  CHECK (slot_key <> 'review_queue' OR primary_artifact_ref IS NULL)
);

CREATE TABLE IF NOT EXISTS public.learning_artifacts (
  artifact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_kind TEXT NOT NULL CHECK (artifact_kind IN ('summary_card', 'derivation_card', 'worked_example_card', 'misconception_card', 'formula_card', 'free_note')),
  canonical_home_topic_id UUID NOT NULL REFERENCES public.curriculum_nodes(node_id) ON DELETE RESTRICT,
  source_session_id UUID REFERENCES public.learning_sessions(session_id) ON DELETE SET NULL,
  source_attempt_id UUID REFERENCES public.attempts(attempt_id) ON DELETE SET NULL,
  source_mark_run_id UUID REFERENCES public.mark_runs(mark_run_id) ON DELETE SET NULL,
  target_family_id TEXT REFERENCES public.learning_question_families(family_id) ON DELETE SET NULL,
  target_question_type_id TEXT REFERENCES public.learning_question_types(question_type_id) ON DELETE SET NULL,
  slot_key TEXT CHECK (slot_key IN ('overview_map', 'core_method_derivation', 'canonical_worked_example', 'common_traps', 'my_notes')),
  trust_status TEXT NOT NULL CHECK (trust_status IN ('unverified', 'grounded', 'user_confirmed', 'contested')),
  placement_status TEXT NOT NULL CHECK (placement_status IN ('inbox', 'pinned', 'archived')),
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN ('active', 'revised', 'superseded')),
  lineage_parent_artifact_id UUID REFERENCES public.learning_artifacts(artifact_id) ON DELETE SET NULL,
  superseded_by_artifact_id UUID REFERENCES public.learning_artifacts(artifact_id) ON DELETE SET NULL,
  grounding_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (lineage_parent_artifact_id IS NULL OR lineage_parent_artifact_id <> artifact_id),
  CHECK (superseded_by_artifact_id IS NULL OR superseded_by_artifact_id <> artifact_id),
  CHECK (placement_status <> 'pinned' OR trust_status <> 'contested'),
  CHECK (superseded_by_artifact_id IS NULL OR lifecycle_status = 'superseded')
);

CREATE TABLE IF NOT EXISTS public.learning_artifact_secondary_refs (
  secondary_ref_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES public.learning_artifacts(artifact_id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.curriculum_nodes(node_id) ON DELETE CASCADE,
  topic_path TEXT NOT NULL,
  ref_kind TEXT NOT NULL DEFAULT 'linked_reference',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artifact_id, topic_id),
  CHECK (ref_kind IN ('linked_reference'))
);

CREATE TABLE IF NOT EXISTS public.learning_review_tasks (
  review_task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_kind TEXT NOT NULL,
  target_topic_id UUID NOT NULL REFERENCES public.curriculum_nodes(node_id) ON DELETE RESTRICT,
  target_family_id TEXT REFERENCES public.learning_question_families(family_id) ON DELETE SET NULL,
  target_question_type_id TEXT REFERENCES public.learning_question_types(question_type_id) ON DELETE SET NULL,
  target_misconception_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_artifact_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_question_id UUID REFERENCES public.question_bank(question_id) ON DELETE SET NULL,
  source_attempt_ref JSONB,
  trigger_type TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('redo_variant', 'quick_recall', 'reconstruct_derivation', 'timed_check', 'trap_fix')),
  due_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  estimated_minutes INT CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
  success_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  completion_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('open', 'partial', 'completed', 'skipped', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (target_kind IN ('family', 'question_type', 'misconception_tag', 'artifact', 'question'))
);

CREATE TABLE IF NOT EXISTS public.learning_family_masteries (
  family_mastery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.curriculum_nodes(node_id) ON DELETE RESTRICT,
  family_id TEXT NOT NULL REFERENCES public.learning_question_families(family_id) ON DELETE CASCADE,
  mastery_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  signal_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id, family_id)
);

CREATE TABLE IF NOT EXISTS public.learning_type_masteries (
  type_mastery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.curriculum_nodes(node_id) ON DELETE RESTRICT,
  family_id TEXT NOT NULL REFERENCES public.learning_question_families(family_id) ON DELETE CASCADE,
  question_type_id TEXT NOT NULL REFERENCES public.learning_question_types(question_type_id) ON DELETE CASCADE,
  mastery_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  signal_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id, question_type_id)
);

CREATE TABLE IF NOT EXISTS public.learning_reconciliation_runs (
  reconciliation_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_source TEXT NOT NULL,
  source_ref JSONB NOT NULL,
  affected_object_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  old_snapshot_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  new_snapshot_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  result_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'question_bank_primary_topic_id_fkey'
      AND conrelid = 'public.question_bank'::regclass
  ) THEN
    ALTER TABLE public.question_bank
      ADD CONSTRAINT question_bank_primary_topic_id_fkey
      FOREIGN KEY (primary_topic_id) REFERENCES public.curriculum_nodes(node_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'question_bank_family_id_fkey'
      AND conrelid = 'public.question_bank'::regclass
  ) THEN
    ALTER TABLE public.question_bank
      ADD CONSTRAINT question_bank_family_id_fkey
      FOREIGN KEY (family_id) REFERENCES public.learning_question_families(family_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'question_bank_primary_question_type_id_fkey'
      AND conrelid = 'public.question_bank'::regclass
  ) THEN
    ALTER TABLE public.question_bank
      ADD CONSTRAINT question_bank_primary_question_type_id_fkey
      FOREIGN KEY (primary_question_type_id) REFERENCES public.learning_question_types(question_type_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_learning_question_types_family_id
  ON public.learning_question_types (family_id);

CREATE INDEX IF NOT EXISTS idx_learning_question_analysis_snapshots_question_id
  ON public.learning_question_analysis_snapshots (question_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_learning_question_analysis_snapshots_active
  ON public.learning_question_analysis_snapshots (question_id)
  WHERE superseded_by_snapshot_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_updated
  ON public.learning_sessions (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_session_lineage_parent_session_id
  ON public.learning_session_lineage (parent_session_id);

CREATE INDEX IF NOT EXISTS idx_learning_workspaces_topic_id
  ON public.learning_workspaces (topic_id);

CREATE INDEX IF NOT EXISTS idx_learning_artifacts_home_topic
  ON public.learning_artifacts (canonical_home_topic_id, placement_status, lifecycle_status);

CREATE INDEX IF NOT EXISTS idx_learning_review_tasks_user_status_due
  ON public.learning_review_tasks (user_id, status, due_at);

CREATE INDEX IF NOT EXISTS idx_learning_family_masteries_user_topic
  ON public.learning_family_masteries (user_id, topic_id);

CREATE INDEX IF NOT EXISTS idx_learning_type_masteries_user_topic
  ON public.learning_type_masteries (user_id, topic_id);
