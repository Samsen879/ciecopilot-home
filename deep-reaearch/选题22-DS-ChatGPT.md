# 选题22-DS-ChatGPT

- 原始报告标题：Cost and Token Optimization Research for CIE-Copilot
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:15:42.092Z

Cost and Token Optimization Research for CIE-Copilot
Context and scope

Samsen, this report focuses on the LLM-inference side of CIE-Copilot (an AI tutor + marking/examiner system for Cambridge A-Level), specifically the five call sites you enumerated: Supervisor routing, Tutor (Socratic), Examiner (explanation-only), SLA (semantic–logical alignment), and Embeddings. The deliverables are: an adjustable cost model, prompt-caching optimization guidance, a model-tiering decision matrix with quality monitoring, token budget management, and a cost monitoring/alerting checklist.

All dollar figures used below are list prices from official pricing docs as of 2026-03-08 (America/Los_Angeles). For OpenAI: gpt-4o ($2.50/M input, $1.25/M cached input, $10/M output), gpt-4o-mini ($0.15/M input, $0.075/M cached input, $0.60/M output), and text-embedding-3-large ($0.13/M tokens). 
1

For Google Gemini (optional tiering reference): Gemini 2.5 Flash (paid tier standard text: $0.30/M input, $2.50/M output) and Gemini 2.5 Flash-Lite ($0.10/M input, $0.40/M output). 
2

A practical risk note: GPT-4o was deprecated inside ChatGPT in February 2026 but remains available via the API, so you should still treat it as potentially subject to future lifecycle changes and keep your tiering and evaluation harness ready to swap in a replacement. 
3

Token and cost model for the Phase 1 MVP
How I translate your architecture into billable events

Your MVP usage assumption is:

1000 DAU
3× AskAI per user per day
1× Marking per user per day

I interpret “AskAI” and “Marking” here as user-initiated jobs. Under your routing design, each job triggers at least one Supervisor call, then the job-specific agent calls.

So monthly job counts (assuming 30 days) are:

AskAI jobs/month = DAU * AskAI_per_DAU_per_day * Days = 1000 * 3 * 30 = 90,000
Marking jobs/month = DAU * Mark_per_DAU_per_day * Days = 1000 * 1 * 30 = 30,000

This is intentionally “event-level”; if a single “AskAI session” actually contains multiple back-and-forth turns, that should be modeled as multiple AskAI jobs, or you add an explicit multiplier for “turns per AskAI session” in the spreadsheet (I include that parameter below).

Baseline token assumptions per call

You provided partial token ranges; the missing piece is mainly conversation-history size and the size of student_state/rubric payloads. For an initial number you can budget against, I recommend starting with a conservative-but-not-worst-case set, then replacing with measured production telemetry.

Below is a reasonable baseline consistent with your prompt descriptions:

Supervisor Agent
Input ≈ 900 tokens (500 system + small history slice + user input), Output ≈ 80 tokens.
Tutor Agent (per AskAI job)
Input ≈ 4500 tokens (800 system + ≈2900 recent-history window + 600 RAG evidence + ≈200 student_state), Output ≈ 350 tokens.
SLA alignment (per Marking job)
Input ≈ 500 tokens, Output ≈ 150 tokens.
Examiner (per Marking job)
Input ≈ 1500 tokens, Output ≈ 600 tokens.
Query embedding (per AskAI job)
Input ≈ 100 tokens.

These are not claims about your system; they are modeling defaults. The spreadsheet makes them editable so you can swap in your real medians/p90.

Prompt caching: what matters for the cost model

OpenAI prompt caching is automatically available for prompts ≥ 1024 tokens, and API responses expose how many prompt tokens were cache hits via usage.prompt_tokens_details.cached_tokens. 
4

Cache hits require an exact repeated prefix match and occur in 128-token increments; the “cacheable prefix” can include messages, tool definitions, and structured schemas. 
5

In the cost model, that translates to an editable CachedFraction per agent (0–1) that determines how much of the input is billed at “cached input” price rather than full input price. For gpt-4o and gpt-4o-mini, cached input is exactly half price in the pricing table. 
1

Monthly API cost estimates under two strategies

The following two scenarios use the baseline token assumptions above, plus a plausible caching profile that you can tighten or loosen:

CachedFraction defaults:
Supervisor: 0.00 (often too short / too variable to reliably exceed 1024 with a stable prefix)
Tutor: 0.85 (good multi-turn prefix reuse if you keep early prompt blocks stable)
SLA: 0.50 (only if the rubric/prefix repeats across many students for the same question)
Examiner: 0.50 (same condition as SLA)
Scenario A: “All GPT-4o” (everything except Embeddings uses gpt-4o)
AskAI cost/job ≈ $0.0130
Marking cost/job ≈ $0.0143
Monthly total ≈ $1,602

If you assume no caching benefit, the same inputs rise to roughly $2,070/month (the delta here is mainly Tutor input tokens, where caching has the most leverage).

Key takeaway: in this architecture, Tutor input tokens dominate, so the biggest single cost lever is “how many tutor-history + evidence tokens you keep per call,” followed by “which model handles the Tutor call.”

(Prices used: gpt-4o input/cached/output from OpenAI pricing docs. 
6
)

Scenario B: Tiered strategy (recommended starting point for MVP)

A realistic tiering that fits your components:

Supervisor: gpt-4o-mini
Tutor: gpt-4o-mini by default, with 15% escalation to gpt-4o for complex cases
SLA: gpt-4o
Examiner: gpt-4o
Query embedding: text-embedding-3-large

Under that mix, with the same baseline tokens and caching profile:

AskAI cost/job (blended) ≈ $0.00220
Marking cost/job ≈ $0.01143
Monthly total ≈ $541

Sensitivity to how often Tutor escalates to gpt-4o (monthly total, holding everything else constant):

0% escalation → ~$414/month
10% escalation → ~$499/month
20% escalation → ~$583/month
30% escalation → ~$667/month

This shows why, operationally, you should treat “% of tutor calls escalated” as a first-class monitored KPI.

(Prices used: gpt-4o and gpt-4o-mini and embedding prices from OpenAI docs. 
1
)

Spreadsheet-style cost model template

Below is a “copy into Google Sheets / Excel” layout. The idea is: you edit the Value column; everything else is formulas.

Inputs tab
csv
复制
Section,Name,Value,Unit,Notes
Traffic,DAU,1000,users/day,
Traffic,DaysPerMonth,30,days,
Traffic,AskAI_per_DAU_per_day,3,jobs/user/day,
Traffic,Mark_per_DAU_per_day,1,jobs/user/day,

TokenAssumptions,Tok_Supervisor_in,900,tokens/call,
TokenAssumptions,Tok_Supervisor_out,80,tokens/call,
TokenAssumptions,Tok_Tutor_in,4500,tokens/call,Includes system+history+RAG+student_state
TokenAssumptions,Tok_Tutor_out,350,tokens/call,
TokenAssumptions,Tok_SLA_in,500,tokens/call,
TokenAssumptions,Tok_SLA_out,150,tokens/call,
TokenAssumptions,Tok_Examiner_in,1500,tokens/call,
TokenAssumptions,Tok_Examiner_out,600,tokens/call,
TokenAssumptions,Tok_EmbedQuery_in,100,tokens/call,

Caching,CachedFrac_Supervisor,0.00,fraction,0..1
Caching,CachedFrac_Tutor,0.85,fraction,0..1
Caching,CachedFrac_SLA,0.50,fraction,0..1
Caching,CachedFrac_Examiner,0.50,fraction,0..1

Prices_OpenAI,Price_4o_in_perM,2.50,USD/1M tok,
Prices_OpenAI,Price_4o_cached_in_perM,1.25,USD/1M tok,
Prices_OpenAI,Price_4o_out_perM,10.00,USD/1M tok,
Prices_OpenAI,Price_4omini_in_perM,0.15,USD/1M tok,
Prices_OpenAI,Price_4omini_cached_in_perM,0.075,USD/1M tok,
Prices_OpenAI,Price_4omini_out_perM,0.60,USD/1M tok,
Prices_OpenAI,Price_embed3L_in_perM,0.13,USD/1M tok,

Tiering,Tutor_EscalateShare_4o,0.15,fraction,0..1 (rest uses mini)


Default OpenAI prices and cached prices here match current published pricing. 
1

Calc tab formulas

Assume you convert the Inputs into named ranges (recommended). Then:

Helper formulas

AskAI_jobs_month = DAU * AskAI_per_DAU_per_day * DaysPerMonth
Mark_jobs_month = DAU * Mark_per_DAU_per_day * DaysPerMonth

Per-call cost function (write per agent/model as a cell formula)

Cost_call(model) = Tok_in/1e6 * ( (1-CachedFrac)*Price_in_perM + CachedFrac*Price_cached_in_perM ) + Tok_out/1e6 * Price_out_perM

Scenario A: all gpt-4o

Cost_AskAI_A = Cost(Supervisor as 4o) + Cost(Tutor as 4o) + Tok_EmbedQuery_in/1e6*Price_embed3L_in_perM
Cost_Mark_A = Cost(Supervisor as 4o) + Cost(SLA as 4o) + Cost(Examiner as 4o)
Monthly_A = AskAI_jobs_month*Cost_AskAI_A + Mark_jobs_month*Cost_Mark_A

Scenario B: tiered

Cost_AskAI_B = Cost(Supervisor as 4o-mini) + Tok_EmbedQuery_in/1e6*Price_embed3L_in_perM + (1-Tutor_EscalateShare_4o)*Cost(Tutor as 4o-mini) + Tutor_EscalateShare_4o*Cost(Tutor as 4o)
Cost_Mark_B = Cost(Supervisor as 4o-mini) + Cost(SLA as 4o) + Cost(Examiner as 4o)
Monthly_B = AskAI_jobs_month*Cost_AskAI_B + Mark_jobs_month*Cost_Mark_B

What you should measure ASAP in MVP telemetry to replace assumptions:

median and p90 of Tok_Tutor_in (history + RAG dominate),
Tutor_EscalateShare_4o,
actual CachedFrac_Tutor from cached_tokens / prompt_tokens. 
4
Prompt caching optimization guide
OpenAI Prompt Caching mechanics that your design must respect

Your caching strategy should be built around four concrete properties:

Caching applies when prompts are ≥ 1024 tokens, and the API exposes cache hit counts (cached tokens) in usage metadata. 
4
Cache hits require an exact repeated prefix, and hits occur in 128-token increments. 
5
The cacheable prefix can include “the whole request prefix” such as messages, tool definitions, and structured output schemas. 
5
For gpt-4o and gpt-4o-mini, cached input tokens are billed at the published “cached input” rate (half the full input rate in today’s pricing tables). 
1

Engineering implication: you do not “turn caching on.” You stabilize the earliest tokens and minimize churn in the prefix, so consecutive calls reuse a large identical prefix.

System prompt structuring to maximize cache hit rates

For your agents, design each request’s tokens in layered blocks:

Never-changing “foundation” block (highest leverage)

System prompt core policy (Socratic tutor rules, safety rules, marking explanation style guide)
JSON schema / structured output constraints (especially for Supervisor and SLA)
Tool definitions (if using tools/function calling)
Keep this block byte-for-byte stable across calls.

Slow-changing “session state” block

Course/subject selection, exam board configuration, student profile (grade target, common errors)
A session summary that only refreshes every N turns (not every turn)

Fast-changing “turn payload” block (lowest caching leverage)

Latest user message
RAG evidence (changes nearly every query)
Highly volatile “student_state” fields (live mastery estimates, last-step trackers)

Because caching is prefix-based, a volatile field placed earlier poisons the cacheability of everything after it. With OpenAI’s “exact prefix match” requirement, even small changes early can wipe out most of your cached fraction. 
5

Tutor multi-turn: message organization that is most cache-friendly

For the Tutor Agent, you want the prompt to evolve like an append-only log:

Keep the initial system/developer messages stable.
Keep old conversation messages unchanged and in a fixed order.
Only append new messages at the end.

This pattern maximizes the identical prefix between turn t and turn t+1, which is exactly what OpenAI caching rewards. 
5

Two tactical rules matter in practice:

Don’t rewrite earlier messages (including earlier summaries) every turn. If you refresh a long summary message at the beginning each time, you destroy the prefix match and your cached fraction collapses.
Push volatile context to the end. If student_state must update every turn, place it as late as possible (ideally right before the latest user message), so you still cache system + most history.

A workable pattern for Tutor input ordering is:

System(static)
Developer(static tutoring/format rules)
Tool definitions / schemas (static)
Conversation history window (stable across turns except appended tail)
Session summary (updated infrequently)
RAG evidence (dynamic)
student_state (dynamic)
Latest user message (dynamic)

Even though RAG and student_state are dynamic, keeping them near the end preserves caching for the largest static blocks.

Claude cache_control and breakpoints comparison

If you consider using Claude for specific workloads or as a benchmarking baseline, caching is more explicit and has different economics:

Claude supports both automatic caching and block-level cache breakpoints using cache_control. The “automatic cache breakpoint” moves forward as a conversation grows, caching up to the last cacheable block. 
7
Claude’s docs describe default 5-minute TTL for automatic caching and an optional 1-hour TTL (at higher write cost). 
7
There is a limit of 4 breakpoint slots when combining automatic and explicit caching; exceeding this yields API errors. 
7
Claude’s pricing model splits “cache write” and “cache read” with multipliers: e.g., 5-minute cache writes at 1.25× base input, 1-hour writes at 2×, and cache reads at 0.1× base input. 
7
Claude’s cache-prefix ordering is documented as tools → system → messages, which matters for how you should structure prompts. 
7

Practical comparison (what matters for CIE-Copilot):

OpenAI: caching is automatic and billed via “cached input tokens” at the model’s cached rate; you optimize by stabilizing the prefix. 
4
Claude: you often think in which blocks are worth caching and how TTL/write/read trade off; you also must manage breakpoint limits if you want fine-grained caching. 
7
Model tiering decision matrix and quality monitoring
Tiering recommendations by call site

The table below is a practical starting matrix for MVP. The “Why” column reflects both cost sensitivity and failure impact.

Component	Default model	When to downgrade	When to upgrade/escalate	Why
Supervisor (routing)	gpt-4o-mini	Almost always	Escalate only if routing uncertainty is high and misroute is costly	Routing is classification+JSON; cheap models usually suffice; enforce strict JSON schema and low max output tokens.
Tutor (Socratic teaching)	gpt-4o-mini	For concept checks, short hints, “next question” scaffolding	Escalate to gpt-4o when: multi-step reasoning, student confusion persists, or safety/policy-sensitive content	Tutor is high-volume and token-heavy; you need an escalation mechanism rather than paying frontier cost always.
SLA alignment	gpt-4o (or a strong reasoning model)	Only if your offline eval shows mini is stable on your rubric taxonomy	Escalate on low-confidence alignments or rubric-edge cases	Misalignment corrupts scoring explanations; this is a “correctness-critical” step.
Examiner explanation	gpt-4o	Potentially mini for very short rubric items where explanation is templated	Escalate on long solutions, ambiguous steps, or student appeals	Even with SymPy deciding correctness, the narrative explanation is user-facing and trust-critical.
Embeddings	text-embedding-3-large	Consider smaller embedding model if retrieval quality holds	—	Embedding cost is usually minor relative to generation, but retrieval quality has strong downstream effects.

OpenAI model prices used for the above cost rationale are from published pricing pages. 
1

Optional cross-vendor tier: Gemini Flash(-Lite)

If you want a second “fast cheap text model” tier, Gemini 2.5 Flash-Lite is priced lower than gpt-4o-mini on both input and output in the current Google pricing table for standard text. 
2

My opinionated engineering guidance: only add this in MVP if you already have (a) strong evaluation automation and (b) an abstraction layer that normalizes JSON-formatting, safety behavior, and tool-calling differences. Otherwise, the integration complexity can erase the incremental cost savings.

Online quality monitoring for tiering regressions

To detect quality drop after downgrades, you need a combination of product metrics, automated graders, and shadow comparisons:

Shadow evaluation (most reliable early on)
For a small sampled fraction (e.g., 1–5%), run both the cheap model and the “gold” model (gpt-4o) and compare:

For Supervisor: intent accuracy + agent selection agreement
For Tutor: rubric of pedagogical quality (clarity, correctness, Socratic style adherence)
For Examiner: “explanation consistency” with SymPy verdict + rubric points

Online proxy metrics (cheap and continuous)

Student follow-up rate: if downgraded answers cause confusion, you’ll see shorter time-to-next-question and more “what do you mean” clarifications.
Self-contradiction / format violations: JSON parse failures for Supervisor/SLA; rubric-point mismatches for Examiner.
Resolution rate: fraction of AskAI jobs that end without escalation/appeal.
Latency vs tokens: spikes in tokens per job often correlate with “model struggling” loops.

Guardrail checks tailored to your system

Examiner must not contradict SymPy outcome (hard check).
SLA output must map steps to valid rubric node IDs (hard check).
Tutor must not provide direct final answers if your pedagogy forbids it (policy check).

Operationally, tie escalation to measurable uncertainty signals (see next).

A concrete escalation policy that’s easy to implement

A simple tiering controller for Tutor/SLA can work like this:

Start with mini.
Compute lightweight signals:
Parseability (structured output validity)
Confidence proxy (model self-rated confidence in constrained range, or a small judge model)
“Student stuck” indicator (N repeated attempts, same misconception tag)
Escalate to gpt-4o when any signal crosses a threshold.

The key is that escalation must be cheap to decide; otherwise you spend the savings on the controller itself.

Token budget management blueprint
RAG evidence truncation under a hard token budget

Because Tutor input is typically the biggest cost driver, you want a deterministic allocator:

Set a per-job total input budget, B_in.
Reserve fixed budgets for non-evidence blocks:
B_sys (system + tools + schemas)
B_hist (recent dialogue window)
B_state (student_state)
B_user (latest user input)
Evidence budget is remainder:
B_rag = max(0, B_in - (B_sys + B_hist + B_state + B_user))
Select evidence chunks by relevance score, but pack them by token length until B_rag is reached.

Two refinements that are worth it:

Diversity constraint: avoid spending the entire evidence budget on near-duplicate chunks (same source/section). This typically improves answer faithfulness more than adding one more redundant chunk.
Adaptive chunk compression: when B_rag is small, summarize top chunks using a cheap model, then include summaries instead of raw text (this is often a net win if you keep summaries stable for caching).
Conversation history strategy that doesn’t destroy caching

You generally have three options, in ascending order of effectiveness for cost control:

Rolling window only: keep last N turns; drop earlier.
Rolling window + infrequent summary: maintain a summary that updates every N turns or only when nearing a budget threshold.
Hierarchical memory: stable long-term profile + medium-term summary + short-term verbatim window.

Caching interaction: frequent edits to an early “summary” message breaks prefix matching. Because OpenAI caching depends on an exact prefix, a summary that changes every turn can reduce your effective CachedFraction dramatically. 
5

So, if you use summaries, update them infrequently (e.g., every 5–10 turns), and accept one cache miss at refresh time in exchange for lower overall prompt size.

Per-job token budgets in a job envelope and worker enforcement

Your proposed “Job envelope” with token_budget is the right abstraction. Make it explicit and enforceable:

token_budget.input_max
token_budget.output_max
token_budget.reserved.system
token_budget.reserved.history
token_budget.reserved.rag
token_budget.reserved.state

Worker-layer enforcement should be deterministic:

Compute token counts before the call (using your tokenizer).
If over budget, truncate in this order:
drop lowest-ranked RAG chunks first
shrink history window (drop oldest turns)
compress state (remove rarely used fields / replace with compact tags)
Set model max_output_tokens = token_budget.output_max.

Then record both:

pre-truncation tokens (what would have been sent)
post-truncation tokens (what you actually sent)

This gives you a clean signal of when budgets are binding and whether the user experience is being impacted.

Cost monitoring and alerting checklist
Metrics to track (minimum viable FinOps for LLM apps)

At minimum, log these dimensions on every job:

user_id, job_id, agent (Supervisor/Tutor/SLA/Examiner), model
prompt_tokens, completion_tokens, and total_tokens
cached_tokens (OpenAI) and derived cache_hit_rate = cached_tokens / prompt_tokens 
4
latency_ms (end-to-end + model time if you can)
escalated (boolean) and escalation_reason
rag_chunks_included, rag_tokens_included
history_turns_included, history_tokens_included

From this, build daily aggregates:

Cost/DAU, cost/job by type (AskAI vs Marking)
Tokens/job p50/p90/p99 by agent
Cache hit rate by agent/model (especially Tutor)
Escalation rate (Tutor mini → 4o, SLA mini → 4o if you allow it)
Top users by cost (to detect abuse or edge-case loops)
Cost anomaly alerts (concrete triggers)

Because you mentioned “single user 10 minutes > 100K tokens,” here’s an actionable set:

Per-user spike: tokens(user, 10min) > 100,000 → page/notify (probable runaway loop or abuse).
Per-job runaway: total_tokens(job) > input_max + output_max + margin → error + quarantine the job; store payload for debugging.
Cache collapse: cache_hit_rate(Tutor) drops by > X% day-over-day → investigate prompt changes that broke prefix stability.
Escalation surge: Tutor_EscalateShare_4o exceeds budgeted threshold (e.g., +50% over trailing 7-day baseline) → investigate curriculum topics causing failures, or regressions in mini prompt.
RAG bloat: rag_tokens_included p90 increases sharply → investigate retriever returning longer chunks or too many chunks.
Marking cost drift: Examiner output tokens rising (p90) → cap output tokens and enforce more structured explanation templates.

A final engineering point: alerts should route to a “debug bundle” that includes the tokenized prompt sizes per block (system/history/RAG/state/user). If you only alert on totals, you lose the information needed to fix the root cause quickly.

(Where “cache hit rate” is not guesswork—OpenAI provides cached token counts in the response usage fields. 
4
)
