const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function insertKnowledgeTags() {
  console.log('=== 插入初始知识标签 ===\n');
  
  const knowledgeTags = [
    { name: 'algebra', category: 'concept', description: 'Algebra concepts and techniques' },
    { name: 'calculus', category: 'concept', description: 'Calculus concepts including differentiation and integration' },
    { name: 'geometry', category: 'concept', description: 'Geometric concepts and theorems' },
    { name: 'trigonometry', category: 'concept', description: 'Trigonometric functions and identities' },
    { name: 'statistics', category: 'concept', description: 'Statistical concepts and methods' },
    { name: 'mechanics', category: 'concept', description: 'Mechanics concepts in physics' },
    { name: 'pure_mathematics', category: 'category', description: 'Pure mathematics topics' },
    { name: 'applied_mathematics', category: 'category', description: 'Applied mathematics topics' },
    { name: 'formula', category: 'formula', description: 'Mathematical formulas' },
    { name: 'theorem', category: 'theorem', description: 'Mathematical theorems' },
    { name: 'method', category: 'method', description: 'Problem solving methods' },
    { name: 'skill', category: 'skill', description: 'Mathematical skills and techniques' }
  ];
  
  try {
    // 检查是否已有数据
    const { data: existing, error: checkError } = await supabase
      .from('knowledge_tags')
      .select('name');
    
    if (checkError) {
      console.error('❌ 检查现有数据失败:', checkError.message);
      return;
    }
    
    if (existing && existing.length > 0) {
      console.log(`⚠️  知识标签表已有 ${existing.length} 条数据，跳过插入`);
      console.log('现有标签:', existing.map(tag => tag.name).join(', '));
      return;
    }
    
    // 插入数据
    const { data, error } = await supabase
      .from('knowledge_tags')
      .insert(knowledgeTags)
      .select();
    
    if (error) {
      console.error('❌ 插入知识标签失败:', error.message);
      return;
    }
    
    console.log(`✅ 成功插入 ${data.length} 个知识标签:`);
    data.forEach(tag => {
      console.log(`  - ${tag.name} (${tag.category}): ${tag.description}`);
    });
    
  } catch (err) {
    console.error('❌ 操作失败:', err.message);
  }
}

insertKnowledgeTags().catch(console.error);