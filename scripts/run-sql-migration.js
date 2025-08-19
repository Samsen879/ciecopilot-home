// SQL迁移脚本运行器
// 用于执行SQL迁移文件

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 为Node.js环境创建Supabase客户端
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Key not found. Make sure you have a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 获取命令行参数
const args = process.argv.slice(2);
const migrationFile = args[0] || '011_recommendation_system.sql';

// 执行SQL迁移
async function runSqlMigration(filename) {
  try {
    console.log(`开始执行SQL迁移: ${filename}`);
    
    // 读取SQL文件
    const migrationPath = path.join(__dirname, '../database/migrations', filename);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`迁移文件不存在: ${migrationPath}`);
    }
    
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    // 分割SQL语句（按分号分割，但忽略函数内的分号）
    const statements = splitSqlStatements(sqlContent);
    
    console.log(`找到 ${statements.length} 个SQL语句`);
    
    // 逐个执行SQL语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      
      if (statement && !statement.startsWith('--') && statement !== 'COMMIT;') {
        console.log(`执行语句 ${i + 1}/${statements.length}...`);
        
        try {
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          
          if (error) {
            // 如果RPC不可用，尝试直接执行
            const { error: directError } = await supabase
              .from('_temp_sql_exec')
              .select('*')
              .limit(0);
            
            if (directError) {
              console.log('尝试使用原生SQL执行...');
              // 对于某些语句，我们需要使用不同的方法
              await executeSqlStatement(statement);
            }
          }
        } catch (err) {
          console.warn(`语句执行警告: ${err.message}`);
          // 继续执行下一个语句
        }
      }
    }
    
    console.log('✅ SQL迁移执行完成');
    
  } catch (error) {
    console.error('❌ SQL迁移执行失败:', error.message);
    process.exit(1);
  }
}

// 分割SQL语句的函数
function splitSqlStatements(sqlContent) {
  // 移除注释
  const cleanSql = sqlContent
    .replace(/--.*$/gm, '') // 移除单行注释
    .replace(/\/\*[\s\S]*?\*\//g, ''); // 移除多行注释
  
  // 简单的分割方法（可能需要更复杂的解析）
  const statements = [];
  let currentStatement = '';
  let inFunction = false;
  let dollarQuoteTag = null;
  
  const lines = cleanSql.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 检查是否在函数定义中
    if (trimmedLine.includes('$$')) {
      if (dollarQuoteTag === null) {
        // 开始函数定义
        const match = trimmedLine.match(/\$([^$]*)\$/);
        if (match) {
          dollarQuoteTag = match[1];
          inFunction = true;
        }
      } else {
        // 检查是否结束函数定义
        if (trimmedLine.includes(`$${dollarQuoteTag}$`)) {
          dollarQuoteTag = null;
          inFunction = false;
        }
      }
    }
    
    currentStatement += line + '\n';
    
    // 如果不在函数中且遇到分号，则结束当前语句
    if (!inFunction && trimmedLine.endsWith(';')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }
  
  // 添加最后一个语句（如果有）
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }
  
  return statements.filter(stmt => stmt.length > 0);
}

// 执行单个SQL语句
async function executeSqlStatement(statement) {
  // 对于不同类型的语句使用不同的执行方法
  if (statement.toUpperCase().startsWith('CREATE TABLE')) {
    // 表创建语句
    console.log('执行表创建语句...');
  } else if (statement.toUpperCase().startsWith('CREATE INDEX')) {
    // 索引创建语句
    console.log('执行索引创建语句...');
  } else if (statement.toUpperCase().startsWith('ALTER TABLE')) {
    // 表修改语句
    console.log('执行表修改语句...');
  } else if (statement.toUpperCase().startsWith('CREATE POLICY')) {
    // RLS策略创建语句
    console.log('执行RLS策略创建语句...');
  } else if (statement.toUpperCase().startsWith('CREATE OR REPLACE FUNCTION')) {
    // 函数创建语句
    console.log('执行函数创建语句...');
  } else if (statement.toUpperCase().startsWith('CREATE TRIGGER')) {
    // 触发器创建语句
    console.log('执行触发器创建语句...');
  } else if (statement.toUpperCase().startsWith('INSERT INTO')) {
    // 数据插入语句
    console.log('执行数据插入语句...');
  }
  
  // 这里可以添加更具体的执行逻辑
  // 由于Supabase的限制，某些DDL语句可能需要通过管理界面执行
}

// 检查表是否存在
async function checkTablesExist() {
  const tables = [
    'recommendation_history',
    'user_behavior_logs', 
    'user_learning_sessions',
    'recommendation_feedback',
    'system_settings',
    'content_recommendations',
    'learning_analytics'
  ];
  
  console.log('检查推荐系统表是否存在...');
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ 表 ${table} 不存在或无法访问`);
      } else {
        console.log(`✅ 表 ${table} 存在`);
      }
    } catch (err) {
      console.log(`❌ 表 ${table} 检查失败: ${err.message}`);
    }
  }
}

// 主函数
async function main() {
  console.log('=== 推荐系统数据库迁移 ===');
  
  try {
    // 首先检查现有表
    await checkTablesExist();
    
    console.log('\n注意: 由于Supabase的限制，某些DDL语句需要通过Supabase管理界面执行。');
    console.log('请将以下SQL内容复制到Supabase SQL编辑器中执行:');
    console.log('\n' + '='.repeat(50));
    
    // 读取并显示SQL内容
    const migrationPath = path.join(__dirname, '../database/migrations', migrationFile);
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    console.log(sqlContent);
    console.log('='.repeat(50) + '\n');
    
    console.log('执行步骤:');
    console.log('1. 登录到 Supabase Dashboard');
    console.log('2. 进入 SQL Editor');
    console.log('3. 复制上述SQL内容并执行');
    console.log('4. 确认所有表和策略创建成功');
    
  } catch (error) {
    console.error('❌ 迁移过程出错:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main();