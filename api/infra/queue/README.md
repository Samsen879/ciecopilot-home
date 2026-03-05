# Infra Queue Adapters

This directory contains interchangeable queue adapters that share the same core interface:

- `enqueue(envelope, options)`
- `claim(options)`
- `ack(leaseId, options)`
- `retry(leaseId, options)`
- `to_dlq(leaseId, options)`

Current adapters:

- `in-memory-adapter.js`: local-only baseline adapter.
- `redis-adapter.js`: production-oriented adapter backed by Redis primitives.

## Envelope Contract

Adapters use the same envelope contract from `envelope.js`:

- `job_id`
- `idempotency_key`
- `trace_id`
- `attempt`
- `stage`
- `payload_version`

## Redis Adapter Notes

`RedisQueueAdapter` expects `options.redis` client methods compatible with:

- hash: `hGet`, `hSet`, `hDel`, `hLen`, optional `hSetNX`, optional `hGetAll`
- string: `set`, `get`, `del`
- sorted set: `zAdd`, `zRem`, `zCard`, `zRangeByScore`
- list: `rPush`, `lLen`, optional `lRange`

Default key namespace is `queue`; can be overridden with `options.namespace`.

Semantics:

- Idempotency is enforced by `idempotency_key` while job is active.
- Retry uses exponential backoff from `backoff.js`.
- Exceeded retries are moved to DLQ with `reason = max_attempts_exceeded`.

## Running Tests Without Redis

Redis adapter tests use an in-process fake client (no Redis server needed):

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/infra/queue/redis-adapter.test.js
```

