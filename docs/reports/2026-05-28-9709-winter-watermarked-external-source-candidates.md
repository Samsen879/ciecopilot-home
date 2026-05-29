# 9709 Winter Watermarked External Source Candidates

日期: 2026-05-28

## Supersession Note

After this candidate report was written, the user explicitly authorized source replacement. The replacement was performed in isolated branch `codex/9709-w19-source-remediation` and is now recorded in `docs/reports/2026-05-28-9709-winter-watermarked-source-replacement-report.md`. Candidate provenance in this file remains valid, but the old statement that replacement is not authorized is superseded by the replacement report.

## Scope

本报告记录一次受控 external source remediation 尝试，目标覆盖 9709 Winter 2019 两个 visual-stop shard 的完整 watermarked source set:

- `p1_w_watermarked_001`: `9709_w19_qp_11`, `9709_w19_qp_12`, `9709_w19_qp_13`
- `p3_w_watermarked_001`: `9709_w19_qp_31`, `9709_w19_qp_32`, `9709_w19_qp_33`

说明:

- 最初外部候选只列出 4 份，是因为 visual-stop blocker 明确落在 `q11` 与 `q31/q32/q33` 的遮挡 crop 上。
- 为了做完整 source-set remediation，本报告已补齐 `q12/q13` 候选核验。
- 本轮授权仅允许外部检索、下载候选、记录 provenance 和做候选核验。
- 没有替换 repo source，没有修改 manifest，没有重跑 page-chain/crops/evidence/visual-review，也没有执行 authority sidecar、DB backfill、search gate 或 release preflight。

## Search Outcome

Official-first 结果:

- 未找到 Cambridge official site 上可直接下载的 6 份 Winter 2019 `9709_w19_qp_*.pdf` 静态直链。
- PapaCambridge direct `directories/CAIE/CAIE-pastpapers/upload/...` URL 尝试返回 Cloudflare challenge / HTTP 403，未下载。

可追溯公开镜像候选:

- CieNotes direct PDFs 成功下载 6/6，作为当前 recommended candidate set。
- XtraPapers raw PDFs 已做部分交叉核验: q11/q31/q32 成功下载，q33 下载失败；q32 与 CieNotes 文件完全同 SHA256；q11/q31 渲染仍有红像素，不作为替换候选。

## Downloaded Candidate Provenance

### Recommended candidate set: CieNotes

| Paper | URL | Local candidate path | Bytes | SHA256 |
|---|---|---|---:|---|
| `9709_w19_qp_11` | `https://www.cienotes.com/wp-content/uploads/2020/01/9709_w19_qp_11.pdf` | `tmp/9709_source_candidates/2026-05-28/9709_w19_qp_11.cienotes.pdf` | 137736 | `1858b0bff5a54c73c83c4cce46219adcc242208c1a2090853762f3bdc073899f` |
| `9709_w19_qp_12` | `https://www.cienotes.com/wp-content/uploads/2020/01/9709_w19_qp_12.pdf` | `tmp/9709_source_candidates/2026-05-28/9709_w19_qp_12.cienotes.pdf` | 145862 | `091980ffc6a169dcdf46e3b6308d7c5674e970255721c5a1653a26622210ddae` |
| `9709_w19_qp_13` | `https://www.cienotes.com/wp-content/uploads/2020/01/9709_w19_qp_13.pdf` | `tmp/9709_source_candidates/2026-05-28/9709_w19_qp_13.cienotes.pdf` | 137418 | `26aad45a9bdadb1bd52203b3900599ba4649ab0097b41ae409e67dfa4b229aa6` |
| `9709_w19_qp_31` | `https://www.cienotes.com/wp-content/uploads/2020/01/9709_w19_qp_31.pdf` | `tmp/9709_source_candidates/2026-05-28/9709_w19_qp_31.cienotes.pdf` | 125646 | `38e6bb1aa32d46daf74f99c68407301ba6b84e4baa3f62a24f0626d69433bfba` |
| `9709_w19_qp_32` | `https://www.cienotes.com/wp-content/uploads/2020/01/9709_w19_qp_32.pdf` | `tmp/9709_source_candidates/2026-05-28/9709_w19_qp_32.cienotes.pdf` | 126712 | `32b82ba20c80fbd9ca8d4d447be3d37a0b85c3570f27e22bd49c97f457d60752` |
| `9709_w19_qp_33` | `https://www.cienotes.com/wp-content/uploads/2020/01/9709_w19_qp_33.pdf` | `tmp/9709_source_candidates/2026-05-28/9709_w19_qp_33.cienotes.pdf` | 133486 | `e2ce963fc2bef5462f9f32cfab41620693caf080f2a3cd43baf835437e3ff0b8` |

All six CieNotes files are valid PDF files, version 1.3, `20` pages each.

### Cross-check candidates: XtraPapers

| Paper | URL | Result | Bytes | SHA256 | Replacement candidate? |
|---|---|---|---:|---|---|
| `9709_w19_qp_11` | `https://xtrapapers.co/papers/caie/as-and-a-level/mathematics-9709/2019-oct-nov/9709_w19_qp_11.pdf/raw` | valid PDF, 20 pages | 166363 | `dce16ab5e0e9986a034114c5797a91f3359c81968cf8a8402a136fca8f0b6257` | no: rendered red pixels present |
| `9709_w19_qp_31` | `https://xtrapapers.co/papers/caie/as-and-a-level/mathematics-9709/2019-oct-nov/9709_w19_qp_31.pdf/raw` | valid PDF, 20 pages | 154085 | `e67ec2b840d9ba55a62a99197706b394ae63cbcb5840f1bac4da36ab5191ef42` | no: rendered red pixels present |
| `9709_w19_qp_32` | `https://xtrapapers.co/papers/caie/as-and-a-level/mathematics-9709/2019-oct-nov/9709_w19_qp_32.pdf/raw` | valid PDF, 20 pages | 126712 | `32b82ba20c80fbd9ca8d4d447be3d37a0b85c3570f27e22bd49c97f457d60752` | redundant: identical to CieNotes |
| `9709_w19_qp_33` | `https://xtrapapers.co/papers/caie/as-and-a-level/mathematics-9709/2019-oct-nov/9709_w19_qp_33.pdf/raw` | curl failed with `Failure when receiving data from the peer` | n/a | n/a | no |

## Candidate Identity Checks

PDF metadata and first-page text were extracted with existing repo dependencies (`pdfjs-dist` + `@napi-rs/canvas` available under `node_modules`).

| Paper | Page count | PDF title | First-page identity check |
|---|---:|---|---|
| `9709_w19_qp_11` | 20 | `9709_11_Nov19.dvi` | first page contains `MATHEMATICS 9709/11 Paper 1 Pure Mathematics 1 (P1)` and Oct/Nov 2019 text |
| `9709_w19_qp_12` | 20 | `9709_12_Nov19.dvi` | first page contains `MATHEMATICS 9709/12 Paper 1 Pure Mathematics 1 (P1)` and Oct/Nov 2019 text |
| `9709_w19_qp_13` | 20 | `9709_13_Nov19.dvi` | first page contains `MATHEMATICS 9709/13 Paper 1 Pure Mathematics 1 (P1)` and Oct/Nov 2019 text |
| `9709_w19_qp_31` | 20 | `9709_31_Nov19.dvi` | first page contains `MATHEMATICS 9709/31 Paper 3 Pure Mathematics 3 (P3)` and Oct/Nov 2019 text |
| `9709_w19_qp_32` | 20 | `9709_32_Nov19.dvi` | first page contains `MATHEMATICS 9709/32 Paper 3 Pure Mathematics 3 (P3)` and Oct/Nov 2019 text |
| `9709_w19_qp_33` | 20 | `9709_33_Nov19.dvi` | first page contains `MATHEMATICS 9709/33 Paper 3 Pure Mathematics 3 (P3)` and Oct/Nov 2019 text |

The CieNotes files look like Cambridge-generated vector PDFs, not screenshot patches. Example metadata includes producer `GPL Ghostscript 9.19`, creator `dvips(k) 5.994`, and titles in the `9709_XX_Nov19.dvi` form.

## Red-Watermark Visual Check

Rendering method:

- Renderer: existing `pdfjs-dist` plus `@napi-rs/canvas`.
- Scale: `1.5`.
- Check: render every page, count pixels where `r > 150`, `g < 110`, `b < 110`.
- Six-source evidence JSON: `tmp/9709_source_candidates/2026-05-28/pdfjs-watermark-candidate-red-stats-six.json`.
- Earlier four-source evidence JSONs remain at `tmp/9709_source_candidates/2026-05-28/pdfjs-red-pixel-stats.json` and `tmp/9709_source_candidates/2026-05-28/pdfjs-text-metadata.json`.

Result:

| Source set | Paper | Pages rendered | Sum red pixels | Max red pixels on a page | Minimum non-white pixels on a page |
|---|---|---:|---:|---:|---:|
| CieNotes candidate | `9709_w19_qp_11` | 20 | 0 | 0 | 25447 |
| CieNotes candidate | `9709_w19_qp_12` | 20 | 0 | 0 | 1531 |
| CieNotes candidate | `9709_w19_qp_13` | 20 | 0 | 0 | 25647 |
| CieNotes candidate | `9709_w19_qp_31` | 20 | 0 | 0 | 1531 |
| CieNotes candidate | `9709_w19_qp_32` | 20 | 0 | 0 | 1538 |
| CieNotes candidate | `9709_w19_qp_33` | 20 | 0 | 0 | 1536 |
| Current repo `WM_` source | `9709_w19_qp_11` | 20 | 72580 | 3629 | 45079 |
| Current repo `WM_` source | `9709_w19_qp_12` | 20 | 72580 | 3629 | 21388 |
| Current repo `WM_` source | `9709_w19_qp_13` | 20 | 72580 | 3629 | 45049 |
| Current repo `WM_` source | `9709_w19_qp_31` | 20 | 72580 | 3629 | 21388 |
| Current repo `WM_` source | `9709_w19_qp_32` | 20 | 72580 | 3629 | 21388 |
| Current repo `WM_` source | `9709_w19_qp_33` | 20 | 72580 | 3629 | 21388 |

Interpretation:

- The six CieNotes candidates render as nonblank pages and have zero detected red-watermark pixels across all pages.
- The current repo `WM_` sources render with substantial red pixels on all six source PDFs.
- This supports treating the six CieNotes files as non-red-watermarked replacement candidates, pending explicit human authorization to replace source artifacts and rerun the shard chain.

## Current Decision

Candidate source remediation is ready for human visual review and replacement authorization, but replacement is not authorized in this turn.

Recommended candidate source set:

- Use the six CieNotes PDFs listed above as the replacement candidates for the complete watermarked source set.
- Do not use XtraPapers q11/q31 as replacement candidates because they render red pixels.
- XtraPapers q32 can serve as a mirror cross-check because it is byte-identical to the CieNotes q32 file.

Current shard conclusion:

- `p1_w_watermarked_001`: all 3 source PDFs now have local non-red-watermarked candidates, but no replacement or page-chain rerun has happened.
- `p3_w_watermarked_001`: all 3 source PDFs now have local non-red-watermarked candidates, but no replacement or page-chain rerun has happened.

## Next Step After Explicit Approval

If replacement is approved, the next controlled step is:

1. Create an isolated worktree/branch.
2. Copy the six CieNotes candidate PDFs into the corresponding `data/past-papers/9709Mathematics/paper1` and `paper3` source paths, replacing only the six target `WM_` PDFs or adding clearly named non-`WM_` source variants, depending on the chosen artifact policy.
3. Rerun the minimal affected source chain: page-chain, review crops, evidence bundles, and targeted visual review.
4. Only if the visual review passes, continue to human visual disposition and then downstream shard closeout steps.

Do not declare production-ready from this report. The only current claim is: external non-red-watermarked candidate PDFs were found and locally rendered without red watermark pixels.
