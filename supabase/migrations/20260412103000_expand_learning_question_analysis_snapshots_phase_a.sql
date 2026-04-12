-- Phase A question intelligence: enrich snapshot storage and the registry read bridge.

ALTER TABLE public.learning_question_analysis_snapshots
  ADD COLUMN IF NOT EXISTS prerequisite_topic_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS canonical_step_skeleton_summary JSONB NULL,
  ADD COLUMN IF NOT EXISTS difficulty_signal JSONB NULL,
  ADD COLUMN IF NOT EXISTS confidence_band TEXT NULL,
  ADD COLUMN IF NOT EXISTS analysis_audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS analysis_version TEXT NOT NULL DEFAULT 'phase_a.v1',
  ADD COLUMN IF NOT EXISTS evidence_source_event_ref JSONB NULL,
  ADD COLUMN IF NOT EXISTS analysis_provenance_kind TEXT NOT NULL DEFAULT 'real';

ALTER TABLE public.learning_question_analysis_snapshots
  DROP CONSTRAINT IF EXISTS learning_question_analysis_snapshots_confidence_band_check;

ALTER TABLE public.learning_question_analysis_snapshots
  ADD CONSTRAINT learning_question_analysis_snapshots_confidence_band_check
  CHECK (confidence_band IS NULL OR confidence_band IN ('low', 'medium', 'high'));

ALTER TABLE public.learning_question_analysis_snapshots
  DROP CONSTRAINT IF EXISTS learning_question_analysis_snapshots_analysis_provenance_kind_check;

ALTER TABLE public.learning_question_analysis_snapshots
  ADD CONSTRAINT learning_question_analysis_snapshots_analysis_provenance_kind_check
  CHECK (analysis_provenance_kind IN ('real', 'synthetic', 'mixed', 'unknown'));

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
  lqas.classification_source,
  lqas.classification_confidence,
  lqas.confidence_band,
  lqas.candidate_rubric_refs,
  lqas.prerequisite_topic_ids,
  lqas.canonical_step_skeleton_summary,
  lqas.difficulty_signal,
  lqas.analysis_audit_metadata,
  lqas.analysis_version,
  lqas.evidence_source_event_ref,
  lqas.analysis_provenance_kind,
  lqt.release_state AS primary_question_type_release_state
FROM public.question_bank qb
LEFT JOIN public.learning_question_families lf
  ON lf.family_id = qb.family_id
LEFT JOIN public.learning_question_types lqt
  ON lqt.question_type_id = qb.primary_question_type_id
LEFT JOIN public.learning_question_analysis_snapshots lqas
  ON lqas.question_id = qb.question_id
 AND lqas.superseded_by_snapshot_id IS NULL;
