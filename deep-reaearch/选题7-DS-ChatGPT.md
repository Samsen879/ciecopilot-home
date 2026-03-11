# 选题7-DS-ChatGPT

- 原始报告标题：Fault-Tolerant LangGraph Workers with Redis Streams for CIE-Copilot
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:07:28.672Z

Fault-Tolerant LangGraph Workers with Redis Streams for CIE-Copilot
System context and non-negotiable requirements

CIE-Copilot’s AI Worker consumes jobs from Redis Streams using a consumer group, then executes a LangGraph workflow with multiple nodes (Supervisor → Tutor/Examiner → Math Verifier). Each node can invoke external systems (LLM APIs), do symbolic computation (SymPy), or query a database—so failures are expected at every boundary.

Two constraints drive the architecture:

Redis Streams consumer groups require explicit acknowledgments: messages delivered via XREADGROUP are tracked in the group’s Pending Entries List (PEL) until the consumer acknowledges them with XACK. 
1
 This is foundational to at-least-once delivery: if a worker crashes before XACK, the message remains pending and can be reclaimed by other consumers (e.g., via XCLAIM / XAUTOCLAIM). 
2

Redis Streams explicitly notes that while claiming semantics reduce duplicate processing probability, “multiple processing is possible and unavoidable in the general case”—meaning at-least-once must be paired with idempotency. 
3

On the LangGraph side, resilience hinges on two built-ins:

Checkpointing (persistence): compiling with a checkpointer saves a checkpoint of graph state at every “super-step” into a thread keyed by thread_id. 
4

Caching: LangGraph supports node/task caching based on node input; by default the cache key is a hash of the input (pickled), and the cache can be provided at compile/entrypoint time with per-node policies. 
5

Together, these enable the PRD requirements: at-least-once delivery, worker idempotency, and writing failures to a dead_letter_stream.

Exception taxonomy

A production-grade taxonomy should be two-dimensional:

Fault domain (LLM / SymPy / DB / Business logic / Infrastructure / Messaging)
Failure mode (Transient / Persistent / Terminal / Unknown)

This separation prevents a common anti-pattern: treating “where it failed” as “how to respond”.

Exception classification matrix

The table below defines a practical taxonomy for CIE-Copilot, with stable error codes designed for metrics, DLQ indexing, alert routing, and replay controls.

Domain	Subtype examples (from PRD)	Failure mode	Strong indicators	Suggested error_code	Default owner
LLM API	Rate limit (429), quota throttling	Transient (usually)	HTTP 429; may include Retry-After header 
6
; provider rate-limit guidance recommends backoff 
7
	LLM_RATE_LIMIT	Automation (retry + backpressure)
LLM API	Timeout / gateway timeout	Transient	Request timeout / connection errors; OpenAI docs list APIConnectionError / timeout-type errors 
7
	LLM_TIMEOUT	Automation
LLM API	500/502/503/504	Transient ↔ Persistent	5xx; retryable per common cloud guidance 
8
	LLM_5XX	Automation + SRE if sustained
LLM API	Content filter / policy violation	Often terminal per input	Moderation/policy rejection; remediation is typically “rephrase / sanitize / deny” rather than blind retry; OpenAI provides moderation tooling 
9
	LLM_CONTENT_POLICY	Product + Safety
SymPy	Parse failure	Terminal per input	SympifyError when string cannot be parsed 
10
	SYMPY_PARSE_ERROR	Automation (fallback) + Product if frequent
SymPy	Non-termination / infinite loop	Persistent / Terminal (per input)	CPU time bound exceeded; watchdog kill	SYMPY_TIMEOUT	Engineering (sandbox limits)
SymPy	Memory explosion	Persistent / Terminal	Worker hits memory limit / OOMKilled; exit 137 / OOMKilled 
11
	SYMPY_OOM	Engineering + SRE
Database	Connection timeout / network	Transient	Connection errors, timeouts	DB_CONN_TIMEOUT	Automation
Database	Deadlock	Transient (retryable)	SQLSTATE 40P01; PostgreSQL explicitly advises retrying deadlock failures 
12
	DB_DEADLOCK_40P01	Automation
Database	Serialization failure	Transient (retryable)	SQLSTATE 40001; retry whole tx (Postgres guidance) 
12
	DB_SERIALIZATION_40001	Automation
Database	RLS denied	Terminal until config fixed	If no policy exists, PostgreSQL applies default-deny under RLS 
13
	DB_RLS_DENIED	Security/DBA + Engineering
Business logic	Intent cannot route	Persistent (logic/model)	Router returns unknown path / invalid structured output	BIZ_ROUTE_FAIL	Product + Prompt/Agent eng
Business logic	Retrieval empty	Often normal-but-needs-handling	Retrieved docs empty / low confidence	BIZ_RETRIEVAL_EMPTY	Product
Business logic	Topic leakage detector triggers	Terminal per policy	Guard triggers, must refuse or ask to reframe	BIZ_TOPIC_LEAKAGE	Product + Safety
Infrastructure	Worker OOM	Persistent if load-driven	Container terminated by kernel OOM killer; OOMKilled / exit 137 
11
	INFRA_OOMKILLED	SRE + Engineering
Infrastructure	Pod eviction	Transient but disruptive	Kubelet may evict pods under node pressure; marks pod Failed; eviction ignores PDB / grace in certain thresholds 
14
	INFRA_EVICTED	SRE
Messaging/Infra	Redis disconnect	Transient	Client connection errors; no reads/acks possible	REDIS_DISCONNECT	Automation + SRE if widespread

Key design principle: “Retryable” is not a property of an exception class; it’s a property of (exception × operation × side effect risk × idempotency). Cloud guidance explicitly conditions retries on idempotency—i.e., only retry safely when repeating has the same effect as doing it once. 
15

Handling policies and decision matrix
Strategy building blocks

A robust handler set for this system is:

Retry with exponential backoff + jitter for transient errors. AWS describes retry-with-backoff as improving resilience under transient failures but warns that aggressive retries can overload systems. 
16
 Google SRE guidance also highlights that retries without jitter can synchronize into “retry ripples” that amplify outages. 
17

Circuit breaker to stop calling a failing dependency. Microsoft’s Circuit Breaker pattern temporarily blocks access after detecting failures so the system can recover and avoids repeated unsuccessful attempts. 
18

Fallback / graceful degradation (e.g., smaller model, skip verification, return “uncertain”, ask clarifying question)
Escalation paths (DLQ + alerts + human intervention)

Decision matrix

This matrix answers: for each exception class, which mechanisms should be used and what the default parameters should look like.

Error class	Retry w/ backoff?	Circuit breaker?	Fallback?	Return “uncertain”?	Write DLQ?	Human intervention trigger
LLM_RATE_LIMIT	Yes. Respect Retry-After when present (429 may include it). 
6
 Use exponential backoff + jitter. 
16
	Yes if sustained (e.g., error rate over window) to prevent self-DDOS. 
18
	Yes: fallback to cheaper/smaller model or reduced context	Sometimes (if fallback yields degraded confidence)	Yes (record event), but do not necessarily abandon job unless retry budget exhausted	If rate limits persist beyond retry budget or indicate quota misconfig
LLM_TIMEOUT / LLM_5XX	Yes, bounded retries with jitter 
16
	Yes if elevated failure rate 
18
	Yes: switch region/provider/model; reduce tool usage	Often appropriate	Yes	If failures exceed threshold (provider incident)
LLM_CONTENT_POLICY	No blind retries (may retry only after prompt sanitization). Moderation is intended to detect policy-violating content. 
9
	Usually no (policy isn’t “service down”)	Yes: safe refusal / ask user to reframe; pre-moderate input (moderation endpoint is free per OpenAI help center). 
19
	Yes (explicit uncertainty/refusal path)	Yes (include sanitized snippet & policy category)	If high volume indicates prompt bug or abuse
SYMPY_PARSE_ERROR	No (won’t change)	No	Yes: alternate parsing (parse_expr), numeric verification, or skip symbolic verification	Yes	Yes	If systematic (prompt/format regression)
SYMPY_TIMEOUT / SYMPY_OOM	No “retry same computation” unless you change the workload (simplify input)	Possibly (if SymPy service is external and unhealthy)	Yes: impose time/mem limits, use simpler verifier, partial check	Yes	Yes	If frequent → adjust sandbox limits / constraints
DB_CONN_TIMEOUT	Yes (short retries)	Yes if DB is hard-down	Yes: read replica; cached response	Sometimes	Yes	If persistent beyond window
DB_DEADLOCK_40P01 / DB_SERIALIZATION_40001	Yes: retry the whole transaction; Postgres endorses retry for deadlocks (40P01). 
12
	No (not a “remote service down”)	Possibly: reduce transaction scope	No	Yes (for observability)	If deadlocks spike (schema/locking bug)
DB_RLS_DENIED	No	No	Very limited; usually a config/role issue	Yes (fail closed)	Yes	Immediate ticket (security/DBA)
BIZ_ROUTE_FAIL	Not as a “system retry”; instead loop back with error context for LLM self-correction	No	Yes: fallback routing / ask clarifying question	Often	Yes	If repeated for same job class
BIZ_RETRIEVAL_EMPTY	No	No	Yes: broaden query / alternative retriever	Often	Yes (if it leads to failure)	If retrieval infra regressions
BIZ_TOPIC_LEAKAGE	No (policy), except after redaction	No	Yes: safe response path	Yes	Yes	If false positives spike
INFRA_OOMKILLED / INFRA_EVICTED	The platform will restart pods; ensure message isn’t acked early. Node-pressure eviction is kubelet-driven. 
14
	N/A	N/A	N/A	DLQ event useful	SRE paging if sustained
REDIS_DISCONNECT	Yes: reconnect with backoff	Possibly (to avoid hot-loop)	Temporary local buffering	N/A	DLQ only if job is abandoned	SRE if Redis unhealthy

Default “retry budget” recommendation (practical)
Use small, bounded node-level retries (e.g., 2–3 attempts) and a bounded stream-level retry/reclaim window. This aligns with common guidance that indefinite retries cause resource exhaustion and can overload dependencies. 
8

LangGraph error propagation and graceful degradation
What happens when a node raises?

Operationally, LangGraph nodes are ordinary callables. If a node raises and you do not handle it, the run fails (the exception bubbles to the caller). Production patterns therefore revolve around:

Using RetryPolicy for transient errors on specific nodes (LLM calls, network, DB). Docs show adding retry_policy=RetryPolicy(...) when registering a node. 
20

Catching expected “recoverable” errors inside nodes and storing the error in state, then routing based on state (conditional edges or Command.goto). LangGraph’s own guidance demonstrates catching a tool error and returning a Command(update=..., goto=...) so the LLM can see the error and try again. 
20

Compiling with a checkpointer so partial progress is persisted to a thread (thread_id). 
4

Conditional edges as the degradation router

LangGraph supports building workflows by connecting nodes with edges; routing can be conditional. The LangChain docs show add_conditional_edges("classify", route_to_agents, ["github","notion","slack"]) to route dynamically. 
21

For graceful degradation, you generalize this pattern:

Each node always returns a normalized status + optional error fields instead of letting exceptions crash the run for known failure types.
A router function chooses the next node: happy path node, retry loop node, fallback node, or DLQ node.

Error-handling code template

Below is a Graph API template that covers:

node-local try/except
routing to fallback
routing to DLQ writer
bounded retry (LangGraph-level + custom control)

python
复制
from __future__ import annotations

import time
import traceback
from dataclasses import dataclass
from typing import Literal, Optional, TypedDict

from langgraph.graph import StateGraph, START, END
from langgraph.types import RetryPolicy, Command

# ---------- Error model (for state + DLQ) ----------

ErrorDomain = Literal["llm", "sympy", "db", "biz", "infra", "redis"]
ErrorMode = Literal["transient", "persistent", "terminal", "unknown"]

@dataclass(frozen=True)
class ErrorRecord:
    domain: ErrorDomain
    code: str
    mode: ErrorMode
    node: str
    message: str
    detail: str
    ts_ms: int

class WorkerState(TypedDict, total=False):
    job_id: str
    input: dict

    # routing
    role: Literal["tutor", "examiner"]
    status: Literal["ok", "retry", "fallback", "dlq", "done"]
    attempt: int

    # outputs
    supervisor_out: dict
    agent_out: dict
    verification_out: dict
    final_answer: str
    confidence: float

    # errors
    last_error: ErrorRecord
    errors: list[ErrorRecord]

# ---------- Utility ----------

def _now_ms() -> int:
    return int(time.time() * 1000)

def _err(domain: ErrorDomain, code: str, mode: ErrorMode, node: str, e: Exception) -> ErrorRecord:
    return ErrorRecord(
        domain=domain,
        code=code,
        mode=mode,
        node=node,
        message=str(e),
        detail=traceback.format_exc(limit=10),
        ts_ms=_now_ms(),
    )

# ---------- Nodes (examples) ----------

def supervisor(state: WorkerState) -> Command[Literal["tutor_or_examiner", "dlq_writer"]]:
    """
    Decide tutor vs examiner and produce a plan.
    Known transient errors should NOT crash the whole run; store them and route.
    """
    try:
        # 1) run LLM planning, parse output...
        # plan = call_llm(...)
        plan = {"role": "tutor"}  # placeholder

        return Command(
            update={"supervisor_out": plan, "role": plan["role"], "status": "ok"},
            goto="tutor_or_examiner",
        )

    except TimeoutError as e:
        rec = _err("llm", "LLM_TIMEOUT", "transient", "supervisor", e)
        return Command(update={"last_error": rec, "status": "retry"}, goto="dlq_writer")

    except Exception as e:
        rec = _err("biz", "BIZ_SUPERVISOR_UNKNOWN", "unknown", "supervisor", e)
        return Command(update={"last_error": rec, "status": "dlq"}, goto="dlq_writer")

def tutor_or_examiner(state: WorkerState) -> Command[Literal["math_verifier", "fallback_answer", "dlq_writer"]]:
    try:
        # 2) route based on role
        role = state.get("role", "tutor")
        # agent_out = call_tutor_or_examiner(role, ...)
        agent_out = {"draft": "..."}

        return Command(update={"agent_out": agent_out, "status": "ok"}, goto="math_verifier")

    except ValueError as e:
        # Example: parsing failure -> often persistent for this input, prefer fallback
        rec = _err("biz", "BIZ_PARSE_ERROR", "persistent", "tutor_or_examiner", e)
        return Command(update={"last_error": rec, "status": "fallback"}, goto="fallback_answer")

    except Exception as e:
        rec = _err("unknown", "UNHANDLED_EXCEPTION", "unknown", "tutor_or_examiner", e)
        return Command(update={"last_error": rec, "status": "dlq"}, goto="dlq_writer")

def math_verifier(state: WorkerState) -> Command[Literal["finalize", "fallback_answer", "dlq_writer"]]:
    try:
        # 3) do SymPy verification with strict limits (recommended: subprocess sandbox)
        # result = verify_with_sympy(...)
        result = {"ok": True}

        return Command(update={"verification_out": result, "status": "ok"}, goto="finalize")

    except Exception as e:
        # If verification fails, prefer degrade rather than kill the job.
        rec = _err("sympy", "SYMPY_VERIFY_FAIL", "persistent", "math_verifier", e)
        return Command(update={"last_error": rec, "status": "fallback"}, goto="fallback_answer")

def fallback_answer(state: WorkerState) -> dict:
    # produce an "uncertain" response or minimal-safe output
    return {"final_answer": "I can't fully verify this; here is my best attempt...", "confidence": 0.3, "status": "done"}

def finalize(state: WorkerState) -> dict:
    # build final response
    return {"final_answer": "verified answer ...", "confidence": 0.9, "status": "done"}

def dlq_writer(state: WorkerState) -> dict:
    # This node should emit DLQ event (outside of graph) and mark graph as done/fail.
    # Actual Redis XADD is performed by the Worker runtime to avoid side effects inside graph.
    return {"status": "done"}

# ---------- Build graph ----------

workflow = StateGraph(WorkerState)

workflow.add_node("supervisor", supervisor, retry_policy=RetryPolicy(max_attempts=3, initial_interval=1.0))
workflow.add_node("tutor_or_examiner", tutor_or_examiner, retry_policy=RetryPolicy(max_attempts=2, initial_interval=0.5))
workflow.add_node("math_verifier", math_verifier)
workflow.add_node("fallback_answer", fallback_answer)
workflow.add_node("finalize", finalize)
workflow.add_node("dlq_writer", dlq_writer)

workflow.add_edge(START, "supervisor")
workflow.add_edge("finalize", END)
workflow.add_edge("fallback_answer", END)
workflow.add_edge("dlq_writer", END)

app = workflow.compile()


Why this works with LangGraph primitives:

RetryPolicy is a first-class feature in LangGraph; examples show attaching RetryPolicy(max_attempts=3, initial_interval=1.0) to nodes for transient errors. 
20

Graceful “LLM-recoverable” loops are achieved by catching errors and returning a Command that updates state and chooses the next node (LangGraph guidance shows the same pattern for tool errors). 
20

Conditional routing is a core LangGraph concept (docs show .add_conditional_edges(...) for routing). 
21

Idempotency under at-least-once delivery

Idempotency must cover two different duplication mechanisms:

Stream-level duplication (same Redis stream entry delivered again due to crash / reclaim)
Graph-level duplication (a step re-executed during resume/retry)

Redis Streams mechanics you must design for

XREADGROUP delivers messages to a consumer group and stores them in the group’s PEL until acknowledged. 
1

Other consumers can reclaim pending messages using XCLAIM or XAUTOCLAIM when the original consumer failed; XAUTOCLAIM claims only messages idle longer than a threshold and resets idle time, helping reduce duplicate processing. 
22

Even so, Redis explicitly acknowledges duplicates can still occur, hence idempotency must be enforced. 
3

A concrete idempotency design

Use three layers of idempotency, from coarse to fine.

Job-level idempotency

Goal: “If the same job is consumed twice, don’t produce duplicate externally-visible outcomes.”

Recommended pattern:

A stable job_id must exist in the stream payload (do not rely solely on stream entry ID).
The worker creates/updates a jobs record in a durable store with a unique constraint on job_id:

status: IN_PROGRESS | SUCCEEDED | FAILED
final result pointer
updated_at

On message receipt:

If status is SUCCEEDED, immediately XACK the message (no work needed). XACK removes it from PEL. 
23

If status is IN_PROGRESS, either:

treat as duplicate consumption and short-circuit, or
wait/backoff and then check again (useful if a concurrent worker is finishing)

This layer prevents whole-job duplication, but does not prevent duplicate step execution if the job legitimately resumes mid-run.

Step-level idempotency keys

Goal: “Don’t re-run expensive or side-effect steps (LLM call, DB write) when repeated.”

Define:

idempotency_key = sha256(job_id + node_name + node_input_fingerprint + node_version)

node_input_fingerprint should be derived from the semantic inputs to the node (prompt template version, model name, tool schema version, DB query identifiers), not from volatile fields (timestamps, trace IDs).

Store step results in a durable step_executions table keyed by idempotency_key:

If step exists with status DONE, return the stored output (skip external call).
If step exists with status IN_FLIGHT and lease not expired, wait/backoff or adopt a “singleflight” lock strategy.
If no step exists, insert IN_FLIGHT then execute, then update to DONE.

This is the generic form of the same constraint cloud providers emphasize: retries/backoff assume idempotent operations to avoid corrupt partial updates. 
15

LangGraph checkpointing aligned to job_id

Goal: “When resuming after failure, don’t rerun already-completed steps.”

LangGraph checkpointers save a checkpoint at every super-step and associate checkpoints to a thread keyed by thread_id, which you pass via config. 
4

The Functional API docs show a concrete “resume after error” behavior: after a failure, resuming can skip prior work because it is stored in the checkpoint (“we won’t need to re-run the slow_task as its result is already saved in the checkpoint”). 
24

Recommended mapping:

Set thread_id = job_id for every invocation.
When a Redis message is redelivered (or reclaimed), invoke the graph with the same thread_id so the graph can resume against existing checkpoints rather than recomputing.

Preventing duplicate LLM calls specifically

LLM calls are costly and also create “hidden side effects” (token spend, rate limit pressure). You want both:

Step-level idempotency (store exact request/response by idempotency_key)
LangGraph caching (so the node itself can reuse results)

LangGraph supports node caching and states that the cache key defaults to a hash of the input, with optional per-node key_func and ttl. 
5

Practical recommendation:

Provide a distributed cache (e.g., Redis-backed) at graph compile time, and set a cache policy for the LLM nodes using a key derived from:

model
full prompt/messages after templating
temperature / seed parameters
tool schema
any retrieval context that affects output

This ensures that even if step-level idempotency storage is delayed or expensive, the LangGraph runtime can avoid redundant node execution.

Preventing duplicate DB side effects

For DB writes, combine:

Transactional semantics + unique constraints keyed by idempotency_key
Retry-on-deadlock and retry-on-serialization patterns

PostgreSQL explicitly identifies deadlocks (40P01) and serialization failures (40001) as retryable and advises applications be prepared to retry. 
12

But authorization failures (e.g., RLS default-deny) are not retryable; they require policy/config changes. 
13

Dead-letter stream operations and DLQ management API
What “write to dead_letter_stream” should mean

Given the PRD requirement (“失败写入 dead_letter_stream”), a robust interpretation is:

Write a DLQ event for every failed attempt (forensics + trend detection)
Only “quarantine” the job (stop further processing) when:

retries are exhausted, or
the failure is terminal/policy/config, or
processing threatens system health (e.g., repeated timeouts causing cascading failures)

Mechanically, DLQ in Redis Streams is typically implemented by XADD to a dead_letter_stream. XADD is the command that adds entries to a stream. 
25

Once a job is declared terminal/quarantined, you must XACK the original message to remove it from the PEL and prevent infinite redelivery. 
23

DLQ record schema

Recommended DLQ stream entry fields (normalized for analytics):

dlq_id: generated UUID
ts_ms: epoch ms
source_stream: e.g., cie_jobs_stream
source_entry_id: Redis stream entry ID
consumer_group: group name
consumer: consumer name
job_id: durable business id
graph_thread_id: typically same as job_id 
4

node: Supervisor / Tutor / Examiner / MathVerifier
error_domain: llm/sympy/db/biz/infra/redis
error_code: from taxonomy
error_mode: transient/persistent/terminal/unknown
attempt: attempt count (your own counter and/or Redis delivery count)
retryable: boolean
payload_ref: pointer to full payload (avoid huge DLQ entry)
error_message, stacktrace_ref
trace_id / span_id
provider_request_id (LLM, DB) when available

DLQ tool API specification

Design the DLQ tool as a small service (“DLQ Manager”) that indexes DLQ stream entries into a queryable store and orchestrates replay.

API goals:

Fast search/filter (by error_code, node, time window, model, job_id)
Safe replay with idempotency (default: replay is safe; unsafe replay requires elevated permission)
Explicit state transitions: OPEN → ACKED/RESOLVED → REPLAYED → CLOSED

REST API

List DLQ events

GET /v1/dlq/events?status=open&error_code=LLM_RATE_LIMIT&from=2026-03-01T00:00:00Z&to=2026-03-05T00:00:00Z&limit=100&cursor=...

Response:

json
复制
{
  "items": [
    {
      "dlq_id": "c1c2...",
      "ts_ms": 1772690000000,
      "job_id": "job_123",
      "node": "Supervisor",
      "error_domain": "llm",
      "error_code": "LLM_RATE_LIMIT",
      "error_mode": "transient",
      "attempt": 4,
      "source_stream": "cie_jobs_stream",
      "source_entry_id": "1710000000000-0",
      "status": "open",
      "summary": "429 Too Many Requests"
    }
  ],
  "next_cursor": "..."
}


Get one event (full details)

GET /v1/dlq/events/{dlq_id}

Response includes payload references, stacktrace ref, trace IDs, and optionally the stored step-level idempotency record.

Acknowledge / resolve

POST /v1/dlq/events/{dlq_id}/resolve

Body:

json
复制
{ "resolution": "fixed_by_config", "note": "Updated RLS policy", "actor": "sre@company" }


Replay (safe by default)

POST /v1/dlq/events/{dlq_id}/replay

Body:

json
复制
{
  "mode": "safe",
  "target": { "stream": "cie_jobs_stream", "consumer_group": "cie_workers" },
  "strategy": "requeue_original_payload",
  "override": {
    "force_new_thread": false,
    "force_ignore_idempotency": false
  }
}


Replay semantics:

mode="safe" requires replay to use the same job_id and thread_id to leverage checkpoints and idempotency. 
4

force_ignore_idempotency=true requires elevated privilege because it can create duplicate side effects.

Batch replay

POST /v1/dlq/replay

Body:

json
复制
{
  "filter": { "error_code": "LLM_5XX", "status": "open", "max_age_minutes": 60 },
  "mode": "safe",
  "limit": 200
}


Stats

GET /v1/dlq/stats?window=1h&group_by=error_code

Returns counts, top nodes, and P95 age of open DLQs.

Alerting and categorization rules

Use DLQ volume and severity to drive alerts:

Page SRE immediately for infra-level events that threaten availability (e.g., INFRA_OOMKILLED, REDIS_DISCONNECT) if rate exceeds threshold; Kubernetes eviction and OOM conditions are disruptive and can cause visible outages if sustained. 
14

Create engineering ticket for persistent DB_DEADLOCK_40P01 spikes; deadlocks are retryable but indicate contention/locking patterns. 
12

Route to product/safety for LLM_CONTENT_POLICY and BIZ_TOPIC_LEAKAGE, because mitigation often requires prompt/routing changes rather than retries. 
9

Chaos engineering plan for a LangGraph multi-agent system

Chaos testing should validate the PRD claims under realistic failures:

At-least-once delivery (no message loss under worker failures)
Idempotency (no duplicated LLM calls / DB writes under redelivery)
Graceful degradation (fallback paths produce acceptable outputs)
DLQ correctness (terminal failures are classified, alerted, and replayable)

Tooling: Chaos Mesh on Kubernetes

Chaos Mesh is a Kubernetes-native chaos platform that supports multiple fault types via CRDs (e.g., PodChaos, NetworkChaos, StressChaos). 
26

It can inject faults like network impairments (NetworkChaos) 
27
 and HTTP-level faults (HTTPChaos) including delay/abort/replace/patch. 
28

Its architecture includes chaos components that perform injections (e.g., using traffic control rules and stress-ng). 
29

Experiments
Randomly kill workers

Objective: ensure Redis pending messages are reclaimed and processed; ensure idempotency prevents duplicates.

Fault injection:

PodChaos: kill N% of worker pods randomly during peak load.

Expected behaviors:

Unacked messages remain in PEL and get reclaimed via claiming mechanisms. Redis provides XCLAIM and XAUTOCLAIM for stale pending messages. 
2
The system never “loses” messages (at-least-once), but may redeliver, so step/job idempotency must prevent duplicate side effects. 
3

Validation metrics:

p99 job completion latency
duplicate DB writes (should be 0)
duplicate LLM spend per job (should be ~0 with caching/idempotency)
Inject LLM latency and LLM errors

Objective: validate retry/backoff/jitter, circuit breakers, and fallback model behavior.

Fault injection:

HTTPChaos delay: add 10–30s delays on outbound LLM requests 
28
HTTPChaos abort: inject 429/500 responses

Expected behaviors:

Retry with exponential backoff + jitter (avoid synchronized retries). 
16
If error rate sustained, circuit breaker opens and system uses fallback responses/models. 
18
429 paths respect Retry-After when present. 
6

Validation metrics:

retry attempt histogram
breaker open/close counts
fallback rate
DLQ rate (should rise only after retry budget exhausted)
Simulate DB failures and deadlocks

Objective: check DB retry logic correctness.

Fault injection:

NetworkChaos to partition worker ↔ DB connectivity 
27
Synthetic deadlocks via a load test that triggers SQLSTATE 40P01

Expected behaviors:

DB deadlocks / serializations are retried at transaction level; Postgres guidance explicitly calls out 40P01 as retryable. 
12
RLS denial is treated as terminal and escalated; RLS default-deny is expected when enabled with no policies. 
13

Validation metrics:

% successful retries vs failed
mean wasted work per job before recovery
DLQ composition (deadlocks should not dominate DLQ)
Force resource pressure (OOM / eviction)

Objective: validate behavior under memory blowups (SymPy worst cases, large contexts).

Fault injection:

StressChaos memory pressure
intentionally memory-heavy SymPy calls to reproduce OOM kills

Expected behaviors:

Container-level OOM results in OOMKilled / exit 137. 
11
Node pressure triggers kubelet evictions; node-pressure eviction behavior is kubelet-driven. 
14
No early XACK before durable state/checkpoint is saved.

Validation metrics:

OOMKilled event rate
message redelivery count
correctness (no partial DB writes, no duplicated final outputs)
A minimal chaos “scorecard” for pass/fail

Pass criteria should be explicit:

No job loss: every injected job is either SUCCEEDED or ends in DLQ with terminal classification.
Bounded retries: retry attempts never exceed configured node/stream budgets. 
8

No duplicated side effects: unique constraints / idempotency keys prevent duplicates (0 duplicate rows / 0 double-charge events).
Predictable degradation: under LLM/SymPy failures, system returns an “uncertain” answer rather than hanging indefinitely.
Replay works: a DLQ event can be replayed safely without forcing idempotency bypass.
