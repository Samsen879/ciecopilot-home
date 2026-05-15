# 9709 p3_m_watermarked_001 page-chain extraction report

日期: 2026-05-15

## Scope

本报告只记录 `p3_m_watermarked_001` shard 的 PDF page-chain extraction 结果。

- shard id: `p3_m_watermarked_001`
- manifest rows: `10`
- PDFs: `1`
- source PDF: `data/past-papers/9709Mathematics/paper3/WM_9709_m20_qp_32.pdf`
- source class: `watermarked`
- risk tier: `core`
- risk tags: `paper_1_or_3_core_classifier_covered`, `watermarked_source_pdf`

外部模型调用范围限定为这一份 watermarked PDF 的 rendered pages。该批准不覆盖其他 shard。

## Execution Artifacts

- PDF list: `tmp/pdf-page-chain/full-scaleout/p3_m_watermarked_001/pdf-list.txt`
- Qwen output payload: `tmp/pdf-page-chain/full-scaleout/p3_m_watermarked_001/outputs/WM_9709_m20_qp_32_page_chain.json`
- rendered pages: `tmp/pdf-page-chain/full-scaleout/p3_m_watermarked_001/renders/`
- durable JSON report: `docs/reports/2026-05-15-9709-p3-m-watermarked-001-page-chain-report.json`

The `tmp/` artifacts are local ignored artifacts. The markdown and JSON reports are the durable tracked record for this shard run.

## Page-Chain Result

| PDF | pages processed | extracted questions | status | warnings |
| --- | ---: | ---: | --- | --- |
| `WM_9709_m20_qp_32.pdf` | `20/20` | `10` | `passed` | none |

Summary:

- total PDFs: `1`
- passed PDFs: `1`
- blocked PDFs: `0`
- warning PDFs: `0`
- blocker counts: `{}`
- warning counts: `{}`

Execution note:

- The page-chain extraction completed for all `20` rendered pages.
- The final evaluator report passed with `10` extracted questions and no warnings.

## Downstream Posture

This page-chain report alone does not claim production readiness. For `p3_m_watermarked_001`, the downstream checks are shard-scoped evidence review, human visual disposition, authority sidecar alignment, registry/analysis backfill, search gate, release preflight, and DB coverage.
