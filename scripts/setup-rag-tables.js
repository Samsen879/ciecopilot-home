import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Key not found. Make sure you have a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupRAGTables() {
  console.log('=== 设置RAG系统数据库表 ===\n');
  
  try {
    // 读取SQL文件
    const sqlPath = path.join(__dirname, '../database/migrations/004_rag_embeddings.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('正在执行RAG数据库迁移脚本...');
    
    // 执行SQL脚本
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    });
    
    if (error) {
      console.error('执行SQL脚本失败:', error.message);
      
      // 如果rpc方法不存在，尝试分段执行
      if (error.code === 'PGRST202') {
        console.log('\n尝试分段执行SQL语句...');
        await executeStepByStep(sqlContent);
      } else {
        throw error;
      }
    } else {
      console.log('✅ RAG数据库表创建成功');
      if (data) {
        console.log('执行结果:', data);
      }
    }
    
    // 验证表是否创建成功
    await verifyTables();
    
  } catch (error) {
    console.error('设置RAG表失败:', error.message);
    process.exit(1);
  }
}

async function executeStepByStep(sqlContent) {
  // 分解SQL语句
  const statements = sqlContent
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
  
  console.log(`准备执行 ${statements.length} 个SQL语句...\n`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // 跳过注释和空语句
    if (statement.startsWith('--') || statement.length < 10) {
      continue;
    }
    
    try {
      console.log(`执行语句 ${i + 1}/${statements.length}...`);
      
      // 对于CREATE EXTENSION，使用特殊处理
      if (statement.includes('CREATE EXTENSION')) {
        console.log('  跳过扩展创建（需要在Supabase控制台手动启用）');
        continue;
      }
      
      // 对于复杂的DO块，需要特殊处理
      if (statement.includes('DO $$')) {
        console.log('  执行复杂SQL块...');
      }
      
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      });
      
      if (error) {
        console.error(`  ❌ 语句执行失败: ${error.message}`);
        // 继续执行其他语句
      } else {
        console.log('  ✅ 执行成功');
      }
      
    } catch (err) {
      console.error(`  ❌ 语句执行异常: ${err.message}`);
    }
  }
}

async function verifyTables() {
  console.log('\n=== 验证RAG表创建结果 ===');
  
  const tables = ['rag_documents', 'rag_chunks', 'rag_embeddings'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: 表创建成功`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
  
  console.log('\n=== RAG系统表设置完成 ===');
  console.log('\n📝 注意事项:');
  console.log('1. 如果看到扩展相关错误，请在Supabase控制台手动启用pgvector扩展');
  console.log('2. 某些高级功能可能需要在Supabase SQL编辑器中手动执行');
  console.log('3. 建议在Supabase控制台验证所有表和索引是否正确创建');
}

setupRAGTables().catch(console.error);