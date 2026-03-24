-- Promote the first released-scoring integration slice for the learning runtime.

INSERT INTO public.learning_question_families (
  family_id,
  subject_code,
  title,
  description,
  release_state
)
VALUES (
  '9709.integration_techniques',
  '9709',
  'Integration techniques',
  'Canonical integration family for released-scoring runtime slices.',
  'released'
)
ON CONFLICT (family_id) DO UPDATE
SET
  subject_code = EXCLUDED.subject_code,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  release_state = EXCLUDED.release_state,
  updated_at = now();

INSERT INTO public.learning_question_types (
  question_type_id,
  family_id,
  subject_code,
  title,
  description,
  allowed_variant_tags,
  release_state
)
VALUES (
  '9709.integration.application',
  '9709.integration_techniques',
  '9709',
  'Integration applications',
  'Released-scoring integration slice covering direct application and curve-recovery questions.',
  '["paper:p1", "paper:p3", "answer_form:exact"]'::jsonb,
  'released'
)
ON CONFLICT (question_type_id) DO UPDATE
SET
  family_id = EXCLUDED.family_id,
  subject_code = EXCLUDED.subject_code,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  allowed_variant_tags = EXCLUDED.allowed_variant_tags,
  release_state = EXCLUDED.release_state,
  updated_at = now();

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
  lqt.release_state AS primary_question_type_release_state
FROM public.question_bank qb
LEFT JOIN public.learning_question_families lf
  ON lf.family_id = qb.family_id
LEFT JOIN public.learning_question_types lqt
  ON lqt.question_type_id = qb.primary_question_type_id
LEFT JOIN public.learning_question_analysis_snapshots lqas
  ON lqas.question_id = qb.question_id
 AND lqas.superseded_by_snapshot_id IS NULL;
