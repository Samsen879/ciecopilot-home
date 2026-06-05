-- Add paper-scoped workspace persistence without rewriting topic workspaces.

CREATE TABLE IF NOT EXISTS public.learning_paper_workspaces (
  paper_workspace_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  paper_scope TEXT NOT NULL,
  workspace_kind TEXT NOT NULL DEFAULT 'paper_main',
  visible_organization_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  linked_topic_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, paper_scope),
  CONSTRAINT chk_learning_paper_workspaces_subject_code
    CHECK (subject_code ~ '^[0-9]{4}$'),
  CONSTRAINT chk_learning_paper_workspaces_paper_scope_format
    CHECK (paper_scope ~ '^[0-9]{4}:paper:p[0-9][a-z0-9_-]*$'),
  CONSTRAINT chk_learning_paper_workspaces_subject_scope_match
    CHECK (split_part(paper_scope, ':', 1) = subject_code),
  CONSTRAINT chk_learning_paper_workspaces_workspace_kind
    CHECK (workspace_kind IN ('paper_main')),
  CONSTRAINT chk_learning_paper_workspaces_visible_summary_object
    CHECK (jsonb_typeof(visible_organization_summary) = 'object'),
  CONSTRAINT chk_learning_paper_workspaces_linked_topic_summary_object
    CHECK (jsonb_typeof(linked_topic_summary) = 'object')
);

CREATE TABLE IF NOT EXISTS public.learning_paper_workspace_topic_sections (
  paper_workspace_topic_section_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_workspace_id UUID NOT NULL REFERENCES public.learning_paper_workspaces(paper_workspace_id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.curriculum_nodes(node_id) ON DELETE RESTRICT,
  topic_workspace_id UUID REFERENCES public.learning_workspaces(workspace_id) ON DELETE SET NULL,
  topic_path TEXT NOT NULL,
  section_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (paper_workspace_id, topic_id),
  UNIQUE (paper_workspace_id, topic_path),
  CONSTRAINT chk_learning_paper_workspace_topic_sections_state_object
    CHECK (jsonb_typeof(section_state) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_learning_paper_workspaces_user_updated
  ON public.learning_paper_workspaces (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_paper_workspaces_scope
  ON public.learning_paper_workspaces (paper_scope);

CREATE INDEX IF NOT EXISTS idx_learning_paper_workspace_topic_sections_topic
  ON public.learning_paper_workspace_topic_sections (topic_id);

CREATE INDEX IF NOT EXISTS idx_learning_paper_workspace_topic_sections_topic_workspace
  ON public.learning_paper_workspace_topic_sections (topic_workspace_id)
  WHERE topic_workspace_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_learning_paper_workspace_topic_section_workspace_match()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  paper_workspace_user_id UUID;
  linked_workspace_user_id UUID;
  linked_workspace_topic_id UUID;
BEGIN
  IF NEW.topic_workspace_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id
  INTO paper_workspace_user_id
  FROM public.learning_paper_workspaces
  WHERE paper_workspace_id = NEW.paper_workspace_id;

  IF paper_workspace_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id, topic_id
  INTO linked_workspace_user_id, linked_workspace_topic_id
  FROM public.learning_workspaces
  WHERE workspace_id = NEW.topic_workspace_id;

  IF linked_workspace_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF linked_workspace_user_id <> paper_workspace_user_id THEN
    RAISE EXCEPTION
      'topic_workspace_id must belong to the same user as the parent paper workspace'
      USING
        ERRCODE = '23514',
        CONSTRAINT = 'chk_learning_paper_workspace_topic_sections_topic_workspace_user';
  END IF;

  IF linked_workspace_topic_id <> NEW.topic_id THEN
    RAISE EXCEPTION
      'topic_workspace_id must belong to the same topic as the paper workspace topic section'
      USING
        ERRCODE = '23514',
        CONSTRAINT = 'chk_learning_paper_workspace_topic_sections_topic_workspace_topic';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_learning_paper_workspace_topic_sections_workspace_match'
      AND tgrelid = 'public.learning_paper_workspace_topic_sections'::regclass
  ) THEN
    CREATE TRIGGER trg_learning_paper_workspace_topic_sections_workspace_match
      BEFORE INSERT OR UPDATE OF paper_workspace_id, topic_id, topic_workspace_id
      ON public.learning_paper_workspace_topic_sections
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_learning_paper_workspace_topic_section_workspace_match();
  END IF;
END $$;

CREATE OR REPLACE VIEW public.learning_paper_workspace_projection AS
SELECT
  pw.paper_workspace_id,
  pw.user_id,
  pw.subject_code,
  pw.paper_scope,
  pw.workspace_kind,
  pw.visible_organization_summary,
  pw.linked_topic_summary,
  pw.created_at,
  pw.updated_at,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'paper_workspace_topic_section_id', ts.paper_workspace_topic_section_id,
        'topic_id', ts.topic_id,
        'topic_workspace_id', ts.topic_workspace_id,
        'topic_path', ts.topic_path,
        'section_state', ts.section_state,
        'created_at', ts.created_at,
        'updated_at', ts.updated_at
      )
      ORDER BY ts.topic_path
    ) FILTER (WHERE ts.paper_workspace_topic_section_id IS NOT NULL),
    '[]'::jsonb
  ) AS topic_sections
FROM public.learning_paper_workspaces pw
LEFT JOIN public.learning_paper_workspace_topic_sections ts
  ON ts.paper_workspace_id = pw.paper_workspace_id
GROUP BY
  pw.paper_workspace_id,
  pw.user_id,
  pw.subject_code,
  pw.paper_scope,
  pw.workspace_kind,
  pw.visible_organization_summary,
  pw.linked_topic_summary,
  pw.created_at,
  pw.updated_at;

CREATE OR REPLACE VIEW public.learning_topic_workspace_compatibility_projection AS
SELECT *
FROM public.learning_workspace_projection;

COMMENT ON TABLE public.learning_paper_workspaces IS
  'Visible Paper Workspace organizer keyed by learner and paper_scope; canonical topic ownership remains on topic-owned artifacts, review tasks, question types, and mastery rows.';

COMMENT ON COLUMN public.learning_paper_workspaces.paper_scope IS
  'Canonical paper workspace identity such as 9709:paper:p1. This is the paper-visible container key, not artifact or ReviewTask canonical ownership.';

COMMENT ON TABLE public.learning_paper_workspace_topic_sections IS
  'Bridge from visible paper workspace to canonical topic sections. It does not duplicate artifacts, review tasks, queues, or mastery state.';

COMMENT ON COLUMN public.learning_paper_workspace_topic_sections.topic_workspace_id IS
  'Optional compatibility pointer to the existing topic-scoped learning_workspaces row for current /api/learning/workspaces/:topicId callers.';

COMMENT ON VIEW public.learning_paper_workspace_projection IS
  'Paper workspace read model with topic sections; review queues remain global/topic-owned projections and are not cloned per paper.';

COMMENT ON VIEW public.learning_topic_workspace_compatibility_projection IS
  'Compatibility view preserving topic-scoped workspace reads while paper-scoped workspace adoption is additive.';
