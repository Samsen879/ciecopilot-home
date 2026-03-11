# 选题14-DS-ChatGPT

- 原始报告标题：Deep Research on Embedding, LaTeX, and Hybrid Retrieval Choices for CIE-Copilot
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:08:29.112Z

Deep Research on Embedding, LaTeX, and Hybrid Retrieval Choices for CIE-Copilot
Executive context and hard constraints

CIE-Copilot is a syllabus-aware Hybrid RAG system for Cambridge A-Level Mathematics (9709) where retrieval must be both topic-scoped (syllabus node subtree filtering) and math-sensitive (LaTeX formulas, symbol-heavy text, and terminology exactness). Your current architecture choices—pgvector cosine dense search + PostgreSQL full-text keyword search (tsvector/ts_rank_cd) fused via weighted rank fusion—are directionally aligned with research on hybrid retrieval (lexical + semantic fusion) being complementary, especially when lexical precision matters. 
1

Two hard constraints shape the embedding/model decision space:

The indexing dimension limit is real for pgvector ANN indexes. For pgvector v0.7.0+, the maximum indexed dimensions are 2,000 for vector and 4,000 for halfvec (with higher limits for bit and different constraints for sparsevec). 
2

This means any “native 3072d+” embedding model either needs (a) dimension reduction (MRL-aware or not), or (b) a type migration to halfvec (if you want to index 3072d without truncation). 
2

Your topic scoping approach using ltree operators is well-supported: ltree is designed for hierarchical labels and provides operators for ancestor/descendant subtree filtering. 
3

Candidate embedding models and what matters for A-Level math retrieval
What “good” looks like in this domain

A-Level 9709 retrieval has three distinct query modes that stress different mechanisms:

Symbol/formula exactness: queries like \int x\sin x\, dx are brittle to paraphrase and require either near-exact string/formula matching or a representation that preserves structure.

Conceptual intent: “When should I use integration by parts?” requires semantic matching across varied phrasings and instructional text.

Misconception targeting: “Why do we add constant C?” typically maps to misconception chunks; semantic retrieval and/or lexical cues (“constant of integration”, “+C”) both help.

Given that, the most useful comparison frame is:

(a) multilingual & code-switch robustness, (b) robustness to LaTeX-heavy tokens, (c) ability to fit your pgvector constraints, (d) cost/ops fit, (e) public benchmark signals as proxies (not replacements) for your in-domain benchmark.

Cross-model comparison table with proxy benchmark signals

The benchmark numbers below are public proxies (MTEB English average and MIRACL multilingual retrieval) that correlate with retrieval quality but are not A-Level-math-specific. You should still run your own 9709 benchmark (designed later in this report).

Model (candidate list)	Default dims / adjustable dims	Index compatibility with pgvector HNSW	Multilingual signal (proxy)	English signal (proxy)	Notable strengths / risks for math RAG
OpenAI text-embedding-3-large	3072 default; supports dimensions shortening 
4
	OK at 1536 (your current); cannot HNSW-index 3072 in vector (needs truncation or halfvec) 
2
	MIRACL avg 54.9 (OpenAI report) 
5
	MTEB avg 64.6 (OpenAI report) 
5
	Built-in shortening is designed for minimal quality loss (MRL-style). Strong general retrieval; LaTeX brittleness remains unless you fix preprocessing. 
5

OpenAI text-embedding-3-small	1536 default; can be shortened 
4
	OK in vector(1536); can shorten further	MIRACL avg 44.0 
5
	MTEB avg 62.3 
5
	Often “good enough” for semantic queries; cheaper. But math formula precision still depends heavily on lexical layer. 
5

Cohere embed-multilingual-v3.0	1024 dims; context length 512 
6
	OK in vector(1024)	Proxy MTEB (English) 64.0 for Cohere multilingual model in mE5 report 
7
	Same as prior column	Good multilingual baseline, but short context length may matter if you ever embed longer “merged” chunks. 
6

Voyage voyage-3 / voyage-3-large	voyage-3: 1024; voyage-3-large: 1024 (supports 256/512/1024/2048 for some models) 
8
	OK at 1024; 2048 may exceed vector index limit if >2000; 1024 safe 
2
	Multilingual marketed; use own evaluation; pricing via Atlas shows voyage-3-large listed as older with $0.18/1M tokens 
9
	Not directly provided for Voyage-3 in sources above	Long context (32k) is a differentiator if you ever move to big-chunk or contextualized-chunk schemes. 
8

Google text-embedding-004	768 dims (legacy Google embeddings are 768d class) 
10
	OK in vector(768)	Google has deprecated/transitioned many users to gemini-embedding-001; treat as legacy path 
11
	—	The main risk is lifecycle churn and forced migration (dimension mismatches 768→3072 are common in practice). 
11

Google gemini-embedding-001 (practical successor)	3072 default; supports output dimensionality control 
10
	Needs truncation to ≤2000 for vector indexing, or halfvec to index 3072 
2
	Supports 100+ languages; priced $0.15/1M tokens 
12
	—	Strong vendor option, but dimension + operational migration complexity is non-trivial. 
10

BAAI bge-m3	1024 dims; up to 8192 tokens; supports dense+sparse+ColBERT modes 
13
	OK in vector(1024) and fits pgvector well	MIRACL avg 70.0 nDCG@10 (All modes) / Dense 67.8 
14
	Not focused on MTEB reporting, but strong multilingual and hybrid story	Only model in your list that natively unifies dense, lexical-weighting, and multi-vector signals; best aligned with hybrid retrieval philosophy—but multi-vector is expensive in Postgres. 
13

multilingual-e5-large-instruct	1024 dims (XLM-R large family) 
7
	OK in vector(1024)	MIRACL avg 65.7–66.5 nDCG@10 depending on variant; strong multilingual retrieval 
7
	MTEB English avg 64.4 (best mE5 in report) 
7
	Very strong open-weight multilingual retrieval model; a top “open-source + multilingual” candidate for code-switch queries. 
7

e5-mistral-7b-instruct	4096 embedding size 
15
	Not indexable in pgvector vector or halfvec (4096 > 4000). Would require dimensionality reduction without native MRL. 
2
	Multilingual exists but weaker on low-resource languages (paper notes limits) 
16
	MTEB avg 66.6 (E5 “full data” condition) 
16
	Very strong English embedding quality, but your vector DB indexing constraint makes it an awkward fit unless you adopt learned compression or switch infra. 
16

SciBERT / SPECTER2 / MathBERT	Typically 768-class encoders (BERT family)	Indexable	Not multilingual	Domain-specific (scientific papers / math education), but not plug-and-play sentence embedding retrievers without fine-tuning	Use as backbones or fine-tune targets, not as immediate drop-in embedding model for hybrid RAG. (SPECTER2 is specialized for scientific documents and uses task adapters.) 
17

Key takeaway from proxy signals: if multilingual code-switch retrieval is strategically important in Southeast Asia classrooms, bge-m3 and multilingual-e5-large-instruct are the strongest open-weight candidates; OpenAI Embedding v3 is strong overall but its MIRACL proxy is materially lower than those multilingual specialists. 
14

Benchmark design for an A-Level 9709 math retrieval evaluation set

You asked for a 50+ query benchmark with 3–5 relevant chunks each, scoring Recall@5, nDCG@10, and MRR. Below is a design that is both engineering-friendly (fits your Supabase/Postgres pipeline) and scientifically interpretable.

Dataset structure

Use a small JSONL or Parquet schema with explicit IDs so you can rank against your existing knowledge_chunks rows:

query_id: stable string
query_text_raw: original user query
query_type: enum {formula_exact, concept, misconception, code_switch}
language_mix: enum {en, zh, mixed}
topic_path: the syllabus node for your ltree constraint (important because your production retrieval always filters)
ground_truth_chunk_ids: list of 3–5 chunk IDs (your DB primary keys)
optional: notes (why those chunks are relevant; useful for adjudication)
Query composition

You want coverage across your typical traffic. A balanced 60-query set works well operationally:

20 formula-heavy queries: include integrals, derivatives, trig identities, series notations; vary formatting (\sin x vs \sin(x)), whitespace, and equivalent forms.
15 concept queries: “when to use …”, “difference between …”, “how to choose method …”.
15 misconception queries: constant of integration, sign errors, limits, misusing rules.
10 code-switch queries: mix Chinese question with English math terms or LaTeX.
Annotation protocol

To keep the benchmark reproducible:

Use double annotation for at least 20% of queries and resolve disagreements with a minimal adjudication pass. This improves label quality and reduces “evaluation noise” (especially for misconception explanations where multiple chunks may be acceptable).

Define relevance as: “This chunk alone would materially help answer the query correctly,” which is closer to tutoring UX than strict topical overlap.

Metrics and why they fit

Recall@5 is your top target because you care if the correct material is available to the generation step within 5 items.

nDCG@10 captures ranking quality beyond binary inclusion and is widely used in multilingual retrieval benchmarks (including MIRACL and many retrieval papers). 
14

MRR emphasizes how early the first truly relevant chunk appears, which aligns with latency/cost control since you often pass only top-k to downstream reasoning.

How to evaluate “models” fairly in your hybrid pipeline

A critical nuance: you don’t just swap embeddings—you have a hybrid fusion plus topic_path filter.

So run three runs per model, all within the same ltree filter:

Dense-only: pgvector similarity only.

Keyword-only: ts_rank_cd only (and optionally a trigram formula field; see later).

Production-hybrid: weighted fusion (your current default w_key>w_sem).

This lets you attribute gains correctly. In math-heavy corpora, many “embedding improvements” are actually “lexical handling improvements” (especially for formulas).

LaTeX tokenization and preprocessing
Why generic BPE tokenization struggles with LaTeX

Most modern embedding models ultimately rely on subword tokenization, often BPE variants. BPE is designed to be lossless and to handle arbitrary text, but its merges are learned from training corpora; for out-of-distribution strings (like LaTeX macros and symbol-heavy sequences), tokenization can fragment into pieces that do not align with mathematical semantics. 
18

Concretely, LaTeX includes:

Backslash macros (\frac, \int)

Braces {}, superscripts ^, subscripts _

Tightly packed symbol sequences (x^{2n+1}, \int_0^1)

BPE can represent these, but not necessarily in a way that makes “structural similarity” easy for a dense encoder to learn, unless the model was trained heavily on math markup.

This is why the math IR community repeatedly highlights that formula representations are inherently hierarchical (layout trees / operator trees), and that tree- or structure-aware tokenization can be important for formula similarity. 
19

How serious is the impact?

For your system, the impact is highest for formula-only queries where string-level structure is the intent signal.

A major empirical pattern in formula IR is that structure-based formula methods and lexical matching remain highly competitive, and dense bi-encoders are often complementary rather than sufficient alone. 
20

This matches your current product choice to overweight keyword matching for math.

Recommended LaTeX preprocessing strategy for CIE-Copilot

You should not “convert all LaTeX to natural language” globally, because you will lose exactness and introduce paraphrase error. Instead, use a multi-field representation:

Keep content_raw: unchanged chunk text with LaTeX for display and downstream reasoning.

Create latex_normalized: deterministic normalization of LaTeX substrings.

Create latex_signature: a lightweight, searchable token string derived from structure-like cues.

A practical normalization pipeline:

Canonical whitespace and braces: normalize \frac {1}{2} → \frac{1}{2}; remove redundant spaces; normalize \,, \! spacing tokens.

Macro normalization: map common equivalents (\dfrac → \frac, \cdot and \times optionally both retained as tokens).

Function normalization: normalize \sin x → \sin(x) (or the reverse), consistently.

Number/variable normalization (optional): You can preserve variables but normalize numerical formatting (e.g., 0.5 vs \frac{1}{2} is tricky—do not force equivalence unless you can reliably parse).

For latex_signature, aim for tokens like: INT _ 0 ^ 1 [x] [SIN] [x] d [x] or an operator-sequence projection.

Why this helps:

Keyword search (tsvector) is designed for natural language lexemes, not symbolic strings. PostgreSQL full-text search is excellent for word-based content, but for LaTeX you want character-level or symbol-level matching. 
21

A trigram index (pg_trgm) is purpose-built for similarity over strings and performs well for “almost the same string” matching, which is exactly what LaTeX formatting variations often are. 
22

So, for formula queries, add an auxiliary retrieval path:

If query contains LaTeX markers (e.g., \, {, }, ^, _), compute trigram similarity against latex_normalized, and rank/fuse it into your keyword channel.

This keeps your production hybrid design philosophy but makes the “keyword” side far more formula-aware than tsvector alone.

Multi-vector and hybrid embedding strategies
Should you embed formula and text separately?

Yes—this is the highest ROI multi-vector idea that remains compatible with Postgres/pgvector.

Implementation sketch:

Extract LaTeX spans from each chunk; embed two views:

Text view: “explanatory prose + minimal formula placeholders”

Formula view: concatenated latex_signature (or normalized LaTeX)

Store two vectors per chunk: embedding_text, embedding_formula (both within ≤2000 dims).

At query time:

If formula-heavy: search embedding_formula strongly + trigram on latex_normalized.

If concept/misconception: search embedding_text strongly + normal keyword search.

Fuse results with weighted RRF (or score blending).

This avoids the row explosion of token-level embeddings and stays compatible with HNSW operators.

Is ColBERT late interaction suitable here?

ColBERT’s core idea is late interaction: represent documents as multiple contextual token vectors and score query-document relevance via token-level MaxSim aggregation. This is widely effective for fine-grained matching. 
23

However, ColBERT-style retrieval is not natively compatible with pgvector HNSW, because pgvector indexes a single fixed-length vector per row (or at least does not implement the MaxSim over token vectors as an index operator).

If you want ColBERT benefits without abandoning Postgres, the realistic pattern is:

Use single-vector retrieval (dense + lexical) to fetch top-N

Re-rank top-N in the application layer using a ColBERT scorer (or a cross-encoder reranker)

This matches how multi-stage retrieval systems often work, and BGE-M3’s own guidance notes that multi-vector methods are heavier, recommending retrieving candidates via dense/sparse then reranking with integrated scoring. 
24

Dual-encoder “formula model + text model” feasibility

This is feasible but only if you keep the approach operationally simple:

Text embedding model: text-embedding-3-large (1536) or multilingual-e5-large-instruct (1024) for conceptual + multilingual queries. 
5

Formula embedding model: consider formula-specialized approaches (e.g., Tangent-CFT) if and only if your benchmark shows dense retrieval failing badly on formula similarity. Tangent-CFT explicitly targets formula embedding using structural representations (layout/operator trees). 
19

In practice for A-Level content, a simpler combo often wins:

Normalized LaTeX + trigram/BM25-style matching handles most exactness

Text embeddings handle conceptual/misconception matching

Only add formula embeddings if the benchmark shows persistent misses that lexical cannot cover (e.g., equivalence of algebraic forms with different surface strings).

MRL shortening and dimensionality trade-offs
What OpenAI’s shortening actually claims

OpenAI’s embedding v3 announcement states both models support shortening by passing a dimensions parameter, and gives an example: text-embedding-3-large shortened to 256 can still outperform unshortened text-embedding-ada-002 (1536) on MTEB. 
5

OpenAI’s docs also specify default vector lengths: 1536 for text-embedding-3-small and 3072 for text-embedding-3-large, with dimensions available to reduce size. 
4

This “shortenable embeddings” concept is aligned with Matryoshka Representation Learning (MRL), which trains representations so early dimensions capture coarse information and later dimensions add detail. 
25

What we can and cannot conclude about 3072→1536 loss for math retrieval

Public sources do not provide an A-Level-math-specific measurement of “3072 full vs 1536 truncated” for text-embedding-3-large. OpenAI’s public example highlights 256 vs ada-002, not 1536 vs 3072. 
5

However, there are two engineering-relevant implications:

The MRL literature shows truncation can preserve most performance even at large reductions, depending on training. 
25

Your current truncation to 1536 is moderate (50% of 3072), and OpenAI explicitly positions the dimensions mechanism as a cost/performance trade-off. 
5

For your use case, the only defensible way to quantify the loss is:

Run your 9709 benchmark with:

text-embedding-3-large at 3072 (requires halfvec(3072) or a different index strategy) 
2

text-embedding-3-large at 1536 (your current approach)

Optionally at 1024 and 512 to see if the hybrid keyword layer compensates.

A strategic option you may have overlooked: halfvec

If you ever want to test full 3072d embeddings in Postgres ANN, pgvector supports indexing up to 4,000 dims with halfvec (float16). 
2

This would let you compare:

3072d full embeddings in half precision (halfvec(3072))

1536d truncated embeddings in full precision (vector(1536))

The best choice is empirical: half precision can slightly change distances, but it removes truncation. Given your strict P95 latency target, halfvec also reduces storage and can speed builds/IO, but you must validate recall. 
26

Embedding migration cost model and rollback risk

Switching embedding models in a RAG system has two cost centers:

Embedding computation: time + API cost (or GPU inference cost if self-hosted)

Index rebuild + operational risk: HNSW rebuild time, cache warmup, and ranking distribution shift

Token-cost model

Let:

N = number of chunks in knowledge_chunks

T = average input tokens per chunk after preprocessing (including LaTeX normalization text)

Price = $ per 1M tokens for the embedding model

Then the approximate embedding cost is:

Cost ≈ (N × T / 1,000,000) × Price

For reference pricing (as of sources used):

OpenAI text-embedding-3-large: $0.13 per 1M tokens 
27

OpenAI text-embedding-3-small: $0.02 per 1M tokens 
5

Google gemini-embedding-001: $0.15 per 1M tokens 
12

Voyage voyage-4: $0.06 per 1M tokens; Voyage voyage-3-large (older) $0.18 per 1M tokens (Atlas Embedding API pricing table) 
9

Without your concrete N and T, only scenario examples are possible. For example, if N=200,000 chunks and T=200 tokens average:

Total tokens = 40M tokens

OpenAI large cost ≈ 40 × $0.13 = $5.20

Google gemini cost ≈ 40 × $0.15 = $6.00

This shows that for typical chunk sizes, API embedding cost often isn’t the dominant expense; engineering time and risk are.

Rollback-safe migration plan

The safest migration pattern is dual-write / shadow index:

Add new columns: embedding_v2, embedding_model_id_v2, embedding_version

Backfill embeddings in batches, leaving the old index live

Build the new HNSW index concurrently (or in a separate table) and validate retrieval metrics against your benchmark

A/B test by traffic slice and monitor:

Recall@5 on labeled eval traffic (or shadow logging)

P95 retrieval latency in production

Only once stable, flip the serving flag and optionally retire the old index.

This approach also supports fast rollback: switch the flag back to the old embedding column.

Final recommendations
What to do immediately

Lock in your 9709 benchmark and integrate it into CI. Your system has unusually strong constraints (LaTeX + bilingual + misconception targeting + ltree scoping), so public benchmarks are necessary but insufficient.

Implement LaTeX-aware lexical retrieval augmentation:

Add latex_normalized and a pg_trgm index for formula similarity search. PostgreSQL’s pg_trgm is explicitly designed for trigram-based string similarity and indexing. 
22

Use it as part of the keyword channel for formula queries; keep Weighted RRF but make “keyword” actually formula-capable.

Embedding model selection guidance

Primary recommendation (lowest risk, aligned with current PRD): keep text-embedding-3-large with dimensions=1536 while you improve LaTeX handling and establish the benchmark. This model’s default 3072 dims and shortening support are first-class in OpenAI’s docs, and its MTEB/MIRACL proxy scores are strong enough that your largest current gaps are likely LaTeX lexical handling rather than pure semantic embedding quality. 
4

Strong open-weight alternative for multilingual classrooms: add multilingual-e5-large-instruct as a contender in your benchmark. It hits MTEB 64.4 and MIRACL ~65.7–66.5 in its technical report, and it fits comfortably in vector(1024). 
7

If you decide to double down on hybrid retrieval as a first-class capability: consider bge-m3 as a strategic model, especially if you may later move to a retrieval stack that supports multi-vector reranking (or you plan to do application-layer reranking). Its MIRACL performance is extremely strong (avg 70.0 nDCG@10 in “All” mode), and it is explicitly designed for hybrid dense+sparse+multi-vector workflows. 
14

Not recommended under your current pgvector constraint without additional engineering: e5-mistral-7b-instruct is excellent on MTEB (avg 66.6) but emits 4096-d embeddings, exceeding both vector and halfvec indexed limits, forcing a compression strategy that will likely be riskier than the gains. 
16

A realistic “best-of-both” end state

A pragmatically optimal architecture for your domain—while staying within Postgres—is:

Hybrid retrieval with three channels under the same topic_path filter:

Dense semantic (text embedding) for conceptual + misconception queries

Lexical full-text (tsvector) for terminology alignment on prose

Formula lexical (pg_trgm over normalized LaTeX) for exact/near-exact formula matching

Optionally, a fourth channel (dense formula embedding) only if your benchmark shows persistent formula misses after trigram normalization.

This design preserves your latency budget by keeping ANN operations simple, while directly fixing the LaTeX brittleness that general-purpose tokenizers and embeddings are not optimized for. 
21
