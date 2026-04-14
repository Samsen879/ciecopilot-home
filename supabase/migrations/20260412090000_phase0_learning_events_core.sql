-- Phase 0: P6 event infrastructure core tables
-- Scope: append-only event store, handler idempotency ledger, per-attempt observable pipeline state

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.learning_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'AttemptSubmitted',
      'QuestionClassified',
      'MarkingCompleted',
      'LearningUpdateProposed',
      'MasteryUpdated',
      'ReviewTasksCreated',
      'ArtifactSuggestionsCreated'
    )
  ),
  aggregate_type TEXT NOT NULL DEFAULT 'attempt' CHECK (aggregate_type = 'attempt'),
  aggregate_id UUID NOT NULL REFERENCES public.attempts(attempt_id) ON DELETE RESTRICT,
  learner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  session_id UUID REFERENCES public.learning_sessions(session_id) ON DELETE SET NULL,
  subject_code TEXT NOT NULL,
  truth_revision INTEGER NOT NULL DEFAULT 1 CHECK (truth_revision >= 1),
  sequence_no INTEGER NOT NULL CHECK (sequence_no >= 1),
  stage_ordinal SMALLINT GENERATED ALWAYS AS (
    CASE event_type
      WHEN 'AttemptSubmitted' THEN 1
      WHEN 'QuestionClassified' THEN 2
      WHEN 'MarkingCompleted' THEN 3
      WHEN 'LearningUpdateProposed' THEN 4
      WHEN 'MasteryUpdated' THEN 5
      WHEN 'ReviewTasksCreated' THEN 6
      WHEN 'ArtifactSuggestionsCreated' THEN 7
    END
  ) STORED,
  correlation_id UUID NOT NULL,
  causation_event_id UUID REFERENCES public.learning_events(event_id),
  replay_of_event_id UUID REFERENCES public.learning_events(event_id),
  supersedes_event_id UUID REFERENCES public.learning_events(event_id),
  reconciliation_id UUID,
  dedupe_key TEXT NOT NULL,
  basis_hash TEXT NOT NULL,
  emitted_by TEXT NOT NULL,
  payload JSONB NOT NULL,
  provenance JSONB NOT NULL,
  emitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_learning_events_stream_seq
    UNIQUE (aggregate_id, truth_revision, sequence_no),
  CONSTRAINT uq_learning_events_revision_stage
    UNIQUE (aggregate_id, truth_revision, event_type),
  CONSTRAINT uq_learning_events_dedupe
    UNIQUE (event_type, dedupe_key),
  CONSTRAINT ck_learning_events_payload_object
    CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT ck_learning_events_provenance_object
    CHECK (jsonb_typeof(provenance) = 'object'),
  CONSTRAINT ck_learning_events_payload_attempt_id
    CHECK ((payload->>'attempt_id') = aggregate_id::TEXT),
  CONSTRAINT ck_learning_events_provenance_shape
    CHECK (
      provenance ?& ARRAY['subject_code', 'subject_adapter', 'evidence_refs', 'lineage', 'trust']
      AND COALESCE(provenance->>'subject_code', '') = subject_code
      AND jsonb_typeof(provenance->'subject_adapter') = 'object'
      AND jsonb_typeof(provenance->'evidence_refs') = 'array'
      AND jsonb_typeof(provenance->'lineage') = 'object'
      AND jsonb_typeof(provenance->'trust') = 'object'
    ),
  CONSTRAINT ck_attemptsubmitted_payload
    CHECK (
      event_type <> 'AttemptSubmitted'
      OR (
        payload ?& ARRAY['attempt_id', 'attempt_mode', 'submission', 'submitted_at']
        AND jsonb_typeof(payload->'submission') = 'object'
      )
    ),
  CONSTRAINT ck_questionclassified_payload
    CHECK (
      event_type <> 'QuestionClassified'
      OR (
        payload ?& ARRAY[
          'attempt_id',
          'classification',
          'classification_confidence',
          'subject_adapter',
          'classification_version'
        ]
        AND jsonb_typeof(payload->'classification') = 'object'
        AND COALESCE(jsonb_typeof(payload->'uncertain_flags'), 'array') = 'array'
      )
    ),
  CONSTRAINT ck_markingcompleted_payload
    CHECK (
      event_type <> 'MarkingCompleted'
      OR (
        payload ?& ARRAY[
          'attempt_id',
          'marking_mode',
          'released_scope',
          'rubric_ref',
          'diagnostics'
        ]
        AND jsonb_typeof(payload->'rubric_ref') = 'object'
        AND jsonb_typeof(payload->'diagnostics') = 'object'
        AND COALESCE(jsonb_typeof(payload->'uncertain_flags'), 'array') = 'array'
      )
    ),
  CONSTRAINT ck_learningupdateproposed_payload
    CHECK (
      event_type <> 'LearningUpdateProposed'
      OR (
        payload ?& ARRAY[
          'attempt_id',
          'proposal_key',
          'guardrail_decisions',
          'proposed_mastery_effects',
          'proposed_review_tasks',
          'proposed_artifact_suggestions'
        ]
        AND jsonb_typeof(payload->'guardrail_decisions') = 'object'
        AND jsonb_typeof(payload->'proposed_mastery_effects') = 'array'
        AND jsonb_typeof(payload->'proposed_review_tasks') = 'array'
        AND jsonb_typeof(payload->'proposed_artifact_suggestions') = 'array'
      )
    ),
  CONSTRAINT ck_masteryupdated_payload
    CHECK (
      event_type <> 'MasteryUpdated'
      OR (
        payload ?& ARRAY['attempt_id', 'proposal_key', 'applied_effects']
        AND jsonb_typeof(payload->'applied_effects') = 'array'
      )
    ),
  CONSTRAINT ck_reviewtaskscreated_payload
    CHECK (
      event_type <> 'ReviewTasksCreated'
      OR (
        payload ?& ARRAY['attempt_id', 'proposal_key', 'tasks']
        AND jsonb_typeof(payload->'tasks') = 'array'
      )
    ),
  CONSTRAINT ck_artifactsuggestionscreated_payload
    CHECK (
      event_type <> 'ArtifactSuggestionsCreated'
      OR (
        payload ?& ARRAY['attempt_id', 'proposal_key', 'suggestions']
        AND jsonb_typeof(payload->'suggestions') = 'array'
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_learning_events_aggregate_revision_seq
  ON public.learning_events (aggregate_id, truth_revision DESC, sequence_no DESC);

CREATE INDEX IF NOT EXISTS idx_learning_events_subject_stage_time
  ON public.learning_events (subject_code, stage_ordinal, emitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_events_correlation_time
  ON public.learning_events (correlation_id, emitted_at);

CREATE INDEX IF NOT EXISTS idx_learning_events_causation
  ON public.learning_events (causation_event_id)
  WHERE causation_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_learning_events_reconciliation
  ON public.learning_events (reconciliation_id, sequence_no)
  WHERE reconciliation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_learning_events_payload_gin
  ON public.learning_events USING GIN (payload jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_learning_events_provenance_gin
  ON public.learning_events USING GIN (provenance jsonb_path_ops);

CREATE TABLE IF NOT EXISTS public.learning_event_effects (
  effect_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.learning_events(event_id) ON DELETE CASCADE,
  handler_name TEXT NOT NULL,
  effect_key TEXT NOT NULL,
  aggregate_id UUID NOT NULL REFERENCES public.attempts(attempt_id) ON DELETE CASCADE,
  truth_revision INTEGER NOT NULL,
  reconciliation_id UUID,
  status TEXT NOT NULL CHECK (
    status IN ('started', 'succeeded', 'failed', 'noop', 'superseded')
  ),
  result_ref_type TEXT,
  result_ref_id TEXT,
  error_code TEXT,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  first_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (handler_name, effect_key)
);

CREATE INDEX IF NOT EXISTS idx_learning_event_effects_event
  ON public.learning_event_effects (event_id);

CREATE INDEX IF NOT EXISTS idx_learning_event_effects_aggregate_handler_status
  ON public.learning_event_effects (aggregate_id, handler_name, status);

CREATE TABLE IF NOT EXISTS public.attempt_pipeline_state (
  attempt_id UUID PRIMARY KEY REFERENCES public.attempts(attempt_id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  session_id UUID REFERENCES public.learning_sessions(session_id) ON DELETE SET NULL,
  subject_code TEXT NOT NULL,
  current_truth_revision INTEGER NOT NULL DEFAULT 1,
  last_sequence_no INTEGER NOT NULL DEFAULT 0,
  current_stage TEXT NOT NULL CHECK (
    current_stage IN (
      'AttemptSubmitted',
      'QuestionClassified',
      'MarkingCompleted',
      'LearningUpdateProposed',
      'MasteryUpdated',
      'ReviewTasksCreated',
      'ArtifactSuggestionsCreated'
    )
  ),
  current_status TEXT NOT NULL DEFAULT 'running' CHECK (
    current_status IN ('running', 'completed', 'failed', 'blocked', 'reconciling')
  ),
  last_event_id UUID REFERENCES public.learning_events(event_id),
  active_classification_event_id UUID REFERENCES public.learning_events(event_id),
  active_marking_event_id UUID REFERENCES public.learning_events(event_id),
  active_learning_update_event_id UUID REFERENCES public.learning_events(event_id),
  active_mastery_event_id UUID REFERENCES public.learning_events(event_id),
  active_review_tasks_event_id UUID REFERENCES public.learning_events(event_id),
  active_artifact_suggestions_event_id UUID REFERENCES public.learning_events(event_id),
  last_error_code TEXT,
  last_error_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempt_pipeline_state_subject_stage
  ON public.attempt_pipeline_state (subject_code, current_stage);

CREATE INDEX IF NOT EXISTS idx_attempt_pipeline_state_status_updated
  ON public.attempt_pipeline_state (current_status, updated_at DESC);
