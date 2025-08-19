# CIE Copilot API 文档

本文档描述了 CIE Copilot 后端 API 的所有可用端点。

## 基础信息

- **基础URL**: `http://localhost:3000` (开发环境)
- **认证方式**: Bearer Token (JWT)
- **内容类型**: `application/json`

## 认证

大部分API端点需要认证。在请求头中包含访问令牌：

```
Authorization: Bearer <access_token>
```

## 错误响应格式

所有错误响应都遵循以下格式：

```json
{
  "success": false,
  "message": "错误描述",
  "errors": ["详细错误信息"]
}
```

## HTTP 状态码

- `200` - 成功
- `201` - 创建成功
- `400` - 请求参数错误
- `401` - 未认证
- `403` - 权限不足
- `404` - 资源不存在
- `429` - 请求过于频繁
- `500` - 服务器内部错误

## 认证系统 API

用户认证、注册、登录相关接口

### 1. 用户注册

**POST** `/api/auth/register`

**请求体:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "username": "username",
  "full_name": "Full Name"
}
```

**响应示例:**

成功响应:
```json
{
  "success": true,
  "message": "用户注册成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "role": "student"
  }
}
```

---

### 2. 用户登录

**POST** `/api/auth/login`

**请求体:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**响应示例:**

```json
{
  "success": true,
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "role": "student"
  }
}
```

---

### 3. 刷新访问令牌

**POST** `/api/auth/refresh`

**请求头:**
- `Authorization`: Bearer <refresh_token>

---

### 4. 验证访问令牌

**GET** `/api/auth/verify`

**请求头:**
- `Authorization`: Bearer <access_token>

---

### 5. 请求密码重置

**POST** `/api/auth/forgot-password`

**请求体:**

```json
{
  "email": "user@example.com"
}
```

---

### 6. 重置密码

**POST** `/api/auth/reset-password`

**请求体:**

```json
{
  "token": "reset_token",
  "password": "NewSecurePassword123!"
}
```

---

## 用户管理 API

用户信息管理、权限控制相关接口

### 1. 获取用户列表

**GET** `/api/users`

**请求头:**
- `Authorization`: Bearer <access_token>

**查询参数:**
- `page`: number (optional, default: 1)
- `limit`: number (optional, default: 20)
- `search`: string (optional)
- `role`: string (optional)
- `status`: string (optional)

---

### 2. 创建用户（管理员）

**POST** `/api/users`

**请求头:**
- `Authorization`: Bearer <access_token>

**请求体:**

```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "username": "newusername",
  "full_name": "New User",
  "role": "student"
}
```

---

### 3. 获取用户资料

**GET** `/api/users/profile/:userId`

**请求头:**
- `Authorization`: Bearer <access_token>

---

### 4. 更新用户资料

**PUT** `/api/users/profile/:userId`

**请求头:**
- `Authorization`: Bearer <access_token>

**请求体:**

```json
{
  "username": "newusername",
  "full_name": "Updated Name",
  "bio": "User biography",
  "location": "City, Country",
  "website": "https://example.com",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

---

### 5. 获取用户权限

**GET** `/api/users/permissions/:userId`

**请求头:**
- `Authorization`: Bearer <access_token>

---

### 6. 更新用户角色（管理员）

**PUT** `/api/users/permissions/:userId/role`

**请求头:**
- `Authorization`: Bearer <access_token>

**请求体:**

```json
{
  "role": "teacher"
}
```

---

## 推荐系统 API

个性化推荐、学习偏好管理相关接口

### 1. 获取推荐内容

**GET** `/api/recommendations`

**请求头:**
- `Authorization`: Bearer <access_token>

**查询参数:**
- `page`: number (optional, default: 1)
- `limit`: number (optional, default: 10)
- `type`: string (optional)
- `subject`: string (optional)
- `difficulty`: string (optional)

**响应示例:**

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "uuid",
        "content_type": "article",
        "title": "推荐内容标题",
        "description": "内容描述",
        "subject": "数学",
        "difficulty_level": "intermediate",
        "score": 0.95,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
```

---

### 2. 获取用户偏好

**GET** `/api/recommendations/preferences`

**请求头:**
- `Authorization`: Bearer <access_token>

---

### 3. 创建/更新用户偏好

**POST** `/api/recommendations/preferences`

**请求头:**
- `Authorization`: Bearer <access_token>

**请求体:**

```json
{
  "subjects": ["数学", "物理"],
  "difficulty_level": "intermediate",
  "learning_style": "visual",
  "goals": ["考试准备", "技能提升"],
  "time_availability": {
    "weekdays": 2,
    "weekends": 4
  }
}
```

---

### 4. 获取学习数据

**GET** `/api/recommendations/learning-data`

**请求头:**
- `Authorization`: Bearer <access_token>

---

### 5. 提交推荐反馈

**POST** `/api/recommendations/feedback`

**请求头:**
- `Authorization`: Bearer <access_token>

**请求体:**

```json
{
  "content_id": "content-uuid",
  "content_type": "article",
  "feedback_type": "like",
  "rating": 5,
  "comment": "很有帮助的内容"
}
```

---

## 社区系统 API

问答社区、用户互动相关接口

### 1. 获取问题列表

**GET** `/api/community/questions`

**查询参数:**
- `page`: number (optional, default: 1)
- `limit`: number (optional, default: 20)
- `search`: string (optional)
- `tags`: string (optional)
- `subject`: string (optional)
- `sort`: string (optional)
- `status`: string (optional)

**响应示例:**

```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "uuid",
        "title": "问题标题",
        "content": "问题内容",
        "tags": ["数学", "代数"],
        "subject": "数学",
        "author": {
          "id": "uuid",
          "username": "author",
          "reputation": 100
        },
        "stats": {
          "views": 50,
          "answers": 3,
          "votes": 5
        },
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 200,
      "pages": 10
    }
  }
}
```

---

### 2. 创建问题

**POST** `/api/community/questions`

**请求头:**
- `Authorization`: Bearer <access_token>

**请求体:**

```json
{
  "title": "问题标题",
  "content": "详细的问题描述",
  "tags": ["数学", "代数"],
  "subject": "数学"
}
```

---

### 3. 获取问题详情

**GET** `/api/community/questions/:questionId`

---

### 4. 更新问题

**PUT** `/api/community/questions/:questionId`

**请求头:**
- `Authorization`: Bearer <access_token>

---

### 5. 删除问题

**DELETE** `/api/community/questions/:questionId`

**请求头:**
- `Authorization`: Bearer <access_token>

---

### 6. 获取回答列表

**GET** `/api/community/answers`

**查询参数:**
- `question_id`: string (required)
- `page`: number (optional)
- `limit`: number (optional)
- `sort`: string (optional)

---

### 7. 创建回答

**POST** `/api/community/answers`

**请求头:**
- `Authorization`: Bearer <access_token>

**请求体:**

```json
{
  "question_id": "question-uuid",
  "content": "详细的回答内容"
}
```

---

### 8. 更新回答

**PUT** `/api/community/answers/:answerId`

**请求头:**
- `Authorization`: Bearer <access_token>

---

### 9. 删除回答

**DELETE** `/api/community/answers/:answerId`

**请求头:**
- `Authorization`: Bearer <access_token>

---

### 10. 获取用户互动记录

**GET** `/api/community/interactions`

**请求头:**
- `Authorization`: Bearer <access_token>

---

### 11. 创建互动（点赞、收藏等）

**POST** `/api/community/interactions`

**请求头:**
- `Authorization`: Bearer <access_token>

**请求体:**

```json
{
  "content_type": "question",
  "content_id": "content-uuid",
  "interaction_type": "vote",
  "vote_type": "up"
}
```

**互动类型:**
- `vote`: 投票 (需要 `vote_type`: "up" 或 "down")
- `bookmark`: 收藏
- `report`: 举报

---

### 12. 删除互动

**DELETE** `/api/community/interactions/:interactionId`

**请求头:**
- `Authorization`: Bearer <access_token>

---

## 数据模型

### 用户角色

- `student`: 学生 (权限级别: 1)
- `teacher`: 教师 (权限级别: 2)
- `moderator`: 版主 (权限级别: 3)
- `admin`: 管理员 (权限级别: 4)

### 内容类型

- `article`: 文章
- `video`: 视频
- `exercise`: 练习
- `exam`: 考试
- `note`: 笔记

### 难度级别

- `beginner`: 初级
- `intermediate`: 中级
- `advanced`: 高级

### 学习风格

- `visual`: 视觉型
- `auditory`: 听觉型
- `kinesthetic`: 动觉型
- `reading`: 阅读型

---

## 速率限制

- 认证端点: 5 次/分钟
- 一般API: 100 次/15分钟
- 上传端点: 10 次/分钟

## 缓存策略

- 推荐内容: 1小时
- 用户偏好: 30分钟
- 问题列表: 5分钟
- 用户资料: 15分钟

## 安全注意事项

1. 所有密码都使用 bcrypt 加密
2. JWT Token 有效期为 24 小时
3. 刷新令牌有效期为 7 天
4. 实施了登录尝试限制
5. 所有敏感操作都记录安全日志

## 错误代码

| 代码 | 描述 |
|------|------|
| AUTH_001 | 无效的认证令牌 |
| AUTH_002 | 令牌已过期 |
| AUTH_003 | 权限不足 |
| USER_001 | 用户不存在 |
| USER_002 | 用户名已存在 |
| USER_003 | 邮箱已存在 |
| COMM_001 | 问题不存在 |
| COMM_002 | 回答不存在 |
| COMM_003 | 声誉不足 |
| REC_001 | 推荐内容不存在 |
| REC_002 | 偏好数据无效 |

---

*最后更新: 2024-01-18*