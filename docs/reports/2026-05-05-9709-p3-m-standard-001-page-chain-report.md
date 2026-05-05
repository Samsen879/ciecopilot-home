# 9709 p3_m_standard_001 page-chain extraction report

## Scope

本报告记录 `p3_m_standard_001` shard 的 PDF page-chain extraction 结果。该 shard 是全量 scale-out manifest 的 core shard，只覆盖 Paper 3、March session、standard source PDFs。

外部模型调用范围已由 operator 明确批准: 将 `p3_m_standard_001` 的 8 份 `9709` PDF 渲染页发送到 DashScope/Qwen 做 page-chain extraction。该批准不覆盖其他 shard。

本报告只记录 page-chain extraction 与本地 evaluator 复核。后续 evidence bundle、authority sidecar、registry/analysis backfill 和 gates 的闭环结论记录在 shard-scoped production-ready closeout 中。

## Shard Metadata

- manifest id: `9709_full_scaleout_manifest_v1_p3_m_standard_001`
- shard id: `p3_m_standard_001`
- manifest rows: `83`
- PDFs: `8`
- paper: `3`
- session: `m`
- source class: `standard`
- watermarked PDFs: `0`
- risk tier: `core`
- risk tags: `paper_1_or_3_core_classifier_covered`

## Execution Artifacts

- shard manifest: `tmp/pdf-page-chain/full-scaleout/p3_m_standard_001/shard-manifest.json`
- PDF list: `tmp/pdf-page-chain/full-scaleout/p3_m_standard_001/pdf-list.txt`
- Qwen output payloads: `tmp/pdf-page-chain/full-scaleout/p3_m_standard_001/outputs/*.json`
- rendered pages: `tmp/pdf-page-chain/full-scaleout/p3_m_standard_001/renders/`
- original evaluator report: `tmp/pdf-page-chain/full-scaleout/p3_m_standard_001/report.json`
- rebuilt evaluator report: `tmp/pdf-page-chain/full-scaleout/p3_m_standard_001/report-rebuilt.json`
- durable JSON report: `docs/reports/2026-05-05-9709-p3-m-standard-001-page-chain-report.json`

The `tmp/` artifacts are local ignored artifacts. This report and the companion JSON summary are the tracked durable record for this shard run.

## Page-Chain Result

| PDF | pages processed | extracted questions | status | warnings |
| --- | ---: | ---: | --- | --- |
| `9709_m16_qp_32.pdf` | `4/4` | `10` | `passed` | none |
| `9709_m17_qp_32.pdf` | `20/20` | `10` | `passed` | none |
| `9709_m18_qp_32.pdf` | `20/20` | `10` | `passed` | none |
| `9709_m19_qp_32.pdf` | `20/20` | `10` | `passed` | none |
| `9709_m21_qp_32.pdf` | `20/20` | `10` | `passed` | none |
| `9709_m22_qp_32.pdf` | `20/20` | `11` | `passed` | none |
| `9709_m23_qp_32.pdf` | `20/20` | `11` | `passed` | none |
| `9709_m24_qp_32.pdf` | `20/20` | `11` | `passed` | none |

Summary:

- total PDFs: `8`
- passed PDFs: `8`
- blocked PDFs: `0`
- warning PDFs: `0`
- blocker counts: `{}`
- warning counts: `{}`

## Warning Review

No page-chain warnings were emitted for this shard.

## Local Rebuild Verification

The payload-only evaluator was rerun from the 8 saved Qwen payloads without any new external model calls.

Result:

```json
{
  "total_pdfs": 8,
  "passed_pdfs": 8,
  "blocked_pdfs": 0,
  "warning_pdfs": 0,
  "blocker_counts": {},
  "warning_counts": {}
}
```

The rebuilt report summary matches the original report summary.
