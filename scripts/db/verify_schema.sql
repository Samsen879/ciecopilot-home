-- Verify core schema invariants

-- Presence checks
SELECT to_regclass('public.curriculum_nodes') AS curriculum_nodes_regclass;
SELECT to_regclass('public.chunks') AS chunks_regclass;

-- Extensions
SELECT extname
FROM pg_extension
WHERE extname IN ('ltree', 'vector')
ORDER BY extname;

-- curriculum_nodes.topic_path type
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  a.attname AS column_name,
  format_type(a.atttypid, a.atttypmod) AS column_type
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'curriculum_nodes'
  AND a.attname = 'topic_path'
  AND a.attnum > 0
  AND NOT a.attisdropped;

-- curriculum_nodes constraints
SELECT conname
FROM pg_constraint
WHERE conrelid = 'public.curriculum_nodes'::regclass
  AND conname IN ('chk_topic_path_canonical', 'chk_topic_path_not_unmapped')
ORDER BY conname;

-- curriculum_nodes indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'curriculum_nodes'
  AND indexname IN ('idx_curriculum_nodes_topic_path_gist', 'idx_curriculum_nodes_syllabus_code')
ORDER BY indexname;

-- chunks.embedding type (vector dimension)
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  a.attname AS column_name,
  format_type(a.atttypid, a.atttypmod) AS column_type
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'chunks'
  AND a.attname = 'embedding'
  AND a.attnum > 0
  AND NOT a.attisdropped;

-- chunks indexes (topic_path + vector)
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'chunks'
  AND indexname IN ('idx_chunks_topic_path_gist', 'chunks_embedding_hnsw_idx')
ORDER BY indexname;
