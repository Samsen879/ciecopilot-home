# 9709 p1_w_standard_001 page-chain extraction report

## Scope

本报告记录 `p1_w_standard_001` shard 的 PDF page-chain extraction 结果。该 shard 是全量 scale-out manifest 的 core shard，只覆盖 Paper 1、winter session、standard source PDFs。

外部模型调用范围已由 operator 明确批准: 将 `p1_w_standard_001` 的 21 份 `9709` PDF 渲染页发送到 DashScope/Qwen 做 page-chain extraction。该批准不覆盖其他 shard。

本报告只记录 page-chain extraction 与本地 evaluator 复核。后续 evidence bundle、authority sidecar、registry/analysis backfill 和 gates 需要继续按 shard-scoped 流程独立记录。

## Shard Metadata

- manifest id: `9709_full_scaleout_manifest_v1_p1_w_standard_001`
- shard id: `p1_w_standard_001`
- manifest rows: `228`
- PDFs: `21`
- paper: `1`
- session: `w`
- source class: `standard`
- watermarked PDFs: `0`
- risk tier: `core`
- risk tags: `paper_1_or_3_core_classifier_covered`

## Execution Artifacts

- PDF list: `tmp/pdf-page-chain/full-scaleout/p1_w_standard_001/pdf-list.txt`
- Qwen output payloads: `tmp/pdf-page-chain/full-scaleout/p1_w_standard_001/outputs/*.json`
- rendered pages: `tmp/pdf-page-chain/full-scaleout/p1_w_standard_001/renders/`
- durable JSON report: `docs/reports/2026-05-10-9709-p1-w-standard-001-page-chain-report.json`

The `tmp/` artifacts are local ignored artifacts. This report and the companion JSON summary are the tracked durable record for this shard run.

## Page-Chain Result

| PDF | pages processed | extracted questions | status | warnings |
| --- | ---: | ---: | --- | --- |
| `9709_w16_qp_11.pdf` | `4/4` | `11` | `passed` | none |
| `9709_w16_qp_12.pdf` | `4/4` | `10` | `passed` | none |
| `9709_w16_qp_13.pdf` | `4/4` | `11` | `passed` | none |
| `9709_w17_qp_11.pdf` | `20/20` | `10` | `passed` | none |
| `9709_w17_qp_12.pdf` | `20/20` | `10` | `passed` | none |
| `9709_w17_qp_13.pdf` | `20/20` | `11` | `passed` | none |
| `9709_w18_qp_11.pdf` | `20/20` | `11` | `passed` | `subpart_mark_count_mismatch` |
| `9709_w18_qp_12.pdf` | `20/20` | `11` | `passed` | none |
| `9709_w18_qp_13.pdf` | `20/20` | `11` | `passed` | none |
| `9709_w20_qp_11.pdf` | `20/20` | `12` | `passed` | none |
| `9709_w20_qp_12.pdf` | `20/20` | `11` | `passed` | none |
| `9709_w20_qp_13.pdf` | `20/20` | `11` | `passed` | none |
| `9709_w21_qp_11.pdf` | `20/20` | `10` | `passed` | `subpart_mark_count_mismatch` |
| `9709_w21_qp_12.pdf` | `20/20` | `12` | `passed` | none |
| `9709_w21_qp_13.pdf` | `20/20` | `10` | `passed` | none |
| `9709_w22_qp_11.pdf` | `20/20` | `11` | `passed` | none |
| `9709_w22_qp_12.pdf` | `20/20` | `11` | `passed` | none |
| `9709_w22_qp_13.pdf` | `20/20` | `11` | `passed` | none |
| `9709_w23_qp_11.pdf` | `20/20` | `11` | `passed` | `subpart_mark_count_mismatch` |
| `9709_w23_qp_12.pdf` | `20/20` | `11` | `passed` | none |
| `9709_w23_qp_13.pdf` | `16/16` | `11` | `passed` | none |

Summary:

- total PDFs: `21`
- passed PDFs: `21`
- blocked PDFs: `0`
- warning PDFs: `3`
- blocker counts: `{}`
- warning counts: `{"subpart_mark_count_mismatch":3}`

## Warning Review

The full run passed all 21 PDFs and emitted three `subpart_mark_count_mismatch` warnings:

- `9709_w18_qp_11.pdf`, q11: nested `(a)(i)/(a)(ii)` followed by `(b)(i)/(b)(ii)`.
- `9709_w21_qp_11.pdf`, q05: part `(b)` contains two mark-bearing roman subparts.
- `9709_w23_qp_11.pdf`, q02: answer choices `A`, `B`, and `C` were counted as subpart labels, but the question has one `[4]` allocation.

The warning disposition is tracked in `docs/reports/2026-05-10-9709-p1-w-standard-001-warning-disposition.json`.

## Downstream Posture

This page-chain report alone does not claim production readiness. For `p1_w_standard_001`, production-ready can only be claimed after evidence bundle review, complete authority sidecar, registry backfill, analysis backfill, search gate, and release preflight all pass.
