const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkRecommendationTables() {
  console.log('=== 推荐系统表检查 ===\n');
  
  const tables = [
    'recommendation_history',
    'user_behavior_logs', 
    'user_learning_sessions',
    'recommendation_feedback',
    'system_settings',
    'content_recommendations',
    'learning_analytics'
  ];
  
  let existingTables = [];
  let missingTables = [];
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: 不存在`);
        missingTables.push(table);
      } else {
        console.log(`✅ ${table}: 存在`);
        existingTables.push(table);
      }
    } catch (e) {
      console.log(`❌ ${table}: 不存在`);
      missingTables.push(table);
    }
  }
  
  console.log(`\n=== 检查结果 ===`);
  console.log(`✅ 已存在的表: ${existingTables.length}/${tables.length}`);
  console.log(`❌ 缺失的表: ${missingTables.length}/${tables.length}`);
  
  if (missingTables.length > 0) {
    console.log(`\n需要执行 011_recommendation_system.sql 迁移`);
    console.log(`缺失的表: ${missingTables.join(', ')}`);
  } else {
    console.log(`\n🎉 推荐系统表结构完整`);
  }
}

checkRecommendationTables().catch(console.error);