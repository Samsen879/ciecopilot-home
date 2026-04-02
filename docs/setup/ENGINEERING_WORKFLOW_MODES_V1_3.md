# 工程工作模式 v1.3

v1.3 只解决一个问题：

不是每个任务都值得开一套 `branch + worktree + PR`，但也不能因为图省事，又回到目录变脏、基线混乱、谁都不知道改动从哪来的状态。

所以这个项目现在固定两档模式。

## 1. formal

这是默认模式。

适用范围：

- 所有代码改动
- 所有配置改动
- 所有测试改动
- 所有治理、runbook、默认行为相关文档改动
- 任何文件范围不清、任务意图不清、风险不好判断的任务

走法不变：

1. 在干净 baseline worktree 上 `npm run workflow:baseline:sync`
2. `npm run workflow:task:create -- --id <id> --slug <slug>`
3. 在 task worktree 中开发
4. 提 PR
5. 人工决定是否 merge
6. merge 后 closeout

## 2. light-direct-minimal

这是一个极窄例外，不是第二套大流程。

它只解决一种场景：

**人在本地和 Codex 一起做超小的结论性文档补充，不想为了一份状态说明或复盘报告，再开一整套 task worktree + PR。**

v1.3 先只允许这一个白名单：

- `docs/reports/**`

并且同时满足下面三条：

- 只是报告、复盘、状态记录、结论说明
- 不改变代码、配置、测试、脚本、运行行为
- 不改变治理规则、runbook、默认工作方式

只要有一条不满足，就直接升级回 `formal`。

## Codex 怎么自动判断

默认判断顺序如下：

1. 如果人明确要求走更严格流程，直接走 `formal`
2. 如果任务或实际改动全部落在 `docs/reports/**`，先视为 `light-direct-minimal` 候选
3. 只要碰到下面任一类内容，立即升级 `formal`

- `docs/setup/**`
- `.agent-rules.md`
- `agent-orchestrator.yaml`
- `.gitignore`
- `package.json`
- `scripts/**`
- `.github/**`
- `tests/**`
- `src/**`
- `api/**`
- `supabase/**`
- 任何会改变默认行为、治理方式、运行方式的文档

4. 如果文件范围不完整、任务描述模糊、无法确认风险，也直接走 `formal`
5. 如果 git hook 已经拦住，说明超出轻量档边界，不再强顶，直接改走 `formal`

一句话版：

**只有 `docs/reports/**` 这类超小结论文档能走轻量档；模糊情况一律升级 formal。**

## AO 和本地 Codex 的边界

这点必须说清楚：

- 本地 Codex 会话：可以按上面的规则自动判断
- AO 自主 worker：默认只走 `formal`

原因很简单：

- `formal` 有 PR 和人工 merge 边界
- `light-direct-minimal` 是直入主线例外，不应该默认交给 AO 自主 worker

所以 v1.3 的落点是：

- 让本地 Codex 小文档任务更轻
- 让 AO 默认继续按 formal 跑
- 不把“AI 自动 merge”重新放开

## 两档模式怎么启动

### formal

```bash
cd /home/samsen/code/ciecopilot-home/.worktrees/baseline-origin-main-20260402
npm run workflow:baseline:sync
npm run workflow:task:create -- --id <id> --slug <slug>
```

### light-direct-minimal

不新增专门命令，直接在干净 baseline worktree 里开始：

```bash
cd /home/samsen/code/ciecopilot-home/.worktrees/baseline-origin-main-20260402
npm run workflow:baseline:sync
```

然后：

1. 只修改 `docs/reports/**`
2. 正常 `git add` / `git commit`
3. 需要直推主线时，依赖本地 hook 自动判定是否放行
4. 如果 hook 阻止，就不要绕过，直接升级 `formal`

## 为什么不再放宽

这次没有把轻量档放宽到 `docs/setup/**`、`README`、脚本或治理文件，原因不是保守，而是这些内容一旦写错，会直接影响后续 AO / Codex 的默认行为。

所以 v1.3 先只做一件事：

**把 `docs/reports/**` 这类低风险结论性文档，变成一个真正能执行的轻量例外。**
