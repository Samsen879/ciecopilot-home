# 9709 p5_w_watermarked_001 operator visual disposition

Verdict: `accepted` for `21/21` rows.

## Scope

- shard: `p5_w_watermarked_001`
- raw VLM dispositions: `docs/reports/2026-06-01-9709-p5-w-watermarked-001-vlm-assisted-visual-dispositions.json`
- targeted visual review: `docs/reports/2026-06-01-9709-p5-w-watermarked-001-targeted-visual-vlm-review.json`
- operator dispositions: `docs/reports/2026-06-01-9709-p5-w-watermarked-001-operator-visual-dispositions.json`

## Summary

- accepted: `21/21`
- rejected: `0`
- operator overrides: `6`
- diagram_lane accepted reasons: `6`
- multi_page_question accepted reasons: `7`
- watermarked_source_pdf accepted reasons: `21`

## Operator overrides

The `6` overrides are watermark-only VLM rejections. In each overridden item, the VLM accepted the question boundary and did not identify a diagram/table or cross-page continuity failure; the operator treats `watermarked_source_pdf` as the queued-review reason under this watermarked-shard contract, not as an automatic visual rejection when legibility and completeness checks are intact.

## Boundary

This operator disposition only closes the visual review queue for this shard. It does not perform authority alignment, DB write-back, search-gate approval, or full 9709 production-ready approval.
