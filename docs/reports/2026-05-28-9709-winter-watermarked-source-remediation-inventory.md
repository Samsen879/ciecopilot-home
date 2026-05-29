# 9709 Winter Watermarked Source Remediation Inventory

日期: 2026-05-28

## Supersession Note

After this inventory/addendum was written, the user explicitly authorized source replacement. The replacement was performed in isolated branch `codex/9709-w19-source-remediation` and is now recorded in `docs/reports/2026-05-28-9709-winter-watermarked-source-replacement-report.md`. The pre-replacement inventory in this file remains valid historical evidence, but its pending-replacement conclusion is superseded by the replacement report.

## Scope

本报告只处理 Winter 2019 watermarked source PDF 的 visual-stop blocker:

- `p1_w_watermarked_001`
- `p3_w_watermarked_001`

本报告先记录本地 read-only source inventory 和 blocker 归档；随后在用户授权下补充 external candidate acquisition/verification addendum。未做 source replacement、manifest 修改、page-chain/crops/evidence/visual-review rerun、authority sidecar、DB backfill、search gate、release preflight，也未扩大到 P2/P4/P5/P6。

当前 root checkout 分支为 `codex/9709-wave1-summary-doc`。该 checkout 缺少以下最新报告路径:

- `docs/reports/2026-05-25-9709-p1-w-watermarked-001-visual-review-stop.md`
- `docs/reports/2026-05-26-9709-p3-w-watermarked-001-visual-review-stop.md`
- `docs/reports/2026-05-26-9709-production-readiness-status.md`

上述报告在本机已有 worktree 中找到并只读核对:

- `/home/samsen/code/ciecopilot-home/.worktrees/codex-9709-production-readiness-report/docs/reports/2026-05-25-9709-p1-w-watermarked-001-visual-review-stop.md`
- `/home/samsen/code/ciecopilot-home/.worktrees/codex-9709-production-readiness-report/docs/reports/2026-05-26-9709-p3-w-watermarked-001-visual-review-stop.md`
- `/home/samsen/code/ciecopilot-home/.worktrees/codex-9709-production-readiness-report/docs/reports/2026-05-26-9709-production-readiness-status.md`

## External Candidate Addendum

在用户批准外部检索和下载后，已补齐完整 6 份 Winter 2019 watermarked source-set 候选。候选状态记录在:

- `docs/reports/2026-05-28-9709-winter-watermarked-external-source-candidates.md`
- `tmp/9709_source_candidates/2026-05-28/pdfjs-watermark-candidate-red-stats-six.json`

当前结果:

- CieNotes 6/6 份 candidate PDF 已下载到 `tmp/9709_source_candidates/2026-05-28/`。
- 六份候选均为 PDF 1.3，20 pages，first-page identity 与 `9709_w19_qp_11/12/13/31/32/33` 匹配。
- 使用 `pdfjs-dist + @napi-rs/canvas` 渲染全页红像素核验，六份候选 `sumRedPixels=0`。
- 当前 repo 六份 `WM_` source 均仍有 `sumRedPixels=72580`。
- 这只是 candidate acquisition/verification；没有替换 source artifact，也没有重跑下游链路。

## Checked Source Inventory

### Current root checkout

`data/manifests/9709_full_scaleout_manifest_v1.json` records:

| Shard | Rows | PDFs | Source PDFs |
|---|---:|---:|---|
| `p1_w_watermarked_001` | 32 | 3 | `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_11.pdf`; `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_12.pdf`; `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_13.pdf` |
| `p3_w_watermarked_001` | 30 | 3 | `data/past-papers/9709Mathematics/paper3/WM_9709_w19_qp_31.pdf`; `data/past-papers/9709Mathematics/paper3/WM_9709_w19_qp_32.pdf`; `data/past-papers/9709Mathematics/paper3/WM_9709_w19_qp_33.pdf` |

Targeted file searches under `data`, `docs`, and `scripts` found only the `WM_` versions for:

- `9709_w19_qp_11`
- `9709_w19_qp_31`
- `9709_w19_qp_32`
- `9709_w19_qp_33`

No local root-checkout file matching a non-`WM_` `9709_w19_qp_11`, `9709_w19_qp_31`, `9709_w19_qp_32`, or `9709_w19_qp_33` PDF was found.

### Current root PDF files

The six root source PDFs exist and are all watermarked:

| Path | Size |
|---|---:|
| `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_11.pdf` | 2,287,372 bytes |
| `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_12.pdf` | 2,295,531 bytes |
| `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_13.pdf` | 2,287,051 bytes |
| `data/past-papers/9709Mathematics/paper3/WM_9709_w19_qp_31.pdf` | 2,275,245 bytes |
| `data/past-papers/9709Mathematics/paper3/WM_9709_w19_qp_32.pdf` | 2,276,269 bytes |
| `data/past-papers/9709Mathematics/paper3/WM_9709_w19_qp_33.pdf` | 2,283,140 bytes |

### Organization report Windows paths

`data/organization-report.json` records the same Winter 2019 paths under `C:\Users\Samsen\cie-copilot\data\...`, but the corresponding WSL-mounted source directories do not currently exist:

- `/mnt/c/Users/Samsen/cie-copilot/data/past-papers/9709Mathematics/paper1`
- `/mnt/c/Users/Samsen/cie-copilot/data/past-papers/9709Mathematics/paper3`

### Other local worktrees and bounded Windows locations

Exact-name searches under `/home/samsen` found repeated copies of the same `WM_` PDFs in existing worktrees only. No non-`WM_` replacement was found.

Bounded Windows checks under:

- `/mnt/c/Users/Samsen/Downloads`
- `/mnt/c/Users/Samsen/Desktop`
- `/mnt/c/Users/Samsen/Documents`
- `/mnt/c/Users/Samsen/OneDrive`
- `/mnt/c/Users/Samsen/cie-copilot`

found only `WM_` copies under `/mnt/c/Users/Samsen/cie-copilot/tmp_remote_inspect/...`. No non-occluding replacement source PDF/page was found.

A broader `/mnt/c/Users/Samsen` exact-name scan was started, produced no candidate PDF output, hit permission-denied paths under AppData temp directories, and was terminated to avoid an unbounded inventory run. It is not used as positive evidence.

## Visual-Stop Evidence Read

The latest local worktree reports say the current full-scaleout parseable target is `2935` rows, with `1205` rows shard-scoped production-ready and `62` rows blocked by visual-stop source quality.

### `p1_w_watermarked_001`

Current conclusion: still blocked.

The local visual-stop report records:

- page-chain extraction passed for `3/3` PDFs.
- evidence bundles were built for `32/32` rows.
- targeted high-resolution external VLM review rejected `WM_9709_w19_qp_11` questions `q07` through `q11`.
- the blocker is red watermark occlusion over prompt text, diagram/image areas, mark allocations, or other critical content.

Because no non-occluding `9709_w19_qp_11` source PDF/pages were found locally, this shard cannot move to accepted human visual disposition or downstream closeout.

### `p3_w_watermarked_001`

Current conclusion: still blocked.

The local visual-stop report records:

- page-chain extraction passed for `3/3` PDFs.
- evidence bundles were built for `30/30` rows.
- targeted high-resolution visual review rejected `29/30` original crop stacks.
- blockers repeatedly cite red watermark occlusion over prompt text, question text, formulae, diagram-related text, mark allocations, or continuation content across `WM_9709_w19_qp_31`, `WM_9709_w19_qp_32`, and `WM_9709_w19_qp_33`.

Because no non-occluding `9709_w19_qp_31`, `9709_w19_qp_32`, or `9709_w19_qp_33` source PDF/pages were found locally, this shard also cannot move to accepted human visual disposition or downstream closeout.

## Not Executed

The following steps were intentionally not executed because source replacement still requires explicit user authorization:

- source replacement or source artifact creation
- manifest modification
- page-chain rerun
- review crop regeneration
- evidence bundle regeneration
- targeted visual-review rerun
- human visual disposition acceptance
- authority sidecar
- registry or analysis backfill
- DB coverage proof
- question search gate
- release preflight
- production-ready closeout

## Current Decision

Local pre-download inventory found no non-`WM_` replacement source/pages already present in the repo or bounded local paths. After external acquisition, a complete 6-PDF non-red-watermarked candidate set now exists locally under `tmp/9709_source_candidates/2026-05-28/`.

Current status:

- `p1_w_watermarked_001`: source remediation has local candidates for all 3 PDFs, pending human visual review and explicit replacement authorization.
- `p3_w_watermarked_001`: source remediation has local candidates for all 3 PDFs, pending human visual review and explicit replacement authorization.

This cannot return to mainline shard closeout yet. The next valid step is human review of the candidate PDFs, then explicit authorization to create an isolated worktree/branch, replace or add source artifacts, and rerun the minimal page-chain, crop, evidence, and visual-review chain. Do not declare production-ready from this inventory.
