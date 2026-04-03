# AO Phase 1 Entry And Topology Convergence Design

**Date:** 2026-04-03  
**Scope:** AO 完全态路线图阶段 1：收敛默认入口和目录拓扑  
**Status:** draft for review  
**Depends on:** [AO 完全态路线图](/home/samsen/code/ciecopilot-home/.worktrees/task-20260402--ao-complete-state-roadmap/docs/setup/AO_COMPLETE_STATE_ROADMAP.md), [工程治理 v1](/home/samsen/code/ciecopilot-home/.worktrees/task-20260402--ao-complete-state-roadmap/docs/setup/ENGINEERING_WORKFLOW_GOVERNANCE_V1.md), [工程流程自动化 v1.2](/home/samsen/code/ciecopilot-home/.worktrees/task-20260402--ao-complete-state-roadmap/docs/setup/ENGINEERING_WORKFLOW_AUTOMATION_V1_2.md), [工程任务 SOP](/home/samsen/code/ciecopilot-home/.worktrees/task-20260402--ao-complete-state-roadmap/docs/setup/ENGINEERING_TASK_WORKFLOW_SOP.md), [2026-03-30 mainline closeout report](/home/samsen/code/ciecopilot-home/.worktrees/task-20260402--ao-complete-state-roadmap/docs/reports/2026-03-30-mainline-closeout-report.md)

## 一句话结论

阶段 1 的目标不是继续优化 bridge，而是结束 bridge。

AO 的长期 canonical project root 应固定为仓库根目录：

- `/home/samsen/code/ciecopilot-home`

baseline 继续存在，但它不再是“AO 的正式入口目录”，而是：

- 根目录应长期处于的稳定基线分支
- task worktree 的创建基线
- merge / closeout 后回到的稳定状态

推荐把长期 baseline 分支名收敛为：

- `baseline/origin-main`

日期化 baseline worktree 和日期化 baseline branch 只保留为迁移期历史对象，不再出现在正式默认配置、正式文档和正式脚本回退逻辑中。

## 这份设计要解决什么

当前仓库存在一个明确的“双根”问题：

1. 仓库根目录仍然是实际 repo root，也是人最自然会进入的目录。
2. AO 的正式入口却被配置成 `.worktrees/baseline-origin-main-20260402`。
3. `ao:start:clean` 通过 bridge 回退到 baseline worktree 里的 workflow 脚本。
4. workflow 文档也把 baseline worktree 当作默认命令入口。

这会导致三个直接问题：

- operator 心智模型分裂：到底哪里才是“正式入口”
- 配置和脚本绑定日期化路径，不能长期稳定演进
- 根目录和 baseline worktree 之间的职责边界不清，桥接状态会不断扩散

阶段 1 的任务就是把这个问题收口，而不是继续接受“双根 + bridge”作为长期现实。

## 不在本轮解决的内容

本设计明确不覆盖：

- phase 2 以后的 `reconcile -> doctor -> lifecycle` 调用闭环收敛
- continuity / restore / successor handoff 执行闭环
- assist execution allowlist 扩大
- AO durable state 和 closeout 的深度联动
- 自动 merge、通知系统、控制台 UI

这一轮只解决入口和目录拓扑。

## 当前系统现实

截至 2026-04-03，现场状态可以概括为：

- 仓库根目录当前分支仍是 `baseline/origin-main-20260330`
- 根目录相对 `origin/main` 落后，且带有未提交改动与未跟踪文件
- `.worktrees/baseline-origin-main-20260402` 是干净 baseline worktree，和 `origin/main` 分叉为 `0 0`
- `agent-orchestrator.yaml` 当前把项目路径直接指向该日期化 baseline worktree
- `scripts/ao/start-clean.sh` 当前会在根目录缺少 workflow 脚本时回退到该日期化 baseline worktree
- workflow 命令当前只在带治理文件的 baseline worktree 中完整存在

换句话说，系统已经有了“正确的工作流形态”，但它还挂在一个临时目录桥上。

## 设计决策

### 1. canonical project root 固定为仓库根目录

正式入口固定为：

- `/home/samsen/code/ciecopilot-home`

原因：

- 它是天然 repo root
- 它是人和工具最容易进入的目录
- Git、AO、文档、脚本都应该围绕同一个固定根目录收敛
- 如果继续把 `.worktrees/*` 作为正式入口，只是把临时 bridge 伪装成长期结构

结论：

- `agent-orchestrator.yaml` 的 `projects.ciecopilot-home.path` 应指向仓库根目录
- 默认文档应统一描述“从仓库根目录启动 AO”

### 2. baseline 从“入口目录”收敛为“稳定状态和创建基线”

baseline 不是删除，而是角色收敛。

长期目标：

- 根目录所在分支是 `baseline/origin-main`
- task worktree 仍然从 baseline 派生
- merge / closeout 之后回到 baseline 状态

这意味着 baseline 的本质是：

- 一个稳定的 branch posture
- 一个 workflow 语义

而不是：

- 另一个官方根目录

### 3. 日期化 baseline 命名退出正式默认面

以下内容不应继续出现在正式默认面：

- `baseline-origin-main-20260402`
- `baseline/origin-main-20260402`
- 其他带日期的 baseline 目录或 branch 作为默认值

原因：

- 日期化名字适合一次性 closeout / migration 证据，不适合作为长期 canonical 默认值
- 它会把一次迁移事件误固化成产品级默认接口

允许保留的范围：

- 历史 worktree
- 历史分支
- closeout 报告和审计文档中的历史引用

### 4. workflow 命令必须回到 repo-local

`git:hooks:install`、`workflow:baseline:sync`、`workflow:task:create`、`workflow:task:closeout` 必须存在于 canonical repo root 的正式脚本面。

不再接受以下长期形态：

- 根目录没有这些命令
- `ao:start:clean` 靠回退到 baseline worktree 中的脚本来工作
- operator 必须“知道内幕”才知道应该切到哪个 `.worktrees/baseline-*` 目录执行命令

### 5. 桥接逻辑在阶段 1 内退场

阶段 1 完成后，正式入口中的以下表述应被移除：

- temporary bridge
- baseline bridge fallback
- preserved dirty root worktree 作为默认正式入口旁路

可以保留的只有：

- 一份明确的迁移 runbook
- 一次性现场切换步骤

## 目标目录拓扑

阶段 1 完成后的目标拓扑：

- repo root：`/home/samsen/code/ciecopilot-home`
- root branch：`baseline/origin-main`
- task worktrees：`/home/samsen/code/ciecopilot-home/.worktrees/task-<id>--<slug>`
- historical baseline worktrees：保留但不再作为默认入口

行为边界：

- AO 从 repo root 启动
- hooks 在 repo root 安装和维护
- workflow 命令在 repo root 执行
- task 开发只在 task worktree 中执行
- merge 后 closeout 回到 root baseline posture

## 代码与文档层面的必改项

### 配置

- `agent-orchestrator.yaml`
  - `path` 改为 repo root
  - 删除 temporary bridge 注释
  - 删除日期化 baseline 默认值
  - 规则文案改为引用稳定 baseline 语义，而不是 `baseline/origin-main-20260402`

### 启动脚本

- `scripts/ao/start-clean.sh`
  - 删除对 `.worktrees/baseline-origin-main-20260402/**` 的候选回退
  - 只在 repo-local 正式脚本存在时执行 hooks install / baseline sync
  - 错误信息改为“正式脚本缺失”而不是“当前入口或 baseline bridge 缺失”

### workflow 脚本

- `package.json`
  - repo root 直接提供 `git:hooks:install` 和 `workflow:*`
- `scripts/workflow/cli.js`
  - 去掉日期化 baseline 默认 worktree / branch 名
  - 改为稳定默认值
- `scripts/workflow/lib/workflow-helper.js`
  - 维持对稳定 baseline 路径和 closeout 语义的辅助能力

### 文档

以下文档需要统一改写到新的 canonical 入口模型：

- `docs/setup/ENGINEERING_WORKFLOW_GOVERNANCE_V1.md`
- `docs/setup/ENGINEERING_WORKFLOW_AUTOMATION_V1_2.md`
- `docs/setup/ENGINEERING_TASK_WORKFLOW_SOP.md`
- 阶段 1 入口 / 目录说明文档

文档必须统一表达：

- 从 repo root 启动 AO
- 从 repo root 执行 workflow 命令
- baseline 是根目录的稳定状态，不是另一个“官方入口目录”

## 迁移策略

这一轮实现不直接改写当前脏根目录现场状态。

采用两段式迁移：

### 第一段：收敛代码、配置、文档

先让仓库里的正式实现与正式文档一致：

- 正式入口是 repo root
- 正式 baseline 名字非日期化
- 正式脚本全部 repo-local

这样系统的“目标形态”先被固化。

### 第二段：执行一次性现场切换

单独提供 runbook，把当前现场从：

- root = `baseline/origin-main-20260330`
- clean entry = `.worktrees/baseline-origin-main-20260402`

切换为：

- root = `baseline/origin-main`
- workflow / hooks / AO entry 全部 repo-local

这一步要显式处理：

- 当前根目录未提交改动
- 当前根目录未跟踪文件
- 是否保留历史 baseline worktree
- 是否把历史日期化 baseline branch 重命名或冻结

## 风险与约束

### 风险 1：把“设计上的 canonical root”误读成“立刻在当前脏根目录直接开工”

这是不允许的。

canonical root 是长期正式入口，不代表可以绕过迁移、直接把当前脏现场当成安全起点。

### 风险 2：把非日期化 baseline 理解成删除历史证据

这也不正确。

历史日期化 baseline、closeout 文档、旧 worktree 可以保留；退出的是默认入口地位，不是历史证据本身。

### 风险 3：入口收敛时破坏现有 workflow 自动化

因此阶段 1 必须以测试先行：

- workflow CLI 默认值测试
- `ao:start:clean:dry` 路径输出测试
- 文档引用检查

## 验收标准

阶段 1 完成后，至少满足下面这些条件：

1. `agent-orchestrator.yaml` 的项目路径指向 repo root，而不是 `.worktrees/baseline-origin-main-*`
2. repo root 的 `package.json` 直接包含 `git:hooks:install` 和 `workflow:*`
3. `scripts/ao/start-clean.sh` 不再包含任何 `.worktrees/baseline-origin-main-20260402` bridge 候选路径
4. `scripts/workflow/cli.js` 不再把日期化 baseline 名称作为默认值
5. `npm run ao:start:clean:dry` 在 repo root 执行时，不再打印任何 bridge baseline 路径
6. 文档统一说明：AO 从 repo root 启动，workflow 命令从 repo root 执行
7. 文档不再把 `.worktrees/baseline-origin-main-20260402` 当作正式默认入口

## 实现后的直接收益

阶段 1 完成后，系统会得到三个直接收益：

1. operator 心智模型收敛
   - 只有一个正式根目录，不再需要解释双根结构

2. 配置和脚本去临时化
   - 日期化路径不再污染正式默认面

3. 后续阶段有了稳定地基
   - phase 2 以后所有 truth / diagnose / decide / continuity / closeout 改造，都不再建立在临时 bridge 上

## 下一步

本 spec 通过后，下一步不是直接改一切，而是先写一个对应的 implementation plan，再按 TDD 顺序推进：

1. 先补失败测试，锁定 bridge 退场后的默认行为
2. 再改配置和脚本
3. 最后统一文档与迁移 runbook
