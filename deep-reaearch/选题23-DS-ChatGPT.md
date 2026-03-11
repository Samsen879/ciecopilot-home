# 选题23-DS-ChatGPT

- 原始报告标题：Observability and MLOps Telemetry Blueprint for CIE-Copilot
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:15:51.365Z

Observability and MLOps Telemetry Blueprint for CIE-Copilot

This report is written for Samsen and focuses on making a two-service + Redis Streams + LangGraph educational AI system observable end-to-end (HTTP → queue → worker → graph nodes → LLM + SymPy), while meeting strict PRD CI gates for latency, RAG quality, and safety. The design anchors on OpenTelemetry context propagation and semantic conventions, so telemetry stays vendor-neutral and can flow into either a self-managed stack (Prometheus/Grafana/Loki + a tracing backend) or an LLM-native observability product. 
1

System scope and measurement boundaries

The key complexity driver is the “request” boundary: user-perceived latency begins at the inbound HTTP request (Service A) and ends when the user sees the first meaningful streamed token (TTFT) and later the final completion (done event). In this architecture, a single user action becomes an asynchronous job with multiple internal steps (LangGraph nodes, retrieval, Math Verifier, SymPy sandbox), so “one request = one trace” must cross both process boundaries and messaging boundaries. 
1

A second boundary is privacy: student answers and identifiers are sensitive, and both traces and logs can inadvertently capture them unless you implement explicit redaction/allowlisting and avoid propagating sensitive baggage. 
2

End-to-end tracing design across HTTP, Redis Streams, and LangGraph
Trace context and cross-service propagation strategy

Use the W3C Trace Context headers (traceparent, tracestate) as the canonical propagation format, because they are standardized specifically for distributed tracing and widely supported across OpenTelemetry SDKs. 
3

For asynchronous boundaries (Redis Streams), follow OpenTelemetry messaging semantic conventions: produce spans should be SpanKind=PRODUCER and consume/process spans should be SpanKind=CONSUMER, with messaging attributes describing the broker/system and destination. This gives consistent trace visualization and lets you compute queue-specific KPIs (lag, backlog, processing delay) from spans + metrics. 
4

Recommended envelope fields (minimal, practical):

job_id: your business key.
trace: a carrier map containing traceparent, optional tracestate, and (only if absolutely needed) baggage.
enqueue_ts_ms: epoch timestamp for queue delay computation (more reliable than stream ID parsing for dashboards/alerts).
privacy_flags: e.g., contains_student_text=false so downstream code can enforce “no raw text in telemetry.” 
1

Baggage guidance: keep baggage tiny and never include student text, tokens, names, emails, or raw IDs. Baggage can be automatically forwarded to downstream calls (including third parties) via headers, so sensitive baggage can leak outside your trust boundary. 
5

Service A (Next.js) tracing: HTTP root, enqueue span, and SSE span

Next.js has first-class guidance for instrumenting with OpenTelemetry and adding custom spans, including a documented mechanism to create custom spans inside your code. 
6

Model the Service A trace like this:

Span: http.server (root)
Created automatically by framework instrumentation (where enabled) or manually around the handler.
Span: cie.job.enqueue (child)
Covers: payload validation → Redis XADD → persist minimal job row (optional) → emit job_id.
Span: cie.sse.stream (child, long-lived)
Measures perceived streaming:
ttft_ms as an event or attribute when the first SSE chunk is written.
stream_duration_ms until completion/close. 
7

Redis client spans: Use Node Redis client instrumentation so Redis calls (including XADD) appear as child spans under cie.job.enqueue. There are maintained OpenTelemetry instrumentations for popular Node Redis clients (including redis and ioredis). 
8

Service B (FastAPI worker) tracing: consume span, LangGraph node spans, and GenAI spans

FastAPI has an official OpenTelemetry contrib instrumentation that auto-instruments inbound HTTP requests served by FastAPI; in your case, the worker is likely not HTTP-first, but the same SDK + tracer approach applies for internal spans. 
9

For Redis consumption, define a top-level span per job processing:

Span: cie.job.process (SpanKind=CONSUMER)
Parent context: extracted from the envelope’s traceparent so the trace continues from Service A.
Attributes:
cie.job_id
messaging.system="redis"
messaging.destination.name="cie_copilot:jobs"
cie.queue_delay_ms = now - enqueue_ts_ms
cie.consumer_group, cie.consumer_name 
4

LangGraph node spans via callbacks:
LangGraph supports attaching callbacks at compile-time via .compile().with_config({'callbacks': [...]}), and LangSmith documents LangGraph tracing integration; third-party tools (e.g., Langfuse) also integrate with LangGraph through LangChain callbacks, which implies callbacks are the standard interception point for node-level events. 
10

GenAI spans and metrics:
Use the OpenTelemetry GenAI semantic conventions for LLM client spans and metrics (model name, operation name, token counts, etc.). These conventions exist explicitly to standardize LLM observability and reduce ad-hoc schemas. 
11

LangGraph OpenTelemetry callback code framework

Below is a pragmatic callback framework that:

Creates one span per LangGraph node (and also covers tools/retrievers/LLM calls if those callbacks fire).
Records TTFT using streaming token callbacks.
Keeps span cardinality reasonable by storing only hashed identifiers and numeric summaries.
python
复制
# langgraph_otel_callback.py
from __future__ import annotations

import time
import threading
from dataclasses import dataclass
from typing import Any, Dict, Optional
from uuid import UUID

from opentelemetry import trace
from opentelemetry.trace import Span, SpanKind, Status, StatusCode

from langchain_core.callbacks import BaseCallbackHandler


@dataclass
class _RunState:
    span: Span
    start_ns: int
    first_token_ns: Optional[int] = None
    token_count: int = 0


class LangGraphOtelCallback(BaseCallbackHandler):
    """
    Callback handler intended to be attached to a compiled LangGraph via:
      graph.compile().with_config({'callbacks': [LangGraphOtelCallback(...)]})

    This creates OTel spans for:
      - nodes (as "chain" runs)
      - tools
      - retrievers
      - LLM/chat model calls (including TTFT from streaming tokens)

    Important: do NOT attach raw prompts, raw student answers, or long texts as span attributes.
    """

    def __init__(self, tracer_name: str = "cie.langgraph", service_namespace: str = "cie"):
        self._tracer = trace.get_tracer(tracer_name)
        self._service_namespace = service_namespace

        self._lock = threading.Lock()
        self._runs: Dict[UUID, _RunState] = {}

    # ---------- Helpers ----------

    def _start_span(self, name: str, kind: SpanKind, attrs: Optional[Dict[str, Any]] = None) -> Span:
        span = self._tracer.start_span(name=name, kind=kind)
        if attrs:
            for k, v in attrs.items():
                if v is not None:
                    span.set_attribute(k, v)
        return span

    def _register(self, run_id: UUID, span: Span) -> None:
        with self._lock:
            self._runs[run_id] = _RunState(span=span, start_ns=time.time_ns())

    def _get(self, run_id: UUID) -> Optional[_RunState]:
        with self._lock:
            return self._runs.get(run_id)

    def _end(self, run_id: UUID, ok: bool, err: Optional[BaseException] = None, extra: Optional[Dict[str, Any]] = None) -> None:
        with self._lock:
            state = self._runs.pop(run_id, None)

        if not state:
            return

        if extra:
            for k, v in extra.items():
                if v is not None:
                    state.span.set_attribute(k, v)

        if not ok:
            state.span.record_exception(err)
            state.span.set_status(Status(StatusCode.ERROR, str(err)))
        else:
            state.span.set_status(Status(StatusCode.OK))

        state.span.end()

    # ---------- Node / chain spans ----------

    def on_chain_start(self, serialized: Dict[str, Any], inputs: Dict[str, Any], *, run_id: UUID, **kwargs: Any) -> Any:
        node_name = serialized.get("name") or serialized.get("id") or "langgraph.node"
        span = self._start_span(
            name=f"{self._service_namespace}.node.{node_name}",
            kind=SpanKind.INTERNAL,
            attrs={
                "cie.component": "langgraph",
                "cie.node_name": node_name,
            },
        )
        self._register(run_id, span)

    def on_chain_end(self, outputs: Dict[str, Any], *, run_id: UUID, **kwargs: Any) -> Any:
        self._end(run_id, ok=True)

    def on_chain_error(self, error: BaseException, *, run_id: UUID, **kwargs: Any) -> Any:
        self._end(run_id, ok=False, err=error)

    # ---------- Tool spans ----------

    def on_tool_start(self, serialized: Dict[str, Any], input_str: str, *, run_id: UUID, **kwargs: Any) -> Any:
        tool_name = serialized.get("name") or "tool"
        span = self._start_span(
            name=f"{self._service_namespace}.tool.{tool_name}",
            kind=SpanKind.INTERNAL,
            attrs={"cie.tool_name": tool_name},
        )
        self._register(run_id, span)

    def on_tool_end(self, output: str, *, run_id: UUID, **kwargs: Any) -> Any:
        self._end(run_id, ok=True)

    def on_tool_error(self, error: BaseException, *, run_id: UUID, **kwargs: Any) -> Any:
        self._end(run_id, ok=False, err=error)

    # ---------- Retriever spans ----------

    def on_retriever_start(self, serialized: Dict[str, Any], query: str, *, run_id: UUID, **kwargs: Any) -> Any:
        retriever_name = serialized.get("name") or "retriever"
        span = self._start_span(
            name=f"{self._service_namespace}.retriever.{retriever_name}",
            kind=SpanKind.INTERNAL,
            attrs={"cie.retriever_name": retriever_name},
        )
        self._register(run_id, span)

    def on_retriever_end(self, documents: Any, *, run_id: UUID, **kwargs: Any) -> Any:
        # Only log counts / metadata; avoid document text
        doc_count = len(documents) if hasattr(documents, "__len__") else None
        self._end(run_id, ok=True, extra={"cie.retriever_doc_count": doc_count})

    def on_retriever_error(self, error: BaseException, *, run_id: UUID, **kwargs: Any) -> Any:
        self._end(run_id, ok=False, err=error)

    # ---------- LLM spans + TTFT + TPS ----------

    def on_llm_start(self, serialized: Dict[str, Any], prompts: Any, *, run_id: UUID, **kwargs: Any) -> Any:
        model = serialized.get("name") or serialized.get("id") or "llm"
        span = self._start_span(
            name=f"{self._service_namespace}.llm.{model}",
            kind=SpanKind.CLIENT,
            attrs={
                "cie.llm_model": model,
                # Do NOT attach prompts here.
            },
        )
        self._register(run_id, span)

    def on_llm_new_token(self, token: str, *, run_id: UUID, **kwargs: Any) -> Any:
        state = self._get(run_id)
        if not state:
            return
        state.token_count += 1
        if state.first_token_ns is None:
            state.first_token_ns = time.time_ns()
            ttft_ms = (state.first_token_ns - state.start_ns) / 1e6
            state.span.add_event("ttft", {"cie.llm_ttft_ms": ttft_ms})

    def on_llm_end(self, response: Any, *, run_id: UUID, **kwargs: Any) -> Any:
        state = self._get(run_id)
        if state:
            end_ns = time.time_ns()
            dur_s = (end_ns - state.start_ns) / 1e9
            tps = (state.token_count / dur_s) if dur_s > 0 else None

            self._end(
                run_id,
                ok=True,
                extra={
                    "cie.llm_token_count_streamed": state.token_count,
                    "cie.llm_tokens_per_second": tps,
                },
            )
        else:
            self._end(run_id, ok=True)

    def on_llm_error(self, error: BaseException, *, run_id: UUID, **kwargs: Any) -> Any:
        self._end(run_id, ok=False, err=error)


Why this structure is consistent with LangGraph practice: LangGraph supports callback attachment at compile time, and callbacks are the standard mechanism through which tracing tools capture LangGraph node execution, LLM calls, tools, and retrievers. 
10

For TTFT specifically, token callbacks are only available when streaming is enabled, which aligns with typical callback APIs that emit on_llm_new_token events during streaming. 
12

SymPy execution as an isolated span with outcome taxonomy

SymPy is a local sandbox but can still be a high-risk latency component (complex simplification, pathological expressions, non-termination). Treat SymPy as a first-class span under the Math Verifier node:

Span: cie.sympy.verify (SpanKind=INTERNAL)
Attributes:
cie.sympy.status: success | uncertain | parse_fail | timeout | error
cie.sympy.exec_ms
cie.sympy.timeout_ms (if applied)
cie.sympy.expression_size (numeric proxy, not raw text)

This span is “load-bearing” for your CI gate “Uncertain Rate 5%–20%” because it provides the denominator (all verifications) and outcome classes. The same span also provides a clean way to separate “LLM slow” from “verification slow” during incidents. 
1

Metrics catalog with tiering and alert thresholds

This section proposes a metrics set that (a) supports SLO-style alerting, and (b) directly computes the PRD CI gates: Topic Leakage Rate, Recall@5, Marking F1, Uncertain Rate, P95 retrieval latency, and P95 end-to-end latency.

Two implementation constraints matter for correctness and cost:

Prefer Prometheus histograms for latency distributions because server-side histogram_quantile() is the standard path for P95/P99 from bucketed observations. 
13
Control label cardinality (no raw job_id labels; use exemplars, trace links, or logs for per-job debugging). High-cardinality labels can explode Prometheus storage. 
14
Tier definitions
Tier Pager (page on-call): user-facing SLO violations or fast burn of error budgets for latency/availability.
Tier Notify (Feishu/Slack-like): quality drift (leakage, retrieval quality, marking quality), cost anomalies, or rising uncertainty.
Tier Ticket: capacity trends (lag, DB pool saturation), slow drifts, or “yellow” signals that need engineering work but not immediate response. This follows the philosophy of alerting on significant events measured by user experience/SLOs. 
15
Infrastructure and queueing metrics

Redis Streams exposes a consumer group “lag” field via XINFO GROUPS, defined as the number of entries still waiting to be delivered to the group (with caveats where it can be NULL). Use that field as your primary backlog signal. 
16

Metric	Type	Recommended labels	Purpose	Initial alerting guidance
redis_stream_group_lag	gauge	stream, group	Detect queue backlog	Pager if rising + sustained and job_queue_delay_p95 breaches SLO; Notify if lag > baseline for 15m. 
16

redis_stream_group_pending	gauge	stream, group	Detect stuck/unacked jobs (PEL)	Notify if pending grows while throughput drops; Ticket if persistently >0 during low traffic. 
17

redis_stream_length	gauge	stream	General backlog/sizing	Ticket for capacity planning.
dlq_length	gauge	stream="cie_copilot:dlq"	Failure accumulation	Pager if DLQ is rising rapidly; Notify if DLQ non-zero for >10m.
postgres_pool_in_use	gauge	service	Avoid saturation	Pager if pool exhaustion causes request failures; Ticket if >80% for 30m.
End-to-end latency and retrieval latency metrics

Implement latency as Prometheus histograms so you can compute P95/P99 reliably and visualize heatmaps over time. Heatmaps are explicitly designed to view histograms over time and help catch tail regressions. 
13

Metric	Type	Labels	CI gate mapping	Alert thresholds aligned to PRD
job_end_to_end_latency_seconds	histogram	route, mode	P95 end-to-end latency	Pager if P95 > 3.0s for 5m (PRD gate). 
13

job_ttft_seconds	histogram	route, mode, model	user-perceived TTFT	Pager if P95 TTFT > (3.0s gate budget minus non-LLM budget) for 5m; Notify if steadily regressing. 
11

retrieval_latency_seconds	histogram	retriever, index	P95 retrieval latency	Pager if P95 > 0.8s for 5m (PRD gate). 
13

job_queue_delay_seconds	histogram	stream, group	queueing delay portion	Notify if P95 > 0.5s for 10m; Pager if P95 > 1.5s for 5m (tune to traffic). 
16
GenAI performance and cost metrics

OpenTelemetry GenAI semantic conventions define both spans and metrics for LLM client operations, including standardized attributes for model and operation. Use them as the schema baseline so switching vendors/backends is not a rewrite. 
11

Metric	Type	Labels	Why it matters	Alerting examples
llm_requests_total	counter	provider, model, status	availability + saturation	Pager if error rate spikes and correlates with TTFT/E2E.
llm_ttft_seconds	histogram	provider, model	user-perceived speed	Pager if P95 TTFT drives P95 E2E > 3s.
llm_tokens_total	counter	provider, model, direction	cost and throughput	Notify on sudden cost jump; possible prompt regression.
llm_tokens_per_second	gauge or derived	provider, model	detect throttling/slow streaming	Ticket if TPS slowly decreases over releases.

If you use an LLM gateway/proxy, cost tracking and caching can be tracked at the proxy layer to attribute spend to route, user cohort, or feature. Helicone, for example, documents cost tracking and a caching feature designed to reduce redundant API calls (latency + cost). 
18

Retrieval quality and safety metrics

For RAG quality, latency alone is insufficient; you need evidence-quality measurements. A practical approach is:

Compute an aggregate fusion score (like mean RRF score) and track its distribution. RRF is a well-known rank fusion method from IR literature and provides a principled, simple way to combine ranked lists. 
19
Use reference-free evaluation metrics like the “RAG Triad” (context relevance, groundedness, answer relevance) for sampling-based monitoring or regression tests. TruLens documents this triad explicitly as its core RAG evaluation concept. 
20
Metric	Type	Labels	CI gate mapping	Alerting guidance
recall_at_5	gauge (offline + canary)	dataset, version	Recall@5 > 90%	Notify if <90% on canary; block release in CI.
rrf_score_mean	gauge	retriever, topic_path	retrieval health proxy	Ticket if trending down; Notify if step-change after deploy. 
19

evidence_topic_path_share	gauge	topic_path_bucket	leakage surface	Notify on distribution drift.
topic_leakage_rate	gauge	route, model	Leakage <1%	Notify if >1% for 1h; ticket if trending up.
Marking and SymPy verification metrics
Metric	Type	Labels	CI gate mapping	Alerting guidance
marking_f1	gauge (offline)	dataset, version	Marking F1 > 0.85	Notify + block in CI if <0.85.
sympy_parse_fail_rate	gauge	expression_type	quality + robustness	Ticket if rising; usually prompt/schema bug.
sympy_uncertain_rate	gauge	topic_path	Uncertain 5%–20%	Notify if <5% or >20% for 1d; investigate.
sympy_timeout_rate	gauge	topic_path	latency risk	Pager only if timeouts correlate with P95 E2E.
Tooling comparison and decision matrix

Your tool choice should be driven by four axes:

Depth of LangGraph integration through callbacks (node-level visibility).
Privacy and self-hosting (student data control).
RAG/LLM-native quality metrics (triad, evals, prompt management).
Cost attribution (token/cost, caching signals, and unit economics).
Decision matrix

All rows below are grounded in vendor/project documentation about integration style, self-hosting posture, and core feature focus.

Option	LangGraph integration depth	Self-host / data residency	RAG-native metrics	Cost + tokens	Notes
LangSmith	Deep: official LangGraph tracing docs and callback attachment patterns exist. 
21
	Managed service; offers region selection (e.g., EU data residency). 
22
	Strong workflow tracing; RAG eval metrics require your setup	Token/cost via traces; depends on plan	Best “lowest friction” with LangGraph; privacy must be evaluated vs your student-data constraints. 
23

TruLens	Primarily a Python eval + tracing library; can evaluate RAG and agents; RAG Triad is explicit. 
20
	Open-source library (run in your environment)	Strong: Triad (context relevance, groundedness, answer relevance)	Not a gateway; you still collect tokens elsewhere	Best as an evaluation layer (CI gates + sampled production grading), not as your only infra observability tool. 
20

Helicone	Proxy/gateway architecture; captures provider calls for observability; GitHub repo is open source. 
24
	OSS exists; a managed offering also exists	Some eval/cookbooks; not “triad-first”	Strong: documents cost tracking and caching to reduce redundant calls. 
18
	Best when you want cost attribution + operational control at the LLM boundary (rate limits/failover/caching).
Langfuse	Uses LangChain callbacks to trace LangChain executions and supports LangGraph through that mechanism. 
25
	Open-source; self-hosting guides exist; core is MIT-licensed with enterprise modules for governance features. 
26
	Supports evals + prompt mgmt; not exclusively RAG-triad	Tracks token usage/costs; supports custom trace IDs for distributed tracing. 
27
	Best “self-hosted LLM engineering platform” option when privacy and control matter.
Self-built (OpenTelemetry + Prometheus + Grafana + Loki)	Max control; you instrument node-level spans yourself and adopt semantic conventions (messaging + GenAI). 
4
	Fully self-hostable	You build/host your own eval jobs (or combine with TruLens)	You build your own cost logic (or combine with a gateway)	Best for strict privacy + vendor neutrality; highest engineering cost. 
1
Opinionated recommendation for this architecture

A robust pattern for educational AI (where privacy is non-negotiable and CI gates are strict) is a hybrid:

Use the self-built OpenTelemetry foundation for infrastructure reliability, queueing, and cross-service trace continuity (especially Redis Streams lag, DLQ, Postgres saturation, and P95 E2E). This is the part that traditional APM/observability is best at. 
4
Add an LLM-native layer only where it reduces cycle time on prompt/version/evals (Langfuse self-hosted is the best fit among the compared tools if you require self-hosting). 
26
Use TruLens as your evaluation engine for RAG Triad + other judge-based feedback, feeding its outputs into Prometheus/Grafana as “quality SLOs” (or storing in Postgres + scheduled exporters). 
20
Grafana dashboard blueprint and alert routing

Grafana documentation explicitly recommends dashboard best practices such as embedding documentation via text panels and avoiding unnecessary refresh. For latency distributions, Grafana heatmaps are designed to show histogram distributions over time, which is exactly what you need for tail-latency drift and TTFT regressions. 
28

Grafana Alerting uses contact points and notification policies to route alerts to destinations such as PagerDuty and webhooks; PagerDuty is a documented native integration. 
29

Operations dashboard

Audience: on-call / platform engineer
Primary question: “Are we meeting P95/P99 latency and success SLOs, and if not, where is the bottleneck?”

Key panels (suggested window: 1h + 24h comparison):

P95/P99 end-to-end latency (job_end_to_end_latency_seconds histogram_quantile). 
13
TTFT P95 (job_ttft_seconds) and TTFT heatmap. 
30
Retrieval latency P95 (retrieval_latency_seconds). 
13
Queue health: redis_stream_group_lag, redis_stream_group_pending, dlq_length. Redis lag and pending are first-class fields for consumer groups via the Redis Streams introspection commands. 
16
Job success rate (stacked time series by outcome: success/error/timeout/validation).
Postgres saturation proxy (pool in-use, slow queries if you instrument DB). Psycopg2 instrumentation exists for PostgreSQL tracing. 
31

Pager alerts (route to PagerDuty):

P95 end-to-end latency > 3s for 5m (PRD gate).
P95 retrieval latency > 800ms for 5m (PRD gate).
Job failure rate > X% for 5m (pick X based on launch tolerance; start at 2% and tune).

Routing method: configure Grafana contact points and map PagerDuty integration keys; policies can route by labels like service="worker" or severity="page". 
29

Teaching quality dashboard

Audience: product/ML owner, content safety owner
Primary question: “Is the system answering within syllabus constraints with high retrieval fidelity and correct marking behavior?”

Key panels (suggested window: 7d with 24h overlay):

Topic leakage rate with breakdown by topic_path_bucket and by agent (Tutor vs Examiner).
Recall@5 trend on canary datasets (CI + daily scheduled run).
RRF score mean/quantiles and distribution shift (helps diagnose retriever drift). RRF is rooted in established IR literature. 
19
RAG Triad sampling scores (context relevance, groundedness, answer relevance) if you adopt TruLens. 
20
Marking F1 per question type (daily/weekly).
SymPy outcomes: uncertain rate, parse fail rate, timeout rate.

Notify alerts (route to Feishu via webhook):

Leakage rate > 1% sustained (PRD gate).
Recall@5 < 90% on canary runs (PRD gate).
Uncertain rate outside 5%–20% for 24h (quality drift).
Marking F1 < 0.85 (block release, notify).

Webhook routing is supported via Grafana’s webhook contact point integration (use it for Feishu if needed). 
32

Cost and capacity dashboard

Audience: engineering lead / finance-aware operator
Primary question: “Where are tokens and dollars going, and are we scaling efficiently?”

Key panels:

Tokens/min and cost/day by model and route. GenAI semantic conventions support standardized LLM metrics; gateways can also provide cost tracking. 
33
Cache hit rate if you deploy an LLM proxy cache (Helicone documents a caching feature intended to reduce redundant calls). 
34
Consumer lag vs workers (lag plotted alongside worker concurrency) using Redis group lag. 
16
DLQ growth rate (bar chart per hour).
Top regressions by prompt/version if you adopt a prompt-management tool (Langfuse supports prompt management concepts). 
35

Ticket alerts:

Cost per successful job up > N% week-over-week.
Tokens per job up > N% after deploy (likely prompt drift).
Lag trends indicating scaling mismatch.
Student data privacy and telemetry sanitization
What must never enter telemetry
Raw student answers, step-by-step workings, or full retrieved documents.
Direct identifiers (email, phone, full user_id, IP address unless strictly necessary).

OpenTelemetry security guidance explicitly warns that telemetry can capture sensitive/personal information and recommends mindful handling, including using collector processors to scrub sensitive data. 
2

Trace/log redaction and allowlisting in the Collector

Adopt an “allowlist-by-default” strategy at the OpenTelemetry Collector:

Keep only approved attribute keys (e.g., cie.job_id, hashed user, node name, latency numbers).
Drop or mask everything else.

OpenTelemetry’s documentation on handling sensitive data points to deleting attributes via a redaction processor, and the redaction processor is explicitly designed to remove disallowed attributes and mask blocked values. 
36

If you need more granular edits (regex-based partial masking), the Collector transform pipeline is explicitly positioned as the place to transform telemetry for governance, cost, and security reasons. 
37

Hashing strategy for identifiers

Use keyed hashing (HMAC) rather than plain hash:

user_hash = HMAC_SHA256(privacy_key, user_id)
This prevents offline dictionary reversal for predictable IDs (e.g., incremental integers).

Store:

user_hash in traces/logs/metrics labels (but avoid as Prometheus label if high cardinality; prefer logs/exemplars).
cohort_id or plan (low cardinality) as metrics labels.
Baggage boundary controls

Because baggage propagates broadly and can leak to downstream services, never put sensitive data in baggage and sanitize baggage at trust boundaries. OpenTelemetry baggage docs explicitly warn that sensitive baggage items can be shared with unintended downstream resources, including third-party APIs, since baggage is transmitted via headers. 
5

Logging pipeline to Loki with OTLP

If you choose Loki for logs, Loki supports ingesting OpenTelemetry logs over HTTP, and Grafana provides documentation for exporting logs to Loki using an OpenTelemetry exporter (OTLP HTTP). 
38

In practice:

Emit structured JSON logs with fields: severity, service, job_id, trace_id, span_id, node, status, plus only sanitized summaries (lengths, counts).
Apply Collector processors to drop any field that may contain raw text.

This ensures traces and logs correlate (via trace_id) without exposing student content.

Minimal “safe-by-design” telemetry schema

A workable compromise between debugging power and privacy risk is to store only:

Identifiers: job_id, thread_id (LangGraph), user_hash (HMAC).
Numeric summaries: latency, token counts, doc counts, uncertain outcome, leakage flags, retrieval scores.
Small categorical tags: node name, agent type, model name, topic_path_bucket.

This aligns with OpenTelemetry’s emphasis on being mindful about sensitive data in telemetry and using governance controls to avoid inadvertent capture. 
2
