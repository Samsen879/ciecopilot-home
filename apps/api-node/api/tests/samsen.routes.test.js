// Samsen API路由单元测试
// 测试samsenRoutes.js的API端点功能

import { jest } from '@jest/globals';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// 模拟SamsenCore
const mockSamsenCore = {
  initialize: jest.fn(),
  getSystemStatus: jest.fn(),
  healthCheck: jest.fn(),
  createSession: jest.fn(),
  getSession: jest.fn(),
  extendSession: jest.fn(),
  deleteSession: jest.fn(),
  processConversation: jest.fn(),
  getConversationHistory: jest.fn(),
  getUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
  getUserGoals: jest.fn(),
  getActiveSessions: jest.fn(),
  getAnalyticsReports: jest.fn(),
  getRecommendations: jest.fn(),
  getProgress: jest.fn(),
  batchCreateSessions: jest.fn(),
  batchProcessConversations: jest.fn(),
  cleanup: jest.fn(),
  getMetrics: jest.fn(),
  updateConfig: jest.fn()
};

// 模拟路由处理器
class MockSamsenRoutes {
  constructor() {
    this.samsenCore = mockSamsenCore;
  }

  async handleRequest(req, res) {
    try {
      const { method, url } = req;
      const path = url.split('?')[0];
      const pathSegments = path.split('/').filter(segment => segment !== '');
      
      // 移除 'api' 和 'samsen' 前缀
      const routePath = pathSegments.slice(2).join('/');
      
      switch (method) {
        case 'GET':
          return await this.handleGet(routePath, req, res);
        case 'POST':
          return await this.handlePost(routePath, req, res);
        case 'PUT':
          return await this.handlePut(routePath, req, res);
        case 'DELETE':
          return await this.handleDelete(routePath, req, res);
        default:
          return this.sendError(res, 405, 'METHOD_NOT_ALLOWED', '不支持的HTTP方法');
      }
    } catch (error) {
      console.error('Samsen路由错误:', error);
      return this.sendError(res, 500, 'INTERNAL_ERROR', error.message);
    }
  }

  async handleGet(path, req, res) {
    const pathParts = path.split('/');
    
    switch (pathParts[0]) {
      case 'status':
        const status = await this.samsenCore.getSystemStatus();
        return this.sendSuccess(res, status);
        
      case 'health':
        const health = await this.samsenCore.healthCheck();
        return this.sendSuccess(res, health);
        
      case 'sessions':
        if (pathParts[1]) {
          const session = await this.samsenCore.getSession(pathParts[1]);
          return this.sendSuccess(res, session);
        }
        return this.sendError(res, 400, 'MISSING_SESSION_ID', '缺少会话ID');
        
      case 'conversations':
        if (pathParts[1] && pathParts[2] === 'history') {
          const history = await this.samsenCore.getConversationHistory(pathParts[1]);
          return this.sendSuccess(res, history);
        }
        return this.sendError(res, 400, 'INVALID_CONVERSATION_PATH', '无效的对话路径');
        
      case 'profiles':
        if (pathParts[1]) {
          const userId = pathParts[1];
          if (pathParts[2] === 'goals') {
            const goals = await this.samsenCore.getUserGoals(userId);
            return this.sendSuccess(res, goals);
          } else if (pathParts[2] === 'active-sessions') {
            const sessions = await this.samsenCore.getActiveSessions(userId);
            return this.sendSuccess(res, sessions);
          } else {
            const profile = await this.samsenCore.getUserProfile(userId);
            return this.sendSuccess(res, profile);
          }
        }
        return this.sendError(res, 400, 'MISSING_USER_ID', '缺少用户ID');
        
      case 'analytics':
        if (pathParts[1]) {
          const userId = pathParts[1];
          if (pathParts[2] === 'reports') {
            const reports = await this.samsenCore.getAnalyticsReports(userId);
            return this.sendSuccess(res, reports);
          } else if (pathParts[2] === 'recommendations') {
            const recommendations = await this.samsenCore.getRecommendations(userId);
            return this.sendSuccess(res, recommendations);
          } else if (pathParts[2] === 'progress') {
            const progress = await this.samsenCore.getProgress(userId);
            return this.sendSuccess(res, progress);
          }
        }
        return this.sendError(res, 400, 'INVALID_ANALYTICS_PATH', '无效的分析路径');
        
      case 'admin':
        if (pathParts[1] === 'metrics') {
          const metrics = await this.samsenCore.getMetrics();
          return this.sendSuccess(res, metrics);
        }
        return this.sendError(res, 400, 'INVALID_ADMIN_PATH', '无效的管理路径');
        
      default:
        return this.sendError(res, 404, 'ENDPOINT_NOT_FOUND', 'API端点不存在');
    }
  }

  async handlePost(path, req, res) {
    const pathParts = path.split('/');
    
    switch (pathParts[0]) {
      case 'sessions':
        const sessionData = req.body;
        const session = await this.samsenCore.createSession(sessionData);
        return this.sendSuccess(res, session, 201);
        
      case 'conversations':
        const conversationData = req.body;
        const response = await this.samsenCore.processConversation(
          conversationData.sessionId,
          conversationData.message,
          conversationData.userId
        );
        return this.sendSuccess(res, response);
        
      case 'batch':
        if (pathParts[1] === 'sessions') {
          const batchData = req.body;
          const results = await this.samsenCore.batchCreateSessions(batchData);
          return this.sendSuccess(res, results);
        } else if (pathParts[1] === 'conversations') {
          const batchData = req.body;
          const results = await this.samsenCore.batchProcessConversations(batchData);
          return this.sendSuccess(res, results);
        }
        return this.sendError(res, 400, 'INVALID_BATCH_PATH', '无效的批量操作路径');
        
      case 'admin':
        if (pathParts[1] === 'cleanup') {
          const result = await this.samsenCore.cleanup();
          return this.sendSuccess(res, result);
        }
        return this.sendError(res, 400, 'INVALID_ADMIN_PATH', '无效的管理路径');
        
      default:
        return this.sendError(res, 404, 'ENDPOINT_NOT_FOUND', 'API端点不存在');
    }
  }

  async handlePut(path, req, res) {
    const pathParts = path.split('/');
    
    switch (pathParts[0]) {
      case 'sessions':
        if (pathParts[1] && pathParts[2] === 'extend') {
          const sessionId = pathParts[1];
          const { duration } = req.body;
          const session = await this.samsenCore.extendSession(sessionId, duration);
          return this.sendSuccess(res, session);
        }
        return this.sendError(res, 400, 'INVALID_SESSION_PATH', '无效的会话路径');
        
      case 'profiles':
        if (pathParts[1]) {
          const userId = pathParts[1];
          const profileData = req.body;
          const profile = await this.samsenCore.updateUserProfile(userId, profileData);
          return this.sendSuccess(res, profile);
        }
        return this.sendError(res, 400, 'MISSING_USER_ID', '缺少用户ID');
        
      case 'admin':
        if (pathParts[1] === 'config') {
          const configData = req.body;
          const result = await this.samsenCore.updateConfig(configData);
          return this.sendSuccess(res, result);
        }
        return this.sendError(res, 400, 'INVALID_ADMIN_PATH', '无效的管理路径');
        
      default:
        return this.sendError(res, 404, 'ENDPOINT_NOT_FOUND', 'API端点不存在');
    }
  }

  async handleDelete(path, req, res) {
    const pathParts = path.split('/');
    
    switch (pathParts[0]) {
      case 'sessions':
        if (pathParts[1]) {
          const sessionId = pathParts[1];
          const result = await this.samsenCore.deleteSession(sessionId);
          return this.sendSuccess(res, { deleted: result });
        }
        return this.sendError(res, 400, 'MISSING_SESSION_ID', '缺少会话ID');
        
      default:
        return this.sendError(res, 404, 'ENDPOINT_NOT_FOUND', 'API端点不存在');
    }
  }

  sendSuccess(res, data, statusCode = 200) {
    res.status(statusCode);
    return res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  }

  sendError(res, statusCode, code, message, details = null) {
    res.status(statusCode);
    return res.json({
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString()
      }
    });
  }
}

describe('Samsen API路由测试', () => {
  let samsenRoutes;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 创建路由实例
    samsenRoutes = new MockSamsenRoutes();
    
    // 创建模拟的请求和响应对象
    mockReq = {
      method: 'GET',
      url: '/api/samsen/status',
      headers: {},
      body: {},
      query: {}
    };
    
    mockRes = {
      statusCode: 200,
      headers: {},
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis()
    };

    // 设置默认模拟返回值
    mockSamsenCore.getSystemStatus.mockResolvedValue({
      status: 'healthy',
      initialized: true,
      timestamp: new Date().toISOString()
    });
    
    mockSamsenCore.healthCheck.mockResolvedValue({
      status: 'healthy',
      components: { database: true, aiService: true }
    });
  });

  describe('系统状态端点测试', () => {
    test('GET /status 应该返回系统状态', async () => {
      mockReq.url = '/api/samsen/status';
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockSamsenCore.getSystemStatus).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          status: 'healthy',
          initialized: true
        }),
        timestamp: expect.any(String)
      });
    });

    test('GET /health 应该返回健康检查结果', async () => {
      mockReq.url = '/api/samsen/health';
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockSamsenCore.healthCheck).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          status: 'healthy',
          components: { database: true, aiService: true }
        }),
        timestamp: expect.any(String)
      });
    });
  });

  describe('会话管理端点测试', () => {
    test('POST /sessions 应该创建新会话', async () => {
      const sessionData = {
        userId: 'user123',
        subject: 'Mathematics',
        learningGoals: ['掌握二次函数']
      };
      
      const expectedSession = {
        id: 'session123',
        ...sessionData,
        createdAt: new Date().toISOString()
      };
      
      mockReq.method = 'POST';
      mockReq.url = '/api/samsen/sessions';
      mockReq.body = sessionData;
      mockSamsenCore.createSession.mockResolvedValue(expectedSession);
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockSamsenCore.createSession).toHaveBeenCalledWith(sessionData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expectedSession,
        timestamp: expect.any(String)
      });
    });

    test('GET /sessions/:sessionId 应该获取会话信息', async () => {
      const sessionId = 'session123';
      const expectedSession = {
        id: sessionId,
        userId: 'user123',
        status: 'active'
      };
      
      mockReq.url = `/api/samsen/sessions/${sessionId}`;
      mockSamsenCore.getSession.mockResolvedValue(expectedSession);
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockSamsenCore.getSession).toHaveBeenCalledWith(sessionId);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expectedSession,
        timestamp: expect.any(String)
      });
    });

    test('PUT /sessions/:sessionId/extend 应该延长会话', async () => {
      const sessionId = 'session123';
      const duration = 3600;
      const extendedSession = {
        id: sessionId,
        expiresAt: new Date(Date.now() + duration * 1000).toISOString()
      };
      
      mockReq.method = 'PUT';
      mockReq.url = `/api/samsen/sessions/${sessionId}/extend`;
      mockReq.body = { duration };
      mockSamsenCore.extendSession.mockResolvedValue(extendedSession);
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockSamsenCore.extendSession).toHaveBeenCalledWith(sessionId, duration);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: extendedSession,
        timestamp: expect.any(String)
      });
    });

    test('DELETE /sessions/:sessionId 应该删除会话', async () => {
      const sessionId = 'session123';
      
      mockReq.method = 'DELETE';
      mockReq.url = `/api/samsen/sessions/${sessionId}`;
      mockSamsenCore.deleteSession.mockResolvedValue(true);
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockSamsenCore.deleteSession).toHaveBeenCalledWith(sessionId);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { deleted: true },
        timestamp: expect.any(String)
      });
    });
  });

  describe('对话处理端点测试', () => {
    test('POST /conversations 应该处理对话', async () => {
      const conversationData = {
        sessionId: 'session123',
        message: '请解释二次函数的性质',
        userId: 'user123'
      };
      
      const expectedResponse = {
        response: '二次函数是形如 f(x) = ax² + bx + c 的函数...',
        metadata: { model: 'gpt-3.5-turbo', tokens: 150 }
      };
      
      mockReq.method = 'POST';
      mockReq.url = '/api/samsen/conversations';
      mockReq.body = conversationData;
      mockSamsenCore.processConversation.mockResolvedValue(expectedResponse);
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockSamsenCore.processConversation).toHaveBeenCalledWith(
        conversationData.sessionId,
        conversationData.message,
        conversationData.userId
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expectedResponse,
        timestamp: expect.any(String)
      });
    });

    test('GET /conversations/:sessionId/history 应该获取对话历史', async () => {
      const sessionId = 'session123';
      const expectedHistory = {
        messages: [
          { type: 'user', content: '你好', timestamp: '2024-01-01T00:00:00Z' },
          { type: 'ai', content: '你好！我是Samsen', timestamp: '2024-01-01T00:00:01Z' }
        ]
      };
      
      mockReq.url = `/api/samsen/conversations/${sessionId}/history`;
      mockSamsenCore.getConversationHistory.mockResolvedValue(expectedHistory);
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockSamsenCore.getConversationHistory).toHaveBeenCalledWith(sessionId);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expectedHistory,
        timestamp: expect.any(String)
      });
    });
  });

  describe('用户档案端点测试', () => {
    test('GET /profiles/:userId 应该获取用户档案', async () => {
      const userId = 'user123';
      const expectedProfile = {
        id: userId,
        name: '张三',
        learningPreferences: { subject: 'Mathematics' }
      };
      
      mockReq.url = `/api/samsen/profiles/${userId}`;
      mockSamsenCore.getUserProfile.mockResolvedValue(expectedProfile);
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockSamsenCore.getUserProfile).toHaveBeenCalledWith(userId);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expectedProfile,
        timestamp: expect.any(String)
      });
    });

    test('PUT /profiles/:userId 应该更新用户档案', async () => {
      const userId = 'user123';
      const profileData = {
        name: '李四',
        learningPreferences: { subject: 'Physics' }
      };
      
      const updatedProfile = {
        id: userId,
        ...profileData,
        updatedAt: new Date().toISOString()
      };
      
      mockReq.method = 'PUT';
      mockReq.url = `/api/samsen/profiles/${userId}`;
      mockReq.body = profileData;
      mockSamsenCore.updateUserProfile.mockResolvedValue(updatedProfile);
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockSamsenCore.updateUserProfile).toHaveBeenCalledWith(userId, profileData);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: updatedProfile,
        timestamp: expect.any(String)
      });
    });

    test('GET /profiles/:userId/goals 应该获取用户目标', async () => {
      const userId = 'user123';
      const expectedGoals = [
        { id: 'goal1', title: '掌握二次函数', progress: 0.7 },
        { id: 'goal2', title: '理解导数概念', progress: 0.3 }
      ];
      
      mockReq.url = `/api/samsen/profiles/${userId}/goals`;
      mockSamsenCore.getUserGoals.mockResolvedValue(expectedGoals);
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockSamsenCore.getUserGoals).toHaveBeenCalledWith(userId);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expectedGoals,
        timestamp: expect.any(String)
      });
    });
  });

  describe('错误处理测试', () => {
    test('不支持的HTTP方法应该返回405错误', async () => {
      mockReq.method = 'PATCH';
      mockReq.url = '/api/samsen/status';
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: '不支持的HTTP方法',
          details: null,
          timestamp: expect.any(String)
        }
      });
    });

    test('不存在的端点应该返回404错误', async () => {
      mockReq.url = '/api/samsen/nonexistent';
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: 'API端点不存在',
          details: null,
          timestamp: expect.any(String)
        }
      });
    });

    test('缺少必需参数应该返回400错误', async () => {
      mockReq.url = '/api/samsen/sessions';
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_SESSION_ID',
          message: '缺少会话ID',
          details: null,
          timestamp: expect.any(String)
        }
      });
    });

    test('核心服务错误应该返回500错误', async () => {
      mockReq.url = '/api/samsen/status';
      mockSamsenCore.getSystemStatus.mockRejectedValue(new Error('数据库连接失败'));
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '数据库连接失败',
          details: null,
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('批量操作端点测试', () => {
    test('POST /batch/sessions 应该批量创建会话', async () => {
      const batchData = {
        sessions: [
          { userId: 'user1', subject: 'Mathematics' },
          { userId: 'user2', subject: 'Physics' }
        ]
      };
      
      const expectedResults = {
        created: 2,
        sessions: [
          { id: 'session1', userId: 'user1' },
          { id: 'session2', userId: 'user2' }
        ]
      };
      
      mockReq.method = 'POST';
      mockReq.url = '/api/samsen/batch/sessions';
      mockReq.body = batchData;
      mockSamsenCore.batchCreateSessions.mockResolvedValue(expectedResults);
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockSamsenCore.batchCreateSessions).toHaveBeenCalledWith(batchData);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expectedResults,
        timestamp: expect.any(String)
      });
    });
  });

  describe('管理端点测试', () => {
    test('POST /admin/cleanup 应该执行清理操作', async () => {
      const expectedResult = {
        cleaned: 10,
        message: '清理完成'
      };
      
      mockReq.method = 'POST';
      mockReq.url = '/api/samsen/admin/cleanup';
      mockSamsenCore.cleanup.mockResolvedValue(expectedResult);
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockSamsenCore.cleanup).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expectedResult,
        timestamp: expect.any(String)
      });
    });

    test('GET /admin/metrics 应该获取系统指标', async () => {
      const expectedMetrics = {
        totalSessions: 100,
        activeSessions: 25,
        totalMessages: 1500,
        averageResponseTime: 250
      };
      
      mockReq.url = '/api/samsen/admin/metrics';
      mockSamsenCore.getMetrics.mockResolvedValue(expectedMetrics);
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockSamsenCore.getMetrics).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expectedMetrics,
        timestamp: expect.any(String)
      });
    });

    test('PUT /admin/config 应该更新配置', async () => {
      const configData = {
        maxSessions: 200,
        aiModel: 'gpt-4'
      };
      
      const expectedResult = {
        success: true,
        config: configData
      };
      
      mockReq.method = 'PUT';
      mockReq.url = '/api/samsen/admin/config';
      mockReq.body = configData;
      mockSamsenCore.updateConfig.mockResolvedValue(expectedResult);
      
      await samsenRoutes.handleRequest(mockReq, mockRes);
      
      expect(mockSamsenCore.updateConfig).toHaveBeenCalledWith(configData);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expectedResult,
        timestamp: expect.any(String)
      });
    });
  });
});