# 9709 全量截图与 analysis scale-out inventory

## 范围

本报告只完成全量 inventory、scale-out manifest 与分片跑批计划。没有调用 VLM，没有重建截图，没有写数据库，也没有声明全量 production-ready。

## Inventory 结果

- PDFs total: `360`
- watermarked PDFs: `42`
- targeted question slots: `5400`
- locator found rows: `2935`
- parseable question rows: `2935`
- missing locator rows: `2465`
- low-score rows: `0`
- multi-page locator rows: `923`
- durable repo PNG rows: `0`
- missing durable repo PNG rows: `2935`
- tracked evidence rows: `300`
- missing tracked evidence rows: `2635`

Note: `targeted question slots` means the dry locator probed q01-q15 for each PDF. `missing locator rows` are unresolved probe slots, not proof that a real printed question is missing.

## DB coverage

```json
{
  "status": "available",
  "expected_rows": 2935,
  "registry_rows": 306,
  "active_analysis_rows": 306,
  "missing_registry_rows": 2629,
  "missing_active_analysis_rows": 2629
}
```

## Manifest

- scale-out manifest: `data/manifests/9709_full_scaleout_manifest_v1.json`
- shard size: `300`
- shards total: `36`

## Shards

| shard | rows | PDFs | papers | risk | risk tags |
| --- | ---: | ---: | --- | --- | --- |
| `p1_m_standard_001` | 85 | 8 | 1 | core | paper_1_or_3_core_classifier_covered |
| `p1_m_watermarked_001` | 12 | 1 | 1 | core | paper_1_or_3_core_classifier_covered, watermarked_source_pdf |
| `p1_s_standard_001` | 259 | 24 | 1 | core | paper_1_or_3_core_classifier_covered |
| `p1_s_watermarked_001` | 33 | 3 | 1 | core | paper_1_or_3_core_classifier_covered, watermarked_source_pdf |
| `p1_w_standard_001` | 228 | 21 | 1 | core | paper_1_or_3_core_classifier_covered |
| `p1_w_watermarked_001` | 32 | 3 | 1 | core | paper_1_or_3_core_classifier_covered, watermarked_source_pdf |
| `p2_m_standard_001` | 57 | 8 | 2 | medium | paper_2_or_4_needs_mechanics_release_coverage |
| `p2_m_watermarked_001` | 7 | 1 | 2 | medium | paper_2_or_4_needs_mechanics_release_coverage, watermarked_source_pdf |
| `p2_s_standard_001` | 173 | 24 | 2 | medium | paper_2_or_4_needs_mechanics_release_coverage |
| `p2_s_watermarked_001` | 23 | 3 | 2 | medium | paper_2_or_4_needs_mechanics_release_coverage, watermarked_source_pdf |
| `p2_w_standard_001` | 151 | 21 | 2 | medium | paper_2_or_4_needs_mechanics_release_coverage |
| `p2_w_watermarked_001` | 22 | 3 | 2 | medium | paper_2_or_4_needs_mechanics_release_coverage, watermarked_source_pdf |
| `p3_m_standard_001` | 83 | 8 | 3 | core | paper_1_or_3_core_classifier_covered |
| `p3_m_watermarked_001` | 10 | 1 | 3 | core | paper_1_or_3_core_classifier_covered, watermarked_source_pdf |
| `p3_s_standard_001` | 246 | 24 | 3 | core | paper_1_or_3_core_classifier_covered |
| `p3_s_watermarked_001` | 30 | 3 | 3 | core | paper_1_or_3_core_classifier_covered, watermarked_source_pdf |
| `p3_w_standard_001` | 219 | 21 | 3 | core | paper_1_or_3_core_classifier_covered |
| `p3_w_watermarked_001` | 30 | 3 | 3 | core | paper_1_or_3_core_classifier_covered, watermarked_source_pdf |
| `p4_m_standard_001` | 55 | 8 | 4 | medium | paper_2_or_4_needs_mechanics_release_coverage |
| `p4_m_watermarked_001` | 7 | 1 | 4 | medium | paper_2_or_4_needs_mechanics_release_coverage, watermarked_source_pdf |
| `p4_s_standard_001` | 164 | 24 | 4 | medium | paper_2_or_4_needs_mechanics_release_coverage |
| `p4_s_watermarked_001` | 20 | 3 | 4 | medium | paper_2_or_4_needs_mechanics_release_coverage, watermarked_source_pdf |
| `p4_w_standard_001` | 145 | 21 | 4 | medium | paper_2_or_4_needs_mechanics_release_coverage |
| `p4_w_watermarked_001` | 21 | 3 | 4 | medium | paper_2_or_4_needs_mechanics_release_coverage, watermarked_source_pdf |
| `p5_m_standard_001` | 54 | 8 | 5 | high | paper_5_or_6_outside_current_release_scope |
| `p5_m_watermarked_001` | 6 | 1 | 5 | high | paper_5_or_6_outside_current_release_scope, watermarked_source_pdf |
| `p5_s_standard_001` | 164 | 24 | 5 | high | paper_5_or_6_outside_current_release_scope |
| `p5_s_watermarked_001` | 21 | 3 | 5 | high | paper_5_or_6_outside_current_release_scope, watermarked_source_pdf |
| `p5_w_standard_001` | 142 | 21 | 5 | high | paper_5_or_6_outside_current_release_scope |
| `p5_w_watermarked_001` | 21 | 3 | 5 | high | paper_5_or_6_outside_current_release_scope, watermarked_source_pdf |
| `p6_m_standard_001` | 54 | 8 | 6 | high | paper_5_or_6_outside_current_release_scope |
| `p6_m_watermarked_001` | 7 | 1 | 6 | high | paper_5_or_6_outside_current_release_scope, watermarked_source_pdf |
| `p6_s_standard_001` | 170 | 24 | 6 | high | paper_5_or_6_outside_current_release_scope |
| `p6_s_watermarked_001` | 19 | 3 | 6 | high | paper_5_or_6_outside_current_release_scope, watermarked_source_pdf |
| `p6_w_standard_001` | 144 | 21 | 6 | high | paper_5_or_6_outside_current_release_scope |
| `p6_w_watermarked_001` | 21 | 3 | 6 | high | paper_5_or_6_outside_current_release_scope, watermarked_source_pdf |

## 执行停点

1. 先按 shard 跑 PDF page-chain dry-run/evaluator，禁止混跑 paper、session 与 watermarked/non-watermarked PDF。
2. 每个 shard 生成截图/evidence bundle 后，先跑 diff 和 release-preflight-style consistency check。
3. 对 warning/high-risk 做人工抽查，尤其是 diagram/table/multi-page/watermark。
4. 人工确认后再做 analysis backfill、search/classifier/release gate。
5. 只有单个 shard 通过 gate，才能说该 shard production-ready；不能把当前 inventory 当作全量 ready 证明。
