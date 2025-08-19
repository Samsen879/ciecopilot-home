# 🎨 Agent B (Cursor) 前端开发指南

**项目**: CIE Copilot - A-Level学习助手  
**Agent角色**: 前端工程师 (React + TypeScript)  
**协作伙伴**: Agent A (Trae AI) - 后端架构师  
**创建时间**: 2025年1月18日  
**版本**: v1.0

## 🎯 Agent B 核心职责

### 主要任务
- **React组件开发**: 创建可复用的UI组件
- **用户界面设计**: 实现现代化、响应式的用户界面
- **前端集成**: 与Agent A提供的API接口进行集成
- **用户体验优化**: 确保流畅的用户交互体验

### 技术栈
- **框架**: React 18.2.0 + Vite 5.0.12
- **样式**: Tailwind CSS 3.4.1
- **动画**: Framer Motion 12.18.1
- **状态管理**: React Query 5.84.2
- **路由**: React Router DOM 6.30.1
- **图标**: Lucide React 0.516.0
- **数学公式**: KaTeX 0.16.22
- **Markdown**: React Markdown 10.1.0

## 🔧 开发环境配置

### 环境变量配置

#### 必需的环境变量 (.env.local)
```bash
# Supabase 配置 (前端)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# RAG API 配置
VITE_RAG_API_BASE=/api/rag
VITE_RAG_API_TIMEOUT=30000

# OpenAI 配置 (前端使用)
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
VITE_OPENAI_API_KEY=your_openai_api_key

# 向量嵌入配置
VITE_EMBEDDING_BASE_URL=https://api.openai.com/v1
VITE_EMBEDDING_API_KEY=your_openai_api_key
VITE_EMBEDDING_MODEL=text-embedding-3-small
VITE_EMBEDDING_DIMENSIONS=1536

# 开发环境配置
VITE_USE_MSW=false
NODE_ENV=development
```

#### 环境变量说明

| 变量名 | 用途 | 示例值 | 必需 |
|--------|------|--------|------|
| `VITE_SUPABASE_URL` | Supabase项目URL | `https://xxx.supabase.co` | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase匿名密钥 | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | ✅ |
| `VITE_RAG_API_BASE` | RAG API基础路径 | `/api/rag` | ✅ |
| `VITE_RAG_API_TIMEOUT` | API超时时间(毫秒) | `30000` | ⚪ |
| `VITE_OPENAI_API_KEY` | OpenAI API密钥 | `sk-...` | ✅ |
| `VITE_EMBEDDING_MODEL` | 嵌入模型名称 | `text-embedding-3-small` | ⚪ |
| `VITE_USE_MSW` | 是否使用Mock Service Worker | `false` | ⚪ |

### 项目启动
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 📡 API 接口规范

### 统一响应格式
```typescript
// 成功响应
interface SuccessResponse<T> {
  success: true;
  data: T;
  message: string;
}

// 错误响应
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
```

### 1. AI辅导对话接口

**接口**: `POST /api/ai/tutor/chat`

**请求参数**:
```typescript
interface ChatRequest {
  message: string;                    // 用户问题
  context: {
    subject_code: string;             // 科目代码 (如: "9709")
    topic_id?: string;                // 主题ID (可选)
    difficulty_level: 'beginner' | 'intermediate' | 'advanced';
    learning_style: 'visual' | 'auditory' | 'kinesthetic';
  };
  conversation_id?: string;           // 对话ID (多轮对话)
}
```

**响应数据**:
```typescript
interface ChatResponse {
  response: string;                   // AI回答内容
  conversation_id: string;            // 对话ID
  suggestions: Suggestion[];          // 建议列表
  knowledge_gaps: KnowledgeGap[];     // 知识缺陷
}

interface Suggestion {
  type: 'practice' | 'review' | 'concept' | 'example';
  title: string;
  content: string;
  action_url?: string;
}

interface KnowledgeGap {
  topic_id: string;
  topic_name: string;
  confidence_score: number;           // 0-1
  priority: 'low' | 'medium' | 'high';
  recommended_actions: string[];
}
```

**错误处理**:
```typescript
// 网络错误
if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

// API错误
if (!result.success) {
  switch (result.error.code) {
    case 'INVALID_INPUT':
      // 处理输入验证错误
      break;
    case 'AI_SERVICE_UNAVAILABLE':
      // 处理AI服务不可用
      break;
    case 'RATE_LIMIT_EXCEEDED':
      // 处理频率限制
      break;
    default:
      // 处理其他错误
      break;
  }
}
```

### 2. 知识点缺陷分析接口

**接口**: `POST /api/ai/analyze/knowledge-gaps`

**请求参数**:
```typescript
interface AnalyzeRequest {
  user_id: string;
  subject_code: string;
  recent_interactions: number;        // 分析最近N次交互
}
```

**响应数据**:
```typescript
interface AnalyzeResponse {
  gaps: KnowledgeGap[];
  overall_score: number;              // 0-1
  improvement_trend: 'improving' | 'stable' | 'declining';
}
```

### 3. 学习路径生成接口

**接口**: `POST /api/learning/path/generate`

**请求参数**:
```typescript
interface GeneratePathRequest {
  user_id: string;
  subject_code: string;
  target_exam_date: string;           // ISO 8601 格式
  current_level: 'beginner' | 'intermediate' | 'advanced';
  time_available: {
    daily_hours: number;
    weekly_days: number;
  };
  preferences: {
    learning_style: 'visual' | 'auditory' | 'kinesthetic';
    difficulty_progression: 'gradual' | 'accelerated';
  };
}
```

**响应数据**:
```typescript
interface LearningPath {
  path_id: string;
  total_duration_weeks: number;
  milestones: Milestone[];
  daily_schedule: DailySchedule[];
}

interface Milestone {
  week: number;
  topics: string[];
  estimated_hours: number;
  objectives: string[];
  status?: 'pending' | 'in_progress' | 'completed';
}

interface DailySchedule {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  activities: Activity[];
}

interface Activity {
  type: 'study' | 'practice' | 'review' | 'assessment';
  topic_id: string;
  duration_minutes: number;
  difficulty_level?: string;
}
```

### 4. 学习路径进度接口

**接口**: `GET /api/learning/path/{path_id}/progress`

**响应数据**:
```typescript
interface ProgressResponse {
  path_id: string;
  completion_percentage: number;
  current_milestone: {
    week: number;
    status: 'pending' | 'in_progress' | 'completed';
    completion_percentage: number;
  };
  upcoming_activities: Activity[];
  performance_metrics: {
    average_accuracy: number;
    time_efficiency: number;
    consistency_score: number;
  };
}
```

## 🎨 核心组件开发

### 1. AI辅导聊天组件

**组件名**: `AITutorChat`
**文件路径**: `src/components/AI/AITutorChat.jsx`

```typescript
interface AITutorChatProps {
  subjectCode: string;                // 科目代码
  topicId?: string;                   // 当前主题ID
  userPreferences: {
    learningStyle: 'visual' | 'auditory' | 'kinesthetic';
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  };
  onKnowledgeGapDetected: (gaps: KnowledgeGap[]) => void;
  onSuggestionClick: (suggestion: Suggestion) => void;
  className?: string;
}
```

**功能要求**:
- 实时聊天界面，支持多轮对话
- 显示AI回答和建议
- 知识缺陷可视化
- 支持数学公式渲染 (KaTeX)
- 响应式设计，适配移动端
- 加载状态和错误处理

**设计规范**:
```css
/* 聊天容器 */
.chat-container {
  @apply flex flex-col h-full max-h-[600px] bg-white rounded-lg shadow-lg;
}

/* 消息列表 */
.message-list {
  @apply flex-1 overflow-y-auto p-4 space-y-4;
}

/* 用户消息 */
.user-message {
  @apply ml-auto max-w-[80%] bg-blue-500 text-white rounded-lg p-3;
}

/* AI消息 */
.ai-message {
  @apply mr-auto max-w-[80%] bg-gray-100 text-gray-800 rounded-lg p-3;
}

/* 输入框 */
.chat-input {
  @apply border-t p-4 flex gap-2;
}
```

### 2. 学习路径可视化组件

**组件名**: `LearningPathVisualizer`
**文件路径**: `src/components/Learning/LearningPathVisualizer.jsx`

```typescript
interface LearningPathVisualizerProps {
  pathData: LearningPath;
  currentProgress: number;
  onMilestoneClick: (milestone: Milestone) => void;
  onActivityStart: (activity: Activity) => void;
  viewMode: 'timeline' | 'calendar' | 'tree';
  className?: string;
}
```

**功能要求**:
- 三种视图模式：时间线、日历、树状图
- 进度可视化 (进度条、百分比)
- 里程碑交互 (点击查看详情)
- 活动启动功能
- 动画效果 (Framer Motion)
- 响应式布局

### 3. 知识缺陷分析组件

**组件名**: `KnowledgeGapAnalysis`
**文件路径**: `src/components/Analysis/KnowledgeGapAnalysis.jsx`

```typescript
interface KnowledgeGapAnalysisProps {
  gaps: KnowledgeGap[];
  overallScore: number;
  trend: 'improving' | 'stable' | 'declining';
  onGapClick: (gap: KnowledgeGap) => void;
  onActionClick: (action: string, gap: KnowledgeGap) => void;
}
```

**功能要求**:
- 缺陷列表展示
- 置信度可视化 (进度条、颜色编码)
- 优先级排序
- 推荐行动按钮
- 趋势图表

## 🔗 API 集成示例

### React Query 配置

```typescript
// src/hooks/useAITutor.js
import { useMutation, useQuery } from '@tanstack/react-query';

export const useAIChat = () => {
  return useMutation({
    mutationFn: async (request: ChatRequest) => {
      const response = await fetch('/api/ai/tutor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error.message);
      }
      
      return result.data;
    },
    onError: (error) => {
      console.error('AI Chat Error:', error);
      // 显示用户友好的错误提示
    },
  });
};

export const useKnowledgeGapAnalysis = (userId: string, subjectCode: string) => {
  return useQuery({
    queryKey: ['knowledge-gaps', userId, subjectCode],
    queryFn: async () => {
      const response = await fetch('/api/ai/analyze/knowledge-gaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          user_id: userId,
          subject_code: subjectCode,
          recent_interactions: 10,
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error.message);
      }
      
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5分钟
    refetchOnWindowFocus: false,
  });
};
```

### 错误处理策略

```typescript
// src/utils/errorHandler.js
export const handleApiError = (error: any) => {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      title: '网络连接错误',
      message: '请检查您的网络连接并重试',
      action: 'retry',
    };
  }
  
  if (error.message.includes('401')) {
    return {
      title: '认证失败',
      message: '请重新登录',
      action: 'login',
    };
  }
  
  if (error.message.includes('429')) {
    return {
      title: '请求过于频繁',
      message: '请稍后再试',
      action: 'wait',
    };
  }
  
  return {
    title: '操作失败',
    message: error.message || '发生未知错误',
    action: 'retry',
  };
};
```

## 🎯 开发任务清单

### 高优先级任务
- [ ] **AI辅导聊天组件** (`AITutorChat`)
  - [ ] 基础聊天界面
  - [ ] 多轮对话支持
  - [ ] 数学公式渲染
  - [ ] 建议和缺陷展示
  - [ ] 响应式设计

- [ ] **学习路径可视化组件** (`LearningPathVisualizer`)
  - [ ] 时间线视图
  - [ ] 日历视图
  - [ ] 树状图视图
  - [ ] 进度可视化
  - [ ] 交互功能

### 中优先级任务
- [ ] **知识缺陷分析组件** (`KnowledgeGapAnalysis`)
- [ ] **API集成和错误处理**
- [ ] **响应式设计优化**
- [ ] **动画效果实现**

### 低优先级任务
- [ ] **单元测试编写**
- [ ] **性能优化**
- [ ] **无障碍功能**
- [ ] **国际化支持**

## 🚨 注意事项

### 性能要求
- **组件渲染时间**: < 500ms
- **API响应处理**: < 100ms
- **动画流畅度**: 60fps
- **包大小控制**: 避免不必要的依赖

### 代码规范
- 使用 TypeScript 进行类型检查
- 遵循 React Hooks 最佳实践
- 组件拆分原则：单一职责
- CSS类名使用 Tailwind 工具类
- 避免内联样式，使用CSS模块或Tailwind

### 安全考虑
- 所有API调用需要认证
- 用户输入需要验证和清理
- 敏感信息不在前端存储
- 使用HTTPS进行数据传输

### 错误处理
- 网络错误的用户友好提示
- 加载状态的视觉反馈
- 降级策略 (离线模式)
- 错误边界组件

## 🔄 与Agent A的协作流程

### 日常协作
1. **接口约定确认**: 基于 `API_CONTRACTS.md` 进行开发
2. **问题记录**: 在 `ISSUES_LOG.md` 中记录遇到的问题
3. **进度同步**: 更新 `AGENT_COLLABORATION_FRAMEWORK.md`
4. **代码审查**: 确保前后端集成顺畅

### 集成测试
1. **本地测试**: 使用 `npm run dev` 启动前端
2. **API测试**: 确保所有接口调用正常
3. **端到端测试**: 验证完整的用户流程
4. **性能测试**: 检查响应时间和渲染性能

### 部署协调
1. **环境变量同步**: 确保生产环境配置正确
2. **版本发布**: 与Agent A协调发布时间
3. **监控设置**: 配置前端错误监控
4. **回滚准备**: 准备快速回滚方案

## 📚 参考资源

### 技术文档
- [React 官方文档](https://react.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Framer Motion 文档](https://www.framer.com/motion/)
- [React Query 文档](https://tanstack.com/query/latest)
- [Supabase JavaScript 客户端](https://supabase.com/docs/reference/javascript)

### 项目文档
- `docs/6A_Agent_Collab/API_CONTRACTS.md` - API接口约定
- `docs/6A_Agent_Collab/AGENT_COLLABORATION_FRAMEWORK.md` - 协作框架
- `docs/6A_Agent_Collab/ISSUES_LOG.md` - 问题记录
- `docs/setup/SUPABASE_SETUP.md` - Supabase配置指南

---

## 🎉 成功指标

### 短期目标 (本周)
- [ ] 完成AI辅导聊天组件的基础功能
- [ ] 实现与后端API的基础集成
- [ ] 完成响应式设计适配

### 中期目标 (下周)
- [ ] 完成学习路径可视化组件
- [ ] 实现完整的错误处理机制
- [ ] 通过所有集成测试

### 长期目标 (本月)
- [ ] 完成所有核心组件开发
- [ ] 实现流畅的用户体验
- [ ] 达到性能要求指标

---

**维护者**: Agent A (Trae AI)  
**使用者**: Agent B (Cursor)  
**最后更新**: 2025年1月18日  
**下次更新**: 组件开发完成后

*本文档是Agent B独立开发的完整指南，确保前端开发工作能够高效、有序地进行，并与Agent A的后端工作完美集成。*