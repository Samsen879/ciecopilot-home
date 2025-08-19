# Agent B API 接口规范 v2.0

## 📋 文档概述

本文档定义了Agent B新增组件所需的完整API接口规范，为Agent A后端开发提供精确的技术要求。

**版本**: v2.0  
**更新日期**: 2025年1月18日  
**作用范围**: 个性化推荐系统 + 学习社区平台

---

## 🎯 新增API端点汇总

| 功能模块 | 端点数量 | 优先级 | 完成状态 |
|---------|---------|--------|----------|
| 个性化推荐 | 6个 | 高 | 待开发 |
| 学习社区 | 8个 | 高 | 待开发 |
| 用户系统 | 4个 | 中 | 待开发 |
| 文件管理 | 2个 | 低 | 待开发 |

---

## 🔥 个性化推荐系统 API

### 1. 获取推荐内容列表

**端点**: `GET /api/recommendations/{subjectCode}`

**描述**: 获取基于用户画像的个性化推荐内容

**路径参数**:
```typescript
subjectCode: '9709' | '9702' | '9701' | '9700'  // 必需
```

**查询参数**:
```typescript
interface RecommendationQuery {
  userId: string;                    // 必需：用户ID
  page?: number;                    // 可选：页码，默认1  
  limit?: number;                   // 可选：每页数量，默认20
  contentType?: ContentType[];      // 可选：内容类型过滤
  difficulty?: DifficultyLevel;     // 可选：难度过滤
  refresh?: boolean;                // 可选：强制刷新推荐
}

type ContentType = 'study' | 'practice' | 'review' | 'concept' | 'video' | 'assessment';
type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
```

**响应格式**:
```typescript
interface RecommendationResponse {
  success: boolean;
  data: {
    recommendations: RecommendationItem[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasMore: boolean;
    };
    metadata: {
      lastUpdated: string;
      algorithmVersion: string;
      personalizedScore: number;    // 个性化程度 0-100
    };
  };
  timestamp: string;
}

interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  type: ContentType;
  difficulty: DifficultyLevel;
  subjectCode: string;
  
  // 推荐相关
  matchScore: number;               // 匹配度 0-100
  priority: 'low' | 'medium' | 'high';
  reason: string;                   // 推荐理由
  confidence: number;               // 推荐置信度 0-1
  
  // 内容相关
  estimatedTime: number;            // 预估完成时间(分钟)
  tags: string[];
  thumbnailUrl?: string;
  contentUrl: string;
  previewContent?: string;
  
  // 统计数据
  viewCount: number;
  completionRate: number;           // 完成率 0-1
  avgRating: number;                // 平均评分 1-5
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
}
```

### 2. 获取用户推荐偏好

**端点**: `GET /api/user/{userId}/preferences`

**响应格式**:
```typescript
interface UserPreferencesResponse {
  success: boolean;
  data: UserPreferences;
}

interface UserPreferences {
  userId: string;
  contentTypeWeights: {
    study: number;        // 权重 0-1
    practice: number;
    review: number;
    concept: number;
    video: number;
    assessment: number;
  };
  difficultyPreference: DifficultyLevel | 'adaptive';
  timePreference: {
    dailyStudyTime: number;         // 每日学习时间(分钟)
    sessionDuration: number;        // 单次学习时长(分钟)
    preferredTimeSlots: string[];   // 偏好时间段
  };
  learningStyle: {
    visualLearner: number;          // 视觉学习者倾向 0-1
    auditoryLearner: number;        // 听觉学习者倾向 0-1
    kinestheticLearner: number;     // 动觉学习者倾向 0-1
  };
  focusAreas: {
    priority: 'weak_areas' | 'new_topics' | 'review' | 'balanced';
    specificTopics: string[];       // 特别关注的主题
    avoidTopics: string[];          // 避免的主题
  };
  lastUpdated: string;
}
```

### 3. 更新用户推荐偏好

**端点**: `PUT /api/user/{userId}/preferences`

**请求体**: `UserPreferences` (除userId和lastUpdated外的所有字段)

### 4. 记录推荐反馈

**端点**: `POST /api/recommendations/feedback`

**请求体**:
```typescript
interface RecommendationFeedback {
  userId: string;
  recommendationId: string;
  action: FeedbackAction;
  rating?: number;                  // 1-5评分，可选
  comment?: string;                 // 文字反馈，可选
  timestamp: string;
}

type FeedbackAction = 
  | 'viewed'        // 查看了推荐
  | 'clicked'       // 点击了推荐  
  | 'started'       // 开始学习
  | 'completed'     // 完成学习
  | 'dismissed'     // 忽略推荐
  | 'liked'         // 喜欢
  | 'disliked'      // 不喜欢
  | 'shared'        // 分享
  | 'bookmarked';   // 收藏
```

### 5. 获取推荐性能分析

**端点**: `GET /api/recommendations/{userId}/analytics`

**响应格式**:
```typescript
interface RecommendationAnalytics {
  userId: string;
  timeRange: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalRecommendations: number;
    clickThrough: number;            // 点击率
    completionRate: number;          // 完成率
    satisfactionScore: number;       // 满意度 1-5
    learningImprovement: number;     // 学习提升幅度
  };
  topCategories: Array<{
    category: ContentType;
    engagement: number;
    effectiveness: number;
  }>;
  improvementSuggestions: string[];
}
```

### 6. 刷新推荐算法

**端点**: `POST /api/recommendations/{userId}/refresh`

**请求体**:
```typescript
interface RefreshRequest {
  forceUpdate?: boolean;            // 强制重新计算
  includeNewContent?: boolean;      // 包含新内容
  reason?: string;                  // 刷新原因
}
```

---

## 👥 学习社区系统 API

### 1. 获取社区问题列表

**端点**: `GET /api/community/{subjectCode}/questions`

**查询参数**:
```typescript
interface CommunityQuestionsQuery {
  page?: number;                    // 页码，默认1
  limit?: number;                   // 每页数量，默认20
  category?: QuestionCategory;      // 问题分类
  sortBy?: SortType;               // 排序方式
  searchTerm?: string;             // 搜索关键词
  tags?: string[];                 // 标签过滤
  status?: QuestionStatus;         // 问题状态
  userId?: string;                 // 用户筛选
}

type QuestionCategory = 'homework' | 'concept' | 'exam' | 'general' | 'discussion';
type SortType = 'latest' | 'popular' | 'unanswered' | 'trending' | 'oldest';
type QuestionStatus = 'open' | 'answered' | 'closed' | 'featured';
```

**响应格式**:
```typescript
interface CommunityQuestionsResponse {
  success: boolean;
  data: {
    questions: CommunityQuestion[];
    pagination: PaginationMeta;
    filters: {
      categories: CategoryStats[];
      popularTags: TagStats[];
      activeUsers: UserStats[];
    };
  };
}

interface CommunityQuestion {
  id: string;
  title: string;
  content: string;
  category: QuestionCategory;
  tags: string[];
  
  // 作者信息
  author: PublicUserProfile;
  
  // 统计数据
  viewCount: number;
  likeCount: number;
  answerCount: number;
  
  // 状态信息
  status: QuestionStatus;
  isAnswered: boolean;
  bestAnswerId?: string;
  isFeatured: boolean;
  
  // 时间信息
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  
  // 附件
  attachments?: FileAttachment[];
  
  // 互动状态 (对当前用户)
  isLiked?: boolean;
  isFollowed?: boolean;
  userVote?: 'up' | 'down' | null;
}

interface PublicUserProfile {
  id: string;
  username: string;
  avatar?: string;
  reputation: number;
  level: number;
  badges: BadgeSummary[];
  isOnline: boolean;
  lastSeen: string;
}
```

### 2. 获取问题详情

**端点**: `GET /api/community/questions/{questionId}`

**响应格式**:
```typescript
interface QuestionDetailResponse {
  success: boolean;
  data: {
    question: CommunityQuestion;
    answers: CommunityAnswer[];
    relatedQuestions: CommunityQuestion[];
    userInteractions: UserInteractions;
  };
}

interface CommunityAnswer {
  id: string;
  content: string;
  questionId: string;
  
  // 作者信息
  author: PublicUserProfile;
  
  // 状态信息
  isBestAnswer: boolean;
  isVerified: boolean;      // 专家/老师验证
  
  // 统计数据
  likeCount: number;
  helpfulCount: number;
  
  // 时间信息
  createdAt: string;
  updatedAt: string;
  
  // 附件
  attachments?: FileAttachment[];
  
  // 互动状态
  userVote?: 'up' | 'down' | null;
  isMarkedHelpful?: boolean;
}

interface UserInteractions {
  hasLiked: boolean;
  hasFollowed: boolean;
  hasBookmarked: boolean;
  vote: 'up' | 'down' | null;
}
```

### 3. 发布新问题

**端点**: `POST /api/community/{subjectCode}/questions`

**请求体**:
```typescript
interface CreateQuestionRequest {
  title: string;                    // 必需：问题标题
  content: string;                  // 必需：问题内容  
  category: QuestionCategory;       // 必需：问题分类
  tags: string[];                   // 可选：标签数组
  attachments?: FileAttachment[];   // 可选：附件
  isAnonymous?: boolean;           // 可选：匿名发布
}
```

### 4. 回答问题

**端点**: `POST /api/community/questions/{questionId}/answers`

**请求体**:
```typescript
interface CreateAnswerRequest {
  content: string;                  // 必需：回答内容
  attachments?: FileAttachment[];   // 可选：附件
  isAnonymous?: boolean;           // 可选：匿名回答
}
```

### 5. 问题/回答互动

**端点**: `POST /api/community/{type}/{id}/interact`

**路径参数**:
```typescript
type: 'questions' | 'answers'
id: string  // 问题ID或回答ID
```

**请求体**:
```typescript
interface InteractionRequest {
  action: InteractionAction;
  userId: string;
}

type InteractionAction = 
  | 'like' | 'unlike'               // 点赞/取消点赞
  | 'follow' | 'unfollow'           // 关注/取消关注
  | 'bookmark' | 'unbookmark'       // 收藏/取消收藏
  | 'vote_up' | 'vote_down' | 'vote_cancel'  // 投票
  | 'mark_helpful' | 'unmark_helpful'        // 标记有用
  | 'mark_best' | 'unmark_best';             // 标记最佳答案
```

### 6. 获取用户社区档案

**端点**: `GET /api/community/users/{userId}/profile`

**响应格式**:
```typescript
interface UserCommunityProfile {
  user: PublicUserProfile;
  statistics: {
    questionsAsked: number;
    answersGiven: number;
    bestAnswers: number;
    helpfulAnswers: number;
    totalViews: number;
    totalLikes: number;
    followersCount: number;
    followingCount: number;
  };
  badges: Badge[];
  recentActivity: CommunityActivity[];
  reputation: {
    current: number;
    history: ReputationChange[];
    breakdown: {
      questions: number;
      answers: number;
      helpful: number;
      badges: number;
    };
  };
}

interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: BadgeCategory;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  earnedAt: string;
  progress?: {
    current: number;
    required: number;
  };
}

type BadgeCategory = 'contribution' | 'quality' | 'milestone' | 'special' | 'subject';

interface CommunityActivity {
  id: string;
  type: ActivityType;
  description: string;
  targetId: string;
  targetTitle: string;
  createdAt: string;
}

type ActivityType = 'question_asked' | 'answer_given' | 'best_answer' | 'badge_earned' | 'milestone_reached';
```

### 7. 社区搜索

**端点**: `GET /api/community/{subjectCode}/search`

**查询参数**:
```typescript
interface CommunitySearchQuery {
  q: string;                        // 必需：搜索关键词
  type?: 'questions' | 'answers' | 'users' | 'all';
  category?: QuestionCategory;
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  sortBy?: 'relevance' | 'date' | 'popularity';
  page?: number;
  limit?: number;
}
```

### 8. 获取社区统计

**端点**: `GET /api/community/{subjectCode}/stats`

**响应格式**:
```typescript
interface CommunityStats {
  overview: {
    totalQuestions: number;
    totalAnswers: number;
    totalUsers: number;
    answeredRate: number;           // 解答率
    avgResponseTime: number;        // 平均响应时间(小时)
  };
  trends: {
    dailyQuestions: TimeSeriesData[];
    popularCategories: CategoryStats[];
    topContributors: UserStats[];
    trendingTags: TagStats[];
  };
  performance: {
    questionQuality: number;        // 问题质量评分 1-5
    answerQuality: number;          // 回答质量评分 1-5
    userSatisfaction: number;       // 用户满意度 1-5
    communityHealth: number;        // 社区健康度 1-5
  };
}
```

---

## 💾 数据模型定义

### 通用数据类型

```typescript
interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
}

interface FileAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;                     // 字节
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface TimeSeriesData {
  date: string;
  value: number;
  change?: number;                  // 相比前一期的变化
}

interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

interface TagStats {
  tag: string;
  count: number;
  questions: number;
  answers: number;
  trend: 'rising' | 'falling' | 'stable';
}

interface UserStats {
  user: PublicUserProfile;
  metrics: {
    contributions: number;
    helpfulness: number;
    activity: number;
  };
}

interface ReputationChange {
  action: string;
  points: number;
  date: string;
  relatedId?: string;
  description: string;
}
```

---

## 🔐 认证和权限

### JWT Token 要求

所有API请求需要在Header中包含:
```
Authorization: Bearer <jwt_token>
```

### 权限级别

```typescript
type UserRole = 'student' | 'teacher' | 'moderator' | 'admin';

interface UserPermissions {
  canCreateQuestions: boolean;
  canAnswerQuestions: boolean;
  canModerateContent: boolean;
  canDeleteContent: boolean;
  canManageUsers: boolean;
  canAccessAnalytics: boolean;
  dailyQuestionLimit: number;
  dailyAnswerLimit: number;
}
```

---

## 📊 错误处理

### 标准错误响应格式

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string;                 // 字段验证错误时使用
  };
  timestamp: string;
  requestId: string;
}
```

### 常见错误代码

| 错误代码 | HTTP状态 | 说明 |
|---------|---------|------|
| `AUTH_REQUIRED` | 401 | 需要认证 |
| `INSUFFICIENT_PERMISSIONS` | 403 | 权限不足 |
| `RESOURCE_NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 422 | 数据验证失败 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 🚀 性能要求

### 响应时间目标

| API类型 | 响应时间 | 并发要求 |
|---------|---------|----------|
| 推荐列表 | <500ms | 100 req/s |
| 社区问题列表 | <300ms | 200 req/s |
| 问题详情 | <200ms | 300 req/s |
| 互动操作 | <100ms | 500 req/s |
| 搜索功能 | <800ms | 50 req/s |

### 缓存策略

- 推荐内容：5分钟缓存
- 用户偏好：10分钟缓存  
- 社区列表：2分钟缓存
- 用户档案：15分钟缓存
- 统计数据：30分钟缓存

---

## 📝 Agent A 实现清单

### 立即优先级 (本周完成)
- [ ] 基础推荐API端点 (1-4)
- [ ] 基础社区API端点 (1-4)
- [ ] 用户认证和权限系统
- [ ] 基础数据模型设计

### 高优先级 (下周完成)  
- [ ] 推荐算法核心逻辑
- [ ] 社区互动功能完整实现
- [ ] 用户档案和声誉系统
- [ ] 搜索和过滤功能

### 中优先级 (两周内完成)
- [ ] 高级推荐功能和分析
- [ ] 社区管理和审核功能
- [ ] 性能优化和缓存策略
- [ ] 完整的错误处理机制

### 低优先级 (一个月内完成)
- [ ] 高级分析和统计功能
- [ ] 实时通知系统
- [ ] 高级搜索功能
- [ ] 系统监控和日志

---

**文档维护**: Agent B负责前端对接，Agent A负责后端实现  
**联调计划**: 每完成一个模块立即进行接口联调测试
