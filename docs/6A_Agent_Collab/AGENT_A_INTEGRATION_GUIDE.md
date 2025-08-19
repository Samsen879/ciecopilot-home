# Agent A 后端对接完整指南

## 🎯 指南概述

本指南为Agent A提供完整的后端开发指导，确保与Agent B新增的前端组件完美对接。

**目标**: 个性化推荐系统 + 学习社区平台  
**优先级**: 高优先级项目  
**预计工期**: 2-3周  
**技术栈**: 与现有后端保持一致

---

## 📋 实施计划总览

### 第一周 (基础框架)
- [x] ✅ **Day 1-2**: 数据库设计和建表
- [x] ✅ **Day 3-4**: 基础API端点实现
- [x] ✅ **Day 5**: 用户认证和权限系统

### 第二周 (核心功能)
- [ ] 🔄 **Day 1-3**: 推荐算法核心逻辑
- [ ] 🔄 **Day 4-5**: 社区功能完整实现

### 第三周 (优化集成)
- [ ] ⏳ **Day 1-2**: 前后端联调测试
- [ ] ⏳ **Day 3-4**: 性能优化和错误处理
- [ ] ⏳ **Day 5**: 文档完善和部署准备

---

## 🗄 数据库设计指南

### 核心表结构

#### 1. 推荐系统相关表

```sql
-- 推荐内容表
CREATE TABLE recommendations (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type ENUM('study', 'practice', 'review', 'concept', 'video', 'assessment'),
    difficulty ENUM('beginner', 'intermediate', 'advanced'),
    subject_code VARCHAR(4) NOT NULL,
    content_url TEXT NOT NULL,
    thumbnail_url TEXT,
    estimated_time INT DEFAULT 0,
    tags JSON,
    view_count INT DEFAULT 0,
    completion_rate DECIMAL(3,2) DEFAULT 0.00,
    avg_rating DECIMAL(2,1) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_subject_type (subject_code, content_type),
    INDEX idx_difficulty (difficulty),
    INDEX idx_rating (avg_rating DESC)
);

-- 用户偏好表
CREATE TABLE user_preferences (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    subject_code VARCHAR(4) NOT NULL,
    content_type_weights JSON DEFAULT '{}',
    difficulty_preference ENUM('beginner', 'intermediate', 'advanced', 'adaptive') DEFAULT 'adaptive',
    daily_study_time INT DEFAULT 60,
    session_duration INT DEFAULT 30,
    preferred_time_slots JSON DEFAULT '[]',
    learning_style JSON DEFAULT '{}',
    focus_priority ENUM('weak_areas', 'new_topics', 'review', 'balanced') DEFAULT 'balanced',
    specific_topics JSON DEFAULT '[]',
    avoid_topics JSON DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_subject (user_id, subject_code)
);

-- 推荐反馈表
CREATE TABLE recommendation_feedback (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    recommendation_id VARCHAR(36) NOT NULL,
    action ENUM('viewed', 'clicked', 'started', 'completed', 'dismissed', 'liked', 'disliked', 'shared', 'bookmarked'),
    rating INT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_recommendation (user_id, recommendation_id),
    INDEX idx_action_time (action, created_at DESC),
    FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE
);

-- 用户学习数据表
CREATE TABLE user_learning_data (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    subject_code VARCHAR(4) NOT NULL,
    completed_topics JSON DEFAULT '[]',
    weak_areas JSON DEFAULT '[]',
    average_study_time INT DEFAULT 0,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performance_metrics JSON DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_subject_learning (user_id, subject_code)
);
```

#### 2. 社区系统相关表

```sql
-- 社区问题表
CREATE TABLE community_questions (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category ENUM('homework', 'concept', 'exam', 'general', 'discussion') DEFAULT 'general',
    subject_code VARCHAR(4) NOT NULL,
    tags JSON DEFAULT '[]',
    author_id VARCHAR(36) NOT NULL,
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    answer_count INT DEFAULT 0,
    status ENUM('open', 'answered', 'closed', 'featured') DEFAULT 'open',
    is_answered BOOLEAN DEFAULT FALSE,
    best_answer_id VARCHAR(36) NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_subject_category (subject_code, category),
    INDEX idx_status_time (status, created_at DESC),
    INDEX idx_featured (is_featured, created_at DESC),
    INDEX idx_author (author_id),
    FULLTEXT KEY ft_title_content (title, content)
);

-- 社区回答表
CREATE TABLE community_answers (
    id VARCHAR(36) PRIMARY KEY,
    content TEXT NOT NULL,
    question_id VARCHAR(36) NOT NULL,
    author_id VARCHAR(36) NOT NULL,
    is_best_answer BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    like_count INT DEFAULT 0,
    helpful_count INT DEFAULT 0,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_question (question_id),
    INDEX idx_author (author_id),
    INDEX idx_best_answer (is_best_answer),
    FOREIGN KEY (question_id) REFERENCES community_questions(id) ON DELETE CASCADE
);

-- 用户社区档案表
CREATE TABLE user_community_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    reputation INT DEFAULT 0,
    level INT DEFAULT 1,
    questions_asked INT DEFAULT 0,
    answers_given INT DEFAULT 0,
    best_answers INT DEFAULT 0,
    helpful_answers INT DEFAULT 0,
    total_views INT DEFAULT 0,
    total_likes INT DEFAULT 0,
    followers_count INT DEFAULT 0,
    following_count INT DEFAULT 0,
    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_reputation (reputation DESC),
    INDEX idx_level (level DESC)
);

-- 用户徽章表
CREATE TABLE user_badges (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    badge_id VARCHAR(36) NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress_current INT DEFAULT 0,
    progress_required INT DEFAULT 0,
    INDEX idx_user (user_id),
    INDEX idx_badge (badge_id),
    UNIQUE KEY unique_user_badge (user_id, badge_id)
);

-- 徽章定义表
CREATE TABLE badges (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    category ENUM('contribution', 'quality', 'milestone', 'special', 'subject') DEFAULT 'contribution',
    rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') DEFAULT 'common',
    requirements JSON DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 社区互动表
CREATE TABLE community_interactions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    target_type ENUM('question', 'answer') NOT NULL,
    target_id VARCHAR(36) NOT NULL,
    action ENUM('like', 'follow', 'bookmark', 'vote_up', 'vote_down', 'mark_helpful', 'mark_best') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_action (user_id, action),
    INDEX idx_target (target_type, target_id),
    UNIQUE KEY unique_user_target_action (user_id, target_type, target_id, action)
);

-- 声誉变更日志表
CREATE TABLE reputation_changes (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    action VARCHAR(50) NOT NULL,
    points INT NOT NULL,
    related_type ENUM('question', 'answer', 'badge', 'other') NULL,
    related_id VARCHAR(36) NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_time (user_id, created_at DESC)
);
```

#### 3. 通用支持表

```sql
-- 文件附件表
CREATE TABLE file_attachments (
    id VARCHAR(36) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    uploaded_by VARCHAR(36) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_uploader (uploaded_by)
);

-- 内容标签表
CREATE TABLE content_tags (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(50) DEFAULT 'general',
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_usage (usage_count DESC)
);

-- 页面访问统计表
CREATE TABLE page_analytics (
    id VARCHAR(36) PRIMARY KEY,
    path VARCHAR(255) NOT NULL,
    subject_code VARCHAR(4),
    user_id VARCHAR(36),
    session_id VARCHAR(100),
    visit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration INT DEFAULT 0,
    referrer TEXT,
    user_agent TEXT,
    INDEX idx_path_time (path, visit_time DESC),
    INDEX idx_user_time (user_id, visit_time DESC),
    INDEX idx_subject (subject_code)
);
```

---

## 🚀 API端点实现指南

### 1. 推荐系统API实现

#### 获取推荐内容 (核心API)
```typescript
// GET /api/recommendations/{subjectCode}
app.get('/api/recommendations/:subjectCode', async (req, res) => {
  try {
    const { subjectCode } = req.params;
    const { userId, page = 1, limit = 20, contentType, difficulty, refresh } = req.query;
    
    // 1. 验证参数
    if (!VALID_SUBJECTS.includes(subjectCode)) {
      return res.status(400).json({ success: false, error: 'Invalid subject code' });
    }
    
    // 2. 获取用户偏好
    const userPreferences = await getUserPreferences(userId, subjectCode);
    
    // 3. 获取用户学习数据
    const learningData = await getUserLearningData(userId, subjectCode);
    
    // 4. 运行推荐算法
    const recommendations = await generateRecommendations({
      userId,
      subjectCode,
      userPreferences,
      learningData,
      filters: { contentType, difficulty },
      pagination: { page, limit }
    });
    
    // 5. 记录访问日志
    await logRecommendationAccess(userId, subjectCode, recommendations.length);
    
    res.json({
      success: true,
      data: {
        recommendations: recommendations.items,
        pagination: recommendations.pagination,
        metadata: {
          lastUpdated: new Date().toISOString(),
          algorithmVersion: '1.0',
          personalizedScore: recommendations.personalizationScore
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Recommendation API error:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get recommendations' }
    });
  }
});
```

#### 推荐算法核心逻辑
```typescript
async function generateRecommendations(params) {
  const { userId, subjectCode, userPreferences, learningData, filters, pagination } = params;
  
  // 1. 基础内容池
  let contentPool = await getAvailableContent(subjectCode, filters);
  
  // 2. 用户画像分析
  const userProfile = await analyzeUserProfile(userId, learningData);
  
  // 3. 内容评分算法
  const scoredContent = contentPool.map(content => ({
    ...content,
    matchScore: calculateMatchScore(content, userProfile, userPreferences),
    priority: calculatePriority(content, userProfile),
    reason: generateRecommendationReason(content, userProfile)
  }));
  
  // 4. 排序和过滤
  const sortedContent = scoredContent
    .filter(item => item.matchScore > 0.3) // 最低匹配度阈值
    .sort((a, b) => b.matchScore - a.matchScore);
  
  // 5. 多样性优化
  const diversifiedContent = applyDiversityAlgorithm(sortedContent, userPreferences);
  
  // 6. 分页处理
  const startIndex = (pagination.page - 1) * pagination.limit;
  const paginatedContent = diversifiedContent.slice(startIndex, startIndex + pagination.limit);
  
  return {
    items: paginatedContent,
    pagination: {
      currentPage: pagination.page,
      totalPages: Math.ceil(diversifiedContent.length / pagination.limit),
      totalCount: diversifiedContent.length,
      hasMore: startIndex + pagination.limit < diversifiedContent.length
    },
    personalizationScore: calculatePersonalizationScore(userProfile)
  };
}

// 匹配度计算算法
function calculateMatchScore(content, userProfile, preferences) {
  let score = 0;
  
  // 1. 内容类型偏好 (30%)
  const typeWeight = preferences.contentTypeWeights[content.type] || 0.5;
  score += typeWeight * 0.3;
  
  // 2. 难度匹配 (25%)
  const difficultyMatch = calculateDifficultyMatch(content.difficulty, userProfile.skillLevel);
  score += difficultyMatch * 0.25;
  
  // 3. 薄弱领域权重 (20%)
  const weakAreaMatch = content.tags.some(tag => userProfile.weakAreas.includes(tag)) ? 1 : 0;
  score += weakAreaMatch * 0.2;
  
  // 4. 学习历史相关性 (15%)
  const historyRelevance = calculateHistoryRelevance(content, userProfile.completedTopics);
  score += historyRelevance * 0.15;
  
  // 5. 时间适配性 (10%)
  const timeMatch = content.estimatedTime <= preferences.sessionDuration ? 1 : 0.5;
  score += timeMatch * 0.1;
  
  return Math.min(score, 1); // 确保分数在0-1之间
}
```

### 2. 社区系统API实现

#### 获取社区问题列表
```typescript
// GET /api/community/{subjectCode}/questions
app.get('/api/community/:subjectCode/questions', async (req, res) => {
  try {
    const { subjectCode } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      category, 
      sortBy = 'latest', 
      searchTerm, 
      tags, 
      status,
      userId 
    } = req.query;
    
    // 构建查询条件
    const queryConditions = {
      subject_code: subjectCode,
      ...(category && { category }),
      ...(status && { status }),
      ...(userId && { author_id: userId })
    };
    
    // 搜索处理
    let searchCondition = '';
    if (searchTerm) {
      searchCondition = `AND (title LIKE '%${searchTerm}%' OR content LIKE '%${searchTerm}%')`;
    }
    
    // 标签过滤
    let tagCondition = '';
    if (tags && Array.isArray(tags)) {
      const tagFilters = tags.map(tag => `JSON_CONTAINS(tags, '"${tag}"')`).join(' OR ');
      tagCondition = `AND (${tagFilters})`;
    }
    
    // 排序逻辑
    const sortOptions = {
      latest: 'created_at DESC',
      popular: 'like_count DESC, view_count DESC',
      unanswered: 'is_answered ASC, created_at DESC',
      trending: 'last_activity_at DESC',
      oldest: 'created_at ASC'
    };
    
    const orderBy = sortOptions[sortBy] || sortOptions.latest;
    
    // 执行查询
    const questions = await db.query(`
      SELECT 
        q.*,
        u.username as author_username,
        u.avatar as author_avatar,
        ucp.reputation as author_reputation,
        ucp.level as author_level
      FROM community_questions q
      LEFT JOIN users u ON q.author_id = u.id
      LEFT JOIN user_community_profiles ucp ON q.author_id = ucp.user_id
      WHERE ${Object.keys(queryConditions).map(key => `${key} = ?`).join(' AND ')}
      ${searchCondition}
      ${tagCondition}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `, [
      ...Object.values(queryConditions),
      parseInt(limit),
      (parseInt(page) - 1) * parseInt(limit)
    ]);
    
    // 获取总数
    const totalCount = await db.query(`
      SELECT COUNT(*) as count
      FROM community_questions q
      WHERE ${Object.keys(queryConditions).map(key => `${key} = ?`).join(' AND ')}
      ${searchCondition}
      ${tagCondition}
    `, Object.values(queryConditions));
    
    // 获取过滤器数据
    const filters = await getCommunityFilters(subjectCode);
    
    res.json({
      success: true,
      data: {
        questions: questions.map(formatQuestionResponse),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount[0].count / parseInt(limit)),
          totalCount: totalCount[0].count,
          hasMore: (parseInt(page) * parseInt(limit)) < totalCount[0].count
        },
        filters
      }
    });
    
  } catch (error) {
    console.error('Community questions API error:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get community questions' }
    });
  }
});
```

#### 社区互动系统
```typescript
// POST /api/community/{type}/{id}/interact
app.post('/api/community/:type/:id/interact', authenticateToken, async (req, res) => {
  try {
    const { type, id } = req.params; // type: 'questions' | 'answers'
    const { action } = req.body;
    const userId = req.user.id;
    
    // 验证参数
    if (!['questions', 'answers'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid type' });
    }
    
    const validActions = [
      'like', 'unlike', 'follow', 'unfollow', 'bookmark', 'unbookmark',
      'vote_up', 'vote_down', 'vote_cancel', 'mark_helpful', 'unmark_helpful',
      'mark_best', 'unmark_best'
    ];
    
    if (!validActions.includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }
    
    // 开始事务
    await db.beginTransaction();
    
    try {
      // 处理互动逻辑
      const result = await processInteraction(type, id, userId, action);
      
      // 更新统计数据
      await updateInteractionStats(type, id, action);
      
      // 更新用户声誉
      await updateUserReputation(userId, action, type);
      
      // 提交事务
      await db.commit();
      
      res.json({
        success: true,
        data: {
          action,
          newCounts: result.newCounts,
          userInteraction: result.userInteraction
        }
      });
      
    } catch (error) {
      await db.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Interaction API error:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to process interaction' }
    });
  }
});

// 互动处理核心逻辑
async function processInteraction(type, targetId, userId, action) {
  const table = type === 'questions' ? 'community_questions' : 'community_answers';
  
  switch (action) {
    case 'like':
      await db.query(
        'INSERT INTO community_interactions (user_id, target_type, target_id, action) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE created_at = NOW()',
        [userId, type.slice(0, -1), targetId, 'like']
      );
      await db.query(`UPDATE ${table} SET like_count = like_count + 1 WHERE id = ?`, [targetId]);
      break;
      
    case 'unlike':
      await db.query(
        'DELETE FROM community_interactions WHERE user_id = ? AND target_type = ? AND target_id = ? AND action = ?',
        [userId, type.slice(0, -1), targetId, 'like']
      );
      await db.query(`UPDATE ${table} SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?`, [targetId]);
      break;
      
    case 'mark_best':
      if (type === 'answers') {
        // 验证用户是否为问题作者
        const question = await getQuestionByAnswerId(targetId);
        if (question.author_id !== userId) {
          throw new Error('Only question author can mark best answer');
        }
        
        // 取消之前的最佳答案
        await db.query(
          'UPDATE community_answers SET is_best_answer = FALSE WHERE question_id = ?',
          [question.id]
        );
        
        // 设置新的最佳答案
        await db.query(
          'UPDATE community_answers SET is_best_answer = TRUE WHERE id = ?',
          [targetId]
        );
        
        // 更新问题状态
        await db.query(
          'UPDATE community_questions SET is_answered = TRUE, best_answer_id = ? WHERE id = ?',
          [targetId, question.id]
        );
      }
      break;
      
    // ... 其他互动类型的处理逻辑
  }
  
  // 返回更新后的统计数据
  const newCounts = await getUpdatedCounts(type, targetId);
  const userInteraction = await getUserInteractionStatus(userId, type, targetId);
  
  return { newCounts, userInteraction };
}
```

---

## 🔐 用户认证和权限系统

### JWT Token中间件
```typescript
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: { code: 'AUTH_REQUIRED', message: 'Access token required' }
    });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
      });
    }
    
    req.user = user;
    next();
  });
}

// 权限检查中间件
function checkPermission(requiredPermission) {
  return async (req, res, next) => {
    try {
      const userPermissions = await getUserPermissions(req.user.id);
      
      if (!userPermissions[requiredPermission]) {
        return res.status(403).json({ 
          success: false, 
          error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Permission denied' }
        });
      }
      
      next();
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: { code: 'PERMISSION_CHECK_FAILED', message: 'Permission check failed' }
      });
    }
  };
}
```

### 用户权限配置
```typescript
const DEFAULT_PERMISSIONS = {
  student: {
    canCreateQuestions: true,
    canAnswerQuestions: true,
    canModerateContent: false,
    canDeleteContent: false,
    canManageUsers: false,
    canAccessAnalytics: false,
    dailyQuestionLimit: 10,
    dailyAnswerLimit: 20
  },
  teacher: {
    canCreateQuestions: true,
    canAnswerQuestions: true,
    canModerateContent: true,
    canDeleteContent: true,
    canManageUsers: false,
    canAccessAnalytics: true,
    dailyQuestionLimit: 50,
    dailyAnswerLimit: 100
  },
  moderator: {
    canCreateQuestions: true,
    canAnswerQuestions: true,
    canModerateContent: true,
    canDeleteContent: true,
    canManageUsers: true,
    canAccessAnalytics: true,
    dailyQuestionLimit: 100,
    dailyAnswerLimit: 200
  },
  admin: {
    canCreateQuestions: true,
    canAnswerQuestions: true,
    canModerateContent: true,
    canDeleteContent: true,
    canManageUsers: true,
    canAccessAnalytics: true,
    dailyQuestionLimit: -1, // 无限制
    dailyAnswerLimit: -1    // 无限制
  }
};
```

---

## 📊 性能优化策略

### 1. 数据库优化

#### 索引策略
```sql
-- 推荐系统关键索引
CREATE INDEX idx_recommendations_subject_type_difficulty ON recommendations(subject_code, content_type, difficulty);
CREATE INDEX idx_user_preferences_user_subject ON user_preferences(user_id, subject_code);
CREATE INDEX idx_feedback_user_time ON recommendation_feedback(user_id, created_at DESC);

-- 社区系统关键索引
CREATE INDEX idx_questions_subject_category_time ON community_questions(subject_code, category, created_at DESC);
CREATE INDEX idx_questions_status_activity ON community_questions(status, last_activity_at DESC);
CREATE INDEX idx_answers_question_best ON community_answers(question_id, is_best_answer);
CREATE INDEX idx_interactions_user_target ON community_interactions(user_id, target_type, target_id);

-- 全文搜索索引
ALTER TABLE community_questions ADD FULLTEXT(title, content);
ALTER TABLE community_answers ADD FULLTEXT(content);
```

#### 查询优化
```typescript
// 使用连接池
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
});

// 分页查询优化
async function getPaginatedQuestions(subjectCode, page, limit, filters) {
  // 使用子查询优化大表分页
  const query = `
    SELECT q.*, u.username, u.avatar, ucp.reputation
    FROM community_questions q
    INNER JOIN (
      SELECT id 
      FROM community_questions 
      WHERE subject_code = ? 
      ${buildFilterConditions(filters)}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    ) as paged ON q.id = paged.id
    LEFT JOIN users u ON q.author_id = u.id
    LEFT JOIN user_community_profiles ucp ON q.author_id = ucp.user_id
    ORDER BY q.created_at DESC
  `;
  
  return pool.execute(query, [subjectCode, limit, (page - 1) * limit]);
}
```

### 2. 缓存策略

#### Redis缓存实现
```typescript
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

// 推荐内容缓存
async function getCachedRecommendations(userId, subjectCode) {
  const cacheKey = `recommendations:${userId}:${subjectCode}`;
  const cached = await client.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  return null;
}

async function setCachedRecommendations(userId, subjectCode, data) {
  const cacheKey = `recommendations:${userId}:${subjectCode}`;
  await client.setex(cacheKey, 300, JSON.stringify(data)); // 5分钟缓存
}

// 用户偏好缓存
async function getCachedUserPreferences(userId, subjectCode) {
  const cacheKey = `preferences:${userId}:${subjectCode}`;
  return client.get(cacheKey);
}

// 社区问题列表缓存
async function getCachedQuestionsList(subjectCode, filters, page) {
  const cacheKey = `questions:${subjectCode}:${JSON.stringify(filters)}:${page}`;
  const cached = await client.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  return null;
}
```

### 3. API性能监控
```typescript
const responseTime = require('response-time');

// 响应时间监控
app.use(responseTime((req, res, time) => {
  // 记录慢查询
  if (time > 1000) { // 超过1秒的请求
    console.warn(`Slow request: ${req.method} ${req.url} took ${time}ms`);
  }
  
  // 发送到监控系统
  sendMetric('api.response_time', time, {
    method: req.method,
    route: req.route?.path || req.url,
    status: res.statusCode
  });
}));

// 错误率监控
app.use((err, req, res, next) => {
  // 记录错误
  console.error('API Error:', err);
  
  // 发送错误指标
  sendMetric('api.error_count', 1, {
    method: req.method,
    route: req.route?.path || req.url,
    error_type: err.name || 'UnknownError'
  });
  
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
  });
});
```

---

## 🧪 测试和验证

### 1. API测试用例

#### 推荐系统测试
```javascript
// tests/recommendations.test.js
const request = require('supertest');
const app = require('../app');

describe('Recommendations API', () => {
  test('GET /api/recommendations/9709 should return personalized recommendations', async () => {
    const response = await request(app)
      .get('/api/recommendations/9709')
      .query({ userId: 'test-user-123', limit: 10 })
      .set('Authorization', 'Bearer ' + testToken)
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.recommendations).toHaveLength(10);
    expect(response.body.data.recommendations[0]).toHaveProperty('matchScore');
    expect(response.body.data.recommendations[0]).toHaveProperty('reason');
  });
  
  test('POST /api/recommendations/feedback should record user feedback', async () => {
    const feedback = {
      recommendationId: 'rec-123',
      action: 'clicked',
      rating: 5
    };
    
    const response = await request(app)
      .post('/api/recommendations/feedback')
      .send(feedback)
      .set('Authorization', 'Bearer ' + testToken)
      .expect(200);
    
    expect(response.body.success).toBe(true);
  });
});
```

#### 社区系统测试
```javascript
// tests/community.test.js
describe('Community API', () => {
  test('GET /api/community/9709/questions should return questions list', async () => {
    const response = await request(app)
      .get('/api/community/9709/questions')
      .query({ page: 1, limit: 20, category: 'homework' })
      .set('Authorization', 'Bearer ' + testToken)
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.questions).toBeDefined();
    expect(response.body.data.pagination).toBeDefined();
  });
  
  test('POST /api/community/9709/questions should create new question', async () => {
    const question = {
      title: 'Test Question',
      content: 'This is a test question content',
      category: 'concept',
      tags: ['algebra', 'equations']
    };
    
    const response = await request(app)
      .post('/api/community/9709/questions')
      .send(question)
      .set('Authorization', 'Bearer ' + testToken)
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.question.id).toBeDefined();
  });
});
```

### 2. 性能测试

#### 负载测试脚本
```javascript
// tests/load.test.js
const autocannon = require('autocannon');

async function runLoadTest() {
  const result = await autocannon({
    url: 'http://localhost:3000',
    connections: 100,
    duration: 30,
    requests: [
      {
        method: 'GET',
        path: '/api/recommendations/9709?userId=test-user&limit=20',
        headers: {
          'Authorization': 'Bearer ' + testToken
        }
      },
      {
        method: 'GET', 
        path: '/api/community/9709/questions?page=1&limit=20',
        headers: {
          'Authorization': 'Bearer ' + testToken
        }
      }
    ]
  });
  
  console.log('Load test results:', result);
  
  // 验证性能指标
  expect(result.latency.average).toBeLessThan(500); // 平均响应时间小于500ms
  expect(result.errors).toBe(0); // 无错误
}
```

---

## 📈 监控和日志

### 1. 应用监控
```typescript
// monitoring/metrics.js
const prometheus = require('prom-client');

// 自定义指标
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const recommendationAccuracy = new prometheus.Gauge({
  name: 'recommendation_accuracy',
  help: 'Recommendation algorithm accuracy score',
  labelNames: ['subject_code', 'algorithm_version']
});

const communityEngagement = new prometheus.Gauge({
  name: 'community_engagement_rate',
  help: 'Community engagement rate',
  labelNames: ['subject_code', 'metric_type']
});

// 指标收集中间件
function collectMetrics(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.url, res.statusCode)
      .observe(duration);
  });
  
  next();
}

module.exports = { httpRequestDuration, recommendationAccuracy, communityEngagement, collectMetrics };
```

### 2. 日志系统
```typescript
// logging/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cie-copilot-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// 特定业务日志
function logRecommendationAccess(userId, subjectCode, count) {
  logger.info('Recommendation access', {
    userId,
    subjectCode,
    recommendationCount: count,
    timestamp: new Date().toISOString(),
    type: 'recommendation_access'
  });
}

function logCommunityInteraction(userId, action, targetType, targetId) {
  logger.info('Community interaction', {
    userId,
    action,
    targetType,
    targetId,
    timestamp: new Date().toISOString(),
    type: 'community_interaction'
  });
}

module.exports = { logger, logRecommendationAccess, logCommunityInteraction };
```

---

## 🚀 部署和环境配置

### 1. 环境变量配置
```env
# .env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cie_copilot
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# API配置
API_PORT=3000
API_HOST=localhost
API_BASE_URL=http://localhost:3000

# 文件上传配置
UPLOAD_MAX_SIZE=10485760  # 10MB
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/plain

# 推荐算法配置
RECOMMENDATION_CACHE_TTL=300  # 5分钟
RECOMMENDATION_BATCH_SIZE=50
RECOMMENDATION_MIN_SCORE=0.3

# 社区配置
COMMUNITY_QUESTION_LIMIT_PER_DAY=10
COMMUNITY_ANSWER_LIMIT_PER_DAY=20
COMMUNITY_REPUTATION_QUESTION=5
COMMUNITY_REPUTATION_ANSWER=10
COMMUNITY_REPUTATION_BEST_ANSWER=25

# 监控配置
METRICS_ENABLED=true
LOG_LEVEL=info
```

### 2. Docker配置
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制包管理文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 创建日志目录
RUN mkdir -p logs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# 启动应用
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - mysql
      - redis
    volumes:
      - ./logs:/app/logs

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./sql/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "3306:3306"

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

volumes:
  mysql_data:
  redis_data:
```

---

## 📝 完成检查清单

### 第一阶段：基础设施 (第1周)
- [ ] 数据库表创建和索引优化
- [ ] Redis缓存配置
- [ ] JWT认证系统实现
- [ ] 基础API框架搭建
- [ ] 错误处理和日志系统

### 第二阶段：核心功能 (第2周)
- [ ] 推荐算法核心逻辑实现
- [ ] 用户偏好管理系统
- [ ] 社区问答CRUD操作
- [ ] 用户互动和声誉系统
- [ ] 文件上传和附件管理

### 第三阶段：优化集成 (第3周)
- [ ] 前后端API联调测试
- [ ] 性能优化和缓存策略
- [ ] 单元测试和集成测试
- [ ] 监控指标和告警配置
- [ ] 部署脚本和文档完善

### 验收标准
- [ ] 所有API端点响应时间 < 500ms
- [ ] 推荐算法准确率 > 80%
- [ ] 社区功能完整可用
- [ ] 错误率 < 1%
- [ ] 测试覆盖率 > 90%

---

**Agent A任务状态**: 🔄 等待开始  
**预期完成时间**: 3周内  
**技术支持**: Agent B提供前端联调支持

**联系方式**: 如有技术问题，请及时与Agent B协调解决 🤝
