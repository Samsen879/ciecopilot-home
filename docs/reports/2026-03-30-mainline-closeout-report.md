# Mainline Closeout Report

日期：2026-03-30  
执行分支：`closeout/mainline-recovery-20260330`

## 这次已经完成了什么

这次收口先完成了最重要的第一阶段：把旧本地分支从“有历史分叉、还有未提交工作”变成“已安全归档、已建立新主线基线、已完成分类判断”。

已经完成的动作：

- 记录了当前旧分支与 `origin/main` 的分叉现状：`63 5`
- 创建了只读备份分支：`archive/runtime-post-pilot-0323-2239-pre-closeout-20260330`
- 创建了 WIP 归档分支：`archive/runtime-post-pilot-0323-2239-wip-20260330`
- 把原工作区未提交内容归档成提交：`e3d6914`
- 新建了基于 `origin/main` 的隔离 worktree：`.worktrees/closeout-mainline-recovery-20260330`
- 在新基线 worktree 中确认与 `origin/main` 分叉为 `0 0`
- 复用依赖并跑通主线基线测试
- 写出了本地分支独有内容的正式分类表
- 在新主线基线中补上 `.worktrees/` 的 `.gitignore` 小补丁

## 已验证结果

在新的 `main` 基线 worktree 中，以下基线测试通过：

```bash
npm test -- --runInBand src/pages/__tests__/legacy-entry-mode.test.js src/api/__tests__/learningRuntimeApi.test.js src/components/learning-runtime/__tests__/LearningSessionShell.test.js src/components/learning-runtime/__tests__/WorkspaceShell.test.js src/components/learning-runtime/__tests__/view-models.test.js
```

结果：

- `5` 个测试套件通过
- `48` 个测试通过

同时：

- `git diff --check` 通过
- 当前新基线 worktree 中只有两项待处理改动：
  - `.gitignore` 的 `.worktrees/` 忽略规则
  - `docs/reports/2026-03-30-local-branch-closeout-classification.md`

## 当前结论

### 1. 旧本地分支已经不再是安全开发基线

`runtime-post-pilot-0323-2239` 现在应该被视为：

- 历史分支
- 审计分支
- 取证分支

而不应该再被视为后续新功能开发的默认工作区。

### 2. 绝大多数旧分支独有提交不应该回灌

当前分类结论是：

- `e32cba9`：主线已等价覆盖
- `a58ec62`：主线已等价覆盖
- `2146615`：混合 WIP，禁止整包回放
- `943685e`：同主题内容已被主线更晚版本覆盖

真正建议回灌的，只有：

- `3c1b655` 对应的 `.worktrees/` 忽略规则

### 3. 当前归档 WIP 不属于这轮“收口小修复”

`e3d6914` 说明旧分支之后又继续长出了一批 AO phase-4 / control-plane 相关新工作。  
这批内容应该在未来单独拆题、单独评估，而不是借这次收口顺手混进主线。

## 本轮新增文档

- [2026-03-30-local-branch-closeout-classification.md](/home/samsen/code/ciecopilot-home/.worktrees/closeout-mainline-recovery-20260330/docs/reports/2026-03-30-local-branch-closeout-classification.md)
- [2026-03-30-mainline-closeout-report.md](/home/samsen/code/ciecopilot-home/.worktrees/closeout-mainline-recovery-20260330/docs/reports/2026-03-30-mainline-closeout-report.md)

## 建议的下一步

如果继续按低风险方式推进，下一步顺序应该是：

1. 把本次 worktree 中的 `.gitignore` 小补丁和分类/收口报告整理成一个小提交
2. 把 `runtime-post-pilot-0323-2239` 正式标记为只读历史分支
3. 后续所有新任务统一从最新 `origin/main` 新开短分支
4. 对 `e3d6914` 这批归档 WIP 单独做一次“是否要拆题重做”的评审

## 还没有做的事

以下动作仍未执行：

- 没有删除任何旧分支
- 没有把任何大块 AO phase-4 WIP 带入主线
- 没有提交当前新基线 worktree 里的 `.gitignore` 和收口文档
- 没有发 PR

这些动作都可以在后续单独决定，不影响当前“收口第一阶段已安全完成”这个事实。
