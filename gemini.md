# Gemini Project Context: cie-copilot

## 1. 项目概述 (Project Overview)

*   **核心功能 / Core Functionality:** 
    CIE Copilot 是一个AI驱动的学习助手，专为剑桥国际AS & A Level (CIE)学生设计。核心目标是以高性价比提供近似一对一的辅导体验，帮助学生通过以下功能掌握所有必修大纲主题：
    *   **结构化知识卡片** - 系统化展示各主题核心概念
    *   **主题导向AI问答** - 基于具体syllabus的智能问答系统
    *   **错题分析与管理** - 错题本功能，支持图像上传与OCR识别
    *   **个性化学习反馈** - 智能学习进度追踪和推荐
    *   **周报生成** - 学习进度和表现总结
    *   **多模态支持** - 错题图像上传与OCR识别
    
    本系统解决了A Level备考资源分散和缺乏个性化支持的问题。

*   **目标用户 / Target Users:** 
    *   准备CIE数学、进阶数学、物理考试的A Level和AS Level学生
    *   希望简化学生复习流程的教师
    *   需要结构化、个性化学习支持的剑桥国际考试备考者

## 2. 技术栈 (Tech Stack)

*   **前端框架 / Frontend Framework:** React 18.2.0
*   **构建工具 / Build Tool:** Vite 5.0.12
*   **CSS 方案 / CSS Solution:** Tailwind CSS 3.4.1 + Framer Motion 12.18.1 (动画)
*   **路由 / Routing:** React Router DOM 6.30.1
*   **图标库 / Icons:** Lucide React 0.516.0
*   **后端/API / Backend/API:** 
    *   Vercel Serverless Functions (当前实现)
    *   Supabase 或 Firebase (计划用于用户数据和题库管理)
*   **AI集成 / AI Integration:** 
    *   OpenAI GPT-4 API (主要AI问答)
    *   Claude API (可选/未来集成)
    *   计划: RAG/embedding 知识库用于主题搜索和检索
*   **主要语言 / Main Languages:** TypeScript, JavaScript (ES6+)

## 3. 开发与构建命令 (Development & Build Commands)

*   **安装依赖 / Install Dependencies:** `npm install`
*   **启动开发服务器 / Start Dev Server:** `npm run dev`
*   **构建生产版本 / Build Production:** `npm run build`
*   **预览构建版本 / Preview Build:** `npm run preview`
*   **运行测试 / Run Tests:** `npm test` (计划配置)
*   **代码格式化/Linter / Code Format/Lint:** `npm run lint` (基于 eslint.config.js)

## 4. 项目结构 (Project Structure)

*   `src/`: 主要源代码目录 / Main source code
    *   `src/components/`: React UI 组件 / UI components
        *   `AnimatedKeywords.jsx`: 动态关键词展示组件
        *   `ChatWidget.jsx`: AI聊天组件
        *   `CoreFeatures.jsx`: 核心功能展示组件  
        *   `Navbar.jsx`, `Footer.jsx`: 导航和页脚组件
        *   `Layout.jsx`: 页面布局组件
    *   `src/pages/`: 页面级组件 / Page-level components (每个主要路由)
        *   `Landing.jsx`: 主页/着陆页
        *   `AskAI.jsx`: AI问答页面
        *   `Topics.jsx`: 主题浏览页面
        *   `PaperPage.jsx`: 试卷详情页面
        *   各科目专页 (PhysicsASLevel.jsx, PhysicsA2Level.jsx等)
    *   `src/data/`: JSON数据文件 (CIE科目和试卷数据)
    *   `src/utils/` 或 `src/lib/`: 工具函数和公共库 / Shared utility functions and helpers
        *   `openai.js`: API调用封装
        *   `api/client.js`: 统一API客户端 (计划)
    *   `src/styles/`: 样式文件
*   `api/`: Serverless 后端函数 / Serverless backend functions (Vercel部署)
    *   `chat.js`: OpenAI API代理端点
*   `public/`: 静态资源 / Static assets (图片, 字体, favicon等)

## 5. 编码规范与约定 (Coding Style & Conventions)

*   **代码风格 / Coding Style:** 
    *   遵循内置的 ESLint 和 Prettier 配置 (eslint.config.js)
    *   React组件使用 PascalCase 命名
    *   函数和变量使用 camelCase 命名
    *   使用ES6+ 语法和React Hooks
    *   优先使用TypeScript进行类型安全开发
*   **API 通信 / API Communication:** 
    *   所有API请求通过统一的API客户端 `src/api/client.js` 发送
    *   AI相关请求当前通过 `src/utils/openai.js` 中的封装函数处理
    *   API端点定义在 `api/` 目录下 (Vercel Serverless Functions)
    *   使用 `/api/chat` 端点进行OpenAI API调用
*   **样式约定 / Styling Conventions:**
    *   使用 Tailwind CSS 进行样式开发
    *   响应式设计优先 (mobile-first)
    *   使用 Framer Motion 进行页面动画和交互

## 6. 环境变量 (Environment Variables)

*   **必要的环境变量 / Required Variables:**
    *   `VITE_API_BASE_URL`: API基础URL
    *   `OPENAI_API_KEY`: OpenAI API密钥 (用于AI功能)
    *   `SUPABASE_URL`: Supabase项目URL (计划)
    *   `SUPABASE_KEY`: Supabase API密钥 (计划)
    *   (其他变量根据实际集成情况添加)
*   **重要提示:** 请不要在文件中包含任何API密钥、密码或其他敏感信息，仅列变量名。环境变量应配置在Vercel部署环境中，本地开发时需要在 `.env.local` 文件中配置。

## 7. 重要提醒 (Important Notes)

*   **项目目标 / Project Goals:**
    *   高性价比、A Level近似一对一辅导体验
    *   覆盖核心功能：Topic导航、知识卡片与题型总结、AI问答、错题本与学习反馈、个性化推荐、周报生成
    *   多模态支持：错题图像上传与OCR识别

*   **MVP开发阶段优先级:**
    *   **当前优先级:** 知识卡片展示和AI问答功能
    *   **后续迭代:** 用户系统和RAG检索功能

*   **技术细节:**
    *   项目当前有一个未跟踪的文件: `src/components/Layout.jsx` (已创建但未提交到git)
    *   项目使用模块化的CIE数据结构，支持多个科目和试卷
    *   AI功能通过代理API确保安全性，避免在前端暴露API密钥
    *   项目针对CIE考试体系进行了专门优化，包含真实的syllabus映射 