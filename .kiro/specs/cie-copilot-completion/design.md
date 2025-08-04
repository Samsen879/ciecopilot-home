# 设计文档

## 概述

CIE Copilot 是一个基于 React + Supabase 的现代化教育平台，专为 CIE A-Level 学生设计。该平台已具备完整的组件架构、数据库设计和认证系统基础，现需要完成最终的集成和功能实现。

## 架构

### 技术栈
- **前端**: React 18.2.0 + Vite 5.0.12
- **路由**: React Router DOM 6.30.1
- **样式**: Tailwind CSS 3.4.1 + Framer Motion 12.18.1
- **后端**: Vercel Serverless Functions + Supabase
- **数据库**: PostgreSQL (Supabase)
- **认证**: Supabase Auth
- **AI集成**: OpenAI GPT-4 Turbo

### 系统架构图
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React 前端     │    │  Vercel API     │    │   Supabase      │
│                 │    │                 │    │                 │
│ - 组件系统       │◄──►│ - /api/chat.js  │    │ - PostgreSQL    │
│ - 状态管理       │    │ - OpenAI 代理   │    │ - 认证系统      │
│ - 路由系统       │    │                 │    │ - 实时订阅      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 组件和接口

### 核心组件架构

#### 1. 认证系统 (已完成)
```
AuthContext (全局状态管理)
├── AuthModal (统一认证模态框)
│   ├── LoginForm (登录表单)
│   └── SignupForm (注册表单)
└── 认证状态管理和API调用
```

#### 2. 页面组件结构
```
App.jsx (主应用)
├── Layout Components
│   ├── Navbar (导航栏)
│   ├── Footer (页脚)
│   └── ThemeToggle (主题切换)
├── Core Pages
│   ├── Landing (首页)
│   ├── SubjectSelection (学科选择)
│   ├── TopicDetail (主题详情)
│   └── AskAI (AI聊天)
└── Feature Components
    ├── ProgressTracker (进度跟踪)
    ├── ErrorBook (错题本)
    └── UserSettings (用户设置)
```

#### 3. 数据管理层
```
Supabase Client
├── 认证服务 (auth)
├── 数据库操作 (db)
├── 实时订阅 (realtime)
└── 文件存储 (storage)
```

### API 接口设计

#### 1. 认证接口
- `POST /auth/login` - 用户登录
- `POST /auth/register` - 用户注册
- `POST /auth/logout` - 用户登出
- `POST /auth/reset-password` - 密码重置

#### 2. 学习数据接口
- `GET /api/subjects` - 获取学科列表
- `GET /api/papers/:subjectId` - 获取试卷列表
- `GET /api/topics/:paperId` - 获取主题列表
- `GET /api/topic/:topicId` - 获取主题详情

#### 3. 用户数据接口
- `GET /api/user/progress` - 获取学习进度
- `POST /api/user/progress` - 更新学习进度
- `GET /api/user/error-book` - 获取错题本
- `POST /api/user/error-book` - 添加错题

#### 4. AI 聊天接口
- `POST /api/chat` - AI 对话 (已实现)
- `POST /api/chat/image` - 图片识别对话

## 数据模型

### 数据库表结构 (已设计)

#### 用户相关表
```sql
user_profiles (用户资料)
├── id (UUID, 主键)
├── name (TEXT)
├── avatar_url (TEXT)
├── school (TEXT)
├── grade_level (TEXT)
├── subjects (TEXT[])
└── preferences (JSONB)

study_records (学习记录)
├── user_id (UUID, 外键)
├── topic_id (UUID, 外键)
├── progress (DECIMAL)
├── time_spent (INTEGER)
├── mastery_level (INTEGER)
└── last_studied (TIMESTAMP)
```

#### 内容相关表
```sql
subjects (学科)
├── code (TEXT, 如 "9709")
├── name (TEXT, 如 "Mathematics")
└── description (TEXT)

papers (试卷)
├── subject_id (UUID, 外键)
├── code (TEXT, 如 "paper1")
├── name (TEXT, 如 "Pure Mathematics 1")
└── difficulty_level (INTEGER)

topics (主题)
├── paper_id (UUID, 外键)
├── topic_id (TEXT)
├── title (TEXT)
├── content (JSONB)
├── difficulty_level (INTEGER)
└── tags (TEXT[])
```

#### 功能相关表
```sql
error_book (错题本)
├── user_id (UUID, 外键)
├── topic_id (UUID, 外键)
├── question (TEXT)
├── correct_answer (TEXT)
├── user_answer (TEXT)
├── explanation (TEXT)
├── error_type (TEXT)
└── is_resolved (BOOLEAN)

chat_history (聊天历史)
├── user_id (UUID, 外键)
├── topic_id (UUID, 外键)
├── message (TEXT)
├── response (TEXT)
├── message_type (TEXT)
└── context (JSONB)
```

## 错误处理

### 错误处理策略
1. **网络错误**: 自动重试机制，显示友好的错误提示
2. **认证错误**: 自动重定向到登录页面
3. **数据验证错误**: 表单级别的实时验证
4. **服务器错误**: 全局错误边界捕获

### 错误边界组件
```jsx
ErrorBoundary
├── 捕获组件渲染错误
├── 显示友好的错误页面
└── 错误日志记录
```

## 测试策略

### 测试层级
1. **单元测试**: 组件和工具函数测试
2. **集成测试**: API 接口和数据库操作测试
3. **端到端测试**: 用户流程测试
4. **性能测试**: 页面加载和响应时间测试

### 测试工具
- **单元测试**: Vitest + React Testing Library
- **端到端测试**: Playwright
- **性能测试**: Lighthouse CI

## 部署和基础设施

### 部署架构
```
GitHub Repository
├── Vercel (前端 + API)
│   ├── 自动部署
│   ├── 环境变量管理
│   └── 域名配置
└── Supabase (后端服务)
    ├── 数据库托管
    ├── 认证服务
    └── 实时功能
```

### 环境配置
- **开发环境**: 本地开发 + Supabase 开发实例
- **预发布环境**: Vercel Preview + Supabase 测试实例
- **生产环境**: Vercel Production + Supabase 生产实例

### 性能优化
1. **代码分割**: React.lazy() 实现路由级别的代码分割
2. **图片优化**: WebP 格式 + 懒加载
3. **缓存策略**: Supabase 查询缓存 + 浏览器缓存
4. **CDN**: Vercel Edge Network

## 安全考虑

### 数据安全
1. **行级安全策略 (RLS)**: Supabase 表级别的数据隔离
2. **API 密钥保护**: 服务端代理，避免前端暴露
3. **输入验证**: 前后端双重验证
4. **SQL 注入防护**: Supabase 自动防护

### 认证安全
1. **JWT Token**: 自动刷新和过期管理
2. **密码策略**: 强密码要求
3. **会话管理**: 安全的会话存储和清理
4. **HTTPS**: 全站 HTTPS 加密

## 可访问性

### 无障碍设计
1. **键盘导航**: 完整的键盘操作支持
2. **屏幕阅读器**: ARIA 标签和语义化 HTML
3. **颜色对比**: WCAG 2.1 AA 级别对比度
4. **响应式设计**: 移动设备友好

### 国际化支持
1. **多语言**: 中英文双语支持
2. **本地化**: 日期、数字格式本地化
3. **RTL 支持**: 预留从右到左语言支持

## 监控和分析

### 性能监控
1. **Core Web Vitals**: LCP, FID, CLS 监控
2. **错误追踪**: Sentry 错误监控
3. **用户行为**: Google Analytics 4
4. **API 监控**: Vercel Analytics

### 业务指标
1. **用户活跃度**: DAU, MAU 统计
2. **学习进度**: 完成率、时长统计
3. **功能使用**: AI 对话、错题本使用率
4. **用户反馈**: 评分和建议收集