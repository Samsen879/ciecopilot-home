# AO 完全态路线图

更新时间：`2026-04-02`

这份文档不是产品需求文档，而是 `ciecopilot-home` 里 AO（Agent Orchestrator）后续继续建设的工程路线图。

目标很简单：

- 先说清楚 AO 现在已经做到哪一步
- 再说清楚离“完全态”还差什么
- 最后给出一份能直接执行的分阶段计划

这份文档默认面向两个读者：

- 非技术 owner：能看懂现在到哪了、下一步为什么这么排
- 工程执行者：能直接按阶段拆任务、开 branch、落 PR

---

## 1. 先讲结论

### 当前判断

AO 现在已经不是“概念验证”，而是已经具备了 **可运行、可观察、可做局部自治** 的基础能力。

具体来说，下面这些能力已经落地：

- 有统一的治理流程：baseline + task worktree + PR + merge 后 closeout
- 有 repo-local 的 AO truth layer：`reconcile`
- 有 repo-local 的 AO diagnosis layer：`doctor`
- 有 repo-local 的 AO decision layer：`lifecycle`
- 有持续运行的 controller runtime
- 有 `ao-manage / ao-override / ao-handoff / ao-state` 这些控制面命令
- 有默认启动入口和基本防呆

但它离“完全态”还差一段距离。

### 当前最真实的状态

AO 现在更像：

- 一个已经有基础操作系统的半自治工程控制面

而不是：

- 一个可以在各种异常下稳定自愈、稳定接力、稳定收口的完整自治系统

### 建议的总体节奏

如果按 **1 名主推进工程师 + AO 辅助** 的现实节奏估算：

- 第一阶段收敛：`3-5` 个工作日
- 第二阶段自治闭环：`5-8` 个工作日
- 第三阶段恢复与接力闭环：`5-8` 个工作日
- 第四阶段控制面稳定化与观测补齐：`4-6` 个工作日
- 第五阶段历史技术债和长期运行收口：`5-8` 个工作日

合计建议预期：

- **约 4-7 周**

这不是“人天理论最优值”，而是比较接近这个项目当前现实的估算。

---

## 2. 现在已经有什么

基于当前主线和已合并的治理改动，AO 现状可以拆成 5 个层次看。

### 2.1 工程治理层

已落地：

- 不在本地 `main` 直接开发
- 保留干净 baseline worktree
- 一任务一 branch 一 worktree
- 变更走 PR
- merge 后做 closeout
- 本地 hook 防呆
- baseline sync / task create / task closeout 自动化脚本

这意味着：

- AO 后续开发已经有了统一地面规则
- “目录乱、分支乱、merge 后不收口” 这类问题已经开始被工程化约束

### 2.2 truth / diagnose / decide 三层

已落地：

- `ao:reconcile`
- `ao:doctor`
- `ao:lifecycle`

可以简单理解成：

- `reconcile` 负责“先认清真实世界”
- `doctor` 负责“查本地连续性为什么不稳”
- `lifecycle` 负责“下一步到底该继续、接力、还是停住”

这三层已经是 AO 的核心骨架。

### 2.3 控制面命令层

已落地：

- `ao-manage`
- `ao-override`
- `ao-handoff`
- `ao-state`
- `ao-controller`

这说明 AO 已经不只是一个“调用 worker 的脚本集合”，而是有：

- 管理入口
- 人工干预入口
- 接力入口
- 状态查看入口
- 持续控制循环

### 2.4 运行时层

已落地：

- continuous controller runtime
- leader lease / heartbeat
- stale leader reclaim
- runtime state inspection

这部分的意义很大：

- AO 已经不是“每次手工跑一条命令”
- 它已经开始具备“持续观察 + 周期收敛”的运行时模型

### 2.5 规则和默认入口层

已落地：

- `agent-orchestrator.yaml`
- `.agent-rules.md`
- `scripts/ao/start-clean.sh`

并且已经把治理规则接到默认入口里：

- 默认先做 hook install / baseline sync
- 默认限制 worker 不在 `main` / `baseline/*` / 旧脏根工作区里直接改

---

## 3. 现在还缺什么

这是最关键的一节。

不要把“已经有很多命令和 runbook”误判成“已经完全体”。

AO 当前还缺的，主要不是更多命令，而是 **闭环能力**。

### 3.1 默认入口还带临时桥接

当前主线里的 `agent-orchestrator.yaml` 仍然使用了临时桥接路径，把项目根指到干净 baseline worktree。

这在当前阶段是合理的，但它不是长期稳定形态。

问题在于：

- 长期看，主线不应该依赖一个带日期的 baseline 路径
- controller / orchestrator 的默认根路径需要收敛到稳定的 canonical path
- 旧脏根工作区和当前正式入口之间还存在过渡结构

这件事如果不收掉，后续所有“完全态”都会建立在临时桥上。

### 3.2 controller 还不是完整的 repair plane

现在有：

- 持续 controller
- 生命周期判断
- 一些动作模型

但还没有彻底做到：

- 出问题后自动恢复 worker
- 自动完成 owner continuity 修复
- 自动推进接力链条
- 自动把恢复动作可靠写回 durable state

也就是说，AO 现在能“看懂很多问题”，但还没有把“恢复问题”完全吃下来。

### 3.3 lifecycle 还是 decide-only

这点在现有 runbook 里写得很清楚。

当前 lifecycle 的强项是：

- 判断下一步该怎么走

但它还没有完整闭环到：

- 真正执行 restore
- 真正执行 successor handoff
- 真正执行 runtime repair

所以现在还是：

- **会判断**
- 但 **不会把复杂动作安全执行到底**

### 3.4 assist execution 还只是早期态

从代码上看，action executor 已经有雏形，而且部分 `class_a` 动作允许执行。

但当前仍然明显偏保守：

- 很多动作仍然是 blocked / non-executable
- 高风险动作没有进入可靠执行面
- durable allow policy 和 runtime preflight 仍然是早期框架，不是成熟闭环

这代表：

- AO 已经开始有“执行面”
- 但离“可放心扩大自治边界”还有距离

### 3.5 持久状态和任务收口还没完全打通

虽然已经有：

- `ao-manage`
- `ao-state`
- governance closeout

但还需要继续打通：

- 任务 admission
- worker ownership
- PR state
- merge 后 closeout
- AO durable state retire

否则会继续出现一种典型问题：

- Git 已经收口了
- GitHub 已经收口了
- AO 本地状态却还留着旧痕迹

### 3.6 历史技术债还在

目前仍然存在：

- 旧脏根工作区
- 历史 branch / worktree / session 痕迹
- 历史 AO artifact 和 output 残留

这些不是今天立刻要清空的对象，但它们会长期影响：

- continuity 判断
- state diagnosis
- operator 信任
- “到底哪个目录才是当前工作目录”的清晰度

### 3.7 长期运行和 incident 还没经过足够 soak

现在很多能力已经具备，但还缺：

- 连续几轮真实任务的稳定验证
- 失败注入
- 恢复演练
- 长时间 controller 运行后的可靠性验证

“完全态”不能只靠代码结构判断，必须经过一段真实运行验证。

---

## 4. 这里说的“完全态”到底是什么意思

如果不先定义“完全态”，后面排计划会越来越散。

我建议这个项目里 AO 的“完全态”先定义成下面这 8 条。

### 4.1 稳定入口

从一个明确的本地入口启动 AO，不依赖临时桥接和人工提醒。

### 4.2 稳定 truth layer

AO 在 PR、CI、review、ownership 上总是先以 GitHub live truth 为准，不被本地旧状态带偏。

### 4.3 稳定 continuity

worker 卡住、退出、失联、接力时，AO 能稳定做出下一步动作，不靠人工频繁兜底。

### 4.4 稳定 closeout

merge 之后，Git、GitHub、AO state、local worktree、artifact 都能收口，不留下长尾。

### 4.5 稳定 operator controls

人工需要介入时，有明确的：

- hold
- override
- handoff
- inspect
- resume

而不是临时靠口头记忆和手工补命令。

### 4.6 稳定 execution boundary

哪些动作能自动执行，哪些动作必须人工 gate，要非常清楚，而且能在代码里落地。

### 4.7 稳定 observability

出问题后能快速回答：

- 当前 controller 是谁
- 当前 task 归谁
- 当前 PR 状态是什么
- 为什么 hold
- 为什么 blocked
- 下一步建议是什么

### 4.8 稳定长期运行

经过多轮真实任务和故障场景验证后，AO 仍能维持可信。

---

## 5. 明确不放进这一轮“完全态”的内容

为了防止路线图失控，下面这些先明确不纳入当前主线目标：

- 微信 / 企业微信通知
- 自动 merge
- 多仓库统一调度
- webhook-first 的远程 SaaS 控制面
- 把 AO 扩成通用平台产品
- 大规模 UI 控制台重做

不是这些不重要，而是它们现在都不在关键路径上。

当前关键路径只有一句话：

- **先把 repo-local AO 做到稳、准、可恢复、可收口。**

---

## 6. 建议的推进计划

下面这份计划按优先级排，不按“好不好玩”排。

### 阶段 1：收敛默认入口和目录拓扑

预计时间：

- `3-5` 个工作日

目标：

- 把当前“临时桥接”收成长期稳定入口
- 把 AO 的 canonical 工作路径、baseline 路径、旧根路径边界彻底讲清楚并固化

要做的事：

1. 盘点当前 canonical path
2. 决定长期的 AO project root 策略
3. 收掉 `agent-orchestrator.yaml` 里的临时 bridge 注释和临时依赖
4. 明确 baseline 更新机制，不再把日期路径当成长期默认根
5. 让 `ao:start:clean` 在稳定路径下工作，不依赖“知道内幕的人”
6. 补一份简短 runbook，明确 operator 平时从哪里启动

交付物：

- 稳定版 `agent-orchestrator.yaml`
- 稳定版 `scripts/ao/start-clean.sh`
- 入口/目录说明文档

完成标准：

- 新人只看文档就知道从哪里启动 AO
- 不需要再解释“为什么这里要指向 baseline worktree”
- 默认启动不会误入旧脏根工作区

### 阶段 2：把 truth / diagnose / decide 真正串成一个自治闭环

预计时间：

- `5-8` 个工作日

目标：

- 让 orchestrator 和 controller 不只是会调用三条命令，而是形成稳定的一条决策链

要做的事：

1. 统一 `reconcile -> doctor -> lifecycle` 的调用契约
2. 明确不同 trigger 下到底哪些步骤必跑，哪些是按需跑
3. 把 PR-scoped authoritative mode 和 project-scoped advisory mode 再收清楚
4. 让 controller 对 `ci_failed / changes_requested / approved_and_green / agent_stuck / agent_exited` 有稳定分支处理
5. 把建议动作、阻塞原因、下一步动作统一成更稳定的 machine-readable contract

交付物：

- 统一后的 trigger routing 规则
- controller / orchestrator 的阶段化调用契约
- 更稳定的 structured output contract

完成标准：

- 面对同一类 trigger，不会今天走 A、明天走 B
- orchestrator 不再需要靠大量 prompt 文字解释流程
- 核心触发链路能稳定复现

### 阶段 3：补齐恢复、接力、owner continuity 闭环

预计时间：

- `5-8` 个工作日

目标：

- 让 AO 在 worker 卡住、退出、失联时，真正具备“恢复和接力能力”

要做的事：

1. 明确 restore worker 和 successor handoff 的硬条件
2. 让 `ao-handoff`、`ao-manage`、`ao-state`、controller 使用同一份 continuity 语义
3. 打通 stale owner / orphan PR / multiple candidate worker 等场景
4. 补 worker recovery 和 successor claim 的测试矩阵
5. 建一套最小 incident flow，覆盖：
   - worker stuck
   - worker exited
   - owner stale
   - PR orphaned

交付物：

- continuity contract 收敛
- handoff / restore 场景测试
- incident runbook 补完

完成标准：

- 典型 continuity 异常不再需要人工每次重新判断一遍
- AO 能稳定区分“恢复旧 worker”和“切 successor”
- `ao-state` 可以清楚显示当前 ownership posture

### 阶段 4：把 assist execution 从早期框架推进到可控执行面

预计时间：

- `4-6` 个工作日

目标：

- 让 AO 不只会“判断建议动作”，而是能安全执行一部分低风险动作

要做的事：

1. 明确 action class A / B / C 的边界
2. 继续收敛 durable allow policy
3. 把 runtime preflight 做成真实门禁，而不是只留在模型里
4. 明确当前允许自动执行的动作白名单
5. 给每类执行动作补审计、幂等和回滚语义
6. 保持“不自动 merge”这条红线不变

建议先允许的动作：

- continue current worker
- notify human ready
- 某些低风险状态更新或 audit 写入

暂时不要放开的动作：

- 自动 restore 高风险 worker
- 自动 owner 迁移
- 自动 merge

交付物：

- 稳定版 action model
- assist execution allowlist
- execution audit / idempotency 规则

完成标准：

- 低风险动作可以自动执行并可追溯
- 高风险动作仍然被正确挡住
- operator 能回答“为什么这次能自动执行 / 不能自动执行”

### 阶段 5：把 AO 状态、任务状态、merge 后收口彻底打通

预计时间：

- `4-6` 个工作日

目标：

- 解决“Git 收了、PR 收了、AO 没收”这种尾巴问题

要做的事：

1. 定义 managed task 的明确生命周期
2. 把 `ao-manage` admission / resume / retire 跟任务真实状态对齐
3. 让 merge 后 closeout 能同步影响 AO durable state
4. 定义 artifact/state/archive 的保留和淘汰规则
5. 让 `ao-state` 能一眼看出哪些任务该 retire，哪些只是 hold

交付物：

- 任务生命周期文档
- merge/closeout 与 AO state 联动
- artifact/state retention 规则

完成标准：

- merge 后不再长期挂着“假活跃任务”
- AO state 和 Git/GitHub 状态不再长期漂移
- closeout 是一个真正的全链路收口动作

### 阶段 6：做历史债务清理和长时间运行 soak

预计时间：

- `5-8` 个工作日

目标：

- 把系统从“功能上成立”推进到“长期运行可信”

要做的事：

1. 盘点旧 worktree / 旧 branch / 旧 session / 旧 artifact
2. 区分：
   - 需要保留的历史证据
   - 可以归档的东西
   - 可以清理的纯噪音
3. 设计一次受控清理，不做暴力 reset
4. 做连续多轮真实任务 soak
5. 做故障演练：
   - controller stale leader
   - worker crash
   - PR owner ambiguity
   - dirty worktree diagnosis
6. 记录稳定性数据和 incident 样本

交付物：

- 技术债清理清单
- 清理执行记录
- soak report
- incident drills report

完成标准：

- AO 在真实任务中连续运行一段时间后仍然稳定
- 历史噪音不再频繁干扰当前判断
- operator 对 AO 的信任明显提高

---

## 7. 推荐的实际执行顺序

如果只问一句“接下来先干什么”，我建议严格按这个顺序：

1. 阶段 1：收敛默认入口和目录拓扑
2. 阶段 2：收敛三层调用闭环
3. 阶段 3：补恢复和接力闭环
4. 阶段 4：推进 assist execution
5. 阶段 5：打通任务状态和 closeout
6. 阶段 6：做历史债务和 soak

原因很简单：

- 入口不稳，后面全都建在临时桥上
- truth/diagnose/decide 不稳，后面执行面会放大错误
- continuity 不稳，自治一遇到异常就断
- execution 面太早放开，会把坏状态自动放大
- 状态和 closeout 不打通，系统永远有尾巴
- 不做 soak，永远不知道“看起来稳定”和“真的稳定”差多远

---

## 8. 总体时间预估

按当前项目现实，建议这样预估：

| 阶段 | 名称 | 预计时间 |
|---|---|---:|
| 1 | 收敛默认入口和目录拓扑 | 3-5 天 |
| 2 | 收敛 truth / diagnose / decide 闭环 | 5-8 天 |
| 3 | 补恢复和接力闭环 | 5-8 天 |
| 4 | 推进 assist execution | 4-6 天 |
| 5 | 打通任务状态和 closeout | 4-6 天 |
| 6 | 历史债务清理和 soak | 5-8 天 |

合计：

- **最顺利：约 26 个工作日左右**
- **更现实：约 4-7 周**

如果中途还要插入产品开发、线上修复或新 issue，实际日历时间只会更长，不会更短。

---

## 9. 建议的“下一步”只做什么

如果现在立刻继续推进，我建议只开一个小目标：

- **先做阶段 1：收敛默认入口和目录拓扑**

不要一上来就做：

- 微信通知
- 自动 merge
- 更多 reaction
- 更花哨的控制台

因为这些都会把系统复杂度抬高，但不会先解决当前最核心的不稳定项。

现在最值得投的，是把 AO 的地基彻底打稳。

---

## 10. 一句话版结论

AO 现在已经有了“控制面雏形 + 自治骨架 + 工程治理底座”，但还没有到“稳定完全态”。

下一步不要再横向加花活，而是要按顺序把这 6 件事做完：

- 收敛入口
- 收敛三层闭环
- 补 continuity
- 推进可控执行
- 打通状态与收口
- 清历史债并做 soak

把这条路走完，AO 才算真正进入可长期依赖的阶段。
