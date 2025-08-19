const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 主题名称到知识标签的映射规则
const topicToTagsMapping = {
  // 数学相关
  'functions': ['algebra', 'pure_mathematics'],
  'coordinate geometry': ['geometry', 'algebra'],
  'circular measure': ['trigonometry', 'geometry'],
  'series': ['algebra', 'pure_mathematics'],
  'differentiation': ['calculus', 'pure_mathematics'],
  'integration': ['calculus', 'pure_mathematics'],
  'quadratics': ['algebra', 'pure_mathematics'],
  'trigonometry': ['trigonometry', 'pure_mathematics'],
  'vectors': ['algebra', 'geometry'],
  'differential equations': ['calculus', 'applied_mathematics'],
  'logarithmic and exponential functions': ['algebra', 'pure_mathematics'],
  'numerical solution of equations': ['algebra', 'applied_mathematics'],
  'algebra': ['algebra', 'pure_mathematics'],
  'complex numbers': ['algebra', 'pure_mathematics'],
  
  // 力学相关
  'forces and equilibrium': ['mechanics', 'applied_mathematics'],
  'kinematics of linear motion': ['mechanics', 'applied_mathematics'],
  'momentum': ['mechanics', 'applied_mathematics'],
  "newton's laws of motion": ['mechanics', 'applied_mathematics'],
  'energy, work, and power': ['mechanics', 'applied_mathematics'],
  
  // 统计相关
  'probability': ['statistics', 'applied_mathematics'],
  'permutations and combinations': ['statistics', 'algebra'],
  'the normal distribution': ['statistics', 'applied_mathematics'],
  'representation of data': ['statistics', 'applied_mathematics'],
  'discrete random variables': ['statistics', 'applied_mathematics'],
  
  // 进阶数学
  'roots of polynomial equations': ['algebra', 'pure_mathematics'],
  'rational functions and graphs': ['algebra', 'geometry'],
  'summation of series': ['algebra', 'pure_mathematics'],
  'matrices': ['algebra', 'pure_mathematics'],
  'polar coordinates': ['geometry', 'trigonometry'],
  'proof by induction': ['algebra', 'method'],
  'hyperbolic functions': ['algebra', 'pure_mathematics'],
  'continuous random variables': ['statistics', 'applied_mathematics'],
  'inference using normal and t-distributions': ['statistics', 'applied_mathematics'],
  'chi-squared tests': ['statistics', 'applied_mathematics'],
  'non-parametric tests': ['statistics', 'applied_mathematics'],
  'probability generating functions': ['statistics', 'applied_mathematics'],
  'motion of a projectile': ['mechanics', 'applied_mathematics'],
  'equilibrium of a rigid body': ['mechanics', 'applied_mathematics'],
  'circular motion': ['mechanics', 'applied_mathematics'],
  "hooke's law": ['mechanics', 'applied_mathematics'],
  'linear motion under a variable force': ['mechanics', 'applied_mathematics'],
  
  // 物理相关
  'physical quantities and units': ['mechanics', 'applied_mathematics'],
  'kinematics': ['mechanics', 'applied_mathematics'],
  'dynamics': ['mechanics', 'applied_mathematics'],
  'forces, density and pressure': ['mechanics', 'applied_mathematics'],
  'work, energy and power': ['mechanics', 'applied_mathematics'],
  'deformation of solids': ['mechanics', 'applied_mathematics'],
  'waves': ['mechanics', 'applied_mathematics'],
  'superposition': ['mechanics', 'applied_mathematics'],
  'electricity': ['applied_mathematics'],
  'd.c. circuits': ['applied_mathematics'],
  'particle physics': ['applied_mathematics'],
  'motion in a circle': ['mechanics', 'applied_mathematics'],
  'gravitational fields': ['mechanics', 'applied_mathematics'],
  'temperature': ['applied_mathematics'],
  'ideal gases': ['applied_mathematics'],
  'thermodynamics': ['applied_mathematics'],
  'oscillations': ['mechanics', 'applied_mathematics'],
  'electric fields': ['applied_mathematics'],
  'capacitance': ['applied_mathematics'],
  'magnetic fields': ['applied_mathematics'],
  'alternating currents': ['applied_mathematics'],
  'quantum physics': ['applied_mathematics'],
  'nuclear physics': ['applied_mathematics'],
  'medical physics': ['applied_mathematics'],
  'astronomy and cosmology': ['applied_mathematics']
};

async function linkTopicsToTags() {
  console.log('=== 关联主题与知识标签 ===\n');
  
  try {
    // 获取所有主题
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('id, title');
    
    if (topicsError) {
      console.error('❌ 获取主题失败:', topicsError.message);
      return;
    }
    
    // 获取所有知识标签
    const { data: tags, error: tagsError } = await supabase
      .from('knowledge_tags')
      .select('id, name');
    
    if (tagsError) {
      console.error('❌ 获取知识标签失败:', tagsError.message);
      return;
    }
    
    // 创建标签名称到ID的映射
    const tagNameToId = {};
    tags.forEach(tag => {
      tagNameToId[tag.name] = tag.id;
    });
    
    console.log(`📚 找到 ${topics.length} 个主题，${tags.length} 个知识标签`);
    
    // 检查现有关联
    const { data: existingLinks, error: linksError } = await supabase
      .from('topic_tags')
      .select('topic_id, tag_id');
    
    if (linksError) {
      console.error('❌ 获取现有关联失败:', linksError.message);
      return;
    }
    
    console.log(`🔗 现有关联数量: ${existingLinks.length}`);
    
    const newLinks = [];
    let matchedTopics = 0;
    let totalLinks = 0;
    
    // 为每个主题分配标签
    for (const topic of topics) {
      const topicTitle = topic.title.toLowerCase();
      const matchingTags = [];
      
      // 查找匹配的标签
      for (const [pattern, tagNames] of Object.entries(topicToTagsMapping)) {
        if (topicTitle.includes(pattern.toLowerCase())) {
          tagNames.forEach(tagName => {
            if (tagNameToId[tagName] && !matchingTags.includes(tagNameToId[tagName])) {
              matchingTags.push(tagNameToId[tagName]);
            }
          });
        }
      }
      
      if (matchingTags.length > 0) {
        matchedTopics++;
        
        // 检查是否已存在关联
        for (const tagId of matchingTags) {
          const existingLink = existingLinks.find(link => 
            link.topic_id === topic.id && link.tag_id === tagId
          );
          
          if (!existingLink) {
            newLinks.push({
              topic_id: topic.id,
              tag_id: tagId
            });
            totalLinks++;
          }
        }
        
        console.log(`✅ ${topic.title}: ${matchingTags.length} 个标签`);
      } else {
        console.log(`⚠️  ${topic.title}: 未找到匹配的标签`);
      }
    }
    
    console.log(`\n📊 统计结果:`);
    console.log(`  - 匹配的主题: ${matchedTopics}/${topics.length}`);
    console.log(`  - 新增关联: ${newLinks.length}`);
    
    if (newLinks.length > 0) {
      // 批量插入新关联
      const { data, error } = await supabase
        .from('topic_tags')
        .insert(newLinks)
        .select();
      
      if (error) {
        console.error('❌ 插入关联失败:', error.message);
        return;
      }
      
      console.log(`\n🎉 成功创建 ${data.length} 个主题-标签关联`);
    } else {
      console.log('\n✅ 所有关联已存在，无需新增');
    }
    
  } catch (err) {
    console.error('❌ 操作失败:', err.message);
  }
}

linkTopicsToTags().catch(console.error);