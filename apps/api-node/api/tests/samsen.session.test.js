// Samsen会话管理器单元测试
// 测试SessionManager的会话管理功能

import { jest } from '@jest/globals';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// 模拟数据库适配器
const mockDatabaseAdapter = {
  query: jest.fn(),
  transaction: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn()
};

// 模拟SessionManager类
class MockSessionManager {
  constructor(dbAdapter) {
    this.dbAdapter = dbAdapter;
    this.activeSessions = new Map();
    this.config = {
      maxSessionsPerUser: 5,
      defaultTimeout: 3600, // 1小时
      maxTimeout: 86400, // 24小时
      cleanupInterval: 300 // 5分钟
    };
  }

  async createSession(sessionData) {
    const { userId, subject, learningGoals, timeout } = sessionData;
    
    // 验证用户会话数量限制
    const userSessions = await this.getUserActiveSessions(userId);
    if (userSessions.length >= this.config.maxSessionsPerUser) {
      throw new Error(`用户活跃会话数量超过限制 (${this.config.maxSessionsPerUser})`);
    }

    const sessionId = this.generateSessionId();
    const now = new Date();
    const sessionTimeout = Math.min(timeout || this.config.defaultTimeout, this.config.maxTimeout);
    const expiresAt = new Date(now.getTime() + sessionTimeout * 1000);

    const session = {
      id: sessionId,
      userId,
      subject: subject || 'General',
      learningGoals: learningGoals || [],
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      messageCount: 0,
      lastActivity: now.toISOString(),
      metadata: {
        userAgent: sessionData.userAgent,
        ipAddress: sessionData.ipAddress,
        platform: sessionData.platform
      }
    };

    // 保存到数据库
    await this.dbAdapter.insert('sessions', session);
    
    // 添加到内存缓存
    this.activeSessions.set(sessionId, session);

    return session;
  }

  async getSession(sessionId) {
    // 先从内存缓存查找
    if (this.activeSessions.has(sessionId)) {
      const session = this.activeSessions.get(sessionId);
      
      // 检查是否过期
      if (new Date(session.expiresAt) > new Date()) {
        return session;
      } else {
        // 过期则从缓存中移除
        this.activeSessions.delete(sessionId);
        await this.updateSessionStatus(sessionId, 'expired');
        return null;
      }
    }

    // 从数据库查找
    const session = await this.dbAdapter.findById('sessions', sessionId);
    if (!session) {
      return null;
    }

    // 检查是否过期
    if (new Date(session.expiresAt) <= new Date()) {
      await this.updateSessionStatus(sessionId, 'expired');
      return null;
    }

    // 添加到内存缓存
    this.activeSessions.set(sessionId, session);
    return session;
  }

  async updateSession(sessionId, updates) {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('会话不存在或已过期');
    }

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    // 更新数据库
    await this.dbAdapter.update('sessions', sessionId, updatedSession);
    
    // 更新内存缓存
    this.activeSessions.set(sessionId, updatedSession);

    return updatedSession;
  }

  async extendSession(sessionId, additionalTime) {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('会话不存在或已过期');
    }

    const currentExpiry = new Date(session.expiresAt);
    const newExpiry = new Date(currentExpiry.getTime() + additionalTime * 1000);
    const maxExpiry = new Date(Date.now() + this.config.maxTimeout * 1000);

    // 限制最大延长时间
    const finalExpiry = newExpiry > maxExpiry ? maxExpiry : newExpiry;

    return await this.updateSession(sessionId, {
      expiresAt: finalExpiry.toISOString()
    });
  }

  async deleteSession(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return false;
    }

    // 更新状态为已删除
    await this.updateSessionStatus(sessionId, 'deleted');
    
    // 从内存缓存中移除
    this.activeSessions.delete(sessionId);

    return true;
  }

  async getUserActiveSessions(userId) {
    const sessions = await this.dbAdapter.findByUserId('sessions', userId);
    return sessions.filter(session => 
      session.status === 'active' && new Date(session.expiresAt) > new Date()
    );
  }

  async incrementMessageCount(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('会话不存在或已过期');
    }

    return await this.updateSession(sessionId, {
      messageCount: session.messageCount + 1
    });
  }

  async cleanupExpiredSessions() {
    const now = new Date();
    const expiredSessions = [];

    // 清理内存缓存中的过期会话
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (new Date(session.expiresAt) <= now) {
        expiredSessions.push(sessionId);
        this.activeSessions.delete(sessionId);
      }
    }

    // 批量更新数据库中的过期会话状态
    if (expiredSessions.length > 0) {
      await this.dbAdapter.query(
        'UPDATE sessions SET status = ? WHERE id IN (?) AND expires_at <= ?',
        ['expired', expiredSessions, now.toISOString()]
      );
    }

    return {
      cleanedCount: expiredSessions.length,
      cleanedSessions: expiredSessions
    };
  }

  async getSessionStats(userId = null) {
    const stats = {
      total: 0,
      active: 0,
      expired: 0,
      deleted: 0,
      averageMessageCount: 0,
      averageDuration: 0
    };

    let query = 'SELECT * FROM sessions';
    let params = [];

    if (userId) {
      query += ' WHERE user_id = ?';
      params.push(userId);
    }

    const sessions = await this.dbAdapter.query(query, params);
    
    if (sessions.length === 0) {
      return stats;
    }

    stats.total = sessions.length;
    let totalMessages = 0;
    let totalDuration = 0;

    sessions.forEach(session => {
      stats[session.status]++;
      totalMessages += session.messageCount || 0;
      
      const created = new Date(session.createdAt);
      const ended = session.status === 'active' ? new Date() : new Date(session.updatedAt);
      totalDuration += (ended - created) / 1000; // 转换为秒
    });

    stats.averageMessageCount = Math.round(totalMessages / sessions.length * 100) / 100;
    stats.averageDuration = Math.round(totalDuration / sessions.length * 100) / 100;

    return stats;
  }

  // 私有方法
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async updateSessionStatus(sessionId, status) {
    await this.dbAdapter.update('sessions', sessionId, {
      status,
      updatedAt: new Date().toISOString()
    });
  }
}

describe('SessionManager 会话管理器测试', () => {
  let sessionManager;
  let testUserId;
  let testSessionData;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 创建SessionManager实例
    sessionManager = new MockSessionManager(mockDatabaseAdapter);
    
    // 测试数据
    testUserId = 'user_' + Date.now();
    testSessionData = {
      userId: testUserId,
      subject: 'Mathematics',
      learningGoals: ['掌握二次函数', '理解函数图像'],
      userAgent: 'test-agent',
      ipAddress: '127.0.0.1',
      platform: 'web'
    };

    // 设置默认模拟返回值
    mockDatabaseAdapter.insert.mockResolvedValue(true);
    mockDatabaseAdapter.update.mockResolvedValue(true);
    mockDatabaseAdapter.findById.mockResolvedValue(null);
    mockDatabaseAdapter.findByUserId.mockResolvedValue([]);
    mockDatabaseAdapter.query.mockResolvedValue([]);
  });

  describe('会话创建测试', () => {
    test('应该成功创建新会话', async () => {
      const session = await sessionManager.createSession(testSessionData);
      
      expect(session).toHaveProperty('id');
      expect(session.userId).toBe(testUserId);
      expect(session.subject).toBe('Mathematics');
      expect(session.status).toBe('active');
      expect(session.messageCount).toBe(0);
      expect(session.learningGoals).toEqual(['掌握二次函数', '理解函数图像']);
      expect(mockDatabaseAdapter.insert).toHaveBeenCalledWith('sessions', expect.objectContaining({
        userId: testUserId,
        subject: 'Mathematics',
        status: 'active'
      }));
    });

    test('应该使用默认值创建会话', async () => {
      const minimalData = { userId: testUserId };
      const session = await sessionManager.createSession(minimalData);
      
      expect(session.subject).toBe('General');
      expect(session.learningGoals).toEqual([]);
    });

    test('超过用户会话限制时应该失败', async () => {
      // 模拟用户已有5个活跃会话
      const existingSessions = Array(5).fill().map((_, i) => ({
        id: `session_${i}`,
        userId: testUserId,
        status: 'active',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      }));
      
      mockDatabaseAdapter.findByUserId.mockResolvedValue(existingSessions);
      
      await expect(sessionManager.createSession(testSessionData))
        .rejects.toThrow('用户活跃会话数量超过限制 (5)');
    });

    test('应该正确设置会话过期时间', async () => {
      const customTimeout = 7200; // 2小时
      const sessionData = { ...testSessionData, timeout: customTimeout };
      
      const session = await sessionManager.createSession(sessionData);
      
      const createdAt = new Date(session.createdAt);
      const expiresAt = new Date(session.expiresAt);
      const expectedExpiry = new Date(createdAt.getTime() + customTimeout * 1000);
      
      expect(Math.abs(expiresAt - expectedExpiry)).toBeLessThan(1000); // 允许1秒误差
    });

    test('应该限制最大过期时间', async () => {
      const excessiveTimeout = 100000; // 超过24小时限制
      const sessionData = { ...testSessionData, timeout: excessiveTimeout };
      
      const session = await sessionManager.createSession(sessionData);
      
      const createdAt = new Date(session.createdAt);
      const expiresAt = new Date(session.expiresAt);
      const maxExpiry = new Date(createdAt.getTime() + 86400 * 1000); // 24小时
      
      expect(expiresAt.getTime()).toBeLessThanOrEqual(maxExpiry.getTime());
    });
  });

  describe('会话获取测试', () => {
    let testSession;

    beforeEach(async () => {
      testSession = await sessionManager.createSession(testSessionData);
    });

    test('应该从内存缓存获取活跃会话', async () => {
      const session = await sessionManager.getSession(testSession.id);
      
      expect(session).toEqual(testSession);
      expect(mockDatabaseAdapter.findById).not.toHaveBeenCalled();
    });

    test('应该从数据库获取不在缓存中的会话', async () => {
      const sessionId = 'external_session_123';
      const dbSession = {
        id: sessionId,
        userId: testUserId,
        status: 'active',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };
      
      mockDatabaseAdapter.findById.mockResolvedValue(dbSession);
      
      const session = await sessionManager.getSession(sessionId);
      
      expect(session).toEqual(dbSession);
      expect(mockDatabaseAdapter.findById).toHaveBeenCalledWith('sessions', sessionId);
    });

    test('不存在的会话应该返回null', async () => {
      const session = await sessionManager.getSession('nonexistent_session');
      
      expect(session).toBeNull();
    });

    test('过期的会话应该返回null并更新状态', async () => {
      // 创建一个已过期的会话
      const expiredSession = {
        ...testSession,
        expiresAt: new Date(Date.now() - 1000).toISOString() // 1秒前过期
      };
      
      sessionManager.activeSessions.set(testSession.id, expiredSession);
      
      const session = await sessionManager.getSession(testSession.id);
      
      expect(session).toBeNull();
      expect(sessionManager.activeSessions.has(testSession.id)).toBe(false);
      expect(mockDatabaseAdapter.update).toHaveBeenCalledWith(
        'sessions',
        testSession.id,
        expect.objectContaining({ status: 'expired' })
      );
    });
  });

  describe('会话更新测试', () => {
    let testSession;

    beforeEach(async () => {
      testSession = await sessionManager.createSession(testSessionData);
    });

    test('应该成功更新会话', async () => {
      const updates = {
        subject: 'Physics',
        learningGoals: ['理解牛顿定律']
      };
      
      const updatedSession = await sessionManager.updateSession(testSession.id, updates);
      
      expect(updatedSession.subject).toBe('Physics');
      expect(updatedSession.learningGoals).toEqual(['理解牛顿定律']);
      expect(updatedSession.updatedAt).not.toBe(testSession.updatedAt);
      expect(mockDatabaseAdapter.update).toHaveBeenCalledWith(
        'sessions',
        testSession.id,
        expect.objectContaining(updates)
      );
    });

    test('更新不存在的会话应该失败', async () => {
      await expect(sessionManager.updateSession('nonexistent', { subject: 'Physics' }))
        .rejects.toThrow('会话不存在或已过期');
    });
  });

  describe('会话延长测试', () => {
    let testSession;

    beforeEach(async () => {
      testSession = await sessionManager.createSession(testSessionData);
    });

    test('应该成功延长会话时间', async () => {
      const additionalTime = 1800; // 30分钟
      const originalExpiry = new Date(testSession.expiresAt);
      
      const extendedSession = await sessionManager.extendSession(testSession.id, additionalTime);
      
      const newExpiry = new Date(extendedSession.expiresAt);
      const expectedExpiry = new Date(originalExpiry.getTime() + additionalTime * 1000);
      
      expect(Math.abs(newExpiry - expectedExpiry)).toBeLessThan(1000);
    });

    test('应该限制延长后的最大时间', async () => {
      const excessiveTime = 100000; // 超过最大限制
      
      const extendedSession = await sessionManager.extendSession(testSession.id, excessiveTime);
      
      const newExpiry = new Date(extendedSession.expiresAt);
      const maxExpiry = new Date(Date.now() + 86400 * 1000); // 24小时后
      
      expect(newExpiry.getTime()).toBeLessThanOrEqual(maxExpiry.getTime());
    });
  });

  describe('会话删除测试', () => {
    let testSession;

    beforeEach(async () => {
      testSession = await sessionManager.createSession(testSessionData);
    });

    test('应该成功删除会话', async () => {
      const result = await sessionManager.deleteSession(testSession.id);
      
      expect(result).toBe(true);
      expect(sessionManager.activeSessions.has(testSession.id)).toBe(false);
      expect(mockDatabaseAdapter.update).toHaveBeenCalledWith(
        'sessions',
        testSession.id,
        expect.objectContaining({ status: 'deleted' })
      );
    });

    test('删除不存在的会话应该返回false', async () => {
      const result = await sessionManager.deleteSession('nonexistent');
      
      expect(result).toBe(false);
    });
  });

  describe('消息计数测试', () => {
    let testSession;

    beforeEach(async () => {
      testSession = await sessionManager.createSession(testSessionData);
    });

    test('应该正确增加消息计数', async () => {
      const updatedSession = await sessionManager.incrementMessageCount(testSession.id);
      
      expect(updatedSession.messageCount).toBe(1);
      
      const secondUpdate = await sessionManager.incrementMessageCount(testSession.id);
      expect(secondUpdate.messageCount).toBe(2);
    });
  });

  describe('清理过期会话测试', () => {
    test('应该清理过期的会话', async () => {
      // 创建一个过期的会话并添加到缓存
      const expiredSession = {
        id: 'expired_session',
        userId: testUserId,
        expiresAt: new Date(Date.now() - 1000).toISOString()
      };
      
      sessionManager.activeSessions.set('expired_session', expiredSession);
      
      const result = await sessionManager.cleanupExpiredSessions();
      
      expect(result.cleanedCount).toBe(1);
      expect(result.cleanedSessions).toContain('expired_session');
      expect(sessionManager.activeSessions.has('expired_session')).toBe(false);
      expect(mockDatabaseAdapter.query).toHaveBeenCalledWith(
        'UPDATE sessions SET status = ? WHERE id IN (?) AND expires_at <= ?',
        ['expired', ['expired_session'], expect.any(String)]
      );
    });

    test('没有过期会话时应该返回空结果', async () => {
      const result = await sessionManager.cleanupExpiredSessions();
      
      expect(result.cleanedCount).toBe(0);
      expect(result.cleanedSessions).toEqual([]);
    });
  });

  describe('会话统计测试', () => {
    test('应该返回正确的会话统计', async () => {
      const mockSessions = [
        { status: 'active', messageCount: 10, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T01:00:00Z' },
        { status: 'expired', messageCount: 5, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:30:00Z' },
        { status: 'deleted', messageCount: 15, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T02:00:00Z' }
      ];
      
      mockDatabaseAdapter.query.mockResolvedValue(mockSessions);
      
      const stats = await sessionManager.getSessionStats();
      
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(1);
      expect(stats.expired).toBe(1);
      expect(stats.deleted).toBe(1);
      expect(stats.averageMessageCount).toBe(10); // (10+5+15)/3
    });

    test('没有会话时应该返回零统计', async () => {
      const stats = await sessionManager.getSessionStats();
      
      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.averageMessageCount).toBe(0);
    });
  });
});