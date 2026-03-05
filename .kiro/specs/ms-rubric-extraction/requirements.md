# 需求文档：Mark Scheme 结构化提取（B1 Rubric 数据层）

## 简介

本功能为 CIE-Copilot Phase 1 路线图中的 B1 里程碑。目标是从 CIE A-Level Mark Scheme 题目截图（`paper_assets.asset_type='ms_question_img'`）中提取结构化评分点（rubric points），构建可审计、可重跑、可供 B2 直接消费的 `rubric_points` 数据层，并为 B3 自动错题录入闭环提供稳定标识。

提取流程采用两阶段策略：
1. VLM 阶段仅输出文本依赖标签（如 `["M1"]`）。
2. 解析阶段将文本标签解析为 `rubric_id`（UUID）。

## 目标与边界

### In Scope

- MS 截图任务队列、并发领取、重试与监控
- VLM 结构化提取、解析与持久化
- 依赖解析（unresolved/ambiguous/cycle 明确落库）
- B2 输入契约发布门禁（仅 `ready` 数据可消费）
- QC 抽检与上线阈值
- B3 闭环所需字段的接口级准备（不含 B3 自动写入实现）

### Out of Scope

- B2 算法改动（`sla_align_v0.py` / `adjudicator_v0.py` 逻辑不在本里程碑内）
- B3 自动写入 `user_errors` 的业务编排与前端行为

## 术语表

- **Rubric_Extractor**: 从 MS 截图提取 rubric points 的批处理系统
- **Dependency_Resolver**: 将 `depends_on_labels` 解析为 `depends_on` UUID 的后处理器
- **QC_Sampler**: 质量抽检与报告生成器
- **Mark_Label**: 评分标记，格式如 `M1/A1/B1`
- **Kind**: 评分类型，取值 `M/A/B`
- **FT_Mode**: follow-through 模式，默认 `none`
- **Storage_Key**: 资产存储键，对应 `paper_assets.storage_key`
- **Point_Fingerprint**: 评分点业务指纹，用于幂等去重
- **Ready_Data**: 依赖解析完成且无歧义、无环、无未解析标签的可发布数据

## 上下游契约快照

- B2 `sla_align_v0.py` 需要：`rubric_id`, `mark_label`, `description`
- B2 `adjudicator_v0.py` 需要：`rubric_id`, `mark_label`, `kind`, `depends_on`, `marks`
- B3 闭环最低需要：`storage_key`, `q_number`, `subpart`, `rubric_id`, `mark_label`, `source_version`

## 需求

### 需求 1：MS 任务队列与并发领取

**用户故事：** 作为数据工程师，我希望有专用 MS 提取任务队列，并支持原子并发领取和过期回收，以便稳定批量处理。

#### 验收标准

1. THE Rubric_Extractor SHALL 提供 `vlm_ms_jobs` 表，字段至少包括：
   - `job_id`(UUID PK), `storage_key`, `sha256`, `paper_id`, `syllabus_code`, `session`, `year`, `paper`, `variant`, `q_number`, `subpart`
   - `extractor_version`, `provider`, `model`, `prompt_version`
   - `status`, `attempts`, `last_error`, `locked_by`, `locked_at`, `created_at`, `updated_at`
2. THE Rubric_Extractor SHALL 仅从 `paper_assets` 中筛选 `asset_type='ms_question_img'` 建立任务。
3. THE Rubric_Extractor SHALL 保证 `vlm_ms_jobs` 的唯一键为：
   - `(storage_key, sha256, extractor_version, provider, model, prompt_version)`
4. WHEN 任务被领取时，THE Rubric_Extractor SHALL 使用 `SELECT ... FOR UPDATE SKIP LOCKED` 原子将任务置为 `running`，并执行 `attempts = attempts + 1`。
5. IF `running` 任务超过 `stale_timeout_seconds` 未更新 `locked_at`，THEN THE Rubric_Extractor SHALL 允许回收重领。
6. WHILE 任务处于 `running`，THE Rubric_Extractor SHALL 以 `heartbeat_seconds` 周期刷新 `locked_at`，避免长任务被误回收。
7. THE Rubric_Extractor SHALL 支持 `--status pending,error,running_stale` 指定可领取状态集合。

### 需求 2：VLM 调用与响应解析

**用户故事：** 作为数据工程师，我希望 VLM 输出稳定结构化 JSON，并在异常时有明确重试与失败语义。

#### 验收标准

1. WHEN 处理单个 MS 截图时，THE Rubric_Extractor SHALL 调用 DashScope API（qwen-vl 系列）并附带结构化 JSON schema prompt。
2. THE Rubric_Extractor SHALL 从响应中提取每个评分点字段：
   - `mark_label`, `description`, `marks`, `depends_on_labels`, `ft_mode`, `expected_answer_latex`
3. WHEN 响应被 markdown code block 包裹，THE Rubric_Extractor SHALL 可解析代码块内 JSON。
4. IF 遇到 HTTP 429 或可重试 5xx 错误，THEN THE Rubric_Extractor SHALL 采用指数退避（base=2s, 带 jitter）最多重试 5 次。
5. IF 响应无法解析成合法 JSON，THEN THE Rubric_Extractor SHALL 将任务设为 `error` 并写入可检索错误码（如 `json_parse_failed`）。
6. THE Rubric_Extractor SHALL 为每个评分点生成 `confidence`（0.0-1.0）；若模型未返回置信度，系统 SHALL 使用可复现规则计算并记录 `confidence_source='heuristic'`。
7. THE Rubric_Extractor SHALL 保留原始模型响应 `raw_json` 与 `response_sha256` 以支持审计与回放。

### 需求 3：Rubric 数据模型与幂等持久化

**用户故事：** 作为数据工程师，我希望评分点表可重跑、可追溯、可区分历史版本，且不会因重排导致重复数据。

#### 验收标准

1. THE Rubric_Extractor SHALL 提供 `rubric_points` 表，字段至少包括：
   - 标识与定位：`rubric_id`(UUID PK), `storage_key`, `paper_id`, `q_number`, `subpart`, `step_index`
   - 核心内容：`mark_label`, `kind`, `description`, `marks`, `depends_on_labels`(TEXT[]), `depends_on`(UUID[]), `ft_mode`, `expected_answer_latex`
   - 质量与状态：`confidence`, `status`, `parse_flags`(JSONB)
   - 审计与版本：`source`, `run_id`, `extractor_version`, `provider`, `model`, `prompt_version`, `raw_json`, `response_sha256`, `point_fingerprint`, `created_at`, `updated_at`
2. THE Rubric_Extractor SHALL 根据 `mark_label` 首字母推导 `kind`（`M/A/B`）；非法 label 必须置 `status='needs_review'`。
3. WHEN 未检测到明确 follow-through 证据时，THE Rubric_Extractor SHALL 将 `ft_mode='none'`。
4. THE Rubric_Extractor SHALL 使用 `point_fingerprint` 做幂等（而非依赖 `step_index`）；`step_index` 仅用于排序和近邻解析。
5. THE Rubric_Extractor SHALL 提供唯一约束，至少覆盖：
   - `storage_key`, `q_number`, `coalesce(subpart,'')`, `point_fingerprint`, `extractor_version`, `provider`, `model`, `prompt_version`
6. WHEN 同一题目同版本重复执行，THE Rubric_Extractor SHALL 通过 upsert 保证不产生语义重复评分点。
7. THE Rubric_Extractor SHALL 在单事务内完成：
   - `rubric_points` upsert
   - 对应 `vlm_ms_jobs` 状态更新（`done/error`）

### 需求 4：两阶段依赖解析与状态机

**用户故事：** 作为数据工程师，我希望依赖关系可解释、可追踪，所有不确定性都能显式落库。

#### 验收标准

1. THE Dependency_Resolver SHALL 在题目范围内解析依赖，范围键为：
   - `(storage_key, q_number, coalesce(subpart,''), extractor_version, provider, model, prompt_version)`
2. WHEN label 成功匹配，THE Dependency_Resolver SHALL 写入 `depends_on`（UUID[]）。
3. IF label 无匹配，THEN THE Dependency_Resolver SHALL：
   - 将当前评分点 `status='needs_review'`
   - 在 `parse_flags.unresolved_labels` 记录未解析标签列表
4. IF 同题存在重复 `mark_label` 且匹配不唯一，THEN THE Dependency_Resolver SHALL：
   - 按最近前序 `step_index` 规则匹配
   - 若仍歧义，则置 `status='needs_review'` 并记录 `parse_flags.ambiguous_candidates`
5. THE Dependency_Resolver SHALL 检测依赖环；若出现环，相关点 SHALL 置 `status='needs_review'` 并写入 `parse_flags.cycle=true`。
6. THE Dependency_Resolver SHALL 支持独立重跑，不依赖重新调用 VLM。
7. THE Rubric_Extractor SHALL 使用以下状态机：
   - 初始：`draft`
   - 解析成功且无异常：`ready`
   - 任一 unresolved/ambiguous/cycle/label_invalid：`needs_review`

### 需求 5：B2 输入契约与发布门禁

**用户故事：** 作为评分引擎维护者，我希望 B2 只消费可发布数据，避免隐性脏数据影响评分。

#### 验收标准

1. THE Rubric_Extractor SHALL 提供只读发布视图 `rubric_points_ready_v1`（或等价查询），仅暴露 `status='ready'` 记录。
2. THE 发布视图 SHALL 至少包含 B2 所需字段：
   - `rubric_id`, `mark_label`, `description`, `kind`, `depends_on`, `marks`
3. THE 发布视图 SHALL 保证 `depends_on` 内所有 UUID 在同题范围存在。
4. THE 发布过程 SHALL 包含契约校验脚本，验证输出可被：
   - `scripts/marking/sla_align_v0.py`
   - `scripts/marking/adjudicator_v0.py`
   直接消费。
5. IF 契约校验失败，THEN 发布 SHALL 失败并输出失败样本列表。

### 需求 6：质量抽检与上线阈值

**用户故事：** 作为数据工程师，我希望有可复现的抽检与硬阈值，确保上线质量可量化。

#### 验收标准

1. WHEN 执行 QC 时，THE QC_Sampler SHALL 使用分层抽样（按 `syllabus_code/session/paper`），样本数为 `max(80, ceil(0.05 * ready_rows))`。
2. THE QC_Sampler SHALL 计算并报告以下指标：
   - `mark_label_accuracy = correct_label / sampled_points`
   - `dependency_resolution_rate = resolved_edges / total_dependency_edges`
   - `needs_review_rate = needs_review_points / total_points`
   - `ft_default_compliance = points_with_ft_none_without_evidence / points_without_ft_evidence`
3. THE 上线阈值 SHALL 为：
   - `mark_label_accuracy >= 0.90`
   - `dependency_resolution_rate >= 0.95`
   - `needs_review_rate <= 0.20`
   - `ft_default_compliance = 1.00`
4. WHEN QC 完成，THE QC_Sampler SHALL 输出：
   - `docs/reports/b1_rubric_qc_report.md`
   - 报告中包含公式、样本分布、通过/失败结论、失败样本明细
5. IF 任一阈值未达标，THEN 结果 SHALL 标记为 `release_blocked`。

### 需求 7：批处理执行与可观测性

**用户故事：** 作为运维人员，我希望批处理支持并发、限流、干跑和成本统计，以便可控运行。

#### 验收标准

1. THE Rubric_Extractor SHALL 支持 CLI 参数：
   - `--workers`, `--max-jobs`, `--status`, `--stale-timeout-seconds`, `--heartbeat-seconds`, `--dry-run`
2. WHEN `--dry-run` 启用时，THE Rubric_Extractor SHALL 跳过 API 调用和数据库写入，仅输出预估处理计划。
3. WHEN 运行中每处理 10 个任务，THE Rubric_Extractor SHALL 输出进度日志（done/error/needs_review/rate）。
4. WHEN 运行结束，THE Rubric_Extractor SHALL 输出汇总统计：
   - `total_jobs`, `done`, `error`, `needs_review`, `api_calls`, `input_tokens`, `output_tokens`, `estimated_cost`
5. THE Rubric_Extractor SHALL 将失败详情写入结构化错误日志（含 `job_id`, `storage_key`, `error_code`, `error_message`）。

### 需求 8：数据库迁移与约束

**用户故事：** 作为平台维护者，我希望迁移可重复执行，且数据约束能在库层阻断脏数据。

#### 验收标准

1. THE Rubric_Extractor SHALL 通过 Supabase 迁移创建/变更 `vlm_ms_jobs` 与 `rubric_points`。
2. 迁移 SHALL 使用幂等写法（`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`）。
3. `rubric_points` SHALL 至少包含以下约束：
   - `kind IN ('M','A','B')`
   - `marks > 0`
   - `status IN ('draft','ready','needs_review')`
   - `mark_label` 满足正则 `^[MAB][0-9]+$`（不满足者由应用层置 `needs_review` 并记录）
4. THE 迁移 SHALL 创建关键索引：
   - `rubric_points(storage_key, q_number, subpart, status)`
   - `rubric_points(point_fingerprint)`
   - `vlm_ms_jobs(status, locked_at)`
5. WHEN 脚本重复运行，THE 系统 SHALL 只重试 `pending/error/running_stale` 任务，不重复处理 `done`。

### 需求 9：测试与 CI Gate

**用户故事：** 作为项目负责人，我希望 B1 具备可自动验证的测试门禁，避免回归。

#### 验收标准

1. THE Rubric_Extractor SHALL 提供单元测试覆盖至少以下场景：
   - markdown JSON 解析
   - 429/5xx 重试策略
   - `point_fingerprint` 幂等去重
   - unresolved/ambiguous/cycle 依赖解析
   - stale reclaim + heartbeat
2. THE Rubric_Extractor SHALL 提供集成测试，验证：
   - 任务领取到落库的完整事务路径
   - B2 契约字段可直接消费
3. CI SHALL 新增 B1 gate，要求：
   - 所有 B1 测试通过
   - QC 指标不低于需求 6 阈值
   - 迁移 dry-run 无错误

### 需求 10：B3 闭环接口准备（非实现）

**用户故事：** 作为后续 B3 开发者，我希望 B1 输出可直接映射错题闭环字段，减少跨模块返工。

#### 验收标准

1. THE Rubric_Extractor SHALL 在可发布数据中稳定提供：
   - `storage_key`, `q_number`, `subpart`, `rubric_id`, `mark_label`, `kind`, `source_version`
2. THE Rubric_Extractor SHALL 提供字段映射约定文档（写入 QC 报告附录）：
   - B2 `decision.reason` -> B3 `user_errors.metadata.decision_reason`
   - B2 `rubric_id` -> B3 `user_errors.metadata.rubric_id`
   - B2 运行标识 -> B3 `user_errors.metadata.run_id`
3. THE 文档 SHALL 明确：若 B3 采用“评分点级错题记录”，需调整当前 `user_errors(user_id, storage_key)` 唯一策略（此变更属于 B3 实施阶段）。
