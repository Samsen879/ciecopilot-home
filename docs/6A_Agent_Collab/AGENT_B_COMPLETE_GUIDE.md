# Agent B 前端开发完整指南

## 📋 项目概述

基于当前后端API开发进度，Agent B需要开发一个完整的前端应用，包括社区问答系统、推荐系统、用户认证和管理等功能。

## 🎯 核心任务清单

### 第一阶段：基础架构和认证系统 (优先级：高)

#### 1.1 项目初始化和配置
- [ ] 安装和配置必要依赖
  ```bash
  npm install react-router-dom axios react-hot-toast
  npm install @headlessui/react @heroicons/react
  npm install tailwindcss @tailwindcss/forms
  ```
- [ ] 配置环境变量 (`.env`)
- [ ] 设置Tailwind CSS配置
- [ ] 创建基础项目结构

#### 1.2 认证系统
- [ ] 实现 `AuthContext` 和 `AuthProvider`
- [ ] 创建登录组件 (`Login.jsx`)
- [ ] 创建注册组件 (`Register.jsx`)
- [ ] 实现受保护路由组件 (`ProtectedRoute.jsx`)
- [ ] 创建认证工具函数 (`utils/auth.js`)

#### 1.3 API客户端
- [ ] 实现基础API客户端 (`api/apiClient.js`)
- [ ] 创建社区API封装 (`api/communityApi.js`)
- [ ] 创建推荐API封装 (`api/recommendationApi.js`)
- [ ] 实现请求拦截器和错误处理

### 第二阶段：社区系统核心功能 (优先级：高)

#### 2.1 状态管理
- [ ] 实现 `CommunityContext` 和 `CommunityProvider`
- [ ] 创建自定义Hook (`hooks/useCommunityData.js`)
- [ ] 实现状态管理Reducer

#### 2.2 问题管理
- [ ] 问题列表组件 (`QuestionList.jsx`)
  - 支持分页、搜索、筛选
  - 按学科代码、难度、时间排序
  - 显示问题统计信息
- [ ] 问题详情组件 (`QuestionDetail.jsx`)
  - 显示问题内容和回答
  - 支持投票和互动
  - 显示相关问题推荐
- [ ] 问题发布组件 (`QuestionForm.jsx`)
  - 富文本编辑器
  - 标签选择和分类
  - 表单验证
- [ ] 问题编辑组件 (`QuestionEdit.jsx`)

#### 2.3 回答系统
- [ ] 回答列表组件 (`AnswerList.jsx`)
- [ ] 回答发布组件 (`AnswerForm.jsx`)
- [ ] 回答编辑组件 (`AnswerEdit.jsx`)
- [ ] 最佳回答标记功能

#### 2.4 互动系统
- [ ] 投票按钮组件 (`VoteButtons.jsx`)
  - 点赞/踩功能
  - 实时更新投票数
  - 防止重复投票
- [ ] 收藏功能组件 (`BookmarkButton.jsx`)
- [ ] 分享功能组件 (`ShareButton.jsx`)

### 第三阶段：用户系统和个人档案 (优先级：中)

#### 3.1 用户档案
- [ ] 用户档案页面 (`UserProfile.jsx`)
  - 基本信息展示
  - 活动统计
  - 问题和回答历史
- [ ] 用户档案编辑 (`ProfileEdit.jsx`)
- [ ] 用户设置页面 (`UserSettings.jsx`)

#### 3.2 徽章和声誉系统
- [ ] 徽章展示组件 (`BadgeDisplay.jsx`)
- [ ] 声誉历史组件 (`ReputationHistory.jsx`)
- [ ] 成就页面 (`Achievements.jsx`)
- [ ] 排行榜组件 (`Leaderboard.jsx`)

### 第四阶段：推荐系统前端 (优先级：中)

#### 4.1 推荐内容展示
- [ ] 推荐问题组件 (`RecommendedQuestions.jsx`)
- [ ] 学习路径组件 (`LearningPath.jsx`)
- [ ] 个性化推荐页面 (`Recommendations.jsx`)

#### 4.2 用户偏好设置
- [ ] 偏好设置组件 (`PreferenceSettings.jsx`)
- [ ] 学习目标设置 (`LearningGoals.jsx`)
- [ ] 推荐反馈组件 (`RecommendationFeedback.jsx`)

### 第五阶段：UI/UX优化和高级功能 (优先级：低)

#### 5.1 搜索和筛选
- [ ] 高级搜索组件 (`AdvancedSearch.jsx`)
- [ ] 搜索结果页面 (`SearchResults.jsx`)
- [ ] 搜索历史和建议

#### 5.2 通知系统
- [ ] 通知中心 (`NotificationCenter.jsx`)
- [ ] 实时通知 (WebSocket)
- [ ] 邮件通知设置

#### 5.3 响应式设计和性能优化
- [ ] 移动端适配
- [ ] 懒加载和虚拟滚动
- [ ] 图片优化和CDN
- [ ] PWA功能

## 🏗️ 项目结构建议

```
src/
├── components/
│   ├── Auth/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── ProtectedRoute.jsx
│   ├── Community/
│   │   ├── QuestionList.jsx
│   │   ├── QuestionDetail.jsx
│   │   ├── QuestionForm.jsx
│   │   ├── AnswerList.jsx
│   │   ├── AnswerForm.jsx
│   │   ├── VoteButtons.jsx
│   │   └── UserProfile.jsx
│   ├── Recommendations/
│   │   ├── RecommendedQuestions.jsx
│   │   ├── LearningPath.jsx
│   │   └── PreferenceSettings.jsx
│   ├── Layout/
│   │   ├── Navbar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Footer.jsx
│   │   └── LoadingSpinner.jsx
│   └── Common/
│       ├── Button.jsx
│       ├── Input.jsx
│       ├── Modal.jsx
│       └── Pagination.jsx
├── contexts/
│   ├── AuthContext.jsx
│   ├── CommunityContext.jsx
│   └── RecommendationContext.jsx
├── hooks/
│   ├── useCommunityData.js
│   ├── useRecommendations.js
│   └── useAuth.js
├── api/
│   ├── apiClient.js
│   ├── communityApi.js
│   └── recommendationApi.js
├── utils/
│   ├── auth.js
│   ├── formatters.js
│   └── validators.js
├── styles/
│   ├── globals.css
│   └── components.css
└── App.jsx
```

## 🔧 技术栈和工具

### 核心技术
- **React 18** - 前端框架
- **React Router v6** - 路由管理
- **Axios** - HTTP客户端
- **Tailwind CSS** - 样式框架

### 推荐依赖
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "axios": "^1.3.0",
    "react-hot-toast": "^2.4.0",
    "@headlessui/react": "^1.7.0",
    "@heroicons/react": "^2.0.0",
    "date-fns": "^2.29.0",
    "clsx": "^1.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^3.1.0",
    "tailwindcss": "^3.2.0",
    "@tailwindcss/forms": "^0.5.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

## 🎨 设计规范

### 颜色主题
```css
:root {
  --primary: #3B82F6;      /* 蓝色 */
  --primary-dark: #1D4ED8;
  --secondary: #10B981;     /* 绿色 */
  --accent: #F59E0B;       /* 橙色 */
  --danger: #EF4444;       /* 红色 */
  --warning: #F59E0B;      /* 黄色 */
  --success: #10B981;      /* 绿色 */
  --gray-50: #F9FAFB;
  --gray-100: #F3F4F6;
  --gray-900: #111827;
}
```

### 组件设计原则
1. **一致性** - 使用统一的设计语言
2. **可访问性** - 支持键盘导航和屏幕阅读器
3. **响应式** - 适配各种屏幕尺寸
4. **性能** - 优化渲染和加载速度

## 🔗 API集成要点

### 认证流程
1. 用户登录获取JWT token
2. 在请求头中携带token
3. 处理token过期和刷新
4. 实现自动登出机制

### 错误处理
1. 网络错误处理
2. 服务器错误处理
3. 用户友好的错误提示
4. 错误日志记录

### 数据缓存
1. 使用Context进行状态缓存
2. 实现乐观更新
3. 处理数据同步
4. 缓存失效策略

## 📱 响应式设计

### 断点设置
```css
/* Tailwind CSS 断点 */
sm: 640px   /* 手机横屏 */
md: 768px   /* 平板 */
lg: 1024px  /* 小屏笔记本 */
xl: 1280px  /* 桌面 */
2xl: 1536px /* 大屏桌面 */
```

### 移动端优化
- 触摸友好的按钮尺寸
- 简化的导航菜单
- 优化的表单输入
- 快速加载的图片

## 🧪 测试策略

### 单元测试
- 组件渲染测试
- 用户交互测试
- API调用测试
- 工具函数测试

### 集成测试
- 页面流程测试
- API集成测试
- 认证流程测试
- 错误处理测试

### E2E测试
- 关键用户路径
- 跨浏览器兼容性
- 性能测试
- 可访问性测试

## 🚀 部署和优化

### 构建优化
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@headlessui/react', '@heroicons/react']
        }
      }
    }
  }
}
```

### 性能监控
- 页面加载时间
- API响应时间
- 用户交互延迟
- 错误率统计

## 📚 开发资源

### 文档参考
- [API集成指南](./API_INTEGRATION_GUIDE.md)
- [前端组件示例](./FRONTEND_COMPONENT_EXAMPLES.md)
- [状态管理指南](./FRONTEND_STATE_MANAGEMENT.md)

### 设计资源
- [Tailwind CSS文档](https://tailwindcss.com/docs)
- [Headless UI组件](https://headlessui.com/)
- [Heroicons图标库](https://heroicons.com/)

## ⏰ 开发时间安排

### 第1-2周：基础架构
- 项目初始化和配置
- 认证系统实现
- API客户端开发

### 第3-4周：核心功能
- 社区问答系统
- 用户互动功能
- 基础UI组件

### 第5-6周：高级功能
- 推荐系统前端
- 用户档案系统
- 性能优化

### 第7周：测试和部署
- 功能测试
- 性能优化
- 部署准备

## 🎯 验收标准

### 功能完整性
- [ ] 所有API端点正确集成
- [ ] 用户认证流程完整
- [ ] 社区功能完全可用
- [ ] 推荐系统正常工作

### 性能要求
- [ ] 首屏加载时间 < 3秒
- [ ] 页面切换延迟 < 500ms
- [ ] API请求响应 < 2秒
- [ ] 移动端体验流畅

### 代码质量
- [ ] 组件复用率 > 80%
- [ ] 代码覆盖率 > 85%
- [ ] 无严重性能问题
- [ ] 符合可访问性标准

## 🤝 协作要点

### 与后端联调
1. 确认API接口规范
2. 测试数据格式一致性
3. 错误处理机制对齐
4. 性能优化协调

### 问题反馈
1. API接口问题及时反馈
2. 数据格式不匹配问题
3. 性能瓶颈识别
4. 功能需求澄清

---

**开始开发前，请仔细阅读所有相关文档，确保理解项目架构和技术要求。如有疑问，请及时沟通。**