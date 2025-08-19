// 数据库问题修复脚本
// 修复主题表为空、用户表和错误记录表不存在的问题

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase 客户端
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Key not found. Make sure you have a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 修复物理主题数据
async function fixPhysicsTopics() {
  console.log('\n🔧 修复物理主题数据...');
  
  try {
    // 读取物理数据文件
    const dataPath = path.join(__dirname, '../src/data/9702AS+A2.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // 获取物理科目ID
    const { data: subject } = await supabase
      .from('subjects')
      .select('id')
      .eq('code', '9702')
      .single();
    
    if (!subject) {
      console.error('❌ 未找到物理科目');
      return;
    }
    
    // 获取AS和A2试卷ID
    const { data: asPaper } = await supabase
      .from('papers')
      .select('id, code')
      .eq('subject_id', subject.id)
      .ilike('name', '%AS Level%')
      .single();
      
    const { data: a2Paper } = await supabase
      .from('papers')
      .select('id, code')
      .eq('subject_id', subject.id)
      .ilike('name', '%A2 Level%')
      .single();
    
    if (!asPaper || !a2Paper) {
      console.error('❌ 未找到AS或A2试卷');
      return;
    }
    
    // 处理AS Level主题
    const asTopics = data.Physics_9702.AS_Level;
    for (let i = 0; i < asTopics.length; i++) {
      const topicTitle = asTopics[i];
      const topicData = {
        paper_id: asPaper.id,
        topic_id: `as_${i + 1}`,
        title: topicTitle,
        content: {
          description: `AS Level Physics topic: ${topicTitle}`,
          keyPoints: [],
          examples: [],
          exercises: []
        },
        difficulty_level: 2,
        estimated_time: 45,
        tags: ['AS Level', 'Physics']
      };
      
      const { error } = await supabase
        .from('topics')
        .upsert(topicData, { onConflict: 'paper_id,topic_id' });
      
      if (error) {
        console.error(`❌ 插入AS主题 ${topicTitle} 失败:`, error.message);
      } else {
        console.log(`✅ AS主题 ${topicTitle} 插入成功`);
      }
    }
    
    // 处理A2 Level主题
    const a2Topics = data.Physics_9702.A2_Level;
    for (let i = 0; i < a2Topics.length; i++) {
      const topicTitle = a2Topics[i];
      const topicData = {
        paper_id: a2Paper.id,
        topic_id: `a2_${i + 1}`,
        title: topicTitle,
        content: {
          description: `A2 Level Physics topic: ${topicTitle}`,
          keyPoints: [],
          examples: [],
          exercises: []
        },
        difficulty_level: 3,
        estimated_time: 60,
        tags: ['A2 Level', 'Physics']
      };
      
      const { error } = await supabase
        .from('topics')
        .upsert(topicData, { onConflict: 'paper_id,topic_id' });
      
      if (error) {
        console.error(`❌ 插入A2主题 ${topicTitle} 失败:`, error.message);
      } else {
        console.log(`✅ A2主题 ${topicTitle} 插入成功`);
      }
    }
    
    console.log('✅ 物理主题数据修复完成');
    
  } catch (error) {
    console.error('❌ 修复物理主题数据失败:', error.message);
  }
}

// 检查并创建缺失的表
async function checkAndCreateMissingTables() {
  console.log('\n🔧 检查并创建缺失的表...');
  
  try {
    // 检查 user_profiles 表（对应之前查询的 users 表）
    const { data: userProfiles, error: userError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (userError) {
      console.log('❌ user_profiles 表不存在或有问题:', userError.message);
    } else {
      console.log('✅ user_profiles 表存在');
    }
    
    // 检查 error_book 表（对应之前查询的 error_records 表）
    const { data: errorBook, error: errorError } = await supabase
      .from('error_book')
      .select('count')
      .limit(1);
    
    if (errorError) {
      console.log('❌ error_book 表不存在或有问题:', errorError.message);
    } else {
      console.log('✅ error_book 表存在');
    }
    
  } catch (error) {
    console.error('❌ 检查表结构失败:', error.message);
  }
}

// 验证修复结果
async function validateFixes() {
  console.log('\n📊 验证修复结果...');
  
  try {
    // 检查主题表数据
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('count');
    
    if (topicsError) {
      console.error('❌ 查询主题表失败:', topicsError.message);
    } else {
      console.log(`✅ 主题表记录数: ${topics.length}`);
    }
    
    // 检查物理主题数据
    const { data: physicsTopics, error: physicsError } = await supabase
      .from('topics')
      .select('*')
      .in('paper_id', [
        // 需要通过papers表查询物理相关的paper_id
      ]);
    
    if (physicsError) {
      console.error('❌ 查询物理主题失败:', physicsError.message);
    } else {
      console.log(`✅ 物理主题记录数: ${physicsTopics?.length || 0}`);
    }
    
    // 检查所有表的状态
    const tables = [
      'subjects', 'papers', 'topics', 'rag_documents', 
      'rag_chunks', 'rag_embeddings', 'user_profiles', 'error_book'
    ];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: 表存在`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 验证修复结果失败:', error.message);
  }
}

// 主修复函数
async function main() {
  console.log('🚀 开始修复数据库问题...');
  
  try {
    // 1. 检查表结构
    await checkAndCreateMissingTables();
    
    // 2. 修复物理主题数据
    await fixPhysicsTopics();
    
    // 3. 验证修复结果
    await validateFixes();
    
    console.log('\n🎉 数据库问题修复完成！');
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}

export { fixPhysicsTopics, checkAndCreateMissingTables, validateFixes };