// 数据迁移脚本
// 将现有的JSON文件数据迁移到Supabase数据库

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 当您准备好使用Supabase时，取消注释以下导入
// import { supabase } from '../src/utils/supabase.js';

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

// 数学科目数据迁移
async function migrateMathematicsData() {
  console.log('开始迁移数学科目数据...');
  
  const papers = [
    { file: '9709paper1.json', code: 'paper1', name: 'Pure Mathematics 1' },
    { file: '9709paper3.json', code: 'paper3', name: 'Pure Mathematics 3' },
    { file: '9709paper4.json', code: 'paper4', name: 'Mechanics' },
    { file: '9709paper5.json', code: 'paper5', name: 'Probability & Statistics' }
  ];
  
  for (const paper of papers) {
    const data = readJsonFile(paper.file);
    if (!data) continue;
    
    console.log(`处理 ${paper.name} 数据...`);
    
    // TODO: 当Supabase配置完成后，取消注释以下代码
    /*
    try {
      // 获取数学科目ID
      const { data: subject } = await supabase
        .from('subjects')
        .select('id')
        .eq('code', '9709')
        .single();
      
      if (!subject) {
        console.error('未找到数学科目');
        continue;
      }
      
      // 获取试卷ID
      const { data: paperRecord } = await supabase
        .from('papers')
        .select('id')
        .eq('subject_id', subject.id)
        .eq('code', paper.code)
        .single();
      
      if (!paperRecord) {
        console.error(`未找到试卷: ${paper.code}`);
        continue;
      }
      
      // 迁移主题数据
      if (data.topics && Array.isArray(data.topics)) {
        for (const topic of data.topics) {
          const topicData = {
            paper_id: paperRecord.id,
            topic_id: topic.id,
            title: topic.title,
            content: {
              description: topic.description,
              keyPoints: topic.keyPoints,
              examples: topic.examples,
              exercises: topic.exercises
            },
            difficulty_level: topic.difficulty || 1,
            estimated_time: topic.estimatedTime || 30,
            tags: topic.tags || []
          };
          
          const { error } = await supabase
            .from('topics')
            .upsert(topicData, { onConflict: 'paper_id,topic_id' });
          
          if (error) {
            console.error(`插入主题 ${topic.title} 失败:`, error.message);
          } else {
            console.log(`✓ 主题 ${topic.title} 迁移成功`);
          }
        }
      }
    } catch (error) {
      console.error(`迁移 ${paper.name} 数据失败:`, error.message);
    }
    */
    
    // 临时：只显示数据结构
    console.log(`${paper.name} 包含 ${data.topics?.length || 0} 个主题`);
    if (data.topics && data.topics.length > 0) {
      console.log('主题示例:', data.topics[0].title);
    }
  }
}

// 进阶数学科目数据迁移
async function migrateFurtherMathematicsData() {
  console.log('\n开始迁移进阶数学科目数据...');
  
  const papers = [
    { file: '9231FP1-syllabus.json', code: 'FP1', name: 'Further Pure 1' },
    { file: '9231FP2-syllabus.json', code: 'FP2', name: 'Further Pure 2' },
    { file: '9231FS-syllabus.json', code: 'FS', name: 'Further Statistics' },
    { file: '9231FM-syllabus.json', code: 'FM', name: 'Further Mechanics' }
  ];
  
  for (const paper of papers) {
    const data = readJsonFile(paper.file);
    if (!data) continue;
    
    console.log(`处理 ${paper.name} 数据...`);
    
    // TODO: 类似数学科目的迁移逻辑
    console.log(`${paper.name} 包含 ${data.topics?.length || 0} 个主题`);
  }
}

// 物理科目数据迁移
async function migratePhysicsData() {
  console.log('\n开始迁移物理科目数据...');
  
  const data = readJsonFile('9702AS+A2.json');
  if (!data) return;
  
  console.log('处理物理数据...');
  
  // TODO: 物理数据迁移逻辑
  console.log(`物理数据结构:`, Object.keys(data));
}

// 迁移通用主题数据
async function migrateGeneralTopics() {
  console.log('\n开始迁移通用主题数据...');
  
  const data = readJsonFile('topics.json');
  if (!data) return;
  
  console.log('处理通用主题数据...');
  console.log(`通用主题数据结构:`, Object.keys(data));
}

// 验证数据完整性
async function validateMigratedData() {
  console.log('\n验证迁移数据完整性...');
  
  // TODO: 当Supabase配置完成后，添加数据验证逻辑
  /*
  try {
    // 检查科目数量
    const { count: subjectCount } = await supabase
      .from('subjects')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✓ 科目数量: ${subjectCount}`);
    
    // 检查试卷数量
    const { count: paperCount } = await supabase
      .from('papers')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✓ 试卷数量: ${paperCount}`);
    
    // 检查主题数量
    const { count: topicCount } = await supabase
      .from('topics')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✓ 主题数量: ${topicCount}`);
    
  } catch (error) {
    console.error('验证数据失败:', error.message);
  }
  */
  
  console.log('数据验证完成（需要Supabase配置后才能执行实际验证）');
}

// 主迁移函数
async function migrateAllData() {
  console.log('=== CIE Copilot 数据迁移工具 ===\n');
  
  try {
    // 检查Supabase配置
    // TODO: 取消注释以下代码当Supabase配置完成后
    /*
    if (!supabase) {
      console.error('Supabase未配置，请先完成Supabase设置');
      return;
    }
    */
    
    console.log('注意: 当前为演示模式，需要配置Supabase后才能执行实际迁移\n');
    
    // 执行迁移
    await migrateMathematicsData();
    await migrateFurtherMathematicsData();
    await migratePhysicsData();
    await migrateGeneralTopics();
    
    // 验证数据
    await validateMigratedData();
    
    console.log('\n=== 数据迁移完成 ===');
    
  } catch (error) {
    console.error('数据迁移失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateAllData();
}

export {
  migrateMathematicsData,
  migrateFurtherMathematicsData,
  migratePhysicsData,
  migrateGeneralTopics,
  validateMigratedData,
  migrateAllData
};