# 9709 本轮截图重建与 300 题分析闭环总结

## 1. 范围

本轮工作针对的是 `9709_authority_ready_batch_300_v1` 这 300 道已筛选题目，不是整个仓库内全部 9709 PDF 的全量生产跑批。

目标分三层：

1. 重建题目截图来源，摆脱旧的单题 PNG 裁切链路。
2. 用修复后的截图与 OCR 结果重跑 300 题 analysis，并回写数据库。
3. 跑 production release gate，确认检索、分类、发布面状态是否达到可上线水平。

## 2. 起点问题

这一轮开始时，旧链路存在几个结构性问题：

- 题目截图并不总是从原始 PDF 直接投影，部分旧 PNG 有裁切不完整、页码错位、第三方水印残留等历史污染。
- `manifest.diagram_present`、`evidence.diagram_present`、`surface_posture.diagram_present` 在个别题目上会漂移，导致 release preflight 误报 blocker。
- OCR 文本里混入噪声时，会影响 classifier 和 question analysis 的稳定性。
- 审阅界面不够顺手，人工抽查成本偏高。

## 3. 本轮完成的工作

### 3.1 搭建并修正本地截图审阅台

完成了本地浏览器审阅控制台，用于按题目批量浏览 review crop，并补了几轮交互修正：

- 操作按钮从页面底部移到可直接操作的位置。
- 修正 review 页码显示与真实 PDF 页面的对应关系。
- 解释并区分 `warning` 的来源，避免把规则告警误判成真实截图缺陷。
- 支持反复 reload，便于人工连续审阅。

对应代码演进可追到：

- `85e69ef feat(vlm): add question crop review console`
- `2473336 fix(vlm): keep review actions in view`
- `d5dbb97 fix(9709): top-align diagram review image`
- `489907c fix(9709): move diagram review actions above image`

### 3.2 建立 PDF page-chain 重建链路

把 300 题批次改造成从原始 PDF 重新抽取：

```text
original PDF -> page render -> VLM page-chain extraction -> question projection -> review crop -> evidence bundle
```

本轮 300 题清单解析结果：

- manifest items: `300`
- resolved items: `300`
- unique PDFs: `115`
- total PDF pages: `2060`
- watermarked PDFs: `13`

证据文件：

- [`tmp/pdf-page-chain/300-rerun/resolution-audit.json`](/home/samsen/code/ciecopilot-home/tmp/pdf-page-chain/300-rerun/resolution-audit.json)
- [`.worktrees/codex-9709-pdf-page-locator-validator/tmp/pdf-page-chain/300-rerun/pdf-resolution-summary.json`](/home/samsen/code/ciecopilot-home/.worktrees/codex-9709-pdf-page-locator-validator/tmp/pdf-page-chain/300-rerun/pdf-resolution-summary.json)

### 3.3 连续修复 page-chain / crop / OCR 规则

围绕这 115 份 PDF 的重跑结果，做了几轮规则修复，核心包括：

- 修正 projected render page path。
- 加强 Qwen page-chain rerun 的稳定性。
- 把 target crop 边界硬绑定到 PDF question start，减少截到上一题/下一题。
- 接受 unit-scale crop box，修复 review crop 误判。
- OCR sanitizer 去掉第三方水印、页脚、孤立编号等噪声。

对应提交：

- `280b894 fix(vlm): harden qwen page-chain rerun`
- `fe7faca fix(vlm): correct projected render page paths`
- `2548834 fix(vlm): hard-bound target crops at pdf question starts`
- `c53870b fix(vlm): sanitize OCR evidence noise`

### 3.4 对 300 题重建结果做人工与规则复核

本轮不是只看脚本输出，还做了人工抽查与针对异常项的定向复核：

- 随机视觉抽查 50 套题目截图。
- 对 `warning pdf`、`diagram/table`、以及历史异常题做定向复看。
- 对 `diagram_present` 做人工 review，并把人工结论纳入 release preflight。

相关人工审阅证据：

- [`docs/reports/2026-04-25-9709-human-diagram-present-review.json`](/home/samsen/code/ciecopilot-home/docs/reports/2026-04-25-9709-human-diagram-present-review.json)
- [`docs/reports/2026-04-25-9709-surface-triage-evidence-bundles-final.json`](/home/samsen/code/ciecopilot-home/docs/reports/2026-04-25-9709-surface-triage-evidence-bundles-final.json)

### 3.5 用修复后的 crop 重跑 300 题 analysis，并完成 DB 落库

在截图和 OCR 规则稳定后，按既有 runbook 继续跑 300 题完整 analysis，不再沿用截图修复前的旧 JSON。

随后执行了 question-analysis backfill，并对 DB 落库后的检索面重新做 gate 校验。

从 release gate 读取到的当前 9709 检索面环境状态：

- `learning_question_search_projection_9709.total = 317`
- `question_bank_9709.total = 317`
- 其中 `paper_question = 306`
- 另有 `imported_question = 11`

证据文件：

- [`tmp/release-gates/2026-04-30-9709-question-search-gate-after-backfill.json`](/home/samsen/code/ciecopilot-home/tmp/release-gates/2026-04-30-9709-question-search-gate-after-backfill.json)

### 3.6 补齐生产级 classifier gate

这一轮不只看截图是否“看起来对”，还把 classifier 放到了生产门禁里。

当前 gate 结果：

- total: `300`
- classified: `300`
- unclassified: `[]`
- low_or_null_confidence: `15`
- OCR noise blocker:
  - `third_party_watermark = []`
  - `cambridge_footer = []`
  - `non_question_standalone_number = []`

证据文件：

- [`tmp/release-gates/2026-04-30-9709-classifier-ocr-gate.json`](/home/samsen/code/ciecopilot-home/tmp/release-gates/2026-04-30-9709-classifier-ocr-gate.json)

### 3.7 修正 release preflight 的最后两处真实 blocker

DB 回灌后，release preflight 一度还剩两处真实 blocker，都是 `diagram_present` 不一致：

- `9709/s16_qp_33/questions/q09.png`
- `9709/s24_qp_13/questions/q09.png`

最终处理方式：

- 对 `s16_qp_33/q09`，确认题面要求画 Argand diagram，但印刷题面本身没有现成图；因此 `diagram_present` 应为 `false`。
- 对 `s24_qp_13/q09`，确认题面确有图/图像元素；因此 `diagram_present` 应为 `true`。

正式受管修正已提交到主仓 manifest：

- [`data/manifests/9709_authority_ready_batch_300_v1.json`](/home/samsen/code/ciecopilot-home/data/manifests/9709_authority_ready_batch_300_v1.json)

对应提交：

- `70aa62d fix(9709): reconcile release preflight diagram flag`

## 4. 当前结果

### 4.1 300 题 page-chain 重建结果

规则修复后的 full report 摘要：

- total PDFs: `115`
- passed PDFs: `115`
- blocked PDFs: `0`
- warning PDFs: `15`
- warning reason: `subpart_mark_count_mismatch`

这里剩下的是结构告警，不是截图截断 blocker。

证据文件：

- [`.worktrees/codex-9709-pdf-page-locator-validator/tmp/pdf-page-chain/300-rerun/rule-fix-full-report.json`](/home/samsen/code/ciecopilot-home/.worktrees/codex-9709-pdf-page-locator-validator/tmp/pdf-page-chain/300-rerun/rule-fix-full-report.json)

### 4.2 Question search gate

落库后的检索 gate 为 `pass`，关键指标：

- `exact_structured_match_rate = 1.0`
- `subject_leakage_rate = 0`
- `metadata_completeness_rate = 1.0`
- `null_summary_rate = 0`

### 4.3 Release preflight

当前 release preflight 为 `pass`：

- manifest items: `300`
- sidecar items: `300`
- `diagram_present.true = 65`
- `diagram_present.false = 235`
- blockers: `0`
- warnings: `1`

唯一剩余 warning：

- `9709/s17_qp_63/questions/q07.png`
- reason: `paper_5_or_6_in_authority_ready_batch`

证据文件：

- [`tmp/release-gates/2026-04-30-9709-release-preflight-after-backfill.json`](/home/samsen/code/ciecopilot-home/tmp/release-gates/2026-04-30-9709-release-preflight-after-backfill.json)

## 5. 本轮结论

对于 `9709_authority_ready_batch_300_v1` 这 300 题：

1. 截图来源已经从旧单题 PNG 链路切回到原始 PDF page-chain 重建。
2. target crop、OCR sanitizer、diagram flag 一致性已经补到 release gate 可接受状态。
3. 修复后的 analysis 已完成 backfill，且 DB 落库后的检索/分类/发布面 gate 都是绿色。

因此，**这 300 题批次已经具备“生产可用”的条件**。

## 6. 仍需注意的边界

### 6.1 这不等于“全量 9709 已全部跑完”

本轮完成的是 300 题 authority-ready 批次闭环，对应 `115` 份 PDF、`2060` 页，不等于整个仓库所有 9709 PDF 的全量 production run。

### 6.2 原始水印 PDF 仍然存在于源库存

源 PDF 中仍有 `13` 份 watermarked PDF。当前 300 题链路已通过 OCR sanitizer 和 target crop 控制住其影响，但如果未来某些最终用户面仍直接暴露原始截图，就还需要继续关注。

### 6.3 15 个 warning PDF 不是零告警

当前 page-chain full report 仍有 `15` 个 `subpart_mark_count_mismatch` warning。它们没有阻断当前批次上线，但后续若要把 validator 进一步收紧，这一类结构告警仍值得继续清理。

## 7. 推荐的后续动作

1. 以本轮 300 题链路为模板，规划全量 9709 PDF 的 scale-out 批跑。
2. 把 `subpart_mark_count_mismatch` 这类剩余 warning 继续压缩，避免后续大批量运行时人工解释成本过高。
3. 如果最终前台展示改为“矢量题干 + diagram screenshot”混合渲染，单题截图链路可以进一步从最终用户面退居为中间证据层。

## 8. 关键证据索引

- runbook:
  - [`docs/setup/9709_300_RERUN_FROM_PDF_PAGE_CHAIN_RUNBOOK.md`](/home/samsen/code/ciecopilot-home/docs/setup/9709_300_RERUN_FROM_PDF_PAGE_CHAIN_RUNBOOK.md)
- 300 题 PDF 解析与重建：
  - [`tmp/pdf-page-chain/300-rerun/resolution-audit.json`](/home/samsen/code/ciecopilot-home/tmp/pdf-page-chain/300-rerun/resolution-audit.json)
  - [`.worktrees/codex-9709-pdf-page-locator-validator/tmp/pdf-page-chain/300-rerun/pdf-resolution-summary.json`](/home/samsen/code/ciecopilot-home/.worktrees/codex-9709-pdf-page-locator-validator/tmp/pdf-page-chain/300-rerun/pdf-resolution-summary.json)
  - [`.worktrees/codex-9709-pdf-page-locator-validator/tmp/pdf-page-chain/300-rerun/rule-fix-full-report.json`](/home/samsen/code/ciecopilot-home/.worktrees/codex-9709-pdf-page-locator-validator/tmp/pdf-page-chain/300-rerun/rule-fix-full-report.json)
- 人工 diagram review：
  - [`docs/reports/2026-04-25-9709-human-diagram-present-review.json`](/home/samsen/code/ciecopilot-home/docs/reports/2026-04-25-9709-human-diagram-present-review.json)
- 生产 gate：
  - [`tmp/release-gates/2026-04-30-9709-classifier-ocr-gate.json`](/home/samsen/code/ciecopilot-home/tmp/release-gates/2026-04-30-9709-classifier-ocr-gate.json)
  - [`tmp/release-gates/2026-04-30-9709-question-search-gate-after-backfill.json`](/home/samsen/code/ciecopilot-home/tmp/release-gates/2026-04-30-9709-question-search-gate-after-backfill.json)
  - [`tmp/release-gates/2026-04-30-9709-release-preflight-after-backfill.json`](/home/samsen/code/ciecopilot-home/tmp/release-gates/2026-04-30-9709-release-preflight-after-backfill.json)
