# 选题25-DS-ChatGPT

- 原始报告标题：Deep Research Report on Supabase + PostgreSQL Scaling for CIE-Copilot
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:16:03.314Z

Deep Research Report on Supabase + PostgreSQL Scaling for CIE-Copilot

This report evaluates the main technical risks and optimization levers for CIE-Copilot (a Supabase-based education AI system) as it scales from ~500 DAU to ~5,000 DAU and eventually to institutional 1,000+ concurrent usage. I focus on the interaction between Row Level Security (RLS), your hybrid_search RPC (Dense + Keyword + ltree boundary + RRF), Supabase’s connection pooler (Supavisor), and the pgvector roadmap (including halfvec, HNSW filtering, and why pgvectorscale is a different class of dependency). Where possible, I anchor conclusions to vendor docs and upstream PostgreSQL/pgvector references.

RLS impact on hybrid_search correctness, query planning, and latency
How RLS changes execution semantics and why it can become a performance multiplier

In PostgreSQL, RLS policy expressions are evaluated for each row “prior to any conditions or functions coming from the user’s query” (with limited exceptions for leakproof functions). This is the fundamental reason RLS can be either “almost free” (simple, indexed predicates with constant values) or catastrophic (row-by-row function calls, joins, or subqueries inside policy expressions).

PostgreSQL itself explicitly notes the best-performing RLS pattern is when policy expressions only consider the current row values; cross-row/table checks are possible, but can introduce race/perf issues and heavier locking. This matters to you because hybrid retrieval queries often touch many candidate rows before narrowing to Top‑N (especially keyword search and any “over-filtering” vector scan behavior).

Benchmarks you can use as realistic reference points

Supabase published concrete RLS performance benchmarks on a 100K-row table (plus some cases with a join table). These results are particularly relevant because your initial expected size is also ~100K knowledge_chunks.

Key benchmark takeaways (100K-row table; times as reported by Supabase):

Pattern / Fix	Before	After	Why it changed
auth.uid() = user_id + add B-tree index on user_id	171ms	<0.1ms	Index makes the RLS predicate cheap and selective
auth.uid() = user_id → (select auth.uid()) = user_id	179ms	9ms	(select …) encourages an initPlan, so auth.uid() can be computed once per statement, not per row
Join-based admin check (RLS referencing another table) → wrap function in (select …)	11,000ms	7ms	Prevents repeated evaluation / poor join strategy under RLS
Role check function (security definer) without (select …) → with (select …)	178,000ms	12ms	Extreme example of row-by-row policy evaluation overhead

These numbers are not “universal truths,” but they are strong evidence that policy shape (and whether the planner can treat values as constants) can dominate latency by 4–5 orders of magnitude in the worst case.

Will RLS “break” your best index paths for HNSW + GIST + GIN?

It can, but usually indirectly.

Direct effect: RLS adds additional quals; those quals can still be indexable if they’re sargable and match an index (e.g., user_id = constant). Supabase’s guidance explicitly recommends indexing columns used in RLS predicates and shows >100× improvements.

Indirect effect (common in hybrid search):

If you only rely on RLS for filtering and your query text doesn’t contain the same predicate, the planner can end up with worse plans. Supabase explicitly recommends duplicating the filter in the query (even if redundant with RLS) to help Postgres pick better plans.
For pgvector ANN indexes (HNSW/IVFFlat), filters are applied after scanning the ANN index, which can cause “too few results returned” under selective filters. Supabase warns that naive filtered ANN queries may return fewer rows than requested and recommends iterative search to continue scanning until enough matches are found. This is structurally similar to what happens when RLS adds an implicit filter: it increases effective filter selectivity.

Given your function combines:

vector ANN (HNSW),
keyword search (GIN on tsvector),
boundary filter (ltree),
then fuses with RRF,

the likely performance failure mode is not “RLS disables indexes,” but rather:

RLS adds a filter that increases selectivity,
ANN scan returns insufficient in-scope candidates (or scans far more tuples to compensate),
keyword branch may still scan widely depending on query_text distribution,
the fusion step has less to fuse or more work per candidate than expected.
The SECURITY DEFINER wrinkle in your current function signature

Your provided RPC is declared SECURITY DEFINER. In PostgreSQL, SECURITY DEFINER means the function executes with privileges of the owning role; SECURITY INVOKER (default) executes with privileges of the caller.

This is not just about permissions—it’s also about whether RLS is applied. Table owners bypass RLS by default unless FORCE ROW LEVEL SECURITY is enabled. If your function owner is also the table owner (or has BYPASSRLS), then your RPC can silently bypass RLS unless you explicitly force it on underlying tables. Supabase itself flags “security definer view bypasses RLS” as a security concern in its security/performance advisor tooling.

Practical implication for Samsen: If hybrid_search remains SECURITY DEFINER and is callable from the Data API, you have to treat it as a potential data exfiltration surface unless:

the underlying tables are FORCE ROW LEVEL SECURITY, or
the function’s own WHERE clauses fully re-implement access control, or
the function is not exposed (but then it’s not a client-callable RPC).

Supabase also recommends setting search_path defensively for security definer functions.

Is SET LOCAL row_security = off; appropriate inside the function?

Not for the purpose most engineers assume.

PostgreSQL’s row_security GUC does not “turn off RLS filtering.” When set to off, queries fail if they would otherwise be affected by RLS; it’s primarily a safety/debug mechanism (e.g., pg_dump uses it). It also has no effect on roles that bypass RLS (superusers / BYPASSRLS).

So:

If your goal is performance, SET LOCAL row_security = off is not the right tool.
If your goal is to detect unexpected RLS filtering during tests, it can be useful—but you’d use it in staging/benchmark sessions, not prod.

If you truly need to bypass RLS for admin tasks, Supabase’s official mechanism is service-level access (service role key / privileged roles), but it must never be exposed to clients.

Concrete recommendations for your hybrid_search

For your scale targets and schema design, the highest ROI changes are:

Prefer SECURITY INVOKER for client-callable RPCs, unless you can prove (and test) that all access control is enforced elsewhere and RLS is forced where needed. The default semantic is safer.

If you keep SECURITY DEFINER, then explicitly evaluate whether your tables need FORCE ROW LEVEL SECURITY so that table-owner execution still respects RLS.

Wherever RLS policies call auth.uid() / auth.jwt() or helper functions, use the (select …) pattern if the function result is constant per statement. Supabase shows major wins because this enables initPlan caching.

Do not rely only on RLS for query planning. For any tenant/user boundary that is constant during the request, include it explicitly in the query as well. Supabase shows this can materially change query plans and latency.

Treat pgvector filtering as a correctness/performance issue: if RLS or boundary filters are selective, you should plan to use iterative scanning (see pgvector section).

Connection pooling limits and a Python LangGraph worker strategy
What Supavisor is optimizing for

Supabase positions Supavisor as its connection pooler; it supports transaction mode (higher throughput) and session mode (supports prepared statements).

Supavisor’s key published guidance:

Transaction mode is optimal for short-lived queries and high concurrency.
Session mode is needed when you require session semantics like prepared statements.
Connection limits you should design against

On Supabase, the practical ceiling is not just max_connections, but also “pooler max client connections.” Supabase documents both by compute size.

Representative limits (from Supabase docs; exact values vary by tier):

Compute size	Direct max_connections	Pooler max clients (tenant)
Nano	60	200
Micro	60	200
Small	90	500
Medium	120	500
Large	190	1000
XL	250	1500
2XL	350	3000

Interpretation for Samsen: if Year‑3 includes an institution with 1000+ concurrent learners hitting search, you either need to:

move to a compute tier that supports a 1000+ pooler client ceiling,
or introduce strong application-level throttling/caching so DB concurrency stays under those limits,
or shard the workload (multiple projects, read replicas, or architectural changes).
Python worker concurrency: per-process pool is unavoidable, but size must be capped

In a typical multi-process Python deployment, each process has its own memory space; you will not share a single pool across processes. The practical design choice is therefore:

Per-process connection pool, but keep max_size small enough that process_count × max_size cannot blow past Supavisor pooler max clients.

For an agent-worker like “LangGraph Worker” (multi-process + coroutines), I would use:

A small async pool per process (e.g., 2–8 connections), plus
application-level asyncio.Semaphore to bound concurrent DB work (especially vector queries which are CPU/IO heavy in Postgres),
and rely on Supavisor transaction pooling to smooth out spiky concurrency.

This is more stable than “each worker process creates a huge pool,” because Supavisor already multiplexes backend connections; large client pools mostly create queueing and memory pressure, not throughput.

asyncpg + Supavisor transaction mode: the prepared statement trap

asyncpg is fast but historically interacts poorly with PgBouncer-style transaction pooling because prepared statements are not compatible with transaction/statement pooling modes. asyncpg’s own FAQ explains that if you see intermittent “prepared statement … does not exist / already exists” errors, it’s typically because PgBouncer transaction pooling does not support prepared statements, and the workaround is to disable automatic prepared statements via statement_cache_size=0 (or switch to session pooling).

Since Supavisor transaction mode is conceptually similar from the client’s perspective (no stable session affinity), you should assume the same class of failure unless you validate otherwise.

Actionable guidance:

If you use asyncpg against Supavisor transaction pooling: set statement_cache_size=0.
If you depend on prepared statements for performance: use Supavisor session mode (and accept lower multiplexing benefits).
pgvector in Python with asyncio

If you’re not using an ORM and just need vector type adapters, the pgvector Python package explicitly supports asyncpg (and other drivers).

Supabase’s own Python vector convenience layer (vecs) is documented as a synchronous client (vecs.create_client(...) usage). An open feature request notes that vecs does not provide an async client and argues an async client would be important for async frameworks.

Opinionated recommendation: For an async worker architecture, treat vecs as a higher-level convenience tool, not as your core query execution layer. Implement hybrid_search as a DB RPC and call it via an async driver, or query directly using SQL with pgvector adapters.

Does transaction pooling affect HNSW queries?

The vector query itself is not inherently incompatible with transaction pooling. The operational difference is session state:

If you tune HNSW parameters (e.g., hnsw.ef_search, hnsw.iterative_scan) via SET, you should do it inside the transaction, ideally with SET LOCAL, so behavior is deterministic even without session affinity. (pgvector exposes these as settings; see pgvector docs below.)
Avoid temp tables or multi-statement flows that require session stickiness unless you use session pooling.
pgvector feature support and what Supabase Cloud actually gives you
What pgvector version is realistically available on Supabase

Supabase’s “Supabase Postgres” distribution lists extension versions and explicitly shows the vector extension at 0.8.0. Supabase also notes that to access newer extension versions you may need to initiate a software upgrade in infrastructure settings.

Separately, Supabase’s AI docs encourage checking your installed version using SELECT * FROM pg_extension WHERE extname = 'vector'; and upgrading if you’re on an earlier version.

halfvec support status

Supabase’s official “Automatic embeddings” guide uses halfvec(1536) and creates an HNSW index with halfvec_cosine_ops, describing halfvec as a pgvector type storing float values in 16-bit half precision to save space.

Supabase’s “Vector indexes” guide states that in pgvector 0.7.0+, max dimensions are: vector up to 2,000 dims, halfvec up to 4,000 dims, and bit up to 64,000 dims. This is consistent with the halfvec(1536) choice for OpenAI’s 1536‑dim embeddings in their own guide.

Conclusion: halfvec is supported on Supabase Cloud today (provided your project is upgraded to a sufficiently recent pgvector).

Filtered ANN queries and iterative scanning

Supabase warns that when you “naively filter” ANN results (HNSW/IVFFlat) using another column, you may receive fewer rows than requested; they point to iterative search to scan more until the requested number is found.

Upstream pgvector 0.8.0 introduces iterative index scans (via hnsw.iterative_scan / ivfflat.iterative_scan) to prevent “overfiltering,” continuing the scan until enough results are found or thresholds are reached.

For your hybrid_search RPC, this matters because:

Your topic_path <@ topic_path_filter is a filter.
Your RLS policies are implicit filters.
Any additional tenant/org boundaries are filters.

If effective selectivity is high, iterative scan (strict or relaxed order) becomes a correctness tool (ensuring you can reliably return top_n) and also a predictable latency tool (because you can cap scan thresholds).

Is pgvectorscale (DiskANN) available on Supabase Cloud?

pgvectorscale is a separate extension (from Timescale) intended to complement pgvector with DiskANN-style indexing for scaling vector search. Non-Supabase references show it provides a USING diskann (...) index syntax.

However, Supabase Cloud only supports extensions that are packaged/allowed. Supabase’s extensions overview provides a “full list of extensions” available via their platform (plus SQL-only extensions via database.dev). Searching within that official list shows no vectorscale/pgvectorscale entry. The Supabase Postgres distribution’s extension list similarly includes vector but not pgvectorscale.

Conclusion: In standard Supabase Cloud, you should assume pgvectorscale is not available unless Supabase explicitly adds it to the supported extensions set. The absence from both the official extension catalog and the Supabase Postgres build list is strong negative evidence.

Implication: If DiskANN specifically is a hard requirement, you are likely looking at self-hosting Postgres (or choosing a managed provider that packages DiskANN extensions), not just “turning on” a switch in Supabase Cloud.

Cost growth model and storage math for 100K chunks and 5,000 DAU
Supabase plan quotas and overage pricing you should model against

Supabase’s billing doc provides unified quotas for Free vs Pro/Team, including egress, database disk, MAU, etc.

Core items relevant to CIE-Copilot:

Usage item	Free	Pro/Team quota	Overage pricing
Egress	5 GB	250 GB	$0.09 / GB
Database size (disk)	500 MB / project	8 GB / project	$0.125 / GB
Monthly Active Users	50,000	100,000	$0.00325 / MAU
Storage size (Supabase Storage)	1 GB	100 GB	$0.021 / GB-month
Edge function invocations	500,000	2,000,000	$2 / million
Realtime peak connections	200	500	$10 / 1000

Base subscription fees appear in Supabase’s billing examples: Pro is $25 and Team is $599.

Compute costs dominate early—not MAU or disk

Supabase charges compute per project, and Pro includes compute credits that offset some compute. The Storage billing example shows “Compute Hours Micro 744 hours $10” and then “Compute Credits -$10,” bringing the total back to $25 for Pro in that example. This implies Micro compute is effectively covered (up to that credit) for a single always-on project.

Compute add-on prices (monthly) by tier are documented in “Compute and Disk.”

Monthly cost estimate at 5,000 DAU

Since Supabase bills MAU (not DAU), you have to map 5,000 DAU into MAU. Many consumer/education apps see MAU in the range of ~3×–10× DAU depending on retention and usage pattern. I won’t assert a single conversion factor because it’s workload-specific, but even MAU = 50,000 is still within Pro/Team’s 100,000 included quota.

So the most likely monthly cost driver at 5,000 DAU is:

Compute tier (to keep vector search latency stable),
possibly egress if you serve large content payloads (but your current plan is not to store copyrighted raw text and your Top‑N chunks are small),
and secondarily database disk (but your 100K chunk phase is likely far under 8GB).

Below is a practical cost envelope for a single production project:

Scenario	Assumption	Approx monthly
Baseline	Pro + Micro compute (covered by compute credits), within quotas	~$25
Mild scale-up	Pro + Small compute (needs more CPU/RAM for vector + FTS)	~$25 + (Small – credit) = depends on tier pricing
Serious search workload	Pro + Medium/Large compute for stable p95	~$25 + (tier – credit)
Institutional bundle	Team plan to unlock org features + adequate compute	≥$599 + compute

Operational reality: you’ll likely pay for at least two projects (prod + staging). Compute is per project, while quotas are org-wide. So budget should include “number of always-on Postgres instances,” not just app users.

Disk footprint: 100K chunks with vector(1536) and HNSW

Raw vector storage (float32):

vector(1536) stores 1536 float32 values → 1536 × 4 bytes = 6,144 bytes per row
For 100,000 rows: 6144 × 100,000 = 614,400,000 bytes ≈ 585.94 MiB (excluding tuple overhead, alignment, TOAST effects).
This is the clean baseline you asked for.

If you instead store embeddings as halfvec(1536) (16-bit):

1536 × 2 bytes = 3,072 bytes per row
For 100,000 rows: 307,200,000 bytes ≈ 292.97 MiB
Supabase explicitly describes halfvec as half precision storage “to save space.”

HNSW index storage multiplier:

The exact multiplier depends strongly on HNSW parameters (like m, construction settings) and how many levels are created.
Practically, you should treat HNSW index size as “same order of magnitude” as the vector column for planning, but measure on your actual data.

How to measure accurately (recommended for your benchmark suite):

Use pg_relation_size('index_name') and pg_total_relation_size('table_name') after building indexes.
This avoids guesswork and lets you build a cost-vs-latency curve specific to your schema and chunk text lengths.

Since Supabase includes only 8 GB database disk per project on Pro/Team before overage, you have a lot of headroom for 100K chunks even if you include:

HNSW index,
tsvector GIN index storage (which can be sizable depending on token counts),
ltree GIST index.
Self-hosting decision points, migration decision tree, and checklist
When you should consider moving off Supabase Cloud

A rational self-host trigger is usually not “users increased,” but “constraints changed.” For CIE-Copilot, the triggers that are most defensible are:

You require a compiled extension not available on Supabase Cloud (e.g., DiskANN via pgvectorscale).
You need tighter control over Postgres configuration / extension build cadence than Supabase’s “upgrade via infrastructure settings” model allows.
You need air-gapped / on-prem deployments for institutions, or regions not served.
You need a pooler/concurrency model beyond what your compute tier’s pooler max clients allows (or you need alternative pooling behavior).
Deployment options: Docker Compose vs Kubernetes

Supabase’s official docs position Docker as the easiest path for self-hosting and provide concrete system requirements. They list minimums (4 GB RAM, 2 cores, 50 GB SSD) and recommend more for production.

For Kubernetes, Supabase has a community Helm chart repo (supabase-community/supabase-kubernetes) that explicitly provides Helm charts for deploying Supabase on Kubernetes.

Opinionated take:

Use Docker Compose for early institutional pilots and for a “known-good restore target.” It is simpler, easier to reason about, and aligns with Supabase’s official operational docs.
Use Kubernetes when you need HA, autoscaling, infra policy control, and standard operational tooling—but accept that you’ll do more integration work (Postgres operator choice, secrets, ingress, persistent volumes, etc.). The Helm charts help, but this is still a higher-ops path.
Auth migration and the JWT/OAuth pitfalls

There are two orthogonal migration problems: auth database state and token verification configuration.

Migrating users & password hashes
Supabase documents that you can migrate all tables in the auth schema (including hashed passwords) between projects, allowing users not to reset passwords.

JWT secret continuity
Supabase states that if the JWT secret differs in the new project, existing tokens become invalid and users must log in again; if you reuse the original JWT secret, tokens remain valid.

OAuth config in self-hosted
In self-hosted mode, you do not configure OAuth providers from the dashboard; you configure Auth via docker-compose environment variables (e.g., OAuth client id/secret/redirect uris).
So you need a secure export of:

provider client IDs/secrets,
redirect URIs,
allow-list/SITE_URL equivalents.
Self-hosted keys and secrets are your responsibility
Supabase’s Docker self-hosting doc is explicit that you must not use placeholder secrets; you must set JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY, and other internal secrets in .env.
Migration process: Cloud → Self-host in a reproducible way

Supabase provides a quick reference for transferring platform DB to self-host using Supabase CLI dumps for roles/schema/data (including --use-copy) and then restoring via psql, with SET session_replication_role = replica during import.

This is the correct baseline for your migration runbook because it’s vendor-aligned and automatable in CI.

HNSW index rebuild time: how to estimate (and how to make it predictable)

There is no universally correct rebuild-time number because it depends on:

compute tier (CPU/RAM),
disk IOPS/throughput,
HNSW parameters,
concurrency and write load during build.

What you can do predictably:

Build a staging dataset at the target scale,
rebuild the index and measure wall-clock,
record CPU/IO metrics,
then re-run on the next compute tier to build your own “minutes per 100K vectors” curve.

pgvector 0.8.0 includes performance improvements for “searching and building HNSW indexes,” which is useful if you’re deciding whether to upgrade before large rebuilds.

Migration decision tree

A concise decision tree that matches your roadmap:

If you need DiskANN / pgvectorscale in production → move to self-hosted Postgres or another managed provider that supports it (Supabase Cloud does not list it).
Else if your bottleneck is pooler client ceiling / concurrency → first scale compute tier + add caching/throttling; if still insufficient, evaluate multi-project sharding or self-host.
Else if your bottleneck is RLS cost in hybrid_search → rewrite RLS policies (initPlan pattern, indexes, reduce joins) and adopt pgvector iterative scans; this is usually cheaper than migrating infrastructure.
Else if your requirement is data residency / offline institutional deployments → self-host Supabase (Docker for simplest, K8s for HA).
Checklist you can operationalize

Minimum checklist (Cloud → Self-host) aligned with Supabase docs:

Database export
Dump roles, schema, data using Supabase CLI commands in the official guide.
Database restore
Restore in order (roles → schema → data) using psql with --single-transaction and SET session_replication_role = replica during import.
Auth
Decide whether you must preserve JWT validity; if yes, carry forward the JWT secret semantics described by Supabase.
Export OAuth provider configs and reconfigure them in docker-compose (self-hosted does not use dashboard UX for this).
Secrets
Generate and set JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY, plus internal secrets (Supavisor, Vault encryption, etc.) as required by the official Docker guide.
Pooling
Validate both session and transaction ports and ensure application driver settings match (especially if you later use asyncpg). Self-host docs show session vs pooled transactional connection strings via Supavisor.
Vector search
Rebuild HNSW indexes after restore; then validate filtered query correctness (Top‑N) using iterative scan settings if needed.
RLS regression
Run an RLS performance test suite on restored data to ensure policies remain performant and safe; Supabase provides specific RLS performance tools and benchmark patterns.
