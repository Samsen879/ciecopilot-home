#!/usr/bin/env node

/**
 * Agent B API集成测试工具
 * 用途：验证前端与Agent A后端API的集成状态
 * 使用：node scripts/test-api-integration.js
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 颜色输出
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

// 加载环境变量
function loadEnvVariables() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    log('❌ 未找到.env.local文件，请先运行 node scripts/setup-agent-b.js', 'red');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  });
  
  return envVars;
}

// HTTP请求工具
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Agent-B-API-Tester/1.0',
        ...options.headers
      }
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// 测试用例
const testCases = [
  {
    name: 'Supabase连接测试',
    test: async (env) => {
      if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('Supabase配置缺失');
      }
      
      const response = await makeRequest(`${env.VITE_SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      
      if (response.status === 200) {
        return { success: true, message: 'Supabase连接正常' };
      } else {
        throw new Error(`Supabase连接失败: HTTP ${response.status}`);
      }
    }
  },
  
  {
    name: 'OpenAI API测试',
    test: async (env) => {
      if (!env.VITE_OPENAI_API_KEY) {
        throw new Error('OpenAI API密钥缺失');
      }
      
      const baseUrl = env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1';
      
      const response = await makeRequest(`${baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${env.VITE_OPENAI_API_KEY}`
        }
      });
      
      if (response.status === 200 && response.data.data) {
        return { 
          success: true, 
          message: `OpenAI API连接正常，可用模型数量: ${response.data.data.length}` 
        };
      } else {
        throw new Error(`OpenAI API连接失败: HTTP ${response.status}`);
      }
    }
  },
  
  {
    name: 'AI辅导对话接口测试',
    test: async (env) => {
      const baseUrl = env.VITE_API_BASE_URL || 'http://localhost:3000';
      
      const testPayload = {
        message: '什么是二次函数？',
        context: {
          subject_code: '9709',
          difficulty_level: 'beginner',
          learning_style: 'visual'
        }
      };
      
      try {
        const response = await makeRequest(`${baseUrl}/api/ai/tutor/chat`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY || 'test-token'}`
          },
          body: testPayload
        });
        
        if (response.status === 200 && response.data.success) {
          return { 
            success: true, 
            message: 'AI辅导接口响应正常' 
          };
        } else if (response.status === 404) {
          return { 
            success: false, 
            message: 'AI辅导接口未实现 (Agent A待开发)',
            warning: true
          };
        } else {
          throw new Error(`接口错误: HTTP ${response.status}`);
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          return { 
            success: false, 
            message: '后端服务未启动 (Agent A需要启动服务)',
            warning: true
          };
        }
        throw error;
      }
    }
  },
  
  {
    name: '知识点缺陷分析接口测试',
    test: async (env) => {
      const baseUrl = env.VITE_API_BASE_URL || 'http://localhost:3000';
      
      const testPayload = {
        user_id: 'test-user-123',
        subject_code: '9709',
        recent_interactions: 10
      };
      
      try {
        const response = await makeRequest(`${baseUrl}/api/ai/analyze/knowledge-gaps`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY || 'test-token'}`
          },
          body: testPayload
        });
        
        if (response.status === 200 && response.data.success) {
          return { 
            success: true, 
            message: '知识缺陷分析接口响应正常' 
          };
        } else if (response.status === 404) {
          return { 
            success: false, 
            message: '知识缺陷分析接口未实现 (Agent A待开发)',
            warning: true
          };
        } else {
          throw new Error(`接口错误: HTTP ${response.status}`);
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          return { 
            success: false, 
            message: '后端服务未启动 (Agent A需要启动服务)',
            warning: true
          };
        }
        throw error;
      }
    }
  },
  
  {
    name: '学习路径生成接口测试',
    test: async (env) => {
      const baseUrl = env.VITE_API_BASE_URL || 'http://localhost:3000';
      
      const testPayload = {
        user_id: 'test-user-123',
        subject_code: '9709',
        target_exam_date: '2024-06-01',
        current_level: 'intermediate',
        time_available: {
          daily_hours: 2,
          weekly_days: 5
        },
        preferences: {
          learning_style: 'visual',
          difficulty_progression: 'gradual'
        }
      };
      
      try {
        const response = await makeRequest(`${baseUrl}/api/learning/path/generate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY || 'test-token'}`
          },
          body: testPayload
        });
        
        if (response.status === 200 && response.data.success) {
          return { 
            success: true, 
            message: '学习路径生成接口响应正常' 
          };
        } else if (response.status === 404) {
          return { 
            success: false, 
            message: '学习路径生成接口未实现 (Agent A待开发)',
            warning: true
          };
        } else {
          throw new Error(`接口错误: HTTP ${response.status}`);
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          return { 
            success: false, 
            message: '后端服务未启动 (Agent A需要启动服务)',
            warning: true
          };
        }
        throw error;
      }
    }
  },
  
  {
    name: '环境变量完整性检查',
    test: async (env) => {
      const requiredVars = [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY',
        'VITE_OPENAI_API_KEY'
      ];
      
      const optionalVars = [
        'VITE_RAG_API_BASE',
        'VITE_API_BASE_URL',
        'VITE_DEBUG_MODE'
      ];
      
      const missing = requiredVars.filter(varName => !env[varName]);
      const present = optionalVars.filter(varName => env[varName]);
      
      if (missing.length > 0) {
        throw new Error(`缺少必需环境变量: ${missing.join(', ')}`);
      }
      
      return {
        success: true,
        message: `环境变量配置完整，可选变量已配置: ${present.length}/${optionalVars.length}`
      };
    }
  }
];

// 主测试函数
async function runTests() {
  log('🧪 Agent B API集成测试', 'bright');
  log('=' .repeat(60), 'blue');
  
  const env = loadEnvVariables();
  log('✅ 环境变量加载完成', 'green');
  
  const results = [];
  
  for (const testCase of testCases) {
    log(`\n🔍 测试: ${testCase.name}`, 'cyan');
    
    try {
      const result = await testCase.test(env);
      
      if (result.success) {
        log(`✅ ${result.message}`, 'green');
        results.push({ name: testCase.name, status: 'passed', message: result.message });
      } else if (result.warning) {
        log(`⚠️  ${result.message}`, 'yellow');
        results.push({ name: testCase.name, status: 'warning', message: result.message });
      } else {
        log(`❌ ${result.message}`, 'red');
        results.push({ name: testCase.name, status: 'failed', message: result.message });
      }
    } catch (error) {
      log(`❌ ${error.message}`, 'red');
      results.push({ name: testCase.name, status: 'error', message: error.message });
    }
  }
  
  // 测试结果汇总
  log('\n📊 测试结果汇总', 'bright');
  log('=' .repeat(60), 'blue');
  
  const passed = results.filter(r => r.status === 'passed').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const errors = results.filter(r => r.status === 'error').length;
  
  log(`✅ 通过: ${passed}`, 'green');
  log(`⚠️  警告: ${warnings}`, 'yellow');
  log(`❌ 失败: ${failed}`, 'red');
  log(`💥 错误: ${errors}`, 'red');
  
  // 建议和下一步
  log('\n💡 建议和下一步操作', 'bright');
  log('=' .repeat(60), 'blue');
  
  if (failed > 0 || errors > 0) {
    log('🔧 需要修复的问题:', 'yellow');
    results.filter(r => r.status === 'failed' || r.status === 'error').forEach(result => {
      log(`   • ${result.name}: ${result.message}`, 'red');
    });
  }
  
  if (warnings > 0) {
    log('\n📋 待开发功能 (Agent A负责):', 'yellow');
    results.filter(r => r.status === 'warning').forEach(result => {
      log(`   • ${result.name}: ${result.message}`, 'yellow');
    });
  }
  
  if (passed === testCases.length) {
    log('\n🎉 所有测试通过！Agent B可以开始前端开发工作。', 'green');
  } else if (passed + warnings === testCases.length) {
    log('\n✅ 基础环境配置正确，可以开始前端开发。', 'green');
    log('⏳ 部分后端接口待Agent A实现，前端可以先开发UI组件。', 'yellow');
  } else {
    log('\n⚠️  存在配置问题，建议先解决后再开始开发。', 'yellow');
  }
  
  log('\n📚 参考文档:', 'bright');
  log('• Agent B开发指南: docs/6A_Agent_Collab/AGENT_B_DEVELOPMENT_GUIDE.md', 'magenta');
  log('• API接口约定: docs/6A_Agent_Collab/API_CONTRACTS.md', 'magenta');
  log('• 问题记录: docs/6A_Agent_Collab/ISSUES_LOG.md', 'magenta');
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    log(`💥 测试运行失败: ${error.message}`, 'red');
    process.exit(1);
  });
}

export { runTests };