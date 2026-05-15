# 9709 p1_s_watermarked_001 page-chain extraction report

日期: 2026-05-15

## Scope

本报告只记录 `p1_s_watermarked_001` shard 的 PDF page-chain extraction 结果。

- shard id: `p1_s_watermarked_001`
- manifest rows: `33`
- PDFs: `3`
- source PDFs:
  - `data/past-papers/9709Mathematics/paper1/WM_9709_s20_qp_11.pdf`
  - `data/past-papers/9709Mathematics/paper1/WM_9709_s20_qp_12.pdf`
  - `data/past-papers/9709Mathematics/paper1/WM_9709_s20_qp_13.pdf`
- source class: `watermarked`
- risk tier: `core`
- risk tags: `paper_1_or_3_core_classifier_covered`, `watermarked_source_pdf`

外部模型调用范围限定为这三份 watermarked PDF 的 rendered pages。该批准不覆盖其他 shard。

## Execution Artifacts

- PDF list: `tmp/pdf-page-chain/full-scaleout/p1_s_watermarked_001/pdf-list.txt`
- Qwen output payloads: `tmp/pdf-page-chain/full-scaleout/p1_s_watermarked_001/outputs/*_page_chain.json`
- rendered pages: `tmp/pdf-page-chain/full-scaleout/p1_s_watermarked_001/renders/`
- durable JSON report: `docs/reports/2026-05-15-9709-p1-s-watermarked-001-page-chain-report.json`

The `tmp/` artifacts are local ignored artifacts. The markdown and JSON reports are the durable tracked record for this shard run.

## Page-Chain Result

| PDF | pages processed | extracted questions | status | warnings |
| --- | ---: | ---: | --- | --- |
| `WM_9709_s20_qp_11.pdf` | `20/20` | `11` | `passed` | `subpart_mark_count_mismatch` |
| `WM_9709_s20_qp_12.pdf` | `16/16` | `11` | `passed` | none |
| `WM_9709_s20_qp_13.pdf` | `20/20` | `11` | `passed` | none |

Summary:

- total PDFs: `3`
- passed PDFs: `3`
- blocked PDFs: `0`
- warning PDFs: `1`
- blocker counts: `{}`
- warning counts: `{"subpart_mark_count_mismatch":1}`

Execution note:

- The page-chain extraction completed for all rendered pages across the three PDFs.
- The only evaluator warning was `subpart_mark_count_mismatch` on `WM_9709_s20_qp_11.pdf` q06; the accepted warning disposition normalized the visible `(a)[4]` and `(b)[2]` structure.

## Downstream Posture

This page-chain report alone does not claim production readiness. For `p1_s_watermarked_001`, the downstream checks are shard-scoped evidence review, human visual disposition, authority sidecar alignment, registry/analysis backfill, search gate, release preflight, and DB coverage.
