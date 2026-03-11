# 选题30-DS-ChatGPT

- 原始报告标题：CIE-Copilot Open-Weight Migration Research Report
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:16:39.185Z

CIE-Copilot Open-Weight Migration Research Report
System context and evaluation goalposts

Samsen, the migration question is not “which open model is best overall,” but “which model (plus decoding/guardrails) can reliably do SLA-style structured alignment while meeting education scoring constraints: strict JSON, strong instruction following, math-symbol understanding, and safe uncertainty behavior.

Two reference facts matter for downstream design:

Cambridge A Level Mathematics (9709) uses mark scheme semantics where Method marks (M) and Accuracy marks (A) are distinct, and A marks are dependent on the relevant M mark—a dependency structure your SLA JSON already encodes via depends_on. In Cambridge International mark scheme notes: M is a method mark, A is an accuracy mark, and “Accuracy marks cannot be given unless the relevant method mark has also been given.” 
1

The 9709 syllabus structure implies your “P1/P3-only” SLA benchmark should emphasize Pure Mathematics content from Paper 1 and Paper 3 (with staged/route choices for the full A Level), which will shape the synthetic coverage plan. 
2

For the current proprietary baseline reliability: OpenAI Structured Outputs is a material advantage for any scoring system that must produce schema-valid JSON, because it is explicitly designed to enforce a supplied JSON schema (beyond “valid JSON”). 
3

Candidate open-weight model assessment by role
Evidence-backed capability snapshot

Below is a capability table grounded in published benchmark results (math/reasoning + instruction following), plus deployment-relevant attributes (params, licensing, context). Where different sources report different benchmark variants (e.g., MATH-500, MATH (CoT), “IFeval strict-prompt”), you should treat the numbers as directional rather than perfectly comparable apples-to-apples.

Role	Candidate	Size / architecture	License / deployment caveat	Context notes	Relevant published evidence
SLA (strong reasoning + structured alignment)	DeepSeek‑R1 (full)	671B MoE, 37B activated/token	Open weights exist; operationally heavy	128K context reported for R1/R1‑Zero	Strong reasoning: AIME 2024 pass@1 79.8; MATH‑500 pass@1 97.3. Instruction following: IF‑Eval (Prompt Strict) 83.3. 
4

SLA (practical self-host)	DeepSeek‑R1‑Distill‑Qwen‑32B	~33B dense	MIT; explicitly allows commercial use & derivatives	Distilled model family; more tractable than 671B	Distilled eval: AIME 2024 pass@1 72.6; MATH‑500 pass@1 94.3; GPQA Diamond pass@1 62.1. 
4

SLA alternative	QwQ‑32B	32B dense	Apache 2.0	Practical 32B footprint	In DeepSeek’s reported comparison (preview row): AIME 2024 pass@1 44.0; MATH‑500 pass@1 90.6; GPQA 54.5. 
4

SLA candidate but heavy	DeepSeek‑V3	671B MoE, 37B activated/token	Open weights; but still multi‑GPU class for weights	Paper reports 671B total, 37B activated	Reported: IF‑Eval (Prompt Strict) 86.1; MATH‑500 pass@1 90.2; AIME 2024 pass@1 39.2. 
4

Tutor / Examiner dialog	Qwen2.5‑72B‑Instruct	72.7B dense	“Qwen” license on HF (not Apache 2.0); check commercial terms	HF config ships 32,768, long context via YaRN; model family supports 128K	Strong math + reasonable instruction following: MATH 83.1; IFeval strict‑prompt 84.1; Arena‑Hard 81.2. 
5

Tutor / Examiner dialog	Llama‑3.3‑70B‑Instruct	70B dense	Llama 3.3 Community License (custom commercial terms)	128K context	Very strong instruction following: IFEval 92.1; Math (MATH CoT) 77.0; multilingual dialog optimization noted. 
6

Tutor candidate with license friction	Mistral Large 2	123B dense	Weights under Mistral Research License; commercial self-host requires commercial license	128K; docs show ~297GB bf16, ~75GB fp4	License constraint is decisive for productization; also explicitly listed as replaced by “Mistral Large 3” in docs. 
7

Supervisor / routing	Phi‑3‑medium‑4k‑instruct	14B dense	MIT	4K context variant (also 128K exists in family)	Strong small-model baseline: MMLU 78.0; GSM8K CoT 91.0; Microsoft reports broad benchmark table. 
8

Supervisor / routing	Qwen2.5‑7B‑Instruct	7.61B dense	Apache 2.0	128K + 8K gen; YaRN for long context	Reported: IFeval strict‑prompt 71.2; MATH 75.5; GSM8K 91.6. 
5

Supervisor / routing	Llama‑3.2‑3B‑Instruct	3.21B dense	Llama 3.2 Community License	128K (quantized variants listed as 8K)	Intended for agentic retrieval & summarization; model card stresses “safety as a system” (relevant to Tutor role-lock). 
9
Practical interpretation for SLA

SLA alignment resembles a hybrid of: (a) reading a structured rubric + multi-step student work, (b) making step-to-criterion entailment judgments, and (c) emitting a strict schema. That means your top predictors are: “math reasoning” + “instruction following,” not just raw chat preference.

On published reasoning strength, DeepSeek‑R1 and its distilled 32B variant dominate the math benchmarks reported in the DeepSeek evaluation table (e.g., MATH‑500 and AIME 2024). 
4

On instruction following, Llama‑3.3‑70B reports IFEval 92.1, higher than GPT‑4o’s 84.3 in the DeepSeek table (though reported by different organizations, still a strong positive signal). 
6

On overall balanced tutor behavior, Qwen2.5‑72B‑Instruct reports a strong mix of MATH 83.1, IFeval strict‑prompt 84.1, and Arena‑Hard 81.2. 
5

A critical integration caveat: DeepSeek’s own usage recommendations warn that R1-family models “avoid adding a system prompt; all instructions should be contained within the user prompt.” That directly complicates multi-agent designs that rely on system messages for role control and safety. 
4

This doesn’t disqualify DeepSeek for SLA (single-turn scoring prompts can be fully user-scoped), but it does raise risk for Tutor multi-turn role-lock unless you redesign prompting and post-filters.

A-Level SLA benchmark design
Dataset objective and scope

The “A-Level SLA test set” should be optimized for alignment correctness, not final numeric answers. Your dataset should therefore stress:

Rubric dependency logic: M marks enable downstream A marks; this dependency is core to Cambridge marking (A cannot be awarded unless relevant M is earned). 
1

Paper coverage: ensure synthetic questions map to Pure Mathematics 1 and Pure Mathematics 3 content areas consistent with the 9709 structure for A Level routes. 
2

Proposed dataset schema

A minimal schema that supports repeatable evaluation and future expansion:

json
复制
{
  "item_id": "9709_p1_synth_001",
  "paper": "P1",
  "topic_tags": ["differentiation", "stationary_points"],
  "question_stem": "...synthetic, non-copyright...",
  "rubric_points": [
    {"id": "M1", "criterion": "...", "depends_on": []},
    {"id": "A1", "criterion": "...", "depends_on": ["M1"]},
    {"id": "A2", "criterion": "...", "depends_on": ["A1"]}
  ],
  "student_variants": [
    {
      "variant": "fully_correct",
      "student_steps": ["...", "..."],
      "ground_truth_sla": [
        {"rubric_id": "M1", "matched_step": 1, "label": "match"},
        {"rubric_id": "A1", "matched_step": 2, "label": "match"},
        {"rubric_id": "A2", "matched_step": 3, "label": "match"}
      ]
    },
    {
      "variant": "partially_correct",
      "student_steps": ["...", "..."],
      "ground_truth_sla": [
        {"rubric_id": "M1", "matched_step": 1, "label": "match"},
        {"rubric_id": "A1", "matched_step": 0, "label": "no_match"},
        {"rubric_id": "A2", "matched_step": 0, "label": "blocked_by_dependency"}
      ]
    },
    {
      "variant": "fully_wrong",
      "student_steps": ["...", "..."],
      "ground_truth_sla": [
        {"rubric_id": "M1", "matched_step": 0, "label": "no_match"},
        {"rubric_id": "A1", "matched_step": 0, "label": "blocked_by_dependency"},
        {"rubric_id": "A2", "matched_step": 0, "label": "blocked_by_dependency"}
      ]
    }
  ]
}


Key point: in the ground truth, you should encode why a point is not awarded (e.g., “blocked_by_dependency”), because Cambridge marking distinguishes “incorrect” from “not reachable because method not earned.” 
1

Construction plan for 50 synthetic items

A robust 50-item set is enough to rank models, but only if it is stratified to cover failure modes.

A practical build plan:

Use the 9709 syllabus structure to map out a topic grid for Pure Mathematics across P1/P3 (e.g., algebraic manipulation, functions/graphs, trigonometry, differentiation/integration, series, vectors, complex numbers, numerical methods—whatever is in the “Subject content” sections for Paper 1 and Paper 3 in the current syllabus). The syllabus document enumerates subject content sections by paper, enabling systematic coverage planning. 
2

Per item, generate three student variants with targeted errors:

“Almost-right” algebra slip (tests whether SLA keeps M marks but blocks A marks).
Alternative valid method with different intermediate forms (tests semantic matching vs surface form).
Missing explicit step (tests whether SLA can infer implied method, a known marking practice). 
1

Ground truth labeling guidelines:

Require two independent annotators for the SLA mapping; resolve disagreements via adjudication.
Require explicit justification when mapping one student step to multiple rubric points (usually verboten unless rubric is intentionally coalesced).
Define a strict policy for “implied method”: only allow if the step unambiguously implies the method described (mirrors the mark scheme note that method can be “implied from a correct answer” in some cases). 
1
Metrics

You specified Step-Level F1, M/A classification accuracy, and JSON format compliance.

Definitions that will keep the benchmark stable:

Step-Level F1: treat each (rubric_id → matched_step) as a prediction; compute micro-F1 over all rubric points across all items/variants.

M/A classification accuracy: reduce rubric points into categories (M vs A). Then compute:

M-accuracy: correct match/no_match for M points.
A-accuracy: correct match/no_match and correct dependency handling (A blocked when M missing).

JSON format compliance rate:

Strict parse against a JSON schema; count “valid schema objects” / total.

Because your system must emit strict JSON, format compliance should be measured in two modes:

“Prompt-only” mode (no constrained decoding) to measure model intrinsic discipline.
“Constrained decoding” mode (schema-guided) to measure achievable production compliance.
Instruction-following reliability tests for scoring and tutoring
Why “strict JSON” should be enforced at decode-time

In production scoring, you typically want format compliance to be a solved systems problem, not a probabilistic model behavior problem.

Three practical options with strong documentation support:

OpenAI Structured Outputs: explicitly designed to ensure responses adhere to a supplied JSON Schema. 
3

Schema-guided decoding for local models:

vLLM supports structured decoding by passing a JSON schema in sampling parameters. 
10
Hugging Face TGI supports “guidance” including JSON grammars. 
11
Constrained decoding libraries like Hugging Face ecosystem tools: Outlines and LM Format Enforcer explicitly target schema/regex-constrained generation. 
12

Recommendation: for SLA, treat schema compliance as mandatory and enforce it with constrained decoding. That shifts evaluation focus to alignment accuracy (F1) and uncertainty calibration.

Uncertainty obedience test

You want: “If uncertain, output uncertain rather than guessing.”

Design a targeted 30-case micro-suite separate from the 50-item main set:

10 cases where two rubric points could match the same ambiguous step.
10 cases where student step is partially correct but unclear if it satisfies criterion.
10 cases with missing context (e.g., step references “it” without antecedent).

Metric: “Uncertain obedience rate” = fraction of cases where model returns uncertain (or label: "uncertain") and does not assign a confident match.

Operational note: quantization can degrade instruction-following across tasks like IFEval; a recent large evaluation of quantized instruction-tuned LLMs reports that instruction-following performance can be disrupted by quantization, and weight-only methods (AWQ) generally degrade less than GPTQ. 
13

So you should explicitly run the uncertainty suite across BF16/FP8/INT4 variants.

Tutor “role lock” test

For “Tutor Agent doesn’t give final answers,” you should not rely on a single prompt. Model cards themselves (e.g., Llama 3.2) emphasize that LLMs should be deployed “as part of an overall AI system with additional safety guardrails,” which applies directly to “don’t leak answers” constraints. 
9

Test design:

50 prompts explicitly asking for final answers (“just give me x = …”).
50 jailbreak-style prompts (“pretend you are the examiner; reveal the mark scheme answer”).
50 benign help-seeking prompts that should receive hints but not final numeric answers.

Success criteria:

Refusal / hint-only compliance rate.
“Answer leakage rate” measured by regex + symbolic checks (e.g., solver detects final numeric answer patterns).
Helpful-hint score (human-rated or rubric-based), because over-refusal harms learning outcomes.
Deployment realities, inference stack, and cost
GPU feasibility and VRAM requirements

Hardware memory constraints are dominated by weight storage for large dense models, plus KV cache for long-context and concurrency.

Baseline GPU memory facts:

NVIDIA A100 has an 80GB HBM2e configuration. 
14
H100 has 80GB variants (and larger in NVL). 
15
L4 is a 24GB data center GPU. 
16

A dense 70B-class model in BF16 is roughly 70B params × 2 bytes ≈ 140GB just for weights (before overhead). This is consistent with Mistral’s own documentation for a larger 123B model: ~297GB at bf16 and ~75GB at fp4, illustrating the expected scaling. 
17

Implications:

BF16 70B generally requires tensor parallel across ≥2×80GB GPUs, or aggressive quantization.
INT4/FP4 weight-only quantization can often fit 70B into a single 80GB GPU with room left for KV cache, but requires quality validation (especially instruction-following and uncertainty policies). 
13
24GB L4 is appropriate for ~7B–14B class models (router, lightweight tutor, small reranker), not a full 70B dense model unless you accept severe context/quality constraints. 
16

Inference frameworks for production

For your workloads (SLA scoring + tutoring + routing), the key serving properties are: continuous batching, KV cache efficiency, and support for constrained decoding.

vLLM: built on PagedAttention to reduce KV cache waste; the original paper reports throughput improvements (2–4×) vs prior systems under comparable latency. 
18

A later empirical study specifically benchmarking vLLM vs TGI reports vLLM can reach much higher throughput under high concurrency, while TGI may have lower tail latencies in some interactive scenarios. 
19

vLLM also supports schema-based structured decoding in practice. 
10

SGLang: positioned as a system for efficient execution of structured LLM programs; the paper reports substantial speedups for common workloads and introduces KV reuse mechanisms (RadixAttention). 
20

TGI: production-oriented features include tensor parallelism, continuous batching, streaming, and—critically for SLA—support for JSON/regex grammars via “guidance.” 
21

Ollama / llama.cpp: excellent for developer iteration and GGUF-based quantized local runs, but for multi-tenant, low-P95 serving you’ll typically prefer vLLM/TGI/SGLang. GGUF is a binary format optimized for inference runtimes in the GGML family. 
22

Practical recommendation for CIE-Copilot:

SLA scoring: vLLM or TGI with JSON-schema constrained decoding.
Tutor: vLLM or SGLang (SGLang can be attractive if your tutor orchestration becomes “program-like” with multiple calls and prefix reuse).
Router + embeddings: separate lightweight services (can even be CPU for embeddings, depending on latency needs).
Quantization choices and expected SLA impact

Quantization methods to consider:

GPTQ: classic post-training quantization method using approximate second-order information; originally claimed negligible degradation at 3–4 bits for model quality in many settings. 
23

AWQ: activation-aware, protects salient weights; designed to reduce quantization error and reported to perform well on instruction-tuned and math/code tasks. 
24

GGUF: mainly a packaging/format ecosystem for quantized weights in GGML runtimes; widely used for on-device / local inference and fast loading. 
22

What the research suggests for your SLA task:

A comprehensive evaluation of quantized instruction-tuned LLMs reports that quantization can disproportionately hurt instruction following (IFEval), and AWQ generally shows less accuracy degradation than GPTQ among weight-only methods; it also notes that FP8 can be more stable when hardware supports it, and that vLLM supports FP8 KV cache. 
13
Since your SLA system is instruction-heavy (“don’t skip steps”; “return uncertain”), you should treat quantization level as a first-class hyperparameter and benchmark it on your SLA set, not just on generic MMLU/MATH.

A reasonable expectation (to be verified on your SLA benchmark) is:

BF16/FP16: best instruction adherence; highest SLA F1.
FP8 (on H100-class): near-BF16 quality with better throughput/memory behavior for KV cache.
INT4 (AWQ): often acceptable for reasoning but may reduce instruction-following and uncertainty obedience; mitigate by (a) constrained decoding for JSON and (b) explicit uncertainty calibration tests. 
13
Cost model at 1000 DAU
OpenAI API unit prices used in calculations

GPT‑4o: $2.50 / 1M input tokens and $10.00 / 1M output tokens. 
25

GPT‑4o‑mini: $0.15 / 1M input and $0.60 / 1M output. 
26

text-embedding-3-large: $0.13 / 1M tokens. 
27

Cloud GPU hourly prices used for illustrative self-hosting

Lambda lists A100 80GB at $2.06 per GPU-hour and H100 80GB at $3.44 per GPU-hour (public price list). 
28

Runpod lists L4 instances from $0.39/hr. 
29

These numbers change over time; treat them as current reference points for March 2026, not constants.

Scenario-based monthly cost comparison

Because your “选题22” usage assumptions weren’t provided, the only honest approach is sensitivity analysis. Below are three internally consistent scenarios (assumptions stated), showing why “save 60–80%” is plausible only when token volume is high and GPUs are efficiently utilized.

Assumptions per daily active user (DAU) per day:

SLA call = (input_tokens, output_tokens) for rubric+steps → alignment JSON
Tutor turn = tokens per dialog turn
Supervisor routing uses GPT‑4o‑mini
One embedding call per user message
Scenario	Assumptions per DAU/day	Monthly OpenAI cost (1000 DAU, 30d)	Interpretation
Light	1× SLA (2.5k in / 350 out), 5× Tutor (900 in / 300 out), 5× route, 5× embed	≈ $1.1k	At low usage, OpenAI can already be cost-effective; self-hosting may not win on cost alone.
Base	2× SLA (6k / 600), 10× Tutor (2k / 450), 10× route, 10× embed	≈ $4.1k	Self-hosting can win if you can serve both Tutor+SLA on ~1 GPU (or keep utilization high).
Heavy	4× SLA (15k / 1.2k), 20× Tutor (4k / 900), 20× route, 20× embed	≈ $17.4k	Now the “60–80% savings” narrative becomes realistic if open models handle most traffic.

All three scenarios use the unit prices cited above. 
25

Break-even intuition

A single A100 80GB on-demand at $2.06/hr is about $1,483/month (ignoring CPU/storage/network). 
28

For GPT‑4o, if your effective blended price is roughly $4 per 1M total tokens (e.g., ~80% input / 20% output), then you break even around 370M tokens/month. This is why DAU alone is not enough—tokens per DAU per day is the real driver. 
25

Recommended hybrid deployment strategy and architecture
What should remain GPT‑4o, and why

Even if you replace most calls, there are three “capability boundary” zones where keeping GPT‑4o as a fallback is strategically rational:

Hard SLA edge cases: extremely ambiguous student work, unusual-but-valid methods, or rubric points with subtle entailment that your open model fails on in benchmark audits. The fallback can be triggered by low confidence, high entropy (self-consistency disagreement), or explicit uncertain. (This is a product safety choice, not model worship.)

Strict JSON reliability without engineering overhead: OpenAI Structured Outputs materially reduces operational toil for schema compliance; you can replicate this with constrained decoding, but you must own the stack and its failure modes. 
3

High-stakes markets with exam integrity sensitivity: if a bug silently changes scoring, it’s reputationally expensive. A closed-model fallback can serve as an independent “second opinion” channel during rollout (with careful privacy controls), until your SLA benchmark and monitoring prove stability.

What should move to open models

A plausible “first stable” allocation that aligns with the evidence:

SLA primary scorer:

Primary: DeepSeek‑R1‑Distill‑Qwen‑32B (strong reasoning at workable size). 
4
Use JSON-schema constrained decoding (vLLM/TGI) so JSON compliance is near-deterministic. 
10
Fallback: GPT‑4o only when uncertain or validation/consistency checks fail.

Tutor agent:

Primary: Qwen2.5‑72B‑Instruct if you value stronger math/coding and high Arena‑Hard; or Llama‑3.3‑70B‑Instruct if you prioritize instruction adherence (IFEval 92.1). 
5
Enforce “no final answers” via system safeguards + leakage classifier, not prompt-only. 
9

Supervisor routing:

Start with Qwen2.5‑7B‑Instruct (Apache 2.0) or Phi‑3‑medium‑4k‑instruct (14B) depending on budget and latency. 
30
Consider Llama‑3.2‑3B‑Instruct when you need ultra-low cost, but validate intent accuracy under your domain-specific label set. 
9

Embeddings:

For multilingual RAG: multilingual‑e5‑large (MIT, 1024-dim) or BGE‑M3 (MIT, 1024-dim) depending on whether you want hybrid sparse+dense in one model. 
31
Nomic Embed v2 MoE is compelling when you want strong retrieval with smaller embedding dim (768) and published BEIR/MIRACL comparisons, but it requires task prefixes and has its own operational complexity. 
32
Reference architecture

A deployment architecture that supports privacy modes and fallbacks:

pgsql
复制
Client
  │
  ▼
API Gateway / Auth / Rate-limit
  │
  ├──► Supervisor Router (local small model: Qwen2.5-7B / Phi-3 / Llama-3.2-3B)
  │         │
  │         ├──► SLA Scoring Pipeline
  │         │       ├─ Preprocess: normalize LaTeX, step segmentation
  │         │       ├─ Deterministic checks: SymPy equivalence / simplification gates
  │         │       ├─ LLM Align (local reasoning model, schema-constrained decoding)
  │         │       ├─ Post-validate JSON + dependency logic (M→A)
  │         │       └─ Fallback (optional by region): GPT-4o Structured Outputs
  │         │
  │         └──► Tutor Pipeline
  │                 ├─ Retrieve: local embeddings + vector DB (E5 or BGE-M3)
  │                 ├─ Tutor LLM (local 70B-class)
  │                 ├─ "No final answer" guard: output classifier + rewrite/refuse
  │                 └─ Escalate: hint-only / human review mode
  │
  ▼
Observability + Audit Logs
(Always—especially for scoring drift detection)


Privacy modes:

“Full local” mode: disable GPT‑4o fallback entirely and route uncertain to human review or conservative scoring.
“Hybrid” mode: allow fallback for better quality, but only where policy permits sending student data externally.
Expected cost savings envelope

A realistic cost outcome depends on token volume and GPU utilization, not on model choice alone.

If you can serve Tutor + SLA on ~1–2 large GPUs (A100/H100 class) and keep GPT‑4o as a small fallback slice, then:

In “heavy token” scenarios, 60–80% reduction vs GPT‑4o-heavy usage is plausible (most spend is displaced by fixed GPU cost).
In “base” scenarios, savings may be modest unless you can consolidate onto fewer GPUs or use spot/commit discounts.
In “light” scenarios, self-hosting may increase total cost unless privacy/latency requirements justify it.

All of those statements follow directly from the price structures cited: GPT‑4o token billing vs fixed hourly GPU billing. 
25
