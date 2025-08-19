import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Key not found. Make sure you have a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function checkRAGStatus() {
  console.log('=== RAG系统状态检查 ===\n');
  
  try {
    // 检查RAG文档表
    console.log('1. 检查RAG文档数据...');
    const { data: documents, error: docError } = await supabase
      .from('rag_documents')
      .select('*');
    
    if (docError) {
      console.error('获取RAG文档数据失败:', docError.message);
    } else {
      console.log(`   RAG文档总数: ${documents?.length || 0}`);
    }
    
    // 检查RAG数据块表
    console.log('\n2. 检查RAG数据块...');
    const { data: chunks, error: chunkError } = await supabase
      .from('rag_chunks')
      .select('*');
    
    if (chunkError) {
      console.error('获取RAG数据块失败:', chunkError.message);
    } else {
      console.log(`   RAG数据块总数: ${chunks?.length || 0}`);
    }
    
    // 检查RAG嵌入向量表
    console.log('\n3. 检查RAG嵌入向量...');
    const { data: embeddings, error: embError } = await supabase
      .from('rag_embeddings')
      .select('*');
    
    if (embError) {
      console.error('获取RAG嵌入向量失败:', embError.message);
    } else {
      console.log(`   RAG嵌入向量总数: ${embeddings?.length || 0}`);
    }
    
    // 检查现有的科目和主题数据
    console.log('\n4. 检查现有数据源...');
    const { data: subjects, error: subError } = await supabase
      .from('subjects')
      .select('*');
    
    const { data: topics, error: topicError } = await supabase
      .from('topics')
      .select('*');
    
    if (!subError && !topicError) {
      console.log(`   科目数量: ${subjects?.length || 0}`);
      console.log(`   主题数量: ${topics?.length || 0}`);
    }
    
    // 数据完整性分析
    console.log('\n5. RAG系统状态分析...');
    const hasDocuments = documents && documents.length > 0;
    const hasChunks = chunks && chunks.length > 0;
    const hasEmbeddings = embeddings && embeddings.length > 0;
    
    console.log(`   📄 文档数据: ${hasDocuments ? '✅ 有数据' : '❌ 无数据'}`);
    console.log(`   🧩 数据块: ${hasChunks ? '✅ 有数据' : '❌ 无数据'}`);
    console.log(`   🔢 嵌入向量: ${hasEmbeddings ? '✅ 有数据' : '❌ 无数据'}`);
    
    // 检查各科目RAG覆盖情况
    if (hasDocuments) {
      const subjectCoverage = {};
      documents.forEach(doc => {
        const subject = doc.subject_code || 'unknown';
        subjectCoverage[subject] = (subjectCoverage[subject] || 0) + 1;
      });
      
      console.log('\n6. 科目RAG覆盖情况:');
      Object.entries(subjectCoverage).forEach(([subject, count]) => {
        console.log(`   ${subject}: ${count} 个RAG文档`);
      });
    } else {
      console.log('\n⚠️  RAG系统状态: 表结构已创建，但尚未导入任何数据');
      console.log('   建议: 运行RAG数据导入脚本来填充内容');
    }
    
    console.log('\n=== RAG状态检查完成 ===');
    
  } catch (error) {
    console.error('RAG状态检查失败:', error.message);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  checkRAGStatus().catch(console.error);
}