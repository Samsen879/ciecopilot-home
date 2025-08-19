const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkStudyHubTables() {
  console.log('=== Study Hub扩展表检查 ===\n');
  
  const tables = [
    'enhanced_topics',
    'ai_tutoring_sessions', 
    'learning_paths',
    'personalized_recommendations',
    'learning_analytics'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: 存在`);
      }
    } catch (e) {
      console.log(`❌ ${table}: ${e.message}`);
    }
  }
  
  // 检查现有表的新增列
  console.log('\n=== 现有表扩展列检查 ===\n');
  
  try {
    // 检查topics表新增列
    const { data: topicsData, error: topicsError } = await supabase
      .from('topics')
      .select('learning_objectives, exam_patterns, study_resources, assessment_criteria')
      .limit(1);
      
    if (topicsError) {
      console.log(`❌ topics表扩展列: ${topicsError.message}`);
    } else {
      console.log('✅ topics表扩展列: 成功添加');
    }
    
    // 检查user_profiles表新增列
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('learning_preferences, learning_goals, study_schedule, performance_metrics')
      .limit(1);
      
    if (profilesError) {
      console.log(`❌ user_profiles表扩展列: ${profilesError.message}`);
    } else {
      console.log('✅ user_profiles表扩展列: 成功添加');
    }
    
    // 检查study_records表新增列
    const { data: recordsData, error: recordsError } = await supabase
      .from('study_records')
      .select('time_tracking, accuracy_tracking, learning_path_data, ai_recommendations')
      .limit(1);
      
    if (recordsError) {
      console.log(`❌ study_records表扩展列: ${recordsError.message}`);
    } else {
      console.log('✅ study_records表扩展列: 成功添加');
    }
    
  } catch (e) {
    console.log(`❌ 扩展列检查失败: ${e.message}`);
  }
  
  console.log('\n🎉 Study Hub数据库扩展检查完成！');
}

checkStudyHubTables()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('检查失败:', e);
    process.exit(1);
  });