-- Phase A remediation: persist explicit low-confidence posture and real QuestionClassified events.

ALTER TABLE public.learning_question_analysis_snapshots
  ADD COLUMN IF NOT EXISTS low_confidence_posture JSONB NULL;

ALTER TABLE public.learning_question_analysis_snapshots
  DROP CONSTRAINT IF EXISTS learning_question_analysis_snapshots_low_confidence_posture_check;

ALTER TABLE public.learning_question_analysis_snapshots
  ADD CONSTRAINT learning_question_analysis_snapshots_low_confidence_posture_check
  CHECK (low_confidence_posture IS NULL OR jsonb_typeof(low_confidence_posture) = 'object');

CREATE TABLE IF NOT EXISTS public.learning_question_events (
  question_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('QuestionClassified')),
  question_id UUID NOT NULL REFERENCES public.question_bank(question_id) ON DELETE CASCADE,
  classification_snapshot_id UUID NOT NULL REFERENCES public.learning_question_analysis_snapshots(classification_snapshot_id) ON DELETE CASCADE,
  event_payload JSONB NOT NULL,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_type, classification_snapshot_id),
  CHECK (jsonb_typeof(event_payload) = 'object'),
  CHECK (jsonb_typeof(provenance) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_learning_question_events_question_id
  ON public.learning_question_events (question_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_question_events_snapshot_id
  ON public.learning_question_events (classification_snapshot_id);

CREATE OR REPLACE VIEW public.learning_question_registry_projection AS
SELECT
  qb.question_id,
  qb.source_kind,
  qb.subject_code,
  qb.paper_scope,
  qb.primary_topic_id,
  qb.secondary_topic_ids,
  qb.family_id,
  lf.title AS family_title,
  qb.primary_question_type_id,
  lqt.title AS primary_question_type_title,
  qb.secondary_question_type_ids,
  qb.variant_tags,
  qb.release_scope_status,
  qb.classification_snapshot_ref,
  qb.prompt_representation,
  qb.provenance_summary,
  lqas.classification_confidence,
  lqas.candidate_rubric_refs,
  lqt.release_state AS primary_question_type_release_state,
  lqas.classification_source,
  lqas.confidence_band,
  lqas.prerequisite_topic_ids,
  lqas.canonical_step_skeleton_summary,
  lqas.difficulty_signal,
  lqas.analysis_audit_metadata,
  lqas.analysis_version,
  lqas.evidence_source_event_ref,
  lqas.analysis_provenance_kind,
  lqas.low_confidence_posture
FROM public.question_bank qb
LEFT JOIN public.learning_question_families lf
  ON lf.family_id = qb.family_id
LEFT JOIN public.learning_question_types lqt
  ON lqt.question_type_id = qb.primary_question_type_id
LEFT JOIN public.learning_question_analysis_snapshots lqas
  ON lqas.question_id = qb.question_id
 AND lqas.superseded_by_snapshot_id IS NULL;
