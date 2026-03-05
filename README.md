# CIE Copilot

面向 CIE 学科场景的学习与评测平台，当前重点覆盖：
- RAG 搜索与问答
- 社区问答与声誉系统
- Phase1 评分链路（A1/B1/B2/B3）
- 资产与数据质量治理

## 当前基线（2026-02-16）

- 技术债执行主文档：`docs/reports/technical_debt_execution_plan_20260216.md`
- 执行进度日志：`docs/reports/technical_debt_execution_progress_20260216.md`
- 全仓审计汇总：`docs/audit/phase7_02_summary.md`
- 题目截图属于派生资产，不是可直接视为垃圾的临时文件。

## 目录结构（核心）

- `src/` 前端应用（React + Vite）
- `api/` 后端 API（社区、RAG、评分相关）
- `scripts/` 数据处理、门禁、迁移与治理脚本
- `supabase/migrations/` 唯一活跃迁移目录
- `tests/` 统一后的 Python 测试目录
- `docs/` 审计、报告、运行文档

## 环境要求

- Node.js >= 20
- npm >= 9
- Python >= 3.11
- 可访问 PostgreSQL/Supabase（本地或远端）

## 快速启动

1. 安装依赖

```bash
npm ci
python -m pip install -r requirements.txt
```

2. 配置环境变量

```bash
cp .env.example .env
```

3. 启动前端

```bash
npm run dev
```

4. 启动 API

```bash
npm run api:dev
```

## Phase1 门禁执行（本地）

详细运行说明见 `docs/setup/PHASE1_GATE_RUNBOOK.md`。

常用命令：

```bash
# A1
python scripts/evaluation/seed_a1_gate_fixture.py
python scripts/evaluation/run_a1_quality_gate.py --input tests/fixtures/a1_gate_audit_sample.csv --allow-remote

# B1
python scripts/ms/seed_b1_gate_fixture.py
python scripts/ms/b1_ci_gate.py

# B2
python scripts/evaluation/run_mark_engine_ci_gate.py --config config/marking_engine_v0.json --json-out docs/reports/b2_mark_engine_eval_ci_gate.json --report-out docs/reports/b2_mark_engine_quality_gate_ci.md

# B3
node scripts/phase1/run_evaluate_v1_smoke.js
python scripts/phase1/verify_auto_error_write.py
```

## 关键说明

- 不要在前端存放私钥（OpenAI/Supabase service role 等）。
- `database/migrations/` 已归档，新的迁移只能放在 `supabase/migrations/`。
- 如需执行全链路门禁，优先参考 CI workflow：`.github/workflows/phase1-e2e-gate.yml`。
