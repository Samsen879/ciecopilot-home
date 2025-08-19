# 🚀 Agent B 快速参考卡片

> **目标**: 让Agent B在5分钟内了解所有必要信息并开始开发

## 🎯 你的角色
- **身份**: 前端工程师 (React + TypeScript)
- **伙伴**: Agent A (后端架构师)
- **任务**: 开发AI辅导和学习路径的用户界面

## ⚡ 快速开始

### 1. 环境配置 (2分钟)
```bash
# 克隆项目后运行
npm run agent-b:setup
# 按提示输入API密钥
```

### 2. 测试集成 (1分钟)
```bash
npm run agent-b:test
# 检查API连接状态
```

### 3. 启动开发 (1分钟)
```bash
npm run dev
# 访问 http://localhost:5173
```

## 🔑 必需的API密钥

| 密钥 | 获取地址 | 用途 |
|------|----------|------|
| `VITE_SUPABASE_URL` | [Supabase控制台](https://supabase.com) | 数据库连接 |
| `VITE_SUPABASE_ANON_KEY` | Supabase控制台 | 数据库认证 |
| `VITE_OPENAI_API_KEY` | [OpenAI控制台](https://platform.openai.com) | AI功能 |

## 📋 你的开发任务

### 🎨 核心组件 (优先级：高)
1. **AITutorChat** - AI辅导聊天界面
   - 文件: `src/components/AI/AITutorChat.jsx`
   - 功能: 多轮对话、数学公式渲染、建议展示

2. **LearningPathVisualizer** - 学习路径可视化
   - 文件: `src/components/Learning/LearningPathVisualizer.jsx`
   - 功能: 时间线/日历/树状图视图、进度跟踪

3. **KnowledgeGapAnalysis** - 知识缺陷分析
   - 文件: `src/components/Analysis/KnowledgeGapAnalysis.jsx`
   - 功能: 缺陷可视化、优先级排序、行动建议

## 🔌 API接口速查

### AI辅导对话
```typescript
POST /api/ai/tutor/chat
{
  message: string,
  context: {
    subject_code: string,
    difficulty_level: 'beginner' | 'intermediate' | 'advanced',
    learning_style: 'visual' | 'auditory' | 'kinesthetic'
  }
}
```

### 知识缺陷分析
```typescript
POST /api/ai/analyze/knowledge-gaps
{
  user_id: string,
  subject_code: string,
  recent_interactions: number
}
```

### 学习路径生成
```typescript
POST /api/learning/path/generate
{
  user_id: string,
  subject_code: string,
  target_exam_date: string,
  current_level: string,
  time_available: { daily_hours: number, weekly_days: number }
}
```

## 🎨 设计规范

### 样式系统
- **框架**: Tailwind CSS
- **动画**: Framer Motion
- **图标**: Lucide React
- **数学公式**: KaTeX

### 颜色方案
```css
/* 主色调 */
.primary { @apply bg-blue-500 text-white; }
.secondary { @apply bg-gray-100 text-gray-800; }
.success { @apply bg-green-500 text-white; }
.warning { @apply bg-yellow-500 text-white; }
.error { @apply bg-red-500 text-white; }
```

### 响应式断点
```css
/* 移动端优先 */
sm: 640px   /* 小屏幕 */
md: 768px   /* 平板 */
lg: 1024px  /* 桌面 */
xl: 1280px  /* 大屏幕 */
```

## 🔧 开发工具

### React Hooks
```typescript
// API调用
import { useAIChat, useKnowledgeGapAnalysis } from '@/hooks/useAITutor';

// 状态管理
import { useQuery, useMutation } from '@tanstack/react-query';
```

### 错误处理
```typescript
// 统一错误处理
import { handleApiError } from '@/utils/errorHandler';

try {
  const result = await apiCall();
} catch (error) {
  const errorInfo = handleApiError(error);
  // 显示用户友好的错误信息
}
```

## 🚨 重要注意事项

### ✅ 必须做
- 使用TypeScript进行类型检查
- 所有组件支持响应式设计
- API调用必须包含错误处理
- 遵循现有代码风格和命名约定

### ❌ 禁止做
- 不要修改Agent A负责的后端文件
- 不要在前端存储敏感信息
- 不要使用内联样式，使用Tailwind类
- 不要提交.env.local文件到Git

## 🤝 与Agent A协作

### 沟通渠道
- **API约定**: `docs/6A_Agent_Collab/API_CONTRACTS.md`
- **问题记录**: `docs/6A_Agent_Collab/ISSUES_LOG.md`
- **协作框架**: `docs/6A_Agent_Collab/AGENT_COLLABORATION_FRAMEWORK.md`

### 工作流程
1. **开发前**: 检查API约定文档
2. **开发中**: 使用测试工具验证集成
3. **遇到问题**: 在ISSUES_LOG.md中记录
4. **完成后**: 更新协作框架文档

## 📚 关键文档

| 文档 | 用途 | 优先级 |
|------|------|--------|
| `AGENT_B_DEVELOPMENT_GUIDE.md` | 完整开发指南 | 🔴 必读 |
| `API_CONTRACTS.md` | 接口规范 | 🔴 必读 |
| `AGENT_COLLABORATION_FRAMEWORK.md` | 协作流程 | 🟡 重要 |
| `ISSUES_LOG.md` | 问题记录 | 🟡 重要 |

## 🎯 成功指标

### 本周目标
- [ ] 完成AI辅导聊天组件基础功能
- [ ] 实现与后端API的基础集成
- [ ] 完成响应式设计适配

### 质量标准
- 组件渲染时间 < 500ms
- API响应处理 < 100ms
- 动画流畅度 60fps
- 移动端完美适配

## 🆘 遇到问题？

### 常见问题
1. **API连接失败**: 检查.env.local配置
2. **组件不渲染**: 检查TypeScript类型错误
3. **样式不生效**: 确认使用Tailwind类名
4. **构建失败**: 运行`npm install`重新安装依赖

### 获取帮助
1. 查看开发指南详细说明
2. 运行`npm run agent-b:test`诊断问题
3. 在ISSUES_LOG.md中记录问题
4. 联系Agent A协助解决

---

**🎉 准备好了吗？运行 `npm run agent-b:setup` 开始你的开发之旅！**

---

*最后更新: 2025年1月18日*  
*维护者: Agent A*  
*使用者: Agent B*