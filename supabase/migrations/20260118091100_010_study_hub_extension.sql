-- Study Hub 学习中心（统一版 010）
-- 说明：本迁移统一了先前的多个 010 变体，确保幂等，并与 001-009 和 011 兼容。
-- 关键兼容性：本文件不创建 public.learning_analytics 表，该表由 011 负责创建，避免冲突。

-- 确保通用更新时间触发器函数存在
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 扩展现有的 topics 表：添加 Study Hub 相关字段（若不存在）
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS learning_objectives JSONB;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS exam_patterns JSONB;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS study_resources JSONB;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS assessment_criteria JSONB;

-- 扩展用户档案
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS learning_preferences JSONB DEFAULT '{}';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS learning_goals JSONB DEFAULT '{}';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS study_schedule JSONB DEFAULT '{}';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}';

-- 扩展学习记录
ALTER TABLE public.study_records ADD COLUMN IF NOT EXISTS time_tracking JSONB DEFAULT '{}';
ALTER TABLE public.study_records ADD COLUMN IF NOT EXISTS accuracy_tracking JSONB DEFAULT '{}';
ALTER TABLE public.study_records ADD COLUMN IF NOT EXISTS learning_path_data JSONB DEFAULT '{}';
ALTER TABLE public.study_records ADD COLUMN IF NOT EXISTS ai_recommendations JSONB DEFAULT '{}';

-- 增强主题表
CREATE TABLE IF NOT EXISTS public.enhanced_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    subject_code TEXT NOT NULL,
    topic_code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    learning_objectives JSONB,
    prerequisite_topics UUID[],
    difficulty_level INTEGER DEFAULT 1,
    estimated_study_time INTEGER,
    exam_weight DECIMAL(5,2),
    exam_patterns JSONB,
    study_resources JSONB,
    assessment_criteria JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_code, topic_code)
);

-- AI 辅导会话表（topic 关联 enhanced_topics）
CREATE TABLE IF NOT EXISTS public.ai_tutoring_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.enhanced_topics(id) ON DELETE SET NULL,
    session_type TEXT DEFAULT 'general',
    subject_code TEXT,
    conversation_history JSONB DEFAULT '[]',
    session_summary TEXT,
    topic_specific_context JSONB,
    difficulty_level TEXT,
    question_type TEXT,
    knowledge_gaps_identified JSONB,
    study_mode_enabled BOOLEAN DEFAULT FALSE,
    reflection_quality_score FLOAT,
    guided_questions JSONB,
    learning_outcomes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 兼容旧表：确保可能已存在的表补齐所需列
ALTER TABLE IF EXISTS public.ai_tutoring_sessions         ADD COLUMN IF NOT EXISTS subject_code TEXT;
ALTER TABLE IF EXISTS public.personalized_recommendations ADD COLUMN IF NOT EXISTS subject_code TEXT;
ALTER TABLE IF EXISTS public.personalized_recommendations ADD COLUMN IF NOT EXISTS priority_score DECIMAL(3,2);
ALTER TABLE IF EXISTS public.qa_community_posts           ADD COLUMN IF NOT EXISTS subject_code TEXT;
ALTER TABLE IF EXISTS public.study_groups                 ADD COLUMN IF NOT EXISTS subject_code TEXT;
-- 011 中创建的表（若已存在则补齐列；若尚未创建则跳过）
ALTER TABLE IF EXISTS public.learning_analytics           ADD COLUMN IF NOT EXISTS subject_code TEXT;

-- 学习路径：不新建表，按需补充列（002 已创建并含 RLS 策略）
ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS subject_code TEXT;
ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS path_name TEXT;
ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS topics_sequence JSONB;
ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS adaptive_rules JSONB;
ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS progress_tracking JSONB;
ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS estimated_completion_time INTEGER;
ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS difficulty_progression TEXT;
ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 个性化推荐
CREATE TABLE IF NOT EXISTS public.personalized_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendation_type TEXT NOT NULL,
    content_id UUID,
    subject_code TEXT,
    title TEXT NOT NULL,
    description TEXT,
    reasoning TEXT,
    priority_score DECIMAL(3,2),
    metadata JSONB DEFAULT '{}',
    is_viewed BOOLEAN DEFAULT false,
    is_accepted BOOLEAN DEFAULT false,
    feedback_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Topic 专项提示词
CREATE TABLE IF NOT EXISTS public.topic_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES public.enhanced_topics(id) ON DELETE CASCADE,
    prompt_type TEXT NOT NULL,
    prompt_content TEXT NOT NULL,
    exam_patterns JSONB,
    difficulty_levels JSONB,
    subject_specific_context JSONB,
    effectiveness_score DECIMAL(3,2),
    usage_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study Mode 题库
CREATE TABLE IF NOT EXISTS public.study_mode_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES public.enhanced_topics(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL,
    difficulty_level TEXT DEFAULT 'medium',
    learning_objective TEXT,
    expected_reflection_points JSONB,
    follow_up_questions JSONB,
    guidance_hints JSONB,
    assessment_criteria JSONB,
    effectiveness_rating DECIMAL(3,2),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 学习小组
CREATE TABLE IF NOT EXISTS public.study_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    subject_code TEXT,
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    max_members INTEGER DEFAULT 10,
    current_members INTEGER DEFAULT 1,
    is_public BOOLEAN DEFAULT TRUE,
    group_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(group_id, user_id)
);

-- 问答社区
CREATE TABLE IF NOT EXISTS public.qa_community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.enhanced_topics(id) ON DELETE SET NULL,
    subject_code TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    post_type TEXT DEFAULT 'question',
    difficulty_level TEXT,
    tags TEXT[],
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    answer_count INTEGER DEFAULT 0,
    is_resolved BOOLEAN DEFAULT FALSE,
    best_answer_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.qa_community_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.qa_community_posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    is_best_answer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 触发器
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_enhanced_topics_updated_at') THEN
        CREATE TRIGGER update_enhanced_topics_updated_at
            BEFORE UPDATE ON public.enhanced_topics
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ai_tutoring_sessions_updated_at') THEN
        CREATE TRIGGER update_ai_tutoring_sessions_updated_at
            BEFORE UPDATE ON public.ai_tutoring_sessions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_learning_paths_updated_at') THEN
        CREATE TRIGGER update_learning_paths_updated_at
            BEFORE UPDATE ON public.learning_paths
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_study_mode_questions_updated_at') THEN
        CREATE TRIGGER update_study_mode_questions_updated_at
            BEFORE UPDATE ON public.study_mode_questions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_study_groups_updated_at') THEN
        CREATE TRIGGER update_study_groups_updated_at
            BEFORE UPDATE ON public.study_groups
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_qa_community_posts_updated_at') THEN
        CREATE TRIGGER update_qa_community_posts_updated_at
            BEFORE UPDATE ON public.qa_community_posts
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_qa_community_answers_updated_at') THEN
        CREATE TRIGGER update_qa_community_answers_updated_at
            BEFORE UPDATE ON public.qa_community_answers
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 启用 RLS（仅对本迁移创建的新表；learning_paths 已在 002 启用）
ALTER TABLE public.enhanced_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalized_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_mode_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_community_answers ENABLE ROW LEVEL SECURITY;

-- RLS 策略（使用条件块避免重复创建）
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'enhanced_topics' AND policyname = 'Authenticated users can view enhanced topics'
    ) THEN
        CREATE POLICY "Authenticated users can view enhanced topics"
            ON public.enhanced_topics FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_tutoring_sessions' AND policyname = 'Users can view own tutoring sessions'
    ) THEN
        CREATE POLICY "Users can view own tutoring sessions"
            ON public.ai_tutoring_sessions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_tutoring_sessions' AND policyname = 'Users can manage own tutoring sessions'
    ) THEN
        CREATE POLICY "Users can manage own tutoring sessions"
            ON public.ai_tutoring_sessions FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- learning_paths 的 RLS 策略已由 002 定义，这里不重复创建

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'personalized_recommendations' AND policyname = 'Users can view own recommendations'
    ) THEN
        CREATE POLICY "Users can view own recommendations"
            ON public.personalized_recommendations FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'personalized_recommendations' AND policyname = 'Users can manage own recommendations'
    ) THEN
        CREATE POLICY "Users can manage own recommendations"
            ON public.personalized_recommendations FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'topic_prompts' AND policyname = 'Authenticated users can view topic prompts'
    ) THEN
        CREATE POLICY "Authenticated users can view topic prompts"
            ON public.topic_prompts FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'study_mode_questions' AND policyname = 'Authenticated users can view study mode questions'
    ) THEN
        CREATE POLICY "Authenticated users can view study mode questions"
            ON public.study_mode_questions FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'study_groups' AND policyname = 'Users can view public study groups'
    ) THEN
        CREATE POLICY "Users can view public study groups"
            ON public.study_groups FOR SELECT USING (is_public = true OR creator_id = auth.uid());
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'study_groups' AND policyname = 'Users can create study groups'
    ) THEN
        CREATE POLICY "Users can create study groups"
            ON public.study_groups FOR INSERT WITH CHECK (auth.uid() = creator_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'study_groups' AND policyname = 'Group creators can update their groups'
    ) THEN
        CREATE POLICY "Group creators can update their groups"
            ON public.study_groups FOR UPDATE USING (auth.uid() = creator_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'study_groups' AND policyname = 'Group creators can delete their groups'
    ) THEN
        CREATE POLICY "Group creators can delete their groups"
            ON public.study_groups FOR DELETE USING (auth.uid() = creator_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'study_group_members' AND policyname = 'Users can view group members if they are members'
    ) THEN
        CREATE POLICY "Users can view group members if they are members"
            ON public.study_group_members FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.study_group_members sgm
                    WHERE sgm.group_id = study_group_members.group_id
                      AND sgm.user_id = auth.uid()
                      AND sgm.is_active = true
                )
            );
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'study_group_members' AND policyname = 'Users can join groups'
    ) THEN
        CREATE POLICY "Users can join groups"
            ON public.study_group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'study_group_members' AND policyname = 'Users can leave groups'
    ) THEN
        CREATE POLICY "Users can leave groups"
            ON public.study_group_members FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'qa_community_posts' AND policyname = 'Authenticated users can view community posts'
    ) THEN
        CREATE POLICY "Authenticated users can view community posts"
            ON public.qa_community_posts FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'qa_community_posts' AND policyname = 'Authenticated users can create posts'
    ) THEN
        CREATE POLICY "Authenticated users can create posts"
            ON public.qa_community_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'qa_community_posts' AND policyname = 'Authors can update their posts'
    ) THEN
        CREATE POLICY "Authors can update their posts"
            ON public.qa_community_posts FOR UPDATE USING (auth.uid() = author_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'qa_community_posts' AND policyname = 'Authors can delete their posts'
    ) THEN
        CREATE POLICY "Authors can delete their posts"
            ON public.qa_community_posts FOR DELETE USING (auth.uid() = author_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'qa_community_answers' AND policyname = 'Authenticated users can view community answers'
    ) THEN
        CREATE POLICY "Authenticated users can view community answers"
            ON public.qa_community_answers FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'qa_community_answers' AND policyname = 'Authenticated users can create answers'
    ) THEN
        CREATE POLICY "Authenticated users can create answers"
            ON public.qa_community_answers FOR INSERT WITH CHECK (auth.uid() = author_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'qa_community_answers' AND policyname = 'Authors can update their answers'
    ) THEN
        CREATE POLICY "Authors can update their answers"
            ON public.qa_community_answers FOR UPDATE USING (auth.uid() = author_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'qa_community_answers' AND policyname = 'Authors can delete their answers'
    ) THEN
        CREATE POLICY "Authors can delete their answers"
            ON public.qa_community_answers FOR DELETE USING (auth.uid() = author_id);
    END IF;
END $$;

-- 索引（确保相关列存在，已通过上方建表/补列语句保证）
CREATE INDEX IF NOT EXISTS idx_enhanced_topics_subject_code ON public.enhanced_topics(subject_code);
CREATE INDEX IF NOT EXISTS idx_enhanced_topics_topic_code ON public.enhanced_topics(topic_code);
CREATE INDEX IF NOT EXISTS idx_enhanced_topics_difficulty ON public.enhanced_topics(difficulty_level);

CREATE INDEX IF NOT EXISTS idx_ai_tutoring_sessions_user_id ON public.ai_tutoring_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutoring_sessions_topic_id ON public.ai_tutoring_sessions(topic_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutoring_sessions_subject_code ON public.ai_tutoring_sessions(subject_code);
CREATE INDEX IF NOT EXISTS idx_ai_tutoring_sessions_created_at ON public.ai_tutoring_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_learning_paths_user_id ON public.learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_subject_code ON public.learning_paths(subject_code);
CREATE INDEX IF NOT EXISTS idx_learning_paths_active ON public.learning_paths(is_active);

CREATE INDEX IF NOT EXISTS idx_personalized_recommendations_user_id ON public.personalized_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_personalized_recommendations_type ON public.personalized_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_personalized_recommendations_subject_code ON public.personalized_recommendations(subject_code);
CREATE INDEX IF NOT EXISTS idx_personalized_recommendations_priority ON public.personalized_recommendations(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_personalized_recommendations_created_at ON public.personalized_recommendations(created_at);

CREATE INDEX IF NOT EXISTS idx_topic_prompts_topic_id ON public.topic_prompts(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_prompts_type ON public.topic_prompts(prompt_type);

CREATE INDEX IF NOT EXISTS idx_study_mode_questions_topic_id ON public.study_mode_questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_study_mode_questions_type ON public.study_mode_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_study_mode_questions_difficulty ON public.study_mode_questions(difficulty_level);

CREATE INDEX IF NOT EXISTS idx_study_groups_creator_id ON public.study_groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_study_groups_subject_code ON public.study_groups(subject_code);
CREATE INDEX IF NOT EXISTS idx_study_groups_public ON public.study_groups(is_public);

CREATE INDEX IF NOT EXISTS idx_study_group_members_group_id ON public.study_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_study_group_members_user_id ON public.study_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_study_group_members_active ON public.study_group_members(is_active);

CREATE INDEX IF NOT EXISTS idx_qa_community_posts_author_id ON public.qa_community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_qa_community_posts_topic_id ON public.qa_community_posts(topic_id);
CREATE INDEX IF NOT EXISTS idx_qa_community_posts_subject ON public.qa_community_posts(subject_code);
CREATE INDEX IF NOT EXISTS idx_qa_community_posts_created_at ON public.qa_community_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_qa_community_posts_resolved ON public.qa_community_posts(is_resolved);

CREATE INDEX IF NOT EXISTS idx_qa_community_answers_post_id ON public.qa_community_answers(post_id);
CREATE INDEX IF NOT EXISTS idx_qa_community_answers_author_id ON public.qa_community_answers(author_id);
-- Prefer the canonical column name
CREATE INDEX IF NOT EXISTS idx_qa_community_answers_best ON public.qa_community_answers(is_best_answer);
-- Backward compatibility: only create legacy index if the legacy column exists
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'qa_community_answers' AND column_name = 'is_accepted'
    ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_qa_community_answers_accepted ON public.qa_community_answers(is_accepted)';
    END IF;
END $$;

-- 视图
CREATE OR REPLACE VIEW public.user_study_overview AS
SELECT 
    up.id as user_id,
    up.name,
    up.subjects,
    COUNT(DISTINCT sr.topic_id) as topics_studied,
    AVG(sr.progress) as avg_progress,
    SUM(sr.time_spent) as total_time_spent,
    COUNT(DISTINCT ats.id) as ai_sessions_count,
    COUNT(DISTINCT lp.id) as learning_paths_count
FROM public.user_profiles up
LEFT JOIN public.study_records sr ON up.id = sr.user_id
LEFT JOIN public.ai_tutoring_sessions ats ON up.id = ats.user_id
LEFT JOIN public.learning_paths lp ON up.id = lp.user_id
GROUP BY up.id, up.name, up.subjects;

CREATE OR REPLACE VIEW public.topic_analytics AS
SELECT 
    et.id,
    et.subject_code,
    et.topic_code,
    et.title,
    et.difficulty_level,
    COUNT(DISTINCT sr.user_id) as students_count,
    AVG(sr.progress) as avg_progress,
    AVG(sr.time_spent) as avg_time_spent,
    COUNT(DISTINCT ats.id) as ai_sessions_count,
    COUNT(DISTINCT smq.id) as study_mode_questions_count
FROM public.enhanced_topics et
LEFT JOIN public.study_records sr ON et.original_topic_id = sr.topic_id
LEFT JOIN public.ai_tutoring_sessions ats ON et.id = ats.topic_id
LEFT JOIN public.study_mode_questions smq ON et.id = smq.topic_id
GROUP BY et.id, et.subject_code, et.topic_code, et.title, et.difficulty_level;

-- 完成
SELECT 'Unified Study Hub migration (010) completed successfully!' as message;

