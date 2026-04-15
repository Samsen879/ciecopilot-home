# 9709 题库恢复的 Qwen 官方 API + AO/VLM 架构决策文档

**Date:** 2026-04-15  
**Revision:** 2026-04-16 `v1.1`  
**Scope:** `9709` 题库恢复阶段的官方 API 选型、`AO` / `VLM` 职责边界、模型路由、状态契约与质量控制原则  
**Status:** revised after technical review  
**Current execution plan remains:** [2026-04-15-9709-question-bank-data-recovery-and-gate-rerun.md](../plans/2026-04-15-9709-question-bank-data-recovery-and-gate-rerun.md)  
**Supersedes:** 初稿对 `qwen3-vl-plus` 与 `qwen3.6-plus` 的角色排位、线性三级链路、以及 machine-consumable 输出约束的表述  
**Related:** [2026-04-15-question-bank-retrieval-slice-v1.md](../plans/2026-04-15-question-bank-retrieval-slice-v1.md), [2026-04-15-non-technical-overview.md](../../reports/2026-04-15-non-technical-overview.md)

## 1. 文档目的

这份文档只负责冻结一件事：

> 在 `9709` 题库恢复和后续题目资产建设中，`Qwen` 官方 API 应该怎么分工使用，`VLM` 和 `AO worker` 的边界到底如何落到工程上。

当前最大的风险不是“没有模型可用”，而是：

- 把视觉提取、逻辑判断、topic 绑定、关系生成、放行决策混给同一个多模态模型
- 导致输出不可审、状态不可重放、错误定位困难、质量抽检失真

因此，这份文档优先冻结的是：

- 模型角色
- 路由策略
- machine-consumable 输出契约
- `state / region / provenance` 契约

它不是 AO 执行 runbook，也不是 prompt 草稿。

## 2. 当前背景判断

`9709` 当前真正的阻塞点是数据姿态，不是 retrieval 代码本身。

已经合并的 retrieval slice 证明了后台检索读模型、题目搜索接口、gate 脚本这条路是存在的，但当前环境仍然缺少足够的：

- `paper-backed` 题目行
- 可放行的 descriptor surface
- 稳定的 topic binding surface
- 可重复 replay 的题目证据链

因此下一步不是继续补一轮“怎么搜题”的功能，而是把题目资产恢复成：

- 题目图像稳定
- 题目文本和结构字段可抽取
- syllabus / topic 绑定可审计
- gate 能在真实数据上重跑

在这个阶段，模型体系的第一目标不是“尽量聪明”，而是：

> 把输入表面、抽取表面、判断表面、放行表面拆开。

## 3. 冻结原则

### 3.1 看和想必须拆层

对于题库生产线，`看` 和 `想` 不能默认交给同一个模型完成。

这里需要能被拆开追责的字段来源：

- 哪些字段来自图片观察
- 哪些字段来自 OCR / layout / formula extraction
- 哪些字段来自 diagram / spatial extraction
- 哪些字段来自 syllabus 规则与逻辑判断
- 哪些字段来自人工或 gate 最终确认

### 3.2 VLM 负责视觉表面，不默认拥有最终真值

`VLM` 可以负责：

- OCR
- 公式识别
- 表格与版面解析
- 几何图 / 坐标图 /函数图像元素抽取
- 局部语义摘要

`VLM` 不应直接拥有：

- 最终 `primary_topic_path`
- 最终 syllabus 绑定
- 最终 `family_id`
- 最终题间关系
- 最终 release decision

### 3.3 AO worker 是 final truth-maker

只要某个判断可以基于结构化证据完成，就优先由 `AO worker` 做。

在 wave 1 中，默认权责是：

- `VLM` 负责“把题目表面看清”
- `AO worker` 负责“把题目放进正确的 syllabus / topic / family 语境里”

### 3.4 Machine-consumable 输出必须硬约束

凡是要被脚本、数据库、gate、下游 worker 直接消费的模型输出，都不能依赖自由文本长回答。

必须冻结为：

- `enable_thinking=false`
- `response_format={"type":"json_object"}`
- prompt 中显式要求返回 `JSON`

如果不这么做，所谓的 `auditability` 和 `replayability` 很快就会失真。

### 3.5 路由必须 task-based，而不是固定线性链

这条架构不采用：

- 所有题都机械走 `OCR -> VL -> 3.6 -> AO`

而采用：

- 先做任务识别
- 再按题目表面类型和冲突状态选路由
- 最后统一回到 `AO worker`

## 4. 官方 API 事实判断

截至 `2026-04-16`，Qwen 官方 API 已经提供足够完整的视觉 / OCR / 多模态推理选择，因此这波 `9709` 恢复工作没有必要优先走本地部署。

已核验到的关键事实包括：

- `qwen-vl-ocr` 明确提供文字识别、文档解析、表格解析、公式识别、高级识别等任务接口
- `Qwen3.6` 官方文档把它定位成首选的视觉理解模型
- `qwen3-vl-plus` / `Qwen3-VL` 仍然在文档解析、网页解析、空间定位、对象定位、图像理解等任务上有清晰价值
- `Qwen3.6-Plus` 与 `Qwen3-VL-Plus` 在 non-thinking mode 下可做结构化输出
- OpenAI-compatible Chat Completions 路径应视为无状态接口，多轮上下文需要调用方自行维护

因此，本决策文档明确采用：

> 官方 API 直连优先，不为当前恢复工作引入本地部署复杂度。

## 5. 最终推荐架构

### 5.1 唯一推荐结论

本项目在 `9709` 题库恢复阶段采用以下唯一推荐架构：

- `manifest router` 先做任务识别与路由
- `qwen-vl-ocr` 负责 `OCR / formula / table / document surface`
- `qwen3-vl-plus` 负责 `diagram / spatial / object-localization / document-like parsing`
- `qwen3.6-plus` 负责 `general multimodal judgement / ambiguity resolution / conflict review`
- `AO worker` 负责 `topic / family / question_type / relationship / release posture` 的最终裁决

用一句话概括就是：

> `VLM 负责看清，AO 负责定性；qwen3.6-plus 不是禁用层，而是 judge / reviewer 层。`

### 5.2 这不是“三级流水线”，而是“任务路由 + 证据汇总”

这套架构的重点不在于“先后顺序固定”，而在于：

- 每层只做擅长的任务
- 每层输出都能被复用和审计
- 每层都可以独立重跑
- 最终真值统一回到 `AO worker`

## 6. 模型角色重定义

### 6.1 `qwen-vl-ocr`：视觉提取专用层

`qwen-vl-ocr` 是第一优先级的 extraction specialist。

它最适合承担：

- 通用文字识别
- 高精识别
- 公式识别
- 表格解析
- 文档结构解析
- 基础关键信息抽取

对 `9709` 数学题截图，第一层的典型交付物应包括：

- `ocr_text`
- `formula_latex_list`
- `subquestion_blocks`
- `layout_hints`
- `symbol_inventory`
- `table_blocks`
- `line_boxes` 或等价定位信息
- `ocr_confidence`

这层不做最终 topic 判定。

### 6.2 `qwen3-vl-plus`：diagram / spatial / parsing specialist

`qwen3-vl-plus` 不再定义为“通用第二层视觉补线器”。

在这份 `v1.1` 冻结版里，它的角色明确收敛为：

- 坐标图、几何图、函数图像的空间要素抽取
- 图中对象定位、标签对应、区域与关系识别
- OCR 难以恢复的图文联动信息补充
- document-like parsing，例如 markdown / html / 页面结构类场景

也就是说，它适合做：

- `diagram_elements`
- `axes_labels`
- `curve_point_annotations`
- `shape_relations`
- `object_grounding`
- `spatial_evidence`

它不是默认的“所有复杂题都先过一下”的通用层，而是专业视觉任务层。

### 6.3 `qwen3.6-plus`：general multimodal judge / reviewer

`qwen3.6-plus` 不再被定义为“极少数第三层疑难复核器”。

在这份 `v1.1` 冻结版里，它的角色是：

- 通用多模态判断
- 歧义消解
- `OCR` 与 `VL` 证据冲突时的 review
- diagram-heavy 题目的高阶复核
- `AO worker` 无法收敛时的 judge / reviewer

它不应该接管整条主生产线，但也不应该被写成几乎不用的保守层。

更准确的说法是：

> `qwen3.6-plus` 是冲突裁决和复杂多模态 review 的主力，而不是默认被回避的模型。

### 6.4 `AO worker`：最终逻辑层

`AO worker` 是这条链路的真正 final truth-maker。

它必须负责：

- syllabus 节点绑定
- `primary_topic_path` 决定
- `secondary_topic_candidates`
- `family_id` / `question_type` 归类策略
- 题间关系生成
- 冲突样本裁决
- gate 结果与 release posture

只要某个结论会影响检索 gate、产品放行、知识图谱主干或学生端对题目的可见分类，它默认归 `AO worker` 所有。

## 7. 输出契约与 thinking 契约

### 7.1 所有 machine-consumable 路径一律 non-thinking

以下路径必须使用：

- `enable_thinking=false`
- `response_format={"type":"json_object"}`
- prompt 内显式要求返回 `JSON`

适用范围：

- `qwen-vl-ocr` 结构化提取
- `qwen3-vl-plus` diagram / spatial extraction
- `qwen3.6-plus` review verdict JSON

### 7.2 Thinking mode 不是禁用，而是降级到 operator-only lane

如果后续确实要使用 `qwen3.6-plus` 的 thinking mode，它只能存在于：

- 调试
- 人工调查
- 失败样本分析
- prompt 研发

这类 operator-only lane。

它的输出不能直接写入题库主表，也不能跳过 `AO worker` 直接成为最终真值。

### 7.3 JSON 输出必须带 provenance

每次 machine-consumable 输出都必须带最少字段：

- `model`
- `route`
- `prompt_template_version`
- `region`
- `input_asset_id`
- `input_asset_hash`
- `response_schema_version`
- `confidence`
- `failure_reason`

否则后面无法做 replay 和审计。

## 8. 路由策略

### 8.1 先有 router，再有模型调用

wave 1 先做一个便宜的 `manifest router`，不让所有题直接进统一模型链。

router 的输入可以来自：

- manifest 元数据
- 文件尺寸与分辨率
- 是否含图
- OCR 预检置信度
- 公式密度
- 表格密度
- 小问数量
- 是否 gate-critical

### 8.2 推荐路由

推荐的路由是：

1. `router`
2. 进入以下分支之一或并行组合：
   - `OCR lane`
   - `diagram/spatial lane`
   - `review lane`
3. 统一汇总到 `AO worker`

### 8.3 `OCR lane`

满足以下条件时优先走 `qwen-vl-ocr`：

- 纯文字或文字为主
- 公式密度高，但空间关系弱
- 表格或版面解析需求明显
- 题干与小问边界较清晰

### 8.4 `diagram / spatial lane`

满足以下条件时走 `qwen3-vl-plus`：

- `diagram_present=true`
- 题目依赖坐标图、几何图、函数图像
- 图中标签、区域、点位关系本身是重要证据
- OCR 单独无法恢复题意

### 8.5 `review lane`

满足以下条件时走 `qwen3.6-plus`：

- `OCR lane` 与 `diagram lane` 结论冲突
- `AO worker` 在 topic 候选上无法收敛
- 题目存在高歧义
- 该题属于 gate-critical 样本
- 该题命中高风险 bucket

### 8.6 不允许的路由

以下在 wave 1 中应视为反模式：

- 未经 router 直接把所有题送进 `qwen3.6-plus`
- 未经 `AO worker` 直接让 `qwen3-vl-plus` 决定最终 topic
- 用一个统一 prompt 让单模型直接输出“文本 + topic + family + reasoning + release decision”

## 9. AO 证据消费契约

### 9.1 AO 默认只吃结构化证据

`AO worker` 的默认输入不应是整张原图。

默认应为：

- `ocr_text`
- `formula_latex_list`
- `layout_hints`
- `subquestion_blocks`
- `diagram_present`
- `diagram_elements`
- `spatial_evidence`
- 题目身份元数据
- syllabus 候选规则
- provenance 元数据

### 9.2 原图采用 lazy attach

只有在这些情况下才把原图或 crop 附加给 `AO worker`：

- 结构化证据冲突
- 置信度过低
- diagram-heavy
- gate-critical
- 进入人工调查或 failure replay

这样做的原因不是“省一点小钱”，而是：

- 避免重复支付像素 token 成本
- 保持判断对象与审计对象分层
- 让 `AO` 的默认职责保持在 reasoning，而不是重新读图

## 10. 含图题与图形题规则

### 10.1 原图仍然是最高优先级证据

对于含图题：

- 原始单题截图是 canonical evidence
- OCR 结果只是派生层
- diagram / spatial extraction 也是派生层

下游任何最终结论都必须能回溯到原图。

### 10.2 视觉层可以抽什么

视觉层可以抽：

- `diagram_present`
- `diagram_type`
- 坐标轴标签
- 曲线 / 点 / 角 / 线段 / 区域
- 已知量
- 变量与符号位置
- 图文对齐证据

### 10.3 视觉层不单独决定什么

视觉层不单独决定：

- 最终 syllabus 节点
- 最终 topic 标签
- 最终 family 归属

这些结论必须由 `AO worker` 结合结构化证据和 syllabus 规则来完成。

### 10.4 含图题必须进入更严格 QA bucket

建议在 manifest 或结果表里至少显式标记：

- `diagram_present`
- `vision_complexity`
- `requires_review`

含图题的抽检比例应高于纯文字题。

## 11. State / Region / Provenance 契约

### 11.1 OpenAI-compatible 调用按无状态处理

这条 pipeline 不依赖服务端隐藏会话记忆。

所有多轮上下文必须由 orchestrator 自己维护与回放。对工程实现而言，应将这条调用链视为：

- request-scoped
- stateless
- fully replayable

### 11.2 每个 pipeline run 绑定单一 region

wave 1 必须冻结一条规则：

- 同一批 manifest / 同一轮 backfill / 同一轮 gate replay，不混用多个 region

必须记录：

- `region`
- `base_url`
- `api_key_scope`
- `data_residency_note`

如果后续需要跨区，只能通过显式的分批 run 来完成，不能在同一批次里隐式混跑。

### 11.3 provenance 是一等产物

每次模型调用都必须能追溯：

- 用了哪个模型
- 哪个地区
- 哪个 prompt 模板
- 哪个输入文件
- 哪个 schema 版本
- 哪条 route 决定了这次调用

没有 provenance，就没有可信的 replay。

## 12. 成本、吞吐与容量判断

### 12.1 不把 `qwen3.6-plus` 简化成“最该避免的贵模型”

这版文档不再用“因为它更贵，所以尽量别用”来定义 `qwen3.6-plus`。

更准确的判断是：

- 模型选择首先由任务边界决定
- 容量瓶颈受 `RPM / TPM`、图像 token 体积、route mix、并发策略共同影响
- `qwen3.6-plus` 虽然不该接管整条主线，但它也不是默认最该避免的层

### 12.2 工程上的真正控制点

这一阶段更应盯住：

- 图像输入体积
- OCR lane 并发
- diagram lane 命中率
- review lane 命中率
- 冲突样本比例
- 每题平均调用次数

这是比单看“哪个模型更大”更真实的成本控制面。

## 13. 为什么不选其他路线

### 13.1 不选“`qwen3.6-plus` 一把梭”

问题不是它不够强，而是它会把：

- 视觉观察
- 逻辑判断
- 最终定性

混成一次输出，导致错误难定位、真值难审计。

### 13.2 不选“`qwen3-vl-plus` 作为所有复杂题的默认总入口”

它在 `diagram / spatial / parsing` 上有清晰价值，但不应被定义成所有复杂题都先过一下的通用层。

否则仍然会把路由做成伪线性流水线，而不是 task-based system。

### 13.3 不选“从 PDF 整卷开始做整体理解”

这波恢复工作的前提是：

- 单题图像已经存在

因此不应先把问题升级成：

- PDF 切题
- 全卷结构重建
- 页间边界恢复

那会把当前问题从“题目资产恢复”错误膨胀成“整卷理解系统重建”。

## 14. 最终结论

这次 `9709` 题库恢复不采用“一个大模型包打天下”的路线。

正式冻结的 `v1.1` 结论是：

- `manifest router` 先做任务识别
- `qwen-vl-ocr` 做基础 OCR / formula / layout extraction
- `qwen3-vl-plus` 做 diagram / spatial / object-grounding / parsing specialist
- `qwen3.6-plus` 做 general multimodal judge / reviewer
- `AO worker` 做尽可能多的逻辑判断与最终裁决
- 所有 machine-consumable 输出一律 `enable_thinking=false + json_object`
- `AO` 默认消费结构化证据，原图按需 lazy attach

这条路线最符合当前目标：

- 保住图片识别能力
- 把逻辑主权留在 `AO`
- 让 route、schema、region、provenance 都可追溯
- 为高质量、强考纲绑定、可审计的题库资产建设打底

## 15. 参考资料

- 阿里云百炼 `Qwen-VL` OpenAI 兼容接口与模型列表：<https://help.aliyun.com/zh/model-studio/qwen-vl-compatible-with-openai>
- 阿里云百炼 `Qwen-OCR` 说明：<https://help.aliyun.com/zh/model-studio/qwen-vl-ocr>
- 阿里云百炼 `Qwen-OCR API` 参考：<https://help.aliyun.com/zh/model-studio/qwen-vl-ocr-api-reference>
- 阿里云百炼 `Qwen3.6` 图像 / 视频理解：<https://help.aliyun.com/zh/model-studio/vision>
- 阿里云百炼视觉推理与 `enable_thinking`：<https://help.aliyun.com/zh/model-studio/visual-reasoning>
- 阿里云百炼 OpenAI-compatible Chat Completions：<https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions>
- 阿里云百炼限流说明：<https://help.aliyun.com/zh/model-studio/rate-limit>
- 百炼模型大全：<https://help.aliyun.com/zh/model-studio/models>
- `Qwen3-VL` 官方 GitHub：<https://github.com/QwenLM/Qwen3-VL>
