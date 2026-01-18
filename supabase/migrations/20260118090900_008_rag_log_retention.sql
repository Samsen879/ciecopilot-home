-- 008_rag_log_retention.sql
-- Setup simple retention for rag_search_logs using pg_cron

-- Enable pg_cron (if available)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create purge function
CREATE OR REPLACE FUNCTION public.rag_search_logs_purge(keep_days integer DEFAULT 90)
RETURNS void AS $$
BEGIN
  DELETE FROM public.rag_search_logs
  WHERE created_at < NOW() - make_interval(days => keep_days);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule daily job at 03:10
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc WHERE proname = 'cron_schedule') THEN
    PERFORM cron.schedule('rag_search_logs_purge_daily', '10 3 * * *', 'SELECT public.rag_search_logs_purge(90);');
  END IF;
END $$;



