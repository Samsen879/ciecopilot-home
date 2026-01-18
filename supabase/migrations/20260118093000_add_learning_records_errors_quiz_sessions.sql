-- Add missing learning/error tracking tables (P0-04)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- user_learning_records: per-attempt learning history
CREATE TABLE IF NOT EXISTS public.user_learning_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    is_correct BOOLEAN DEFAULT NULL,
    time_spent INTEGER DEFAULT 0,
    difficulty_level TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_learning_records_user_id
  ON public.user_learning_records(user_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_records_topic_id
  ON public.user_learning_records(topic_id);

ALTER TABLE public.user_learning_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own learning records" ON public.user_learning_records
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own learning records" ON public.user_learning_records
  FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_learning_records_updated_at ON public.user_learning_records;
CREATE TRIGGER update_user_learning_records_updated_at
  BEFORE UPDATE ON public.user_learning_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- user_errors: user error book entries (used by ErrorBook UI)
CREATE TABLE IF NOT EXISTS public.user_errors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_code TEXT REFERENCES public.subjects(code) ON DELETE SET NULL,
    paper_id UUID REFERENCES public.papers(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    topic_name TEXT,
    question TEXT NOT NULL,
    correct_answer TEXT,
    user_answer TEXT,
    explanation TEXT,
    error_type TEXT,
    difficulty_level TEXT,
    tags TEXT[],
    status TEXT DEFAULT 'unresolved',
    review_count INTEGER DEFAULT 0,
    is_starred BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_errors_user_id ON public.user_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_errors_subject_code ON public.user_errors(subject_code);
CREATE INDEX IF NOT EXISTS idx_user_errors_paper_id ON public.user_errors(paper_id);

ALTER TABLE public.user_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own errors" ON public.user_errors
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own errors" ON public.user_errors
  FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_errors_updated_at ON public.user_errors;
CREATE TRIGGER update_user_errors_updated_at
  BEFORE UPDATE ON public.user_errors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- quiz_sessions: quiz attempt sessions
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_code TEXT REFERENCES public.subjects(code) ON DELETE SET NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    quiz_id TEXT,
    status TEXT DEFAULT 'in_progress',
    score NUMERIC,
    total_questions INTEGER,
    correct_count INTEGER,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON public.quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_created_at ON public.quiz_sessions(created_at);

ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz sessions" ON public.quiz_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own quiz sessions" ON public.quiz_sessions
  FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_quiz_sessions_updated_at ON public.quiz_sessions;
CREATE TRIGGER update_quiz_sessions_updated_at
  BEFORE UPDATE ON public.quiz_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
