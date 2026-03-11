# 选题24-DS-ChatGPT

- 原始报告标题：Deep Research: Redis Streams for a Cross-Language Async Job System in CIE-Copilot
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:15:57.278Z

Deep Research: Redis Streams for a Cross-Language Async Job System in CIE-Copilot
Context and decision criteria

Samsen, the core of your CIE-Copilot design is a cross-language, long-running asynchronous pipeline: a Node.js web layer produces jobs, while a Python worker executes LangGraph multi-agent workflows that can take 30–60 seconds (or longer under retries, rate limits, or transient upstream slowness). In this shape of system, the “message system” is not just a transport; it becomes part of your reliability boundary.

For your PRD requirements, the message layer must support:

At-least-once delivery (duplicates are allowed; losses are not).
Explicit acknowledgements after successful processing.
Crash recovery with a reclaim mechanism for in-flight work.
A Dead Letter Queue (DLQ) path after bounded retries.
Operational observability: backlog/lag, pending/in-flight load, and DLQ growth.

Redis Streams consumer groups natively model these requirements: reading via XREADGROUP creates a Pending Entries List (PEL) entry, and the consumer must later XACK to remove that entry from the PEL; otherwise it remains pending and can be inspected or reclaimed. 
1

For crash recovery, XAUTOCLAIM is explicitly designed to scan and claim stale pending entries (conceptually XPENDING + XCLAIM with cursor-like iteration). 
2

The most important framing detail: your jobs are expensive (LLM calls, multi-step agent reasoning), so “duplicate work” is not just a correctness issue; it is a cost and latency issue. That pushes you toward configurations that minimize accidental duplicate execution, even while remaining at-least-once.

Redis Streams vs alternatives in a Node.js producer and Python consumer architecture

This section answers your most important question directly: is Redis Streams “the best” choice for Node.js Producer + Python Consumer? The rigorous answer is conditional, because the “best” depends on what you optimize for (infrastructure reuse vs broker semantics vs operational burden vs long-term scale).

Redis Streams as the baseline

Redis Streams consumer groups provide:

Work sharding across consumers in a group (each entry has a single owner unless reclaimed). 
1
At-least-once semantics by default when you use PEL + XACK after completion. 
3
Reclaiming stalled messages with XAUTOCLAIM based on idle time. 
2
Measurable lag/backlog with XINFO GROUPS (lag and pending metrics). 
4

The main gap versus “full queue systems” is that Streams do not inherently provide first-class delayed delivery, retry backoff scheduling, job state/history, and admin tooling. You can build these, but you will be building them.

BullMQ

Your PRD reasoning states BullMQ is Node-native and cross-language support is weak. That was historically a fair concern, but it is now partially outdated:

BullMQ has an official Python library on PyPI; it describes itself as a close port and claims interoperability with Node queues because both use the same Lua scripts. 
5
However, both the official docs and PyPI metadata also signal maturity risk: the Python docs label it “experimental,” and PyPI lists its development status as “Alpha,” plus it explicitly says not all Node features are supported yet. 
6

BullMQ’s main advantage is that it gives you queue features “out of the box” (delays, retries/backoff, dedup, progress/events) that you otherwise must implement yourself on top of Streams. The BullMQ Python library lists features already ported, including job retries/backoff and deduplication. 
5

My opinion (pragmatic): if you are comfortable adopting an alpha/experimental Python dependency and want built-in scheduling/retry semantics (and possibly future UI/admin tooling), BullMQ is now a real candidate. If stability and long-term operability are more important than feature convenience, Redis Streams remains lower-risk because it relies on stable Redis primitives rather than a young cross-language port.

Celery with Redis broker

Celery is Python-native and operationally mature for Python ecosystems. But cross-language in your specific direction (Node producer → Python consumer) is a weak point:

Celery’s docs state the protocol “can be implemented in any language” and explicitly mention a Node client (node-celery). 
7
The main node-celery GitHub repository is archived and read-only (archived May 31, 2020), which is a strong signal against basing a production cross-language producer on it. 
8

More critically: using Redis as a Celery broker introduces a “visibility timeout” concept (redelivery if not acked in time), and Celery’s own docs warn that long visibility timeouts can delay recovery of lost tasks after worker termination; they also warn that Redis key eviction can break broker correctness if misconfigured. 
9

So Celery is excellent when both ends are Python and you want a batteries-included task system, but for a Node.js-first producer it tends to become a protocol-compatibility project that you will own.

RabbitMQ (AMQP)

RabbitMQ is designed as a broker with strong, well-documented cross-language semantics:

It has explicit consumer acknowledgements and reliability mechanisms built around acknowledgements for data safety. 
10
It has first-class dead-lettering through Dead Letter Exchanges (DLX) with clear triggers (nack/reject, TTL expiration, queue length limits, delivery-limit for quorum queues). 
11

On the other hand, choosing RabbitMQ introduces additional operational surface area: broker deployment, clustering, monitoring, upgrades, and operational tuning. If you already run Redis but not RabbitMQ, this is a real cost.

My opinion: if CIE-Copilot grows into a “core platform primitive” and you want mature queue semantics + tooling with minimal custom logic, RabbitMQ is often the cleanest long-term broker for cross-language job processing. If this is a smaller product component and you strongly value infrastructure reuse, Redis Streams is reasonable.

Kafka

Kafka is excellent when you need durable event streaming at scale, long retention, replay, and partitioned consumption:

Kafka is designed to store events durably and retain them as long as you configure; events are not deleted after consumption in the way classic queues operate. 
12
Kafka guarantees ordering within a partition (consumers read a topic-partition’s events in the order written). 
12
At-least-once vs at-most-once vs exactly-once semantics depend heavily on offset commit timing and producer configuration; by default, at-least-once is typical, and committing before processing yields at-most-once behavior. 
13

The downside is operational and conceptual complexity (“heavy ops”): cluster sizing, partitions, rebalancing, retention policies, schemas, etc. For your stated throughput (~4000 msgs/day), Kafka is almost certainly unnecessary overhead unless you have a strong organizational reason (existing Kafka platform, multi-consumer analytics/event sourcing requirements).

Cross-language conclusion

For your current scale and constraints, Redis Streams is a strong choice if you treat Redis as reliable infrastructure (no eviction surprises, correct persistence, and clear operational runbooks). Redis Streams natively provide consumer groups, PEL tracking, acknowledgements, and reclaim patterns that match at-least-once requirements. 
1

However, two facts change the landscape:

BullMQ now has an official Python library and is interoperable, but is still labeled experimental/alpha. 
5
Redis itself is adding more queue-like features (for example, XADD includes idempotent production options as of Redis 8.6). 
14

Decision rule I would use:

Choose Redis Streams if you prioritize infrastructure reuse, transparency, and stable primitives, and you’re willing to implement retry/DLQ tooling yourself.
Choose RabbitMQ if you want a mature broker with canonical queue semantics and less custom “queue engineering.”
Consider BullMQ only if you specifically want its built-in delayed/retry/dedup features and you accept the Python maturity risk today. 
5
Consumer group operational best practices for long-running LangGraph jobs

When to XACK in an “education AI” workload

The Redis model is explicit: XREADGROUP delivers messages into the PEL, and XACK removes them from the PEL once the server can consider them processed at least once. 
1

Redis also supports NOACK, which effectively acknowledges at read-time and bypasses the PEL; the docs describe this as suitable only when reliability is not required and occasional loss is acceptable. 
1

Given your PRD (“at-least-once allowed, duplicates OK, but do not lose work”), the correct policy is:

ACK after successful completion, never at the start.

This is not just Redis orthodoxy; it’s the same logic as Kafka consumer offsets: committing before processing gives at-most-once semantics (loss on crash), while committing after processing gives at-least-once (duplicates on crash). 
13

For LangGraph/LLM workloads specifically, early-ACK is usually irrational: it converts transient worker death into permanent job loss, which is worse than duplicates in a human-facing education system.

Setting XAUTOCLAIM min-idle-time with 60-second jobs

XAUTOCLAIM claims messages that have been pending and idle longer than a configured min-idle-time (milliseconds). 
2

Claiming resets idle time and reduces the chance that two consumers claim the same message at the same instant. 
2

The failure mode you must avoid is premature reclaim: consumer A is still legitimately executing a 60s job, but consumer B claims it at (say) 30s because min-idle-time is too low. That creates duplicate LLM runs and can violate “do not execute twice.”

A practical setting rule for your PRD envelope is:

Let Tproc_max = worst-case single-attempt runtime (start with 60s, but include upstream rate-limit tail latency).
Let Tretry_budget = worst-case total runtime including in-process retries and backoff (your PRD can be up to ~60s × (1 + retries) + backoff windows; if you truly do 3 retries after the first attempt, you can exceed 4 minutes).
Set min-idle-time ≥ Tretry_budget + safety margin.

Recommendation for your stated workload: start with 300,000 ms (5 minutes). This is conservative enough to prevent most accidental duplicate execution during legitimate long processing.

If 5 minutes is too slow for crash recovery, do not immediately lower it to 60–90s; instead, add a heartbeat concept:

periodically “touch” the message using XCLAIM with the same consumer and IDLE option to reset idle time while still processing. XCLAIM supports IDLE <ms> for setting idle time metadata. 
15

This keeps min-idle-time as a real “worker dead” threshold rather than a “job is slow” threshold.

Consumer ID naming and “ghost consumers” after restarts

Redis requires each consumer in a group to have a unique consumer name (string). 
1

Redis can also report per-consumer pending, idle, and inactive times using XINFO CONSUMERS. 
16

In container environments like Kubernetes, restarts can create many abandoned consumer names (“ghost consumers”). This is mostly cosmetic unless you mishandle deletion.

The dangerous operation is XGROUP DELCONSUMER: the docs warn that if you delete a consumer, its pending messages become unclaimable, and recommend claiming or acknowledging pending messages before deleting. 
17

Therefore:

Use a consumer name format that is unique per process start (so collisions are unlikely), for example:
worker:{hostname}:{pod_uid}:{pid}:{boot_ts}
Implement a periodic “consumer janitor” that:
enumerates consumers via XINFO CONSUMERS, 
16
reclaims any pending work (via XAUTOCLAIM) before deleting, 
2
only then removes fully drained consumers if you really need to keep the consumer list clean. 
17
Worker concurrency and process counts

Use XINFO GROUPS lag trends to decide when to scale consumers up or down: the Redis docs explicitly describe lag as a scaling signal (high lag → add consumers; low lag → remove). 
4

For LangGraph workloads, “how many worker processes?” is not a Redis question—it’s a resource and dependency question:

If jobs are mostly external API calls (LLM provider requests), the workload is often I/O-bound; you can run fewer processes with higher async concurrency.
If jobs run local inference (GPU) or heavy parsing, the workload can be GPU/CPU-bound; you want concurrency closer to the physical resource limits.

A safe starting point is:

one Python worker process per available CPU core only if the job is CPU-heavy,
otherwise, one process per pod with async concurrency tuned to external provider rate limits and memory headroom.
Python redis-py consumer group template with reclaim, retries, and DLQ

Below is a configuration template that implements:

XREADGROUP for new messages (PEL-based reliability). 
1
XAUTOCLAIM for reclaiming stalled messages. 
2
XACK after success or DLQ handoff. 
3
python
复制
import json
import os
import socket
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

import redis

STREAM_JOBS = "cie_copilot:jobs"
STREAM_DLQ = "cie_copilot:dlq"
GROUP_WORKERS = "workers"

# Conservative default for 60s jobs + retries
MIN_IDLE_MS = 300_000  # 5 minutes
READ_BLOCK_MS = 5_000
READ_COUNT = 10

MAX_RETRIES = 3
BACKOFF_MS = 2_000

# For idempotency and locking (see later section)
IDEMP_TTL_SEC = 24 * 3600


@dataclass
class JobEnvelope:
    job_id: str
    job_type: str
    idempotency_key: str
    user_id: str
    trace_id: str
    payload: Dict[str, Any]
    retry_count: int
    max_retries: int
    backoff_ms: int
    created_at: str


def make_consumer_name() -> str:
    host = socket.gethostname()
    pid = os.getpid()
    boot_ts = int(time.time())
    return f"worker-{host}-{pid}-{boot_ts}"


def parse_envelope(fields: Dict[str, str]) -> JobEnvelope:
    # Recommended: store the entire envelope as one JSON field, e.g. {"envelope": "...json..."}
    raw = fields.get("envelope")
    if not raw:
        raise ValueError("Missing 'envelope' field in stream entry")
    obj = json.loads(raw)
    return JobEnvelope(**obj)


def try_acquire_idempotency(r: redis.Redis, idem_key: str, job_id: str) -> bool:
    # Atomic "claim": only one worker proceeds for a given idempotency_key within TTL.
    # Uses SET NX EX pattern (see idempotency section).
    key = f"cie:idemp:{idem_key}"
    return bool(r.set(key, job_id, nx=True, ex=IDEMP_TTL_SEC))


def send_to_dlq(r: redis.Redis, env: JobEnvelope, err: str, original_msg_id: str) -> None:
    dlq_obj = {
        **env.__dict__,
        "original_stream": STREAM_JOBS,
        "original_msg_id": original_msg_id,
        "failed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "error": err[:4000],  # safeguard against unbounded stack traces
    }
    r.xadd(STREAM_DLQ, {"envelope": json.dumps(dlq_obj)})


def process_job(env: JobEnvelope) -> None:
    """
    Your LangGraph execution pipeline would run here.
    Must be idempotent with respect to env.idempotency_key and side effects.
    """
    # Example placeholder
    # result = run_langgraph(env.payload, trace_id=env.trace_id, user_id=env.user_id)
    # persist_result(result)
    return


def handle_message(
    r: redis.Redis,
    msg_id: str,
    fields: Dict[str, str],
) -> None:
    env = parse_envelope(fields)

    # Idempotency guard: if already processed (or in-flight), do not execute again.
    if not try_acquire_idempotency(r, env.idempotency_key, env.job_id):
        r.xack(STREAM_JOBS, GROUP_WORKERS, msg_id)
        return

    attempt = 0
    last_err: Optional[str] = None

    while attempt <= MAX_RETRIES:
        try:
            process_job(env)
            r.xack(STREAM_JOBS, GROUP_WORKERS, msg_id)
            return
        except Exception as e:
            last_err = f"{type(e).__name__}: {e}"
            attempt += 1
            if attempt <= MAX_RETRIES:
                time.sleep(BACKOFF_MS / 1000.0)
            else:
                send_to_dlq(r, env, last_err, msg_id)
                r.xack(STREAM_JOBS, GROUP_WORKERS, msg_id)
                return


def worker_main(redis_url: str) -> None:
    r = redis.Redis.from_url(redis_url, decode_responses=True)

    consumer = make_consumer_name()

    # Ensure group exists (create stream if missing). Safe to ignore BUSYGROUP errors.
    try:
        r.xgroup_create(name=STREAM_JOBS, groupname=GROUP_WORKERS, id="0-0", mkstream=True)
    except redis.exceptions.ResponseError as e:
        if "BUSYGROUP" not in str(e):
            raise

    claim_cursor = "0-0"

    while True:
        # 1) Reclaim stalled messages (PEL recovery)
        try:
            next_cursor, claimed, deleted = r.xautoclaim(
                STREAM_JOBS, GROUP_WORKERS, consumer,
                MIN_IDLE_MS, start=claim_cursor, count=READ_COUNT
            )
            claim_cursor = next_cursor if next_cursor else "0-0"
            for mid, f in claimed:
                handle_message(r, mid, f)
        except redis.exceptions.ResponseError:
            # If Redis < 6.2, XAUTOCLAIM is unavailable; you'd fall back to XPENDING+XCLAIM.
            pass

        # 2) Read new messages
        resp = r.xreadgroup(
            groupname=GROUP_WORKERS,
            consumername=consumer,
            streams={STREAM_JOBS: ">"},
            count=READ_COUNT,
            block=READ_BLOCK_MS,
        )
        if not resp:
            continue

        for _stream_name, messages in resp:
            for mid, f in messages:
                handle_message(r, mid, f)


if __name__ == "__main__":
    worker_main(os.environ["REDIS_URL"])


Notes about correctness and semantics:

This pattern relies on PEL + XACK for reliability. 
1
XAUTOCLAIM returns a cursor-like next-id plus claimed entries and deleted IDs, and claims only messages idle longer than min-idle-time. 
18
Idempotency and concurrency control strategy

Your PRD requires: “same idempotency_key must not be executed twice.” In an at-least-once system, that must be enforced at the consumer side (and ideally also at the producer side to reduce duplicates).

Redis-based idempotency key store

The simplest, effective Redis pattern is SET key value NX EX ttl, which is an atomic claim that also sets an expiration. Redis’s own docs describe this pattern for locking and mutual exclusion (with a note that Redlock provides stronger guarantees in multi-node setups). 
19

For your case, the idempotency record can be interpreted as:

“first worker to set this key wins” (executes the job),
all others skip.

This is fast and keeps the idempotency system close to the queue.

Limitations you should accept explicitly:

If Redis is flushed/restarted without persistence, you can lose idempotency keys (and re-execute jobs).
TTL-based idempotency is only as strong as your TTL window (you chose 24h; that’s a policy choice, not a correctness proof).
Postgres unique constraints as the durable “do not execute twice” gate

Postgres gives you a more durable, auditable solution: store a job record keyed by idempotency_key with a unique constraint, and have workers attempt INSERT ... ON CONFLICT DO NOTHING. PostgreSQL’s docs describe ON CONFLICT handling as the mechanism for handling unique constraint conflicts during insert. 
20

This yields:

durability across Redis restarts,
an authoritative job ledger for debugging and traceability.

Trade-off:

It introduces a DB round-trip per job attempt (which is usually negligible compared to LLM runtime).

My opinion: for an education AI system where duplicate LLM execution is costly, I would treat Postgres as the source of truth for idempotency and job status, and optionally keep Redis-idempotency as a caching optimization (not as the correctness boundary).

Handling concurrency races and “two workers process the same entry”

In Redis Streams consumer groups, a message generally has a single owner, but it can be reclaimed; Redis notes that only one consumer can successfully claim a pending message at a specific instant because claiming resets idle time, which “trivially reduces” (not eliminates) multiple processing. 
15

In practice, you still need a defense against:

misconfigured min-idle-time (premature claim),
long GC pauses or stuck workers,
explicit operational reprocessing tools (DLQ replay).

Recommended lock hierarchy (strongest to weakest):

Postgres unique insert gate (idempotency_key unique). 
20
Redis idempotency/lock claim (SET ... NX EX). 
19
If you need multi-step atomic mutations (e.g., “claim + set status + enqueue continuation”), use a Redis Lua script so the steps are atomic; Redis guarantees Lua scripts execute atomically. 
21
LangGraph checkpoint idempotency

LangGraph provides built-in persistence through checkpointers: it saves checkpoints of graph state at every “super-step” and can replay or resume a thread via thread_id. 
22

LangGraph’s durable execution guidance is explicit: to avoid repeating side effects on resume, workflows should be deterministic and idempotent, and side-effecting operations should be wrapped in “tasks” so results can be retrieved from persistence instead of repeated. 
23

For your system, a robust mapping is:

Use job_id as (or inside) the LangGraph thread_id, ensuring a job’s workflow state is resumable across worker crashes. 
22
Ensure any side-effecting nodes (writing results, billing, sending events) are either:
protected by the global idempotency_key gate, or
implemented using LangGraph tasks that store outputs and prevent re-execution on resume. 
23

This directly aligns with your “at-least-once transport, exactly-once effects” goal: the queue may redeliver, but the workflow and its side effects should converge to a single outcome.

Optional producer-side deduplication in Redis 8.6+

Redis XADD now supports “idempotent message processing” options (IDMPAUTO / IDMP) to prevent duplicate entries at production time (documented as available since Redis 8.6). 
14

If you can rely on Redis ≥ 8.6, you can reduce producer-side duplicates (e.g., Next.js retries due to HTTP timeouts) by mapping:

producer-id = stable identifier for Service A instance (or service name),
idempotent-id = hash of your PRD idempotency_key.

This does not replace consumer idempotency (redelivery still exists), but it reduces accidental duplicate enqueues.

DLQ operations manual for cie_copilot:dlq

A DLQ is only useful if it is operationally easy to understand and replay. Your DLQ design is a Redis Stream with a consumer group dlq_processors, which is consistent with the same PEL/ack/reclaim model as the main queue. 
1

DLQ message schema and classification

When moving a message to DLQ, include:

Original envelope (job_id, job_type, idempotency_key, trace_id, payload, retry_count, created_at).
Failure metadata:
failed_at
error_type (exception class or normalized category)
error_message (truncated)
stacktrace (optional, truncated)
Provenance:
original_stream
original_msg_id
possibly consumer that last owned it

Tagging strategy that scales well:

job_type (ASK_AI / MARK_MATH / ERROR_BOOK / NAVIGATE)
error_type taxonomy (TRANSIENT_UPSTREAM, TIMEOUT, VALIDATION, AUTH, INTERNAL, RATE_LIMIT, etc.)

This makes dashboards and replay filters straightforward.

Monitoring and alert thresholds

You can monitor:

Main backlog: XINFO GROUPS provides lag (undelivered entries estimate) and pending (PEL length). 
4
Consumer health: XINFO CONSUMERS provides per-consumer pending, idle, and inactive metrics. 
16
DLQ growth: stream length via XLEN (operationally) and/or XINFO GROUPS lag for the DLQ consumer group if you also process DLQ automatically. 
4

A pragmatic alerting stance for your scale:

Alert if DLQ length is > 0 for more than N minutes, because at 4000 msgs/day you should rarely tolerate untriaged DLQ entries.
Alert if main group lag is persistently rising (trend matters more than absolute at small scale).
Alert if pending is high and the oldest pending idle time exceeds min-idle-time by a wide margin (indicates stuck consumers or idempotency deadlocks).

Wire these into your metrics system (e.g., OpenTelemetry + Prometheus + Grafana) as gauges.

Replay tooling design

A DLQ replay tool should support three modes:

Selective replay: by job_id / trace_id / job_type / error_type / time range.
Batch replay: replay the “top K” or all messages that match a filter.
Modify-and-replay: patch envelope fields (e.g., fix payload schema errors, adjust parameters) before re-enqueue.

Safety constraints for replay:

Preserve the original job_id for traceability, but consider whether idempotency_key should be preserved:
If the failure was transient and you want “same logical job,” keep it.
If you intentionally want to execute again (rare), you must change it (or explicitly override the idempotency gate).

Mechanically, replay is: read DLQ entry → (optional patch) → XADD to main jobs stream → XACK in DLQ group when successfully requeued. XADD is the canonical way to append to a stream. 
14

DLQ retention and cleanup

DLQ retention is a product and compliance decision. Operationally, you implement it with stream trimming:

Use XTRIM with MAXLEN to cap DLQ entries, or MINID for time-like trimming based on stream IDs. 
24

A common pragmatic policy is 14–30 days retention unless you have audit requirements. Given your low volume, disk/memory is unlikely to be a constraint; human operability (“how far back do we debug?”) is the real driver.

Stream capacity, trimming, and Redis persistence choices
MAXLEN vs MINID and when you should trim at all

Redis supports trimming via:

XADD with a cap (e.g., XADD ... MAXLEN ~ 1000 * ...), and it notes approximate trimming (~) is usually more efficient due to internal stream representation. 
14
XTRIM with MAXLEN or MINID, with exact (=) or approximate (~) trimming. 
24

For your stated traffic: 4000 messages/day.
Even if you keep 30 days of history, that’s ~120,000 entries. Whether this is “small” depends on payload size, but in count terms it is not huge.

So should you trim? My recommendation is:

Yes, implement a cap so growth is bounded, but keep it generous so trimming never deletes messages that could still be pending/unprocessed.
Prefer MAXLEN ~ at first because it’s operationally simple and efficient. 
14

A concrete starting point:

cie_copilot:jobs: MAXLEN ~ 200000
cie_copilot:dlq: MAXLEN ~ 50000 (or much smaller if you want stricter hygiene)

Two stream-specific cautions:

Trimming can affect lag reporting: XINFO GROUPS explains that lag can become NULL if entries between last-delivered-id and last-generated-id were deleted via trimming or XDEL. 
4
Do not trim aggressively if you have long-running pending messages; deleting entries that are still needed is logically equivalent to message loss.
Measuring real memory usage

Because stream entry overhead depends on key/value sizes and Redis internals, do not guess: measure.

Redis’s MEMORY USAGE reports the bytes used by a key and its administrative overhead. 
25

This is the practical way to confirm whether your envelope size (especially if payload contains large text) is safe to store directly in Streams or whether you should store only a pointer (e.g., job_id referencing Postgres/object storage).

Persistence: AOF vs RDB for Streams used as a queue

Redis persistence is not optional if you treat Streams as a queue you cannot lose. Redis documents the persistence modes:

RDB snapshots at intervals.
AOF logs every write operation and can be replayed at startup.
You can disable persistence entirely (common for caching).
You can combine RDB + AOF. 
26

Key properties (from Redis docs):

RDB can lose the most recent minutes of data depending on snapshot interval; it’s not good when you need to minimize data loss. 
26
AOF has configurable fsync policies; the default “every second” is described as fast and “you can only lose one second worth of writes” in a disaster. 
26

For your PRD reliability requirements, I would not run the job stream on a Redis configured as a pure cache (no persistence). If your deployment uses managed Redis (for example Amazon Web Services or Microsoft Azure offerings), ensure the persistence and eviction policies match “queue durability,” not “cache best-effort.” Redis persistence trade-offs are also emphasized in vendor guidance (e.g., Azure describing AOF as more durable but with more performance impact; RDB as less impactful but with more loss risk). 
27

Eviction policy and shared Redis risks

If the same Redis instance is used for caching and queueing, memory pressure can cause key eviction. Even Celery’s Redis broker docs explicitly warn that key eviction can remove broker keys unexpectedly and recommend configuring Redis to avoid eviction surprises (e.g., using maxmemory-policy as noeviction or carefully selected policies). 
9

For Streams used as queues, the safest stance is:

separate Redis instance (or at least strict memory isolation) for job streams, or
set eviction policies so stream keys are not evicted under pressure.

This is a reliability boundary decision: if queued jobs matter, don’t let them compete with cache churn.
