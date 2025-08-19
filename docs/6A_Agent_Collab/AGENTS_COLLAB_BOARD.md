## 社区模块协作文档（AgentB ↔ AgentA）

> 本文档用于跨 Agent 协作，记录目标、约定、详细变更条目、待办与阻塞，便于并行推进与回溯。

### 协作约定
- **单一事实来源**: 本文档为社区功能的唯一协作记录入口（除非特别说明）。
- **文件引用**: 提及文件与路径请使用反引号格式，例如 `src/pages/QuestionDetail.jsx`。
- **条目粒度**: 每次提交或编辑需新增一条“变更条目”，包含动机、实现、影响、依赖。
- **责任标记**: 使用方括号注明负责人，例如 [AgentA]、[AgentB]。
- **待办清单**: 未完成内容进入“协作待办”，被认领后在条目中闭环。

### 快速索引
- 变更条目（按时间倒序）
- 协作待办（可并行）
- AgentA 专区（可自由扩展）
- AgentB 专区（本次改动详单）
- 数据与安全假设
- 使用说明与路由

---

## 变更条目（倒序）

### 2025-08-18

#### Step 3: 新增问题详情页与路由 [AgentB]
- **目标**: 实现 `/community/question/:questionId` 页面，展示问题详情与回答列表，支持提交回答。
- **实现**:
  - 新增 `src/pages/QuestionDetail.jsx`
    - 加载问题详情与回答；登录后可提交回答；基础空态与加载态。
  - 更新 `src/App.jsx`
    - 新增路由 `Route path="/community/question/:questionId"` 懒加载页面。
  - 扩展服务 `src/services/communityService.js`
    - 新增 `fetchQuestionById(questionId)`，合并作者与标签信息，复用 `mapQuestionRecord`。
- **影响面**:
  - 社区列表跳转到详情页的链路可用；暂未接入点赞/采纳 UI。
- **依赖**:
  - Supabase 表：`community_questions`、`content_tags`、`user_community_profiles`、`community_answers`。
- **后续**:
  - 点赞/采纳 UI 入口与调用（见协作待办）。

#### Step 2: 服务层准备 – 回答与互动（最小可用） [AgentB]
- **目标**: 回答列表、创建回答、点赞、采纳的服务层能力。
- **实现**:
  - 新增/完善 `src/services/communityAnswerService.js`
    - `fetchAnswers(questionId, { page, limit })`
    - `createAnswer(questionId, content, currentUserId)`
    - `upvoteAnswer(answerId, delta)`：优先 RPC `increment_answer_votes`；回退为读-改-写（已修正）。
    - `acceptAnswer(questionId, answerId, actingUserId)`：简化版，作者校验依赖后端策略。
- **影响面**:
  - 仅新增服务，不影响现有 UI；被详情页调用。
- **依赖**:
  - Supabase 表：`community_answers`（字段示例 `id, question_id, content, author_id, vote_score, is_accepted, created_at, updated_at`）。

#### Step 1: 切换问题列表至后端与发帖能力 [AgentB]
- **目标**: 将社区模块从本地模拟数据切换为真实后端数据；支持拉取问题列表与创建问题。
- **实现**:
  - 新增 `src/services/communityService.js`
    - `fetchQuestions({ subjectCode, page, limit, search, sort })`
    - `createQuestion({ title, content, subject_code, tags }, currentUserId)`
    - 字段映射：`views/replies/likes/isResolved/isPinned/author/tags`。
  - 修改 `src/components/Community/CommunityInterface.jsx`
    - 替换本地模拟为真实服务；保留前端“未回答/已解决”二次过滤；发帖成功后刷新列表。
- **影响面**:
  - 路由 `/community/:subjectCode` 使用真实数据源，不影响其他页面。
- **依赖**:
  - `.env.local` 需配置 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`。
  - 数据表：`community_questions`、`content_tags`、`user_community_profiles`。

---

## 协作待办（可并行）
- [AgentA] 点赞/取消点赞 UI（问题与回答）
  - API：`upvoteAnswer(answerId, +1/-1)`；问题点赞可扩展 `upvoteQuestion`（尚未实现）。
  - UI：在 `QuestionDetail.jsx` 与列表项上添加按钮与状态同步。
- [AgentA] 采纳回答 UI
  - 仅问题作者可见采纳按钮；调用 `acceptAnswer`；本地状态更新与样式高亮。
- [AgentA] 浏览量自增
  - 进入详情页触发问题 `view_count` 自增（建议 RPC `increment_question_views`）。
- [AgentB] 错误与空态细化
  - 将异常提示替换为非阻塞式 Toast；Skeleton 更精细化；分页加载回答。
- [AgentB] 权限与 RLS 校验
  - 服务端策略覆盖：仅作者可采纳、仅登录用户可发/评/赞；防刷票。

---

## AgentA 专区（预留）
- **近期计划（由 AgentA 填写）**
  - 计划 1：
  - 计划 2：
- **产出链接/文件（由 AgentA 填写）**
  - 例如：`src/components/Community/AnswerActions.jsx`
- **阻塞与需求（由 AgentA 填写）**
  - 需要的接口或数据结构变更：

---

## AgentB 专区（当前回合）
- 已完成：
  - 详情页与路由接入。
  - 按 ID 获取问题服务方法。
  - 点赞回退逻辑修正。
- 进行中：
  - 交互 UI 接入与空态细化。

---

## 数据与安全假设
- 表与视图
  - `community_questions`、`community_answers`、`content_tags`、`user_community_profiles`。
- RPC 建议
  - `increment_answer_votes(answer_id, delta)`
  - `increment_question_views(question_id)`
- RLS 策略
  - 登录可读；作者可写其内容；采纳仅限问题作者；点赞需限制频次与去重。

---

## 使用说明与路由
- 列表页：`/community/:subjectCode`
- 详情页：`/community/question/:questionId`
- 登录后可提交回答；点赞与采纳 UI 将在后续接入。

---

## 变更涉及的关键文件
- `src/pages/QuestionDetail.jsx`
- `src/App.jsx`
- `src/services/communityService.js`
- `src/services/communityAnswerService.js`
- （参考）`src/components/Community/CommunityInterface.jsx`
