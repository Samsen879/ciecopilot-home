# 9709 p2_m_standard_001 page-chain extraction report

## Scope

本报告记录 `p2_m_standard_001` shard 的 PDF page-chain extraction 结果。该 shard 覆盖 Paper 2、March session、standard source PDFs，用于验证 mechanics/P2 线是否能按既有模板进入后续 production-ready 流程。

本次执行只做 page-chain extraction、本地 payload evaluator 复核、review crop/evidence bundle 构建和后续 authority stop。没有写 registry/analysis，没有跑 search/classifier/release gate，也不声明该 shard production-ready。

外部模型调用范围：将 `p2_m_standard_001` 的 8 份 PDF 渲染页发送到 DashScope/Qwen 做 page-chain extraction；targeted visual review 后续只用于关闭视觉队列。Windows-host PowerShell transport 中途超时，最终使用 `QWEN_OPENAI_TRANSPORT=direct` 完成。

## Shard metadata

- manifest id: `9709_full_scaleout_manifest_v1_p2_m_standard_001`
- shard id: `p2_m_standard_001`
- manifest rows: `57`
- PDFs: `8`
- paper: `2`
- session: `m`
- source class: `standard`
- watermarked PDFs: `0`
- risk tier: `medium`
- risk tags: `paper_2_or_4_needs_mechanics_release_coverage`

## Execution artifacts

- shard manifest: `tmp/pdf-page-chain/full-scaleout/p2_m_standard_001/shard-manifest.json`
- PDF list: `tmp/pdf-page-chain/full-scaleout/p2_m_standard_001/pdf-list.txt`
- Qwen output payloads: `tmp/pdf-page-chain/full-scaleout/p2_m_standard_001/outputs/*.json`
- rendered pages: `tmp/pdf-page-chain/full-scaleout/p2_m_standard_001/renders/`
- tracked evaluator report: `docs/reports/2026-05-30-9709-p2-m-standard-001-page-chain-report.json`
- tracked payload rebuild report: `docs/reports/2026-05-30-9709-p2-m-standard-001-page-chain-report-rebuilt.json`

The `tmp/` artifacts are local ignored artifacts. This report and companion JSON files are the tracked durable record for this shard run.

## Page-chain result

| PDF | pages processed | extracted questions | status | warnings |
| --- | ---: | ---: | --- | --- |
| `9709_m16_qp_22.pdf` | `4/4` | `8` | `passed` | none |
| `9709_m17_qp_22.pdf` | `12/12` | `7` | `passed` | none |
| `9709_m18_qp_22.pdf` | `16/16` | `7` | `passed` | none |
| `9709_m19_qp_22.pdf` | `12/12` | `7` | `passed` | none |
| `9709_m21_qp_22.pdf` | `16/16` | `7` | `passed` | none |
| `9709_m22_qp_22.pdf` | `12/12` | `7` | `passed` | none |
| `9709_m23_qp_22.pdf` | `16/16` | `7` | `passed` | none |
| `9709_m24_qp_22.pdf` | `16/16` | `7` | `passed` | none |

Summary:

- total PDFs: `8`
- passed PDFs: `8`
- blocked PDFs: `0`
- warning PDFs: `0`
- blocker counts: `{}`
- warning counts: `{}`

## Local rebuild verification

The payload-only evaluator was rerun from the 8 saved Qwen payloads without new external model calls.

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

The rebuilt report summary matches the original report summary: 8/8 PDFs passed, 57 questions extracted, 0 blockers, 0 warnings.

## Stop point

Extraction mechanics passed for this shard. The next required stop is evidence/post-extraction review and then mechanics authority alignment. Do not proceed to DB write-back, search gate, release preflight-as-pass, or production-ready closeout until authority coverage is proven.
