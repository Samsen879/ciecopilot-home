import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkTopicsColumns() {
  try {
    console.log('=== 检查 topics 表列结构 ===');
    
    // 获取一条记录来查看列结构
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Topics 表的列:', Object.keys(data[0]));
      console.log('\n示例数据:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('Topics 表中没有数据');
    }
    
    // 检查是否有 subject_code 列
    const hasSubjectCode = data && data.length > 0 && data[0].hasOwnProperty('subject_code');
    console.log('\n是否包含 subject_code 列:', hasSubjectCode ? '✅ 是' : '❌ 否');
    
  } catch (err) {
    console.error('检查失败:', err);
  }
}

checkTopicsColumns();