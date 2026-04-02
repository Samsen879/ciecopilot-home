# 工程治理 v1

## 为什么现在先治理流程，不先继续堆功能

这次先做流程治理，不是因为功能不重要，而是因为当前仓库已经出现了几个会持续放大的工程问题：

- 本地工作区容易变脏，导致谁都不确定哪些改动是本轮任务、哪些是历史残留。
- 本地 `main`、baseline、当前目录三者容易混淆，开发起点不稳定。
- AO / AI 已经能持续推进开发，但缺少统一边界，容易出现“能做很多事，但没人知道该在哪个目录、哪条分支、哪个 PR 上做”。
- PR merge 后如果不及时收口，分支、worktree、截图、报告、输出文件会越积越多。

PR #141 已经证明当前学习主链路已恢复可用。现在更急的是把“后续怎么继续开发”固定下来，让后面的每一轮功能开发都站在稳定基线上进行。

## 本项目当前基线

本文件基于 2026-04-02 的仓库现状。

- 旧根工作区：`/home/samsen/code/ciecopilot-home`
- 旧根工作区当前分支：`baseline/origin-main-20260330`
- 旧根工作区现状：有未提交改动和未跟踪文件，暂时保留，但不作为新任务默认开发目录
- 当前推荐干净基线 worktree：`/home/samsen/code/ciecopilot-home/.worktrees/baseline-origin-main-20260402`
- 当前推荐干净基线分支：`baseline/origin-main-20260402`
- 当前推荐干净基线 HEAD：`f50a944a6f430eb1e5198d4777fae9986957cd2f`

v1 的目标不是顺手清空历史问题，而是从这个干净基线开始，把后续开发流程固定下来。

## 四个核心概念

### 1. baseline

baseline 是本地长期保留的一份干净基线工作区，用来代表“当前可继续开工的安全起点”。

在 `ciecopilot-home` 里，baseline 不是拿来堆日常开发改动的，而是拿来：

- 对齐最新 `origin/main`
- 作为新任务开 branch 和 worktree 的起点
- 在 merge 之后重新确认主线状态

### 2. task worktree

task worktree 是某一个具体任务的独立工作目录。

一个任务一个 worktree，目的是把这轮任务和别的任务、历史残留、旧目录彻底隔开。这样可以减少脏工作区、误提交和基线混淆。

### 3. PR

PR 是所有进入 `main` 的正式入口。

对这个项目来说，PR 不只是审代码，还承担三件事：

- 让人能看清这轮任务范围
- 让 AO / AI 的检查结果有一个固定挂载点
- 让 merge 和 closeout 有明确收口对象

### 4. closeout

closeout 就是“合并后的收尾动作”。

它至少包括：

- 删除或关闭本轮任务分支
- 移除本轮 task worktree
- 清掉不该留在 git 里的临时产物
- 把需要保留的结论整理进正式文档
- 回到干净 baseline，准备下一轮任务

如果没有 closeout，仓库会越来越乱，后面每一轮开发都要先花时间分辨“哪些东西还活着”。

## 以后默认怎么开发

从 v1 开始，默认开发路径固定为：

1. 从干净 baseline 起步
2. 为任务新建独立 branch + worktree
3. 在 task worktree 中开发、验证、整理必要文档
4. 通过 PR 提交变更
5. 由人决定是否 merge
6. merge 后立即做 closeout

一句话版本：

**不在本地 `main` 开发，不在脏根目录继续叠任务，不把 merge 当成结束。**

v1.3 补充后，这句话仍然成立。

区别只是：

- 默认仍然走 `formal`
- 只有 `docs/reports/**` 这类超小结论文档，才允许走极窄的 `light-direct-minimal`

详细规则见：

- [ENGINEERING_WORKFLOW_MODES_V1_3.md](/home/samsen/code/ciecopilot-home/docs/setup/ENGINEERING_WORKFLOW_MODES_V1_3.md)

## 硬规则

以下规则是 v1 的硬规则，默认不例外：

- 不在本地 `main` 直接开发，也不在本地 `main` 上直接提交。
- 仓库必须长期保留一个干净 baseline worktree。当前默认基线是 `baseline/origin-main-20260402` 对应的 worktree。
- 每个任务必须单独使用一个 branch 和一个 worktree。默认放在 `.worktrees/` 下。
- 默认所有要进入 `main` 的改动都走 PR。只有 `light-direct-minimal` 白名单文档是例外，规则见 v1.3。
- AO / AI 可以写代码、写文档、跑验证、开 PR，但 formal 流程里的 merge 仍由人执行；`light-direct-minimal` 不给 AO 自主 worker 默认直入主线权限。
- PR 请求人工 merge 之前，至少要有本轮相关验证结果，并执行 PR 维度的 `ao:reconcile` 严格模式。
- 如果存在本地连续性风险、目录变脏风险、分支对不上等问题，要补跑 `ao:doctor`。
- 如果需要判断“现在该继续 agent、交接还是通知人来处理”，要跑 `ao:lifecycle`，但它仍然不拥有 merge 权限。
- merge 后必须做 closeout。默认要求在同一工作轮次内完成，最晚不要拖到下一次新任务启动之后。
- 涉及高风险区域的改动必须人工明确批准。至少包括：`.github/workflows/`、`.github/actions/`、`infra/`、`terraform/`、`pulumi/`、`.env*`、密钥类文件。

## 软规则

以下是 v1 的软规则，建议遵守，但不做过度制度化：

- 小任务只要写 very short brief 即可，不强制每个任务都写完整 spec。最低要求是写清楚目标、完成标准、非目标。
- AO 控制面的高级动作先不全部强制。`reconcile / doctor / lifecycle` 是固定门禁，其他能力按需要使用。
- branch 命名默认用 `task/<id>-<slug>`。如果是明显的 bugfix 或文档任务，可用 `fix/`、`docs/`，但不要一仓库多套随意命名。
- worktree 命名默认用 `.worktrees/task-<id>--<slug>`，保持一眼可读。
- closeout 不做分钟级 SLA，不要求机械化计时；但原则是“本轮 merge 不收口，就不要开下一轮新任务”。
- 旧根工作区当前只用于观察、取证、补充历史信息；不要在里面继续做新的默认开发。

## v1.1 本地防呆补充

为减少误操作，仓库补充一层本地 hook 防呆：

- `pre-commit`：阻止在 `main`、`master`、`baseline/*` 上直接 commit
- `pre-push`：阻止把内容直接 push 到受保护分支
- `pre-push`：阻止脏 worktree 继续 push

安装与例外说明见：

- [ENGINEERING_LOCAL_GUARDRAILS_V1_1.md](/home/samsen/code/ciecopilot-home/.worktrees/baseline-origin-main-20260402/docs/setup/ENGINEERING_LOCAL_GUARDRAILS_V1_1.md)

## v1.2 流程自动化补充

为减少重复手工命令，仓库补充了 workflow 命令入口：

- `workflow:baseline:sync`
- `workflow:task:create`
- `workflow:task:closeout`

使用说明见：

- [ENGINEERING_WORKFLOW_AUTOMATION_V1_2.md](/home/samsen/code/ciecopilot-home/.worktrees/baseline-origin-main-20260402/docs/setup/ENGINEERING_WORKFLOW_AUTOMATION_V1_2.md)
- [ENGINEERING_WORKFLOW_MODES_V1_3.md](/home/samsen/code/ciecopilot-home/docs/setup/ENGINEERING_WORKFLOW_MODES_V1_3.md)

## 标准开发 SOP

详细步骤见：

- [ENGINEERING_TASK_WORKFLOW_SOP.md](/home/samsen/code/ciecopilot-home/.worktrees/baseline-origin-main-20260402/docs/setup/ENGINEERING_TASK_WORKFLOW_SOP.md)
- [ENGINEERING_WORKFLOW_MODES_V1_3.md](/home/samsen/code/ciecopilot-home/docs/setup/ENGINEERING_WORKFLOW_MODES_V1_3.md)

高层 SOP 只有 7 步：

1. 在干净 baseline 上确认起点
2. 新建任务 branch + worktree
3. 写 very short brief
4. 在 task worktree 中完成开发与验证
5. 提 PR，并补齐本轮验证信息
6. 人工审核并决定是否 merge
7. merge 后按 closeout checklist 收口

## PR、merge、closeout 的最低要求

### PR 最低要求

- 一个 PR 只解决一个明确任务，不混入顺手补的大块无关改动。
- PR 描述里至少写清楚：改了什么、怎么验证、有没有遗留风险。
- 如果触及高风险区域，PR 描述里必须显式标出。
- 如果是小任务，very short brief 可以直接写在 PR 描述里，不要求额外再开长文档。

### merge 最低要求

- PR 不是 draft。
- 本轮相关验证已完成，并且结果可追溯。
- PR 维度 `ao:reconcile` 严格模式没有给出阻断性结论。
- 如存在本地连续性风险，`ao:doctor` 已跑过并处理完。
- 需要 release/route 判断时，`ao:lifecycle` 已给出可解释结论。
- 最终 merge 由人执行，不由 AO / AI 代替。

推荐的最低命令：

```bash
npm run ao:reconcile:strict:pr -- <pr号>
npm run ao:doctor:strict:pr -- <pr号>
npm run ao:lifecycle:strict:pr -- <pr号> --trigger approved_and_green
```

说明：

- `ao:doctor` 不是每个 PR 都必跑，但只要出现 worktree 脏、分支对不上、上下游不清楚、AO 残留产物等问题，就应补跑。
- `ao:lifecycle` 不是 merge 批准器，它只是帮助判断“现在该继续自动推进，还是该交给人”。

### closeout 最低要求

closeout 不是可选项。merge 后至少要做到：

- 远端任务分支删除，或确认仓库已开启 merge 后自动删分支
- 本地任务 worktree 删除
- 本地任务分支删除
- 临时产物收进 `runs/` 或直接清理，不混进正式 PR
- 需要长期保留的结论整理成 `docs/reports/` 文档
- baseline 同步到最新 `origin/main`

执行时直接看：

- [ENGINEERING_CLOSEOUT_CHECKLIST.md](/home/samsen/code/ciecopilot-home/.worktrees/baseline-origin-main-20260402/docs/setup/ENGINEERING_CLOSEOUT_CHECKLIST.md)

补充说明：

- `formal` 走 merge + closeout
- `light-direct-minimal` 不开 task worktree，也没有 PR closeout；但结束前必须把 baseline worktree 恢复到干净、已对齐主线的状态

## AI artifact 最小治理规则

v1 只分三类，不做复杂评级。

### 1. 正式入库

可以进入 git 的内容：

- 源码
- 必要配置
- 迁移脚本
- 最终保留的治理文档、runbook、报告
- `docs/reports/` 下的正式结论性文档

判断标准很简单：

**别人需要靠它理解这次变更、复盘这次决策、继续这条主线时，它才应该正式入库。**

### 2. 临时证据

默认放在 `runs/`。

适用内容：

- 临时日志
- 本地验证输出
- 中间 JSON
- 一次性调试证据
- 机器生成但还没被整理的原始结果

v1 规则：

- 新的临时证据默认不作为 PR 正式交付物。
- 如果人真的需要长期保留，应先整理成 `docs/reports/` 的结论性文档，而不是把整包原始输出直接并进主线。
- 仓库里已经存在的历史 `runs/**` 已跟踪内容，不在这次 v1 顺手清理范围内；后续按 v1.1 单独处理。

### 3. 大文件 / 截图

默认不进 git。

适用内容：

- 大量截图
- 视频
- 大型导出文件
- 批量生成 artifact

v1 规则：

- 默认本地保留或外部归档。
- 只有在确实需要作为正式证据时，才由人决定是否保留，并尽量只保留最小必要样本。
- 不把截图和大文件当作日常 PR 附件直接塞进仓库。

### AO 本地产物补充规则

以下内容默认视为本地残留，不应进入正式提交：

- `ao-artifacts/`
- `ao-task-state.json`

## 例外处理

### 紧急修复

紧急不等于可以跳过治理。

可以简化的是：

- brief 可以更短
- PR 描述可以更直接
- closeout 可以更快执行

不能跳过的是：

- 从 baseline 起步
- 使用独立 branch + worktree
- 走 PR
- 人工 merge

### AO 命令临时不可用

如果 `ao:reconcile`、`ao:doctor`、`ao:lifecycle` 某一步临时不可用：

- 先以 GitHub 上的 PR、review、CI 状态作为外部真相
- 在 PR 描述或备注里写清楚哪一步没跑、为什么没跑
- 不把“AO 命令没跑”伪装成“已经通过门禁”

### 需要暂时保留 task worktree

如果 merge 后还要保留 task worktree 做补证、复盘或审计：

- 要写明保留原因
- 要写明下一步何时删除
- 不能无说明地长期挂着

### 旧脏工作区

旧根工作区目前不是 v1 的治理对象。

处理原则：

- 不 reset
- 不覆盖
- 不清空
- 不继续把它当默认开发区

如果未来要处理它，应单独开“closeout / archive / recovery”任务，不与功能开发混做。

## 这次没有机械照搬 deep research 的部分

以下建议方向是对的，但 v1 不直接按重制度方式落地：

- 没有把“merge 后 15 分钟内必须收口”写成硬性分钟 SLA。这个项目当前是单 owner + 多 AI，v1 更适合“同一工作轮次内完成，最晚不拖到下一任务前”。
- 没有把“每个任务都写完整 spec”写成硬规则。小任务允许 only brief，大任务再补设计文档。
- 没有把所有 AO 控制面能力都纳入 v1 强制流程。先把 `reconcile / doctor / lifecycle` 固定下来就够了。
- 没有把“轻量档”放宽成大面积直推主线。v1.3 只对白名单 `docs/reports/**` 开例外，不把治理文档、runbook、脚本、代码也一起放开。
- 没有在这次顺手清理所有历史 `runs/**` 或旧脏工作区。v1 先管未来增量，不在本轮扩大施工面。

## v1 的一句话总结

**保留一个干净 baseline，用 task worktree 做任务隔离，所有变更走 PR，人来 merge，merge 后必须收口，AI 产物按“正式入库 / 临时证据 / 大文件截图”三类治理。**
