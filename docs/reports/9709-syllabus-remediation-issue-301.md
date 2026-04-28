# 9709 Syllabus Remediation Issue 301

Issue: #301
Parent tracker: #286

## Verdict

The issue #293 approved baseline is rejected and quarantined. It is not canonical authority and is no longer the default gate target.

This remediation keeps only a clean draft posture for the 9709 syllabus topic tree and boundary overlay. No new approved `canonical_topic_tree_v1.json`, `boundary_annotations_v1.json`, or `human_review_decisions_v1.json` is produced.

## Quarantined Artifacts

- Manifest: `data/syllabus/9709/quarantine/rejected-baseline-issue-301/rejection_manifest.json`
- Rejected topic tree copy: `data/syllabus/9709/quarantine/rejected-baseline-issue-301/canonical_topic_tree_v1.json`
- Rejected boundary copy: `data/syllabus/9709/quarantine/rejected-baseline-issue-301/boundary_annotations_v1.json`
- Rejected human decisions copy: `data/syllabus/9709/quarantine/rejected-baseline-issue-301/human_review_decisions_v1.json`
- Rejected freeze report copy: `docs/reports/quarantine/9709-syllabus-baseline-freeze-v1.rejected.md`

## Clean Draft Regeneration

- Draft topic tree: `data/syllabus/9709/canonical_topic_tree_draft_v1.json`
- Draft boundary overlay: `data/syllabus/9709/boundary_annotations_draft_v1.json`
- Topic nodes: 201
- Topic status counts: `draft`: 125, `needs_human_review`: 76
- Boundary status counts: `draft`: 13, `needs_human_review`: 2
- Known rejected pollution strings in draft titles: 0

The repaired objective extraction removes known Notes/OCR fragments from `canonical_title` and `display_title`, including the sampling unbiased-estimates row, the hypothesis-test row containing `alternative questions are set`, and trig/math OCR fragments such as `^ h` and `sin sin 90c`. Source refs remain anchored to the locked raw section layer; locators are checked for containment by the gate.

## Gate And Freeze Posture

`npm run syllabus:9709:gate` now targets the draft artifacts by default and does not attempt an approved-baseline freeze. Explicit approved-baseline attempts fail if titles contain known Notes/OCR contamination, locators are unsupported by raw section text, or a formerly `needs_human_review` node lacks concrete human-decision coverage.

The issue #293 freeze script now validates coverage before writing approved artifacts and refuses to approve `needs_human_review` draft nodes wholesale.

## Remaining Review Items

The clean draft still contains unresolved review work:

- 76 topic nodes remain `needs_human_review`.
- 2 boundary annotations remain `needs_human_review`.
- The existing review pack remains a review queue, not approval authority.

Human review is still required before any new approved baseline is frozen.
