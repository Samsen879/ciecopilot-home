# 9709 p1_m_standard_001 warning disposition

## Scope

This disposition covers the only page-chain warning in `p1_m_standard_001`:

- source PDF: `data/past-papers/9709Mathematics/paper1/9709_m21_qp_12.pdf`
- question: `q09`
- warning: `subpart_mark_count_mismatch`
- payload: `tmp/pdf-page-chain/full-scaleout/p1_m_standard_001/outputs/9709_m21_qp_12_page_chain.json`

## Visual review

Rendered pages reviewed:

- `tmp/pdf-page-chain/full-scaleout/p1_m_standard_001/renders/9709_m21_qp_12/9709_m21_qp_12_page_014.png`
- `tmp/pdf-page-chain/full-scaleout/p1_m_standard_001/renders/9709_m21_qp_12/9709_m21_qp_12_page_015.png`

The page-chain boundary is accepted. `q09` starts on rendered page `014` and continues to rendered page `015`. There is no evidence that the question was truncated or merged with another numbered question.

The raw mark/subpart extraction is not accepted for write-back as-is. The page-chain output recorded nested labels as `["(a)", "(i)", "(ii)", "(b)"]` and marks as `[3, 2, 3, 2, 4]`, which over-counts the nested structure.

## Disposition

- disposition: `accepted_with_normalized_structure`
- blocker: `false`
- diagram_present: `false`
- normalized subpart labels: `["(a)(i)", "(a)(ii)", "(b)"]`
- normalized marks: `[3, 2, 4]`
- write-back posture: allowed only with normalized structure, not raw page-chain marks
- review posture: keep `requires_review=true` through evidence bundle and post-extraction review
- OCR posture: keep human review required because the saved OCR dropped theta symbols in parts of q09 text

This clears the page-chain warning as a blocker for the shard, but it does not make the shard production-ready. The next step is `p1_m_standard_001` screenshot/evidence bundle generation, followed by post-extraction review before any analysis backfill or gate.
