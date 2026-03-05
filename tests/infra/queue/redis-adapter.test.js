import { createRedisQueueAdapter } from '../../../api/infra/queue/index.js';

class FakeRedis {
  #hashes = new Map();
  #strings = new Map();
  #zsets = new Map();
  #lists = new Map();

  async hGet(key, field) {
    return this.#hashes.get(key)?.get(field) ?? null;
  }

  async hSet(key, field, value) {
    const target = this.#ensureHash(key);
    target.set(field, String(value));
    return 1;
  }

  async hSetNX(key, field, value) {
    const target = this.#ensureHash(key);
    if (target.has(field)) return 0;
    target.set(field, String(value));
    return 1;
  }

  async hDel(key, field) {
    const target = this.#hashes.get(key);
    if (!target || !target.has(field)) return 0;
    target.delete(field);
    return 1;
  }

  async hLen(key) {
    return this.#hashes.get(key)?.size ?? 0;
  }

  async hGetAll(key) {
    const target = this.#hashes.get(key);
    if (!target) return {};
    return Object.fromEntries(target.entries());
  }

  async set(key, value) {
    this.#strings.set(key, String(value));
    return 'OK';
  }

  async get(key) {
    return this.#strings.get(key) ?? null;
  }

  async del(key) {
    const existed = this.#strings.has(key);
    this.#strings.delete(key);
    return existed ? 1 : 0;
  }

  async zAdd(key, entries) {
    const target = this.#ensureZSet(key);
    let added = 0;
    for (const entry of entries) {
      const score = Number(entry.score);
      const value = String(entry.value);
      if (!target.some((item) => item.value === value)) {
        added += 1;
      }
      const withoutSameMember = target.filter((item) => item.value !== value);
      withoutSameMember.push({ score, value });
      withoutSameMember.sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.value.localeCompare(b.value);
      });
      this.#zsets.set(key, withoutSameMember);
    }
    return added;
  }

  async zRem(key, member) {
    const target = this.#zsets.get(key) || [];
    const filtered = target.filter((entry) => entry.value !== String(member));
    this.#zsets.set(key, filtered);
    return target.length === filtered.length ? 0 : 1;
  }

  async zCard(key) {
    return (this.#zsets.get(key) || []).length;
  }

  async zRangeByScore(key, min, max, options = undefined) {
    const minValue = this.#resolveBound(min, Number.NEGATIVE_INFINITY);
    const maxValue = this.#resolveBound(max, Number.POSITIVE_INFINITY);
    const target = this.#zsets.get(key) || [];
    const values = target
      .filter((entry) => entry.score >= minValue && entry.score <= maxValue)
      .map((entry) => entry.value);

    const count = options?.LIMIT?.count;
    if (Number.isInteger(count)) {
      return values.slice(0, count);
    }
    return values;
  }

  async rPush(key, value) {
    const target = this.#ensureList(key);
    target.push(String(value));
    return target.length;
  }

  async lLen(key) {
    return (this.#lists.get(key) || []).length;
  }

  async lRange(key, start, stop) {
    const target = this.#lists.get(key) || [];
    const safeStart = Math.max(0, Number(start || 0));
    const safeStop = Number(stop) === -1 ? target.length - 1 : Number(stop || 0);
    if (safeStop < safeStart) return [];
    return target.slice(safeStart, safeStop + 1);
  }

  #ensureHash(key) {
    if (!this.#hashes.has(key)) {
      this.#hashes.set(key, new Map());
    }
    return this.#hashes.get(key);
  }

  #ensureZSet(key) {
    if (!this.#zsets.has(key)) {
      this.#zsets.set(key, []);
    }
    return this.#zsets.get(key);
  }

  #ensureList(key) {
    if (!this.#lists.has(key)) {
      this.#lists.set(key, []);
    }
    return this.#lists.get(key);
  }

  #resolveBound(value, fallback) {
    if (value === '-inf') return Number.NEGATIVE_INFINITY;
    if (value === '+inf') return Number.POSITIVE_INFINITY;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    return fallback;
  }
}

function buildEnvelope(overrides = {}) {
  return {
    idempotency_key: 'idem-redis-1',
    trace_id: 'trace-redis-1',
    stage: 'ingest',
    payload_version: 'v1',
    payload: { source: 'redis-test' },
    ...overrides,
  };
}

describe('infra queue foundation (redis adapter)', () => {
  it('supports enqueue -> claim -> ack flow', async () => {
    const queue = createRedisQueueAdapter({
      redis: new FakeRedis(),
      namespace: 'test:flow',
    });

    const enqueueResult = await queue.enqueue(buildEnvelope(), { now: 10_000 });
    expect(enqueueResult.status).toBe('enqueued');

    const claimed = await queue.claim({ now: 10_000 });
    expect(claimed).toEqual(
      expect.objectContaining({
        lease_id: expect.any(String),
      }),
    );
    expect(claimed.envelope.stage).toBe('claimed');

    const acked = await queue.ack(claimed.lease_id, { now: 10_001 });
    expect(acked).toEqual(
      expect.objectContaining({
        status: 'acked',
        job_id: enqueueResult.job_id,
      }),
    );
    await expect(queue.stats()).resolves.toEqual({ pending: 0, in_flight: 0, dlq: 0 });
  });

  it('preserves idempotency semantics while active and releases on terminal state', async () => {
    const queue = createRedisQueueAdapter({
      redis: new FakeRedis(),
      namespace: 'test:idem',
    });

    const first = await queue.enqueue(buildEnvelope({ idempotency_key: 'idem-key' }), { now: 20_000 });
    const duplicate = await queue.enqueue(buildEnvelope({ idempotency_key: 'idem-key' }), { now: 20_001 });

    expect(first.status).toBe('enqueued');
    expect(duplicate).toEqual(
      expect.objectContaining({
        status: 'duplicate',
        duplicate: true,
        job_id: first.job_id,
      }),
    );

    const claim = await queue.claim({ now: 20_001 });
    await queue.ack(claim.lease_id, { now: 20_002 });

    const second = await queue.enqueue(buildEnvelope({ idempotency_key: 'idem-key' }), { now: 20_003 });
    expect(second.status).toBe('enqueued');
  });

  it('applies retry backoff and keeps claim visibility behavior', async () => {
    const queue = createRedisQueueAdapter({
      redis: new FakeRedis(),
      namespace: 'test:retry',
      max_attempts: 3,
      backoff_policy: {
        base_delay_ms: 100,
        factor: 2,
        max_delay_ms: 1000,
      },
    });

    await queue.enqueue(buildEnvelope({ idempotency_key: 'idem-retry' }), { now: 30_000 });
    const firstClaim = await queue.claim({ now: 30_000 });
    const retryResult = await queue.retry(firstClaim.lease_id, {
      now: 30_000,
      error: 'transient timeout',
    });

    expect(retryResult).toEqual(
      expect.objectContaining({
        status: 'retried',
        attempt: 1,
        delay_ms: 100,
        available_at_ms: 30_100,
      }),
    );

    await expect(queue.claim({ now: 30_099 })).resolves.toBeNull();

    const secondClaim = await queue.claim({ now: 30_100 });
    expect(secondClaim.envelope.attempt).toBe(1);
    expect(secondClaim.envelope.stage).toBe('claimed');
    expect(secondClaim.envelope.last_error).toBe('transient timeout');
  });

  it('moves jobs to DLQ when max attempts exceeded and via manual to_dlq', async () => {
    const queue = createRedisQueueAdapter({
      redis: new FakeRedis(),
      namespace: 'test:dlq',
      max_attempts: 1,
      backoff_policy: {
        base_delay_ms: 50,
        factor: 2,
        max_delay_ms: 1000,
      },
    });

    await queue.enqueue(buildEnvelope({ idempotency_key: 'idem-dlq-auto' }), { now: 40_000 });
    const claim1 = await queue.claim({ now: 40_000 });
    const retry1 = await queue.retry(claim1.lease_id, { now: 40_000, error: 'first-error' });
    const claim2 = await queue.claim({ now: retry1.available_at_ms });
    const autoDlq = await queue.retry(claim2.lease_id, { now: retry1.available_at_ms, error: 'second-error' });

    expect(autoDlq).toEqual(
      expect.objectContaining({
        status: 'dlq',
        reason: 'max_attempts_exceeded',
      }),
    );

    await queue.enqueue(buildEnvelope({ idempotency_key: 'idem-dlq-manual' }), { now: 40_100 });
    const claim3 = await queue.claim({ now: 40_100 });
    const manualDlq = await queue.to_dlq(claim3.lease_id, {
      now: 40_101,
      reason: 'poison_payload',
      error: 'bad-shape',
    });
    expect(manualDlq.reason).toBe('poison_payload');

    await expect(queue.stats()).resolves.toEqual({ pending: 0, in_flight: 0, dlq: 2 });
    const snapshot = await queue.snapshot();
    expect(snapshot.dlq.length).toBe(2);
    expect(snapshot.dlq[1]).toEqual(
      expect.objectContaining({
        reason: 'poison_payload',
        error: 'bad-shape',
      }),
    );
  });
});

