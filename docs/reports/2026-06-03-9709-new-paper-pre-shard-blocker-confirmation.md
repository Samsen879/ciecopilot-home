# 9709 new-paper pre-shard blocker confirmation

日期: 2026-06-03

## Verdict

The 17 blocked rows are confirmed as false-positive input rows, not recoverable crop misses. The source PDFs do not contain strict printed left-margin question headers for those q_numbers.

This confirmation is local-only. It used rendered-page contact sheets plus PyMuPDF word-position/page-text evidence. External DashScope/Qwen/VLM/API calls: `0`.

This is still not production-ready, not VLM-reviewed, and not authority/DB/search/release closeout.

## Summary

- blocker rows reviewed: `17`
- confirmed false-positive input rows: `17`
- rows recovered as valid questions: `0`
- remaining unknown rows: `0`
- PDFs with blockers: `6`
- root cause: prior input locator accepted PDF page numbers or non-header numeric tokens as q_number rows when strict printed left-margin question headers were absent.
- recommended next step: rebuild the new-paper source inventory and 24 input manifests with a stricter printed-question-header locator; expected row count will drop by these 17 rows unless another source confirms missing questions.

## PDF-Level Confirmation

| Source PDF | Actual printed q headers | False-positive q rows | Contact sheet |
| --- | --- | --- | --- |
| `data/past-papers/9709Mathematics/paper1/9709_w25_qp_15.pdf` | q01, q02, q03, q04, q05, q06, q07, q08, q09, q10, q11 | q12, q13, q14, q15 | `tmp/pdf-page-chain/new-papers-pre-shard/blocker-contact-sheets/9709_w25_qp_15_blocker_pages.png` |
| `data/past-papers/9709Mathematics/paper2/9709_w25_qp_22.pdf` | q01, q02, q03, q04, q05, q06, q07 | q08, q09, q10, q11, q12 | `tmp/pdf-page-chain/new-papers-pre-shard/blocker-contact-sheets/9709_w25_qp_22_blocker_pages.png` |
| `data/past-papers/9709Mathematics/paper4/9709_s25_qp_41.pdf` | q01, q02, q03, q04, q05, q06, q07 | q08, q09, q10, q11, q12 | `tmp/pdf-page-chain/new-papers-pre-shard/blocker-contact-sheets/9709_s25_qp_41_blocker_pages.png` |
| `data/past-papers/9709Mathematics/paper4/9709_s25_qp_45.pdf` | q01, q02, q03, q04, q05, q06, q07 | q12 | `tmp/pdf-page-chain/new-papers-pre-shard/blocker-contact-sheets/9709_s25_qp_45_blocker_pages.png` |
| `data/past-papers/9709Mathematics/paper4/9709_w25_qp_45.pdf` | q01, q02, q03, q04, q05, q06 | q07 | `tmp/pdf-page-chain/new-papers-pre-shard/blocker-contact-sheets/9709_w25_qp_45_blocker_pages.png` |
| `data/past-papers/9709Mathematics/paper5/9709_w25_qp_51.pdf` | q01, q02, q03, q04, q05, q06, q07 | q11 | `tmp/pdf-page-chain/new-papers-pre-shard/blocker-contact-sheets/9709_w25_qp_51_blocker_pages.png` |

## Row-Level Confirmation

| Storage key | q | Verdict | Evidence note |
| --- | ---: | --- | --- |
| `9709/w25_qp_15/questions/q12.png` | 12 | `confirmed_false_positive_input_row` | PDF has strict printed question headers q01-q11 only. Old locator matched printed page 12, which contains Question 8, not Question 12. |
| `9709/w25_qp_15/questions/q13.png` | 13 | `confirmed_false_positive_input_row` | PDF has strict printed question headers q01-q11 only. Old locator matched printed page 13, which contains Question 9, not Question 13. |
| `9709/w25_qp_15/questions/q14.png` | 14 | `confirmed_false_positive_input_row` | PDF has strict printed question headers q01-q11 only. Old locator matched printed page 14, which starts Question 10, not Question 14. |
| `9709/w25_qp_15/questions/q15.png` | 15 | `confirmed_false_positive_input_row` | PDF has strict printed question headers q01-q11 only. Old locator matched printed page 15, which is continuation content for Question 10, not Question 15. |
| `9709/w25_qp_22/questions/q08.png` | 8 | `confirmed_false_positive_input_row` | PDF has strict printed question headers q01-q07 only. Old locator matched printed page 8, which contains Question 6 content, not Question 8. |
| `9709/w25_qp_22/questions/q09.png` | 9 | `confirmed_false_positive_input_row` | PDF has strict printed question headers q01-q07 only. Old locator matched printed page 9, which is Question 6 continuation content, not Question 9. |
| `9709/w25_qp_22/questions/q10.png` | 10 | `confirmed_false_positive_input_row` | PDF has strict printed question headers q01-q07 only. Old locator matched printed page 10, which starts Question 7, not Question 10. |
| `9709/w25_qp_22/questions/q11.png` | 11 | `confirmed_false_positive_input_row` | PDF has strict printed question headers q01-q07 only. Old locator matched printed page 11, which is an Additional page, not Question 11. |
| `9709/w25_qp_22/questions/q12.png` | 12 | `confirmed_false_positive_input_row` | PDF has strict printed question headers q01-q07 only. Old locator matched printed page 12, which is copyright/blank-page material, not Question 12. |
| `9709/s25_qp_41/questions/q08.png` | 8 | `confirmed_false_positive_input_row` | PDF has strict printed question headers q01-q07 only. Old locator matched printed page 8, which contains Question 6 content, not Question 8. |
| `9709/s25_qp_41/questions/q09.png` | 9 | `confirmed_false_positive_input_row` | PDF has strict printed question headers q01-q07 only. Old locator matched printed page 9, which is Question 6 continuation content, not Question 9. |
| `9709/s25_qp_41/questions/q10.png` | 10 | `confirmed_false_positive_input_row` | PDF has strict printed question headers q01-q07 only. Old locator matched printed page 10, which starts Question 7, not Question 10. |
| `9709/s25_qp_41/questions/q11.png` | 11 | `confirmed_false_positive_input_row` | PDF has strict printed question headers q01-q07 only. Old locator matched printed page 11, which is Question 7 continuation content, not Question 11. |
| `9709/s25_qp_41/questions/q12.png` | 12 | `confirmed_false_positive_input_row` | PDF has strict printed question headers q01-q07 only. Old locator matched printed page 12, which is an Additional page, not Question 12. |
| `9709/s25_qp_45/questions/q12.png` | 12 | `confirmed_false_positive_input_row` | PDF has strict printed question headers q01-q07 only. Old locator matched a non-header value 12 in Question 7 continuation content, not Question 12. |
| `9709/w25_qp_45/questions/q07.png` | 7 | `confirmed_false_positive_input_row` | PDF has strict printed question headers q01-q06 only. Old locator matched a non-header digit on a Question 2 page; there is no printed Question 7 header. |
| `9709/w25_qp_51/questions/q11.png` | 11 | `confirmed_false_positive_input_row` | PDF has strict printed question headers q01-q07 only. Old locator matched the number 11 inside a Question 4 probability/tree diagram, not Question 11. |

## Stop Boundary

Do not proceed to formal shard production from the 610-row input set as-is. The current local evidence supports either rebuilding the source inventory/input manifests to exclude these 17 false-positive rows, or pausing for human source-authority override if someone believes those q_numbers should exist in a different source PDF.
