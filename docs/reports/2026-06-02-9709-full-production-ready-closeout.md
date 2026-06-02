# 9709 full production-ready aggregate closeout

日期: 2026-06-02

## Verdict

当前 `9709` surface-manifest inventory 已全量 production-ready。

- aggregate gate status: `pass`
- current surface shards: `36/36`
- current surface rows: `2937/2937`
- blockers: `0`
- DB coverage sources: `production_ready_markdown_table`: `4`, `json`: `32`

这里的“全量”是当前已确认可解析题目行口径，不是原始 `5400` 个 probe slots。原始 2026-05-04 inventory 是 `2935` rows；后续修复和补行后，当前 surface manifests 为 `2937` rows。

## Gate Contract

已统一核对 36 个 shard 的以下条件：

- production-ready closeout 存在且行数匹配: `36/36`。
- DB coverage 中 `present == manifest_count == shard rows` 且 missing 指标全为 0: `36/36`。
- question search gate 全部 pass: `36/36`。
- final release preflight 全部 pass 且 blockers 为 0: `36/36`。

DB missing 指标包括: `missing_registry`, `prompt_missing`, `provenance_missing`, `search_text_missing`, `snapshot_ref_missing`, `snapshot_missing`, `materialized_classifier_missing`。

## Distribution

| Paper | Rows |
| --- | ---: |
| `p1` | 649 |
| `p2` | 433 |
| `p3` | 618 |
| `p4` | 412 |
| `p5` | 409 |
| `p6` | 416 |

| Session | Rows |
| --- | ---: |
| `m` | 438 |
| `s` | 1322 |
| `w` | 1177 |

| Source type | Rows |
| --- | ---: |
| `standard` | 2595 |
| `watermarked` | 342 |

## Shard Matrix

| Shard | Rows | Production ready | DB coverage | Search gate | Release preflight |
| --- | ---: | --- | --- | --- | --- |
| `p1_m_standard_001` | 85 | `true` | `true` | `true` | `true` |
| `p1_m_watermarked_001` | 12 | `true` | `true` | `true` | `true` |
| `p1_s_standard_001` | 259 | `true` | `true` | `true` | `true` |
| `p1_s_watermarked_001` | 33 | `true` | `true` | `true` | `true` |
| `p1_w_standard_001` | 228 | `true` | `true` | `true` | `true` |
| `p1_w_watermarked_001` | 32 | `true` | `true` | `true` | `true` |
| `p2_m_standard_001` | 57 | `true` | `true` | `true` | `true` |
| `p2_m_watermarked_001` | 7 | `true` | `true` | `true` | `true` |
| `p2_s_standard_001` | 173 | `true` | `true` | `true` | `true` |
| `p2_s_watermarked_001` | 23 | `true` | `true` | `true` | `true` |
| `p2_w_standard_001` | 151 | `true` | `true` | `true` | `true` |
| `p2_w_watermarked_001` | 22 | `true` | `true` | `true` | `true` |
| `p3_m_standard_001` | 83 | `true` | `true` | `true` | `true` |
| `p3_m_watermarked_001` | 10 | `true` | `true` | `true` | `true` |
| `p3_s_standard_001` | 246 | `true` | `true` | `true` | `true` |
| `p3_s_watermarked_001` | 30 | `true` | `true` | `true` | `true` |
| `p3_w_standard_001` | 219 | `true` | `true` | `true` | `true` |
| `p3_w_watermarked_001` | 30 | `true` | `true` | `true` | `true` |
| `p4_m_standard_001` | 55 | `true` | `true` | `true` | `true` |
| `p4_m_watermarked_001` | 7 | `true` | `true` | `true` | `true` |
| `p4_s_standard_001` | 164 | `true` | `true` | `true` | `true` |
| `p4_s_watermarked_001` | 20 | `true` | `true` | `true` | `true` |
| `p4_w_standard_001` | 145 | `true` | `true` | `true` | `true` |
| `p4_w_watermarked_001` | 21 | `true` | `true` | `true` | `true` |
| `p5_m_standard_001` | 54 | `true` | `true` | `true` | `true` |
| `p5_m_watermarked_001` | 6 | `true` | `true` | `true` | `true` |
| `p5_s_standard_001` | 164 | `true` | `true` | `true` | `true` |
| `p5_s_watermarked_001` | 21 | `true` | `true` | `true` | `true` |
| `p5_w_standard_001` | 143 | `true` | `true` | `true` | `true` |
| `p5_w_watermarked_001` | 21 | `true` | `true` | `true` | `true` |
| `p6_m_standard_001` | 55 | `true` | `true` | `true` | `true` |
| `p6_m_watermarked_001` | 7 | `true` | `true` | `true` | `true` |
| `p6_s_standard_001` | 170 | `true` | `true` | `true` | `true` |
| `p6_s_watermarked_001` | 19 | `true` | `true` | `true` | `true` |
| `p6_w_standard_001` | 144 | `true` | `true` | `true` | `true` |
| `p6_w_watermarked_001` | 21 | `true` | `true` | `true` | `true` |

## Inventory Note

当前 surface manifests 比 2026-05-04 原始 inventory 多 2 行净增：

- `p2_s_standard_001`: 移除 3 个 S16 false-positive slots，加入 3 个 S17 printed q02 rows，row count 不变。
- `p5_w_standard_001`: recovered `9709/w18_qp_52/questions/q02.png`。
- `p6_m_standard_001`: recovered `9709/m21_qp_62/questions/q04.png`。

因此当前可声明的生产口径是 `2937/2937` current surface rows production-ready。

## Artifacts

- generator: `scripts/learning/run_9709_full_production_ready_aggregate_gate.js`
- machine gate: `docs/reports/2026-06-02-9709-full-production-ready-aggregate-gate.json`
- shard source manifests: `data/manifests/9709_p*_page_chain_surface_v1.json`
- shard reports: `docs/reports/*9709*production-ready*`, `*db-coverage.json`, `*search-gate.json`, `*release-preflight-final.json`

## Boundary

本报告不把原始 q01-q15 probe slots 中未被确认为 printed question 的 locator 空位纳入 production-ready 题目行。若未来要审计这些 probe slots，需要单独做 locator/printed-question audit。

## Latest Paper Acquisition Backlog

本 closeout 的 `2937/2937` production-ready 结论只覆盖当前 repo 中已进入 surface-manifest inventory 的 `9709` 题目行；它不等于 Cambridge 后续新发布试卷也已经入库。

当前需要单独开一条 `new-paper acquisition -> source verification -> page-chain -> authority -> DB/search/release` 流程，用来覆盖 closeout 之后尚未入库的最新 `9709` question papers。该流程不能直接复用本报告的 production-ready verdict；新试卷必须先成为新的 source/shard inventory，再重新跑 shard-scoped gate。

已知历史流程参考:

- `docs/reports/2026-05-28-9709-winter-watermarked-external-source-candidates.md`
- `docs/reports/2026-05-28-9709-winter-watermarked-source-remediation-process-log.md`
- `docs/reports/2026-05-28-9709-winter-watermarked-source-replacement-report.md`

这些报告确认过可复用边界:

- external acquisition 先 official-first；如果 Cambridge public direct PDF 不可得，候选镜像只能作为 candidate source，不能直接标为 official source。
- 外部阶段只做检索、下载候选、记录 provenance、PDF identity check、page/render sanity 和 watermark/occlusion 检查。
- source replacement、manifest 扩展、外部 VLM/page-chain 调用、DB backfill、search gate、release preflight 都是后续单独授权步骤。
- source artifact policy 优先保持稳定路径和 manifest 兼容；若新增试卷不是替换旧 source，而是全新 paper set，应使用新增 source path + 新 shard manifest，而不是覆盖既有 production-ready source。

## New Paper Crawl Plan

目标: 找出当前 repo 缺失的最新 `9709` question papers，获取可追溯 source PDFs，并按现有 9709 production-ready 链路把它们做成新的 shard-scoped production-ready rows。

### Phase 0: Missing-window inventory

1. 从 repo source truth 生成当前已覆盖 paper ids:
   - source root: `data/past-papers/9709Mathematics/`
   - manifest root: `data/manifests/9709_p*_page_chain_surface_v1.json`
   - closeout truth: `docs/reports/2026-06-02-9709-full-production-ready-aggregate-gate.json`
2. 输出 `docs/reports/YYYY-MM-DD-9709-new-paper-source-gap-inventory.md`，列出每个 `session/year/component` 的状态:
   - `present_in_repo`
   - `present_in_surface_manifest`
   - `production_ready`
   - `candidate_needed`
3. 不预设 latest window。先让 inventory 以文件名和 manifest truth 推导已有窗口，再用外部 source index 补差。

### Phase 1: Official-first source discovery

1. 先检查 Cambridge official public `9709` past-papers page，并记录页面 URL、访问日期、可见年份/session/component。
2. 如果 public page 只给出有限样本或没有最新 PDF direct links，记录为 `official_public_not_complete`，不要伪造 direct URLs。
3. 如果用户能提供 School Support Hub 下载包或授权的官方导出目录，将其作为 `official_restricted_user_supplied` source；保留原文件名、下载时间、来源说明和 SHA256。
4. 若官方公开/用户导出都不足，再进入 mirror-candidate 层。

### Phase 2: Mirror candidate acquisition

1. 只把镜像当 `candidate source`，按来源分层记录:
   - preferred candidate: direct PDF URL with stable file bytes
   - cross-check candidate: second mirror with matching SHA256 or matching identity/render evidence
   - rejected candidate: Cloudflare/403, non-PDF, wrong paper identity, visible watermark/occlusion, or corrupted render
2. 复用 2026-05-28 source-remediation 的 evidence contract:
   - URL
   - local temp path under `tmp/9709_source_candidates/YYYY-MM-DD/`
   - bytes
   - SHA256
   - PDF version/page count
   - first-page text identity: subject `9709`, component, session/year
   - render sanity: nonblank pages
   - red-watermark/occlusion check when relevant
3. 产物:
   - `docs/reports/YYYY-MM-DD-9709-new-paper-external-source-candidates.md`
   - optional machine JSON: `docs/reports/YYYY-MM-DD-9709-new-paper-external-source-candidates.json`

### Phase 3: Human authorization gate

在任何 source 写入 repo 之前停下，提交候选报告给人工确认。人工需要决定:

- 接受 official public / official restricted / mirror candidate 中哪一组作为 source truth。
- 新 source path policy:
  - new paper set: add non-`WM_` PDFs under `data/past-papers/9709Mathematics/paperN/`
  - replacement only: preserve old path when the task is source remediation, not when ingesting new papers
- 是否授权后续外部 VLM/page-chain API 调用。

### Phase 4: Source write and local verification

1. 在独立 branch/worktree 中写入 source PDFs。
2. 对写入后的 tracked PDFs 重新跑 local identity/render verification。
3. 产出 source replacement/addition report:
   - `docs/reports/YYYY-MM-DD-9709-new-paper-source-addition-report.md`
   - durable render/identity JSON
4. 此阶段仍不声明 production-ready。

### Phase 5: New shard inventory and extraction

1. 为新 paper set 生成独立 shard id，避免污染已关闭的 36 个 shard。例如:
   - `p1_<session>_<source-class>_002`
   - `p3_<session>_<source-class>_002`
2. 生成新的 page-chain surface manifest，保留 source provenance。
3. 按现有 9709 shard chain 执行:
   - page-chain extraction
   - review crop generation
   - evidence bundle generation
   - targeted visual review / operator disposition
   - authority sidecar / aligned manifest
   - registry backfill
   - question analysis backfill
   - DB coverage
   - question search gate
   - release preflight
   - shard production-ready closeout

### Phase 6: Aggregate closeout update

只有当新增 shards 全部通过 shard-scoped production-ready gate 后，才更新 aggregate closeout:

- 重新运行 `scripts/learning/run_9709_full_production_ready_aggregate_gate.js`。
- 生成新的 aggregate gate JSON。
- 更新本报告或新建 `YYYY-MM-DD-9709-new-paper-production-ready-closeout.md`，明确区分:
  - prior current surface rows: `2937`
  - new paper rows: pending or accepted count
  - total production-ready rows after new-paper ingest

## Immediate Next Action

下一步应先做 Phase 0 + Phase 1 的 read-only inventory/report，不下载、不写 source、不触发外部 VLM:

1. 生成当前 repo 已有 `9709_*_qp_*.pdf` 与 surface manifest paper-id 覆盖表。
2. 对 Cambridge official public page 做 official-first 可见性记录。
3. 列出缺失 latest paper ids 和 acquisition priority。
4. 产出 `docs/reports/YYYY-MM-DD-9709-new-paper-source-gap-inventory.md` 供人工确认后再进入下载候选阶段。
