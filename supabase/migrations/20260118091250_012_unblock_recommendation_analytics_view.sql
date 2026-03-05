-- Unblock recommendation_analytics view rename conflict between 011 and 013
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'recommendation_analytics'
      AND column_name = 'user_id'
  ) THEN
    DROP VIEW IF EXISTS public.recommendation_analytics;
  END IF;
END $$;
