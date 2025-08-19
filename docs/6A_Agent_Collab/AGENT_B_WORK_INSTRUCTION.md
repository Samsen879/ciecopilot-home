# 🚀 Agent B 工作指令

**项目**: CIE Copilot - A-Level学习助手  
**你的角色**: 前端工程师 (React + TypeScript)  
**协作伙伴**: Agent A (后端架构师)  
**开始时间**: 2025年1月18日

## 🎯 立即开始工作

### 第一步：环境配置 (5分钟)
```bash
# 在项目根目录运行
npm run agent-b:setup
# 按提示输入你的API密钥
```

### 第二步：验证集成 (2分钟)
```bash
npm run agent-b:test
# 检查所有API连接状态
```

### 第三步：开始开发 (立即)
```bash
npm run dev
# 访问 http://localhost:5173
```

## 📋 你的核心任务

### 🎨 优先级1：AI辅导聊天组件
- **文件**: `src/components/AI/AITutorChat.jsx`
- **功能**: 实时聊天、数学公式渲染、知识缺陷展示
- **API**: `POST /api/ai/tutor/chat`

### 📊 优先级2：学习路径可视化组件
- **文件**: `src/components/Learning/LearningPathVisualizer.jsx`
- **功能**: 时间线/日历/树状图视图、进度跟踪
- **API**: `POST /api/learning/path/generate`

### 🔍 优先级3：知识缺陷分析组件
- **文件**: `src/components/Analysis/KnowledgeGapAnalysis.jsx`
- **功能**: 缺陷可视化、优先级排序、行动建议
- **API**: `POST /api/ai/analyze/knowledge-gaps`

## 🔑 必需的API密钥

在 `.env.local` 文件中配置：
```bash
VITE_SUPABASE_URL=你的Supabase项目URL
VITE_SUPABASE_ANON_KEY=你的Supabase匿名密钥
VITE_OPENAI_API_KEY=你的OpenAI API密钥
```

## 📚 重要文档

1. **完整开发指南**: `docs/6A_Agent_Collab/AGENT_B_DEVELOPMENT_GUIDE.md`
2. **快速参考**: `docs/6A_Agent_Collab/AGENT_B_QUICK_REFERENCE.md`
3. **API接口规范**: `docs/6A_Agent_Collab/API_CONTRACTS.md`
4. **协作框架**: `docs/6A_Agent_Collab/AGENT_COLLABORATION_FRAMEWORK.md`

## 🎨 技术栈

- **框架**: React 18.2.0 + Vite 5.0.12
- **样式**: Tailwind CSS 3.4.1
- **动画**: Framer Motion 12.18.1
- **状态管理**: React Query 5.84.2
- **数学公式**: KaTeX 0.16.22

## 🚨 重要规则

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

### 遇到问题时
1. 查看开发指南寻找解决方案
2. 在 `docs/6A_Agent_Collab/ISSUES_LOG.md` 中记录问题
3. 使用 `npm run agent-b:test` 诊断API问题
4. 联系Agent A协助解决

### 完成任务后
1. 更新 `docs/6A_Agent_Collab/AGENT_COLLABORATION_FRAMEWORK.md`
2. 运行完整测试确保功能正常
3. 提交代码并通知Agent A进行集成测试

## 🎯 本周目标

- [ ] 完成AI辅导聊天组件基础功能
- [ ] 实现与后端API的基础集成
- [ ] 完成响应式设计适配
- [ ] 通过所有集成测试

## 🆘 快速帮助

**环境问题**: 运行 `npm run agent-b:setup`  
**API问题**: 运行 `npm run agent-b:test`  
**组件问题**: 查看 `AGENT_B_DEVELOPMENT_GUIDE.md`  
**协作问题**: 查看 `AGENT_COLLABORATION_FRAMEWORK.md`

---

**🎉 准备好了吗？立即运行 `npm run agent-b:setup` 开始你的开发工作！**

---

*创建时间: 2025年1月18日*  
*创建者: Agent A*  
*执行者: Agent B*