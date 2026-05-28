# 9709 p3_w_watermarked_001 page-chain extraction report

日期: 2026-05-26

## Scope

本报告只记录 `p3_w_watermarked_001` shard 的 PDF page-chain extraction 结果。

- shard id: `p3_w_watermarked_001`
- manifest rows: `30`
- PDFs: `3`
- source PDFs:
  - `data/past-papers/9709Mathematics/paper3/WM_9709_w19_qp_31.pdf`
  - `data/past-papers/9709Mathematics/paper3/WM_9709_w19_qp_32.pdf`
  - `data/past-papers/9709Mathematics/paper3/WM_9709_w19_qp_33.pdf`
- source class: `watermarked`
- risk tier: `core`
- risk tags: `paper_1_or_3_core_classifier_covered`, `watermarked_source_pdf`

外部模型调用范围限定为这三份 watermarked PDF 的 rendered pages。该批准不覆盖其他 shard。

## Page-Chain Result

| PDF | pages processed | extracted questions | status | warnings |
| --- | ---: | ---: | --- | --- |
| `WM_9709_w19_qp_31.pdf` | `20/20` | `10` | `passed` | none |
| `WM_9709_w19_qp_32.pdf` | `20/20` | `10` | `passed` | none |
| `WM_9709_w19_qp_33.pdf` | `20/20` | `10` | `passed` | none |

Summary:

- total PDFs: `3`
- passed PDFs: `3`
- blocked PDFs: `0`
- warning PDFs: `0`
- blocker counts: `{}`
- warning counts: `{}`

## Downstream Posture

This page-chain report alone does not claim production readiness. The shard stops at visual review because targeted high-resolution visual review found watermark occlusion blockers across the watermarked source PDFs.
