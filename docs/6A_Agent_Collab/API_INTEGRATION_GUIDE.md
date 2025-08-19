# API集成联调指南

## 概述

本文档为Agent B提供详细的API集成指南，包括环境配置、API端点说明、测试方法和常见问题解决方案。

## 环境配置

### 1. 后端服务启动

```bash
# 克隆项目后，安装依赖
npm install

# 启动开发服务器
npm run dev

# 后端API将在以下地址运行:
# http://localhost:3000 (API服务)
# http://localhost:5173 (前端开发服务器)
```

### 2. 环境变量配置

确保 `.env` 文件包含以下配置：
```env
# Supabase配置
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT配置
JWT_SECRET=your_jwt_secret

# API配置
API_BASE_URL=http://localhost:3000
PORT=3000
```

### 3. 数据库初始化

```bash
# 运行数据库迁移
npm run db:migrate

# 检查数据库表结构
node scripts/check-db-tables.js
```

## API端点详细说明

### 认证相关 API

#### 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "用户名",
  "role": "student" // student, teacher, moderator, admin
}
```

#### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

# 响应
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "用户名",
    "role": "student"
  }
}
```

### 社区系统 API

#### 问题相关

**获取问题列表**
```http
GET /api/community/questions?page=1&limit=20&subject_code=9709&search=关键词
Authorization: Bearer jwt_token

# 响应
{
  "success": true,
  "questions": [
    {
      "id": "question_id",
      "title": "问题标题",
      "content": "问题内容",
      "author_id": "user_id",
      "author_name": "作者名",
      "subject_code": "9709",
      "tags": ["标签1", "标签2"],
      "difficulty_level": "intermediate",
      "upvotes": 5,
      "downvotes": 1,
      "answer_count": 3,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**获取问题详情**
```http
GET /api/community/questions/:id
Authorization: Bearer jwt_token

# 响应包含问题详情和相关回答
{
  "success": true,
  "question": {
    "id": "question_id",
    "title": "问题标题",
    "content": "问题详细内容",
    "author": {
      "id": "user_id",
      "name": "作者名",
      "reputation": 150,
      "badges": ["新手", "活跃用户"]
    },
    "subject_code": "9709",
    "tags": ["微积分", "导数"],
    "difficulty_level": "intermediate",
    "upvotes": 5,
    "downvotes": 1,
    "view_count": 25,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "answers": [
    {
      "id": "answer_id",
      "content": "回答内容",
      "author": {
        "id": "user_id",
        "name": "回答者",
        "reputation": 200
      },
      "upvotes": 3,
      "downvotes": 0,
      "is_best_answer": true,
      "created_at": "2024-01-01T01:00:00Z"
    }
  ]
}
```

**发布问题**
```http
POST /api/community/questions
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "title": "如何求解这个微积分问题？",
  "content": "问题的详细描述，支持Markdown格式",
  "subject_code": "9709",
  "tags": ["微积分", "导数"],
  "difficulty_level": "intermediate"
}
```

#### 回答相关

**获取问题的回答**
```http
GET /api/community/answers?question_id=question_id&sort=upvotes
Authorization: Bearer jwt_token
```

**发布回答**
```http
POST /api/community/answers
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "question_id": "question_id",
  "content": "回答内容，支持Markdown和数学公式"
}
```

#### 互动相关

**点赞/踩/收藏**
```http
POST /api/community/interactions
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "contentType": "question", // 或 "answer"
  "contentId": "content_id",
  "interactionType": "upvote" // upvote, downvote, bookmark
}
```

**获取用户互动记录**
```http
GET /api/community/interactions
Authorization: Bearer jwt_token

# 响应
{
  "success": true,
  "interactions": [
    {
      "id": "interaction_id",
      "content_type": "question",
      "content_id": "question_id",
      "interaction_type": "upvote",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 用户档案相关

**获取用户档案**
```http
GET /api/community/users/:userId/profile
Authorization: Bearer jwt_token

# 响应
{
  "success": true,
  "profile": {
    "user_id": "user_id",
    "display_name": "显示名称",
    "bio": "个人简介",
    "avatar_url": "头像URL",
    "reputation": {
      "current_score": 150,
      "level": "活跃用户",
      "next_level": "资深用户",
      "progress": 0.6
    },
    "badges": [
      {
        "id": "first_question",
        "name": "首次提问",
        "description": "发布了第一个问题",
        "icon": "🎯",
        "rarity": "common",
        "earned_at": "2024-01-01T00:00:00Z"
      }
    ],
    "statistics": {
      "questions_asked": 5,
      "answers_given": 12,
      "upvotes_received": 25,
      "best_answers": 3
    },
    "recent_activity": [
      {
        "type": "question_posted",
        "content_id": "question_id",
        "title": "问题标题",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

**更新用户档案**
```http
PUT /api/community/users/:userId/profile
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "display_name": "新的显示名称",
  "bio": "更新的个人简介",
  "avatar_url": "新的头像URL",
  "visibility": "public", // public, friends, private
  "preferences": {
    "email_notifications": true,
    "show_reputation": true
  }
}
```

#### 徽章系统

**获取用户徽章**
```http
GET /api/community/badges/:userId
Authorization: Bearer jwt_token

# 响应
{
  "success": true,
  "badges": {
    "earned": [
      {
        "id": "first_question",
        "name": "首次提问",
        "description": "发布了第一个问题",
        "icon": "🎯",
        "category": "contribution",
        "rarity": "common",
        "earned_at": "2024-01-01T00:00:00Z"
      }
    ],
    "available": [
      {
        "id": "helpful_answerer",
        "name": "乐于助人",
        "description": "获得10个回答点赞",
        "icon": "🤝",
        "category": "quality",
        "rarity": "uncommon",
        "progress": {
          "current": 5,
          "required": 10,
          "percentage": 50
        }
      }
    ],
    "statistics": {
      "total_earned": 3,
      "by_category": {
        "contribution": 2,
        "quality": 1,
        "milestone": 0
      },
      "by_rarity": {
        "common": 2,
        "uncommon": 1,
        "rare": 0,
        "epic": 0,
        "legendary": 0
      }
    }
  }
}
```

#### 声誉系统

**获取用户声誉**
```http
GET /api/community/reputation/:userId
Authorization: Bearer jwt_token

# 响应
{
  "success": true,
  "reputation": {
    "current_score": 150,
    "level": {
      "name": "活跃用户",
      "min_score": 100,
      "max_score": 249,
      "permissions": ["vote", "comment", "edit_own_posts"]
    },
    "next_level": {
      "name": "资深用户",
      "min_score": 250,
      "progress": 0.6
    },
    "history": [
      {
        "change": 10,
        "reason": "answer_upvoted",
        "description": "回答获得点赞",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "breakdown": {
      "questions": 25,
      "answers": 75,
      "votes_received": 50,
      "best_answers": 30,
      "daily_bonus": 5
    }
  }
}
```

### 推荐系统 API

**获取个性化推荐**
```http
GET /api/recommendations?limit=10&type=questions
Authorization: Bearer jwt_token

# 响应
{
  "success": true,
  "recommendations": [
    {
      "id": "rec_id",
      "type": "question",
      "content": {
        "id": "question_id",
        "title": "推荐的问题",
        "subject_code": "9709",
        "difficulty_level": "intermediate"
      },
      "score": 0.85,
      "reason": "基于你的学习偏好推荐"
    }
  ]
}
```

**提交推荐反馈**
```http
POST /api/recommendations/feedback
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "recommendation_id": "rec_id",
  "feedback_type": "like", // like, dislike, not_interested
  "reason": "内容很有帮助"
}
```

## 前端集成示例

### 1. API客户端封装

```javascript
// src/api/client.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

class APIClient {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // GET请求
  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  // POST请求
  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // PUT请求
  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // DELETE请求
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new APIClient();
```

### 2. 社区API封装

```javascript
// src/api/communityApi.js
import { apiClient } from './client';

export const communityApi = {
  // 问题相关
  getQuestions: (params = {}) => {
    return apiClient.get('/community/questions', params);
  },

  getQuestion: (id) => {
    return apiClient.get(`/community/questions/${id}`);
  },

  createQuestion: (data) => {
    return apiClient.post('/community/questions', data);
  },

  updateQuestion: (id, data) => {
    return apiClient.put(`/community/questions/${id}`, data);
  },

  deleteQuestion: (id) => {
    return apiClient.delete(`/community/questions/${id}`);
  },

  // 回答相关
  getAnswers: (questionId) => {
    return apiClient.get('/community/answers', { question_id: questionId });
  },

  createAnswer: (data) => {
    return apiClient.post('/community/answers', data);
  },

  updateAnswer: (id, data) => {
    return apiClient.put(`/community/answers/${id}`, data);
  },

  deleteAnswer: (id) => {
    return apiClient.delete(`/community/answers/${id}`);
  },

  // 互动相关
  createInteraction: (data) => {
    return apiClient.post('/community/interactions', data);
  },

  getUserInteractions: () => {
    return apiClient.get('/community/interactions');
  },

  deleteInteraction: (id) => {
    return apiClient.delete(`/community/interactions/${id}`);
  },

  // 用户档案
  getUserProfile: (userId) => {
    return apiClient.get(`/community/users/${userId}/profile`);
  },

  updateUserProfile: (userId, data) => {
    return apiClient.put(`/community/users/${userId}/profile`, data);
  },

  // 徽章
  getUserBadges: (userId) => {
    return apiClient.get(`/community/badges/${userId}`);
  },

  // 声誉
  getUserReputation: (userId) => {
    return apiClient.get(`/community/reputation/${userId}`);
  }
};
```

### 3. React Hook示例

```javascript
// src/hooks/useCommunity.js
import { useState, useEffect } from 'react';
import { communityApi } from '../api/communityApi';

export const useQuestions = (params = {}) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const response = await communityApi.getQuestions(params);
        setQuestions(response.questions);
        setPagination(response.pagination);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [JSON.stringify(params)]);

  return { questions, loading, error, pagination };
};

export const useQuestion = (id) => {
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        setLoading(true);
        const response = await communityApi.getQuestion(id);
        setQuestion(response.question);
        setAnswers(response.answers || []);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchQuestion();
    }
  }, [id]);

  return { question, answers, loading, error };
};

export const useUserProfile = (userId) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await communityApi.getUserProfile(userId);
        setProfile(response.profile);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  return { profile, loading, error };
};
```

## 测试方法

### 1. 使用提供的测试脚本

```bash
# 运行社区API测试
npm run test:community

# 在开发环境中测试
npm run test:community:dev
```

### 2. 手动API测试

使用Postman或类似工具测试API端点：

1. **认证测试**
   - 注册新用户
   - 登录获取token
   - 使用token访问受保护的端点

2. **社区功能测试**
   - 创建问题
   - 发布回答
   - 点赞/踩/收藏
   - 查看用户档案

3. **边界情况测试**
   - 无效的请求参数
   - 未授权访问
   - 不存在的资源

### 3. 前端集成测试

```javascript
// src/tests/api.test.js
import { communityApi } from '../api/communityApi';
import { apiClient } from '../api/client';

// 模拟认证
beforeAll(() => {
  apiClient.setToken('test_jwt_token');
});

describe('Community API Integration', () => {
  test('should fetch questions', async () => {
    const response = await communityApi.getQuestions();
    expect(response.success).toBe(true);
    expect(Array.isArray(response.questions)).toBe(true);
  });

  test('should create question', async () => {
    const questionData = {
      title: 'Test Question',
      content: 'Test content',
      subject_code: '9709',
      tags: ['test'],
      difficulty_level: 'beginner'
    };

    const response = await communityApi.createQuestion(questionData);
    expect(response.success).toBe(true);
    expect(response.question.title).toBe(questionData.title);
  });
});
```

## 常见问题和解决方案

### 1. CORS错误

**问题**: 前端请求被CORS策略阻止

**解决方案**: 确保后端API已配置正确的CORS头，开发环境应允许localhost访问。

### 2. 认证失败

**问题**: API返回401未授权错误

**解决方案**: 
- 检查JWT token是否正确设置
- 确认token未过期
- 验证Authorization头格式: `Bearer <token>`

### 3. 数据格式错误

**问题**: API返回400错误，提示数据格式不正确

**解决方案**:
- 检查请求体JSON格式
- 确认必填字段都已提供
- 验证数据类型和约束

### 4. 网络连接问题

**问题**: 无法连接到后端API

**解决方案**:
- 确认后端服务正在运行
- 检查API_BASE_URL配置
- 验证端口号和防火墙设置

### 5. 数据库连接问题

**问题**: API返回500错误，数据库相关

**解决方案**:
- 检查Supabase配置
- 确认数据库表已创建
- 验证环境变量设置

## 性能优化建议

### 1. 数据缓存

```javascript
// 使用React Query进行数据缓存
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useQuestionsQuery = (params) => {
  return useQuery({
    queryKey: ['questions', params],
    queryFn: () => communityApi.getQuestions(params),
    staleTime: 5 * 60 * 1000, // 5分钟
    cacheTime: 10 * 60 * 1000 // 10分钟
  });
};
```

### 2. 分页加载

```javascript
// 实现无限滚动
export const useInfiniteQuestions = (params) => {
  return useInfiniteQuery({
    queryKey: ['questions', 'infinite', params],
    queryFn: ({ pageParam = 1 }) => 
      communityApi.getQuestions({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    }
  });
};
```

### 3. 乐观更新

```javascript
// 点赞功能的乐观更新
export const useVoteMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: communityApi.createInteraction,
    onMutate: async (newVote) => {
      // 取消相关查询
      await queryClient.cancelQueries(['question', newVote.contentId]);
      
      // 获取当前数据
      const previousData = queryClient.getQueryData(['question', newVote.contentId]);
      
      // 乐观更新
      queryClient.setQueryData(['question', newVote.contentId], (old) => ({
        ...old,
        question: {
          ...old.question,
          upvotes: old.question.upvotes + (newVote.interactionType === 'upvote' ? 1 : 0)
        }
      }));
      
      return { previousData };
    },
    onError: (err, newVote, context) => {
      // 回滚
      queryClient.setQueryData(['question', newVote.contentId], context.previousData);
    },
    onSettled: (data, error, variables) => {
      // 重新获取数据
      queryClient.invalidateQueries(['question', variables.contentId]);
    }
  });
};
```

## 部署注意事项

### 1. 环境变量

生产环境需要设置正确的环境变量：
```env
REACT_APP_API_BASE_URL=https://your-api-domain.com
REACT_APP_SUPABASE_URL=your_production_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_production_anon_key
```

### 2. API域名配置

确保生产环境的API域名配置正确，支持HTTPS。

### 3. 错误监控

建议集成错误监控服务（如Sentry）来跟踪生产环境的API错误。

---

**联系方式**: 如果在集成过程中遇到问题，请及时沟通协调解决。