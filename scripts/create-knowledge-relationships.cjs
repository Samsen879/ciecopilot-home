require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createKnowledgeRelationships() {
  console.log('=== 创建主题知识关系 ===\n');

  // 获取所有主题
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('*')
    .order('title');

  if (topicsError) {
    console.error('❌ 获取主题失败:', topicsError);
    return;
  }

  console.log(`📚 找到 ${topics.length} 个主题`);

  // 定义主题之间的关系映射（基于数学学习的逻辑顺序）
  const relationships = [
    // 代数基础 -> 高级代数
    { parent: 'Algebra', child: 'Quadratics', type: 'prerequisite' },
    { parent: 'Quadratics', child: 'Functions', type: 'prerequisite' },
    { parent: 'Functions', child: 'Logarithmic and Exponential Functions', type: 'prerequisite' },
    
    // 几何基础 -> 高级几何
    { parent: 'Coordinate Geometry', child: 'Vectors', type: 'prerequisite' },
    { parent: 'Trigonometry', child: 'Coordinate Geometry', type: 'prerequisite' },
    
    // 微积分序列
    { parent: 'Functions', child: 'Differentiation', type: 'prerequisite' },
    { parent: 'Differentiation', child: 'Integration', type: 'prerequisite' },
    { parent: 'Integration', child: 'Differential Equations', type: 'prerequisite' },
    
    // 统计学序列
    { parent: 'Representation of Data', child: 'Probability', type: 'prerequisite' },
    { parent: 'Probability', child: 'Discrete Random Variables', type: 'prerequisite' },
    { parent: 'Discrete Random Variables', child: 'Continuous Random Variables', type: 'prerequisite' },
    { parent: 'Continuous Random Variables', child: 'The Normal Distribution', type: 'prerequisite' },
    
    // 力学序列
    { parent: 'Vectors', child: 'Kinematics of Linear Motion', type: 'prerequisite' },
    { parent: 'Kinematics of Linear Motion', child: 'Forces and Equilibrium', type: 'prerequisite' },
    { parent: 'Forces and Equilibrium', child: 'Energy, Work, and Power', type: 'prerequisite' },
    { parent: 'Energy, Work, and Power', child: 'Momentum', type: 'prerequisite' },
    
    // 相关关系
    { parent: 'Trigonometry', child: 'Circular Measure', type: 'related' },
    { parent: 'Vectors', child: 'Complex Numbers', type: 'related' },
    { parent: 'Differentiation', child: 'Motion of a Projectile', type: 'related' },
    { parent: 'Integration', child: 'Circular Motion', type: 'related' },
    { parent: 'Matrices', child: 'Linear Motion under a Variable Force', type: 'related' }
  ];

  // 创建主题名称到ID的映射
  const topicMap = {};
  topics.forEach(topic => {
    topicMap[topic.title] = topic.id;
  });

  // 检查现有关系
  const { data: existingRelations, error: existingError } = await supabase
    .from('knowledge_relationships')
    .select('*');

  if (existingError) {
    console.error('❌ 检查现有关系失败:', existingError);
    return;
  }

  console.log(`🔗 现有关系数量: ${existingRelations.length}`);

  // 准备插入的关系数据
  const relationshipsToInsert = [];
  let skippedCount = 0;
  let invalidCount = 0;

  for (const rel of relationships) {
    const parentId = topicMap[rel.parent];
    const childId = topicMap[rel.child];

    if (!parentId || !childId) {
      console.log(`⚠️  跳过无效关系: ${rel.parent} -> ${rel.child} (主题不存在)`);
      invalidCount++;
      continue;
    }

    // 检查是否已存在
    const exists = existingRelations.some(existing => 
      existing.parent_topic_id === parentId && 
      existing.child_topic_id === childId &&
      existing.relationship_type === rel.type
    );

    if (exists) {
      skippedCount++;
      continue;
    }

    relationshipsToInsert.push({
      parent_topic_id: parentId,
      child_topic_id: childId,
      relationship_type: rel.type,
      strength: 1.0,
      description: `${rel.parent} is a ${rel.type} for ${rel.child}`
    });
  }

  console.log(`\n📊 关系统计:`);
  console.log(`  - 总关系数: ${relationships.length}`);
  console.log(`  - 无效关系: ${invalidCount}`);
  console.log(`  - 已存在关系: ${skippedCount}`);
  console.log(`  - 待插入关系: ${relationshipsToInsert.length}`);

  if (relationshipsToInsert.length === 0) {
    console.log('\n✅ 所有关系已存在，无需插入');
    return;
  }

  // 批量插入关系
  const { data: insertedRelations, error: insertError } = await supabase
    .from('knowledge_relationships')
    .insert(relationshipsToInsert)
    .select();

  if (insertError) {
    console.error('❌ 插入关系失败:', insertError);
    return;
  }

  console.log(`\n🎉 成功创建 ${insertedRelations.length} 个主题关系`);

  // 显示创建的关系
  console.log('\n📋 新创建的关系:');
  for (const relation of insertedRelations) {
    const parentTopic = topics.find(t => t.id === relation.parent_topic_id);
    const childTopic = topics.find(t => t.id === relation.child_topic_id);
    console.log(`  ${parentTopic.title} --[${relation.relationship_type}]--> ${childTopic.title}`);
  }
}

createKnowledgeRelationships().catch(console.error);