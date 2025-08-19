import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseStatus() {
  console.log('=== 完整数据库状态报告 ===\n');
  
  try {
    // 检查科目表
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('*');
    
    if (subjectsError) {
      console.error('科目表查询错误:', subjectsError);
    } else {
      console.log(`📚 科目表 (subjects): ${subjects?.length || 0} 条记录`);
      if (subjects && subjects.length > 0) {
        subjects.forEach(subject => {
          console.log(`  - ${subject.name} (${subject.code})`);
        });
      }
    }
    
    // 检查试卷表
    const { data: papers, error: papersError } = await supabase
      .from('papers')
      .select('*');
    
    if (papersError) {
      console.error('试卷表查询错误:', papersError);
    } else {
      console.log(`\n📄 试卷表 (papers): ${papers?.length || 0} 条记录`);
      if (papers && papers.length > 0) {
        const papersBySubject = {};
        papers.forEach(paper => {
          if (!papersBySubject[paper.subject_id]) {
            papersBySubject[paper.subject_id] = [];
          }
          papersBySubject[paper.subject_id].push(paper.name);
        });
        Object.entries(papersBySubject).forEach(([subjectId, paperNames]) => {
          console.log(`  科目 ${subjectId}: ${paperNames.join(', ')}`);
        });
      }
    }
    
    // 检查主题表
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('*');
    
    if (topicsError) {
      console.error('主题表查询错误:', topicsError);
    } else {
      console.log(`\n📝 主题表 (topics): ${topics?.length || 0} 条记录`);
      if (topics && topics.length > 0) {
        const topicsBySubject = {};
        topics.forEach(topic => {
          if (!topicsBySubject[topic.subject_id]) {
            topicsBySubject[topic.subject_id] = 0;
          }
          topicsBySubject[topic.subject_id]++;
        });
        Object.entries(topicsBySubject).forEach(([subjectId, count]) => {
          console.log(`  科目 ${subjectId}: ${count} 个主题`);
        });
      }
    }
    
    // 检查RAG文档表
    const { data: ragDocs, error: ragDocsError } = await supabase
      .from('rag_documents')
      .select('*');
    
    if (ragDocsError) {
      console.error('RAG文档表查询错误:', ragDocsError);
    } else {
      console.log(`\n🔍 RAG文档表 (rag_documents): ${ragDocs?.length || 0} 条记录`);
      if (ragDocs && ragDocs.length > 0) {
        const docsBySubject = {};
        ragDocs.forEach(doc => {
          if (!docsBySubject[doc.subject_code]) {
            docsBySubject[doc.subject_code] = 0;
          }
          docsBySubject[doc.subject_code]++;
        });
        Object.entries(docsBySubject).forEach(([subjectCode, count]) => {
          console.log(`  ${subjectCode}: ${count} 个文档`);
        });
      }
    }
    
    // 检查RAG文本块表
    const { data: ragChunks, error: ragChunksError } = await supabase
      .from('rag_chunks')
      .select('id');
    
    if (ragChunksError) {
      console.error('RAG文本块表查询错误:', ragChunksError);
    } else {
      console.log(`\n📦 RAG文本块表 (rag_chunks): ${ragChunks?.length || 0} 条记录`);
    }
    
    // 检查RAG嵌入表
    const { data: ragEmbeddings, error: ragEmbeddingsError } = await supabase
      .from('rag_embeddings')
      .select('id');
    
    if (ragEmbeddingsError) {
      console.error('RAG嵌入表查询错误:', ragEmbeddingsError);
    } else {
      console.log(`\n🧠 RAG嵌入表 (rag_embeddings): ${ragEmbeddings?.length || 0} 条记录`);
    }
    
    // 检查用户表
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id');
    
    if (usersError) {
      console.error('用户表查询错误:', usersError);
    } else {
      console.log(`\n👥 用户表 (users): ${users?.length || 0} 条记录`);
    }
    
    // 检查学习记录表
    const { data: studyRecords, error: studyRecordsError } = await supabase
      .from('study_records')
      .select('id');
    
    if (studyRecordsError) {
      console.error('学习记录表查询错误:', studyRecordsError);
    } else {
      console.log(`\n📊 学习记录表 (study_records): ${studyRecords?.length || 0} 条记录`);
    }
    
    // 检查错误记录表
    const { data: errorRecords, error: errorRecordsError } = await supabase
      .from('error_records')
      .select('id');
    
    if (errorRecordsError) {
      console.error('错误记录表查询错误:', errorRecordsError);
    } else {
      console.log(`\n❌ 错误记录表 (error_records): ${errorRecords?.length || 0} 条记录`);
    }
    
    console.log('\n=== 数据库状态检查完成 ===');
    
  } catch (error) {
    console.error('数据库连接或查询失败:', error);
  }
}

checkDatabaseStatus();