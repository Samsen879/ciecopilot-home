# B1 完成任务报告（生产就绪评审）

## 1. 基本信息

- 里程碑：B1 Mark Scheme 结构化提取（rubric_points 数据层）
- 报告时间：2026-02-15
- 分支：`integrate/20260120`
- 代码提交：`df0a471a`
- 报告范围：B1 数据层、批处理、门禁、QC、B2 契约校验、CI 流程

## 2. 目标与结论

### 目标

将 B1 从“可运行原型”提升到“可落地生产门禁”：

1. CI Gate 必须硬阻断，不可软跳过
2. 迁移检查必须真实执行，不是文本校验
3. B2 契约必须纳入 gate
4. QC 必须在真实 DB 数据上执行并阈值阻断
5. worker 需具备 heartbeat、结构化错误落盘、合理统计口径

### 结论

B1 当前版本已达到“可投入生产门禁”的最低要求，且本地完整 gate 已跑通（四段全部 PASS）：

- tests: PASS
- migration: PASS
- contract: PASS
- qc: PASS

证据文件：

- `runs/ms/b1_gate_summary.json`
- `docs/reports/b1_rubric_qc_report.md`

## 3. 本次交付清单

### 核心实现

- `scripts/ms/b1_ci_gate.py`
  - gate 升级为 4 段硬门禁：`tests + migration + contract + qc`
  - 无 DB 时不再默认通过
  - 迁移改为真实执行 SQL 并验证关键关系存在

- `.github/workflows/b1-rubric-extraction-gate.yml`
  - 新增 `postgres` service
  - 统一注入 `DATABASE_URL`
  - 在 gate 前执行 fixture seed，确保 contract/QC 在非空 ready 数据上执行

- `scripts/ms/seed_b1_gate_fixture.py`
  - 新增确定性、幂等 gate fixture 脚本
  - 自动应用 B1 migration 并插入最小 ready 样本

- `scripts/ms/ms_batch_process.py`
  - 接入 job 级 heartbeat 后台循环，防 stale 误回收
  - 修复 `needs_review` 统计口径
  - 增加 JSONL 结构化错误落盘（默认 `runs/ms/ms_worker_errors.jsonl`）

- `scripts/ms/qc_sampler.py`
  - 修复抽样 SQL join：补齐版本维度
  - 避免多版本数据并存导致样本污染/重复计数

- `scripts/ms/ms_persist.py`
  - mark_label 严格正则校验（`^[MAB]\d+$`）
  - 非法 label 统一落 `needs_review + parse_flags.label_invalid`

- `scripts/ms/contract_validator.py`
  - 修复 `depends_on` 兼容性：支持驱动返回 Postgres 数组字面量（如 `'{}'`）

### 测试补强

- `test/test_ms_ci_gate_pbt.py`
- `test/test_ms_qc_sql_join.py`
- `test/test_ms_worker_loop.py`
- `test/test_ms_persist.py`
- `test/test_ms_contract_depends_on_parse.py`

## 4. 验收结果（本地实测）

### 执行方式

```powershell
$env:DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:54322/postgres'
.\.venv\Scripts\python.exe scripts/ms/seed_b1_gate_fixture.py
.\.venv\Scripts\python.exe scripts/ms/b1_ci_gate.py
```

### 结果

- Gate 最终状态：`PASSED`
- `tests`：`295 passed`
- `migration`：PASS
- `contract`：PASS
- `qc`：PASS（`release_ok`）

详见：`runs/ms/b1_gate_summary.json`

## 5. 关键问题闭环（相对前一版）

1. CI gate 软跳过 QC -> 已改为硬门禁
2. migration 文本检查 -> 已改为真实执行
3. contract 未纳入 gate -> 已纳入
4. heartbeat 未接线 -> 已接入 worker
5. needs_review 统计失真 -> 已修复
6. QC 跨版本 join 污染 -> 已修复
7. depends_on 驱动格式兼容问题 -> 已修复

## 6. 生产上线建议

1. 在 staging 先跑一次真实数据批处理（非 fixture）：
   - `seed_ms_jobs.py` -> `ms_batch_process.py` -> `dependency_resolver.py` -> `b1_ci_gate.py`
2. 对 `runs/ms/ms_worker_errors.jsonl` 配置日志采集（便于排障）
3. 将本次 gate 作为 B1 合并与发布的必过检查，不允许手工绕过

## 7. 对 B3 的影响

B1 目前已具备支撑 B3 自动错题录入闭环的数据前提：

- 稳定可发布字段（`rubric_id`, `mark_label`, `source_version` 等）
- 质量门禁与契约校验已上线
- 版本维度与审计字段可追溯

B3 可在此基础上进入“真实数据流打通”实施阶段。
