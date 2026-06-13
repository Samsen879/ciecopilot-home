# CIE Copilot

**CIE Copilot 是一个面向 Cambridge International A-Level 学习场景的 syllabus-aware learning OS。**  
当前 release focus 是 **Math-first / 9709-first**，同时底层架构按未来扩展到 Cambridge A-Level STEM 设计。

这份 README 面向投资人、合作方和产品评审，不是传统开源项目的安装说明。

CIE Copilot 不是通用 AI 作业问答工具，也不是把一个聊天框放到题库旁边。它试图把 past papers、questions、topics、scoring evidence、mistakes、review tasks、artifacts 和 long-term mastery state 组织成一个持续运行的考试学习系统。

这个产品建立在一个很具体的判断上：

A-Level 学生每天真正面对的不是“我要学数学”这么抽象的目标，而是：

**“这套 9709 paper 里面，我到底哪类题不稳？为什么丢分？下一次该复习什么？系统能不能按 exam-style 的方式给我反馈？”**

CIE Copilot 的目标，就是长期、持续、可追踪地回答这个问题。

## 为什么这个产品有价值

Cambridge A-Level 备考现在仍然非常碎片化。学生通常要在 PDF、mark scheme、截图、笔记、题库网站、表格和通用 AI 对话之间来回切换。

通用 AI 也许能解出一道数学题，但它通常不知道：

- 这道题属于哪个 syllabus scope；
- 它对应哪张 paper、哪个 topic；
- 它属于哪个 question family / question type；
- 当前是否有可靠的 released scoring basis；
- 学生之前是否在同类题上反复失误；
- 这次是独立完成，还是在强提示下完成；
- 哪些内容应该变成 review task、workspace artifact 或 mastery signal。

CIE Copilot 的核心判断是：

**真正有价值的不是单次回答，而是围绕 exam evidence 建立起来的 trusted learning state。**

所以这个项目已经从早期的 RAG 问答，发展成了一个 learning runtime：它包含 paper-aware workspace、session state、evidence-grounded answering、server-side marking、review scheduling、artifact lifecycle，以及面向数据资产的 production gates。

## 产品判断

下一代 AI 学习产品，竞争点不会只是“谁的 tutor 更会聊天”。真正有壁垒的是：谁能在大量题目、paper、attempt、mistake 和 review 之间，长期维护可信的学习状态。

CIE Copilot 的 defensibility 来自以下能力组合：

- syllabus-aware scope control；
- exam-grounded RAG 与 question search；
- question family / question type taxonomy；
- server-side marking 与 evidence ledger；
- mastery and review state；
- topic / paper workspace 与 stable learning artifacts；
- 面向 scoring 和 content surfaces 的 conservative release gates；
- 面向未来多学科扩展的 subject adapters。

Cambridge A-Level 是切入点。更长期的机会，是为国际 STEM 教育构建 assessment-aware learning infrastructure。

## 当前产品形态

### Paper Workspace

当前产品方向是：**可见体验层采用 paper-first**。

学生进入的不是一个孤立 topic 页面，而是类似 `9709:paper:p1` 的 Paper Workspace。在 Paper Workspace 内，系统组织 topic sections、稳定学习资料、相关 evidence、review tasks 和后续 learning state。

这更贴近真实备考方式。学生通常是按 paper、topic、question type 和错题来复习，而不是只按教材目录线性学习。

当前后端已经支持：

- paper-level workspace route：`/api/learning/workspaces/papers/:paperScope`；
- paper 内的 topic-section projections；
- 保留 legacy topic workspace 作为 compatibility fallback；
- stable slots，例如 overview map、core derivation、worked example、common traps、my notes 和 review queue；
- paper / topic / global review queue 的不同 projections。

架构上，Paper Workspace 是 **visible organization layer**。  
Artifacts、review tasks、mastery rows 和 question-type state 的 canonical ownership 仍然归属于 topic。这样可以让学生拥有 paper-native 的学习体验，同时避免在多个 paper surface 中复制 truth。

前端侧已经有 contract fixtures、API helpers、view-model adapters 和 smoke harness。下一步重点是把最终可见 UI 接到已经准备好的 contracts 上。

### Exam-Grounded AI

CIE Copilot 的 AI 回答不是裸模型聊天。RAG 层围绕项目自己的 exam corpus 和 Supabase / Postgres search surface 构建，并带有 subject boundary、telemetry、answer policy、evidence assembly 和 S1 / S2 routing governance。

对学生来说，这意味着回答可以围绕正确的 subject、paper、topic 和 question evidence 展开。

对业务来说，这意味着产品壁垒不是 prompt，而是 exam corpus、retrieval surface、runtime boundary、telemetry 和 release governance。

当前姿态：

- S1 retrieval 是默认 production route；
- S2 在 release governance 证明安全之前保持 advisory-only；
- topic leakage、empty evidence、timeout 和 fallback behavior 都被显式治理，而不是隐藏在系统内部。

### Learning Runtime

Learning Runtime 是产品背后的状态层。

它负责记录 sessions、anchors、active scope、handoff、review tasks、artifacts 和 learner state。一个 session 可以从 concept、question、review task、artifact 或 workspace slot 启动，也可以在新 session 中保留前一个 session 的 lineage。

这很关键，因为备考不是一次对话就结束的事情。学生可能在不同 paper 和 session 里反复犯同一种 integration、mechanics、statistics 或 trigonometry 错误。Learning Runtime 的价值，就是把这些错误、证据和下一步任务沉淀为结构化 learning state。

Study Session 不是 chat thread。它包含：

- learning goal；
- active scope bundle；
- mode；
- current anchor；
- nullable question / question-type references；
- summary state；
- open questions；
- key artifact references；
- misconception focus；
- lineage and handoff behavior。

当前支持的 learning modes 包括：

- Learn Concept；
- Guided Solve；
- Timed Practice；
- Post-mortem Review；
- Spaced Review。

这让系统能够区分：学生只是阅读了解释，还是在引导下完成了一题；是 independent timed attempt，还是 post-mortem review；是普通聊天，还是一次真正能支撑 mastery 判断的学习行为。

因此，纯聊天、被动阅读、或者只是查看 artifact，都不应该被当作强 mastery evidence。

### Smart Mark and Feedback

评分层是 server-side、DB-backed 的。系统在服务端解析 rubric，把 scoring evidence 写入 evidence ledger，并在启用时桥接到 Learning Runtime。

它不会接受前端直接传来的 rubric points 作为评分依据。

这里的分工非常重要：

- **Smart Mark** 负责 rubric-driven scoring、part / subpart diagnostics、uncertainty 和 point-level evidence。
- **Learning Layer** 负责 mastery updates、review scheduling、artifact suggestions 和 long-term state reconciliation。

Learning Layer 不应该重新发明评分结论，也不应该覆盖 point judgement。这样可以避免 AI 教育产品常见的问题：语言模型解释得很流畅，但评分依据并不可靠。

项目里也有 released-scope guardrails。系统可以区分哪些 question types / scoring paths 已经进入 released scoring，哪些仍然应该保持 fallback posture。

这对教育产品非常重要，因为系统不能在 rubric coverage、gold set 和 uncertainty behavior 还没准备好之前，就假装能提供 authoritative marks。

### Review Queue

Review tasks 不是简单提醒，而是一等学习对象。

Review Queue 由 global scheduler 维护，然后投影到 paper 或 topic views 中。这可以避免每个 Paper Workspace 都复制一份 shadow review task。

ReviewTask 支持 mode、priority、due date、evidence、completion intent 和 status。完成任务时也应该需要 mode-specific behavioral evidence，而不是让用户简单点一个 `done`。

当前 review modes 包括：

- `redo_variant`
- `quick_recall`
- `reconstruct_derivation`
- `timed_check`
- `trap_fix`

这让 review 成为学习闭环的一部分：完成任务、产生证据、更新 review state、保守地调整 freshness 或 mastery，并把有价值的结果回写到 workspace。

### Workspace and Artifacts

高价值学习对象不应该消失在聊天记录里。

CIE Copilot 使用 Workspace 和 Artifact 层来保存有复用价值的解释、推导、worked examples、notes 和 misconception cards。

Stable slots 包括：

- Overview / Map
- Core Method / Derivation
- Canonical Worked Example
- Common Traps
- My Notes
- Review Queue

Artifact 类型包括：

- summary card；
- derivation card；
- worked-example card；
- misconception card；
- formula card；
- free note。

Artifact 不会因为是 AI 生成的就自动变成可信长期资产。它需要 ownership、evidence、versioning 和 lifecycle state。系统区分 trust、placement 和 lifecycle 三个维度，所以 unverified artifact 不会被当作 grounded、pinned 或 released object 使用。

### Subject Adapter Architecture

当前 runtime 是 Math-first，9709 Mathematics 是第一阶段重点。

Physics 9702 已经是后续扩展方向之一，但它的 marking、mastery 和 review automation 在对应 subject-specific adapter 成熟之前，应该保持 conservative fallback。

这是有意为之。Mathematics、Physics、Chemistry 和其他 STEM 学科不应该被强行塞进同一套 question-type tree、rubric heuristic 或 mastery rule。Subject adapter layer 是后续扩展的路径，也是避免“数学规则误用到其他学科”的安全边界。

## 当前数据资产与 Production Gates

这个 repository 现在已经不只是应用代码，也包含一套相当大的 exam data production system。

当前 tracked assets 包括：

- `3770` 个 tracked past-paper / supplemental PDFs；
- `444` 个 manifest files，用于描述 source、crop、text、production、gate 等 surfaces；
- `2700+` 个 report artifacts，用于记录 gates、closeouts、audits 和 handoffs。

目前 production-gated 的 row-level question-text surfaces 包括：

| Subject | Current validated surface | Evidence posture |
| --- | ---: | --- |
| 9709 Mathematics | `2937/2937` existing production rows，另有 `593` corrected-v2 new-paper rows | DB coverage、search gate、release preflight、production closeout |
| 9231 Further Mathematics | `1593/1593` rows，覆盖 `64/64` shards 和 `200/200` source QP PDFs | DB/search/read-model/RAG chunk readback、aggregate gate |
| 9702 Physics | `4137/4137` accepted rows，`25/25` production batches，`362/362` source QP PDFs | DB/search/read-model/RAG chunk readback、aggregate gate |

按当前 gate reports 合计，项目已有超过 `9200` 个 production-validated row-level question surfaces。

这里的边界也很重要：这些是 row-level question text、search、read models 和 RAG chunk readback 的 production-ready claims。它们不等于所有科目、所有 question types、所有 scoring semantics 都已经完全进入 authoritative marking。

## 这个项目真正形成的能力

CIE Copilot 的 defensibility 不在于“用了某个大模型”，而在于它已经搭出了一套考试学习产品需要的 operational layer。

当前能力包括：

- canonical question bank 与 search projections，可以保存 paper、topic、question type、provenance 和 normalized text；
- learning runtime schema，覆盖 sessions、artifacts、slots、review tasks、mastery、reconciliation 和 handoff lineage；
- paper workspace persistence 与 read models，符合学生按 paper 复习的方式，同时保留 topic-owned canonical truth；
- server-side marking 与 evidence ledger，避免把评分依据交给 frontend；
- RAG boundary guards、telemetry、evidence assembly、answer policy 和 advisory S2 routing；
- production gates，用 machine-readable reports 判断数据 surface 是否可以进入 production；
- review queue 与 artifact lifecycle foundations，把一次性反馈转化为长期学习闭环。

这使它更像一个可以扩展到多科目、多 paper、多 question type 的 learning infrastructure layer，而不是一个一次性 AI demo。

## 当前状态

截至 2026 年 6 月主线状态：

- React / Vite frontend 和 API routes 仍在活跃开发。
- Learning Runtime backend 已经覆盖 sessions、question import、question search、workspaces、review tasks、artifacts 和 session ask。
- Paper Workspace backend contracts、frontend fixtures、view-model adapters 和 smoke tests 已经 ready-held，等待最终 visible UI integration。
- RAG S1 是默认 production route。
- RAG S2 仍然在 governance 和 release gates 下保持 advisory-only。
- 9709、9231、9702 已经有 production-gated question-text surfaces，并有 machine-readable closeout evidence。
- Smart Mark 是 server-side 且 evidence-led，但不是所有 scoring family 都已经 released。
- 产品没有声称所有 UI flows 都已经完全打磨完成，也没有声称所有 question families 都已经可以安全进行 authoritative scoring。

当前最强的进展是：data assets、learning runtime、paper workspace contract、evidence-led marking path 和 production gate system 已经明显超过旧 README 所描述的状态。

## 近期 Roadmap

下一阶段最有价值的工作不是添加更多散点功能，而是继续强化 closed loop。

重点包括：

1. 把可见 Paper Workspace UI 接到已经准备好的 backend / frontend contracts 上。
2. 继续扩展 production-gated paper coverage，并保持明确 release evidence。
3. 只在 rubric coverage、gold set 和 uncertainty behavior 达标时，把更多 scoring families 从 fallback posture 推进到 released scoring。
4. 把 Review Queue 和 stable workspace slots 打造成学生每天真实使用的闭环：attempt、feedback、artifact、review、revisit、improvement。
5. 提高 ReviewTask completion evidence 的质量，避免 review 退化成简单的 `done` checkbox。
6. 用 independent 和 timed performance 校准 mastery，而不是用 passive reading 虚增 mastery。
7. 保守扩展 subject adapters，从 Mathematics 出发，准备 Physics，但不削弱 scoring guardrails。

## Repository Map

关键产品与工程 surfaces：

- `src/components/learning-runtime/`  
  Workspace shell、review queue、imported question intake、artifact cards 和 view-model adapters。

- `src/api/learningRuntimeApi.js`  
  Frontend learning runtime API client。

- `api/learning/`  
  Sessions、workspaces、review tasks、artifacts、question search、question import、runtime repositories 和 learning orchestration。

- `api/marking/`  
  Smart Mark endpoint、rubric resolution、decision engine、evidence ledger integration 和 learning effects bridge。

- `api/rag/`  
  AskAI、retrieval、answer policy、evidence assembly、telemetry 和 routing controls。

- `supabase/migrations/`  
  Canonical database schema 和 read models。

- `scripts/learning/`  
  Production gates、asset promotion、question-text consumption 和 aggregate closeout runners。

- `docs/reports/`  
  Gates、audits、closeouts 和 readiness reports 的 human-readable / machine-readable evidence。

重要 evidence reports 包括：

- `docs/reports/2026-06-11-paper-workspace-frontend-pre-adapter-readiness.md`
- `docs/reports/2026-06-02-9709-full-production-ready-closeout.md`
- `docs/reports/2026-06-04-9709-new-paper-v2-production-ready-closeout.md`
- `docs/reports/2026-06-07-9231-full-production-ready-closeout.md`
- `docs/reports/2026-06-10-9702-full-production-ready-closeout.md`

## CIE Copilot 不是什么

CIE Copilot 当前明确不是：

- generic homework-answer chatbot；
- GoodNotes-like handwriting product；
- 一开始就覆盖所有学科、所有 paper 的 automatic examiner；
- 把 passive reading 当作 mastery proof 的系统；
- 无边界 off-syllabus AI conversation layer；
- 用 confident language 掩盖 uncertainty 的产品。

产品策略是：先做窄，做深，做闭环，再有纪律地扩大范围。

## 一句话总结

CIE Copilot 正在为 high-stakes Cambridge A-Level STEM preparation 构建 trusted learning state layer，第一阶段从 9709 Mathematics 开始。

## Disclaimer

CIE、CAIE、Cambridge International 以及相关考试名称仅用于指代考试体系与科目代码。CIE Copilot 是独立项目，与 Cambridge Assessment International Education 无官方隶属关系，也不代表其背书。
