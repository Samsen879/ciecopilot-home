// 检查主题表数据的脚本

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Supabase 客户端
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Key not found. Make sure you have a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTopicsData() {
  console.log('=== 主题表数据检查 ===\n');
  
  try {
    // 检查总主题数
    const { data: allTopics, error: allError } = await supabase
      .from('topics')
      .select('*');
    
    if (allError) {
      console.error('❌ 查询主题表失败:', allError.message);
      return;
    }
    
    console.log(`📊 总主题数: ${allTopics.length}`);
    
    // 按科目分组统计
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, code, name');
    
    for (const subject of subjects) {
      // 获取该科目的试卷
      const { data: papers } = await supabase
        .from('papers')
        .select('id, code, name')
        .eq('subject_id', subject.id);
      
      console.log(`\n📚 ${subject.name} (${subject.code}):`);
      
      let subjectTopicCount = 0;
      for (const paper of papers) {
        // 获取该试卷的主题
        const { data: topics } = await supabase
          .from('topics')
          .select('topic_id, title')
          .eq('paper_id', paper.id);
        
        console.log(`  📄 ${paper.name} (${paper.code}): ${topics.length} 个主题`);
        
        if (topics.length > 0) {
          topics.forEach(topic => {
            console.log(`    - ${topic.title}`);
          });
        }
        
        subjectTopicCount += topics.length;
      }
      
      console.log(`  📊 ${subject.name} 总计: ${subjectTopicCount} 个主题`);
    }
    
  } catch (error) {
    console.error('❌ 检查主题数据失败:', error.message);
  }
}

// 运行检查
checkTopicsData();