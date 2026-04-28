# 9709 300-Question Rerun From PDF Page-Chain Runbook

This runbook preserves the current operating procedure for rerunning the 300-question 9709 batch from original PDFs. The goal is to avoid repeating the earlier failure mode where derived per-question screenshots and uninitialized surface flags silently drove downstream routing.

## Current Position

The old 300-question batch is not the canonical visual source. It contains useful authority/topic history, but its question images were derived by prior screenshot/crop tooling and have already been shown to be incomplete or contaminated in some cases.

The current preferred extraction source is:

```text
original CAIE PDF -> render every page -> VLM reads each page in order -> code-owned normalization/merge/validator -> selected 300-question projection
```

The current validated page-chain implementation is:

- `scripts/vlm/run_pdf_page_chain_extraction_v1.py`
- `scripts/vlm/run_pdf_page_chain_batch_evaluator_v1.py`

The latest 20-PDF pilot result was:

- report: `tmp/pdf-page-chain/pilot-20/report-rebuilt-nested-subparts-v3.json`
- status: `20/20 passed`, `0 blocker`, `0 warning`
- model: `qwen3-vl-plus`

## Non-Negotiable Rules

1. Do not use existing single-question PNG crops as ground truth.
2. Do not let `manifest.diagram_present`, `evidence.diagram_present`, and `surface_posture.diagram_present` diverge.
3. Do not reuse an older authority-alignment verdict after replacing the extraction content. New extracted text/diagram evidence needs a new alignment pass.
4. Do not write to the local DB or production manifest until the diff report has been reviewed.
5. Do not treat a PDF page-chain batch pass as equivalent to “the 300 items are updated”. The page-chain output still needs projection into the 300 selected questions.

## Inputs

Primary frozen selection:

- `data/manifests/9709_authority_ready_batch_300_v1.json`

Historical human surface truth:

- `docs/reports/2026-04-25-9709-human-diagram-present-review.json`
- `docs/reports/2026-04-25-9709-surface-triage-release-preflight-final.json`

Original PDFs:

- `data/past-papers/9709Mathematics/paper1/*.pdf`
- `data/past-papers/9709Mathematics/paper2/*.pdf`
- `data/past-papers/9709Mathematics/paper3/*.pdf`
- `data/past-papers/9709Mathematics/paper4/*.pdf`
- `data/past-papers/9709Mathematics/paper5/*.pdf`
- `data/past-papers/9709Mathematics/paper6/*.pdf`

Qwen/DashScope config:

- load repo `.env`
- set `QWEN_OPENAI_TRANSPORT=direct`
- use `.venv/bin/python`

## Step 0: Preflight The Worktree

Run this first and record the result:

```bash
npm run workflow:codex-preflight -- --json
```

Known current environment caveat: in this WSL session it can fail with:

```text
WSL 1 is not supported. Please upgrade to WSL 2 or above.
Could not determine Node.js install directory
```

If it fails for that exact environment reason, continue only if the git worktree is clean and the task is isolated on a non-main branch.

## Step 1: Build A Unique PDF List From The 300 Manifest

The 300 manifest is question-scoped, but page-chain extraction is PDF-scoped. Generate a unique source-PDF list from `storage_key`, `paper`, `session`, `year`, and `variant`.

Output target:

```text
tmp/pdf-page-chain/300-rerun/pdf-list.txt
```

Important resolver requirements:

- `9709/m16_qp_12/questions/q08.png` maps to `data/past-papers/9709Mathematics/paper1/9709_m16_qp_12.pdf`
- Paper number comes from manifest `paper`, not from string guessing alone.
- March 2020 and other watermarked files may use `WM_9709_...` filenames. The resolver must check both `9709_<session><yy>_qp_<paper><variant>.pdf` and `WM_9709_<session><yy>_qp_<paper><variant>.pdf`.
- Fail closed if any selected manifest item cannot resolve to exactly one PDF.
- Write an audit JSON listing `storage_key -> pdf_path -> q_number`.

Do not proceed unless the resolved item count is 300 and every selected item has a PDF path.

## Step 2: Run PDF Page-Chain Extraction

Run the unique PDF list through the batch evaluator. Use a fresh output root for each real rerun so old payloads are never silently reused.

```bash
set -a
. /home/samsen/code/ciecopilot-home/.env
set +a
QWEN_OPENAI_TRANSPORT=direct \
/home/samsen/code/ciecopilot-home/.venv/bin/python \
  scripts/vlm/run_pdf_page_chain_batch_evaluator_v1.py \
  --pdf-list tmp/pdf-page-chain/300-rerun/pdf-list.txt \
  --output-root tmp/pdf-page-chain/300-rerun/outputs \
  --render-root tmp/pdf-page-chain/300-rerun/renders \
  --report tmp/pdf-page-chain/300-rerun/report.json \
  --no-reuse-existing
```

Use `--no-resume` only when deliberately discarding partial page results. Otherwise keep resume on so an interrupted run can continue.

Expected page-chain gate:

- `blocked_pdfs = 0`
- `warning_pdfs = 0`
- every source PDF has `processed_pages == total_pages`

If any blocker appears, inspect the relevant payload and rendered page before modifying code or rerunning.

## Step 3: Re-Evaluate Existing Payloads After Code Fixes

If normalization or validator code changes after the API run, do not immediately spend more API calls. First rebuild reports from existing payloads:

```bash
/home/samsen/code/ciecopilot-home/.venv/bin/python \
  scripts/vlm/run_pdf_page_chain_batch_evaluator_v1.py \
  --payload tmp/pdf-page-chain/300-rerun/outputs/*.json \
  --report tmp/pdf-page-chain/300-rerun/report-rebuilt.json
```

This reuses stored `page_results`, reapplies current normalization, and rebuilds merged questions and validation.

## Step 4: Project Page-Chain Output Back To The 300 Selected Questions

This is the boundary that must not be skipped.

The page-chain output is full-PDF/full-paper. The 300 target batch is a selected question set. A projection script must produce a 300-row artifact by joining:

```text
manifest item: pdf identity + q_number
page-chain payload: pdf_path + questions[].q_number
```

Required projected output per item:

- original `storage_key`
- source `pdf_path`
- `q_number`
- extracted `ocr_text`
- extracted `has_diagram` as canonical `diagram_present`
- `diagram_elements`
- `page_indices`
- `marks`
- `subpart_labels`
- extraction model/run id
- source rendered page paths
- old manifest/evidence values for diff

The projection must fail if:

- projected item count is not 300
- any manifest item has no matching extracted question
- any PDF/q_number pair maps to multiple extracted questions
- any projected question has empty `ocr_text`
- `diagram_present` cannot be resolved to a boolean

## Step 5: Compare Against The Current 300 Batch

Generate a diff report before writing anything back.

Minimum diff dimensions:

- `ocr_text` changed materially
- `diagram_present` changed
- `diagram_elements` changed
- `page_indices` changed
- `marks` changed
- `subpart_labels` changed
- old screenshot path versus new source PDF page paths
- old `overall_alignment_verdict` marked stale when extraction changed

The diff should classify rows:

- `unchanged`
- `text_changed`
- `diagram_changed`
- `structure_changed`
- `missing_old_evidence`
- `requires_human_review`

Human review is required for at least:

- every `diagram_present` flip
- every empty or unusually short `ocr_text`
- every item with changed marks/subpart structure
- every item whose source page includes a diagram/table
- every item where old topic authority depends on text that changed

## Step 6: Human Review Stop Point

Stop here and ask for a decision before writing to DB or replacing checked-in manifests.

Provide:

- page-chain report path
- projection path
- diff report path
- counts by diff class
- sample rendered page folder
- list of rows requiring human review

Do not proceed with “write back” unless explicitly approved.

## Step 7: Write-Back Plan After Approval

After approval, produce versioned artifacts first:

```text
docs/reports/YYYY-MM-DD-9709-300-pdf-page-chain-projection.json
docs/reports/YYYY-MM-DD-9709-300-pdf-page-chain-diff.json
docs/reports/YYYY-MM-DD-9709-300-pdf-page-chain-summary.md
data/manifests/9709_authority_ready_batch_300_pdf_page_chain_v1.json
```

Then update evidence bundles and DB only through an audited script.

Required invariant after write-back:

```text
manifest.diagram_present === evidence.diagram_present === surface_posture.diagram_present
```

The release preflight must treat any mismatch as a blocker, not a warning.

## Step 8: Rerun Authority Alignment

If `ocr_text`, diagram evidence, marks, or subpart structure changed, prior authority-alignment verdicts are stale.

Run authority alignment against the newly projected 300 rows after extraction write-back. Do not compare a new extraction to the April 22 alignment as if it were the same artifact.

## Known Failure Modes And Fixes

### Per-question crops are not ground truth

The earlier screenshots could be incomplete, include neighboring questions, or miss continuation pages. Page-level PDF rendering avoids this class of error.

### Surface triage circular dependency

The previous router assumed `diagram_present`, `formula_dense`, and `table_heavy` were already known, but those fields themselves required looking at the image. Do not route on null surface flags.

### VLM formula noise is not a diagram

Old logic inferred diagram presence from non-empty `diagram_elements`, which allowed formula artifacts such as fraction bars or integral signs to become false diagrams. `diagram_present` must come from explicit visual evidence or human review.

### Regressive page-leading numbers

Example: a continuation page starting with `5 of the 9 letters...` is not Question 5 if the carried open question is Question 7. Code normalization now ignores page-leading question numbers that regress below the carried/last-seen question.

### Nested subpart labels

Examples such as `(a), (b)(i), (ii)` must not be counted as four independent mark-bearing leaves. Compound labels and nested alpha/roman structures are handled by validator logic.

### Blank and additional answer pages

`BLANK PAGE` and `Additional page ... question number must be clearly shown` pages must not contaminate extracted question text or page indices.

### Final open question state

Do not assume `open_q_number` in the terminal progress line is itself a blocker. The final payload validator is authoritative. Inspect the merged payload and rendered page when in doubt.

## Verification Commands

Run targeted tests after any page-chain code change:

```bash
/home/samsen/code/ciecopilot-home/.venv/bin/python -m pytest \
  tests/test_run_pdf_page_chain_extraction_v1.py \
  tests/test_run_pdf_page_chain_batch_evaluator_v1.py \
  -q
```

Run the broader VLM/PDF regression set before commit:

```bash
/home/samsen/code/ciecopilot-home/.venv/bin/python -m pytest \
  tests/test_pdf_page_locator_v1.py \
  tests/test_pdf_page_validator_v1.py \
  tests/test_run_pdf_page_question_extraction_v1.py \
  tests/test_build_pdf_page_full_paper_manifest_v1.py \
  tests/test_run_pdf_page_chain_extraction_v1.py \
  tests/test_run_pdf_page_chain_batch_evaluator_v1.py \
  tests/test_qwen_router_v1.py \
  tests/test_qwen_lane_runner_v1.py \
  tests/test_qwen_openai_client_v1.py \
  tests/test_qwen_surface_triage_v1.py \
  -q
```

Compile check:

```bash
/home/samsen/code/ciecopilot-home/.venv/bin/python -m compileall \
  scripts/vlm/run_pdf_page_chain_extraction_v1.py \
  scripts/vlm/run_pdf_page_chain_batch_evaluator_v1.py \
  scripts/vlm/pdf_page_validator_v1.py \
  scripts/vlm/run_pdf_page_question_extraction_v1.py \
  scripts/vlm/pdf_page_locator_v1.py
```

## Production Readiness Gate

The 300 rerun is ready to write only when all are true:

- unique PDF resolution from the 300 manifest is complete
- page-chain report has `0 blocker` and `0 warning`
- projection artifact has exactly 300 rows
- diff report has been reviewed
- all required human-review rows are resolved
- manifest/evidence/surface posture diagram flags are identical
- authority alignment has been rerun for the new extraction version
- release preflight passes with `0 blocker`

