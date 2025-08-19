-- Enhanced Recommendation System Database Migration
-- This migration creates tables for the personalized recommendation system

-- Create user_learning_data table for tracking detailed learning behavior
CREATE TABLE IF NOT EXISTS user_learning_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_code TEXT NOT NULL,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    paper_id UUID REFERENCES papers(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL, -- 'view', 'download', 'bookmark', 'search', 'quiz', 'study_session'
    activity_data JSONB DEFAULT '{}', -- stores activity-specific data
    engagement_score DECIMAL(3,2) DEFAULT 0.0, -- 0.0 to 1.0
    time_spent INTEGER DEFAULT 0, -- in seconds
    completion_rate DECIMAL(3,2) DEFAULT 0.0, -- 0.0 to 1.0
    difficulty_rating INTEGER, -- 1-5 scale
    user_rating INTEGER, -- 1-5 scale
    session_id TEXT,
    device_type TEXT, -- 'desktop', 'mobile', 'tablet'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recommendations table for storing generated recommendations
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_code TEXT NOT NULL,
    recommendation_type TEXT NOT NULL, -- 'content', 'topic', 'learning_path', 'study_group'
    target_type TEXT NOT NULL, -- 'paper', 'topic', 'path', 'question'
    target_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    confidence_score DECIMAL(3,2) NOT NULL, -- 0.0 to 1.0
    relevance_score DECIMAL(3,2) NOT NULL, -- 0.0 to 1.0
    priority_score DECIMAL(3,2) NOT NULL, -- 0.0 to 1.0
    algorithm_version TEXT DEFAULT 'v1.0',
    reasoning JSONB DEFAULT '{}', -- explanation of why this was recommended
    metadata JSONB DEFAULT '{}',
    is_clicked BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    click_count INTEGER DEFAULT 0,
    impression_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_learning_profiles table for comprehensive learning profiles
CREATE TABLE IF NOT EXISTS user_learning_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_code TEXT,
    learning_style JSONB DEFAULT '{}', -- visual, auditory, kinesthetic preferences
    knowledge_level JSONB DEFAULT '{}', -- topic-wise knowledge levels
    learning_pace TEXT DEFAULT 'medium', -- 'slow', 'medium', 'fast'
    preferred_difficulty INTEGER DEFAULT 3, -- 1-5 scale
    study_time_patterns JSONB DEFAULT '{}', -- when user typically studies
    content_preferences JSONB DEFAULT '{}', -- preferred content types
    goal_preferences JSONB DEFAULT '{}', -- learning goals and objectives
    weakness_areas TEXT[] DEFAULT '{}',
    strength_areas TEXT[] DEFAULT '{}',
    last_activity_date DATE DEFAULT CURRENT_DATE,
    total_study_time INTEGER DEFAULT 0, -- in minutes
    avg_session_duration INTEGER DEFAULT 0, -- in minutes
    consistency_score DECIMAL(3,2) DEFAULT 0.0, -- 0.0 to 1.0
    engagement_trend TEXT DEFAULT 'stable', -- 'increasing', 'stable', 'decreasing'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, subject_code)
);

-- Create recommendation_feedback table for tracking user feedback
CREATE TABLE IF NOT EXISTS recommendation_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL, -- 'like', 'dislike', 'not_relevant', 'helpful', 'too_easy', 'too_hard'
    rating INTEGER, -- 1-5 scale
    comment TEXT,
    implicit_feedback JSONB DEFAULT '{}', -- time_spent, scroll_depth, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content_similarity table for content-based recommendations
CREATE TABLE IF NOT EXISTS content_similarity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_type TEXT NOT NULL, -- 'paper', 'topic'
    source_id UUID NOT NULL,
    target_type TEXT NOT NULL, -- 'paper', 'topic'
    target_id UUID NOT NULL,
    similarity_score DECIMAL(5,4) NOT NULL, -- 0.0000 to 1.0000
    similarity_type TEXT NOT NULL, -- 'content', 'semantic', 'collaborative', 'hybrid'
    algorithm_used TEXT NOT NULL,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_type, source_id, target_type, target_id, similarity_type)
);

-- Create learning_objectives table for goal-based recommendations
CREATE TABLE IF NOT EXISTS learning_objectives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_code TEXT NOT NULL,
    objective_type TEXT NOT NULL, -- 'exam_prep', 'skill_building', 'research', 'general_knowledge'
    title TEXT NOT NULL,
    description TEXT,
    target_topics TEXT[] DEFAULT '{}',
    difficulty_level INTEGER DEFAULT 3, -- 1-5 scale
    estimated_duration INTEGER, -- in hours
    deadline DATE,
    priority INTEGER DEFAULT 3, -- 1-5 scale
    progress DECIMAL(3,2) DEFAULT 0.0, -- 0.0 to 1.0
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recommendation_cache table for performance optimization
CREATE TABLE IF NOT EXISTS recommendation_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cache_key TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_code TEXT,
    recommendation_data JSONB NOT NULL,
    algorithm_version TEXT NOT NULL,
    cache_metadata JSONB DEFAULT '{}',
    hit_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create algorithm_performance table for A/B testing and optimization
CREATE TABLE IF NOT EXISTS algorithm_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    algorithm_name TEXT NOT NULL,
    algorithm_version TEXT NOT NULL,
    subject_code TEXT,
    metric_name TEXT NOT NULL, -- 'click_rate', 'conversion_rate', 'user_satisfaction'
    metric_value DECIMAL(5,4) NOT NULL,
    sample_size INTEGER NOT NULL,
    test_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    test_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_learning_data_user_id ON user_learning_data(user_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_data_subject_code ON user_learning_data(subject_code);
CREATE INDEX IF NOT EXISTS idx_user_learning_data_activity_type ON user_learning_data(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_learning_data_created_at ON user_learning_data(created_at);
CREATE INDEX IF NOT EXISTS idx_user_learning_data_topic_id ON user_learning_data(topic_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_data_paper_id ON user_learning_data(paper_id);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_subject_code ON recommendations(subject_code);
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendations_target ON recommendations(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_confidence ON recommendations(confidence_score);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_expires_at ON recommendations(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_learning_profiles_user_id ON user_learning_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_profiles_subject_code ON user_learning_profiles(subject_code);
CREATE INDEX IF NOT EXISTS idx_user_learning_profiles_last_activity ON user_learning_profiles(last_activity_date);

CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_recommendation_id ON recommendation_feedback(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user_id ON recommendation_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_type ON recommendation_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_created_at ON recommendation_feedback(created_at);

CREATE INDEX IF NOT EXISTS idx_content_similarity_source ON content_similarity(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_content_similarity_target ON content_similarity(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_content_similarity_score ON content_similarity(similarity_score);
CREATE INDEX IF NOT EXISTS idx_content_similarity_type ON content_similarity(similarity_type);

CREATE INDEX IF NOT EXISTS idx_learning_objectives_user_id ON learning_objectives(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_objectives_subject_code ON learning_objectives(subject_code);
CREATE INDEX IF NOT EXISTS idx_learning_objectives_status ON learning_objectives(status);
CREATE INDEX IF NOT EXISTS idx_learning_objectives_deadline ON learning_objectives(deadline);

CREATE INDEX IF NOT EXISTS idx_recommendation_cache_key ON recommendation_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_user_id ON recommendation_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_expires_at ON recommendation_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_last_accessed ON recommendation_cache(last_accessed);

CREATE INDEX IF NOT EXISTS idx_algorithm_performance_name_version ON algorithm_performance(algorithm_name, algorithm_version);
CREATE INDEX IF NOT EXISTS idx_algorithm_performance_subject_code ON algorithm_performance(subject_code);
CREATE INDEX IF NOT EXISTS idx_algorithm_performance_metric ON algorithm_performance(metric_name);

-- Enable Row Level Security (RLS)
ALTER TABLE user_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_similarity ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE algorithm_performance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- user_learning_data policies
CREATE POLICY "Users can view their own learning data" ON user_learning_data
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning data" ON user_learning_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert learning data" ON user_learning_data
    FOR INSERT WITH CHECK (true);

-- recommendations policies
CREATE POLICY "Users can view their own recommendations" ON recommendations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage recommendations" ON recommendations
    FOR ALL WITH CHECK (true);

-- user_learning_profiles policies
CREATE POLICY "Users can view their own learning profiles" ON user_learning_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning profiles" ON user_learning_profiles
    FOR ALL USING (auth.uid() = user_id);

-- recommendation_feedback policies
CREATE POLICY "Users can manage their own feedback" ON recommendation_feedback
    FOR ALL USING (auth.uid() = user_id);

-- content_similarity policies
CREATE POLICY "Anyone can view content similarity" ON content_similarity
    FOR SELECT USING (true);

CREATE POLICY "System can manage content similarity" ON content_similarity
    FOR ALL WITH CHECK (true);

-- learning_objectives policies
CREATE POLICY "Users can manage their own objectives" ON learning_objectives
    FOR ALL USING (auth.uid() = user_id);

-- recommendation_cache policies
CREATE POLICY "Users can view their own cache" ON recommendation_cache
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "System can manage cache" ON recommendation_cache
    FOR ALL WITH CHECK (true);

-- algorithm_performance policies
CREATE POLICY "System can manage algorithm performance" ON algorithm_performance
    FOR ALL WITH CHECK (true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_user_learning_data_updated_at
    BEFORE UPDATE ON user_learning_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at
    BEFORE UPDATE ON recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_learning_profiles_updated_at
    BEFORE UPDATE ON user_learning_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_objectives_updated_at
    BEFORE UPDATE ON learning_objectives
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create functions for recommendation system

-- Function to update recommendation cache hit count
CREATE OR REPLACE FUNCTION update_cache_hit_count()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hit_count = OLD.hit_count + 1;
    NEW.last_accessed = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for cache hit count updates
CREATE TRIGGER trigger_update_cache_hit_count
    BEFORE UPDATE ON recommendation_cache
    FOR EACH ROW 
    WHEN (OLD.last_accessed < NEW.last_accessed)
    EXECUTE FUNCTION update_cache_hit_count();

-- Function to clean up expired recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM recommendations 
    WHERE expires_at < NOW() 
    AND expires_at IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM recommendation_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update user learning profile based on activity
CREATE OR REPLACE FUNCTION update_learning_profile_from_activity()
RETURNS TRIGGER AS $$
DECLARE
    profile_exists BOOLEAN;
BEGIN
    -- Check if profile exists
    SELECT EXISTS(
        SELECT 1 FROM user_learning_profiles 
        WHERE user_id = NEW.user_id AND subject_code = NEW.subject_code
    ) INTO profile_exists;
    
    -- Insert or update profile
    INSERT INTO user_learning_profiles (
        user_id, 
        subject_code, 
        last_activity_date,
        total_study_time
    )
    VALUES (
        NEW.user_id, 
        NEW.subject_code, 
        CURRENT_DATE,
        COALESCE(NEW.time_spent, 0) / 60 -- convert seconds to minutes
    )
    ON CONFLICT (user_id, subject_code) 
    DO UPDATE SET 
        last_activity_date = CURRENT_DATE,
        total_study_time = user_learning_profiles.total_study_time + (COALESCE(NEW.time_spent, 0) / 60),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for learning profile updates
CREATE TRIGGER trigger_update_learning_profile_from_activity
    AFTER INSERT ON user_learning_data
    FOR EACH ROW EXECUTE FUNCTION update_learning_profile_from_activity();

-- Function to calculate user engagement score
CREATE OR REPLACE FUNCTION calculate_user_engagement_score(p_user_id UUID, p_subject_code TEXT)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    engagement_score DECIMAL(3,2) := 0.0;
    activity_count INTEGER;
    avg_time_spent DECIMAL;
    recent_activity_count INTEGER;
BEGIN
    -- Count total activities in the last 30 days
    SELECT COUNT(*) INTO activity_count
    FROM user_learning_data
    WHERE user_id = p_user_id 
    AND subject_code = p_subject_code
    AND created_at >= NOW() - INTERVAL '30 days';
    
    -- Calculate average time spent per activity
    SELECT AVG(time_spent) INTO avg_time_spent
    FROM user_learning_data
    WHERE user_id = p_user_id 
    AND subject_code = p_subject_code
    AND created_at >= NOW() - INTERVAL '30 days'
    AND time_spent > 0;
    
    -- Count recent activities (last 7 days)
    SELECT COUNT(*) INTO recent_activity_count
    FROM user_learning_data
    WHERE user_id = p_user_id 
    AND subject_code = p_subject_code
    AND created_at >= NOW() - INTERVAL '7 days';
    
    -- Calculate engagement score (0.0 to 1.0)
    engagement_score := LEAST(1.0, 
        (activity_count * 0.3 + 
         COALESCE(avg_time_spent, 0) / 3600 * 0.4 + 
         recent_activity_count * 0.3) / 10
    );
    
    RETURN engagement_score;
END;
$$ LANGUAGE plpgsql;

-- Create view for recommendation analytics
CREATE OR REPLACE VIEW recommendation_analytics AS
SELECT 
    r.algorithm_version,
    r.recommendation_type,
    r.subject_code,
    COUNT(*) as total_recommendations,
    COUNT(CASE WHEN r.is_clicked THEN 1 END) as clicked_recommendations,
    COUNT(CASE WHEN r.is_dismissed THEN 1 END) as dismissed_recommendations,
    ROUND(AVG(r.confidence_score), 3) as avg_confidence_score,
    ROUND(AVG(r.relevance_score), 3) as avg_relevance_score,
    ROUND(AVG(r.priority_score), 3) as avg_priority_score,
    ROUND(
        COUNT(CASE WHEN r.is_clicked THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) as click_through_rate,
    DATE_TRUNC('day', r.created_at) as date_created
FROM recommendations r
GROUP BY 
    r.algorithm_version, 
    r.recommendation_type, 
    r.subject_code, 
    DATE_TRUNC('day', r.created_at)
ORDER BY date_created DESC;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT SELECT ON recommendation_analytics TO authenticated;

COMMIT;