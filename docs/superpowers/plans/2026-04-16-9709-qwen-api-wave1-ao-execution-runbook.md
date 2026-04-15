# 9709 Qwen 官方 API Wave 1 AO 执行 Runbook Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 `9709` 数据恢复主计划之上，落地一条基于 Qwen 官方 API 的 wave 1 题目恢复流水线，使 `router -> OCR lane -> diagram/review lane -> AO aggregation -> gate replay` 可以在真实题目截图上稳定执行。

**Architecture:** 本计划是 [2026-04-15-9709-question-bank-data-recovery-and-gate-rerun.md](2026-04-15-9709-question-bank-data-recovery-and-gate-rerun.md) 的补充执行计划，不替代其 paper-backed 数据恢复目标。它把 [2026-04-15-9709-qwen-api-ao-vlm-architecture-design.md](../specs/2026-04-15-9709-qwen-api-ao-vlm-architecture-design.md) 的 `v1.1` 冻结结论落成工程步骤：先冻结 `route / schema / region / provenance`，再实现 `qwen-vl-ocr`、`qwen3-vl-plus`、`qwen3.6-plus` 三条 lane，最后由 `AO worker` 汇总结构化证据并回写 `question_bank` / analysis snapshots。

**Tech Stack:** Python 3, Node.js, DashScope OpenAI-compatible API, Supabase/Postgres, existing `scripts/vlm/*` pipeline, existing `scripts/learning/*` backfill flow, `pytest`, `jest`, `psql`, JSON manifests/reports.

---

## Why This Plan Exists

现有主计划已经把问题识别正确了：当前阻塞是 `9709` 数据姿态，不是 retrieval 代码缺失。

但主计划里的 `VLM descriptor recovery` 仍然是上一版抽象，尚未把下列 `v1.1` 架构约束落成工程执行面：

- `task-based router`
- `qwen-vl-ocr` / `qwen3-vl-plus` / `qwen3.6-plus` 的重新分工
- `enable_thinking=false + response_format=json_object` 的 machine-consumable 硬约束
- `state / region / provenance` 契约
- `AO` 默认只消费结构化证据、原图 lazy attach

因此需要一份专门的 AO runbook，把 wave 1 执行面写死。

## Dependency Order

这份 runbook 必须依附于以下两份文档执行：

1. [2026-04-15-9709-question-bank-data-recovery-and-gate-rerun.md](2026-04-15-9709-question-bank-data-recovery-and-gate-rerun.md)
2. [2026-04-15-9709-qwen-api-ao-vlm-architecture-design.md](../specs/2026-04-15-9709-qwen-api-ao-vlm-architecture-design.md)

执行顺序要求：

- 先完成主计划的 `Chunk 0 / Task 0-2`
- 再执行本 runbook 的 `Chunk 1-3`
- 最后回到主计划完成 paper-question recovery、topic backfill、gate rerun

## Scope Boundary

本计划 **会** 做：

- 冻结 `route / schema / region / provenance`
- 为 wave 1 增加 Qwen 官方 API router 和三条 lane
- 为 `AO` 汇总层建立结构化 evidence bundle
- 把 lane 输出接入现有 `question-analysis-backfill` 路径
- 产出 wave 1 的 QC 报告与 gate replay 证据

本计划 **不会** 做：

- 从 PDF 整卷重新切题
- 推翻现有 `question_descriptions_v0` 主表语义
- 在 wave 1 中引入 thinking-mode 直写主表
- 承诺全科目通用 orchestration
- 重写 retrieval API

## Planned Files

### Create

- `data/contracts/9709_qwen_wave1_router_contract_v1.json`
- `data/contracts/9709_qwen_wave1_output_contract_v1.json`
- `scripts/vlm/qwen_router_v1.py`
- `scripts/vlm/qwen_openai_client_v1.py`
- `scripts/vlm/qwen_lane_runner_v1.py`
- `tests/test_qwen_router_v1.py`
- `tests/test_qwen_openai_client_v1.py`
- `tests/test_qwen_lane_runner_v1.py`
- `scripts/learning/lib/question-evidence-bundle-v1.js`
- `scripts/learning/run_question_evidence_bundle_v1.js`
- `scripts/learning/__tests__/question-evidence-bundle-v1.test.js`
- `scripts/learning/__tests__/run-question-evidence-bundle-v1.test.js`
- `docs/reports/2026-04-16-9709-qwen-wave1-execution-report.md`

### Modify

- `data/manifests/9709_question_search_recovery_v1.json`
- `scripts/vlm/providers.py`
- `scripts/vlm/contracts.py`
- `scripts/vlm/create_jobs_from_manifest.py`
- `scripts/vlm/batch_process_v0.py`
- `scripts/vlm/qc_stats.py`
- `scripts/vlm/qc_vlm_spot_check.py`
- `scripts/learning/lib/question-analysis-backfill.js`
- `scripts/learning/run_question_analysis_backfill.js`
- `scripts/learning/__tests__/question-analysis-backfill.test.js`
- `scripts/learning/__tests__/run-question-analysis-backfill.test.js`
- `docs/reports/INDEX.md`

### Reference Only

- `scripts/vlm/create_jobs_v0.py`
- `scripts/vlm/run_extraction_v0.py`
- `scripts/vlm/db_utils.py`
- `scripts/vlm/submit_result_v0.py`
- `scripts/learning/lib/question-analysis-backfill.js`
- `scripts/evaluation/run_question_search_gate.js`
- `data/eval/question_search_gold_9709_v1.json`
- `data/eval/a1_topic_link_manual_audit_9709_p1p3_v1.csv`

## Execution Topology

wave 1 统一使用以下拓扑：

1. `manifest router`
2. `OCR lane`
3. `diagram / spatial lane`
4. `review lane`
5. `AO evidence bundle`
6. `question-analysis backfill`
7. `paper-question registry recovery`
8. `gate replay + report`

`AO worker` 不默认直接吃原图；只有在冲突、低置信度、diagram-heavy、gate-critical 情况下才 lazy attach 原图或 crop。

## Chunk 0: Preflight Alignment

### Task 0: Confirm this runbook is executing on top of the correct recovery baseline

**Files:**
- Modify: `docs/reports/2026-04-16-9709-qwen-wave1-execution-report.md`
- Reference: `docs/superpowers/plans/2026-04-15-9709-question-bank-data-recovery-and-gate-rerun.md`
- Reference: `docs/superpowers/specs/2026-04-15-9709-qwen-api-ao-vlm-architecture-design.md`

- [ ] **Step 1: Verify the current branch already contains the merged retrieval slice and the local v1.1 architecture doc**

Run: `rg --files | rg 'api/learning/questions/index.js|scripts/evaluation/run_question_search_gate.js|docs/superpowers/specs/2026-04-15-9709-qwen-api-ao-vlm-architecture-design.md'`
Expected: all required paths are present

- [ ] **Step 2: Verify that the main recovery manifest file is present or planned in this worktree**

Run: `test -f data/manifests/9709_question_search_recovery_v1.json || echo 'manifest-not-created-yet'`
Expected: either the file exists, or the output explicitly shows it still needs to be created under the main recovery plan

- [ ] **Step 3: Record in the execution report that this plan is a supplemental overlay, not a replacement**

Run: `git diff -- docs/reports/2026-04-16-9709-qwen-wave1-execution-report.md`
Expected: report states that the AO/Qwen runbook depends on the earlier recovery plan

## Chunk 1: Router And Contract Freeze

### Task 1: Freeze the router contract, output contract, and manifest route fields

**Files:**
- Create: `data/contracts/9709_qwen_wave1_router_contract_v1.json`
- Create: `data/contracts/9709_qwen_wave1_output_contract_v1.json`
- Modify: `data/manifests/9709_question_search_recovery_v1.json`
- Modify: `docs/reports/2026-04-16-9709-qwen-wave1-execution-report.md`

- [ ] **Step 1: Extend the recovery manifest with wave 1 route fields**

每个 manifest item 至少补齐：

- `route_hint`
- `diagram_present`
- `formula_dense`
- `table_heavy`
- `gate_critical`
- `requires_review`

- [ ] **Step 2: Write the router contract JSON schema**

Schema 至少约束：

- router 输入字段
- `ocr_lane` / `diagram_lane` / `review_lane` 三类路由结果
- `lazy_attach_original_image` 开关
- `region` / `base_url` / `api_key_scope`

- [ ] **Step 3: Write the output contract JSON schema**

Schema 至少约束：

- `model`
- `route`
- `prompt_template_version`
- `region`
- `input_asset_id`
- `input_asset_hash`
- `response_schema_version`
- `confidence`
- `failure_reason`

- [ ] **Step 4: Add contract tests before implementing router code**

Run: `pytest tests/test_qwen_router_v1.py -q`
Expected: FAIL because router code and/or fixture contract has not been implemented yet

- [ ] **Step 5: Record the frozen contract versions in the execution report**

Run: `jq '.items[0]' data/manifests/9709_question_search_recovery_v1.json`
Expected: sample manifest row includes route metadata

### Task 2: Freeze the state, region, and non-thinking policy

**Files:**
- Modify: `docs/reports/2026-04-16-9709-qwen-wave1-execution-report.md`
- Reference: `docs/superpowers/specs/2026-04-15-9709-qwen-api-ao-vlm-architecture-design.md`

- [ ] **Step 1: Choose one wave 1 region and one base URL for the entire pilot run**
- [ ] **Step 2: Freeze the rule that all machine-consumable calls use `enable_thinking=false`**
- [ ] **Step 3: Freeze the rule that all machine-consumable calls use `response_format={"type":"json_object"}`**
- [ ] **Step 4: Freeze the rule that all multi-turn state is caller-managed, not service-managed**
- [ ] **Step 5: Write the chosen values into the execution report**

Run: `rg -n 'region|enable_thinking|json_object|stateless' docs/reports/2026-04-16-9709-qwen-wave1-execution-report.md`
Expected: all four policy surfaces are explicitly present

## Chunk 2: Qwen Router And Lane Runtime

### Task 3: Implement the router as an additive v1 script

**Files:**
- Create: `scripts/vlm/qwen_router_v1.py`
- Create: `tests/test_qwen_router_v1.py`
- Modify: `scripts/vlm/create_jobs_from_manifest.py`

- [ ] **Step 1: Write the failing router tests**

覆盖至少三类样本：

- 纯文字 / 公式题 -> `ocr_lane`
- 含图题 -> `diagram_lane`
- 冲突或 gate-critical -> `review_lane`

- [ ] **Step 2: Run the router tests to verify failure**

Run: `pytest tests/test_qwen_router_v1.py -q`
Expected: FAIL with missing module or missing route behavior

- [ ] **Step 3: Implement minimal router logic**

最低要求：

- 读取 manifest item
- 根据 route fields 产出 lane decision
- 标记是否需要 `lazy_attach_original_image`
- 输出带 provenance 的 route record

- [ ] **Step 4: Wire router output into manifest-driven job creation**

要求 `scripts/vlm/create_jobs_from_manifest.py` 至少支持：

- 从 manifest 读取 route metadata
- 为每个 job 写入 lane 信息
- 为后续 lane runner 留出 provider/model/prompt version 字段

- [ ] **Step 5: Re-run the router tests and a manifest dry-run**

Run: `pytest tests/test_qwen_router_v1.py -q`
Expected: PASS

Run: `python3 scripts/vlm/create_jobs_from_manifest.py --manifest data/manifests/9709_question_search_recovery_v1.json --dry-run`
Expected: prints job counts broken down by route

### Task 4: Implement the official API client and non-thinking lane runner

**Files:**
- Create: `scripts/vlm/qwen_openai_client_v1.py`
- Create: `scripts/vlm/qwen_lane_runner_v1.py`
- Create: `tests/test_qwen_openai_client_v1.py`
- Create: `tests/test_qwen_lane_runner_v1.py`
- Modify: `scripts/vlm/providers.py`
- Modify: `scripts/vlm/contracts.py`
- Modify: `scripts/vlm/batch_process_v0.py`

- [ ] **Step 1: Write the failing client and lane runner tests**

覆盖至少这些断言：

- 所有 machine-consumable 请求都强制 `enable_thinking=false`
- 所有 machine-consumable 请求都设置 `json_object`
- 每个 lane 都会带 provenance fields
- `qwen-vl-ocr` / `qwen3-vl-plus` / `qwen3.6-plus` 使用不同的 model route

- [ ] **Step 2: Run the failing Python tests**

Run: `pytest tests/test_qwen_openai_client_v1.py tests/test_qwen_lane_runner_v1.py -q`
Expected: FAIL with missing client or contract mismatch

- [ ] **Step 3: Implement a minimal DashScope OpenAI-compatible client**

最低要求：

- 支持指定 `base_url`
- 支持指定 `model`
- 支持图像输入
- 支持 `response_format`
- 支持 `enable_thinking`
- 支持 request-scoped provenance 输出

- [ ] **Step 4: Implement the three lane handlers**

最低要求：

- `ocr_lane` -> `qwen-vl-ocr`
- `diagram_lane` -> `qwen3-vl-plus`
- `review_lane` -> `qwen3.6-plus`

每条 lane 都必须输出 machine-consumable JSON，不允许自由文本直写主表。

- [ ] **Step 5: Keep v0 behavior intact while adding the v1 lane path**

要求：

- 不破坏现有 `batch_process_v0.py` 的旧调用面
- 新逻辑用显式 flag、wrapper 或新 entrypoint 接入
- 旧测试不应因 v1 新增而回归

- [ ] **Step 6: Re-run the focused tests**

Run: `pytest tests/test_qwen_openai_client_v1.py tests/test_qwen_lane_runner_v1.py -q`
Expected: PASS

## Chunk 3: AO Evidence Bundle And Backfill Integration

### Task 5: Build a dedicated evidence bundle layer for AO

**Files:**
- Create: `scripts/learning/lib/question-evidence-bundle-v1.js`
- Create: `scripts/learning/run_question_evidence_bundle_v1.js`
- Create: `scripts/learning/__tests__/question-evidence-bundle-v1.test.js`
- Create: `scripts/learning/__tests__/run-question-evidence-bundle-v1.test.js`

- [ ] **Step 1: Write the failing Jest tests for evidence bundle assembly**

测试至少覆盖：

- `AO` 默认只收到结构化证据
- 非冲突样本不附带原图
- conflict / low-confidence / gate-critical 样本触发 `lazy_attach_original_image`

- [ ] **Step 2: Run the failing Jest tests**

Run: `npm test -- --runInBand scripts/learning/__tests__/question-evidence-bundle-v1.test.js scripts/learning/__tests__/run-question-evidence-bundle-v1.test.js`
Expected: FAIL with missing module or missing bundle behavior

- [ ] **Step 3: Implement minimal evidence bundle assembly**

bundle 至少包含：

- `ocr_text`
- `formula_latex_list`
- `subquestion_blocks`
- `layout_hints`
- `diagram_present`
- `diagram_elements`
- `spatial_evidence`
- `route`
- `model provenance`
- `lazy_attach_original_image`

- [ ] **Step 4: Add a CLI entrypoint to materialize sample bundles for pilot rows**

Run: `node scripts/learning/run_question_evidence_bundle_v1.js --manifest data/manifests/9709_question_search_recovery_v1.json --dry-run`
Expected: prints bundle counts and lazy-attach counts

- [ ] **Step 5: Re-run the focused Jest tests**

Run: `npm test -- --runInBand scripts/learning/__tests__/question-evidence-bundle-v1.test.js scripts/learning/__tests__/run-question-evidence-bundle-v1.test.js`
Expected: PASS

### Task 6: Extend question-analysis backfill to consume evidence bundles instead of raw-question-only input

**Files:**
- Modify: `scripts/learning/lib/question-analysis-backfill.js`
- Modify: `scripts/learning/run_question_analysis_backfill.js`
- Modify: `scripts/learning/__tests__/question-analysis-backfill.test.js`
- Modify: `scripts/learning/__tests__/run-question-analysis-backfill.test.js`

- [ ] **Step 1: Write or update failing tests for evidence-aware backfill**

至少覆盖：

- backfill 可以消费 `analysisHints` 或 evidence bundle
- 非必要样本不要求原图
- gate-critical 样本保留 provenance 到 snapshot metadata

- [ ] **Step 2: Run the focused backfill tests**

Run: `npm test -- --runInBand scripts/learning/__tests__/question-analysis-backfill.test.js scripts/learning/__tests__/run-question-analysis-backfill.test.js`
Expected: FAIL on missing evidence-bundle handling

- [ ] **Step 3: Implement minimal evidence-aware backfill path**

要求：

- `AO` 决策输入优先来自 evidence bundle
- 原图只通过 lazy-attach 字段透传
- snapshot metadata 明确记录 route / model / region / prompt schema version

- [ ] **Step 4: Re-run the focused backfill tests**

Run: `npm test -- --runInBand scripts/learning/__tests__/question-analysis-backfill.test.js scripts/learning/__tests__/run-question-analysis-backfill.test.js`
Expected: PASS

## Chunk 4: QC, Replay, And Release Evidence

### Task 7: Add route-aware QC and spot-check coverage

**Files:**
- Modify: `scripts/vlm/qc_stats.py`
- Modify: `scripts/vlm/qc_vlm_spot_check.py`
- Modify: `docs/reports/2026-04-16-9709-qwen-wave1-execution-report.md`

- [ ] **Step 1: Extend QC outputs to break down counts by lane**
- [ ] **Step 2: Add explicit reporting for `diagram_present`, `requires_review`, and `lazy_attach_original_image`**
- [ ] **Step 3: Require a higher spot-check rate for diagram-heavy items**
- [ ] **Step 4: Run the QC scripts on the pilot manifest**

Run: `python3 scripts/vlm/qc_stats.py --help`
Expected: CLI still works and shows any new flags

Run: `python3 scripts/vlm/qc_vlm_spot_check.py --help`
Expected: CLI still works and shows any new flags

- [ ] **Step 5: Record per-lane QC counts in the execution report**

Run: `git diff -- docs/reports/2026-04-16-9709-qwen-wave1-execution-report.md`
Expected: report includes lane-aware counts and review buckets

### Task 8: Re-run the pilot on real data and capture release posture

**Files:**
- Modify: `docs/reports/2026-04-16-9709-qwen-wave1-execution-report.md`
- Modify: `docs/reports/INDEX.md`
- Reference: `scripts/evaluation/run_question_search_gate.js`

- [ ] **Step 1: Run the router and lane pipeline on the deterministic pilot manifest**

Run: `python3 scripts/vlm/qwen_lane_runner_v1.py --manifest data/manifests/9709_question_search_recovery_v1.json --max-jobs 20`
Expected: structured outputs written or submitted for all pilot rows with route breakdown

- [ ] **Step 2: Materialize AO evidence bundles for the same pilot**

Run: `node scripts/learning/run_question_evidence_bundle_v1.js --manifest data/manifests/9709_question_search_recovery_v1.json`
Expected: summary shows bundle counts, route counts, lazy-attach counts

- [ ] **Step 3: Run question-analysis backfill on the evidence-aware pilot**

Run: `node scripts/learning/run_question_analysis_backfill.js --force`
Expected: processed and backfilled counts printed with no schema error

- [ ] **Step 4: Re-run the existing question-search gate**

Run: `node scripts/evaluation/run_question_search_gate.js --fixture data/eval/question_search_gold_9709_v1.json --report docs/reports/2026-04-15-question-search-slice-v1-report.md`
Expected: outcome is either green or a truthful remaining-fail posture tied to named data gaps

- [ ] **Step 5: Write the final wave 1 execution report and index entry**

报告至少要包含：

- region / base_url
- lane counts
- model usage counts
- lazy-attach rate
- review rate
- gate result
- remaining fail reasons

Run: `git diff -- docs/reports/2026-04-16-9709-qwen-wave1-execution-report.md docs/reports/INDEX.md`
Expected: report and index entry are both present

## Exit Criteria

只有同时满足下列条件，这份 runbook 才算完成：

- router contract 与 output contract 已冻结
- machine-consumable 路径全部满足 `non-thinking + json_object`
- `OCR lane` / `diagram lane` / `review lane` 三条路都能产出结构化 JSON
- `AO` 默认只消费结构化 evidence bundle
- provenance 至少覆盖 `model / route / region / prompt_template_version / schema_version`
- wave 1 pilot 已经跑过一轮真实 gate replay
- 最终报告明确写出是 `green` 还是 truthful `failure posture`

Plan complete and saved to `docs/superpowers/plans/2026-04-16-9709-qwen-api-wave1-ao-execution-runbook.md`. Ready to execute?
