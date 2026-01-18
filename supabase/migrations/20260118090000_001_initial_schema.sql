-- CIE Copilot 数据库初始化脚本
-- 在Supabase SQL编辑器中运行此脚本来创建所需的表结构

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 创建用户资料表（扩展auth.users）
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT,
    avatar_url TEXT,
    school TEXT,
    grade_level TEXT,
    subjects TEXT[], -- 用户选择的学科
    preferences JSONB DEFAULT '{}', -- 用户偏好设置
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建学科内容表
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL, -- 如 "9709", "9231", "9702"
    name TEXT NOT NULL, -- 如 "Mathematics", "Further Mathematics", "Physics"
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建试卷表
CREATE TABLE IF NOT EXISTS public.papers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- 如 "paper1", "paper3", "FP1"
    name TEXT NOT NULL, -- 如 "Pure Mathematics 1"
    description TEXT,
    difficulty_level INTEGER DEFAULT 1, -- 1-5难度等级
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, code)
);

-- 创建主题表
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    paper_id UUID REFERENCES public.papers(id) ON DELETE CASCADE,
    topic_id TEXT NOT NULL, -- 原始的topic ID
    title TEXT NOT NULL,
    content JSONB, -- 存储主题内容（从JSON文件迁移）
    difficulty_level INTEGER DEFAULT 1,
    estimated_time INTEGER, -- 预计学习时间（分钟）
    prerequisites TEXT[], -- 前置知识点
    tags TEXT[], -- 标签
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(paper_id, topic_id)
);

-- 创建学习记录表
CREATE TABLE IF NOT EXISTS public.study_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    progress DECIMAL(5,2) DEFAULT 0.00, -- 学习进度 0-100
    time_spent INTEGER DEFAULT 0, -- 学习时间（分钟）
    last_studied TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mastery_level INTEGER DEFAULT 1, -- 掌握程度 1-5
    notes TEXT, -- 用户笔记
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

-- 创建错题本表
CREATE TABLE IF NOT EXISTS public.error_book (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    correct_answer TEXT,
    user_answer TEXT,
    explanation TEXT,
    difficulty_level INTEGER DEFAULT 1,
    error_type TEXT, -- 错误类型：概念、计算、粗心等
    is_resolved BOOLEAN DEFAULT FALSE, -- 是否已解决
    review_count INTEGER DEFAULT 0, -- 复习次数
    last_reviewed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建聊天历史表
CREATE TABLE IF NOT EXISTS public.chat_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    message_type TEXT DEFAULT 'text', -- text, image, file
    context JSONB, -- 聊天上下文信息
    rating INTEGER, -- 用户对回答的评分 1-5
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建学习目标表
CREATE TABLE IF NOT EXISTS public.learning_goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    progress DECIMAL(5,2) DEFAULT 0.00,
    is_completed BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 1, -- 优先级 1-5
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建学习统计表
CREATE TABLE IF NOT EXISTS public.study_statistics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_time INTEGER DEFAULT 0, -- 当日学习时间（分钟）
    topics_studied INTEGER DEFAULT 0, -- 当日学习主题数
    questions_answered INTEGER DEFAULT 0, -- 当日回答问题数
    correct_answers INTEGER DEFAULT 0, -- 当日正确答案数
    chat_messages INTEGER DEFAULT 0, -- 当日AI对话次数
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间触发器
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON public.topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_study_records_updated_at BEFORE UPDATE ON public.study_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_error_book_updated_at BEFORE UPDATE ON public.error_book FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_goals_updated_at BEFORE UPDATE ON public.learning_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建行级安全策略（RLS）
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_statistics ENABLE ROW LEVEL SECURITY;

-- 用户资料策略
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 学习记录策略
CREATE POLICY "Users can view own study records" ON public.study_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own study records" ON public.study_records FOR ALL USING (auth.uid() = user_id);

-- 错题本策略
CREATE POLICY "Users can view own error book" ON public.error_book FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own error book" ON public.error_book FOR ALL USING (auth.uid() = user_id);

-- 聊天历史策略
CREATE POLICY "Users can view own chat history" ON public.chat_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own chat history" ON public.chat_history FOR ALL USING (auth.uid() = user_id);

-- 学习目标策略
CREATE POLICY "Users can view own learning goals" ON public.learning_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own learning goals" ON public.learning_goals FOR ALL USING (auth.uid() = user_id);

-- 学习统计策略
CREATE POLICY "Users can view own statistics" ON public.study_statistics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own statistics" ON public.study_statistics FOR ALL USING (auth.uid() = user_id);

-- 公共表（学科、试卷、主题）的策略 - 所有认证用户可读
CREATE POLICY "Authenticated users can view subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view papers" ON public.papers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view topics" ON public.topics FOR SELECT TO authenticated USING (true);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_study_records_user_id ON public.study_records(user_id);
CREATE INDEX IF NOT EXISTS idx_study_records_topic_id ON public.study_records(topic_id);
CREATE INDEX IF NOT EXISTS idx_study_records_last_studied ON public.study_records(last_studied);
CREATE INDEX IF NOT EXISTS idx_error_book_user_id ON public.error_book(user_id);
CREATE INDEX IF NOT EXISTS idx_error_book_topic_id ON public.error_book(topic_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON public.chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON public.chat_history(created_at);
CREATE INDEX IF NOT EXISTS idx_topics_paper_id ON public.topics(paper_id);
CREATE INDEX IF NOT EXISTS idx_papers_subject_id ON public.papers(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_statistics_user_date ON public.study_statistics(user_id, date);

-- 插入初始数据
INSERT INTO public.subjects (code, name, description) VALUES
('9709', 'Mathematics', 'Cambridge International AS and A Level Mathematics'),
('9231', 'Further Mathematics', 'Cambridge International AS and A Level Further Mathematics'),
('9702', 'Physics', 'Cambridge International AS and A Level Physics')
ON CONFLICT (code) DO NOTHING;

-- 为数学科目插入试卷
INSERT INTO public.papers (subject_id, code, name, description) 
SELECT s.id, 'paper1', 'Pure Mathematics 1', 'Pure Mathematics Paper 1'
FROM public.subjects s WHERE s.code = '9709'
ON CONFLICT (subject_id, code) DO NOTHING;

INSERT INTO public.papers (subject_id, code, name, description) 
SELECT s.id, 'paper3', 'Pure Mathematics 3', 'Pure Mathematics Paper 3'
FROM public.subjects s WHERE s.code = '9709'
ON CONFLICT (subject_id, code) DO NOTHING;

INSERT INTO public.papers (subject_id, code, name, description) 
SELECT s.id, 'paper4', 'Mechanics', 'Mechanics Paper 4'
FROM public.subjects s WHERE s.code = '9709'
ON CONFLICT (subject_id, code) DO NOTHING;

INSERT INTO public.papers (subject_id, code, name, description) 
SELECT s.id, 'paper5', 'Probability & Statistics', 'Probability & Statistics Paper 5'
FROM public.subjects s WHERE s.code = '9709'
ON CONFLICT (subject_id, code) DO NOTHING;

-- 为进阶数学科目插入试卷
INSERT INTO public.papers (subject_id, code, name, description) 
SELECT s.id, 'FP1', 'Further Pure 1', 'Further Pure Mathematics 1'
FROM public.subjects s WHERE s.code = '9231'
ON CONFLICT (subject_id, code) DO NOTHING;

INSERT INTO public.papers (subject_id, code, name, description) 
SELECT s.id, 'FP2', 'Further Pure 2', 'Further Pure Mathematics 2'
FROM public.subjects s WHERE s.code = '9231'
ON CONFLICT (subject_id, code) DO NOTHING;

INSERT INTO public.papers (subject_id, code, name, description) 
SELECT s.id, 'FS', 'Further Statistics', 'Further Statistics'
FROM public.subjects s WHERE s.code = '9231'
ON CONFLICT (subject_id, code) DO NOTHING;

INSERT INTO public.papers (subject_id, code, name, description) 
SELECT s.id, 'FM', 'Further Mechanics', 'Further Mechanics'
FROM public.subjects s WHERE s.code = '9231'
ON CONFLICT (subject_id, code) DO NOTHING;

-- 为物理科目插入试卷
INSERT INTO public.papers (subject_id, code, name, description) 
SELECT s.id, 'AS', 'AS Level Physics', 'AS Level Physics'
FROM public.subjects s WHERE s.code = '9702'
ON CONFLICT (subject_id, code) DO NOTHING;

INSERT INTO public.papers (subject_id, code, name, description) 
SELECT s.id, 'A2', 'A2 Level Physics', 'A2 Level Physics'
FROM public.subjects s WHERE s.code = '9702'
ON CONFLICT (subject_id, code) DO NOTHING;

-- 创建用户注册时自动创建profile的函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器，在用户注册时自动创建profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 完成提示
SELECT 'Database schema created successfully!' as message;