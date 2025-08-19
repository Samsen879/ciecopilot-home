// 数据迁移脚本
// 将现有的JSON文件数据迁移到Supabase数据库

import 'dotenv/config'; // 在所有代码之前加载环境变量
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 为Node.js环境创建Supabase客户端
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Key not found. Make sure you have a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
    
    // 启用Supabase集成的代码
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
      
      // 处理数学科目的特殊JSON格式
      // 数学JSON格式: { "9709_Paper_X": [{ "topic": "主题名", "cards": [...] }] }
      const paperKey = Object.keys(data)[0]; // 获取第一个键，如 "9709_Paper_1_Pure_Mathematics_1"
      const topicsArray = data[paperKey];
      
      if (topicsArray && Array.isArray(topicsArray)) {
        for (let i = 0; i < topicsArray.length; i++) {
          const topicGroup = topicsArray[i];
          const topicName = topicGroup.topic;
          const cards = topicGroup.cards || [];
          
          // 生成唯一的topic_id
          const topicId = `${paper.code}_${topicName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          
          // 将cards转换为内容描述
          const description = cards.map(card => card.title).join('; ');
          const keyPoints = cards.flatMap(card => card.details || []);
          
          const topicData = {
            paper_id: paperRecord.id,
            topic_id: topicId,
            title: topicName,
            content: {
              description: description,
              keyPoints: keyPoints,
              cards: cards, // 保留原始卡片数据
              examples: [],
              exercises: []
            },
            difficulty_level: 1,
            estimated_time: 30,
            tags: [paper.code, 'mathematics']
          };
          
          const { error } = await supabase
            .from('topics')
            .upsert(topicData, { onConflict: 'paper_id,topic_id' });
          
          if (error) {
            console.error(`插入主题 ${topicName} 失败:`, error.message);
          } else {
            console.log(`✓ 主题 ${topicName} 迁移成功`);
          }
        }
      } else {
        console.log(`${paper.name}: 未找到有效的主题数据`);
      }
    } catch (error) {
      console.error(`迁移 ${paper.name} 数据失败:`, error.message);
    }
    
    // 显示数据结构信息
    const paperKey = Object.keys(data)[0];
    const topicsArray = data[paperKey];
    console.log(`${paper.name} 包含 ${topicsArray?.length || 0} 个主题`);
    if (topicsArray && topicsArray.length > 0) {
      console.log('主题示例:', topicsArray[0].topic);
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
    
    try {
      // 获取进阶数学科目ID
      const { data: subject } = await supabase
        .from('subjects')
        .select('id')
        .eq('code', '9231')
        .single();
      
      if (!subject) {
        console.error('未找到进阶数学科目');
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
      
      // 处理进阶数学科目的特殊JSON格式
      // 进阶数学JSON格式: { "9231_Paper_X": [{ "topic": "主题名", "cards": [...] }] }
      const paperKey = Object.keys(data)[0]; // 获取第一个键
      const topicsArray = data[paperKey];
      
      if (topicsArray && Array.isArray(topicsArray)) {
        for (let i = 0; i < topicsArray.length; i++) {
          const topicGroup = topicsArray[i];
          const topicName = topicGroup.topic;
          const cards = topicGroup.cards || [];
          
          // 生成唯一的topic_id
          const topicId = `${paper.code}_${topicName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          
          // 将cards转换为内容描述
          const description = cards.map(card => card.title).join('; ');
          const keyPoints = cards.flatMap(card => card.details || []);
          
          const topicData = {
            paper_id: paperRecord.id,
            topic_id: topicId,
            title: topicName,
            content: {
              description: description,
              keyPoints: keyPoints,
              cards: cards, // 保留原始卡片数据
              examples: [],
              exercises: []
            },
            difficulty_level: 1,
            estimated_time: 45,
            tags: []
          };
          
          const { error } = await supabase
            .from('topics')
            .upsert(topicData, { onConflict: 'paper_id,topic_id' });
          
          if (error) {
            console.error(`插入主题 ${topicName} 失败:`, error.message);
          } else {
            console.log(`✓ 主题 ${topicName} 迁移成功`);
          }
        }
      } else {
        console.log(`${paper.name}: 未找到有效的主题数据`);
      }
    } catch (error) {
      console.error(`迁移 ${paper.name} 数据失败:`, error.message);
    }
    
    // 显示数据结构信息
    const paperKey = Object.keys(data)[0];
    const topicsArray = data[paperKey];
    console.log(`${paper.name} 包含 ${topicsArray?.length || 0} 个主题`);
    if (topicsArray && topicsArray.length > 0) {
      console.log('主题示例:', topicsArray[0].topic);
    }
  }
}

// 物理科目数据迁移
async function migratePhysicsData() {
  console.log('\n开始迁移物理科目数据...');
  
  const data = readJsonFile('9702AS+A2.json');
  if (!data) return;
  
  console.log('处理物理数据...');
  
  try {
    // 获取物理科目ID
    const { data: subject } = await supabase
      .from('subjects')
      .select('id')
      .eq('code', '9702')
      .single();
    
    if (!subject) {
      console.error('未找到物理科目');
      return;
    }
    
    // 处理AS和A2级别的数据
    const levels = ['AS', 'A2'];
    for (const level of levels) {
      const levelData = data[level];
      if (!levelData) continue;
      
      // 处理各个paper
      for (const [paperCode, paperData] of Object.entries(levelData)) {
        if (!paperData.topics) continue;
        
        // 获取试卷ID
        const { data: paperRecord } = await supabase
          .from('papers')
          .select('id')
          .eq('subject_id', subject.id)
          .eq('code', paperCode.toLowerCase())
          .single();
        
        if (!paperRecord) {
          console.error(`未找到试卷: ${paperCode}`);
          continue;
        }
        
        // 迁移主题数据
        for (const topic of paperData.topics) {
          const topicData = {
            paper_id: paperRecord.id,
            topic_id: topic.id || topic.topicId,
            title: topic.title || topic.name,
            content: {
              description: topic.description || topic.content,
              keyPoints: topic.keyPoints || topic.key_points,
              examples: topic.examples || [],
              exercises: topic.exercises || []
            },
            difficulty_level: topic.difficulty || 1,
            estimated_time: topic.estimatedTime || 45,
            tags: topic.tags || []
          };
          
          const { error } = await supabase
            .from('topics')
            .upsert(topicData, { onConflict: 'paper_id,topic_id' });
          
          if (error) {
            console.error(`插入主题 ${topic.title || topic.name} 失败:`, error.message);
          } else {
            console.log(`✓ 主题 ${topic.title || topic.name} 迁移成功`);
          }
        }
      }
    }
  } catch (error) {
    console.error('迁移物理数据失败:', error.message);
  }
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
  
  // 数据验证逻辑
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
    
    console.log('数据验证完成');
  } catch (error) {
    console.error('验证数据失败:', error.message);
  }
}

// 主迁移函数
async function migrateAllData() {
  console.log('=== CIE Copilot 数据迁移工具 ===\n');
  
  try {
    // 检查Supabase配置
    if (!supabase) {
      console.error('Supabase客户端初始化失败，请检查环境变量。');
      return;
    }
    
    console.log('Supabase客户端已连接，开始执行实际迁移...\n');
    
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
// (简单检查，确保在被导入时不会自动运行)
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
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
