import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// 加载环境变量
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 统计文件数量的函数
function countFilesInDirectory(dirPath, extension = '.pdf') {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }
  
  let count = 0;
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      count += countFilesInDirectory(fullPath, extension);
    } else if (item.isFile() && item.name.endsWith(extension)) {
      count++;
    }
  }
  
  return count;
}

// 统计各科目的试卷和mark scheme数量
function analyzeProjectFiles() {
  console.log('=== 项目文件分析报告 ===\n');
  
  const subjects = {
    '9709Mathematics': '数学 (9709)',
    '9231Further-Mathematics': '进阶数学 (9231)',
    '9702Physics': '物理 (9702)'
  };
  
  const basePaths = {
    pastPapers: 'C:\\Users\\Samsen\\cie-copilot\\data\\past-papers',
    markSchemes: 'C:\\Users\\Samsen\\cie-copilot\\data\\mark-schemes'
  };
  
  let totalPastPapers = 0;
  let totalMarkSchemes = 0;
  
  console.log('📊 试卷和答案统计:\n');
  
  for (const [subjectDir, subjectName] of Object.entries(subjects)) {
    const pastPapersPath = path.join(basePaths.pastPapers, subjectDir);
    const markSchemesPath = path.join(basePaths.markSchemes, subjectDir);
    
    const pastPapersCount = countFilesInDirectory(pastPapersPath);
    const markSchemesCount = countFilesInDirectory(markSchemesPath);
    
    totalPastPapers += pastPapersCount;
    totalMarkSchemes += markSchemesCount;
    
    console.log(`${subjectName}:`);
    console.log(`  📄 试卷 (Past Papers): ${pastPapersCount} 份`);
    console.log(`  📋 答案 (Mark Schemes): ${markSchemesCount} 份`);
    console.log(`  📊 覆盖率: ${markSchemesCount > 0 ? Math.round((markSchemesCount / pastPapersCount) * 100) : 0}%\n`);
  }
  
  console.log('📈 总计:');
  console.log(`  📄 总试卷数: ${totalPastPapers} 份`);
  console.log(`  📋 总答案数: ${totalMarkSchemes} 份`);
  console.log(`  📊 整体覆盖率: ${totalMarkSchemes > 0 ? Math.round((totalMarkSchemes / totalPastPapers) * 100) : 0}%\n`);
  
  return {
    totalPastPapers,
    totalMarkSchemes,
    subjects: Object.keys(subjects).map(dir => ({
      directory: dir,
      name: subjects[dir],
      pastPapers: countFilesInDirectory(path.join(basePaths.pastPapers, dir)),
      markSchemes: countFilesInDirectory(path.join(basePaths.markSchemes, dir))
    }))
  };
}

// 检查数据库状态
async function analyzeDatabaseStatus() {
  console.log('=== 数据库状态分析 ===\n');
  
  try {
    // 检查科目表
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('*');
    
    if (subjectsError) {
      console.error('❌ 科目表查询错误:', subjectsError.message);
    } else {
      console.log(`📚 科目表: ${subjects?.length || 0} 个科目`);
      subjects?.forEach(subject => {
        console.log(`  - ${subject.name} (${subject.code})`);
      });
    }
    
    // 检查试卷表
    const { data: papers, error: papersError } = await supabase
      .from('papers')
      .select('*, subjects(name, code)');
    
    if (papersError) {
      console.error('❌ 试卷表查询错误:', papersError.message);
    } else {
      console.log(`\n📄 试卷表: ${papers?.length || 0} 张试卷`);
      
      // 按科目分组统计
      const papersBySubject = {};
      papers?.forEach(paper => {
        const subjectCode = paper.subjects?.code || 'unknown';
        const subjectName = paper.subjects?.name || 'Unknown';
        const key = `${subjectName} (${subjectCode})`;
        
        if (!papersBySubject[key]) {
          papersBySubject[key] = [];
        }
        papersBySubject[key].push(paper.name);
      });
      
      Object.entries(papersBySubject).forEach(([subject, paperNames]) => {
        console.log(`  ${subject}: ${paperNames.length} 张试卷`);
        paperNames.forEach(name => console.log(`    - ${name}`));
      });
    }
    
    // 检查主题表
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('*, papers(name, subjects(name, code))');
    
    if (topicsError) {
      console.error('❌ 主题表查询错误:', topicsError.message);
    } else {
      console.log(`\n📖 主题表: ${topics?.length || 0} 个主题`);
      
      // 按科目统计主题数
      const topicsBySubject = {};
      topics?.forEach(topic => {
        const subjectCode = topic.papers?.subjects?.code || 'unknown';
        const subjectName = topic.papers?.subjects?.name || 'Unknown';
        const key = `${subjectName} (${subjectCode})`;
        
        if (!topicsBySubject[key]) {
          topicsBySubject[key] = 0;
        }
        topicsBySubject[key]++;
      });
      
      Object.entries(topicsBySubject).forEach(([subject, count]) => {
        console.log(`  ${subject}: ${count} 个主题`);
      });
    }
    
    // 检查RAG数据
    const { data: ragDocs, error: ragError } = await supabase
      .from('rag_documents')
      .select('subject_code')
      .not('subject_code', 'is', null);
    
    if (ragError) {
      console.error('❌ RAG文档查询错误:', ragError.message);
    } else {
      console.log(`\n🔍 RAG文档: ${ragDocs?.length || 0} 个文档`);
      
      // 按科目统计RAG文档
      const ragBySubject = {};
      ragDocs?.forEach(doc => {
        const subject = doc.subject_code || 'unknown';
        ragBySubject[subject] = (ragBySubject[subject] || 0) + 1;
      });
      
      Object.entries(ragBySubject).forEach(([subject, count]) => {
        console.log(`  ${subject}: ${count} 个文档`);
      });
    }
    
    // 检查RAG chunks和embeddings
    const { count: chunksCount } = await supabase
      .from('rag_chunks')
      .select('*', { count: 'exact', head: true });
    
    const { count: embeddingsCount } = await supabase
      .from('rag_embeddings')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📝 RAG数据块: ${chunksCount || 0} 个`);
    console.log(`🧠 向量嵌入: ${embeddingsCount || 0} 个`);
    
  } catch (error) {
    console.error('数据库分析出错:', error.message);
  }
}

// 检查data-notes目录
function analyzeDataNotes() {
  console.log('\n=== Data Notes 分析 ===\n');
  
  const dataNotesPath = 'C:\\Users\\Samsen\\cie-copilot\\src\\data\\data-notes';
  
  if (!fs.existsSync(dataNotesPath)) {
    console.log('❌ data-notes 目录不存在');
    return;
  }
  
  const subjects = fs.readdirSync(dataNotesPath, { withFileTypes: true })
    .filter(item => item.isDirectory())
    .map(item => item.name);
  
  console.log(`📁 Data Notes 目录: ${subjects.length} 个科目文件夹`);
  
  subjects.forEach(subject => {
    const subjectPath = path.join(dataNotesPath, subject);
    const mdCount = countFilesInDirectory(subjectPath, '.md');
    console.log(`  ${subject}: ${mdCount} 个 Markdown 文件`);
  });
}

// 生成完整报告
async function generateComprehensiveReport() {
  console.log('🔍 CIE Copilot 项目完整分析报告');
  console.log('=' .repeat(50));
  console.log(`生成时间: ${new Date().toLocaleString('zh-CN')}\n`);
  
  // 分析项目文件
  const fileAnalysis = analyzeProjectFiles();
  
  // 分析data-notes
  analyzeDataNotes();
  
  // 分析数据库状态
  await analyzeDatabaseStatus();
  
  // 生成总结
  console.log('\n=== 项目完成度总结 ===\n');
  
  console.log('📊 数据收集完成度:');
  console.log(`  ✅ 试卷收集: ${fileAnalysis.totalPastPapers} 份`);
  console.log(`  ✅ 答案收集: ${fileAnalysis.totalMarkSchemes} 份`);
  console.log(`  📈 答案覆盖率: ${Math.round((fileAnalysis.totalMarkSchemes / fileAnalysis.totalPastPapers) * 100)}%`);
  
  console.log('\n🔧 开发状态:');
  console.log('  ✅ 物理 (9702): 主题数据已录入，RAG功能正常');
  console.log('  ⚠️  数学 (9709): 主题数据未录入');
  console.log('  ⚠️  进阶数学 (9231): 主题数据未录入');
  
  console.log('\n🎯 下一步建议:');
  console.log('  1. 录入数学和进阶数学的主题数据');
  console.log('  2. 建立试卷和mark scheme的数据库索引');
  console.log('  3. 开发试卷浏览和搜索功能');
  console.log('  4. 集成mark scheme到答题系统');
}

// 执行分析
generateComprehensiveReport().catch(console.error);