# 9709 数学题库 production-readiness 当前状态报告

日期: 2026-05-29

## Scope

本报告更新 `9709` 数学题库 full-scaleout production-readiness 状态，覆盖 PR `#316` 合并后的 repo truth。

本报告基于 checked-in artifact，不把聊天记录或 AO 元数据当作最终事实。主要输入:

- full scale-out inventory: `docs/reports/2026-05-04-9709-full-scaleout-inventory.json`
- full scale-out manifest: `data/manifests/9709_full_scaleout_manifest_v1.json`
- previous status snapshot: `docs/reports/2026-05-26-9709-production-readiness-status.md`
- Winter watermarked remediation PR: `#316`, merged into `main` as `0503e261ab18147c4ac33ce46bc17be03b618bf6`
- Winter closeout report: `docs/reports/2026-05-28-9709-winter-watermarked-post-replacement-production-closeout.md`
- shard-scoped `production-ready.md`, DB coverage, search gate, and release preflight reports under `docs/reports/`

术语边界:

- `targeted q01-q15 probe slots = 5400` 是 locator 探测包络，不等于真实印刷题目总数。
- 当前可执行的 full-scaleout production target 是 inventory 已定位的 `2935` 条 parseable question rows。
- `2465` 个 unresolved probe slots 不是 production-ready 缺口本身；如果未来要把 q01-q15 探测包络也审计到底，需要单独做 locator/printed-question audit。
- 当前流程仍然是有人在环的脚本化执行流程，不是全自动题库构建。

## Executive Status

截至本报告，`9709` 题库仍不是全量 production-ready。

PR `#316` 已把此前 visual-stop 的 Winter 2019 watermarked P1/P3 shards 关闭为 shard-scoped production-ready:

- `p1_w_watermarked_001`: `32` rows, `3` PDFs
- `p3_w_watermarked_001`: `30` rows, `3` PDFs

当前 repo truth 是:

| Category | Shards | Rows | PDFs | Status |
|---|---:|---:|---:|---|
| shard-scoped production-ready | 12 | 1267 | 120 | 已完成闭环 |
| extracted/evidence-built but visual-stop | 0 | 0 | 0 | W19 blocker 已由 source replacement + downstream closeout 清零 |
| not started in scale-out execution | 24 | 1668 | 240 | 还未进入 shard 闭环 |
| total current parseable inventory | 36 | 2935 | 360 | 当前 full-scaleout target |

因此，按当前 `2935` 条 parseable rows 口径:

- 已 production-ready: `1267 / 2935` rows, 约 `43.2%`
- 未 production-ready: `1668 / 2935` rows, 约 `56.8%`
- 距离当前 full-scaleout production-ready 至少还差: `1668` rows, `240` PDFs, `24` shard-level closeouts, plus final aggregate gate

## 已经 production-ready 的部分

当前 production-ready 只允许按 shard 声明，不能外推为全量。已完成的 12 个 shard 是:

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
| `p1_w_watermarked_001` | 32 | 3 | `docs/reports/2026-05-28-9709-p1-w-watermarked-001-post-replacement-production-ready.md` |
| `p3_w_watermarked_001` | 30 | 3 | `docs/reports/2026-05-28-9709-p3-w-watermarked-001-post-replacement-production-ready.md` |

这些 shard 已完成的闭环包括:

1. PDF page-chain extraction。
2. screenshot/review-crop index 与 evidence bundle。
3. warning disposition、human visual disposition 或 VLM-assisted visual disposition。
4. authority sidecar，只映射到已有 seeded topic paths，不新增 syllabus node，不发明 prompt text。
5. registry backfill 与 analysis hydration。
6. DB coverage proof。
7. question search gate。
8. release preflight。
9. shard-scoped production-ready closeout。

## 已抽取但停止的部分

当前没有仍然处于 active visual-stop 的 `9709` scaleout shard。

历史上 `p1_w_watermarked_001` 和 `p3_w_watermarked_001` 曾在 2026-05-25/2026-05-26 因 red-watermark occlusion 停止。该状态已被 2026-05-28 的 source replacement、post-replacement visual review、authority sidecar、DB/search/release closeout supersede。

不要再把这 `62` rows 计入当前 visual-stop backlog；它们已经计入 production-ready。

## 还没开始的部分

剩余 24 个 shard、1668 rows、240 PDFs 还没有进入当前 scale-out 闭环。

### P2/P4 mechanics: 845 rows, 120 PDFs, 12 shards

| Shard group | Rows | PDFs | Current status | Extra production blocker |
|---|---:|---:|---|---|
| P2/P4 standard | 745 | 106 | not started | mechanics authority and release coverage not yet proven |
| P2/P4 watermarked | 100 | 14 | not started | mechanics release coverage plus watermark visual risk |

这些 shard 不能照搬 P1/P3 的 production-ready 结论。即使 extraction 和 evidence 通过，也还需要 mechanics 题型的 authority coverage、classifier/search/release-scope policy 明确通过。

### P5/P6 statistics: 823 rows, 120 PDFs, 12 shards

| Shard group | Rows | PDFs | Current status | Extra production blocker |
|---|---:|---:|---|---|
| P5/P6 standard | 728 | 106 | not started | outside current release scope |
| P5/P6 watermarked | 95 | 14 | not started | outside current release scope plus watermark visual risk |

P5/P6 当前应先按 evidence-ready 或 analysis-backfilled 目标推进。要宣称 production-ready，需要额外 release-scope 决策，把 statistics family 的 scoring/search/classifier posture 明确纳入 release contract。

## 距离全量 production-ready 还差什么

按当前 `2935` parseable rows 口径，剩余工作可以拆成 4 类。

### 1. P2/P4 mechanics scale-out

规模: `845` rows, `120` PDFs, `12` shards。

这是最大的一块 release-scope 风险。需要跑同样的 page-chain/evidence/authority/backfill/gate 闭环，但 production-ready 的判断还要增加 mechanics release contract: 不能只说题目已抽取，还要证明 mechanics topic authority、search/classifier、release preflight 的行为可发布。

### 2. P5/P6 statistics scale-out

规模: `823` rows, `120` PDFs, `12` shards。

这一块当前明确在 outside-current-release-scope。可以先产出截图、evidence、analysis 与 DB coverage，但 full production-ready 还需要单独的 P5/P6 release-scope promotion 决策。

### 3. 全局 authority 与 syllabus governance

当前已完成 shard 使用的是 shard-scoped authority sidecar 和已有 seeded topic paths。全量 production-ready 还需要确认:

- 不新增未经审核的 syllabus node。
- `9709` canonical topic tree 与 boundary audit 的 pending human-review items 不会阻塞 P2/P4/P5/P6 的 authority mapping。
- issue `#293` 的 rejected baseline 不被误当作 canonical authority。

### 4. Aggregate production gate

最后不能只看每个 shard 的 closeout。全量声明前还需要一个 aggregate gate，至少覆盖:

- manifest `2935/2935` rows 都有 registry rows。
- snapshots、prompt material、provenance、search text、materialized classifier fields 全部齐备或有明确 accepted exception。
- question search gate 在全量或代表性 fixtures 上通过。
- release preflight 对全量 manifest 通过，且 warning 全部属于已接受合同范围。
- report index 和 production-readiness report 与 repo truth 一致。

## 当前合理的下一步

P1/P3 core family 当前已达到 `1267 / 1267` shard-scoped production-ready。下一步不再是 W19 source remediation，而是进入未启动 paper families:

1. 启动 P2/P4 mechanics 的小标准 shard，推荐 `p2_m_standard_001` 或 `p4_m_standard_001`。
2. 目标先设为 evidence-ready + mechanics authority stop，不预先承诺 production-ready。
3. 如果 mechanics authority、classifier/search、release preflight 全部通过，再关闭该 shard 为 production-ready。
4. P5/P6 statistics 暂不使用 production-ready 语言；除非先完成 release-scope promotion 决策。
5. 等 24 个剩余 shard 全部完成后，再新增 aggregate production gate artifact，才能讨论 full `9709` production-ready。

## Recompute Evidence

本报告的核心计数可由当前 repo 复算:

```bash
node -e 'const fs=require("fs"), path=require("path"); const files=fs.readdirSync("docs/reports").filter(f=>/^2026-.*9709.*production-ready\\.md$/.test(f)).sort(); let sumRows=0,sumPdfs=0; for (const f of files){const s=fs.readFileSync(path.join("docs/reports",f),"utf8"); const rows=+((s.match(/manifest rows: `([0-9]+)`/)||s.match(/rows: `([0-9]+)`/)||[])[1]||0); const pdfs=+((s.match(/PDFs: `([0-9]+)`/)||[])[1]||0); sumRows+=rows; sumPdfs+=pdfs;} console.log({shards:files.length, rows:sumRows, pdfs:sumPdfs});'
```

Expected current output:

```text
{ shards: 12, rows: 1267, pdfs: 120 }
```

Remaining inventory was recomputed from `docs/reports/2026-05-04-9709-full-scaleout-inventory.json` by subtracting the 12 production-ready shard IDs:

```text
remaining_shards=24 rows=1668 pdfs=240
mechanics: 12 shards, 845 rows, 120 PDFs
statistics: 12 shards, 823 rows, 120 PDFs
```

## Bottom Line

当前构建已经完成 P1/P3 core family 的 shard-scoped production-ready 收口: `1267 / 1267` core rows 已完成闭环。

但距离 9709 当前 full-scaleout inventory 全量 production-ready 还有明确工作量: `1668` 条 row、`240` 个 PDF、`24` 个 shard-level closeouts，以及最终 aggregate production gate。其中 `845` 条是 P2/P4 mechanics release line，`823` 条是 P5/P6 statistics/outside-scope line。

所以当前准确结论是: `9709` 题库构建已完成 `1267 / 2935` rows，约 `43.2%` production-ready 覆盖；P1/P3 core 已收口，但全量 production-ready 仍需要 P2/P4 mechanics release coverage、P5/P6 statistics release-scope 决策，以及最终 aggregate gate。
