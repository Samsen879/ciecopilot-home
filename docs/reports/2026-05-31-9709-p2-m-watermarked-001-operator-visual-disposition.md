# 9709 p2_m_watermarked_001 operator visual disposition

status: `accepted`

## Scope

- shard: `p2_m_watermarked_001`
- reviewed items: `7`
- accepted: `7`
- rejected: `0`
- operator overrides: `2`

## Basis

The targeted VLM review accepted 5/7 items and rejected q03/q04 only because a red source watermark was present. For both rejected items, the VLM also reported that the question boundary was accepted and that the question content was legible and complete.

For this watermarked shard, `watermarked_source_pdf` is a review reason rather than an automatic blocker when the watermark does not occlude required question content. q03 and q04 are therefore accepted under operator review, while retaining the original VLM rejected evidence in `docs/reports/2026-05-31-9709-p2-m-watermarked-001-targeted-visual-vlm-review.json`.

## Accepted Review Reasons

- `diagram_lane`: `1`
- `multi_page_question`: `3`
- `watermarked_source_pdf`: `7`

## Evidence

- targeted VLM review: `docs/reports/2026-05-31-9709-p2-m-watermarked-001-targeted-visual-vlm-review.json`
- raw VLM-assisted dispositions: `docs/reports/2026-05-31-9709-p2-m-watermarked-001-vlm-assisted-visual-dispositions.json`
- operator dispositions JSON: `docs/reports/2026-05-31-9709-p2-m-watermarked-001-operator-visual-dispositions.json`

## Stop Point

This closes only the post-extraction visual queue. It is not authority alignment or production-ready approval.
