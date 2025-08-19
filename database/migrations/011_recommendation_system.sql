-- Recommendation System Database Migration
-- This migration creates tables for the personalized recommendation system

-- Create recommendation_history table to store generated recommendations
CREATE TABLE IF NOT EXISTS recommendation_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_code TEXT NOT NULL,
    recommendations JSONB NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.0,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    feedback_score INTEGER CHECK (feedback_score >= 1 AND feedback_score <= 5),
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_behavior_logs table to track user interactions
CREATE TABLE IF NOT EXISTS user_behavior_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'view', 'click', 'complete', 'like', 'share', 'search', 'quiz_attempt', 'quiz_complete'
    target_type TEXT NOT NULL, -- 'topic', 'exercise', 'material', 'recommendation'
    target_id TEXT NOT NULL,
    subject_code TEXT,
    metadata JSONB DEFAULT '{}',
    session_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_learning_sessions table to track learning sessions
CREATE TABLE IF NOT EXISTS user_learning_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    subject_code TEXT,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    topics_covered TEXT[],
    exercises_completed INTEGER DEFAULT 0,
    average_score DECIMAL(5,2),
    engagement_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recommendation_feedback table to store user feedback on recommendations
CREATE TABLE IF NOT EXISTS recommendation_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendation_id UUID NOT NULL REFERENCES recommendation_history(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL, -- 'helpful', 'not_helpful', 'irrelevant', 'too_easy', 'too_hard'
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_settings table to store recommendation engine configuration
CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY,
    settings JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create content_recommendations table to store pre-computed recommendations
CREATE TABLE IF NOT EXISTS content_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL, -- 'topic', 'exercise', 'material'
    content_id TEXT NOT NULL,
    subject_code TEXT NOT NULL,
    recommendation_score DECIMAL(5,4) NOT NULL,
    reasoning TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create learning_analytics table to store aggregated learning analytics
CREATE TABLE IF NOT EXISTS learning_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_code TEXT,
    analytics_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    metrics JSONB NOT NULL,
    insights JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, subject_code, analytics_type, period_start)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recommendation_history_user_id ON recommendation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_history_subject ON recommendation_history(subject_code);
CREATE INDEX IF NOT EXISTS idx_recommendation_history_generated_at ON recommendation_history(generated_at);
CREATE INDEX IF NOT EXISTS idx_recommendation_history_expires_at ON recommendation_history(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_user_id ON user_behavior_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_action_type ON user_behavior_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_timestamp ON user_behavior_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_session_id ON user_behavior_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_subject ON user_behavior_logs(subject_code);

CREATE INDEX IF NOT EXISTS idx_user_learning_sessions_user_id ON user_learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_sessions_session_id ON user_learning_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_sessions_start_time ON user_learning_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_user_learning_sessions_subject ON user_learning_sessions(subject_code);

CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user_id ON recommendation_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_recommendation_id ON recommendation_feedback(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_type ON recommendation_feedback(feedback_type);

CREATE INDEX IF NOT EXISTS idx_content_recommendations_user_id ON content_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_content_recommendations_content_type ON content_recommendations(content_type);
CREATE INDEX IF NOT EXISTS idx_content_recommendations_subject ON content_recommendations(subject_code);
CREATE INDEX IF NOT EXISTS idx_content_recommendations_score ON content_recommendations(recommendation_score);
CREATE INDEX IF NOT EXISTS idx_content_recommendations_expires_at ON content_recommendations(expires_at);

CREATE INDEX IF NOT EXISTS idx_learning_analytics_user_id ON learning_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_subject ON learning_analytics(subject_code);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_type ON learning_analytics(analytics_type);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_period ON learning_analytics(period_start, period_end);

-- Enable Row Level Security (RLS)
ALTER TABLE recommendation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- recommendation_history policies
CREATE POLICY "Users can view their own recommendation history" ON recommendation_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recommendation history" ON recommendation_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendation history" ON recommendation_history
    FOR UPDATE USING (auth.uid() = user_id);

-- user_behavior_logs policies
CREATE POLICY "Users can view their own behavior logs" ON user_behavior_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own behavior logs" ON user_behavior_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_learning_sessions policies
CREATE POLICY "Users can view their own learning sessions" ON user_learning_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning sessions" ON user_learning_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning sessions" ON user_learning_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- recommendation_feedback policies
CREATE POLICY "Users can view their own recommendation feedback" ON recommendation_feedback
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recommendation feedback" ON recommendation_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendation feedback" ON recommendation_feedback
    FOR UPDATE USING (auth.uid() = user_id);

-- content_recommendations policies
CREATE POLICY "Users can view their own content recommendations" ON content_recommendations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert content recommendations" ON content_recommendations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update content recommendations" ON content_recommendations
    FOR UPDATE USING (true);

-- learning_analytics policies
CREATE POLICY "Users can view their own learning analytics" ON learning_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert learning analytics" ON learning_analytics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update learning analytics" ON learning_analytics
    FOR UPDATE USING (true);

-- system_settings policies (admin only)
CREATE POLICY "Admin can manage system settings" ON system_settings
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM auth.users WHERE email IN (
            'admin@ciecopilot.com',
            'support@ciecopilot.com'
        )
    ));

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_recommendation_history_updated_at
    BEFORE UPDATE ON recommendation_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_learning_sessions_updated_at
    BEFORE UPDATE ON user_learning_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_analytics_updated_at
    BEFORE UPDATE ON learning_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired recommendation history
    DELETE FROM recommendation_history WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete expired content recommendations
    DELETE FROM content_recommendations WHERE expires_at < NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate user behavior insights
CREATE OR REPLACE FUNCTION generate_user_behavior_insights(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
    insights JSONB;
    total_sessions INTEGER;
    avg_session_duration DECIMAL;
    most_active_subject TEXT;
    engagement_trend DECIMAL;
BEGIN
    -- Calculate basic metrics
    SELECT COUNT(DISTINCT session_id) INTO total_sessions
    FROM user_behavior_logs
    WHERE user_id = p_user_id
    AND timestamp >= NOW() - INTERVAL '1 day' * p_days;
    
    SELECT AVG(duration_seconds) INTO avg_session_duration
    FROM user_learning_sessions
    WHERE user_id = p_user_id
    AND start_time >= NOW() - INTERVAL '1 day' * p_days;
    
    SELECT subject_code INTO most_active_subject
    FROM user_behavior_logs
    WHERE user_id = p_user_id
    AND timestamp >= NOW() - INTERVAL '1 day' * p_days
    AND subject_code IS NOT NULL
    GROUP BY subject_code
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    -- Build insights JSON
    insights := jsonb_build_object(
        'total_sessions', COALESCE(total_sessions, 0),
        'avg_session_duration', COALESCE(avg_session_duration, 0),
        'most_active_subject', COALESCE(most_active_subject, ''),
        'analysis_period_days', p_days,
        'generated_at', NOW()
    );
    
    RETURN insights;
END;
$$ LANGUAGE plpgsql;

-- Insert default system settings
INSERT INTO system_settings (id, settings) VALUES (
    'recommendation_engine',
    '{
        "MODEL_WEIGHTS": {
            "performance": 0.3,
            "engagement": 0.25,
            "difficulty": 0.2,
            "recency": 0.15,
            "similarity": 0.1
        },
        "RECOMMENDATION_PARAMS": {
            "maxRecommendations": 10,
            "diversityFactor": 0.3,
            "confidenceThreshold": 0.5,
            "minInteractions": 5
        },
        "CACHE_CONFIG": {
            "userProfile": { "ttl": 3600, "maxSize": 1000 },
            "recommendations": { "ttl": 1800, "maxSize": 500 },
            "behaviorPatterns": { "ttl": 7200, "maxSize": 200 }
        }
    }'
) ON CONFLICT (id) DO NOTHING;

-- Create a view for recommendation analytics
CREATE OR REPLACE VIEW recommendation_analytics AS
SELECT 
    rh.user_id,
    rh.subject_code,
    COUNT(*) as total_recommendations,
    AVG(rh.confidence) as avg_confidence,
    COUNT(rf.id) as feedback_count,
    AVG(rf.rating) as avg_rating,
    DATE_TRUNC('day', rh.generated_at) as recommendation_date
FROM recommendation_history rh
LEFT JOIN recommendation_feedback rf ON rh.id = rf.recommendation_id
GROUP BY rh.user_id, rh.subject_code, DATE_TRUNC('day', rh.generated_at);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

COMMIT;