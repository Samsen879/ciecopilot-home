# Local Branch Closeout Classification

日期：2026-03-30  
执行分支：`closeout/mainline-recovery-20260330`  
被收口旧分支：`runtime-post-pilot-0323-2239`

## 目的

把旧本地分支里的独有内容从“可能有用”变成“有明确处理结论”。

本表只回答五个问题：

1. 这条内容是什么
2. `main` 里有没有等价或更新版本
3. 要不要回灌到新的 `main` 基线分支
4. 如果不回灌，是归档还是放弃
5. 后续动作是什么

## 当前安全状态

- 已创建只读备份分支：`archive/runtime-post-pilot-0323-2239-pre-closeout-20260330`
- 已创建 WIP 归档分支：`archive/runtime-post-pilot-0323-2239-wip-20260330`
- WIP 归档提交：`e3d6914` `chore(archive): snapshot pre-closeout local WIP`
- 已创建新的 `main` 基线 worktree：`.worktrees/closeout-mainline-recovery-20260330`
- 新基线与 `origin/main` 分叉为 `0 0`

## 分类总表

| 项目 | 主题 | 初步结论 | 是否回灌 | 理由 | 后续动作 |
| --- | --- | --- | --- | --- | --- |
| `e32cba9` | AO runtime reconciliation 加固 | 只保留归档 | 否 | `git cherry` 显示已被 `main` 等价覆盖 | 不回灌，只在审计时保留引用 |
| `a58ec62` | AO idle prompt 重复修复 | 只保留归档 | 否 | `git cherry` 显示已被 `main` 等价覆盖 | 不回灌，只在审计时保留引用 |
| `2146615` | AO + learning runtime 混合 WIP 快照 | 只保留归档 | 否 | 改动面过大、主题混合、包含后续主线已演化内容 | 禁止整包回放，只作为历史证据 |
| `943685e` | mainline convergence 文档与设计 | 只保留归档 | 否 | 主线已通过 PR `#86` 合并更晚版本的同主题内容 | 不回灌，必要时只做文档对照 |
| `3c1b655` | `.worktrees/` 忽略规则 | 回灌候选 | 是，优先级低 | 主线当前 `.gitignore` 还没有 `.worktrees/`，而本次执行确实使用了该目录 | 建议单独小补丁回灌 |
| `e3d6914` | AO phase-4 / control-plane / docs 扩展 WIP 归档 | 只保留归档 | 否，当前轮次不做 | 这不是“旧分支收口小修复”，而是下一阶段新开发 | 先冻结，后续单独拆任务 |

## 逐项说明

### `e32cba9` `chore(ao): harden runtime reconciliation flow`

范围：

- `.agent-rules.md`
- `agent-orchestrator.yaml`
- `package.json`
- `scripts/ao/start-clean.sh`

判断：

- `git cherry origin/main runtime-post-pilot-0323-2239` 对这条提交返回 `-`
- 这代表主线里已经存在等价 patch
- 虽然提交 SHA 不同，但工程上可以视为“已被主线覆盖”

结论：

- 不回灌
- 只保留归档记录

### `a58ec62` `fix(ao): stop repeating idle prompts`

范围：

- `agent-orchestrator.yaml`

判断：

- `git cherry` 对这条提交也返回 `-`
- 说明主线已有等价修复

结论：

- 不回灌
- 只保留归档记录

### `2146615` `WIP: snapshot AO and learning runtime progress`

范围特征：

- 同时改了 AO CLI、AO 测试、AO runbook、learning runtime idempotency、session/import/repository 等大量文件
- 总体是“混合快照”，不是单一主题提交

判断：

- 这类提交最大的风险不是“没价值”，而是“价值和已过时内容混在一起”
- 当前主线已经吸收了其中一部分主题，另一部分又继续向后演化
- 如果整包回放，很容易把主线较新的产品和 AO 状态弄乱

结论：

- 禁止整包回灌
- 只保留归档
- 以后如果要取用，只能按小块重新挑

### `943685e` `docs: add mainline convergence recovery design and plan`

范围：

- `docs/reports/ao_codex_work_dossier_2026-03-26.md`
- `docs/superpowers/plans/2026-03-27-mainline-convergence-ao-idempotency.md`
- `docs/superpowers/specs/2026-03-27-mainline-convergence-ao-idempotency-design.md`
- `docs/reports/INDEX.md`

判断：

- 这条 patch 在 `git cherry` 里仍显示为主线未完全等价覆盖
- 但从 GitHub 历史看，主线已经通过 PR `#86` 合并了同主题的更晚版本
- 所以从“是否需要把旧分支内容重新送回主线”的角度，它已经不需要再回灌

结论：

- 不回灌
- 只保留归档和审计价值

### `3c1b655` `chore: ignore local git worktrees`

范围：

- `.gitignore` 新增一行：`.worktrees/`

判断：

- `git cherry` 返回 `+`，说明主线里没有等价 patch
- 当前主线 `.gitignore` 的确还缺 `.worktrees/`
- 本次收口执行已经用到了 `.worktrees/` 目录，这条规则有现实价值

结论：

- 保留为小范围回灌候选
- 建议单独提交，避免和其他历史包袱混在一起

### `e3d6914` `chore(archive): snapshot pre-closeout local WIP`

范围特征：

- 主要是 AO phase-4 / control-plane / assist-mode / state / manage / controller 相关工作
- 同时包含一些报告、runbook、计划、测试、脚本

判断：

- 这批内容说明“旧分支之后还继续发展出一套新 WIP”
- 但它属于新开发，不属于“修复旧分支和主线的历史分叉”
- 如果现在把它纳入收口，会把“清理历史”变成“顺便推进下一阶段开发”

结论：

- 本轮不回灌
- 只归档
- 后续要单独拆成新的正式任务，再决定是否基于 `main` 重做

## 本轮推荐执行顺序

1. 维持 `runtime-post-pilot-0323-2239` 为只读历史分支，不再继续开发。
2. 不处理 `e32cba9`、`a58ec62`、`2146615`、`943685e` 的回灌。
3. 单独回灌 `3c1b655` 这一条 `.gitignore` 小补丁。
4. 把 `e3d6914` 视为下一阶段候选素材，而不是本轮收口内容。

## 当前建议

如果按最低风险原则执行，当前最合理的收口动作只有一个：

- 在新的 `main` 基线分支上，单独补 `.gitignore` 里的 `.worktrees/`

其余历史内容全部归档，不在本轮继续带入主线。
