# 选题9-DS-ChatGPT

- 原始报告标题：Deep Research on Intent Routing for CIE-Copilot Supervisor Agent
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:07:38.822Z

Deep Research on Intent Routing for CIE-Copilot Supervisor Agent
Context and routing success criteria in a high-stakes education copilot

In task-oriented dialogue systems, “intent / job routing” is the early decision that determines downstream tools, prompts, and user experience; modern NLU stacks explicitly treat intent as the key structured signal extracted from user messages. 
1
 In an education copilot like CIE-Copilot, routing errors are not symmetric: misrouting a scoring request (“帮我判分”) into a conceptual explanation is usually perceived as the assistant “not listening,” which damages trust more than a minor factual slip because the user’s immediate goal (grading) was ignored.

Your Supervisor Agent must route a user message into one of four job_type values:

ASK_AI: conceptual Q&A / explanation (“这题怎么做”, “解释一下…”, “为什么…”)
MARK_MATH: marking / scoring request (“帮我判分”, “按 CIE mark scheme 给分”, “给我几分”)
ERROR_BOOK: wrong-question archiving (“把这题加入错题本”, “错题归档”, “记录错因”)
NAVIGATE: syllabus / outline navigation (“考纲里这属于哪一章”, “CIE syllabus… topic…”, “找知识点/章节”)

Two additional constraints shape the engineering optimum:

The label space is small (4 classes), so even simple models can achieve high top-1 accuracy if the data is clean; the hard part becomes ambiguous boundaries, multi-intent, and OOS-like inputs rather than sheer class count. (A common failure mode in intent systems is “out-of-scope / unsupported intent”; even strong classifiers can struggle there.) 
2
Latency is user-visible and frequent, so routing should be cheap and stable. When routing depends on large LLM calls, you must optimize for latency and token cost explicitly; OpenAI provides a dedicated latency optimization guide rather than assuming default settings are “fast enough.” 
3
Comparative analysis of five routing approaches
Routing approach comparison table

The table below compares the five candidate approaches across accuracy, latency, maintenance cost, and scalability/multilingual expansion. “Accuracy” is best understood as expected robustness under ambiguity, paraphrase, and code-mixing, rather than a single benchmark number—because real classroom requests include incomplete context, partial student answers, and mixed instructions.

Approach	Expected accuracy profile	Latency profile	Maintenance cost profile	Scalability & multilingual extensibility
Rule engine (keywords + regex)	High precision on explicit patterns (e.g., “判分/mark scheme/给分”, “错题本”, “考纲/syllabus”), but brittle on paraphrase and implicit intent; rule-based methods are often described as labor-intensive and limited in scalability. 
4
	Very low (string matching).	Rules must be updated as phrasing drifts; grows combinatorially when adding languages/errors. “Time-consuming, labor-intensive” is a recurring critique for rule-based intent classification. 
4
	Poor-to-moderate: each new language needs separate lexicons/regex; code-mixing complicates rule coverage.
Embedding classifier (embed + similarity to intent exemplars/prototypes)	Often strong in low-data regimes when framed as similarity search; dual-encoder intent detection can outperform full BERT fine-tuning in few-shot settings and train fast. 
5
 Sentence embeddings (e.g., SBERT) enable robust semantic similarity vs keyword rules. 
6
	Low: one embedding + ANN cosine similarity can be fast in real time. 
7
	Moderate: adding a new intent can be as simple as adding exemplar utterances; periodic re-embedding and evaluation required.	Good: multilingual sentence embeddings exist (e.g., LaBSE for 109 languages). 
8
 Knowledge-distillation can extend monolingual sentence embeddings to many languages efficiently. 
9

Fine-tuned classifier (BERT/DistilBERT)	Typically very high accuracy with enough labeled data; BERT-based models show strong in-scope accuracy on intent/OOS-style datasets, but OOS handling remains hard. 
10
 DistilBERT trades small accuracy loss for large speed/size gains. 
11
	Medium-to-low: local inference is fast, and DistilBERT is ~40% smaller and ~60% faster than BERT in the original study. 
11
	Moderate: requires labeled data, training pipeline, monitoring for drift, and periodic retraining.	Good if you choose multilingual backbones (e.g., XLM-R trained on 100 languages) for cross-lingual transfer. 
12

LLM Function Calling (LLM “chooses tool”)	Can be strong on nuanced natural language, but tool-calling is a distinct capability with measurable failure modes; BFCL is a dedicated benchmark for function/tool calling accuracy and abstention in agentic settings. 
13
	High/variable: network + LLM inference dominates; requires dedicated latency optimization. 
3
	Low-to-moderate: adding a tool is “just schema,” but reliability testing is mandatory because tool choice errors are costly; fine-tuning can improve function-calling reliability (OpenAI cookbook pattern). 
14
	Good for multilingual if LLM supports it, but cost scales with traffic; also higher variance under code-mixing unless you test. 
15

LLM + few-shot classification (prompted label selection)	Demonstrated feasibility: LMs can do tasks from prompts and few examples (in-context learning). 
16
 However, prompt design becomes harder as ambiguity/multi-intent rise; “many-class” or subtle boundaries can make manual prompt design cumbersome. 
17
	High/variable like other LLM uses; token length is a major driver. 
3
	Moderate: less ML infra, more prompt/version management; requires continuous eval because behavior can shift with model updates.	Good for multilingual, but reliability under code-mixing should be benchmarked; code-mixed evaluation benchmarks exist because mixing is hard. 
18
Key takeaways from the evidence

A practical conclusion supported by recent industry research is that a full LLM-based approach is often inefficient in production due to latency/cost and inconsistent task performance, motivating hybrid architectures that use a smaller intent classifier for routine routing and reserve LLM reasoning for hard cases. 
19
 This aligns well with your 4-way routing needs: most messages should route instantly; only ambiguous/multi-intent messages should pay an LLM “tax.”

For the specific “embedding classifier” option, there is direct evidence in intent detection literature that pretrained dual sentence encoders (e.g., USE/ConveRT-style) can be effective and especially strong in few-shot setups, and can outperform fine-tuned BERT-Large while training quickly (even CPU-friendly in some settings). 
5
 This matches your requirement to build a router that stays accurate as new phrasing and curriculum variations appear—without requiring constant full retraining.

Education-specific challenges and strategies for ambiguity and mixed intent
Ambiguous intent in tutoring vs grading

The classic ambiguity you surfaced—“这道题怎么做” → ASK_AI or MARK_MATH?—is common in education because “how to do it” might mean:

“I want the solution steps” (tutoring → ASK_AI),
“I already did it; tell me if it’s correct / how many marks” (grading → MARK_MATH),
“I want both” (multi-intent → MARK_MATH + ASK_AI).

This is structurally similar to multi-intent recognition in dialogue understanding, where a single utterance can legitimately map to multiple intents (multi-label), and research explicitly evaluates multi-label intent classification as a separate problem from single-label routing. 
20

In education, you can make ambiguity significantly more tractable by using contextual signals beyond raw text:

Presence of a student answer (typed solution, photo/OCR text, “我的答案: …”, “I got …”) strongly correlates with MARK_MATH.
Presence of verbs like “explain / why / 解法” with no answer attached correlates with ASK_AI.
Explicit request for “mark scheme / 给分点 / rubric” correlates with MARK_MATH.
“记录/归档/错题本” correlates with ERROR_BOOK.
“syllabus/考纲/哪个topic/哪一章” correlates with NAVIGATE.

These features can be encoded as high-precision rules (fast path) plus ML scoring (robust path), which is the core of the hybrid approach advocated for production systems. 
19

Mixed intent requests need orchestration, not “pick one”

The utterance “帮我判分并解释错在哪里” is not an edge case; it is a natural user expectation. If the router forces a single job_type, you will either:

route to MARK_MATH but fail to explain (perceived “partial compliance”), or
route to ASK_AI but fail to give marks (trust-breaking).

Instead, treat such utterances as composite tasks. Two robust patterns:

Pattern A: Pipeline (sequential) orchestration
Run MARK_MATH first, then use the marking outcome to guide explanation, then optionally offer ERROR_BOOK creation.

This mirrors pedagogical logic: “where did I lose marks?” depends on the marking rubric and what was counted wrong.
It reduces inconsistency because the explanation cites the same reasoning used for scoring.

Pattern B: Parallel with reconciliation
Run ASK_AI-style explanation and MARK_MATH grading in parallel, then reconcile. This is only safe if both tools rely on the same extracted problem statement and student answer; otherwise it can produce conflicting narratives.

Because multi-intent and tool calling are now evaluated in agentic benchmarks (including serial vs parallel calls), you can explicitly test whether your chosen orchestrator handles these compositions reliably. 
13

Chinese-English code-mixed inputs are the norm in CIE markets

CIE students commonly mix languages and notation: Chinese scaffolding + English keywords (“mark scheme”, “topic”, “syllabus”), plus math symbols. Code-mixing is challenging enough that dedicated benchmarks for Chinese–English code-mixing have been built to probe model boundaries. 
18

Operationally, code-mixing introduces two concrete routing risks:

Surface keyword collisions (“mark” in an explanation vs “mark my answer” as grading).
Language-ID-dependent preprocessing failures (tokenization, normalization, translation pipelines).

A pragmatic mitigation is to run lightweight language identification before routing and to support mixed-language segments. fastText provides language ID models recognizing 176 languages, and its ISO code list explicitly includes zh (Chinese), yue (Cantonese), and ms (Malay). 
21
 For finer-grained, token-level code-mixed language ID, Google Research reports a model that labels language for each token in code-mixed text and claims major speed/accuracy gains (including “800× speed-up” and large absolute accuracy improvements on codemixed datasets). 
22

Recommended routing architecture for CIE-Copilot
Why a hybrid router is the best fit for your four job types

Given the high cost of misrouting and the small number of job types, the most robust pattern is:

High-precision deterministic rules for the most unambiguous triggers (e.g., explicit “错题本”, “判分/mark scheme”, “考纲/syllabus”).
A small, fast learned router (fine-tuned DistilBERT/XLM-R or embedding similarity) as the default.
A “hard case” fallback that asks the user to confirm intent, optionally assisted by an LLM classification step.

This is consistent with the industry claim that fully LLM-based approaches can be inefficient and inconsistent, and that hybrid approaches combine strengths of smaller intent models with LLM reasoning. 
19

Architecture diagram
mermaid
复制
flowchart TD
    U[User message\n(text + attachments + conversation state)] --> P[Preprocess\n- normalize punctuation/math\n- language ID (may be code-mixed)\n- detect answer presence\n- detect syllabus keywords]
    P --> R{High-precision rules?\n(whitelist patterns)}
    R -->|Yes| J1[Route to job_type\nASK_AI / MARK_MATH /\nERROR_BOOK / NAVIGATE]
    R -->|No| M[Fast learned router\nOption 1: DistilBERT/XLM-R classifier\nOption 2: Embedding KNN/prototypes]
    M --> C{Confidence OK?\n(top1 >= τ and margin >= δ)}
    C -->|Yes, single-intent| J2[Route to best job_type]
    C -->|Composite detected| O[Orchestrator\npipeline or parallel plan:\nMARK_MATH -> ASK_AI -> ERROR_BOOK?]
    C -->|No| F[Fallback\nAsk user to confirm intent\n(+ optional LLM judge for suggestions)]
    F --> J3[Route based on user selection]
    O --> J4[Execute multi-step tools\nReturn combined response\n+ offer archive]

The “confidence OK?” gate is essential because modern neural classifiers can be poorly calibrated, meaning raw confidence scores may not reflect true correctness likelihood. 
23
 The orchestrator branch explicitly handles multi-intent rather than forcing a single label, aligning with multi-intent dialogue research framing. 
20

Choosing between DistilBERT/XLM-R vs embedding KNN for the learned router

A decision rule that works well in practice:

If you can label ~500–2,000 examples quickly and want maximum accuracy and stable decision boundaries, pick fine-tuned DistilBERT (or XLM-R if multilingual is near-term). DistilBERT’s design goal is to retain most of BERT performance while being ~60% faster and 40% smaller. 
24
If you expect frequent intent drift, new phrasing, and will be adding new intents/variants without retraining cycles, embedding KNN/prototypes is compelling: sentence embeddings enable semantic matching cheaply, and intent detection work with dual sentence encoders shows strong performance especially in few-shot settings. 
25
If multilingual (Chinese/Malay) is a hard requirement soon, embedding approaches can adopt multilingual sentence embeddings (LaBSE, LASER, multilingual SBERT) or multilingual backbones; LaBSE is explicitly presented as language-agnostic sentence embeddings for 109 languages. 
8
Confidence estimation and graceful degradation for low-confidence routing
Confidence signals you should compute

For a 4-way router, you want two confidence notions:

Top-1 confidence: predicted probability for the chosen intent.
Ambiguity margin: difference between top-1 and top-2 scores.

This margin matters because many ambiguous utterances will have two plausible intents (e.g., ASK_AI vs MARK_MATH). Rasa’s fallback mechanisms formalize a similar concept: a threshold for NLU confidence plus an ambiguity threshold based on the difference between top predictions. 
26

Because neural confidence can be miscalibrated, you should plan calibration explicitly (e.g., temperature scaling is a widely used post-hoc calibration method). 
23

A practical fallback UX pattern for education

When below threshold, do not ask an open-ended clarification (“What do you mean?”). Ask a bounded, two-choice (or four-choice) confirmation that maps directly to the job_type set. Example:

“I can do either of these—what do you want?
A) Grade/mark your answer (MARK_MATH)
B) Explain how to solve it (ASK_AI)
C) Save to your error book (ERROR_BOOK)
D) Find this topic in the syllabus (NAVIGATE)”

If the top-2 intents are close, show only those two options (less cognitive load). This is effectively selective classification (abstention): the system abstains when uncertain and asks the human. Tool-calling benchmarks like BFCL also evaluate abstention in agentic settings, underscoring that “knowing when not to decide” is part of modern evaluation. 
13

Conformal-style “set prediction” as an alternative to thresholds

If you want more principled guarantees, you can treat the router as outputting a set of plausible intents rather than a single one and ask the user to choose among them. This aligns with conformal prediction, an uncertainty framework that converts model scores into prediction sets with formal coverage properties under exchangeability assumptions. 
27

In product terms, conformal sets can become:

If set size = 1 → auto-route.
If set size = 2 → ask user to choose between two.
If set size ≥ 3 → ask a short clarifying question (“Did you already write an answer?”) to collapse uncertainty.
Evaluation dataset design and online learning from user feedback
Building a 500+ labeled routing benchmark that actually measures correctness

A minimum viable benchmark of ≥500 samples is achievable quickly, but it must include the “boundary cases” that cause mistrust. A strong reference point is intent datasets that explicitly include “out-of-scope” queries because they reveal how models fail when inputs do not match supported intents; the CLINC/OOS dataset was introduced precisely because typical corpora unrealistically assume every query is in-scope. 
28

For CIE-Copilot, even if you don’t add a formal “OOS” label, you should include a “needs clarification / abstain” annotation field so that the benchmark measures when the model should ask rather than guess.

A practical dataset schema (single row per user message):

text: raw user text (may be code-mixed)
attachments: none / image / pasted solution (metadata only, if privacy)
lang_profile: zh / en / ms / code-mixed (auto + human verified subset)
primary_job_type: one of 4
secondary_job_type: optional (for mixed intent)
should_abstain: yes/no (would a safe system ask a clarifying question?)
notes: why ambiguous (short)

Recommended composition for 500 samples (example target mix):

280 single-intent clear (70 per class)
140 ambiguous boundary cases (ASK_AI↔MARK_MATH heavy)
80 mixed-intent composites (MARK_MATH+ASK_AI, ASK_AI+NAVIGATE, MARK_MATH+ERROR_BOOK, etc.)

For multilingual readiness, ensure at least:

15–20% Chinese-only
10–15% code-mixed Chinese-English
5–10% Malay (or Malay-English mix)
The rest English

The motivation is not academic purity; it is to ensure the router’s definition of “confidence” generalizes to your deployment languages. Multilingual and code-mixed benchmarks exist precisely because mixing is not a corner case for users. 
18

Metrics that reflect real UX risk

Use metrics that correspond to trust:

Top-1 accuracy / macro-F1 on clear single-intent examples.
Confusion matrix, especially ASK_AI vs MARK_MATH.
Selective accuracy (“coverage vs risk”): accuracy on the subset where the model auto-routes, plus the fraction of queries where it abstains (asks user). This directly measures “do we guess when unsure?”
Calibration (e.g., Expected Calibration Error) because modern networks can be poorly calibrated.

A robust production loop (offline + online):

Online (daily/weekly): collect (message, predicted_intent, confidence, user choice/correction).
Triage: prioritize high-confidence wrong routes and low-confidence abstained routes.
Active learning: sample uncertain / disagreement cases for human labeling; active learning with BERT-style classifiers has been studied empirically as a way to cope with small annotation budgets. 
29
Retrain cadence: retrain router weekly/biweekly if drift is high; otherwise monthly.
Shadow evaluation: always run the new router alongside old on a holdout slice before switching.
Weak supervision to scale labels without 10× annotation cost

To bootstrap beyond 500 examples, consider programmatic labeling:

Encode your high-precision regex/keyword rules as labeling functions (LFs), which are explicitly designed to inject heuristics/domain knowledge to label data programmatically. 
30
Combine multiple LFs into probabilistic labels, then train a discriminative model (DistilBERT/XLM-R). This gives you a path where rules are not only a brittle router but also a data engine.

This is especially useful for multilingual expansion because you can write language-specific LFs (e.g., Malay “bagi markah”, Chinese “考纲/错题本”) while still training a single robust router.

Recommended overall solution for CIE-Copilot (synthesis)

For your four job_type values and education-specific ambiguity, the best-supported design is a hybrid router:

Rules as precision triggers + labeling functions,
A fast learned router (DistilBERT or embedding KNN; XLM-R if near-term multilingual),
Confidence-calibrated abstention with bounded user confirmation,
An orchestrator that treats mixed intent as a first-class outcome (pipeline by default),
An online learning loop using user corrections + active learning + periodic retraining.

This aligns with (a) evidence that rule-only approaches don’t scale well, 
4
 (b) evidence that dual-encoder/embedding methods are strong and efficient in low-data intent detection, 
5
 (c) evidence that LLM-only production approaches can be inefficient and inconsistent—hence hybrid architectures, 
19
 and (d) evidence that user-feedback-driven online learning for intent classification is viable via bandit-style frameworks.
