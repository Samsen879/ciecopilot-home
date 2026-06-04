# 9709 question analysis and text-layer status

日期: 2026-06-04

## Summary

当前 `9709` production-ready surface 已经具备题目分析和 OCR 文本 evidence，但还没有把“题干纯文本”提升成一个正式的一等 canonical storage layer。

严格结论:

- production rows: `3530`
- rows with OCR evidence text: `3530/3530`
- no-diagram rows: `2759`
- no-diagram rows with OCR evidence text: `2759/2759`
- diagram rows: `771`
- diagram rows with OCR evidence text: `771/771`

因此，按当前 repo artifacts，`9709` 已经可以支持“无图题优先用纯文本展示/检索”的下一步建设；但还需要补一个明确的 `question_plain_text_v1` canonical artifact 或 DB layer，不能直接把分散在 evidence bundles 里的 OCR evidence 当成最终产品层。

## What Exists Today

### 1. Analysis / classifier / search readiness exists

Production-ready gate 已经确认每个题目行具备下列 DB/search/release 条件:

- registry row present
- prompt present
- provenance present
- search text present
- active analysis snapshot present
- snapshot ref present
- materialized classifier fields present
- question search gate pass
- release preflight pass

这说明当前有题目分析、分类、topic/search 所需基础数据。

### 2. OCR text evidence exists

OCR 文本主要存在于 evidence bundle 的字段:

- `evidence.ocr_text`

示例 artifact:

- `docs/reports/2026-06-04-9709-p1-m25-standard-001-evidence-bundles-final.json`

该类 bundle 同时保存:

- `storage_key`
- question identity
- topic hint
- OCR text
- formula list
- subquestion / marks hints
- layout hints
- diagram presence
- route and provenance metadata

### 3. Surface manifests do not yet carry canonical question text

当前 `data/manifests/9709_*_page_chain_surface_*.json` 的 production surface manifests 仍以 question image/crop/page-chain surface 为核心。它们没有统一的 top-level `question_text` canonical 字段。

本次统计结果:

- production surface manifest rows: `3530`
- surface-manifest rows with canonical `question_text`: `0`
- OCR evidence coverage through evidence bundles: `3530/3530`

这说明文本存在，但还没有进入 surface manifest 的 canonical schema。

## Quantified Coverage

### Combined 9709 Production Surface

| Metric | Count |
| --- | ---: |
| Production rows | 3530 |
| Rows with OCR evidence | 3530 |
| Rows without OCR evidence | 0 |
| No-diagram rows | 2759 |
| No-diagram rows with OCR evidence | 2759 |
| Diagram rows | 771 |
| Diagram rows with OCR evidence | 771 |

### Existing v1 Surface

| Metric | Count |
| --- | ---: |
| Rows | 2937 |
| Rows with OCR evidence | 2937 |
| No-diagram rows | 2287 |
| No-diagram rows with OCR evidence | 2287 |
| Diagram rows | 650 |
| Diagram rows with OCR evidence | 650 |

### New Corrected-v2 Surface

| Metric | Count |
| --- | ---: |
| Rows | 593 |
| Rows with OCR evidence | 593 |
| No-diagram rows | 472 |
| No-diagram rows with OCR evidence | 472 |
| Diagram rows | 121 |
| Diagram rows with OCR evidence | 121 |

## Interpretation

### What can be claimed

For current `9709` production rows, OCR text evidence exists for every row.

For no-diagram rows, the evidence is sufficient to build a text-first layer:

- show question text without requiring original PDF screenshot
- use text as the primary retrieval/search input
- keep crop/image as audit evidence rather than primary UI payload

For diagram rows, text still exists but should be paired with image/crop assets:

- use OCR text for prompt/search/context
- keep diagram crop/image as required visual evidence

### What cannot be claimed yet

Do not claim that the repo already has a formal canonical text layer.

Current state is:

- evidence text exists
- DB search text exists
- analysis snapshot exists
- topic/classifier fields exist
- canonical per-question text artifact/table does not yet exist

The missing layer is a product-facing, stable `question_plain_text_v1` representation.

## Recommended Canonical Layer

Add a new `question_plain_text_v1` artifact or DB table generated from production evidence bundles.

Suggested fields:

| Field | Purpose |
| --- | --- |
| `storage_key` | stable question identity |
| `subject_code` | e.g. `9709` |
| `paper` / `session` / `year` / `variant` / `q_number` | exam identity |
| `has_diagram` | whether image asset is required for product display |
| `plain_text` | canonical OCR-derived question text |
| `formula_text` or inline LaTeX | preserve math notation where possible |
| `source_evidence_bundle` | audit pointer |
| `ocr_source` | local/operator/external route provenance |
| `ocr_confidence` | confidence or review posture |
| `needs_image_asset` | true for diagrams/table-heavy/layout-dependent questions |
| `crop_paths` | fallback visual evidence |

Suggested gate:

- `production_rows == plain_text_rows`
- `no_diagram_rows == no_diagram_plain_text_rows`
- `diagram_rows == diagram_rows_with_text_and_image_asset`
- `missing_plain_text == 0`
- `missing_source_evidence_bundle == 0`

For the current 9709 surface, the expected first gate target is:

- `production_rows`: `3530`
- `plain_text_rows`: `3530`
- `no_diagram_plain_text_rows`: `2759/2759`
- `diagram_text_plus_image_rows`: `771/771`

## Implication For 9702 / 9231

Future subject builds should not remain screenshot-first longer than necessary.

Recommended faster pipeline:

1. Build source and locator manifest.
2. Extract OCR/text layer early.
3. Classify each row as no-diagram / diagram / table-heavy / formula-dense.
4. For no-diagram rows, use text-first production artifacts.
5. For diagram rows, store text plus image/crop.
6. Gate text coverage before DB/search/release closeout.

This avoids repeating the 9709 pattern where text evidence existed but was not immediately promoted into a canonical product-facing layer.

## Verification

The coverage numbers above were computed from:

- production surface manifests: `data/manifests/9709_*_page_chain_surface_*.json`
- evidence bundles: `docs/reports/*9709*evidence-bundles*.json`

Method:

1. Collect all `storage_key` values from the 60 production page-chain surface manifests.
2. Read all `9709` evidence bundle JSON reports.
3. Match evidence bundle records back to production `storage_key`.
4. Count rows with non-empty `evidence.ocr_text`.
5. Split counts by diagram vs no-diagram using production surface metadata.

Observed result:

```json
{
  "production_keys": 3530,
  "all": {
    "total": 3530,
    "withOcr": 3530,
    "noDiagram": 2759,
    "noDiagramWithOcr": 2759,
    "diagram": 771,
    "diagramWithOcr": 771
  },
  "v1": {
    "total": 2937,
    "withOcr": 2937,
    "noDiagram": 2287,
    "noDiagramWithOcr": 2287,
    "diagram": 650,
    "diagramWithOcr": 650
  },
  "v2": {
    "total": 593,
    "withOcr": 593,
    "noDiagram": 472,
    "noDiagramWithOcr": 472,
    "diagram": 121,
    "diagramWithOcr": 121
  }
}
```

## Boundary

This report does not re-run OCR, external VLM review, DB backfill, or search/release gates. It records the current evidence state from committed production artifacts.

This report should not be interpreted as claiming that every mathematical expression has perfect presentation-quality LaTeX. It claims that every production row has OCR text evidence and that no-diagram rows are ready for promotion into a canonical text-first layer, subject to the new text-layer gate described above.
