# 9709 Winter watermarked post-replacement authority closeout

日期: 2026-05-28

结论: `p1_w_watermarked_001` 和 `p3_w_watermarked_001` 的 source/visual blocker 已关闭，本次新增 authority sidecar 与 authority-ready artifacts。两 shard 的 release preflight 均为 pass，但这还不是 production-ready；DB write-back/backfill、search gate、DB coverage 和 production closeout 仍需后续执行。

## Counts

| Shard | Mapped Items | Ready Items | Seeded Topics | Release Preflight | Blockers | Warnings |
|---|---:|---:|---:|---|---:|---:|
| `p1_w_watermarked_001` | `32` | `32` | `8` | `pass` | `0` | `32` |
| `p3_w_watermarked_001` | `30` | `30` | `9` | `pass` | `0` | `30` |

## Artifacts

### p1_w_watermarked_001

- sidecar: `data/manifests/9709_p1_w_watermarked_001_authority_sidecar_v1.json`
- authority review: `docs/reports/2026-05-28-9709-p1-w-watermarked-001-post-replacement-authority-visual-review.md`
- authority manifest: `docs/reports/2026-05-28-9709-p1-w-watermarked-001-post-replacement-authority-manifest.json`
- aligned manifest: `docs/reports/2026-05-28-9709-p1-w-watermarked-001-post-replacement-aligned-manifest.json`
- ready manifest: `docs/reports/2026-05-28-9709-p1-w-watermarked-001-post-replacement-ready-manifest.json`
- authority evidence bundles: `docs/reports/2026-05-28-9709-p1-w-watermarked-001-post-replacement-authority-evidence-bundles.json`
- release preflight: `docs/reports/2026-05-28-9709-p1-w-watermarked-001-post-replacement-release-preflight-final.md`

### p3_w_watermarked_001

- sidecar: `data/manifests/9709_p3_w_watermarked_001_authority_sidecar_v1.json`
- authority review: `docs/reports/2026-05-28-9709-p3-w-watermarked-001-post-replacement-authority-visual-review.md`
- authority manifest: `docs/reports/2026-05-28-9709-p3-w-watermarked-001-post-replacement-authority-manifest.json`
- aligned manifest: `docs/reports/2026-05-28-9709-p3-w-watermarked-001-post-replacement-aligned-manifest.json`
- ready manifest: `docs/reports/2026-05-28-9709-p3-w-watermarked-001-post-replacement-ready-manifest.json`
- authority evidence bundles: `docs/reports/2026-05-28-9709-p3-w-watermarked-001-post-replacement-authority-evidence-bundles.json`
- release preflight: `docs/reports/2026-05-28-9709-p3-w-watermarked-001-post-replacement-release-preflight-final.md`

## Remaining Work

- Run registry write-back/backfill against the two ready manifests.
- Run DB coverage and question-search gate after write-back.
- Only then write shard-level production-ready closeout.
