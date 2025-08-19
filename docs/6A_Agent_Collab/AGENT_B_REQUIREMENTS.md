# Agent B 前端开发需求文档

## 项目背景

基于当前后端API开发进度，Agent A已完成：
- ✅ 完整的社区系统API（问答、互动、徽章、声誉、用户档案）
- ✅ 推荐系统API和算法引擎
- ✅ AI学习路径生成和知识缺陷分析
- ✅ 认证系统和权限控制
- ✅ 数据库设计和迁移脚本

现在需要Agent B配合完成前端组件开发和API联调测试。

## Agent B 核心任务清单

### 1. 社区系统前端组件 (高优先级)

#### 1.1 问答系统组件
- **QuestionList.jsx** - 问题列表展示
  - 支持分页、搜索、筛选（按学科、难度、标签）
  - 显示问题标题、作者、发布时间、回答数、点赞数
  - 集成API: `GET /api/community/questions`

- **QuestionDetail.jsx** - 问题详情页
  - 显示问题完整内容、标签、作者信息
  - 显示所有回答，支持排序（按时间、点赞数）
  - 集成API: `GET /api/community/questions/:id`

- **QuestionForm.jsx** - 问题发布表单
  - 标题、内容、学科选择、标签、难度等级
  - 支持Markdown编辑和预览
  - 集成API: `POST /api/community/questions`

- **AnswerList.jsx** - 回答列表组件
  - 显示回答内容、作者、时间、点赞数
  - 支持最佳答案标记
  - 集成API: `GET /api/community/answers`

- **AnswerForm.jsx** - 回答发布表单
  - Markdown编辑器，支持数学公式
  - 集成API: `POST /api/community/answers`

#### 1.2 互动系统组件
- **VoteButtons.jsx** - 点赞/踩组件
  - 支持问题和回答的投票
  - 实时更新投票数
  - 集成API: `POST /api/community/interactions`

- **BookmarkButton.jsx** - 收藏功能
  - 收藏/取消收藏问题
  - 集成API: `POST /api/community/interactions`

#### 1.3 用户系统组件
- **UserProfile.jsx** - 用户档案页面
  - 显示用户基本信息、统计数据、徽章、声誉
  - 显示用户发布的问题和回答
  - 集成API: `GET /api/community/users/:id/profile`

- **BadgeDisplay.jsx** - 徽章展示组件
  - 按类别和稀有度展示徽章
  - 显示徽章获取进度
  - 集成API: `GET /api/community/badges/:userId`

- **ReputationCard.jsx** - 声誉展示组件
  - 显示当前声誉、等级、权限
  - 声誉历史图表
  - 集成API: `GET /api/community/reputation/:userId`

### 2. 推荐系统前端组件 (中优先级)

#### 2.1 推荐内容展示
- **RecommendationFeed.jsx** - 推荐内容流
  - 显示个性化推荐的学习资源
  - 支持反馈（喜欢/不喜欢）
  - 集成API: `GET /api/recommendations`

- **LearningPathCard.jsx** - 学习路径卡片
  - 显示AI生成的学习路径
  - 进度跟踪和完成状态
  - 集成API: `GET /api/ai/learning/path-generator`

#### 2.2 用户偏好设置
- **PreferencesForm.jsx** - 偏好设置表单
  - 学科偏好、难度偏好、学习目标
  - 集成API: `POST /api/recommendations/preferences`

### 3. 页面路由和导航 (高优先级)

#### 3.1 路由配置更新
更新 `src/App.jsx` 添加社区系统路由：
```javascript
// 社区系统路由
<Route path="/community" element={<CommunityHome />} />
<Route path="/community/questions" element={<QuestionList />} />
<Route path="/community/questions/:id" element={<QuestionDetail />} />
<Route path="/community/ask" element={<QuestionForm />} />
<Route path="/community/users/:id" element={<UserProfile />} />
<Route path="/community/:subjectCode" element={<SubjectCommunity />} />
```

#### 3.2 导航菜单更新
更新 `src/components/Navbar.jsx`：
- 添加"社区"菜单项
- 添加用户头像和声誉显示
- 添加通知图标（未读消息、徽章获得等）

### 4. API集成和状态管理 (高优先级)

#### 4.1 API客户端封装
创建 `src/api/communityApi.js`：
```javascript
// 社区API封装
export const communityApi = {
  // 问题相关
  getQuestions: (params) => api.get('/community/questions', { params }),
  getQuestion: (id) => api.get(`/community/questions/${id}`),
  createQuestion: (data) => api.post('/community/questions', data),
  
  // 回答相关
  getAnswers: (questionId) => api.get(`/community/answers?question_id=${questionId}`),
  createAnswer: (data) => api.post('/community/answers', data),
  
  // 互动相关
  createInteraction: (data) => api.post('/community/interactions', data),
  getUserInteractions: () => api.get('/community/interactions'),
  
  // 用户档案
  getUserProfile: (userId) => api.get(`/community/users/${userId}/profile`),
  updateUserProfile: (userId, data) => api.put(`/community/users/${userId}/profile`, data),
  
  // 徽章和声誉
  getUserBadges: (userId) => api.get(`/community/badges/${userId}`),
  getUserReputation: (userId) => api.get(`/community/reputation/${userId}`)
};
```

#### 4.2 状态管理
使用React Query或Context API管理：
- 用户认证状态
- 社区数据缓存
- 实时更新（投票、新回答等）

### 5. UI/UX设计要求 (中优先级)

#### 5.1 设计规范
- 遵循现有项目的设计系统和色彩方案
- 使用Tailwind CSS保持样式一致性
- 响应式设计，支持移动端

#### 5.2 交互体验
- 加载状态和骨架屏
- 错误处理和用户友好的错误提示
- 实时反馈（点赞动画、成功提示等）
- 无限滚动或分页加载

#### 5.3 特殊功能
- Markdown渲染（支持数学公式）
- 代码高亮
- 图片上传和预览
- 搜索高亮

### 6. 测试和联调 (高优先级)

#### 6.1 API联调测试
- 使用后端提供的测试脚本验证API功能
- 测试所有CRUD操作
- 测试错误处理和边界情况

#### 6.2 前端测试
- 组件单元测试
- 集成测试
- E2E测试关键用户流程

## 开发优先级和时间安排

### 第1周 (立即开始)
1. **社区基础组件** - QuestionList, QuestionDetail, QuestionForm
2. **API集成** - communityApi.js 和基础数据获取
3. **路由配置** - 添加社区相关路由

### 第2周
1. **互动功能** - VoteButtons, BookmarkButton
2. **用户系统** - UserProfile, BadgeDisplay, ReputationCard
3. **UI优化** - 响应式设计和交互体验

### 第3周
1. **推荐系统** - RecommendationFeed, LearningPathCard
2. **测试和优化** - API联调测试和性能优化
3. **文档和部署** - 组件文档和部署准备

## 技术要求

### 必须使用的技术栈
- React 18+ (已有)
- React Router (已有)
- Tailwind CSS (已有)
- @supabase/supabase-js (已有)

### 推荐使用的库
- @tanstack/react-query - 数据获取和缓存
- react-markdown - Markdown渲染
- katex - 数学公式渲染
- framer-motion - 动画效果
- react-hook-form - 表单处理

## 关键集成点

### 认证集成
- 使用现有的AuthContext
- 确保所有API请求包含认证token
- 处理token过期和刷新

### 数据同步
- 实时更新投票数、回答数等
- 缓存策略和数据一致性
- 离线支持（可选）

### 性能优化
- 组件懒加载
- 图片懒加载
- 虚拟滚动（长列表）
- 代码分割

## 交付标准

### 代码质量
- 遵循项目现有代码规范
- 组件可复用性和可维护性
- 适当的错误边界和错误处理

### 功能完整性
- 所有API端点都有对应的前端功能
- 用户流程完整且流畅
- 边界情况处理完善

### 测试覆盖
- 关键组件有单元测试
- API集成测试通过
- 主要用户流程E2E测试

## 协作方式

### 沟通渠道
- 使用项目文档记录进度和问题
- API问题和需求变更及时沟通
- 定期进行联调测试

### 文档要求
- 组件使用文档
- API集成说明
- 部署和配置指南

---

**注意**: 这个需求文档基于当前后端API的完成情况制定。如果在开发过程中发现API需要调整或新增功能，请及时沟通协调。