const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createLearningAnalyticsTable() {
  console.log('创建learning_analytics表...');
  
  const sql = `
    CREATE TABLE IF NOT EXISTS public.learning_analytics (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
      subject_code TEXT,
      analytics_type TEXT NOT NULL,
      time_period TEXT NOT NULL,
      data JSONB NOT NULL,
      insights JSONB,
      recommendations JSONB,
      recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- 启用行级安全策略
    ALTER TABLE public.learning_analytics ENABLE ROW LEVEL SECURITY;
    
    -- 创建RLS策略
    CREATE POLICY "Learning analytics are viewable by owner" ON public.learning_analytics
      FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY "Learning analytics are insertable by system" ON public.learning_analytics
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    
    CREATE POLICY "Learning analytics are updatable by system" ON public.learning_analytics
      FOR UPDATE USING (auth.role() = 'authenticated');
    
    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_learning_analytics_user_id ON public.learning_analytics(user_id);
    CREATE INDEX IF NOT EXISTS idx_learning_analytics_type ON public.learning_analytics(analytics_type);
    CREATE INDEX IF NOT EXISTS idx_learning_analytics_subject_code ON public.learning_analytics(subject_code);
    CREATE INDEX IF NOT EXISTS idx_learning_analytics_recorded_at ON public.learning_analytics(recorded_at);
  `;
  
  console.log('✅ 请在Supabase Dashboard的SQL编辑器中执行以下SQL语句：');
  console.log('\n' + '='.repeat(80));
  console.log(sql);
  console.log('='.repeat(80) + '\n');
  console.log('执行完成后，learning_analytics表将被成功创建。');
}

createLearningAnalyticsTable()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('创建失败:', e);
    process.exit(1);
  });