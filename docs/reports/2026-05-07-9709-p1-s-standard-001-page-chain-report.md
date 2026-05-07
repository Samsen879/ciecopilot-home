# 9709 p1_s_standard_001 page-chain extraction report

## Scope

本报告记录 `p1_s_standard_001` shard 的 PDF page-chain extraction 结果。该 shard 覆盖 Paper 1、summer session、standard source PDFs。

本次执行只记录 page-chain extraction 与本地 evaluator 复核。外部模型调用范围已由 operator 明确批准：将 `p1_s_standard_001` 的 24 份 `9709` PDF 渲染页发送到 DashScope/Qwen 做 page-chain extraction。该批准不覆盖其他 shard。

## Shard Metadata

- manifest id: `9709_full_scaleout_manifest_v1_p1_s_standard_001_page_chain_surface_v1`
- shard id: `p1_s_standard_001`
- manifest rows: `259`
- PDFs: `24`
- paper: `1`
- session: `s`
- source class: `standard`
- watermarked PDFs: `1`
- risk tier: `core`
- risk tags: `paper_1_or_3_core_classifier_covered`

## Execution Artifacts

- shard manifest: `tmp/pdf-page-chain/full-scaleout/p1_s_standard_001/shard-manifest.json`
- PDF list: `tmp/pdf-page-chain/full-scaleout/p1_s_standard_001/pdf-list.txt`
- Qwen output payloads: `tmp/pdf-page-chain/full-scaleout/p1_s_standard_001/outputs/*.json`
- rendered pages: `tmp/pdf-page-chain/full-scaleout/p1_s_standard_001/renders/`
- rebuilt evaluator report: `tmp/pdf-page-chain/full-scaleout/p1_s_standard_001/report-rebuilt.json`
- durable manifest: `data/manifests/9709_p1_s_standard_001_page_chain_surface_v1.json`

## Page-Chain Result

| PDF | pages processed | extracted questions | status | warnings |
| --- | ---: | ---: | --- | --- |
`9709_s16_qp_11.pdf` | `4/4` | `11` | `passed` | none
`9709_s16_qp_12.pdf` | `4/4` | `11` | `passed` | none
`9709_s16_qp_13.pdf` | `4/4` | `11` | `passed` | none
`9709_s17_qp_11.pdf` | `20/20` | `10` | `passed` | none
`9709_s17_qp_12.pdf` | `20/20` | `10` | `passed` | none
`9709_s17_qp_13.pdf` | `20/20` | `11` | `passed` | none
`9709_s18_qp_11.pdf` | `20/20` | `10` | `passed` | none
`9709_s18_qp_12.pdf` | `20/20` | `11` | `passed` | none
`9709_s18_qp_13.pdf` | `20/20` | `11` | `passed` | `subpart_mark_count_mismatch`
`9709_s19_qp_11.pdf` | `24/24` | `11` | `passed` | none
`9709_s19_qp_12.pdf` | `20/20` | `11` | `passed` | none
`9709_s19_qp_13.pdf` | `20/20` | `10` | `passed` | none
`9709_s21_qp_11.pdf` | `20/20` | `11` | `passed` | none
`9709_s21_qp_12.pdf` | `20/20` | `12` | `passed` | none
`9709_s21_qp_13.pdf` | `20/20` | `11` | `passed` | none
`9709_s22_qp_11.pdf` | `20/20` | `10` | `passed` | none
`9709_s22_qp_12.pdf` | `20/20` | `11` | `passed` | none
`9709_s22_qp_13.pdf` | `20/20` | `11` | `passed` | none
`9709_s23_qp_11.pdf` | `20/20` | `12` | `passed` | none
`9709_s23_qp_12.pdf` | `20/20` | `11` | `passed` | none
`9709_s23_qp_13.pdf` | `16/16` | `10` | `passed` | none
`9709_s24_qp_11.pdf` | `20/20` | `11` | `passed` | none
`9709_s24_qp_12.pdf` | `20/20` | `10` | `passed` | none
`9709_s24_qp_13.pdf` | `20/20` | `11` | `passed` | none

Summary:

- total PDFs: `24`
- passed PDFs: `24`
- blocked PDFs: `0`
- warning PDFs: `1`
- blocker counts: `{}`
- warning counts: `{"subpart_mark_count_mismatch":1}`

## Warning Review

The only extraction warning is `subpart_mark_count_mismatch` on `9709_s18_qp_13` question `7`.

Formal disposition:

- JSON: `docs/reports/2026-05-07-9709-p1-s-standard-001-warning-disposition.json`
- Markdown: `docs/reports/2026-05-07-9709-p1-s-standard-001-warning-disposition.md`
- decision: accepted with normalized subpart structure
- blocker posture: not a blocker

## Downstream Posture

This page-chain report alone does not claim production readiness. For `p1_s_standard_001`, production-ready can only be claimed after evidence bundle review, complete authority sidecar, registry backfill, analysis backfill, search gate, and release preflight all pass.
