-- CIE Copilot 知识图谱扩展表
-- 创建知识关系表，用于建立知识点之间的关联关系

-- 创建知识点关系表
CREATE TABLE IF NOT EXISTS public.knowledge_relationships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    parent_topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    child_topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL, -- 'prerequisite', 'related', 'similar', 'contains'
    strength DECIMAL(3,2) DEFAULT 1.00, -- 关系强度 0-1
    description TEXT, -- 关系描述
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parent_topic_id, child_topic_id, relationship_type)
);

-- 创建知识点标签表
CREATE TABLE IF NOT EXISTS public.knowledge_tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    category TEXT, -- 'concept', 'formula', 'theorem', 'method', 'skill'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建主题-标签关联表
CREATE TABLE IF NOT EXISTS public.topic_tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.knowledge_tags(id) ON DELETE CASCADE,
    relevance_score DECIMAL(3,2) DEFAULT 1.00, -- 相关性评分
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(topic_id, tag_id)
);

-- 创建真题索引表
CREATE TABLE IF NOT EXISTS public.past_papers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    paper_code TEXT NOT NULL, -- 如 '9709_s21_qp_11'
    year INTEGER NOT NULL,
    session TEXT NOT NULL, -- 'march', 'may_june', 'october_november'
    paper_number TEXT NOT NULL, -- '11', '12', '13', '31', '32', '33', '41', '42', '43', '51', '52', '53'
    file_path TEXT, -- PDF文件路径
    file_size INTEGER, -- 文件大小（字节）
    file_hash TEXT, -- 文件哈希值，用于去重
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, paper_code)
);

-- 创建真题题目表
CREATE TABLE IF NOT EXISTS public.paper_questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    paper_id UUID REFERENCES public.past_papers(id) ON DELETE CASCADE,
    question_number TEXT NOT NULL, -- 题号，如 '1', '2(a)', '3(i)'
    total_marks INTEGER, -- 总分
    question_type TEXT, -- 'multiple_choice', 'structured', 'essay', 'problem_solving'
    difficulty_level INTEGER DEFAULT 1, -- 1-5难度等级
    content TEXT, -- 题目内容（文本提取）
    image_paths TEXT[], -- 题目图片路径（数组）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(paper_id, question_number)
);

-- 创建题目-知识点关联表
CREATE TABLE IF NOT EXISTS public.question_knowledge_points (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    question_id UUID REFERENCES public.paper_questions(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    relevance_score DECIMAL(3,2) DEFAULT 1.00, -- 相关性评分
    marks_contribution DECIMAL(5,2), -- 该知识点在题目中的分值占比
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(question_id, topic_id)
);

-- 创建答题记录表
CREATE TABLE IF NOT EXISTS public.question_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.paper_questions(id) ON DELETE CASCADE,
    user_answer TEXT,
    correct_answer TEXT,
    is_correct BOOLEAN,
    time_spent INTEGER, -- 答题时间（秒）
    marks_obtained DECIMAL(5,2), -- 获得分数
    total_marks DECIMAL(5,2), -- 总分
    attempt_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT, -- 用户笔记
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建知识图谱推荐表
CREATE TABLE IF NOT EXISTS public.knowledge_recommendations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    recommendation_type TEXT NOT NULL, -- 'next_topic', 'review', 'challenge', 'remedial'
    priority_score DECIMAL(3,2) DEFAULT 1.00, -- 推荐优先级
    reason TEXT, -- 推荐理由
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

-- 创建学习路径表
CREATE TABLE IF NOT EXISTS public.learning_paths (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    target_score DECIMAL(5,2), -- 目标分数
    current_score DECIMAL(5,2) DEFAULT 0.00, -- 当前分数
    estimated_duration INTEGER, -- 预计学习时间（小时）
    actual_duration INTEGER DEFAULT 0, -- 实际学习时间
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建学习路径步骤表
CREATE TABLE IF NOT EXISTS public.learning_path_steps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    path_id UUID REFERENCES public.learning_paths(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    estimated_time INTEGER, -- 预计学习时间（分钟）
    actual_time INTEGER DEFAULT 0, -- 实际学习时间
    is_completed BOOLEAN DEFAULT FALSE,
    completion_date TIMESTAMP WITH TIME ZONE,
    mastery_score DECIMAL(3,2) DEFAULT 0.00, -- 掌握程度评分
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(path_id, step_order)
);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_parent ON public.knowledge_relationships(parent_topic_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_child ON public.knowledge_relationships(child_topic_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_type ON public.knowledge_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_topic_tags_topic ON public.topic_tags(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_tags_tag ON public.topic_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_past_papers_subject ON public.past_papers(subject_id);
CREATE INDEX IF NOT EXISTS idx_past_papers_code ON public.past_papers(paper_code);
CREATE INDEX IF NOT EXISTS idx_paper_questions_paper ON public.paper_questions(paper_id);
CREATE INDEX IF NOT EXISTS idx_question_knowledge_question ON public.question_knowledge_points(question_id);
CREATE INDEX IF NOT EXISTS idx_question_knowledge_topic ON public.question_knowledge_points(topic_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_user ON public.question_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_question ON public.question_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_recommendations_user ON public.knowledge_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_user ON public.learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_path_steps_path ON public.learning_path_steps(path_id);

-- 添加行级安全策略（RLS）
ALTER TABLE public.knowledge_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.past_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_knowledge_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_steps ENABLE ROW LEVEL SECURITY;

-- 知识关系策略
CREATE POLICY "Authenticated users can view knowledge relationships" ON public.knowledge_relationships FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage knowledge relationships" ON public.knowledge_relationships FOR ALL TO authenticated USING (true);

-- 知识点标签策略
CREATE POLICY "Authenticated users can view knowledge tags" ON public.knowledge_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage knowledge tags" ON public.knowledge_tags FOR ALL TO authenticated USING (true);

-- 主题-标签关联策略
CREATE POLICY "Authenticated users can view topic tags" ON public.topic_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage topic tags" ON public.topic_tags FOR ALL TO authenticated USING (true);

-- 真题策略
CREATE POLICY "Authenticated users can view past papers" ON public.past_papers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view paper questions" ON public.paper_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view question knowledge points" ON public.question_knowledge_points FOR SELECT TO authenticated USING (true);

-- 答题记录策略
CREATE POLICY "Users can view own attempts" ON public.question_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own attempts" ON public.question_attempts FOR ALL USING (auth.uid() = user_id);

-- 推荐策略
CREATE POLICY "Users can view own recommendations" ON public.knowledge_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own recommendations" ON public.knowledge_recommendations FOR ALL USING (auth.uid() = user_id);

-- 学习路径策略
CREATE POLICY "Users can view own learning paths" ON public.learning_paths FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own learning paths" ON public.learning_paths FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own learning path steps" ON public.learning_path_steps FOR SELECT USING (true);
CREATE POLICY "Users can manage own learning path steps" ON public.learning_path_steps FOR ALL USING (auth.uid() = (SELECT user_id FROM public.learning_paths WHERE id = path_id));

-- 插入初始知识标签
INSERT INTO public.knowledge_tags (name, category, description) VALUES
('algebra', 'concept', 'Algebra concepts and techniques'),
('calculus', 'concept', 'Calculus concepts including differentiation and integration'),
('geometry', 'concept', 'Geometric concepts and theorems'),
('trigonometry', 'concept', 'Trigonometric functions and identities'),
('statistics', 'concept', 'Statistical concepts and methods'),
('mechanics', 'concept', 'Mechanics concepts in physics'),
('pure_mathematics', 'category', 'Pure mathematics topics'),
('applied_mathematics', 'category', 'Applied mathematics topics'),
('formula', 'formula', 'Mathematical formulas'),
('theorem', 'theorem', 'Mathematical theorems'),
('method', 'method', 'Problem solving methods'),
('skill', 'skill', 'Mathematical skills and techniques');