ALTER TABLE IF EXISTS public.vlm_jobs_v0
  ALTER COLUMN q_number DROP NOT NULL;

ALTER TABLE IF EXISTS public.question_descriptions_v0
  ALTER COLUMN q_number DROP NOT NULL;
