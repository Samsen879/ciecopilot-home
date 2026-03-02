-- T15: tighten authenticated grants and enforce RLS boundaries
-- Goal:
-- 1) Remove legacy blanket grants such as `GRANT ALL ON ALL TABLES ... TO authenticated`
-- 2) Re-grant only the minimum table privileges implied by existing RLS policies
-- 3) Ensure tables with policies are not accidentally left without enforced RLS

BEGIN;

-- Remove blanket privileges first.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;

-- Keep basic schema/readonly visibility.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Force RLS on every table that already has at least one policy.
DO $$
DECLARE
  policy_table RECORD;
BEGIN
  FOR policy_table IN
    SELECT DISTINCT schemaname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', policy_table.schemaname, policy_table.tablename);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', policy_table.schemaname, policy_table.tablename);
  END LOOP;
END $$;

-- Re-grant write privileges ONLY when corresponding authenticated/public RLS policies exist.
DO $$
DECLARE
  writable_table RECORD;
BEGIN
  -- INSERT grants
  FOR writable_table IN
    SELECT DISTINCT schemaname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        roles @> ARRAY['authenticated'::name]
        OR roles @> ARRAY['public'::name]
      )
      AND cmd IN ('ALL', 'INSERT')
  LOOP
    EXECUTE format('GRANT INSERT ON TABLE %I.%I TO authenticated', writable_table.schemaname, writable_table.tablename);
  END LOOP;

  -- UPDATE grants
  FOR writable_table IN
    SELECT DISTINCT schemaname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        roles @> ARRAY['authenticated'::name]
        OR roles @> ARRAY['public'::name]
      )
      AND cmd IN ('ALL', 'UPDATE')
  LOOP
    EXECUTE format('GRANT UPDATE ON TABLE %I.%I TO authenticated', writable_table.schemaname, writable_table.tablename);
  END LOOP;

  -- DELETE grants
  FOR writable_table IN
    SELECT DISTINCT schemaname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        roles @> ARRAY['authenticated'::name]
        OR roles @> ARRAY['public'::name]
      )
      AND cmd IN ('ALL', 'DELETE')
  LOOP
    EXECUTE format('GRANT DELETE ON TABLE %I.%I TO authenticated', writable_table.schemaname, writable_table.tablename);
  END LOOP;
END $$;

-- Explicitly keep critical tables read-only for authenticated users.
DO $$
DECLARE
  t TEXT;
  critical_tables TEXT[] := ARRAY[
    'public.system_settings',
    'public.security_events',
    'public.user_permissions',
    'public.user_role_history',
    'public.user_password_history',
    'public.vlm_audit_logs_v0',
    'public.vlm_audit_reviews_v0'
  ];
BEGIN
  FOREACH t IN ARRAY critical_tables LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON TABLE %s FROM authenticated', t);
    END IF;
  END LOOP;
END $$;

COMMIT;
