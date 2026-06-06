# AO Heavy Delivery Report: Paper Workspace / Review Runtime Backend Convergence (#355)

报告日期：2026-06-06
范围：GitHub epic #355 及子 issue #356-#364
性质：AO heavy delivery 归档报告；文档/报告-only，不改变代码、测试、运行时、前端、数据或 AO control-plane 脚本。

## 执行摘要

GitHub epic #355 是一次重型 AO 多 issue 交付链，目标是在 Paper Workspace / Review Runtime 的后台契约层完成收敛，同时保持 backend-only、additive、topic compatibility 的迁移姿态。该链路现在已完成：父 epic #355 已关闭，子 issue #356-#364 已全部关闭，主线交付已通过 PR #381 和 PR #383 落到 `main`。

本报告只归档 #355 链路本身。它不声明任何前端迁移完成，不进入 9231 或 9709 内容生产范围，也不把无关的打开 PR 计入 #355 完成面。

## 范围与边界

纳入范围：

- 父 epic：#355 `[Paper Workspace] Backend/review runtime convergence epic`
- 子 issue：#356, #357, #358, #359, #360, #361, #362, #363, #364
- 后台契约和兼容性收敛：Paper Workspace API contract、paper-scoped persistence、topic-section projection、paper-first repository/read service、review projection、ReviewTask completion evidence、backend-only rollout gate
- 约束：backend-only、additive migration、topic compatibility preserved、global review queue projection 不复制为 paper-local/topic-local queue

明确不纳入范围：

- 不做前端 Paper Workspace adapter/UI 迁移
- 不做 9231 题库/text/evidence 层工作
- 不做 9709 内容生产、VLM、crop、authority 或 release-gate 扩展
- 不关闭、不评价、不合并 #355 以外的无关 PR

## 为什么这是 heavy delivery

这不是单 PR 的普通修补，而是一个 parent epic 加 9 个 child issues 的串并行后台交付链：

- 依赖顺序严格：#356 先给出 PRD-to-code gap map，后续 #361/#362/#357/#364/#359/#358/#360/#363 按契约依赖推进。
- PR 之间存在 stacked/dependency 关系：#363 的 rollout gate 最初堆叠在 #360 completion-evidence 分支之上。
- AO worker ownership 需要持续维护：多个 worker 分别拥有子 issue，且交付过程中需要 ready-held、review-held、closeout 和 human-merge gate 的状态切换。
- CI 和 review backlog 必须逐项收敛：每个关键 PR 需要 GitHub checks、mergeability、pending review comments 与 AO review gate 同时对齐。
- 最后还需要 parent epic closeout：子 issue 全闭合后，#355 才能被关闭。

## Issue 完成表

| Issue | 标题 | 最终状态 | 关闭时间 |
|---:|---|---|---|
| #355 | `[Paper Workspace] Backend/review runtime convergence epic` | CLOSED | 2026-06-06T03:32:15Z |
| #356 | `[Paper Workspace] Map PRD-to-code backend convergence gaps` | CLOSED | 2026-06-05T04:26:10Z |
| #357 | `[Paper Workspace] Introduce paper workspace API contract with topic compatibility` | CLOSED | 2026-06-05T10:43:56Z |
| #358 | `[Review Runtime] Implement paper-filtered and topic-filtered review projections` | CLOSED | 2026-06-05T13:47:34Z |
| #359 | `[Paper Workspace] Add backend entry resolver for paper workspace and topic section focus` | CLOSED | 2026-06-05T12:13:44Z |
| #360 | `[Review Runtime] Harden ReviewTask completion evidence contracts` | CLOSED | 2026-06-06T03:15:11Z |
| #361 | `[Paper Workspace] Add paper-scoped workspace persistence contract` | CLOSED | 2026-06-05T07:25:56Z |
| #362 | `[Paper Workspace] Add paper workspace read models and topic-section projections` | CLOSED | 2026-06-05T10:06:21Z |
| #363 | `[Paper Workspace] Add backend-only rollout gate and compatibility report` | CLOSED | 2026-06-06T03:29:37Z |
| #364 | `[Paper Workspace] Refactor workspace repository and read service to paper-first` | CLOSED | 2026-06-05T11:04:13Z |

## PR 链路表

| PR | 标题 | Base | Head branch | Head SHA | Merge 结果 |
|---:|---|---|---|---|---|
| #381 | `[Review Runtime] Harden ReviewTask completion evidence (#360)` | `main` | `task/360-review-completion-evidence` | `6ca5345c2baee8ea637593ab5d66f3274c7744f4` | merged to `main` at 2026-06-06T03:15:10Z |
| #382 | `[Paper Workspace] Add backend-only rollout gate (#363)` | `task/360-review-completion-evidence` | `task/363-backend-only-rollout-gate` | `c52b059361bde3a0920c4b76d6af90566dd4404b` | merged at 2026-06-06T03:15:20Z into dependency branch only; superseded by #383 for mainline delivery |
| #383 | `[Paper Workspace] Add backend-only rollout gate (#363)` | `main` | `task/363-backend-only-rollout-gate` | `c52b059361bde3a0920c4b76d6af90566dd4404b` | merged to `main` at 2026-06-06T03:29:36Z |

## Incident / Recovery

#382 在 GitHub 上显示为 merged，但它的 base 是 `task/360-review-completion-evidence`，因此合并目标只是 dependency branch，不是 `main`。这造成 #363 在主线交付角度仍未闭合：#363 的最终 backend-only rollout gate 内容没有通过 #382 进入主线，issue #363 也保持打开。

恢复方式是创建替代主线 PR #383：同一个 `task/363-backend-only-rollout-gate` head branch、同一个 `c52b059361bde3a0920c4b76d6af90566dd4404b` head SHA，改以 `main` 为 base。#383 于 2026-06-06T03:29:36Z 合入 `main`，随后 #363 于 2026-06-06T03:29:37Z 关闭。由此，#382 的 dependency-branch merge 问题被 #383 完整补救。

## AO Review Gate

- #360 / PR #381：AO review passed，target SHA 为 `6ca5345c2baee8ea637593ab5d66f3274c7744f4`；review freeze 已释放，进入 ready-held/human-merge posture 后由人工合并。
- #363 / PR #383：AO review passed，target SHA 为 `c52b059361bde3a0920c4b76d6af90566dd4404b`；review freeze 已释放，#382 dependency-branch 误合并后通过 #383 重新落入主线。

本次归档复核也确认 AO archive 中 #360 session 记录为 `status=merged`、PR #381，summary 包含 `AO review passed`；#363 session 记录为 `status=merged`、PR #383，summary 包含 `AO review passed exact SHA` 和 `no review backlog`。

## 最终验证证据

- root `main` 和 `origin/main` 在最终审计时均指向 `4f9c64622058ae1176d8da42de4baba4e0d7405f`。
- 本报告工作分支已 fast-forward 到 `origin/main @ 4f9c64622058ae1176d8da42de4baba4e0d7405f` 后再写入文档，避免基于 stale `baseline/origin-main` 归档。
- `ao review-check ciecopilot-home --dry-run` 输出 `No pending review comments found.`。
- `git worktree list --porcelain` 不再列出 #360/#363 task worktree；AO archive 中对应 session 已归档为 merged。
- GitHub live issue state 显示 #355 和 #356-#364 均为 CLOSED，关闭时间见上表。

## 无关打开 PR

最终审计时仍观察到以下打开 PR，但它们不属于 #355 交付范围，不能被本报告视为已解决或已审完：

| PR | 标题 | Head | Base |
|---:|---|---|---|
| #306 | `feat(9709): productionize screenshot evidence and classifier pipeline` | `codex/9709-production-classifier` | `main` |
| #285 | `Fix 9709 surface triage rerun pipeline` | `codex/9709-surface-triage-rerun` | `main` |
| #281 | `chore: add codex workspace preflight` | `codex/codex-workflow-guardrails` | `main` |

## 结论

Epic #355 已完成：9 个子 issue 全部关闭，#360 和 #363 的关键 AO review gates 均通过，最终主线状态由 #381 和 #383 落到 `main`。#382 的 dependency-branch merge 问题已经通过 #383 完整修复；它不再阻塞 #363 或 parent epic #355 的完成判定。
