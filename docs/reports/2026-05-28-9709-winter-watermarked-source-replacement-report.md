# 9709 Winter Watermarked Source Replacement Report

日期: 2026-05-28

## Scope

本报告记录已授权的 source remediation replacement。范围只限两个 visual-stop shard 的 Winter 2019 watermarked source PDF:

- `p1_w_watermarked_001`: `WM_9709_w19_qp_11.pdf`, `WM_9709_w19_qp_12.pdf`, `WM_9709_w19_qp_13.pdf`
- `p3_w_watermarked_001`: `WM_9709_w19_qp_31.pdf`, `WM_9709_w19_qp_32.pdf`, `WM_9709_w19_qp_33.pdf`

本次只替换 source artifacts，并做本地 PDF identity/render verification。未修改 manifest，未运行 authority sidecar、DB backfill、search gate、release preflight，也未扩大到 P2/P4/P5/P6。

## Replacement Policy

为保持现有 manifest 和下游路径兼容，本次保留原 source 路径和文件名，将对应 `WM_*.pdf` 的文件内容替换为已核验的 non-red-watermarked CieNotes candidate PDF。

候选 provenance 详见:

- `docs/reports/2026-05-28-9709-winter-watermarked-external-source-candidates.md`

## Source Replacement Matrix

| Shard | Source path replaced | Candidate source | Pre-replacement SHA256 | Post-replacement SHA256 |
|---|---|---|---|---|
| `p1_w_watermarked_001` | `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_11.pdf` | `tmp/9709_source_candidates/2026-05-28/9709_w19_qp_11.cienotes.pdf` | `47e451d92e9733bd27a2308d45ceade6d63f8e85f1a60c649d63af7dbba39f82` | `1858b0bff5a54c73c83c4cce46219adcc242208c1a2090853762f3bdc073899f` |
| `p1_w_watermarked_001` | `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_12.pdf` | `tmp/9709_source_candidates/2026-05-28/9709_w19_qp_12.cienotes.pdf` | `bc6f4f18107293610c9f0b575f0f042c2ed2cab7fd69c0f00a41934f5dddb526` | `091980ffc6a169dcdf46e3b6308d7c5674e970255721c5a1653a26622210ddae` |
| `p1_w_watermarked_001` | `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_13.pdf` | `tmp/9709_source_candidates/2026-05-28/9709_w19_qp_13.cienotes.pdf` | `21f2fb39b20692c4ce931ccac3d29f69d03bbd97fa8dae166edbdf5de43c894e` | `26aad45a9bdadb1bd52203b3900599ba4649ab0097b41ae409e67dfa4b229aa6` |
| `p3_w_watermarked_001` | `data/past-papers/9709Mathematics/paper3/WM_9709_w19_qp_31.pdf` | `tmp/9709_source_candidates/2026-05-28/9709_w19_qp_31.cienotes.pdf` | `445becc8beea35b47a3f985a36c6f34a4ee2a610741ec381eecb705dfc5918eb` | `38e6bb1aa32d46daf74f99c68407301ba6b84e4baa3f62a24f0626d69433bfba` |
| `p3_w_watermarked_001` | `data/past-papers/9709Mathematics/paper3/WM_9709_w19_qp_32.pdf` | `tmp/9709_source_candidates/2026-05-28/9709_w19_qp_32.cienotes.pdf` | `2f9ce1915b077a19bf053d7bff994def9c65444818fcf7b45957174c8267cd5f` | `32b82ba20c80fbd9ca8d4d447be3d37a0b85c3570f27e22bd49c97f457d60752` |
| `p3_w_watermarked_001` | `data/past-papers/9709Mathematics/paper3/WM_9709_w19_qp_33.pdf` | `tmp/9709_source_candidates/2026-05-28/9709_w19_qp_33.cienotes.pdf` | `3a4b7db034d8b05269b913f37012e11458a76374592c9c261b1502162e94a2ed` | `e2ce963fc2bef5462f9f32cfab41620693caf080f2a3cd43baf835437e3ff0b8` |

Post-replacement SHA256 values match the CieNotes candidate SHA256 values recorded before replacement.

## Local Verification

### File identity

All six replacement files are valid PDF documents, version 1.3, with 20 pages each. The extracted PDF titles match the expected Cambridge paper IDs:

| Source path | PDF title |
|---|---|
| `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_11.pdf` | `9709_11_Nov19.dvi` |
| `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_12.pdf` | `9709_12_Nov19.dvi` |
| `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_13.pdf` | `9709_13_Nov19.dvi` |
| `data/past-papers/9709Mathematics/paper3/WM_9709_w19_qp_31.pdf` | `9709_31_Nov19.dvi` |
| `data/past-papers/9709Mathematics/paper3/WM_9709_w19_qp_32.pdf` | `9709_32_Nov19.dvi` |
| `data/past-papers/9709Mathematics/paper3/WM_9709_w19_qp_33.pdf` | `9709_33_Nov19.dvi` |

### Red-watermark render check

Rendering method:

- Renderer: `pdfjs-dist + @napi-rs/canvas`
- Scale: `1.5`
- Rule: red pixel if `r > 150 && g < 110 && b < 110`
- Evidence JSON: `docs/reports/2026-05-28-9709-winter-watermarked-replaced-source-red-pixel-stats.json` (durable copy), also emitted at `tmp/9709_source_remediation/2026-05-28/replaced-source-red-pixel-stats.json`

| Replaced source | Pages rendered | Sum red pixels | Max red pixels on a page | Minimum non-white pixels on a page |
|---|---:|---:|---:|---:|
| `WM_9709_w19_qp_11.pdf` | 20 | 0 | 0 | 25447 |
| `WM_9709_w19_qp_12.pdf` | 20 | 0 | 0 | 1531 |
| `WM_9709_w19_qp_13.pdf` | 20 | 0 | 0 | 25647 |
| `WM_9709_w19_qp_31.pdf` | 20 | 0 | 0 | 1531 |
| `WM_9709_w19_qp_32.pdf` | 20 | 0 | 0 | 1538 |
| `WM_9709_w19_qp_33.pdf` | 20 | 0 | 0 | 1536 |

This confirms the tracked replacement source files render without the red watermark pixels that blocked the earlier visual review.

### Script sanity checks

Executed local compile check for the relevant page-chain/crop/evidence/review scripts:

`python3 -m compileall scripts/vlm/run_pdf_page_chain_extraction_v1.py scripts/vlm/run_pdf_page_chain_batch_evaluator_v1.py scripts/vlm/build_pdf_page_chain_review_crops_v1.py scripts/vlm/build_9709_page_chain_shard_bundle_v1.py scripts/vlm/review_9709_page_chain_shard_bundle_v1.py`

Result: passed.

Attempted focused pytest with `python3 -m pytest ...`, but this worktree environment has no `pytest` module installed. No dependency installation was performed.

## Not Yet Executed

The next page-chain extraction step invokes `scripts/vlm/run_pdf_page_chain_extraction_v1.py`, which calls `call_qwen_openai_v1` and therefore requires an external VLM/API call. That was not executed in this turn because the original boundary required explicit approval before external VLM calls.

Not executed yet:

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

## Current Decision

Source replacement is complete in the isolated branch `codex/9709-w19-source-remediation`.

Current shard conclusion:

- `p1_w_watermarked_001`: source PDF remediation replacement complete; local render check shows all three replaced PDFs have zero red watermark pixels. Shard closeout is still blocked until page-chain/crops/evidence/visual-review are rerun and accepted.
- `p3_w_watermarked_001`: source PDF remediation replacement complete; local render check shows all three replaced PDFs have zero red watermark pixels. Shard closeout is still blocked until page-chain/crops/evidence/visual-review are rerun and accepted.

This is not a production-ready claim. The maximum current claim is: source artifact replacement is complete and locally render-verified; downstream visual-review remediation still needs an approved external VLM/page-chain rerun.
