DO $$
DECLARE
  has_name_col boolean := false;
BEGIN
  SELECT TRUE INTO has_name_col
  FROM pg_constraint c
  JOIN pg_class r ON r.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = r.relnamespace
  JOIN pg_attribute a ON a.attrelid = r.oid AND a.attnum = ANY (c.conkey)
  WHERE n.nspname = 'supabase_migrations'
    AND r.relname = 'schema_migrations'
    AND c.contype = 'p'
    AND a.attname = 'name';

  IF has_name_col THEN
    ALTER TABLE supabase_migrations.schema_migrations
      DROP CONSTRAINT schema_migrations_pkey;
    ALTER TABLE supabase_migrations.schema_migrations
      ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);
  END IF;
END $$;
