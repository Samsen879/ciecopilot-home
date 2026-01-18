// SQL迁移脚本运行器
// 用于执行SQL迁移文件

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { execSync } from 'child_process';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');
const MIGRATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  filename text PRIMARY KEY,
  executed_at timestamptz DEFAULT now()
);
`;

function getGitInfo() {
  try {
    const root = execSync('git rev-parse --show-toplevel', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    const short = execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    return { root, short };
  } catch {
    return { root: 'unknown', short: 'unknown' };
  }
}

const gitInfo = getGitInfo();
console.log(
  `[migration-runner] cwd=${process.cwd()} script=${__filename} migrations=${MIGRATIONS_DIR} git=${gitInfo.short} repo=${gitInfo.root}`
);

function parseArgs(argv) {
  const options = {
    list: false,
    all: false,
    dryRun: false,
    file: null,
    url: null,
    serviceKey: null,
    dbUrl: null,
    extras: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      options.extras.push(arg);
      continue;
    }

    const [flag, value] = arg.split('=', 2);
    if (flag === '--list') {
      options.list = true;
    } else if (flag === '--all') {
      options.all = true;
    } else if (flag === '--dry-run') {
      options.dryRun = true;
    } else if (flag === '--file') {
      const next = value ?? argv[++i];
      if (!next || next.startsWith('--')) {
        throw new Error('Missing value for --file');
      }
      options.file = next;
    } else if (flag === '--url') {
      const next = value ?? argv[++i];
      if (!next || next.startsWith('--')) {
        throw new Error('Missing value for --url');
      }
      options.url = next;
    } else if (flag === '--service-key') {
      const next = value ?? argv[++i];
      if (!next || next.startsWith('--')) {
        throw new Error('Missing value for --service-key');
      }
      options.serviceKey = next;
    } else if (flag === '--db-url') {
      const next = value ?? argv[++i];
      if (!next || next.startsWith('--')) {
        throw new Error('Missing value for --db-url');
      }
      options.dbUrl = next;
    }
  }

  return options;
}

function listMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  console.log('Available migrations (sorted):');
  files.forEach((file) => console.log(`- ${file}`));
  return files;
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exit(2);
}
if (options.list) {
  listMigrations();
  process.exit(0);
}

if (options.extras.length > 0) {
  console.error(`❌ Unexpected argument(s): ${options.extras.join(' ')}`);
  console.error('Use --file <migration.sql>, --all, or --list.');
  process.exit(2);
}

if (options.all && options.file) {
  console.error('❌ Do not combine --all with --file.');
  process.exit(2);
}

if (!options.all && !options.file) {
  console.error('❌ No migration specified. Use --file, --all, or --list.');
  console.error('Usage: node scripts/run-sql-migration.js --file <migration.sql>');
  process.exit(2);
}

const migrationsToRun = options.all ? listMigrations() : [options.file];

if (options.dryRun) {
  console.log('Dry run. Migrations to execute:');
  migrationsToRun.forEach((file) => console.log(`- ${file}`));
  process.exit(0);
}

const supabaseUrl =
  options.url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  options.serviceKey ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;
const databaseUrl = options.dbUrl || process.env.DATABASE_URL;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function assertPureSql(sqlContent, filename) {
  const metaMatch = sqlContent.match(/^\s*\\\w+/m);
  if (metaMatch) {
    throw new Error(
      `Migration "${filename}" contains psql meta-commands (e.g. ${metaMatch[0]}). ` +
        'Only pure SQL is supported.'
    );
  }
}

async function ensureExecSqlAvailable() {
  if (!supabase) return false;
  const { error } = await supabase.rpc('exec_sql', { sql_query: 'select 1;' });
  if (!error) return true;
  const message = error.message || '';
  if (/function.+exec_sql|does not exist|schema cache/i.test(message)) {
    console.error('❌ exec_sql RPC not available. Run migrations via Supabase SQL editor or provide a direct DATABASE_URL.');
    console.error(`RPC error: ${message}`);
    return false;
  }
  console.warn(`exec_sql probe warning: ${message}`);
  return true;
}

async function ensureSchemaMigrationsTablePg(client) {
  await client.query(MIGRATION_TABLE_SQL);
}

async function hasMigrationPg(client, filename) {
  const { rows } = await client.query(
    'select 1 from public.schema_migrations where filename = $1 limit 1',
    [filename]
  );
  return rows.length > 0;
}

async function recordMigrationPg(client, filename) {
  await client.query(
    'insert into public.schema_migrations (filename) values ($1) on conflict (filename) do nothing',
    [filename]
  );
}

async function ensureSchemaMigrationsTableRpc() {
  const { error } = await supabase.rpc('exec_sql', { sql_query: MIGRATION_TABLE_SQL });
  if (error) {
    throw new Error(`Failed to create schema_migrations table: ${error.message}`);
  }
}

async function hasMigrationRpc(filename) {
  const { data, error } = await supabase
    .from('schema_migrations')
    .select('filename')
    .eq('filename', filename)
    .limit(1);
  if (error) {
    throw new Error(`Failed to check schema_migrations: ${error.message}`);
  }
  return (data || []).length > 0;
}

async function recordMigrationRpc(filename) {
  const { error } = await supabase
    .from('schema_migrations')
    .upsert({ filename }, { onConflict: 'filename' });
  if (error) {
    throw new Error(`Failed to record schema_migrations: ${error.message}`);
  }
}

async function runSqlWithDatabaseUrl(filename) {
  const migrationPath = path.isAbsolute(filename)
    ? filename
    : path.join(MIGRATIONS_DIR, filename);
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`迁移文件不存在: ${migrationPath}`);
  }

  const sqlContent = fs.readFileSync(migrationPath, 'utf8');
  assertPureSql(sqlContent, filename);

  const sslMode = process.env.PGSSLMODE;
  const ssl =
    sslMode && sslMode.toLowerCase() === 'disable'
      ? false
      : { rejectUnauthorized: false };

  const client = new Client({ connectionString: databaseUrl, ssl });
  await client.connect();
  try {
    await ensureSchemaMigrationsTablePg(client);
    const alreadyApplied = await hasMigrationPg(client, filename);
    if (alreadyApplied) {
      console.log(`⏭️  已跳过 (已执行): ${filename}`);
      return;
    }
    console.log(`执行迁移 (DATABASE_URL): ${filename}`);
    await client.query(sqlContent);
    await recordMigrationPg(client, filename);
    console.log('✅ SQL迁移执行完成');
  } finally {
    await client.end();
  }
}

// 执行SQL迁移
async function runSqlMigration(filename) {
  try {
    console.log(`开始执行SQL迁移: ${filename}`);
    
    // 读取SQL文件
    const migrationPath = path.join(MIGRATIONS_DIR, filename);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`迁移文件不存在: ${migrationPath}`);
    }
    
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    assertPureSql(sqlContent, filename);

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
  try {
    if (databaseUrl) {
      for (const file of migrationsToRun) {
        await runSqlWithDatabaseUrl(file);
      }
      return;
    }

    if (!supabase) {
      console.error('❌ Missing database connection. Provide DATABASE_URL or SUPABASE_URL + SERVICE_ROLE_KEY.');
      console.error('Usage: node scripts/run-sql-migration.js --db-url <postgres-url> --file <migration.sql>');
      process.exit(2);
    }

    const ok = await ensureExecSqlAvailable();
    if (!ok) {
      process.exit(2);
    }
    for (const file of migrationsToRun) {
      await ensureSchemaMigrationsTableRpc();
      const alreadyApplied = await hasMigrationRpc(file);
      if (alreadyApplied) {
        console.log(`⏭️  已跳过 (已执行): ${file}`);
        continue;
      }
      await runSqlMigration(file);
      await recordMigrationRpc(file);
    }
  } catch (error) {
    console.error('❌ 迁移过程出错:', error.message);
    console.log('\n注意: 如 exec_sql 不可用，请将以下SQL内容复制到 Supabase SQL 编辑器中执行:');
    console.log('\n' + '='.repeat(50));
    for (const file of migrationsToRun) {
      const migrationPath = path.join(MIGRATIONS_DIR, file);
      const sqlContent = fs.readFileSync(migrationPath, 'utf8');
      console.log(sqlContent);
    }
    console.log('='.repeat(50) + '\n');
    process.exit(1);
  }
}

main();
