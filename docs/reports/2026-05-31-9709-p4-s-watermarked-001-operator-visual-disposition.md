# 9709 p4_s_watermarked_001 operator visual disposition

status: `accepted`

## Scope

- shard: `p4_s_watermarked_001`
- method: targeted VLM-assisted inspection of rendered review crop stacks, followed by operator watermarked-source contract override
- posture: operator-in-the-loop visual disposition; not authority alignment and not full 9709 production-ready approval

## Summary

- reviewed items: `20`
- accepted: `20`
- rejected: `0`
- operator overrides: `6`

## Accepted Review Reasons

- `diagram_lane`: `9`
- `multi_page_question`: `10`
- `watermarked_source_pdf`: `20`

## Operator Override Rule

For this watermarked shard, `watermarked_source_pdf` is treated as a review reason rather than an automatic blocker when targeted visual evidence accepts the question boundary and any required diagram or cross-page continuity checks, and the watermark does not occlude required content.

## Evidence

- targeted review JSON: `docs/reports/2026-05-31-9709-p4-s-watermarked-001-targeted-visual-vlm-review.json`
- raw VLM disposition JSON: `docs/reports/2026-05-31-9709-p4-s-watermarked-001-vlm-assisted-visual-dispositions.json`
- operator disposition JSON: `docs/reports/2026-05-31-9709-p4-s-watermarked-001-operator-visual-dispositions.json`

## Stop Point

This disposition closes only the post-extraction visual queue. Authority alignment, DB write-back, search gate, and release preflight remain separate gates.
