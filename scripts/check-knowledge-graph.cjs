const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkKnowledgeGraphTables() {
  console.log('=== 知识图谱表检查 ===\n');
  
  const tables = [
    'knowledge_tags',
    'topic_tags', 
    'knowledge_relationships',
    'past_papers',
    'paper_questions',
    'question_knowledge_points',
    'question_attempts',
    'knowledge_recommendations',
    'learning_paths',
    'learning_path_steps'
  ];
  
  const existingTables = [];
  const missingTables = [];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: 不存在 (${error.message})`);
        missingTables.push(table);
      } else {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        console.log(`✅ ${table}: 存在，数据量: ${count || 0}`);
        existingTables.push(table);
      }
    } catch (err) {
      console.log(`❌ ${table}: 检查失败 (${err.message})`);
      missingTables.push(table);
    }
  }
  
  console.log('\n=== 检查结果 ===');
  console.log(`✅ 已存在的表: ${existingTables.length}/${tables.length}`);
  console.log(`❌ 缺失的表: ${missingTables.length}/${tables.length}`);
  
  if (missingTables.length > 0) {
    console.log('\n❌ 缺失的表:');
    missingTables.forEach(table => console.log(`  - ${table}`));
  }
  
  if (existingTables.length === tables.length) {
    console.log('\n🎉 知识图谱表结构完整');
  } else {
    console.log('\n⚠️  知识图谱表结构不完整，需要运行迁移脚本');
  }
  
  // 检查知识标签数据
  if (existingTables.includes('knowledge_tags')) {
    console.log('\n=== 知识标签数据检查 ===');
    const { data: tags, error } = await supabase
      .from('knowledge_tags')
      .select('*')
      .limit(10);
    
    if (tags && tags.length > 0) {
      console.log(`📚 知识标签示例 (前10个):`);
      tags.forEach(tag => {
        console.log(`  - ${tag.name} (${tag.category || '未分类'})`);
      });
    } else {
      console.log('📚 知识标签表为空');
    }
  }
}

checkKnowledgeGraphTables().catch(console.error);