// Jest测试设置文件
// 配置全局测试环境和工具函数

import { jest, expect } from '@jest/globals';
import dotenv from 'dotenv';
import { toMatchApiContract } from './contracts/contract.matcher.js';

// 注册自定义匹配器
expect.extend({
  toMatchApiContract
});

// 加载测试环境变量
dotenv.config({ path: '.env.test' });

// 设置测试超时
jest.setTimeout(30000);

// 全局测试配置
global.testConfig = {
  // API基础URL
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',

  // Supabase配置
  supabase: {
    url: process.env.SUPABASE_URL || 'http://localhost:54321',
    anonKey: process.env.SUPABASE_ANON_KEY || 'test-anon-key',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'
  },

  // 测试用户配置
  testUser: {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'testpassword123'
  },

  // 测试数据配置
  testData: {
    mindmapTitle: '测试思维导图',
    nodeTitle: '测试节点',
    quizQuestionCount: 3,
    feedbackContent: '这是一个测试反馈'
  }
};

// 全局工具函数
global.testUtils = {
  // 生成随机字符串
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // 生成UUID
  generateUUID: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // 等待指定时间
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // 重试函数
  retry: async (fn, maxAttempts = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        await global.testUtils.sleep(delay);
      }
    }
  },

  // 验证响应格式
  validateApiResponse: (response, expectedStatus = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success');

    if (expectedStatus >= 200 && expectedStatus < 300) {
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
    } else {
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    }

    return response.body;
  },

  // 创建测试思维导图数据
  createMindmapData: (overrides = {}) => ({
    title: global.testConfig.testData.mindmapTitle + '_' + global.testUtils.randomString(5),
    description: '这是一个用于测试的思维导图',
    isPublic: false,
    tags: ['test', 'automation'],
    ...overrides
  }),

  // 创建测试节点数据
  createNodeData: (mindmapId, overrides = {}) => ({
    mindmapId,
    title: global.testConfig.testData.nodeTitle + '_' + global.testUtils.randomString(5),
    content: '这是一个测试节点的内容',
    type: 'concept',
    position: { x: Math.random() * 500, y: Math.random() * 500 },
    style: {
      color: '#333333',
      backgroundColor: '#ffffff',
      fontSize: 14
    },
    ...overrides
  }),

  // 创建测试Quiz数据
  createQuizData: (nodeId, overrides = {}) => ({
    nodeId,
    difficulty: 'medium',
    questionCount: global.testConfig.testData.quizQuestionCount,
    questionTypes: ['multiple_choice', 'true_false'],
    ...overrides
  }),

  // 创建测试反馈数据
  createFeedbackData: (overrides = {}) => ({
    type: 'feature',
    category: '功能建议',
    content: global.testConfig.testData.feedbackContent + ' - ' + global.testUtils.randomString(10),
    rating: Math.floor(Math.random() * 5) + 1,
    context: {
      page: 'test-page',
      userAgent: 'test-agent',
      timestamp: new Date().toISOString()
    },
    ...overrides
  }),

  // 创建测试行为数据
  createBehaviorData: (nodeId, mindmapId, overrides = {}) => ({
    events: [
      {
        type: 'node_view',
        data: { duration: Math.floor(Math.random() * 10000) + 1000 },
        nodeId,
        mindmapId,
        timestamp: new Date().toISOString()
      },
      {
        type: 'mindmap_open',
        data: { source: 'test' },
        mindmapId,
        timestamp: new Date().toISOString()
      }
    ],
    sessionId: 'test-session-' + Date.now(),
    ...overrides
  })
};

// 全局测试钩子
beforeAll(async () => {
  console.log('🚀 开始API测试套件');
  console.log('📊 测试配置:', {
    apiBaseUrl: global.testConfig.apiBaseUrl,
    supabaseUrl: global.testConfig.supabase.url,
    testUser: global.testConfig.testUser.email
  });
});

afterAll(async () => {
  console.log('✅ API测试套件完成');
});

// 每个测试前的设置
beforeEach(() => {
  // 重置控制台警告和错误的模拟
  jest.clearAllMocks();
});

// 每个测试后的清理
afterEach(() => {
  // 清理任何剩余的定时器
  jest.clearAllTimers();
});

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

// 模拟环境变量（如果需要）
if (process.env.NODE_ENV === 'test') {
  // 设置测试专用的环境变量
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';
}

console.log('📝 测试设置完成');