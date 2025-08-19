import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkDatabase() {
  try {
    // 查询物理文档
    const { data: docs, error: docsError } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('subject_code', '9702');
    
    // 查询总块数
    const { data: chunks, error: chunksError } = await supabase
      .from('rag_chunks')
      .select('*', { count: 'exact', head: true });
    
    // 查询总嵌入数
    const { data: embeddings, error: embError } = await supabase
      .from('rag_embeddings')
      .select('*', { count: 'exact', head: true });
    
    console.log('=== 物理数据迁移状态报告 ===');
    console.log(`物理文档 (9702): ${docs?.length || 0} 个`);
    console.log(`总文本块数: ${chunks?.length || chunksError?.count || 0}`);
    console.log(`总向量嵌入数: ${embeddings?.length || embError?.count || 0}`);
    
    if (docs && docs.length > 0) {
      console.log('\n物理文档列表:');
      docs.forEach(doc => {
        console.log(`- ${doc.title} (${doc.source_type})`);
      });
    }
    
    // 查询物理相关的块
    if (docs && docs.length > 0) {
      const docIds = docs.map(d => d.id);
      const { data: physicsChunks, error: physicsChunksError } = await supabase
        .from('rag_chunks')
        .select('*', { count: 'exact', head: true })
        .in('document_id', docIds);
      
      console.log(`\n物理相关文本块数: ${physicsChunks?.length || physicsChunksError?.count || 0}`);
    }
    
  } catch (error) {
    console.error('查询数据库失败:', error.message);
  }
}

checkDatabase();