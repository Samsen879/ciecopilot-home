# RAG S2 Augmentation Eval Report

- Generated at: `2026-06-04T14:34:17.538Z`
- Status: `fail`
- Benchmark profile: `s2_augmentation_eval_v1`
- Dataset: `data/eval/rag_s2_augmentation_eval_v1.json`
- Total requests: `82`

## Key Metrics

- fallback_rate: `0.296875`
- topic_leakage_rate: `0`
- evidence_traceability_rate: `1`
- target_slice_quality_vs_s1: `-0.101409`
- target_slice_case_pass_vs_s1: `-0.187263`
- readiness_guard_block_rate: `0.219512`

## Route Counts

- s2_augmentation: `64`
- s1_default: `18`

## Fallback Reason Counts

- S2_TIMEOUT: `18`
- S2_INFRA_ERROR: `1`

## S2 Empty Evidence Breakdown

- none

## Readiness Guard Breakdown

- readiness_guard_block_count: `18`
- readiness_guard_block_rate: `0.219512`
- readiness_guard_reason/topic_depth_exceeded: `18`

## Target Slice Delta

- cross_topic: quality_delta=`-0.059314` pass_rate_delta=`-0.109524` s2_fallback_rate=`0.181818`
- global_planning: quality_delta=`-0.12301` pass_rate_delta=`-0.233333` s2_fallback_rate=`0.428571`
- prerequisite_chain: quality_delta=`-0.123745` pass_rate_delta=`-0.222222` s2_fallback_rate=`0.285714`

## Dependency Status

- skipped: `82`

## Top Failing Cases

- case=`s2-aug-049` slice=`cross_topic` class=`S2_FALLBACK` fallback=`S2_TIMEOUT` delta_vs_s1=`-0.595238`
- case=`s2-aug-051` slice=`prerequisite_chain` class=`S2_FALLBACK` fallback=`S2_TIMEOUT` delta_vs_s1=`-0.590909`
- case=`s2-aug-075` slice=`prerequisite_chain` class=`S2_FALLBACK` fallback=`S2_TIMEOUT` delta_vs_s1=`-0.589888`
- case=`s2-aug-063` slice=`prerequisite_chain` class=`S2_FALLBACK` fallback=`S2_TIMEOUT` delta_vs_s1=`-0.576923`
- case=`s2-aug-074` slice=`global_planning` class=`S2_FALLBACK` fallback=`S2_TIMEOUT` delta_vs_s1=`-0.570175`
- case=`s2-aug-050` slice=`global_planning` class=`S2_FALLBACK` fallback=`S2_TIMEOUT` delta_vs_s1=`-0.565574`
- case=`s2-aug-009` slice=`prerequisite_chain` class=`S2_FALLBACK` fallback=`S2_TIMEOUT` delta_vs_s1=`-0.561538`
- case=`s2-aug-082` slice=`cross_topic` class=`S2_FALLBACK` fallback=`S2_INFRA_ERROR` delta_vs_s1=`-0.556911`
- case=`s2-aug-065` slice=`global_planning` class=`S2_FALLBACK` fallback=`S2_TIMEOUT` delta_vs_s1=`-0.556604`
- case=`s2-aug-062` slice=`global_planning` class=`S2_FALLBACK` fallback=`S2_TIMEOUT` delta_vs_s1=`-0.555046`
- case=`s2-aug-054` slice=`prerequisite_chain` class=`S2_FALLBACK` fallback=`S2_TIMEOUT` delta_vs_s1=`-0.554054`
- case=`s2-aug-052` slice=`cross_topic` class=`S2_FALLBACK` fallback=`S2_TIMEOUT` delta_vs_s1=`-0.551948`
- case=`s2-aug-053` slice=`global_planning` class=`S2_FALLBACK` fallback=`S2_TIMEOUT` delta_vs_s1=`-0.550633`
- case=`s2-aug-044` slice=`global_planning` class=`S2_FALLBACK` fallback=`S2_TIMEOUT` delta_vs_s1=`-0.542553`
- case=`s2-aug-021` slice=`prerequisite_chain` class=`S2_FALLBACK` fallback=`S2_TIMEOUT` delta_vs_s1=`-0.515674`
- case=`s2-aug-002` slice=`global_planning` class=`S2_FALLBACK` fallback=`S2_TIMEOUT` delta_vs_s1=`-0.511628`
- case=`s2-aug-005` slice=`global_planning` class=`S2_FALLBACK` fallback=`S2_TIMEOUT` delta_vs_s1=`-0.510178`
- case=`s2-aug-004` slice=`cross_topic` class=`S2_FALLBACK` fallback=`S2_TIMEOUT` delta_vs_s1=`0`
- case=`s2-aug-059` slice=`global_planning` class=`S2_FALLBACK` fallback=`S2_TIMEOUT` delta_vs_s1=`0`

## Inputs

- dataset: `data/eval/rag_s2_augmentation_eval_v1.json`
- manifest: `data/eval/rag_s2_augmentation_eval_v1_manifest.json`
- corpus_coverage_summary: `runs/backend/rag_corpus_source_coverage_summary.json`

