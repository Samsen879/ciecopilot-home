# 9709 p3_w_watermarked_001 visual review stop

日期: 2026-05-26

## Scope

本报告记录 `p3_w_watermarked_001` 在 page-chain extraction、review crops、evidence bundles 和 post-extraction review 后的停止点。

当前结论不是 production-ready。该 shard 已完成 extraction/evidence 生成，但 targeted high-resolution visual VLM review 对 30 个原始 crop stack 中的 29 个给出 rejection，其中多项明确指出红色水印覆盖 prompt text、question text、formulae、diagram-related text 或 mark allocations。因此不能继续 authority sidecar、registry backfill、analysis backfill、search gate 或 release preflight。

## Current Evidence

Completed:

- page-chain extraction: `3/3` PDFs passed
- extracted questions: `30`
- page-chain blockers: `0`
- page-chain warnings: `0`
- review crops: `48`
- evidence bundles: `30/30`
- post-extraction blockers: `0`
- post-extraction warnings: `0`

Post-extraction status:

- status: `needs_human_review`
- human review items: `30`
- accepted human dispositions: `0`

Manual review reason counts:

| Reason | Count |
|---|---:|
| `diagram_lane` | `2` |
| `multi_page_question` | `18` |
| `watermarked_source_pdf` | `30` |

## Visual Review Evidence

- contact-sheet diagnostic artifact: `docs/reports/2026-05-26-9709-p3-w-watermarked-001-contact-sheet-vlm-review.json`
- targeted high-resolution artifact: `docs/reports/2026-05-26-9709-p3-w-watermarked-001-targeted-visual-vlm-review.json`

The contact-sheet pass was treated as diagnostic only. It over-reported blank crops for `WM_9709_w19_qp_33`; those blank-crop claims did not reproduce in the original-resolution targeted crop stacks. The stop decision is based on the targeted high-resolution review, not the contact-sheet thumbnail findings.

| PDF | targeted accepted | targeted rejected |
|---|---:|---:|
| `WM_9709_w19_qp_31` | `1` | `9` |
| `WM_9709_w19_qp_32` | `0` | `10` |
| `WM_9709_w19_qp_33` | `0` | `10` |

Representative targeted blockers:

| Question | Key blocker summary |
|---:|---|
| `WM_9709_w19_qp_31/q02` | red watermark overlays bottom of page and may obscure continuation content or mark allocation (though none visible here, its position is risky) |
| `WM_9709_w19_qp_31/q03` | red watermark at bottom occludes no content but is present and non-standard; however, primary blocker is that question boundary is not visible — only Q3 is shown, but no evidence of preceding or following page to confirm cross-page continuity or truncation status; image appears to be a single page crop with no adjacent pages stacked, violating 'stacked crop pages' requirement |
| `WM_9709_w19_qp_31/q04` | Red watermark overlays content (prompt text and mark allocations) |
| `WM_9709_w19_qp_31/q05` | red watermark overlays critical content (prompt text and mark allocations) |
| `WM_9709_w19_qp_31/q06` | red watermark overlays bottom of page and partially obscures continuation space; violates 'watermark_not_occluding_content' |
| `WM_9709_w19_qp_31/q07` | red watermark overlays question text and answer space, potentially obscuring content |
| `WM_9709_w19_qp_31/q08` | red watermark overlays content (prompt text and working space) |
| `WM_9709_w19_qp_31/q09` | red watermark overlays critical content (prompt text and mark allocations) |
| `WM_9709_w19_qp_31/q10` | red watermark overlays critical content (prompt text and mark allocation) |
| `WM_9709_w19_qp_32/q01` | red watermark overlays bottom of page and partially obscures continuation content (e.g., potential mark scheme or instruction lines) |
| `WM_9709_w19_qp_32/q02` | red watermark overlays bottom of page and may interfere with continuation content or answer space |
| `WM_9709_w19_qp_32/q03` | red watermark at bottom occludes continuation content and may interfere with answer space integrity |
| `WM_9709_w19_qp_32/q04` | red watermark overlays question text and mark allocations (e.g., '[3]' and '[4]'), violating occlusion rule |
| `WM_9709_w19_qp_32/q05` | red watermark overlays bottom of page and partially obscures continuation content (e.g., potential mark scheme or instruction line) |
| `WM_9709_w19_qp_32/q06` | red watermark overlays bottom of page and may interfere with continuation content or answer space (though not prompt/diagram here, it violates policy for any red watermark covering *continuation content*) |
| `WM_9709_w19_qp_32/q07` | Red watermark overlays critical content: question stem (part a), mark allocation [5], and part (b) instructions including diagram requirement and mark allocations [2] each |
| `WM_9709_w19_qp_32/q08` | red watermark overlays critical content: question prompt, mark allocations, and continuation instruction |
| `WM_9709_w19_qp_32/q09` | red watermark overlays critical content: question stem, part (i) equation, part (ii) instruction, and part (iii) instruction |

Some targeted-review rejects are stricter than the post-extraction contract, for example single-page boundary uncertainty or generic source-integrity objections. Those over-conservative reasons are not used as the sole blocker. The blocking condition is the repeated targeted finding that red watermark text overlays question text, mark allocations, formulae, diagram-related instructions, or continuation content across the source PDFs.

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

Resolve the visual source issue for these Winter 2019 Paper 3 watermarked PDFs before attempting human visual disposition acceptance. Valid options are to source non-occluding PDF/pages, rerun page-chain/crops for the replaced source files, and rerun post-extraction review; or explicitly park this shard as not production-ready.
