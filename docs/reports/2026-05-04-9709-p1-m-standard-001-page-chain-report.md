# 9709 p1_m_standard_001 page-chain extraction report

## Scope

本报告记录 `p1_m_standard_001` shard 的 PDF page-chain extraction 结果。该 shard 是全量 scale-out manifest 的第一批 core shard，只覆盖 Paper 1、March session、standard source PDFs。

本次执行只做 page-chain extraction 与本地 evaluator 复核。没有生成 durable question screenshot bundle，没有写 registry/analysis，没有跑 search/classifier/release gate，也不声明该 shard production-ready。

外部模型调用范围已由 operator 明确批准：将 `p1_m_standard_001` 的 8 份 `9709` PDF 渲染页发送到 DashScope/Qwen 做 page-chain extraction。该批准不覆盖其他 shard。

## Shard metadata

- manifest id: `9709_full_scaleout_manifest_v1_p1_m_standard_001`
- shard id: `p1_m_standard_001`
- manifest rows: `85`
- PDFs: `8`
- paper: `1`
- session: `m`
- source class: `standard`
- watermarked PDFs: `0`
- risk tier: `core`
- risk tags: `paper_1_or_3_core_classifier_covered`
- rows requiring review before write-back: `85`

## Execution artifacts

- shard manifest: `tmp/pdf-page-chain/full-scaleout/p1_m_standard_001/shard-manifest.json`
- PDF list: `tmp/pdf-page-chain/full-scaleout/p1_m_standard_001/pdf-list.txt`
- Qwen output payloads: `tmp/pdf-page-chain/full-scaleout/p1_m_standard_001/outputs/*.json`
- rendered pages: `tmp/pdf-page-chain/full-scaleout/p1_m_standard_001/renders/`
- original evaluator report: `tmp/pdf-page-chain/full-scaleout/p1_m_standard_001/report.json`
- rebuilt evaluator report: `tmp/pdf-page-chain/full-scaleout/p1_m_standard_001/report-rebuilt.json`

The `tmp/` artifacts are local ignored artifacts. This report and the companion JSON summary are the tracked durable record for this shard run.

## Page-chain result

| PDF | pages processed | extracted questions | status | warnings |
| --- | ---: | ---: | --- | --- |
| `9709_m16_qp_12.pdf` | `8/8` | `10` | `passed` | none |
| `9709_m17_qp_12.pdf` | `20/20` | `10` | `passed` | none |
| `9709_m18_qp_12.pdf` | `20/20` | `11` | `passed` | none |
| `9709_m19_qp_12.pdf` | `20/20` | `10` | `passed` | none |
| `9709_m21_qp_12.pdf` | `20/20` | `11` | `passed` | `subpart_mark_count_mismatch` |
| `9709_m22_qp_12.pdf` | `20/20` | `11` | `passed` | none |
| `9709_m23_qp_12.pdf` | `20/20` | `11` | `passed` | none |
| `9709_m24_qp_12.pdf` | `16/16` | `11` | `passed` | none |

Summary:

- total PDFs: `8`
- passed PDFs: `8`
- blocked PDFs: `0`
- warning PDFs: `1`
- blocker counts: `{}`
- warning counts: `{ "subpart_mark_count_mismatch": 1 }`

## Warning review

The only warning is on:

- `data/past-papers/9709Mathematics/paper1/9709_m21_qp_12.pdf`
- payload: `tmp/pdf-page-chain/full-scaleout/p1_m_standard_001/outputs/9709_m21_qp_12_page_chain.json`
- warning: `subpart_mark_count_mismatch`

Local visual spot check of the rendered pages shows the warning is concentrated around question `9`, which has nested subparts under part `(a)` and then continues to part `(b)` on the next rendered page. The page-chain did not report a blocker and did preserve the continuation evidence, but its extracted marks list includes duplicate/nested mark structure that should not be written through without human review or normalization.

Current posture:

- not a page-chain blocker
- safe to keep as `passed_with_warning`
- not safe for unattended evidence write-back
- requires human review before evidence bundle, registry/analysis write-back, and release gate

## Local rebuild verification

The payload-only evaluator was rerun from the 8 saved Qwen payloads without any new external model calls.

Result:

```json
{
  "total_pdfs": 8,
  "passed_pdfs": 8,
  "blocked_pdfs": 0,
  "warning_pdfs": 1,
  "blocker_counts": {},
  "warning_counts": {
    "subpart_mark_count_mismatch": 1
  }
}
```

The rebuilt report summary matches the original report summary. The item lists are equivalent after ignoring the expected path-field name difference: original batch report records `output_path`, while payload-only rebuild records `payload_path`.

## Stop point

Stop here before claiming production readiness. The next valid steps for this shard are:

1. Human review `9709_m21_qp_12` question `9` mark/subpart mapping.
2. Rebuild the shard screenshot/evidence bundle only after the warning disposition is recorded.
3. Run post-extraction review and consistency checks on the evidence bundle.
4. Backfill registry and analysis only after review passes.
5. Run search/classifier/release gate.
6. Only if the gate passes, mark `p1_m_standard_001` production-ready.
