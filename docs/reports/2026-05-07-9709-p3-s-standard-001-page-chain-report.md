# 9709 p3_s_standard_001 page-chain extraction report

## Scope

本报告记录 `p3_s_standard_001` shard 的 PDF page-chain extraction 结果。该 shard 是全量 scale-out manifest 的 core shard，只覆盖 Paper 3、summer session、standard source PDFs。

外部模型调用范围已由 operator 明确批准: 将 `p3_s_standard_001` 的 24 份 `9709` PDF 渲染页发送到 DashScope/Qwen 做 page-chain extraction。该批准不覆盖其他 shard。

本报告只记录 page-chain extraction 与本地 evaluator 复核。后续 evidence bundle、authority sidecar、registry/analysis backfill 和 gates 需要继续按 shard-scoped 流程独立记录。

## Shard Metadata

- manifest id: `9709_full_scaleout_manifest_v1_p3_s_standard_001`
- shard id: `p3_s_standard_001`
- manifest rows: `246`
- PDFs: `24`
- paper: `3`
- session: `s`
- source class: `standard`
- watermarked PDFs: `0`
- risk tier: `core`
- risk tags: `paper_1_or_3_core_classifier_covered`

## Execution Artifacts

- shard manifest: `tmp/pdf-page-chain/full-scaleout/p3_s_standard_001/shard-manifest.json`
- PDF list: `tmp/pdf-page-chain/full-scaleout/p3_s_standard_001/pdf-list.txt`
- Qwen output payloads: `tmp/pdf-page-chain/full-scaleout/p3_s_standard_001/outputs/*.json`
- rendered pages: `tmp/pdf-page-chain/full-scaleout/p3_s_standard_001/renders/`
- durable JSON report: `docs/reports/2026-05-07-9709-p3-s-standard-001-page-chain-report.json`
- durable surface manifest: `data/manifests/9709_p3_s_standard_001_page_chain_surface_v1.json`

The `tmp/` artifacts are local ignored artifacts. This report and the companion JSON summary are the tracked durable record for this shard run.

## Page-Chain Result

| PDF | pages processed | extracted questions | status | warnings |
| --- | ---: | ---: | --- | --- |
| `9709_s16_qp_31.pdf` | `4/4` | `10` | `passed` | none |
| `9709_s16_qp_32.pdf` | `4/4` | `10` | `passed` | none |
| `9709_s16_qp_33.pdf` | `4/4` | `10` | `passed` | none |
| `9709_s17_qp_31.pdf` | `20/20` | `10` | `passed` | none |
| `9709_s17_qp_32.pdf` | `20/20` | `10` | `passed` | none |
| `9709_s17_qp_33.pdf` | `20/20` | `11` | `passed` | none |
| `9709_s18_qp_31.pdf` | `20/20` | `10` | `passed` | none |
| `9709_s18_qp_32.pdf` | `20/20` | `10` | `passed` | none |
| `9709_s18_qp_33.pdf` | `20/20` | `10` | `passed` | none |
| `9709_s19_qp_31.pdf` | `20/20` | `10` | `passed` | none |
| `9709_s19_qp_32.pdf` | `20/20` | `10` | `passed` | none |
| `9709_s19_qp_33.pdf` | `20/20` | `10` | `passed` | none |
| `9709_s21_qp_31.pdf` | `20/20` | `10` | `passed` | none |
| `9709_s21_qp_32.pdf` | `20/20` | `11` | `passed` | none |
| `9709_s21_qp_33.pdf` | `20/20` | `10` | `passed` | none |
| `9709_s22_qp_31.pdf` | `20/20` | `10` | `passed` | none |
| `9709_s22_qp_32.pdf` | `20/20` | `10` | `passed` | none |
| `9709_s22_qp_33.pdf` | `20/20` | `10` | `passed` | none |
| `9709_s23_qp_31.pdf` | `20/20` | `10` | `passed` | none |
| `9709_s23_qp_32.pdf` | `20/20` | `11` | `passed` | none |
| `9709_s23_qp_33.pdf` | `20/20` | `11` | `passed` | none |
| `9709_s24_qp_31.pdf` | `20/20` | `11` | `passed` | none |
| `9709_s24_qp_32.pdf` | `20/20` | `10` | `passed` | none |
| `9709_s24_qp_33.pdf` | `20/20` | `11` | `passed` | none |

Summary:

- total PDFs: `24`
- passed PDFs: `24`
- blocked PDFs: `0`
- warning PDFs: `0`
- blocker counts: `{}`
- warning counts: `{}`

## Warning Review

No page-chain warnings were emitted for this shard.

## Downstream Posture

This page-chain report alone does not claim production readiness. For `p3_s_standard_001`, production-ready can only be claimed after evidence bundle review, complete authority sidecar, registry backfill, analysis backfill, search gate, and release preflight all pass.
