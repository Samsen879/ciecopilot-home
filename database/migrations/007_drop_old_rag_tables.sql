-- Drop old RAG tables that are no longer used
-- These tables have been replaced by rag_documents, rag_chunks, and rag_embeddings
-- Safe to run multiple times (idempotent using IF EXISTS)

-- Drop old embedding table first (has foreign key dependencies)
DROP TABLE IF EXISTS public.document_embeddings;

-- Drop old chunks table (has foreign key dependencies)
DROP TABLE IF EXISTS public.document_chunks;

-- Drop old documents table
DROP TABLE IF EXISTS public.documents;

-- Confirmation message
SELECT 'Old RAG tables (documents, document_chunks, document_embeddings) have been dropped' AS message;