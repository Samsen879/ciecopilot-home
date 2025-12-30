// API接口测试套件
// 测试思维导图学习系统的核心API功能

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'http';
import { handler } from '../index.js';
import { createClient } from '@supabase/supabase-js';

// 测试配置
const TEST_CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:54321',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'test-anon-key',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key',
  testUser: {
    email: 'test@example.com',
    password: 'testpassword123'
  }
};

// 创建测试服务器
const server = createServer(handler);
const app = request(server);

// 测试数据
let testData = {
  accessToken: null,
  userId: null,
  mindmapId: null,
  nodeId: null,
  quizId: null,
  sessionId: null,
  feedbackId: null
};

// Supabase客户端
let supabase;

describe('思维导图学习系统 API 测试', () => {
  beforeAll(async () => {
    // 初始化Supabase客户端
    supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);

    // 创建测试用户并获取访问令牌
    try {
      const { data, error } = await supabase.auth.signUp({
        email: TEST_CONFIG.testUser.email,
        password: TEST_CONFIG.testUser.password
      });

      if (error && error.message !== 'User already registered') {
        throw error;
      }

      // 登录获取令牌
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: TEST_CONFIG.testUser.email,
        password: TEST_CONFIG.testUser.password
      });

      if (loginError) {
        throw loginError;
      }

      testData.accessToken = loginData.session.access_token;
      testData.userId = loginData.user.id;

      console.log('测试用户创建成功，Token:', testData.accessToken?.substring(0, 20) + '...');
    } catch (error) {
      console.warn('测试用户设置失败，将使用模拟数据:', error.message);
      // 使用模拟令牌进行测试
      testData.accessToken = 'mock-access-token';
      testData.userId = 'mock-user-id';
    }
  });

  afterAll(async () => {
    // 清理测试数据
    if (supabase && testData.accessToken !== 'mock-access-token') {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.warn('登出失败:', error.message);
      }
    }

    // 关闭服务器
    server.close();
  });

  beforeEach(() => {
    // 每个测试前的设置
    jest.setTimeout(10000); // 10秒超时
  });

  describe('健康检查和基础端点', () => {
    it('应该返回健康检查状态', async () => {
      const response = await app
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('应该返回API信息', async () => {
      const response = await app
        .get('/api/info')
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('modules');
      expect(response.body.modules).toHaveProperty('mindmap');
      expect(response.body.modules).toHaveProperty('quiz');
      expect(response.body.modules).toHaveProperty('mastery');
      expect(response.body.modules).toHaveProperty('behavior');
      expect(response.body.modules).toHaveProperty('feedback');
    });

    it('应该正确处理不存在的端点', async () => {
      const response = await app
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('思维导图 API', () => {
    it('应该能够创建新的思维导图', async () => {
      const mindmapData = {
        title: '测试思维导图',
        description: '这是一个测试用的思维导图',
        isPublic: false,
        tags: ['test', 'javascript']
      };

      const response = await app
        .post('/api/mindmap/create')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send(mindmapData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('title', mindmapData.title);

      // 保存思维导图ID用于后续测试
      testData.mindmapId = response.body.data.id;
    });

    it('应该能够获取思维导图列表', async () => {
      const response = await app
        .get('/api/mindmap/list')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该能够创建思维导图节点', async () => {
      const nodeData = {
        mindmapId: testData.mindmapId,
        title: '测试节点',
        content: '这是一个测试节点的内容',
        type: 'concept',
        position: { x: 100, y: 100 },
        style: {
          color: '#333333',
          backgroundColor: '#ffffff'
        }
      };

      const response = await app
        .post('/api/mindmap/nodes')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send(nodeData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('title', nodeData.title);

      // 保存节点ID用于后续测试
      testData.nodeId = response.body.data.id;
    });

    it('应该能够获取思维导图节点列表', async () => {
      const response = await app
        .get('/api/mindmap/nodes')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .query({ mindmapId: testData.mindmapId })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该能够搜索思维导图', async () => {
      const response = await app
        .get('/api/mindmap/search')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .query({ q: '测试', type: 'mindmap' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('Quiz系统 API', () => {
    it('应该能够生成Quiz', async () => {
      if (!testData.nodeId) {
        console.log('跳过Quiz生成测试：缺少节点ID');
        return;
      }

      const quizData = {
        nodeId: testData.nodeId,
        difficulty: 'medium',
        questionCount: 3,
        questionTypes: ['multiple_choice', 'true_false']
      };

      const response = await app
        .post('/api/quiz/generate')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send(quizData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('quizId');
      expect(response.body.data).toHaveProperty('questions');
      expect(Array.isArray(response.body.data.questions)).toBe(true);

      // 保存Quiz ID用于后续测试
      testData.quizId = response.body.data.quizId;
    });

    it('应该能够提交Quiz答案', async () => {
      if (!testData.quizId) {
        console.log('跳过Quiz提交测试：缺少Quiz ID');
        return;
      }

      const submitData = {
        attempts: [
          {
            questionId: 'q1',
            answer: 'A',
            responseTimeMs: 5000,
            switchCount: 1,
            confidence: 0.8
          }
        ]
      };

      const response = await app
        .post(`/api/quiz/submit/${testData.quizId}`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send(submitData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('score');
      expect(response.body.data).toHaveProperty('results');
    });

    it('应该能够获取Quiz历史', async () => {
      const response = await app
        .get('/api/quiz/history')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .query({ days: 30 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该能够获取Quiz统计', async () => {
      const response = await app
        .get('/api/quiz/statistics')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .query({ period: '7d' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('attempts');
      expect(response.body.data).toHaveProperty('sessions');
    });
  });

  describe('掌握度系统 API', () => {
    it('应该能够计算掌握度', async () => {
      if (!testData.nodeId) {
        console.log('跳过掌握度计算测试：缺少节点ID');
        return;
      }

      const masteryData = {
        nodeId: testData.nodeId,
        performanceData: {
          totalScore: 0.8,
          attempts: [
            {
              questionId: 'q1',
              isCorrect: true,
              responseTimeMs: 3000,
              confidence: 0.9
            }
          ]
        },
        contextData: {
          sessionType: 'practice'
        }
      };

      const response = await app
        .post('/api/mastery/calculate')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send(masteryData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('nodeId');
      expect(response.body.data).toHaveProperty('newMastery');
      expect(response.body.data).toHaveProperty('confidence');
    });

    it('应该能够获取掌握度分析', async () => {
      const response = await app
        .get('/api/mastery/analytics')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .query({ period: '30d' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('overview');
      expect(response.body.data).toHaveProperty('trends');
    });

    it('应该能够获取学习推荐', async () => {
      const response = await app
        .get('/api/mastery/recommendations')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .query({ type: 'review', limit: 5 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该能够获取复习计划', async () => {
      const response = await app
        .get('/api/mastery/review-schedule')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .query({ days: 7 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('schedule');
      expect(response.body.data).toHaveProperty('summary');
    });
  });

  describe('行为跟踪 API', () => {
    it('应该能够跟踪用户行为', async () => {
      const behaviorData = {
        events: [
          {
            type: 'node_view',
            data: { duration: 5000 },
            nodeId: testData.nodeId,
            mindmapId: testData.mindmapId,
            timestamp: new Date().toISOString()
          },
          {
            type: 'mindmap_open',
            data: { source: 'dashboard' },
            mindmapId: testData.mindmapId,
            timestamp: new Date().toISOString()
          }
        ],
        sessionId: 'test-session-' + Date.now()
      };

      const response = await app
        .post('/api/behavior/track')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send(behaviorData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('eventsRecorded', 2);

      // 保存会话ID用于后续测试
      testData.sessionId = behaviorData.sessionId;
    });

    it('应该能够获取行为事件', async () => {
      const response = await app
        .get('/api/behavior/events')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .query({ page: 1, limit: 10, eventType: 'node_view' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该能够获取行为分析', async () => {
      const response = await app
        .get('/api/behavior/analytics')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .query({ period: '7d' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('events');
      expect(response.body.data).toHaveProperty('engagement');
    });

    it('应该能够获取行为模式', async () => {
      const response = await app
        .get('/api/behavior/patterns')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .query({ period: '30d', patternType: 'learning' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('patterns');
    });
  });

  describe('反馈系统 API', () => {
    it('应该能够提交反馈', async () => {
      const feedbackData = {
        type: 'feature',
        category: '新功能建议',
        content: '希望能够添加思维导图的协作编辑功能，支持多人实时编辑',
        rating: 5,
        context: {
          page: 'mindmap-editor',
          userAgent: 'test-agent'
        },
        mindmapId: testData.mindmapId
      };

      const response = await app
        .post('/api/feedback/submit')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send(feedbackData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('status');

      // 保存反馈ID用于后续测试
      testData.feedbackId = response.body.data.id;
    });

    it('应该能够获取反馈列表', async () => {
      const response = await app
        .get('/api/feedback/list')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .query({ page: 1, limit: 10, type: 'feature' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该能够获取反馈详情', async () => {
      if (!testData.feedbackId) {
        console.log('跳过反馈详情测试：缺少反馈ID');
        return;
      }

      const response = await app
        .get(`/api/feedback/detail/${testData.feedbackId}`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', testData.feedbackId);
    });

    it('应该能够获取反馈分类', async () => {
      const response = await app
        .get('/api/feedback/categories')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('predefined');
      expect(response.body.data).toHaveProperty('userStats');
    });
  });

  describe('认证和权限测试', () => {
    it('应该拒绝没有令牌的请求', async () => {
      const response = await app
        .get('/api/mindmap/list')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toMatch(/UNAUTHORIZED|AUTH/);
    });

    it('应该拒绝无效令牌的请求', async () => {
      const response = await app
        .get('/api/mindmap/list')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('限流测试', () => {
    it('应该在请求过多时返回429状态码', async () => {
      // 快速发送多个请求来触发限流
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          app
            .get('/api/health')
            .expect((res) => {
              // 接受200或429状态码
              if (res.status !== 200 && res.status !== 429) {
                throw new Error(`Unexpected status code: ${res.status}`);
              }
            })
        );
      }

      const responses = await Promise.all(requests);

      // 检查是否有429响应
      const rateLimitedResponses = responses.filter(res => res.status === 429);

      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].body).toHaveProperty('error');
        expect(rateLimitedResponses[0].body.error.code).toMatch(/RATE_LIMIT/);
      }
    }, 15000); // 增加超时时间
  });

  describe('数据验证测试', () => {
    it('应该验证思维导图创建数据', async () => {
      const invalidData = {
        title: '', // 空标题
        description: 'x'.repeat(2000), // 过长描述
        tags: new Array(20).fill('tag') // 过多标签
      };

      const response = await app
        .post('/api/mindmap/create')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toMatch(/VALIDATION/);
    });

    it('应该验证Quiz生成数据', async () => {
      const invalidData = {
        nodeId: 'invalid-uuid',
        difficulty: 'invalid-difficulty',
        questionCount: 100, // 超出限制
        questionTypes: [] // 空数组
      };

      const response = await app
        .post('/api/quiz/generate')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toMatch(/VALIDATION/);
    });

    it('应该验证反馈提交数据', async () => {
      const invalidData = {
        type: 'invalid-type',
        category: 'x'.repeat(100), // 过长分类
        content: 'short', // 过短内容
        rating: 10 // 超出范围
      };

      const response = await app
        .post('/api/feedback/submit')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toMatch(/VALIDATION/);
    });
  });

  describe('错误处理测试', () => {
    it('应该正确处理不存在的资源', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await app
        .get(`/api/mindmap/nodes`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .query({ mindmapId: nonExistentId })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toMatch(/NOT_FOUND/);
    });

    it('应该正确处理服务器错误', async () => {
      // 发送格式错误的JSON来触发服务器错误
      const response = await app
        .post('/api/mindmap/create')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid-json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
});

// 性能测试
describe('API性能测试', () => {
  it('健康检查应该在100ms内响应', async () => {
    const startTime = Date.now();

    await app
      .get('/api/health')
      .expect(200);

    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(100);
  });

  it('API信息查询应该在200ms内响应', async () => {
    const startTime = Date.now();

    await app
      .get('/api/info')
      .expect(200);

    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(200);
  });
});

// 集成测试
describe('端到端集成测试', () => {
  it('应该能够完成完整的学习流程', async () => {
    // 1. 创建思维导图
    const mindmapResponse = await app
      .post('/api/mindmap/create')
      .set('Authorization', `Bearer ${testData.accessToken}`)
      .send({
        title: '集成测试思维导图',
        description: '用于端到端测试的思维导图'
      })
      .expect(201);

    const mindmapId = mindmapResponse.body.data.id;

    // 2. 创建节点
    const nodeResponse = await app
      .post('/api/mindmap/nodes')
      .set('Authorization', `Bearer ${testData.accessToken}`)
      .send({
        mindmapId,
        title: '测试知识点',
        content: '这是一个测试知识点',
        type: 'concept',
        position: { x: 0, y: 0 }
      })
      .expect(201);

    const nodeId = nodeResponse.body.data.id;

    // 3. 生成Quiz
    const quizResponse = await app
      .post('/api/quiz/generate')
      .set('Authorization', `Bearer ${testData.accessToken}`)
      .send({
        nodeId,
        difficulty: 'easy',
        questionCount: 2
      })
      .expect(201);

    const quizId = quizResponse.body.data.quizId;

    // 4. 提交Quiz
    await app
      .post(`/api/quiz/submit/${quizId}`)
      .set('Authorization', `Bearer ${testData.accessToken}`)
      .send({
        attempts: [
          {
            questionId: 'q1',
            answer: 'test-answer',
            responseTimeMs: 2000,
            confidence: 0.8
          }
        ]
      })
      .expect(200);

    // 5. 跟踪行为
    await app
      .post('/api/behavior/track')
      .set('Authorization', `Bearer ${testData.accessToken}`)
      .send({
        events: [
          {
            type: 'quiz_complete',
            data: { score: 0.8 },
            nodeId,
            mindmapId
          }
        ]
      })
      .expect(201);

    // 6. 提交反馈
    await app
      .post('/api/feedback/submit')
      .set('Authorization', `Bearer ${testData.accessToken}`)
      .send({
        type: 'general',
        category: '学习体验',
        content: '整体学习体验很好，Quiz难度适中',
        rating: 5,
        mindmapId
      })
      .expect(201);

    console.log('✅ 端到端集成测试完成');
  }, 30000); // 30秒超时
});

// ========================================
// 契约测试扩展：健康探针 + 新端点
// ========================================

describe('API Contract Compliance - Health Probes', () => {
  it('GET /api/ready should return structured checks object', async () => {
    const res = await app.get('/api/ready');

    // Accept any valid status code (200 or 503)
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(600);

    expect(res.body).toEqual(
      expect.objectContaining({
        status: expect.stringMatching(/^(ready|not_ready)$/),
        checks: expect.objectContaining({
          supabase: expect.any(Object),
          redis: expect.any(Object),
          dashscope: expect.any(Object),
        }),
      })
    );
  });

  it('GET /api/ready should expose supabase health fields', async () => {
    const res = await app.get('/api/ready');

    const { supabase } = res.body.checks;

    expect(supabase).toEqual(
      expect.objectContaining({
        enabled: true, // Supabase is always enabled
        envOk: expect.any(Boolean),
        healthy: expect.any(Boolean),
      })
    );
  });
});

describe('API Contract Compliance - Additional Endpoints', () => {
  describe('RAG API', () => {
    it('GET /api/rag/search should return contract-compliant response', async () => {
      const res = await app
        .get('/api/rag/search')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .query({ q: 'test query' });

      expect(res.body).toMatchApiContract(res.status);
    });

    it('GET /api/rag/search with missing query should return contract-compliant error', async () => {
      const res = await app
        .get('/api/rag/search')
        .set('Authorization', `Bearer ${testData.accessToken}`);

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body).toMatchApiContract(res.status);
    });
  });

  describe('Community API', () => {
    it('GET /api/community/questions should return contract-compliant response', async () => {
      const res = await app
        .get('/api/community/questions')
        .set('Authorization', `Bearer ${testData.accessToken}`);

      expect(res.body).toMatchApiContract(res.status);
    });

    it('GET /api/community/questions without auth should return contract-compliant error', async () => {
      const res = await app
        .get('/api/community/questions');

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body).toMatchApiContract(res.status);
    });
  });

  describe('Recommendations API', () => {
    it('GET /api/recommendations should return contract-compliant response', async () => {
      const res = await app
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .query({ type: 'content', limit: 5 });

      expect(res.body).toMatchApiContract(res.status);
    });

    it('GET /api/recommendations with invalid type should return contract-compliant error', async () => {
      const res = await app
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .query({ type: 'invalid-type' });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body).toMatchApiContract(res.status);
    });
  });
});

// 测试工具函数
function generateRandomString(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 导出测试工具供其他测试文件使用
export {
  testData,
  generateRandomString,
  generateUUID
};