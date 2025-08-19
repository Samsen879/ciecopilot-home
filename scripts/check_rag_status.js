import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRAGStatus() {
  try {
    // Check total documents
    const { count: docCount } = await supabase
      .from('rag_documents')
      .select('*', { count: 'exact', head: true });
    
    // Check total chunks
    const { count: chunkCount } = await supabase
      .from('rag_chunks')
      .select('*', { count: 'exact', head: true });
    
    // Check total embeddings
    const { count: embedCount } = await supabase
      .from('rag_embeddings')
      .select('*', { count: 'exact', head: true });
    
    // Check recent documents
    const { data: recentDocs } = await supabase
      .from('rag_documents')
      .select('title, source_type, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('=== RAG System Status ===');
    console.log(`Total Documents: ${docCount}`);
    console.log(`Total Chunks: ${chunkCount}`);
    console.log(`Total Embeddings: ${embedCount}`);
    console.log('\nRecent Documents:');
    recentDocs?.forEach(doc => {
      console.log(`- ${doc.title} (${doc.source_type}) - ${doc.created_at}`);
    });
    
  } catch (error) {
    console.error('Error checking RAG status:', error);
  }
}

checkRAGStatus();


