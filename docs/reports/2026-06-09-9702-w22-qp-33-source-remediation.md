# 9702 W22 QP 33 Source Remediation

- generated_on: `2026-06-09`
- issue: #414
- parent: #402
- blocks/unblocks: #403 source inventory blocker for one tracked PDF
- target path: `data/past-papers/9702Physics/paper3/9702_w22_qp_33.pdf`
- production_ready_claimed: `false`

## Scope

This remediation replaced only the tracked PDF bytes for `9702_w22_qp_33.pdf` and preserved the repo path exactly. No 9702 row-surface, page-chain, crop, VLM/OCR, DB, search, read-model, RAG, or production-ready work was run.

After this PR merges, #403 still must rerun the full source truth inventory from `origin/main` before any downstream 9702 phase starts.

## Startup Evidence

| Check | Result |
| --- | --- |
| branch | `feat/issue-414` |
| `origin/main` | `f0407b453d43ca703331a327316e0b73454f6ce2` |
| initial status | `## feat/issue-414...origin/main` |
| `npm run workflow:codex-preflight -- --json` | exit 0; top status `warning` only for AO branch naming; worktree clean and upstream synchronized |
| `npm run workflow:baseline:sync` | exit 1 before implementation; preserved root checkout branch `codex/chatgpt-image-cdp-runbook` has no upstream tracking |
| live issues reread | #402, #403, #414 |

## Before Remediation

| Field | Value |
| --- | --- |
| SHA256 | `b355db349aee26da28ffd42766a229237479793307860a1d88636ffb829111bf` |
| byte size | `27348` |
| header | `%PDF-1.3` |
| EOF marker in tail | `false` |
| pdfjs parse | `false`, `Invalid PDF structure.` |
| PyMuPDF | opens as `PDF 1.3`, `page_count=0`, page 1 load fails |

This reconfirmed the #403 blocker state before the file was replaced.

## Replacement Provenance

No local duplicate or official/user-supplied source was found in the checkout. Two public mirror downloads were retrieved and compared:

| Source | URL | SHA256 | Bytes |
| --- | --- | --- | ---: |
| QualifiedQuest | `https://qualifiedquest.com/papers/a-level/physics-9702/2022/9702_w22_qp_33.pdf` | `c7d5eab6d1f64f9a6e87c295218bc4275cf240699bce54d8c771b0327402b254` | 1096476 |
| XtraPapers | `https://xtrapapers.co/papers/caie/as-and-a-level/physics-9702/2022-oct-nov/9702_w22_qp_33.pdf/download` | `c7d5eab6d1f64f9a6e87c295218bc4275cf240699bce54d8c771b0327402b254` | 1096476 |

The XtraPapers index also lists `9702_w22_qp_33.pdf` under Cambridge AS and A Level Physics 9702, 2022 Oct Nov.

## After Remediation

| Field | Value |
| --- | --- |
| SHA256 | `c7d5eab6d1f64f9a6e87c295218bc4275cf240699bce54d8c771b0327402b254` |
| byte size | `1096476` |
| header | `%PDF-1.3` |
| EOF marker in tail | `true` |
| pdfjs parse | `true` |
| page count | `16` |
| first-page identity | `PHYSICS 9702/33 Paper 3 Advanced Practical Skills 1 October/November 2022` |
| footer identity | `9702/33/O/N/22` |
| PyMuPDF | opens as `PDF 1.3`, `page_count=16`, page 1 loads |

## Render Sanity

Renderer: `pdfjs-dist + @napi-rs/canvas` at scale `0.75`.

| Metric | Value |
| --- | ---: |
| pages rendered | 16 |
| blank pages by threshold | 0 |
| min non-white pixels | 629 |
| max non-white pixels | 121073 |

All pages rendered with nonblank content under the local threshold. The full page-level pixel counts are recorded in `docs/reports/2026-06-09-9702-w22-qp-33-source-remediation.json`.

## Focused #403 Blocker Check

| Metric | Value |
| --- | ---: |
| #403 temporary blocker count before remediation | 3 |
| focused file blockers after remediation | 0 |
| `data/manifests/9702*.json` after remediation | 0 |

This clears the focused source-file blocker for `9702_w22_qp_33.pdf`. It does not complete #403; the full #403 source inventory gate must rerun from `origin/main` after this PR merges.

## Commands

```bash
git fetch origin main --prune
git status --short --branch --untracked-files=all
npm run workflow:baseline:sync
npm run workflow:codex-preflight -- --json
gh issue view 402 --repo Samsen879/ciecopilot-home --json number,title,state,body,url,labels,comments
gh issue view 403 --repo Samsen879/ciecopilot-home --json number,title,state,body,url,labels,comments
gh issue view 414 --repo Samsen879/ciecopilot-home --json number,title,state,body,url,labels,comments
node --input-type=module <<'JS' ... pdfjs/canvas focused blocker reconfirmation
/home/samsen/code/ciecopilot-home/.venv/bin/python - <<'PY' ... PyMuPDF blocker reconfirmation
curl -fL --retry 2 --connect-timeout 20 --max-time 120 'https://qualifiedquest.com/papers/a-level/physics-9702/2022/9702_w22_qp_33.pdf' -o /tmp/cie-414-9702-remediation/qualifiedquest-9702_w22_qp_33.pdf
curl -fL --retry 2 --connect-timeout 20 --max-time 120 'https://xtrapapers.co/papers/caie/as-and-a-level/physics-9702/2022-oct-nov/9702_w22_qp_33.pdf/download' -o /tmp/cie-414-9702-remediation/xtrapapers-9702_w22_qp_33.pdf
sha256sum /tmp/cie-414-9702-remediation/*.pdf
wc -c /tmp/cie-414-9702-remediation/*.pdf
node --input-type=module <<'JS' ... pdfjs/canvas candidate validation
cp /tmp/cie-414-9702-remediation/qualifiedquest-9702_w22_qp_33.pdf data/past-papers/9702Physics/paper3/9702_w22_qp_33.pdf
node --input-type=module <<'JS' ... pdfjs/canvas focused validation on final tracked replacement
/home/samsen/code/ciecopilot-home/.venv/bin/python - <<'PY' ... PyMuPDF final replacement validation
find data/manifests -maxdepth 1 -name '9702*.json' -print | sort | wc -l
git diff --check
```

## Claim Boundary

Maximum claim: the corrupted tracked source PDF bytes were replaced in place with a locally parse/render/identity-verified copy, clearing the focused #403 blocker for this file.

Not claimed: full #403 source inventory, #404 Phase 2 work, downstream row-surface/page-chain/crop/VLM/OCR/DB/search/read-model/RAG work, or production readiness.
