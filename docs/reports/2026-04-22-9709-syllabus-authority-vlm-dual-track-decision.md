# 9709 `syllabus authority` 与 `VLM` 双线决策文档

**Date:** 2026-04-22  
**Status:** active decision baseline  
**Scope:** `9709` 题目对齐、question ingest、diagram probe、后续批量题库恢复  
**Audience:** AO / Codex / 后续实现 worker / operator reviewer  
**Related:** [2026-04-15-9709-qwen-api-ao-vlm-architecture-design.md](../superpowers/specs/2026-04-15-9709-qwen-api-ao-vlm-architecture-design.md), [2026-04-15-9709-question-bank-data-recovery-and-gate-rerun.md](../superpowers/plans/2026-04-15-9709-question-bank-data-recovery-and-gate-rerun.md), [2026-04-17-9709-closed-loop-release-readiness-design.md](../superpowers/specs/2026-04-17-9709-closed-loop-release-readiness-design.md)

## 1. 文档目的

这份文档要冻结一个最近被实跑证明了的判断：

> `9709` 的题目 `topic truth` 不能继续主要依赖 `VLM` 直接给结论。  
> 对齐主线必须拆成两条独立线：  
> `syllabus / original paper / text-first authority line` 与 `image-first VLM line`。

这里的重点不是否定 `VLM`，而是把它从“最终真值拥有者”降回“视觉证据提供者”。

如果不拆线，就会持续把下面几类事情混成一件事：

- 题目图像看清楚了没有
- OCR / formula / diagram 抽出来了没有
- 这题按官方 syllabus 到底属于哪个 topic
- 当前 repo 的 curriculum taxonomy 能不能吃下这个 topic path
- 这题最终应不应该放行到 question ingest / gate

这几件事只要继续混在一个多模态判断里，错误就会不可定位，review 也会失真。

## 2. 触发这份决策的最新事实

### 2.1 2026-04-22 diagram lane live probe 的真实卡点

本次 probe 不是先在抽象层面“感觉不对”，而是在真实流水线上撞到了可复现错误：

- 首次实跑在 `post_extraction_review` 后重跑
- `backfill_paper_question_registry` 失败
- 真实错误是：`Failed to resolve curriculum node for 9709.p1.integration.application.`

这说明当时的阻塞不是 runner 本身，而是：

- manifest 里的 `primary_topic_path` 不符合当前 `curriculum_nodes` taxonomy
- 题目 topic truth 和系统可解析的 broad topic 没有分层

### 2.2 用原卷和 syllabus 原文复核后，问题很快收敛

对 probe 中 3 道题做原卷回查后，结论很直接：

1. `9709/s24_qp_13/questions/q09.png`
   - 原题是切线 + 旋转体体积
   - syllabus 对应 `Paper 1 -> 1.8 Integration`
   - truth 应挂到 `9709.p1.integration`
   - 原 manifest 的 `9709.p1.integration.application` 不适合做当前 curriculum node lookup

2. `9709/s24_qp_33/questions/q09.png`
   - 原题是建立微分方程，且题面是 rate-of-change formulation
   - syllabus 对应 `Paper 3 -> 3.8 Differential Equations`
   - truth 应挂到 `9709.p3.differential_equations`
   - 原 manifest 的 `9709.p3.differentiation.application` 是错挂

3. `9709/s17_qp_63/questions/q07.png`
   - 原题是 histogram / frequency density / grouped data
   - syllabus 原文显示 `Representation of Data` 在 `Paper 5 -> 5.1`
   - truth 更接近 `9709.p5.representation_of_data`
   - 原 manifest 的 `9709.p6.statistics.data_representation` 既不符合当前 taxonomy，也不符合 syllabus truth

### 2.3 修正后，真实流水线继续向前推进

对 probe 做最小 truthful remediation 后：

- [9709_diagram_lane_live_probe_v1.json](../../data/manifests/9709_diagram_lane_live_probe_v1.json) 改为 broad `primary_topic_path`
- [9709_diagram_lane_live_probe_nodes_v1.json](../../data/curriculum/9709_diagram_lane_live_probe_nodes_v1.json) 增加最小 seed
- manifest 补上 `curriculum_version_tag = 2025-2027_v1`
- finer-grained 语义移到 `analysis_hints`

真实实跑结果：

- registry backfill: `processed=3 inserted=3 conflicts=0`
- analysis backfill: `processed=3 backfilled=3 skipped=0`
- gate 仍未通过，但失败项已经转移为更大的 retrieval/data posture 问题，而不是 topic alignment

对应产物：

- [2026-04-22-9709-diagram-lane-live-probe-evidence-bundles.json](../../tmp/2026-04-22-9709-diagram-lane-live-probe-evidence-bundles.json)
- [2026-04-22-9709-diagram-lane-live-probe-gate.json](../../tmp/2026-04-22-9709-diagram-lane-live-probe-gate.json)
- [2026-04-22-9709-diagram-lane-live-probe-gate-report.md](../../tmp/2026-04-22-9709-diagram-lane-live-probe-gate-report.md)

这次实跑证明了一件非常关键的事：

> `topic truth` 的主要问题，可以在不依赖 `VLM` 最终裁决的前提下，被更快、更准地解决。

## 3. 核心决策

### 3.1 不是移除 `VLM`

这份文档不主张移除 `VLM`。

`VLM` 仍然是必需的，因为大量题目真的包含：

- OCR 噪声
- 复杂版面
- 图形和空间关系
- 表格 / histogram / geometry / graph / shading
- PDF 文本层不完整甚至不可用

### 3.2 但 `VLM` 不再默认拥有最终 topic truth

冻结后的权责是：

- `syllabus authority line` 负责 `authoritative topic truth`
- `VLM line` 负责 `visual evidence`
- `merge / review line` 负责冲突裁决

换句话说：

> `VLM` 负责“看清”。  
> `authority line` 负责“挂准”。  
> 最终 ingest / gate 只消费已经分层的结论。

### 3.3 双线必须彼此独立，可单独重跑

不能再做成“VLM 看完图后顺便直接给 topic path，然后下游全盘接受”。

正确姿态应该是：

- 两条线各自产出
- 各自有 provenance
- 一致时快过
- 不一致时进 review
- 下游写库时保留来源边界

## 4. 双线架构

### 4.1 Line A: `syllabus authority / text-first` 主线

这条线是 authoritative line。

### 输入

- 官方 syllabus 原文
- 原卷 PDF
- 明确的 paper / variant / q_number
- 已存在的 curriculum taxonomy
- repo 内手工 audit 证据

### 主要职责

- 确认题目真实属于哪个 broad syllabus topic
- 确认该 topic 在当前 `curriculum_nodes` 中的可解析路径
- 判断当前 manifest 是否 truthful
- 处理 cross-paper dependency 问题
- 给出最终可写入 `primary_topic_path` 的 authoritative 值

### 典型输出

- `primary_topic_path`
- `curriculum_version_tag`
- `authority_evidence_refs`
- `topic_resolution_basis = syllabus_pdf_manual_audit`
- `topic_resolution_status = resolved | contested | blocked`

### 适用场景

- topic path 对齐
- manifest 冻结
- curriculum seed 修复
- gate-critical pinned rows
- repo taxonomy 对不上时的 truth repair

### 4.2 Line B: `image-first / VLM` 视觉证据线

这条线负责把题面“看清”。

### 输入

- 单题截图
- 裁剪图
- diagram assets
- 必要时的 PDF page crop

### 主要职责

- OCR text
- formula latex
- subquestion block
- layout hints
- table / histogram / chart / geometry / graph elements
- spatial evidence
- visual ambiguity review

### 典型输出

- `ocr_text`
- `formula_latex_list`
- `subquestion_blocks`
- `diagram_elements`
- `spatial_evidence`
- `visual_confidence`
- `question_type_hint`
- `runtime_context_hint`

### 适用场景

- 图形题
- 表格题
- PDF 文本层不可靠
- 需要视觉 grounding 的题
- 为 analysis/backfill 提供 richer prompt surface

### 4.3 Line C: merge / conflict / review 线

这条线不负责重新“猜”，而负责裁决。

### 一致时

- authority line 与 VLM line 指向同一 broad topic
- 或者 VLM 没给 broad topic，只给了 visual hints，且不冲突
- 直接进入 registry / analysis backfill

### 不一致时

- authority line 指向 `9709.p3.differential_equations`
- VLM line 却更像 `9709.p3.differentiation`
- 或者 current taxonomy 不存在 authority line 给出的路径
- 进入 review

### review 的最小问题

- 是 authority truth 判错了，还是 VLM 误判了视觉语义
- 是 broad topic 错了，还是只是 question type 粒度错了
- 是 repo taxonomy 不完整，还是 manifest 路径过细
- 是 cross-paper dependency，还是字段建模本身有问题

## 5. 当前项目里的字段归属

下面这张表是本次决定后，字段的推荐归属。

| 字段/结论 | 主拥有者 | 次级来源 | 是否可直接进库 |
| --- | --- | --- | --- |
| `primary_topic_path` | `authority line` | review override | 是 |
| `curriculum_version_tag` | `authority line` | none | 是 |
| `analysis_hints.topic_path_hint` | authority 或 review | VLM 可引用 | 是 |
| `analysis_hints.question_type_hint_id` | VLM / analysis | review override | 是 |
| `analysis_hints.runtime_context_id` | VLM / analysis | review override | 是 |
| `ocr_text` | VLM | OCR specialist / fallback parser | 是 |
| `formula_latex_list` | VLM | OCR specialist | 是 |
| `diagram_elements` | VLM | none | 是 |
| `primary_question_type_id` | analysis/backfill | hints + review | 否，需后续裁决 |
| `family_id` | analysis/backfill | review | 否，需后续裁决 |
| release / gate decision | gate + operator | all upstream evidence | 否，人工在环 |

## 6. 立刻可落地的最小 contract

不需要先大改 schema，就能先按这份文档执行。

### 6.1 现有 contract 内就能做的事

已经被 probe 验证可行的最小策略是：

- `primary_topic_path` 只写当前 taxonomy 能吃下的 broad topic
- finer-grained 语义不要塞进 `primary_topic_path`
- 把 finer-grained 语义转移到：
  - `analysis_hints.question_type_hint_id`
  - `analysis_hints.runtime_context_id`
  - `analysis_hints.topic_path_hint`

也就是说：

- `9709.p1.integration.application` 不该直接当 `primary_topic_path`
- 但 `9709.integration.application` 仍然可以保留在 `analysis_hints`

### 6.2 建议新增但不是本轮硬依赖的字段

后续建议新增一组显式对齐字段，避免继续靠隐式约定：

- `topic_authority_source`
- `topic_authority_refs`
- `visual_topic_guess`
- `alignment_status`
- `alignment_review_required`
- `cross_paper_dependency_note`

推荐含义：

- `topic_authority_source`: `syllabus_text | original_paper_pdf | manual_audit | operator_review`
- `alignment_status`: `aligned | contested | unresolved`
- `cross_paper_dependency_note`: 明示类似 `P6` 题面考到 `P5` topic 的情况

## 7. 当前 pipeline 里的插入位置

推荐把双线插在 question ingest 前半段，而不是 gate 末端才补救。

### 7.1 推荐时序

1. `authority alignment`
   - 读 syllabus / 原卷 / 题号
   - 冻结 truthful `primary_topic_path`
   - 必要时补最小 curriculum seed

2. `VLM evidence extraction`
   - 走 OCR / diagram / review lane
   - 产出 question evidence bundle

3. `registry backfill`
   - 使用 authority line 的 `primary_topic_path`
   - 把题目写成可搜索、可回放的 `paper_question`

4. `analysis backfill`
   - 使用 VLM evidence + `analysis_hints`
   - 决定 `primary_question_type_id` 等 richer classification

5. `merge / review`
   - authority 与 VLM 如冲突则 review
   - 不冲突则直接继续

6. `gate`
   - gate 不再承担读 syllabus 修真值的职责
   - gate 只检查 retrieval / metadata / summary posture / release posture

### 7.2 不推荐的旧姿态

以下姿态应视为反模式：

- 让 `VLM` 直接输出最终 `primary_topic_path`
- 让 manifest 填入当前 taxonomy 没有的过细路径
- broad topic 与 question type 粒度不分
- 先跑完整条 ingest，再在 gate 最后才发现 topic path 不可解析

## 8. 本次 probe 对后续工作的直接启示

### 8.1 `topic truth` 应该前置，不该后置

这次 probe 的经验很明确：

- 题图抽取已经完成
- review 也已经放行
- 真正卡住的是写库时才发现 `topic_path` 不可解析

这说明 `topic truth` 应该在 ingest 更前面被定下来。

### 8.2 broad topic 与 question type 必须拆层

这次问题本质上不是“题目看不懂”，而是把下面两种层级混用了：

- broad curriculum node
- finer-grained question type / runtime context

今后默认规则应该是：

- broad topic 进入 `primary_topic_path`
- finer-grained 题型语义进入 `analysis_hints` 或后续 classification

### 8.3 `P6` 题面不等于一定挂 `P6` topic

`9709` 的 syllabus 明确存在 paper dependency。

尤其是：

- `Paper 6` 假定掌握 `Paper 5` 内容

因此在对齐时，不能简单用“题出现在 P6 卷子里”替代“它属于 P6 topic”。

如果题目实际考的是 `Paper 5 -> 5.1 Representation of Data`，truth 仍然应回到那个 topic。

## 9. 非目标

这份文档不主张立即做下面几件事：

- 不重开 Wave B
- 不重写 runtime 主线
- 不把整个 `9709` taxonomy 一次性全量重建
- 不要求所有历史题目立刻走双线重算
- 不把 operator-in-the-loop 改成全自动放行

这份文档只冻结：

- 谁拥有 topic truth
- 谁拥有 visual evidence
- 双线如何在当前 pipeline 中分工

## 10. 立即建议的下一批工作

按收益排序，下一步应该做的是：

1. 把 `authority alignment` 从这次人工操作沉淀成可重复 runner
2. 给 manifest / review pack 增加显式 `alignment_status` 与 authority refs
3. 给 question ingest runner 增加“authority-vs-visual conflict checkpoint”
4. 继续修当前 gate 真正剩下的失败项：
   - `mixed-ranking-paper-authority`
   - descriptor surface 为空导致的 `null_summary_rate`

不建议下一步继续花时间争论“要不要彻底去掉 VLM”。

真实更有价值的问题是：

> 怎样让 `VLM` 只做它最擅长的视觉工作，  
> 同时让 `topic truth` 从一开始就由更权威、更可审的线条来拥有。

## 11. 最终冻结结论

对 `9709` 当前阶段，唯一推荐结论是：

- 保留 `VLM` 线，但降级其 truth ownership
- 建立独立的 `syllabus authority / text-first` 主线
- `primary_topic_path` 由 authority line 拥有
- `VLM` 只负责视觉证据和题型 hint
- 双线一致则快过，冲突则 review
- gate 不再承担 topic truth 修正职责

用一句话总结就是：

> `syllabus / 原卷` 决定这题“算什么”。  
> `VLM` 决定这题“长什么样、有哪些视觉证据”。  
> 下游 ingest / gate 只消费已经分层的结论，而不是把这两件事继续混在一起。
