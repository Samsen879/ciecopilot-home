# 9709 Winter Watermarked Source Remediation Process Log

日期: 2026-05-28

## Purpose

本记录按执行顺序归档本次 Winter 2019 watermarked source remediation 的查找资料、下载候选、视觉核验、人工授权和 source 替换过程。范围只限:

- `p1_w_watermarked_001`: `9709_w19_qp_11`, `9709_w19_qp_12`, `9709_w19_qp_13`
- `p3_w_watermarked_001`: `9709_w19_qp_31`, `9709_w19_qp_32`, `9709_w19_qp_33`

本记录不声明 production-ready。当前最高结论是: source artifact replacement 已完成并通过本地渲染去红水印核验；page-chain/crops/evidence/visual-review 仍待后续授权运行。

## 1. Repo Truth And Local Inventory

执行开始时遵守 repo truth first 和不碰无关脏改动规则。root worktree 已存在无关脏改动，后续实际替换因此在隔离 worktree/branch 中完成。

核对到的 shard truth:

- full-scaleout parseable target: `2935` rows
- shard-scoped production-ready: `1205` rows
- visual-stop: `62` rows
- `p1_w_watermarked_001`: `32` rows / `3` PDFs
- `p3_w_watermarked_001`: `30` rows / `3` PDFs

本地 read-only inventory 先检查了 repo、已有 worktree 和 bounded Windows 路径。结论是: 替换前本地只找到 `WM_` watermarked PDFs，没有找到 non-occluding replacement source/page。

Inventory 记录:

- `docs/reports/2026-05-28-9709-winter-watermarked-source-remediation-inventory.md`

## 2. External Search Policy

用户先授权外部检索和下载尝试，但明确要求 replacement 之前必须再次授权。因此外部阶段只做:

- official-first search
- public mirror candidate download
- provenance 记录
- PDF identity check
- local render red-watermark check

替换 source artifact 在这一阶段未执行。

## 3. Official-First Search Outcome

先尝试 official-first 查找 Cambridge official direct static PDFs。未找到可直接下载的 Cambridge official 静态直链。

同时尝试 PapaCambridge direct `directories/CAIE/CAIE-pastpapers/upload/...` URL，返回 Cloudflare challenge / HTTP 403，未下载。

因此按用户授权，使用可追溯公开镜像作为候选来源。

## 4. Public Mirror Candidate Acquisition

### CieNotes

CieNotes direct PDF 成功下载完整 6/6 candidate set，并作为 recommended candidate set:

| Paper | URL | Local candidate path | Bytes | SHA256 |
|---|---|---|---:|---|
| `9709_w19_qp_11` | `https://www.cienotes.com/wp-content/uploads/2020/01/9709_w19_qp_11.pdf` | `tmp/9709_source_candidates/2026-05-28/9709_w19_qp_11.cienotes.pdf` | 137736 | `1858b0bff5a54c73c83c4cce46219adcc242208c1a2090853762f3bdc073899f` |
| `9709_w19_qp_12` | `https://www.cienotes.com/wp-content/uploads/2020/01/9709_w19_qp_12.pdf` | `tmp/9709_source_candidates/2026-05-28/9709_w19_qp_12.cienotes.pdf` | 145862 | `091980ffc6a169dcdf46e3b6308d7c5674e970255721c5a1653a26622210ddae` |
| `9709_w19_qp_13` | `https://www.cienotes.com/wp-content/uploads/2020/01/9709_w19_qp_13.pdf` | `tmp/9709_source_candidates/2026-05-28/9709_w19_qp_13.cienotes.pdf` | 137418 | `26aad45a9bdadb1bd52203b3900599ba4649ab0097b41ae409e67dfa4b229aa6` |
| `9709_w19_qp_31` | `https://www.cienotes.com/wp-content/uploads/2020/01/9709_w19_qp_31.pdf` | `tmp/9709_source_candidates/2026-05-28/9709_w19_qp_31.cienotes.pdf` | 125646 | `38e6bb1aa32d46daf74f99c68407301ba6b84e4baa3f62a24f0626d69433bfba` |
| `9709_w19_qp_32` | `https://www.cienotes.com/wp-content/uploads/2020/01/9709_w19_qp_32.pdf` | `tmp/9709_source_candidates/2026-05-28/9709_w19_qp_32.cienotes.pdf` | 126712 | `32b82ba20c80fbd9ca8d4d447be3d37a0b85c3570f27e22bd49c97f457d60752` |
| `9709_w19_qp_33` | `https://www.cienotes.com/wp-content/uploads/2020/01/9709_w19_qp_33.pdf` | `tmp/9709_source_candidates/2026-05-28/9709_w19_qp_33.cienotes.pdf` | 133486 | `e2ce963fc2bef5462f9f32cfab41620693caf080f2a3cd43baf835437e3ff0b8` |

### XtraPapers Cross-Check

XtraPapers raw PDFs 做了部分交叉核验:

- `q11`, `q31`, `q32` 下载成功。
- `q33` 下载失败。
- `q32` 与 CieNotes candidate byte-identical，同 SHA256。
- `q11` 和 `q31` 渲染仍有红像素，不作为 replacement candidate。

## 5. Candidate Verification Before Replacement

候选验证使用 repo 已有 Node dependencies:

- `pdfjs-dist`
- `@napi-rs/canvas`

验证内容:

- 文件类型: all six candidates are PDF 1.3, 20 pages.
- metadata/title: `9709_11_Nov19.dvi`, `9709_12_Nov19.dvi`, `9709_13_Nov19.dvi`, `9709_31_Nov19.dvi`, `9709_32_Nov19.dvi`, `9709_33_Nov19.dvi`.
- first-page identity: all candidates contain matching `MATHEMATICS 9709/xx` and October/November 2019 text.
- red-pixel render check: render every page at scale `1.5`; red pixel rule is `r > 150 && g < 110 && b < 110`.

候选核验结果:

- CieNotes 6/6 candidates: `sumRedPixels=0`.
- Current repo 6/6 `WM_` sources before replacement: each had `sumRedPixels=72580`.

Candidate provenance and verification record:

- `docs/reports/2026-05-28-9709-winter-watermarked-external-source-candidates.md`

## 6. Correction From 4 Candidates To 6 Candidates

过程中最初只列出 4 份 candidate，是因为已确认的 visual-stop blocker 明确集中在:

- `WM_9709_w19_qp_11` q07-q11
- `WM_9709_w19_qp_31/32/33` 多数 targeted crop stack

用户指出 source-set watermarked blockers 应覆盖完整 shard source set。随后补齐:

- `9709_w19_qp_12`
- `9709_w19_qp_13`

并重新生成六份 source-set 的 candidate provenance 和 red-pixel evidence。

## 7. Human Authorization And Isolation

用户人工复核 candidate 后，明确授权直接替换。

替换操作未在 dirty root worktree 执行，而是在隔离 worktree/branch 执行:

- branch: `codex/9709-w19-source-remediation`
- worktree: `/home/samsen/code/ciecopilot-home/.worktrees/codex-9709-w19-source-remediation`

隔离前检查:

- root had unrelated dirty changes; they were not touched.
- `.worktrees/` exists and is ignored.
- `npm run workflow:codex-preflight -- --json` was attempted but failed because package script `workflow:codex-preflight` does not exist.

## 8. Source Replacement

Replacement policy: 保留原 `WM_*.pdf` source paths and filenames，替换文件内容，以免修改 manifest 或扩大 downstream path churn。

替换矩阵:

| Shard | Replaced source path | Candidate copied in | Post-replacement SHA256 |
|---|---|---|---|
| `p1_w_watermarked_001` | `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_11.pdf` | `9709_w19_qp_11.cienotes.pdf` | `1858b0bff5a54c73c83c4cce46219adcc242208c1a2090853762f3bdc073899f` |
| `p1_w_watermarked_001` | `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_12.pdf` | `9709_w19_qp_12.cienotes.pdf` | `091980ffc6a169dcdf46e3b6308d7c5674e970255721c5a1653a26622210ddae` |
| `p1_w_watermarked_001` | `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_13.pdf` | `9709_w19_qp_13.cienotes.pdf` | `26aad45a9bdadb1bd52203b3900599ba4649ab0097b41ae409e67dfa4b229aa6` |
| `p3_w_watermarked_001` | `data/past-papers/9709Mathematics/paper3/WM_9709_w19_qp_31.pdf` | `9709_w19_qp_31.cienotes.pdf` | `38e6bb1aa32d46daf74f99c68407301ba6b84e4baa3f62a24f0626d69433bfba` |
| `p3_w_watermarked_001` | `data/past-papers/9709Mathematics/paper3/WM_9709_w19_qp_32.pdf` | `9709_w19_qp_32.cienotes.pdf` | `32b82ba20c80fbd9ca8d4d447be3d37a0b85c3570f27e22bd49c97f457d60752` |
| `p3_w_watermarked_001` | `data/past-papers/9709Mathematics/paper3/WM_9709_w19_qp_33.pdf` | `9709_w19_qp_33.cienotes.pdf` | `e2ce963fc2bef5462f9f32cfab41620693caf080f2a3cd43baf835437e3ff0b8` |

## 9. Post-Replacement Verification

替换后对 tracked source PDF 本身重新做本地渲染核验。

Durable evidence:

- `docs/reports/2026-05-28-9709-winter-watermarked-replaced-source-red-pixel-stats.json`

Result:

| Replaced source | Pages rendered | PDF title | Sum red pixels | Max red pixels on a page |
|---|---:|---|---:|---:|
| `WM_9709_w19_qp_11.pdf` | 20 | `9709_11_Nov19.dvi` | 0 | 0 |
| `WM_9709_w19_qp_12.pdf` | 20 | `9709_12_Nov19.dvi` | 0 | 0 |
| `WM_9709_w19_qp_13.pdf` | 20 | `9709_13_Nov19.dvi` | 0 | 0 |
| `WM_9709_w19_qp_31.pdf` | 20 | `9709_31_Nov19.dvi` | 0 | 0 |
| `WM_9709_w19_qp_32.pdf` | 20 | `9709_32_Nov19.dvi` | 0 | 0 |
| `WM_9709_w19_qp_33.pdf` | 20 | `9709_33_Nov19.dvi` | 0 | 0 |

Script sanity check:

- `python3 -m compileall scripts/vlm/run_pdf_page_chain_extraction_v1.py scripts/vlm/run_pdf_page_chain_batch_evaluator_v1.py scripts/vlm/build_pdf_page_chain_review_crops_v1.py scripts/vlm/build_9709_page_chain_shard_bundle_v1.py scripts/vlm/review_9709_page_chain_shard_bundle_v1.py`
- result: passed

Focused pytest was attempted with `python3 -m pytest ...`, but this environment does not have the `pytest` module installed. No dependency installation was performed.

## 10. Not Executed And Current Stop Point

The next minimal chain step is page-chain extraction rerun. In this repo, that path invokes:

- `scripts/vlm/run_pdf_page_chain_extraction_v1.py`
- `scripts.vlm.qwen_openai_client_v1.call_qwen_openai_v1`

That is an external VLM/API call. It was not executed during the replacement step because the original task boundary required explicit approval before external VLM calls.

Not executed:

- page-chain extraction rerun
- review crop regeneration from new page-chain payloads
- evidence bundle regeneration from new page-chain payloads
- post-extraction visual review rerun
- human visual disposition acceptance
- authority sidecar
- DB backfill
- search gate
- release preflight
- production-ready closeout

## Current Conclusion

- `p1_w_watermarked_001`: source replacement complete for all 3 PDFs; local render check shows zero red watermark pixels after replacement. Downstream shard closeout remains blocked until page-chain/crops/evidence/visual-review are rerun and accepted.
- `p3_w_watermarked_001`: source replacement complete for all 3 PDFs; local render check shows zero red watermark pixels after replacement. Downstream shard closeout remains blocked until page-chain/crops/evidence/visual-review are rerun and accepted.

Current claim: source artifact replacement is complete and locally render-verified.

Not claimed: shard production-ready.
