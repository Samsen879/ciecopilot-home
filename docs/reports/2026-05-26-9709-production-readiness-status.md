# 9709 数学题库 production-readiness 当前状态报告

日期: 2026-05-26

## Scope

本报告回答一个问题: 当前 `9709` 数学题库构建到底推进到哪里，距离当前 repo inventory 中的 `9709` 全量 parseable question rows 达到 production-ready 还差多少工作。

本报告基于 repo truth，不把聊天记录或 AO 元数据当作最终事实。主要输入:

- full scale-out inventory: `docs/reports/2026-05-04-9709-full-scaleout-inventory.json`
- full scale-out manifest: `data/manifests/9709_full_scaleout_manifest_v1.json`
- current scale-out plan: `docs/reports/2026-05-11-9709-scaleout-current-inventory-and-batch-plan.md`
- latest merged visual-stop PR: `#313`, merged into `main` at `0fe8637615685b22348d8412bb96beffe9e604ee`
- shard-scoped `production-ready.md`, `visual-review-stop.md`, DB coverage, search gate, and release preflight reports under `docs/reports/`

术语边界:

- `targeted q01-q15 probe slots = 5400` 是 locator 探测包络，不等于真实印刷题目总数。
- 当前可执行的 full-scaleout production target 是 inventory 已定位的 `2935` 条 parseable question rows。
- `2465` 个 unresolved probe slots 不是 production-ready 缺口本身；如果未来要把 q01-q15 探测包络也审计到底，需要单独做 locator/printed-question audit。
- 当前流程仍然是有人在环的脚本化执行流程，不是全自动题库构建。

## Executive Status

截至本报告，`9709` 题库不是全量 production-ready。

当前 repo truth 是:

| Category | Shards | Rows | PDFs | Status |
|---|---:|---:|---:|---|
| shard-scoped production-ready | 10 | 1205 | 114 | 已完成闭环 |
| extracted/evidence-built but visual-stop | 2 | 62 | 6 | 水印遮挡导致不能继续 downstream |
| not started in scale-out execution | 24 | 1668 | 240 | 还未进入 shard 闭环 |
| total current parseable inventory | 36 | 2935 | 360 | 当前 full-scaleout target |

因此，按当前 `2935` 条 parseable rows 口径:

- 已 production-ready: `1205 / 2935` rows, 约 `41.1%`
- 未 production-ready: `1730 / 2935` rows, 约 `58.9%`
- 距离当前 full-scaleout production-ready 至少还差: `1730` rows, `246` PDFs, `26` shard-level closeouts or blocker resolutions

## 已经 production-ready 的部分

当前 production-ready 只允许按 shard 声明，不能外推为全量。已完成的 10 个 shard 是:

| Shard | Rows | PDFs | Evidence |
|---|---:|---:|---|
| `p1_m_standard_001` | 85 | 8 | `docs/reports/2026-05-04-9709-p1-m-standard-001-production-ready.md` |
| `p1_s_standard_001` | 259 | 24 | `docs/reports/2026-05-07-9709-p1-s-standard-001-production-ready.md` |
| `p1_w_standard_001` | 228 | 21 | `docs/reports/2026-05-10-9709-p1-w-standard-001-production-ready.md` |
| `p3_m_standard_001` | 83 | 8 | `docs/reports/2026-05-05-9709-p3-m-standard-001-production-ready.md` |
| `p3_s_standard_001` | 246 | 24 | `docs/reports/2026-05-09-9709-p3-s-standard-001-production-ready.md` |
| `p3_w_standard_001` | 219 | 21 | `docs/reports/2026-05-10-9709-p3-w-standard-001-production-ready.md` |
| `p1_m_watermarked_001` | 12 | 1 | `docs/reports/2026-05-12-9709-p1-m-watermarked-001-production-ready.md` |
| `p3_m_watermarked_001` | 10 | 1 | `docs/reports/2026-05-15-9709-p3-m-watermarked-001-production-ready.md` |
| `p1_s_watermarked_001` | 33 | 3 | `docs/reports/2026-05-15-9709-p1-s-watermarked-001-production-ready.md` |
| `p3_s_watermarked_001` | 30 | 3 | `docs/reports/2026-05-16-9709-p3-s-watermarked-001-production-ready.md` |

这些 shard 已完成的闭环包括:

1. PDF page-chain extraction。
2. screenshot/review-crop index 与 evidence bundle。
3. warning disposition 或 human visual disposition。
4. authority sidecar，只映射到已有 seeded topic paths，不新增 syllabus node，不发明 prompt text。
5. registry backfill 与 analysis hydration。
6. DB coverage proof。
7. question search gate。
8. release preflight。
9. shard-scoped production-ready closeout。

## 已抽取但停止的部分

当前有 2 个 shard 已完成 extraction/evidence，但不能继续进入 authority/write-back/release，因为 targeted high-resolution visual review 发现水印遮挡题目内容。

| Shard | Rows | PDFs | Extraction status | Stop reason | Evidence |
|---|---:|---:|---|---|---|
| `p1_w_watermarked_001` | 32 | 3 | page-chain passed, evidence bundles `32/32` | `WM_9709_w19_qp_11` q07-q11 红色水印遮挡题干、图像区域或分值 | `docs/reports/2026-05-25-9709-p1-w-watermarked-001-visual-review-stop.md` |
| `p3_w_watermarked_001` | 30 | 3 | page-chain passed, evidence bundles `30/30` | targeted review 30 个 crop stack 中 29 个 rejected，多数为水印遮挡题干、公式、图像相关文字、分值或续页内容 | `docs/reports/2026-05-26-9709-p3-w-watermarked-001-visual-review-stop.md` |

这 62 条 row 不是 extraction 缺口，而是 source-quality/blocker 缺口。它们要达到 production-ready，下一步不是人工强行接受，而是:

1. 找到 non-occluding source PDF/pages，或明确把对应 source/shard park 为 not production-ready。
2. 替换 source 后重跑 page-chain、review crops、evidence bundles。
3. 重新做 targeted visual review 与 human visual disposition。
4. 只有全部 review-required items 被接受后，才能继续 authority sidecar、registry backfill、analysis hydration、DB coverage、search gate、release preflight。

## 还没开始的部分

剩余 24 个 shard、1668 rows、240 PDFs 还没有进入当前 scale-out 闭环。

### P2/P4 mechanics: 845 rows, 120 PDFs

| Shard group | Rows | PDFs | Current status | Extra production blocker |
|---|---:|---:|---|---|
| P2/P4 standard | 745 | 106 | not started | mechanics authority and release coverage not yet proven |
| P2/P4 watermarked | 100 | 14 | not started | mechanics release coverage plus watermark visual risk |

这些 shard 不能照搬 P1/P3 的 production-ready 结论。即使 extraction 和 evidence 通过，也还需要 mechanics 题型的 authority coverage、classifier/search/release-scope policy 明确通过。

### P5/P6 statistics: 823 rows, 120 PDFs

| Shard group | Rows | PDFs | Current status | Extra production blocker |
|---|---:|---:|---|---|
| P5/P6 standard | 728 | 106 | not started | outside current release scope |
| P5/P6 watermarked | 95 | 14 | not started | outside current release scope plus watermark visual risk |

P5/P6 当前应先按 evidence-ready 或 analysis-backfilled 目标推进。要宣称 production-ready，需要额外 release-scope 决策，把 statistics family 的 scoring/search/classifier posture 明确纳入 release contract。

## 距离全量 production-ready 还差什么

按当前 `2935` parseable rows 口径，剩余工作可以拆成 5 类。

### 1. Winter P1/P3 watermarked source remediation

规模: `62` rows, `6` PDFs, `2` shards。

这是最靠近完成的缺口，但不是简单人工确认问题。现有 targeted review 已经记录明确遮挡，必须换 source 或 park。完成后仍要重跑完整 downstream gate。

### 2. P2/P4 mechanics scale-out

规模: `845` rows, `120` PDFs, `12` shards。

这是最大的一块 release-scope 风险。需要跑同样的 page-chain/evidence/authority/backfill/gate 闭环，但 production-ready 的判断还要增加 mechanics release contract: 不能只说题目已抽取，还要证明 mechanics topic authority、search/classifier、release preflight 的行为可发布。

### 3. P5/P6 statistics scale-out

规模: `823` rows, `120` PDFs, `12` shards。

这一块当前明确在 outside-current-release-scope。可以先产出截图、evidence、analysis 与 DB coverage，但 full production-ready 还需要单独的 P5/P6 release-scope promotion 决策。

### 4. 全局 authority 与 syllabus governance

当前已完成 shard 使用的是 shard-scoped authority sidecar 和已有 seeded topic paths。全量 production-ready 还需要确认:

- 不新增未经审核的 syllabus node。
- `9709` canonical topic tree 与 boundary audit 的 pending human-review items 不会阻塞 P2/P4/P5/P6 的 authority mapping。
- issue `#293` 的 rejected baseline 不被误当作 canonical authority。

### 5. Aggregate production gate

最后不能只看每个 shard 的 closeout。全量声明前还需要一个 aggregate gate，至少覆盖:

- manifest `2935/2935` rows 都有 registry rows。
- snapshots、prompt material、provenance、search text、materialized classifier fields 全部齐备或有明确 accepted exception。
- question search gate 在全量或代表性 fixtures 上通过。
- release preflight 对全量 manifest 通过，且 warning 全部属于已接受合同范围。
- report index 和 production-readiness report 与 repo truth 一致。

## 当前合理的下一步

优先级最高的是不要扩大到 P2/P4/P5/P6，而是先处理最近的 core blocker:

1. `p1_w_watermarked_001`: 找 non-occluding `WM_9709_w19_qp_11` source/pages，重跑 q07-q11 所在 PDF 的 page-chain/crops/review，然后继续 full downstream。
2. `p3_w_watermarked_001`: 找 non-occluding `WM_9709_w19_qp_31`, `WM_9709_w19_qp_32`, `WM_9709_w19_qp_33` source/pages，重跑整个 shard。
3. 这 62 rows 过关后，P1/P3 core family 才能从 `1205/1267` 走到 `1267/1267` production-ready。
4. 再启动 P2/P4 mechanics 标准 shard，小批量先跑 `p2_m_standard_001` 或 `p4_m_standard_001`，目标先是 evidence-ready + mechanics authority stop，不要直接承诺 production-ready。

## Bottom Line

当前构建已经不是 early prototype: P1/P3 core 的标准卷和 March/Summer watermarked 小批次已经跑通了完整闭环，累计 `1205` 条 row 达到 shard-scoped production-ready。

但距离 9709 当前 full-scaleout inventory 全量 production-ready 还有明显工作量: `1730` 条 row、`246` 个 PDF、`26` 个 shard/blocker 单元。其中 `62` 条是水印 source blocker，`845` 条是 mechanics release line，`823` 条是 statistics/outside-scope line。

所以当前准确结论是: `9709` 题库构建已完成约四成 production-ready 覆盖；P1/P3 core 接近收口，但全量 production-ready 仍需要 source remediation、P2/P4 mechanics release coverage、P5/P6 statistics release-scope 决策，以及最终 aggregate gate。
