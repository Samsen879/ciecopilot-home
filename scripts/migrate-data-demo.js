// 数据迁移演示脚本
// 用于演示数据迁移过程，暂时不连接Supabase

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据文件路径
const DATA_DIR = path.join(__dirname, '../src/data');

// 读取JSON文件的工具函数
function readJsonFile(filename) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`读取文件 ${filename} 失败:`, error.message);
    return null;
  }
}

// 统计数据的函数
function analyzeData() {
  console.log('=== CIE Copilot 数据分析报告 ===\n');
  
  let totalTopics = 0;
  let totalSubjects = 0;
  
  // 数学科目
  console.log('📊 数学 (9709) 数据分析:');
  const mathPapers = [
    { file: '9709paper1.json', name: 'Pure Mathematics 1' },
    { file: '9709paper3.json', name: 'Pure Mathematics 3' },
    { file: '9709paper4.json', name: 'Mechanics' },
    { file: '9709paper5.json', name: 'Probability & Statistics' }
  ];
  
  let mathTopics = 0;
  mathPapers.forEach(paper => {
    const data = readJsonFile(paper.file);
    if (data && data.topics) {
      console.log(`  ${paper.name}: ${data.topics.length} 个主题`);
      mathTopics += data.topics.length;
    }
  });
  console.log(`  数学总计: ${mathTopics} 个主题\n`);
  totalTopics += mathTopics;
  totalSubjects++;
  
  // 进阶数学科目
  console.log('📊 进阶数学 (9231) 数据分析:');
  const furtherMathPapers = [
    { file: '9231FP1-syllabus.json', name: 'Further Pure 1' },
    { file: '9231FP2-syllabus.json', name: 'Further Pure 2' },
    { file: '9231FS-syllabus.json', name: 'Further Statistics' },
    { file: '9231FM-syllabus.json', name: 'Further Mechanics' }
  ];
  
  let furtherMathTopics = 0;
  furtherMathPapers.forEach(paper => {
    const data = readJsonFile(paper.file);
    if (data && data.topics) {
      console.log(`  ${paper.name}: ${data.topics.length} 个主题`);
      furtherMathTopics += data.topics.length;
    }
  });
  console.log(`  进阶数学总计: ${furtherMathTopics} 个主题\n`);
  totalTopics += furtherMathTopics;
  totalSubjects++;
  
  // 物理科目
  console.log('📊 物理 (9702) 数据分析:');
  const physicsData = readJsonFile('9702AS+A2.json');
  let physicsTopics = 0;
  if (physicsData) {
    const levels = ['AS', 'A2'];
    levels.forEach(level => {
      if (physicsData[level]) {
        Object.keys(physicsData[level]).forEach(paper => {
          if (physicsData[level][paper].topics) {
            console.log(`  ${level} ${paper}: ${physicsData[level][paper].topics.length} 个主题`);
            physicsTopics += physicsData[level][paper].topics.length;
          }
        });
      }
    });
  }
  console.log(`  物理总计: ${physicsTopics} 个主题\n`);
  totalTopics += physicsTopics;
  totalSubjects++;
  
  // 通用主题
  console.log('📊 通用主题数据分析:');
  const generalTopics = readJsonFile('topics.json');
  if (generalTopics) {
    console.log(`  通用主题: ${Object.keys(generalTopics).length} 个分类`);
    Object.keys(generalTopics).forEach(category => {
      if (Array.isArray(generalTopics[category])) {
        console.log(`    ${category}: ${generalTopics[category].length} 个主题`);
      }
    });
  }
  
  // 总结
  console.log('\n=== 数据总结 ===');
  console.log(`总科目数: ${totalSubjects}`);
  console.log(`总主题数: ${totalTopics}`);
  console.log(`预计数据库表: 3个主要表 (subjects, papers, topics)`);
  console.log(`预计迁移时间: 2-3分钟`);
  
  return {
    totalSubjects,
    totalTopics,
    subjects: [
      { code: '9709', name: 'Mathematics', topics: mathTopics },
      { code: '9231', name: 'Further Mathematics', topics: furtherMathTopics },
      { code: '9702', name: 'Physics', topics: physicsTopics }
    ]
  };
}

// 生成数据库迁移SQL
function generateMigrationSQL() {
  console.log('\n=== 数据库迁移SQL ===\n');
  
  const sql = `-- 数据库迁移准备SQL
-- 运行顺序:
-- 1. 运行 001_initial_schema.sql
-- 2. 运行 002_knowledge_graph.sql  
-- 3. 运行 003_insert_subjects.sql
-- 4. 运行 node scripts/migrate-data.js

-- 检查当前数据状态
SELECT 
  'subjects' as table_name, COUNT(*) as count FROM subjects
UNION ALL
SELECT 
  'papers' as table_name, COUNT(*) as count FROM papers
UNION ALL
SELECT 
  'topics' as table_name, COUNT(*) as count FROM topics;

-- 验证迁移结果
SELECT 
  s.code as subject_code,
  s.name as subject_name,
  COUNT(p.id) as paper_count,
  COUNT(t.id) as topic_count
FROM subjects s
LEFT JOIN papers p ON s.id = p.subject_id
LEFT JOIN topics t ON p.id = t.paper_id
GROUP BY s.id, s.code, s.name
ORDER BY s.code;`;
  
  console.log(sql);
  return sql;
}

// 创建数据迁移报告
function createMigrationReport() {
  console.log('=== 数据迁移报告 ===\n');
  
  const report = {
    timestamp: new Date().toISOString(),
    dataSources: {
      mathematics: {
        code: '9709',
        files: ['9709paper1.json', '9709paper3.json', '9709paper4.json', '9709paper5.json'],
        structure: '按试卷分类'
      },
      furtherMathematics: {
        code: '9231', 
        files: ['9231FP1-syllabus.json', '9231FP2-syllabus.json', '9231FS-syllabus.json', '9231FM-syllabus.json'],
        structure: '按模块分类'
      },
      physics: {
        code: '9702',
        files: ['9702AS+A2.json'],
        structure: '按AS/A2级别分类'
      }
    },
    migrationSteps: [
      '配置Supabase环境变量',
      '创建数据库表结构',
      '插入基础科目和试卷数据',
      '迁移主题内容数据',
      '建立知识图谱关系',
      '验证数据完整性'
    ]
  };
  
  console.log(JSON.stringify(report, null, 2));
  return report;
}

// 主函数
async function main() {
  console.log('🚀 开始CIE Copilot数据迁移演示...\n');
  
  const analysis = analyzeData();
  generateMigrationSQL();
  const report = createMigrationReport();
  
  console.log('\n✅ 演示完成！');
  console.log('下一步：');
  console.log('1. 确保Supabase项目已创建');
  console.log('2. 配置环境变量 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
  console.log('3. 运行数据库迁移脚本');
  console.log('4. 执行实际数据迁移');
  
  return { analysis, report };
}

// 如果直接运行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { analyzeData, generateMigrationSQL, createMigrationReport, main };