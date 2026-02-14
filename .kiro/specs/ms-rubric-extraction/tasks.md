# 实施计划：Mark Scheme 结构化提取（B1 Rubric 数据层）

## 概述

基于已批准的需求和设计文档，将 B1 里程碑拆分为增量编码任务。每个任务构建在前一任务之上，最终完成从数据库迁移到 QC 发布的完整链路。所有脚本使用 Python，测试使用 pytest + hypothesis。

## Tasks

- [x] 1. 数据库迁移：创建 vlm_ms_jobs、vlm_ms_runs 和 rubric_points 表
  - [x] 1.1 创建迁移文件 `supabase/migrations/YYYYMMDDHHMMSS_b1_rubric_extraction.sql`
    - 创建 `vlm_ms_jobs` 表（含唯一约束、状态 CHECK、索引）
    - 创建 `vlm_ms_runs` 表（run 审计记录）
    - 创建 `rubric_points` 表（含 kind/marks/status CHECK、唯一约束、索引）
    - 为 `rubric_points.run_id` 添加 FK 到 `vlm_ms_runs(run_id)`
    - 添加 `rubric_points` 表约束：`ft_mode` 枚举、`confidence` 范围、`confidence_source` 枚举
    - 添加 `ready` 状态下 `mark_label` 正则约束（`chk_rp_mark_label_ready`）
    - 创建表达式唯一索引 `uq_rp_scope_fingerprint_version`（含 `COALESCE(subpart,'')`）
    - 创建 `rubric_points_ready_v1` 只读视图
    - 在 `rubric_points_ready_v1` 输出 `source_version`
    - 使用幂等写法（IF NOT EXISTS）
    - _Requirements: 1.1, 3.1, 5.1, 5.2, 8.1, 8.2, 8.3, 8.4, 10.1_
  - [x] 1.2 编写迁移幂等性测试
    - **Property 31: 迁移幂等性**
    - **Validates: Requirements 8.2**
  - [x] 1.3 编写数据库约束测试
    - **Property 32: 数据库约束执行**
    - 测试 kind 非法值、marks<=0、status 非法值、ft_mode 非法值、confidence 越界被拒绝
    - 测试 `status='ready'` 且 `mark_label` 非法时被拒绝
    - **Validates: Requirements 8.3**

- [x] 2. 核心解析模块：MS Prompt 与响应解析
  - [x] 2.1 创建 `scripts/ms/ms_prompt.py`
    - 实现 `build_ms_prompt(job)` 构建 MS 专用 system/user prompt
    - 实现 `parse_ms_response(raw_text, job)` 解析 VLM 响应为评分点列表
    - 支持 markdown code block 包裹的 JSON
    - 实现 `derive_kind(mark_label)` 从首字母推导 kind
    - 实现 confidence 启发式填充逻辑
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 3.2, 3.3_
  - [x] 2.2 编写响应解析 property test
    - **Property 6: 响应解析完整性**
    - 使用 hypothesis 生成随机合法 rubric JSON（含/不含 code block）
    - **Validates: Requirements 2.2, 2.3**
  - [x] 2.3 编写 kind 推导 property test
    - **Property 11: kind 推导正确性**
    - 使用 hypothesis 生成随机 mark_label 字符串
    - **Validates: Requirements 3.2**
  - [x] 2.4 编写非法 JSON 错误处理单元测试
    - 测试各种非法输入（空字符串、纯文本、截断 JSON）
    - **Property 8: 非法 JSON 错误处理**
    - **Validates: Requirements 2.5**

- [x] 3. 持久化层：指纹计算与 upsert
  - [x] 3.1 创建 `scripts/ms/ms_persist.py`
    - 实现 `compute_point_fingerprint(mark_label, description, marks, depends_on_labels)`
    - 实现 `compute_response_sha256(raw_json)` 审计哈希
    - 实现 `persist_rubric_points(pool, job, points, run_id, raw_json, response_sha256)` 单事务 upsert
    - 初始 status='draft'
    - _Requirements: 2.7, 3.4, 3.5, 3.6, 3.7_
  - [x] 3.2 编写指纹 property test
    - **Property 12: 指纹确定性与抗碰撞**
    - **Validates: Requirements 3.4**
  - [x] 3.3 编写审计轨迹单元测试
    - 验证 response_sha256 与 raw_json 内容一致
    - **Property 10: 审计轨迹完整性**
    - **Validates: Requirements 2.7**

- [x] 4. Checkpoint - 确保解析与持久化模块测试通过
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 5. 任务队列：种子脚本与并发领取
  - [x] 5.1 创建 `scripts/ms/seed_ms_jobs.py`
    - 从 `paper_assets` 筛选 `asset_type='ms_question_img'` 生成任务
    - 使用 `ON CONFLICT DO NOTHING` 保证幂等
    - 支持 `--dry-run` 参数
    - _Requirements: 1.2, 1.3_
  - [x] 5.2 创建 `scripts/ms/ms_batch_process.py` 的任务领取部分
    - 实现 `MSConfig` dataclass（CLI 参数映射）
    - 实现 `claim_ms_job(pool, worker_id, config)` 使用 SELECT FOR UPDATE SKIP LOCKED
    - 实现 `heartbeat(pool, job_id, worker_id)` 刷新 locked_at
    - 实现 stale timeout 回收逻辑
    - 支持 `--status` 参数指定可领取状态集合
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 7.1_
  - [x] 5.3 编写种子过滤 property test
    - **Property 1: 任务种子过滤正确性**
    - **Validates: Requirements 1.2**
  - [x] 5.4 编写 CLI 配置解析 property test
    - **Property 27: CLI 配置解析**
    - **Validates: Requirements 7.1**
  - [x] 5.5 编写重跑跳过 done 任务 property test
    - **Property 33: 重跑跳过已完成任务**
    - **Validates: Requirements 8.5**

- [x] 6. VLM 调用与重试逻辑
  - [x] 6.1 创建 `scripts/ms/ms_vlm_call.py`
    - 实现 `call_ms_vlm(image_path, job, client, config)` 调用 DashScope API
    - 实现 `call_ms_vlm_with_retry(...)` 指数退避重试（base=2s, jitter, max 5 次）
    - 处理 HTTP 429 和 5xx 错误
    - _Requirements: 2.1, 2.4_
  - [x] 6.2 编写重试逻辑 property test
    - **Property 7: 可重试错误的退避重试**
    - 使用 mock 模拟 429 错误序列
    - **Validates: Requirements 2.4**

- [x] 7. Worker 循环与批处理主入口
  - [x] 7.1 完成 `scripts/ms/ms_batch_process.py` 的 worker 循环和 main 入口
    - 实现 `ms_worker_loop(worker_id, config, stats, pool, client, stop_event)`
    - 集成 claim -> VLM call -> parse -> persist 完整流程
    - 集成 `vlm_ms_runs`：启动创建 run 记录，结束写入 counts/status/error_summary
    - 实现 Stats 线程安全计数器（复用 batch_process_v0 模式）
    - 每 10 个任务输出进度日志
    - 运行结束输出汇总统计（total_jobs, done, error, needs_review, api_calls, tokens, cost）
    - 实现 dry-run 模式（跳过 API 和 DB）
    - 实现 SIGINT/SIGTERM 优雅关闭
    - 实现结构化错误日志（job_id, storage_key, error_code, error_message）
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 7.2 编写 dry-run 无副作用单元测试
    - **Property 28: Dry-run 无副作用**
    - **Validates: Requirements 7.2**
  - [x] 7.3 编写汇总统计 property test
    - **Property 29: 汇总统计完整性**
    - **Validates: Requirements 7.4**

- [x] 8. Checkpoint - 确保批处理器端到端可运行
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 9. 依赖解析器
  - [x] 9.1 创建 `scripts/ms/dependency_resolver.py`
    - 实现 `resolve_dependencies(pool, scope_key, dry_run)` 在题目范围内解析标签到 UUID
    - 实现精确匹配 + 最近前序 step_index 歧义消解
    - 实现 `detect_cycles(points)` 环检测
    - 处理 unresolved / ambiguous / cycle 三种失败模式
    - 更新 status: draft->ready 或 draft->needs_review
    - 支持独立重跑（不依赖 VLM）
    - 支持 CLI 入口（可按 syllabus_code/session/paper 过滤）
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  - [x] 9.2 编写未解析标签 property test
    - **Property 17: 未解析标签处理**
    - 使用 hypothesis 生成包含不存在标签的依赖图
    - **Validates: Requirements 4.3**
  - [x] 9.3 编写歧义标签 property test
    - **Property 18: 歧义标签处理**
    - 使用 hypothesis 生成包含重复 mark_label 的评分点集合
    - **Validates: Requirements 4.4**
  - [x] 9.4 编写环检测 property test
    - **Property 19: 依赖环检测**
    - 使用 hypothesis 生成包含环的依赖图
    - **Validates: Requirements 4.5**
  - [x] 9.5 编写依赖解析范围隔离单元测试
    - **Property 15: 依赖解析范围隔离**
    - **Validates: Requirements 4.1**

- [x] 10. B2 契约校验与发布门禁
  - [x] 10.1 创建 `scripts/ms/contract_validator.py`
    - 实现 `validate_b2_contract(pool)` 校验 ready 视图输出
    - 验证 B2 必需字段完整性（rubric_id, mark_label, description, kind, depends_on, marks）
    - 验证 B3 透传字段完整性（storage_key, q_number, subpart, source_version）
    - 验证 depends_on UUID 引用完整性
    - 失败时输出失败样本列表
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.1_
  - [x] 10.2 编写 Ready 视图契约 property test
    - **Property 21: Ready 视图契约**
    - **Validates: Requirements 5.1, 5.2, 10.1**
  - [x] 10.3 编写 depends_on 引用完整性 property test
    - **Property 22: depends_on 引用完整性**
    - **Validates: Requirements 5.3**

- [x] 11. QC 抽检器
  - [x] 11.1 创建 `scripts/ms/qc_sampler.py`
    - 实现分层抽样（按 syllabus_code/session/paper）
    - 样本数 = max(80, ceil(0.05 * ready_rows))
    - 计算四项指标：mark_label_accuracy, dependency_resolution_rate, needs_review_rate, ft_default_compliance
    - 阈值判定（accuracy>=0.90, resolution>=0.95, review<=0.20, ft_compliance=1.00）
    - 输出 `docs/reports/b1_rubric_qc_report.md`（含公式、样本分布、通过/失败结论、失败样本明细）
    - 包含 B3 字段映射约定附录
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 10.2, 10.3_
  - [x] 11.2 编写分层抽样大小 property test
    - **Property 24: 分层抽样大小**
    - **Validates: Requirements 6.1**
  - [x] 11.3 编写阈值判定 property test
    - **Property 26: 阈值通过/失败判定**
    - 使用 hypothesis 生成随机指标组合
    - **Validates: Requirements 6.3**
  - [x] 11.4 编写 QC 附录映射完整性测试
    - **Property 35: QC 报告附录映射完整性**
    - 验证附录包含 decision.reason/rubric_id/run_id/source_version 四条映射
    - **Validates: Requirements 10.2**

- [x] 12. Checkpoint - 确保所有模块集成测试通过
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 13. 集成测试与 CI Gate
  - [x] 13.1 编写端到端集成测试 `test/test_ms_integration.py`
    - 测试任务领取到落库的完整事务路径
    - 测试 B2 契约字段可直接被 sla_align_v0 / adjudicator_v0 消费
    - 测试迁移 dry-run 无错误
    - _Requirements: 9.1, 9.2_
  - [x] 13.2 更新 CI 配置添加 B1 gate
    - 所有 B1 测试通过
    - QC 指标不低于需求 6 阈值
    - 迁移 dry-run 无错误
    - gate 失败时输出产物：`docs/reports/b1_rubric_qc_report.md`, `runs/ms/b1_contract_failures.json`, `runs/ms/b1_gate_summary.json`
    - _Requirements: 9.3_
  - [x] 13.3 编写 CI gate 阻断行为测试
    - **Property 36: B1 CI Gate 阻断行为**
    - 验证测试失败/QC release_blocked/迁移失败任一触发时 gate 必失败
    - **Validates: Requirements 9.3**

- [x] 14. 最终 Checkpoint - 全部测试通过，B1 里程碑完成
  - 确保所有测试通过，如有问题请向用户确认。

## 备注

- 标记 `*` 的子任务为可选，可跳过以加速 MVP
- 每个任务引用具体需求编号以保证可追溯性
- Checkpoint 确保增量验证
- Property test 验证通用正确性属性，unit test 验证具体示例和边界情况
