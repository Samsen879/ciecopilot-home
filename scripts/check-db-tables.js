import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Key not found");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('=== 数据库表结构检查 ===\n');
  
  try {
    // 检查现有表
    const tables = ['subjects', 'papers', 'topics', 'rag_documents', 'rag_chunks', 'rag_embeddings'];
    
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
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }
    
    // 检查现有数据
    console.log('\n=== 数据统计 ===');
    
    const existingTables = [];
    
    // 检查subjects表
    try {
      const { data: subjects, error } = await supabase
        .from('subjects')
        .select('*');
      
      if (!error) {
        console.log(`📚 科目数量: ${subjects.length}`);
        subjects.forEach(s => console.log(`  - ${s.code}: ${s.name}`));
        existingTables.push('subjects');
      }
    } catch (err) {
      console.log('❌ 无法获取科目数据');
    }
    
    // 检查papers表
    try {
      const { data: papers, error } = await supabase
        .from('papers')
        .select('*');
      
      if (!error) {
        console.log(`\n📄 试卷数量: ${papers.length}`);
        existingTables.push('papers');
      }
    } catch (err) {
      console.log('❌ 无法获取试卷数据');
    }
    
    // 检查topics表
    try {
      const { data: topics, error } = await supabase
        .from('topics')
        .select('*');
      
      if (!error) {
        console.log(`\n📝 主题数量: ${topics.length}`);
        existingTables.push('topics');
      }
    } catch (err) {
      console.log('❌ 无法获取主题数据');
    }
    
    console.log(`\n✅ 可用表: ${existingTables.join(', ')}`);
    
    // RAG相关表检查和数据统计
    console.log('\n=== RAG系统状态 ===');
    const ragTables = ['rag_documents', 'rag_chunks', 'rag_embeddings'];
    const missingRagTables = [];
    
    for (const table of ragTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          missingRagTables.push(table);
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: 存在，数据量: ${count || 0}`);
        }
      } catch (err) {
        missingRagTables.push(table);
        console.log(`❌ ${table}: ${err.message}`);
      }
    }
    
    if (missingRagTables.length === 0) {
      console.log('\n🎉 RAG系统表结构完整且有数据');
    } else {
      console.log(`\n❌ RAG系统缺少表: ${missingRagTables.join(', ')}`);
      console.log('🔧 需要创建RAG系统表结构');
    }
    
  } catch (error) {
    console.error('检查失败:', error.message);
  }
}

checkTables().catch(console.error);