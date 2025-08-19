#!/usr/bin/env node

/**
 * Agent B (前端) 快速环境配置脚本
 * 用途：帮助Agent B快速配置开发环境
 * 使用：node scripts/setup-agent-b.js
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}${prompt}${colors.reset}`, resolve);
  });
}

async function main() {
  log('🎨 Agent B (前端) 开发环境配置向导', 'bright');
  log('=' .repeat(50), 'blue');
  
  try {
    // 检查项目根目录
    const projectRoot = process.cwd();
    const packageJsonPath = path.join(projectRoot, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      log('❌ 错误：未找到package.json文件，请在项目根目录运行此脚本', 'red');
      process.exit(1);
    }
    
    log('✅ 项目根目录确认', 'green');
    
    // 检查环境变量模板
    const envTemplatePath = path.join(projectRoot, '.env.example');
    const envLocalPath = path.join(projectRoot, '.env.local');
    
    if (!fs.existsSync(envTemplatePath)) {
      log('⚠️  未找到.env.example模板文件，将创建默认配置', 'yellow');
      await createDefaultEnvTemplate(envTemplatePath);
    }
    
    log('✅ 环境变量模板文件存在', 'green');
    
    // 检查是否已存在.env.local
    if (fs.existsSync(envLocalPath)) {
      const overwrite = await question('⚠️  .env.local文件已存在，是否覆盖？(y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        log('📝 跳过环境变量配置，使用现有文件', 'yellow');
      } else {
        await setupEnvironmentVariables(envTemplatePath, envLocalPath);
      }
    } else {
      await setupEnvironmentVariables(envTemplatePath, envLocalPath);
    }
    
    // 检查依赖安装
    const nodeModulesPath = path.join(projectRoot, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      log('📦 检测到未安装依赖，正在安装...', 'yellow');

      
      await new Promise((resolve, reject) => {
        const npm = spawn('npm', ['install'], { stdio: 'inherit' });
        npm.on('close', (code) => {
          if (code === 0) {
            log('✅ 依赖安装完成', 'green');
            resolve();
          } else {
            log('❌ 依赖安装失败', 'red');
            reject(new Error('npm install failed'));
          }
        });
      });
    } else {
      log('✅ 依赖已安装', 'green');
    }
    
    // 显示下一步操作
    log('\n🎉 Agent B 开发环境配置完成！', 'bright');
    log('=' .repeat(50), 'blue');
    log('📋 下一步操作：', 'bright');
    log('1. 编辑 .env.local 文件，填入实际的API密钥', 'cyan');
    log('2. 运行 npm run dev 启动开发服务器', 'cyan');
    log('3. 访问 http://localhost:5173 查看应用', 'cyan');
    log('4. 参考 docs/6A_Agent_Collab/AGENT_B_DEVELOPMENT_GUIDE.md 开始开发', 'cyan');
    
    log('\n🔧 重要配置项：', 'bright');
    log('• VITE_SUPABASE_URL: Supabase项目URL', 'yellow');
    log('• VITE_SUPABASE_ANON_KEY: Supabase匿名密钥', 'yellow');
    log('• VITE_OPENAI_API_KEY: OpenAI API密钥', 'yellow');
    
    log('\n📚 参考文档：', 'bright');
    log('• Agent B开发指南: docs/6A_Agent_Collab/AGENT_B_DEVELOPMENT_GUIDE.md', 'magenta');
    log('• API接口约定: docs/6A_Agent_Collab/API_CONTRACTS.md', 'magenta');
    log('• 协作框架: docs/6A_Agent_Collab/AGENT_COLLABORATION_FRAMEWORK.md', 'magenta');
    
  } catch (error) {
    log(`❌ 配置过程中发生错误: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    rl.close();
  }
}

async function createDefaultEnvTemplate(templatePath) {
  const defaultTemplate = `# Agent B (前端) 环境变量配置模板
# 复制此文件为 .env.local 并填入实际值

# === 必需配置 ===

# Supabase 配置
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# OpenAI API 配置
VITE_OPENAI_API_KEY=sk-your-openai-api-key

# === 可选配置 ===

# 调试模式 (true/false)
VITE_DEBUG_MODE=true

# 动画效果 (true/false) 
VITE_ENABLE_ANIMATIONS=true

# API 基础URL (如果使用自定义后端)
VITE_API_BASE_URL=http://localhost:3000

# 应用配置
VITE_APP_NAME=CIE Copilot
VITE_APP_VERSION=0.1.0

# 开发环境配置
VITE_DEV_MODE=true
VITE_LOG_LEVEL=debug

# === 高级配置 ===

# 缓存配置
VITE_ENABLE_QUERY_CACHE=true
VITE_CACHE_TIMEOUT=300000

# UI 配置
VITE_THEME=auto
VITE_DEFAULT_LANGUAGE=zh-CN

# 性能配置
VITE_ENABLE_VIRTUAL_SCROLLING=true
VITE_MAX_CHAT_HISTORY=100`;

  fs.writeFileSync(templatePath, defaultTemplate);
  log('✅ 已创建默认环境变量模板', 'green');
}

async function setupEnvironmentVariables(templatePath, targetPath) {
  log('\n🔧 配置环境变量...', 'bright');
  
  // 读取模板文件
  const template = fs.readFileSync(templatePath, 'utf8');
  
  // 交互式配置关键变量
  const config = {};
  
  log('\n请输入以下配置信息（按回车跳过使用默认值）：', 'yellow');
  
  // Supabase配置
  log('\n📡 Supabase配置：', 'bright');
  config.VITE_SUPABASE_URL = await question('Supabase URL: ');
  config.VITE_SUPABASE_ANON_KEY = await question('Supabase匿名密钥: ');
  
  // OpenAI配置
  log('\n🤖 OpenAI配置：', 'bright');
  config.VITE_OPENAI_API_KEY = await question('OpenAI API密钥: ');
  
  // 可选配置
  log('\n⚙️  可选配置（按回车使用默认值）：', 'bright');
  const enableDebug = await question('启用调试模式？(Y/n): ');
  config.VITE_DEBUG_MODE = enableDebug.toLowerCase() !== 'n' ? 'true' : 'false';
  
  const enableAnimations = await question('启用动画效果？(Y/n): ');
  config.VITE_ENABLE_ANIMATIONS = enableAnimations.toLowerCase() !== 'n' ? 'true' : 'false';
  
  // 替换模板中的值
  let envContent = template;
  
  for (const [key, value] of Object.entries(config)) {
    if (value) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      envContent = envContent.replace(regex, `${key}=${value}`);
    }
  }
  
  // 写入.env.local文件
  fs.writeFileSync(targetPath, envContent);
  log('✅ 环境变量配置文件已创建: .env.local', 'green');
  
  // 检查必需变量
  const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_OPENAI_API_KEY'];
  const missingVars = requiredVars.filter(varName => !config[varName]);
  
  if (missingVars.length > 0) {
    log('\n⚠️  警告：以下必需变量未配置，请手动编辑.env.local文件：', 'yellow');
    missingVars.forEach(varName => {
      log(`   • ${varName}`, 'yellow');
    });
  }
}

// 处理脚本退出
process.on('SIGINT', () => {
  log('\n\n👋 配置已取消', 'yellow');
  rl.close();
  process.exit(0);
});

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    log(`❌ 未处理的错误: ${error.message}`, 'red');
    process.exit(1);
  });
}

export { main };