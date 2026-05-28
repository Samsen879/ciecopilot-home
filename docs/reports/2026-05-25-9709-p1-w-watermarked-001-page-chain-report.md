# 9709 p1_w_watermarked_001 page-chain extraction report

日期: 2026-05-25

## Scope

本报告只记录 `p1_w_watermarked_001` shard 的 PDF page-chain extraction 结果。

- shard id: `p1_w_watermarked_001`
- manifest rows: `32`
- PDFs: `3`
- source PDFs:
  - `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_11.pdf`
  - `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_12.pdf`
  - `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_13.pdf`
- source class: `watermarked`
- risk tier: `core`
- risk tags: `paper_1_or_3_core_classifier_covered`, `watermarked_source_pdf`

外部模型调用范围限定为这三份 watermarked PDF 的 rendered pages。该批准不覆盖其他 shard。

## Page-Chain Result

| PDF | pages processed | extracted questions | status | warnings |
| --- | ---: | ---: | --- | --- |
| `WM_9709_w19_qp_11.pdf` | `20/20` | `11` | `passed` | none |
| `WM_9709_w19_qp_12.pdf` | `20/20` | `10` | `passed` | `subpart_mark_count_mismatch` |
| `WM_9709_w19_qp_13.pdf` | `20/20` | `11` | `passed` | none |

Summary:

- total PDFs: `3`
- passed PDFs: `3`
- blocked PDFs: `0`
- warning PDFs: `1`
- blocker counts: `{}`
- warning counts: `{"subpart_mark_count_mismatch":1}`

The only page-chain warning is `subpart_mark_count_mismatch` on `WM_9709_w19_qp_12.pdf` q06; it is handled by `docs/reports/2026-05-25-9709-p1-w-watermarked-001-warning-disposition.json`.

## Downstream Posture

This page-chain report alone does not claim production readiness. The shard stops at visual review because targeted high-resolution visual review found watermark occlusion blockers in `WM_9709_w19_qp_11` q07-q11.
