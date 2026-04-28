-- Retire the community module data surfaces.
--
-- Historical migrations remain in the repository for reproducibility, but the
-- active schema should no longer expose community Q&A tables.

DROP TABLE IF EXISTS public.community_notifications CASCADE;
DROP TABLE IF EXISTS public.community_reports CASCADE;
DROP TABLE IF EXISTS public.community_interactions CASCADE;
DROP TABLE IF EXISTS public.content_tags CASCADE;
DROP TABLE IF EXISTS public.community_tags CASCADE;
DROP TABLE IF EXISTS public.community_answers CASCADE;
DROP TABLE IF EXISTS public.community_questions CASCADE;
DROP TABLE IF EXISTS public.user_community_profiles CASCADE;

DROP TABLE IF EXISTS public.qa_community_answers CASCADE;
DROP TABLE IF EXISTS public.qa_community_posts CASCADE;
