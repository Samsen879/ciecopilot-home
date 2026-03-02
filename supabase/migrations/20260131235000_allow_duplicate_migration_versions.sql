DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'supabase_migrations'
      AND r.relname = 'schema_migrations'
      AND c.contype = 'p'
      AND c.conname = 'schema_migrations_pkey'
  ) THEN
    ALTER TABLE supabase_migrations.schema_migrations
      DROP CONSTRAINT schema_migrations_pkey;
    ALTER TABLE supabase_migrations.schema_migrations
      ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version, name);
  END IF;
END $$;
