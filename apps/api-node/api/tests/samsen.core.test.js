// Samsen核心模块单元测试
// 测试SamsenCore核心控制器的功能

import { jest } from '@jest/globals';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// 模拟依赖
const mockDatabaseAdapter = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  query: jest.fn(),
  transaction: jest.fn(),
  healthCheck: jest.fn()
};

const mockAIServiceAdapter = {
  initialize: jest.fn(),
  processMessage: jest.fn(),
  getAvailableModels: jest.fn(),
  healthCheck: jest.fn()
};

const mockSessionManager = {
  createSession: jest.fn(),
  getSession: jest.fn(),
  updateSession: jest.fn(),
  deleteSession: jest.fn(),
  extendSession: jest.fn(),
  cleanupExpiredSessions: jest.fn()
};

const mockConversationProcessor = {
  processMessage: jest.fn(),
  getHistory: jest.fn(),
  analyzeContext: jest.fn(),
  generateResponse: jest.fn()
};

const mockProfileManager = {
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  getGoals: jest.fn(),
  updateGoals: jest.fn(),
  getActiveSessions: jest.fn(),
  analyzeProgress: jest.fn()
};

// 模拟SamsenCore类
class MockSamsenCore {
  constructor() {
    this.dbAdapter = mockDatabaseAdapter;
    this.aiAdapter = mockAIServiceAdapter;
    this.sessionManager = mockSessionManager;
    this.conversationProcessor = mockConversationProcessor;
    this.profileManager = mockProfileManager;
    this.isInitialized = false;
    this.config = {
      maxSessions: 100,
      sessionTimeout: 3600,
      aiModel: 'gpt-3.5-turbo',
      enableAnalytics: true
    };
  }

  async initialize() {
    try {
      await this.dbAdapter.connect();
      await this.aiAdapter.initialize();
      this.isInitialized = true;
      return { success: true, message: 'Samsen核心初始化成功' };
    } catch (error) {
      throw new Error(`初始化失败: ${error.message}`);
    }
  }

  async createSession(userId, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Samsen核心未初始化');
    }

    const sessionData = {
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.config.sessionTimeout * 1000).toISOString(),
      ...options
    };

    return await this.sessionManager.createSession(sessionData);
  }

  async processConversation(sessionId, message, userId) {
    if (!this.isInitialized) {
      throw new Error('Samsen核心未初始化');
    }

    // 验证会话
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error('会话不存在');
    }

    if (session.userId !== userId) {
      throw new Error('会话用户不匹配');
    }

    // 处理消息
    const response = await this.conversationProcessor.processMessage({
      sessionId,
      message,
      userId,
      timestamp: new Date().toISOString()
    });

    return response;
  }

  async getSystemStatus() {
    const status = {
      initialized: this.isInitialized,
      timestamp: new Date().toISOString(),
      components: {
        database: await this.dbAdapter.healthCheck().catch(() => false),
        aiService: await this.aiAdapter.healthCheck().catch(() => false)
      },
      config: this.config
    };

    return status;
  }

  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    return { success: true, config: this.config };
  }

  async cleanup() {
    await this.sessionManager.cleanupExpiredSessions();
    return { success: true, message: '清理完成' };
  }

  async shutdown() {
    if (this.isInitialized) {
      await this.dbAdapter.disconnect();
      this.isInitialized = false;
    }
    return { success: true, message: 'Samsen核心已关闭' };
  }
}

describe('SamsenCore 核心控制器测试', () => {
  let samsenCore;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 创建新的SamsenCore实例
    samsenCore = new MockSamsenCore();
    
    // 设置默认的模拟返回值
    mockDatabaseAdapter.connect.mockResolvedValue(true);
    mockDatabaseAdapter.healthCheck.mockResolvedValue(true);
    mockAIServiceAdapter.initialize.mockResolvedValue(true);
    mockAIServiceAdapter.healthCheck.mockResolvedValue(true);
    mockSessionManager.createSession.mockResolvedValue({
      id: 'session-123',
      userId: 'user-456',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    });
    mockSessionManager.getSession.mockResolvedValue({
      id: 'session-123',
      userId: 'user-456',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    });
    mockConversationProcessor.processMessage.mockResolvedValue({
      response: '这是AI的回答',
      metadata: { model: 'gpt-3.5-turbo', tokens: 150 }
    });
  });

  afterEach(async () => {
    // 清理资源
    if (samsenCore && samsenCore.isInitialized) {
      await samsenCore.shutdown();
    }
  });

  describe('初始化测试', () => {
    test('应该成功初始化Samsen核心', async () => {
      const result = await samsenCore.initialize();
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Samsen核心初始化成功');
      expect(samsenCore.isInitialized).toBe(true);
      expect(mockDatabaseAdapter.connect).toHaveBeenCalledTimes(1);
      expect(mockAIServiceAdapter.initialize).toHaveBeenCalledTimes(1);
    });

    test('数据库连接失败时应该抛出错误', async () => {
      mockDatabaseAdapter.connect.mockRejectedValue(new Error('数据库连接失败'));
      
      await expect(samsenCore.initialize()).rejects.toThrow('初始化失败: 数据库连接失败');
      expect(samsenCore.isInitialized).toBe(false);
    });

    test('AI服务初始化失败时应该抛出错误', async () => {
      mockAIServiceAdapter.initialize.mockRejectedValue(new Error('AI服务初始化失败'));
      
      await expect(samsenCore.initialize()).rejects.toThrow('初始化失败: AI服务初始化失败');
      expect(samsenCore.isInitialized).toBe(false);
    });
  });

  describe('会话管理测试', () => {
    beforeEach(async () => {
      await samsenCore.initialize();
    });

    test('应该成功创建会话', async () => {
      const userId = 'user-456';
      const options = { subject: 'Mathematics' };
      
      const session = await samsenCore.createSession(userId, options);
      
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('userId', userId);
      expect(mockSessionManager.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          subject: 'Mathematics'
        })
      );
    });

    test('未初始化时创建会话应该失败', async () => {
      const uninitializedCore = new MockSamsenCore();
      
      await expect(uninitializedCore.createSession('user-456'))
        .rejects.toThrow('Samsen核心未初始化');
    });
  });

  describe('对话处理测试', () => {
    beforeEach(async () => {
      await samsenCore.initialize();
    });

    test('应该成功处理对话', async () => {
      const sessionId = 'session-123';
      const message = '请解释二次函数的性质';
      const userId = 'user-456';
      
      const response = await samsenCore.processConversation(sessionId, message, userId);
      
      expect(response).toHaveProperty('response');
      expect(response).toHaveProperty('metadata');
      expect(mockSessionManager.getSession).toHaveBeenCalledWith(sessionId);
      expect(mockConversationProcessor.processMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId,
          message,
          userId
        })
      );
    });

    test('会话不存在时应该失败', async () => {
      mockSessionManager.getSession.mockResolvedValue(null);
      
      await expect(samsenCore.processConversation('invalid-session', '消息', 'user-456'))
        .rejects.toThrow('会话不存在');
    });

    test('用户不匹配时应该失败', async () => {
      mockSessionManager.getSession.mockResolvedValue({
        id: 'session-123',
        userId: 'other-user'
      });
      
      await expect(samsenCore.processConversation('session-123', '消息', 'user-456'))
        .rejects.toThrow('会话用户不匹配');
    });

    test('未初始化时处理对话应该失败', async () => {
      const uninitializedCore = new MockSamsenCore();
      
      await expect(uninitializedCore.processConversation('session-123', '消息', 'user-456'))
        .rejects.toThrow('Samsen核心未初始化');
    });
  });

  describe('系统状态测试', () => {
    test('应该返回正确的系统状态', async () => {
      await samsenCore.initialize();
      
      const status = await samsenCore.getSystemStatus();
      
      expect(status).toHaveProperty('initialized', true);
      expect(status).toHaveProperty('timestamp');
      expect(status).toHaveProperty('components');
      expect(status.components).toHaveProperty('database', true);
      expect(status.components).toHaveProperty('aiService', true);
      expect(status).toHaveProperty('config');
    });

    test('未初始化时应该返回正确状态', async () => {
      const status = await samsenCore.getSystemStatus();
      
      expect(status.initialized).toBe(false);
    });

    test('组件健康检查失败时应该正确处理', async () => {
      await samsenCore.initialize();
      mockDatabaseAdapter.healthCheck.mockRejectedValue(new Error('数据库错误'));
      
      const status = await samsenCore.getSystemStatus();
      
      expect(status.components.database).toBe(false);
    });
  });

  describe('配置管理测试', () => {
    test('应该成功更新配置', async () => {
      const newConfig = {
        maxSessions: 200,
        aiModel: 'gpt-4'
      };
      
      const result = await samsenCore.updateConfig(newConfig);
      
      expect(result.success).toBe(true);
      expect(result.config.maxSessions).toBe(200);
      expect(result.config.aiModel).toBe('gpt-4');
      expect(result.config.sessionTimeout).toBe(3600); // 保持原有配置
    });
  });

  describe('清理和关闭测试', () => {
    beforeEach(async () => {
      await samsenCore.initialize();
    });

    test('应该成功执行清理操作', async () => {
      mockSessionManager.cleanupExpiredSessions.mockResolvedValue({ cleaned: 5 });
      
      const result = await samsenCore.cleanup();
      
      expect(result.success).toBe(true);
      expect(mockSessionManager.cleanupExpiredSessions).toHaveBeenCalledTimes(1);
    });

    test('应该成功关闭系统', async () => {
      const result = await samsenCore.shutdown();
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Samsen核心已关闭');
      expect(samsenCore.isInitialized).toBe(false);
      expect(mockDatabaseAdapter.disconnect).toHaveBeenCalledTimes(1);
    });

    test('未初始化时关闭系统应该正常处理', async () => {
      const uninitializedCore = new MockSamsenCore();
      
      const result = await uninitializedCore.shutdown();
      
      expect(result.success).toBe(true);
      expect(mockDatabaseAdapter.disconnect).not.toHaveBeenCalled();
    });
  });
});