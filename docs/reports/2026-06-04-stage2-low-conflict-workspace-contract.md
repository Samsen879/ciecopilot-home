# Stage 2 低冲突 Workspace Contract 执行记录

日期：2026-06-04

分支：`task/stage2-low-conflict-workspace-contract`

## 背景

前端正在高强度重构，因此本轮只做低冲突工作：`docs/reports/` 事实记录、backend-only workspace first-open contract、focused backend tests。不触碰当前高冲突前端入口和 runtime shell 文件。

明确避开的文件/范围：

- `src/pages/AskAI.jsx`
- `src/pages/StudyHub.jsx`
- `src/pages/LearningPath.jsx`
- `src/pages/legacy-entry-mode.js`
- `src/pages/learning-runtime/*`
- `src/components/learning-runtime/*`
- `src/App.jsx`
- `src/components/ChatWidget*`
- `src/components/SelectionListener*`

## Repo Truth

本轮只读核查确认：

- `src/pages/legacy-entry-mode.js` 仍有 `topic-trig-equations` / `topic-trig-identities` 入口常量；本轮未改，留给前端重构稳定后的 Spark-01。
- `api/learning/workspaces/[topicId].js` 原本只有 `GET`；`getWorkspaceView` 在 projection 缺失时返回 `workspace_not_found`。
- `api/learning/lib/repositories/workspace-repository.js` 已有 `ensureWorkspaceExists`，可复用为显式 first-open contract。
- `api/learning/sessions/[id]/ask.js` 已从持久 session 读上下文再调用 session-bound AskAI/RAG；本轮未改 AskAI。
- `package.json` 当前没有 `workflow:codex-preflight`，因此按工作流缺口记录，不作为内容 blocker。

## Implemented Contract

新增低冲突 backend contract：

`POST /api/learning/workspaces/:topicId`

请求体必须显式命名 action：

```json
{
  "action": "ensure",
  "topic_path": "9709.integration.repair"
}
```

行为：

- `GET /api/learning/workspaces/:topicId` 继续保持只读，不静默创建 workspace。
- `POST` 只有在 `action === "ensure"` 时执行 first-open ensure。
- ensure 前先用 `curriculum_nodes.node_id` 校验 `topicId`。
- 如果请求提供 `topic_path`，必须匹配 canonical `curriculum_nodes.topic_path`。
- 校验通过后调用既有 `ensureWorkspaceExists`。
- ensure 后复用 `getWorkspaceView` 返回 backend projection，不在客户端伪造 workspace/read model。

涉及文件：

- `api/learning/workspaces/[topicId].js`
- `api/learning/lib/workspaces/workspace-read-service.js`
- `api/learning/__tests__/workspace-read-service.test.js`

## Verification

TDD red run:

```bash
npm test -- --runInBand --runTestsByPath api/learning/__tests__/workspace-read-service.test.js --verbose
```

结果：失败，新增 `POST /api/learning/workspaces/:topicId explicitly ensures first-open workspace projection` 用例收到 `405`，确认测试覆盖缺失 contract。

Green run:

```bash
npm test -- --runInBand --runTestsByPath api/learning/__tests__/workspace-read-service.test.js --verbose
```

结果：通过，`16 passed / 16 total`。

## Remaining Stage 2 Boundaries

本轮没有完成 Spark-01，因为前端入口仍在重构中，且 fake topic 常量仍在 legacy shell / launch draft 链路里。

本轮没有完成 Spark-03 以后工作，未改 session launch、AskAI copy、Phase1 scoring bridge、legacy demolition、global ChatWidget gating。

下一步低冲突候选：

1. 增加 backend-only runtime entrypoint resolver endpoint/tests，用 `curriculum_nodes` 输出真实 topic IDs 和 canonical paths，先不接前端。
2. 增加 workspace ensure 的错误契约测试：missing action、missing topic、topic_path mismatch。
3. 等前端重构稳定后，再把 legacy shells 从 hardcoded topics 接到 resolver。
