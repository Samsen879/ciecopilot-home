-- test/fixtures/supabase-shims.sql
-- Purpose: make Supabase RLS policies parsable in vanilla Postgres during migration replay
-- NOTE: test-only; do NOT copy into production migrations.

CREATE SCHEMA IF NOT EXISTS auth;

-- Minimal stub: used by RLS policies like `auth.role() = 'authenticated'`
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT 'authenticated'::text;
$$;

-- Optional stubs (add if referenced by policies in future)
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT '00000000-0000-0000-0000-000000000000'::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT '{}'::jsonb;
$$;
