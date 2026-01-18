-- RAG Embeddings & Document Store
-- Safe to run multiple times (idempotent-ish using IF NOT EXISTS / ON CONFLICT)

-- 1) Enable pgvector (requires Supabase/PG >= 15)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Source documents registry
-- Each logical document (e.g., one note file or one PDF file) is registered once
CREATE TABLE IF NOT EXISTS public.rag_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject_code TEXT NOT NULL,                 -- e.g. '9709', '9231', '9702'
    paper_code TEXT,                            -- e.g. 'paper1', 'FP1', 'AS', 'A2'
    topic_id TEXT,                              -- optional: normalized topic key if applicable
    title TEXT NOT NULL,                        -- human-friendly title
    source_type TEXT NOT NULL,                  -- 'note_md', 'past_paper_pdf', 'mark_scheme_pdf', 'syllabus_json', 'web'
    source_path TEXT,                           -- relative file path or URL
    language TEXT DEFAULT 'en',                 -- document language
    tags TEXT[],                                -- arbitrary tags
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_code, paper_code, source_type, source_path)
);

-- 3) Chunk table (stores chunked text with metadata)
CREATE TABLE IF NOT EXISTS public.rag_chunks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES public.rag_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,               -- 0-based order within the document
    content TEXT NOT NULL,                      -- the chunked text
    token_count INTEGER,                        -- precomputed token count (optional)
    page_from INTEGER,                          -- for PDFs: start page
    page_to INTEGER,                            -- for PDFs: end page
    extra JSONB DEFAULT '{}',                   -- any parser-specific metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, chunk_index)
);

-- 4) Embedding table (pgvector)
-- Default dims fixed at 1536. Do not change without full re-embedding and schema migration.
CREATE TABLE IF NOT EXISTS public.rag_embeddings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chunk_id UUID REFERENCES public.rag_chunks(id) ON DELETE CASCADE,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chunk_id)
);

-- 5) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_rag_documents_subject ON public.rag_documents(subject_code);
CREATE INDEX IF NOT EXISTS idx_rag_documents_paper ON public.rag_documents(paper_code);
CREATE INDEX IF NOT EXISTS idx_rag_documents_source_type ON public.rag_documents(source_type);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_document ON public.rag_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_chunk_index ON public.rag_chunks(chunk_index);
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector ON public.rag_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 6) RLS (read-only for authenticated users by default)
ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_embeddings ENABLE ROW LEVEL SECURITY;

-- Policies: allow read for authenticated; write to be restricted to service role or admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rag_documents' AND policyname = 'Authenticated users can view rag_documents'
  ) THEN
    CREATE POLICY "Authenticated users can view rag_documents" ON public.rag_documents FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rag_chunks' AND policyname = 'Authenticated users can view rag_chunks'
  ) THEN
    CREATE POLICY "Authenticated users can view rag_chunks" ON public.rag_chunks FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rag_embeddings' AND policyname = 'Authenticated users can view rag_embeddings'
  ) THEN
    CREATE POLICY "Authenticated users can view rag_embeddings" ON public.rag_embeddings FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- 7) Updated_at trigger on documents
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rag_documents_updated_at ON public.rag_documents;
CREATE TRIGGER trg_rag_documents_updated_at
BEFORE UPDATE ON public.rag_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Done
SELECT 'RAG embeddings schema ready' AS message;


