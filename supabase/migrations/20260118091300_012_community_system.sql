-- Community System Database Migration
-- This migration creates tables for the learning community platform

-- Create community_questions table for Q&A posts
CREATE TABLE IF NOT EXISTS community_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_code TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    question_type TEXT DEFAULT 'general', -- 'general', 'homework', 'concept', 'exam_prep'
    status TEXT DEFAULT 'open', -- 'open', 'answered', 'closed'
    view_count INTEGER DEFAULT 0,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    answer_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create community_answers table for answers to questions
CREATE TABLE IF NOT EXISTS community_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id UUID NOT NULL REFERENCES community_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_accepted BOOLEAN DEFAULT FALSE,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_community_profiles table for community-specific user data
CREATE TABLE IF NOT EXISTS user_community_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reputation_score INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    badges JSONB DEFAULT '[]',
    questions_asked INTEGER DEFAULT 0,
    answers_given INTEGER DEFAULT 0,
    best_answers INTEGER DEFAULT 0,
    helpful_votes_received INTEGER DEFAULT 0,
    community_rank TEXT DEFAULT 'newcomer', -- 'newcomer', 'contributor', 'expert', 'mentor'
    specialties TEXT[] DEFAULT '{}',
    bio TEXT,
    achievements JSONB DEFAULT '{}',
    activity_streak INTEGER DEFAULT 0,
    last_active_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create community_interactions table for tracking user interactions
CREATE TABLE IF NOT EXISTS community_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL, -- 'question', 'answer', 'user'
    target_id UUID NOT NULL,
    interaction_type TEXT NOT NULL, -- 'upvote', 'downvote', 'bookmark', 'follow', 'report'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id, interaction_type)
);

-- Create community_tags table for managing tags
CREATE TABLE IF NOT EXISTS community_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    subject_code TEXT,
    usage_count INTEGER DEFAULT 0,
    color TEXT DEFAULT '#3B82F6',
    is_official BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content_tags table for linking content to tags
CREATE TABLE IF NOT EXISTS content_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_type TEXT NOT NULL, -- 'question', 'answer'
    content_id UUID NOT NULL,
    tag_id UUID NOT NULL REFERENCES community_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(content_type, content_id, tag_id)
);

-- Create community_reports table for content moderation
CREATE TABLE IF NOT EXISTS community_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL, -- 'question', 'answer', 'user'
    target_id UUID NOT NULL,
    reason TEXT NOT NULL, -- 'spam', 'inappropriate', 'harassment', 'off_topic', 'other'
    description TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create page_analytics table for tracking page visits and user behavior
CREATE TABLE IF NOT EXISTS page_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    page_type TEXT NOT NULL, -- 'learning_path', 'community', 'recommendation'
    page_identifier TEXT NOT NULL, -- subject_code or specific page ID
    subject_code TEXT,
    session_id TEXT,
    visit_duration INTEGER, -- in seconds
    interactions_count INTEGER DEFAULT 0,
    scroll_depth DECIMAL(3,2), -- percentage of page scrolled
    referrer TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_preferences table for storing user preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_code TEXT,
    preference_type TEXT NOT NULL, -- 'difficulty', 'content_type', 'learning_style', 'notification'
    preference_value JSONB NOT NULL,
    weight DECIMAL(3,2) DEFAULT 1.0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, subject_code, preference_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_community_questions_user_id ON community_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_community_questions_subject_code ON community_questions(subject_code);
CREATE INDEX IF NOT EXISTS idx_community_questions_status ON community_questions(status);
CREATE INDEX IF NOT EXISTS idx_community_questions_created_at ON community_questions(created_at);
CREATE INDEX IF NOT EXISTS idx_community_questions_tags ON community_questions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_community_questions_search ON community_questions USING GIN(to_tsvector('english', title || ' ' || content));

CREATE INDEX IF NOT EXISTS idx_community_answers_question_id ON community_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_community_answers_user_id ON community_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_community_answers_created_at ON community_answers(created_at);
CREATE INDEX IF NOT EXISTS idx_community_answers_is_accepted ON community_answers(is_accepted);

CREATE INDEX IF NOT EXISTS idx_user_community_profiles_user_id ON user_community_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_community_profiles_reputation ON user_community_profiles(reputation_score);
CREATE INDEX IF NOT EXISTS idx_user_community_profiles_level ON user_community_profiles(level);

CREATE INDEX IF NOT EXISTS idx_community_interactions_user_id ON community_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_community_interactions_target ON community_interactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_community_interactions_type ON community_interactions(interaction_type);

CREATE INDEX IF NOT EXISTS idx_community_tags_name ON community_tags(name);
CREATE INDEX IF NOT EXISTS idx_community_tags_subject_code ON community_tags(subject_code);
CREATE INDEX IF NOT EXISTS idx_community_tags_usage_count ON community_tags(usage_count);

CREATE INDEX IF NOT EXISTS idx_content_tags_content ON content_tags(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_tags_tag_id ON content_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_community_reports_target ON community_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status);
CREATE INDEX IF NOT EXISTS idx_community_reports_reporter_id ON community_reports(reporter_id);

CREATE INDEX IF NOT EXISTS idx_page_analytics_user_id ON page_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_page_analytics_page_type ON page_analytics(page_type);
CREATE INDEX IF NOT EXISTS idx_page_analytics_subject_code ON page_analytics(subject_code);
CREATE INDEX IF NOT EXISTS idx_page_analytics_created_at ON page_analytics(created_at);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_subject_code ON user_preferences(subject_code);
CREATE INDEX IF NOT EXISTS idx_user_preferences_type ON user_preferences(preference_type);

-- Enable Row Level Security (RLS)
ALTER TABLE community_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_community_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- community_questions policies
CREATE POLICY "Anyone can view published questions" ON community_questions
    FOR SELECT USING (true);

CREATE POLICY "Users can create questions" ON community_questions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questions" ON community_questions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own questions" ON community_questions
    FOR DELETE USING (auth.uid() = user_id);

-- community_answers policies
CREATE POLICY "Anyone can view answers" ON community_answers
    FOR SELECT USING (true);

CREATE POLICY "Users can create answers" ON community_answers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own answers" ON community_answers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own answers" ON community_answers
    FOR DELETE USING (auth.uid() = user_id);

-- user_community_profiles policies
CREATE POLICY "Anyone can view community profiles" ON user_community_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON user_community_profiles
    FOR ALL USING (auth.uid() = user_id);

-- community_interactions policies
CREATE POLICY "Users can view their own interactions" ON community_interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create interactions" ON community_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interactions" ON community_interactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interactions" ON community_interactions
    FOR DELETE USING (auth.uid() = user_id);

-- community_tags policies
CREATE POLICY "Anyone can view tags" ON community_tags
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tags" ON community_tags
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- content_tags policies
CREATE POLICY "Anyone can view content tags" ON content_tags
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage content tags" ON content_tags
    FOR ALL WITH CHECK (auth.uid() IS NOT NULL);

-- community_reports policies
CREATE POLICY "Users can view their own reports" ON community_reports
    FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports" ON community_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- page_analytics policies
CREATE POLICY "Users can view their own analytics" ON page_analytics
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "System can insert analytics" ON page_analytics
    FOR INSERT WITH CHECK (true);

-- user_preferences policies
CREATE POLICY "Users can manage their own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_community_questions_updated_at
    BEFORE UPDATE ON community_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_answers_updated_at
    BEFORE UPDATE ON community_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_community_profiles_updated_at
    BEFORE UPDATE ON user_community_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_tags_updated_at
    BEFORE UPDATE ON community_tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_reports_updated_at
    BEFORE UPDATE ON community_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create functions for community system

-- Function to update question answer count
CREATE OR REPLACE FUNCTION update_question_answer_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE community_questions 
        SET answer_count = answer_count + 1,
            updated_at = NOW()
        WHERE id = NEW.question_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_questions 
        SET answer_count = answer_count - 1,
            updated_at = NOW()
        WHERE id = OLD.question_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for answer count updates
CREATE TRIGGER trigger_update_question_answer_count
    AFTER INSERT OR DELETE ON community_answers
    FOR EACH ROW EXECUTE FUNCTION update_question_answer_count();

-- Function to update user reputation
CREATE OR REPLACE FUNCTION update_user_reputation()
RETURNS TRIGGER AS $$
DECLARE
    reputation_change INTEGER := 0;
    target_user_id UUID;
BEGIN
    -- Determine reputation change based on interaction type
    IF NEW.interaction_type = 'upvote' THEN
        reputation_change := 5;
    ELSIF NEW.interaction_type = 'downvote' THEN
        reputation_change := -2;
    ELSE
        RETURN NEW;
    END IF;
    
    -- Get target user ID based on target type
    IF NEW.target_type = 'question' THEN
        SELECT user_id INTO target_user_id FROM community_questions WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'answer' THEN
        SELECT user_id INTO target_user_id FROM community_answers WHERE id = NEW.target_id;
    END IF;
    
    -- Update user reputation
    IF target_user_id IS NOT NULL THEN
        INSERT INTO user_community_profiles (user_id, reputation_score)
        VALUES (target_user_id, reputation_change)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            reputation_score = user_community_profiles.reputation_score + reputation_change,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reputation updates
CREATE TRIGGER trigger_update_user_reputation
    AFTER INSERT ON community_interactions
    FOR EACH ROW EXECUTE FUNCTION update_user_reputation();

-- Function to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE community_tags 
        SET usage_count = usage_count + 1,
            updated_at = NOW()
        WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_tags 
        SET usage_count = usage_count - 1,
            updated_at = NOW()
        WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tag usage count updates
CREATE TRIGGER trigger_update_tag_usage_count
    AFTER INSERT OR DELETE ON content_tags
    FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

COMMIT;