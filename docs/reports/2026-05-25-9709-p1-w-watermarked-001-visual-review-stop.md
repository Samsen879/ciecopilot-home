# 9709 p1_w_watermarked_001 visual review stop

日期: 2026-05-25

## Scope

本报告记录 `p1_w_watermarked_001` 在 page-chain extraction、review crops、evidence bundles 和 post-extraction review 后的停止点。

当前结论不是 production-ready。该 shard 已完成 extraction/evidence 生成，但 targeted high-resolution visual VLM review 对 `WM_9709_w19_qp_11` 的 q07-q11 给出 watermark occlusion blockers，因此不能继续 authority sidecar、registry backfill、analysis backfill、search gate 或 release preflight。

## Current Evidence

Completed:

- page-chain extraction: `3/3` PDFs passed
- extracted questions: `32`
- page-chain blockers: `0`
- page-chain warnings: `1`
- accepted warning dispositions: `1`
- review crops: `52`
- evidence bundles: `32/32`
- post-extraction blockers: `0`
- post-extraction warnings: `0`

Post-extraction status:

- status: `needs_human_review`
- human review items: `32`
- accepted human dispositions: `0`

Manual review reason counts:

| Reason | Count |
|---|---:|
| `diagram_lane` | `10` |
| `multi_page_question` | `20` |
| `warning_disposition` | `1` |
| `watermarked_source_pdf` | `32` |

## Visual Blocker Evidence

Targeted high-resolution external VLM review artifact: `docs/reports/2026-05-25-9709-p1-w-watermarked-001-targeted-visual-vlm-review.json`.

| Question | Accepted | Key blocker summary |
|---:|---|---|
| `q07` | `false` | red watermark overlays content (prompt text and mark allocations) |
| `q08` | `false` | Red watermark overlays content (prompt text and diagram area), violating occlusion rule |
| `q09` | `false` | red watermark overlays critical content (prompt text and mark allocations) |
| `q10` | `false` | red watermark overlays content (prompt text and diagram area) |
| `q11` | `false` | red watermark overlays critical content (prompt text and mark allocations) |

The earlier full contact-sheet review was treated as diagnostic only because the contact sheet thumbnails produced likely label and boundary misreads. The targeted review used original-resolution per-question crop stacks for q07-q11.

## Gates Not Run

The following stages were intentionally not run:

- authority sidecar creation
- authority-ready batch dry-run
- registry backfill
- analysis hydration
- DB coverage proof
- question search gate
- release preflight
- shard-scoped production-ready closeout

Reason: the supported post-extraction contract requires accepted visual dispositions for all review-required items before authority/write-back/release work. Filling this with guessed visual acceptance would violate the human-in-the-loop workflow boundary.

## Next Valid Step

Resolve the visual source issue for `WM_9709_w19_qp_11` q07-q11 before attempting human visual disposition acceptance. Valid options are to source a non-occluding PDF/pages for this paper, rerun page-chain/crops for that PDF, and rerun post-extraction review; or explicitly park this PDF/shard as not production-ready.
