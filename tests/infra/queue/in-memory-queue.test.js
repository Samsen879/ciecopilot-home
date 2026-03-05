import {
  calculateBackoffDelayMs,
  createInMemoryQueueAdapter,
  normalizeEnvelope,
} from '../../../api/infra/queue/index.js';

function buildEnvelope(overrides = {}) {
  return {
    idempotency_key: 'idem-1',
    trace_id: 'trace-1',
    stage: 'ingest',
    payload_version: 'v1',
    payload: { value: 1 },
    ...overrides,
  };
}

describe('infra queue foundation (in-memory adapter)', () => {
  it('normalizes required envelope fields', () => {
    const normalized = normalizeEnvelope({
      idempotency_key: 'idem-required',
    });

    expect(normalized).toEqual(
      expect.objectContaining({
        idempotency_key: 'idem-required',
        attempt: 0,
        stage: 'queued',
        payload_version: 'v1',
      }),
    );
    expect(normalized.job_id).toEqual(expect.any(String));
    expect(normalized.trace_id).toEqual(expect.any(String));
  });

  it('throws when required idempotency_key is missing', () => {
    expect(() => normalizeEnvelope({ trace_id: 'trace-only' })).toThrow(/idempotency_key/i);
  });

  it('supports enqueue -> claim -> ack flow', () => {
    const queue = createInMemoryQueueAdapter();
    const enqueueResult = queue.enqueue(buildEnvelope({ idempotency_key: 'idem-flow' }), { now: 1_000 });

    expect(enqueueResult).toEqual(
      expect.objectContaining({
        status: 'enqueued',
        duplicate: false,
      }),
    );

    const claimed = queue.claim({ now: 1_000 });
    expect(claimed).toEqual(
      expect.objectContaining({
        lease_id: expect.any(String),
      }),
    );
    expect(claimed.envelope.stage).toBe('claimed');

    const acked = queue.ack(claimed.lease_id, { now: 1_001 });
    expect(acked.status).toBe('acked');
    expect(queue.stats()).toEqual({ pending: 0, in_flight: 0, dlq: 0 });
  });

  it('rejects duplicate idempotency key while job is active', () => {
    const queue = createInMemoryQueueAdapter();
    const first = queue.enqueue(buildEnvelope({ idempotency_key: 'idem-dup' }), { now: 2_000 });
    const second = queue.enqueue(buildEnvelope({ idempotency_key: 'idem-dup' }), { now: 2_001 });

    expect(first.status).toBe('enqueued');
    expect(second).toEqual(
      expect.objectContaining({
        status: 'duplicate',
        duplicate: true,
        job_id: first.job_id,
      }),
    );
    expect(queue.stats().pending).toBe(1);
  });

  it('applies retry backoff and re-queues for future claim', () => {
    const queue = createInMemoryQueueAdapter({
      max_attempts: 3,
      backoff_policy: {
        base_delay_ms: 100,
        factor: 2,
        max_delay_ms: 1000,
      },
    });

    queue.enqueue(buildEnvelope({ idempotency_key: 'idem-retry' }), { now: 3_000 });
    const firstClaim = queue.claim({ now: 3_000 });
    const retryResult = queue.retry(firstClaim.lease_id, { now: 3_000, error: 'timeout' });

    expect(retryResult).toEqual(
      expect.objectContaining({
        status: 'retried',
        attempt: 1,
        delay_ms: 100,
        available_at_ms: 3_100,
      }),
    );

    expect(queue.claim({ now: 3_099 })).toBeNull();
    const secondClaim = queue.claim({ now: 3_100 });
    expect(secondClaim.envelope.attempt).toBe(1);
    expect(secondClaim.envelope.stage).toBe('claimed');
    expect(calculateBackoffDelayMs(2, { base_delay_ms: 100, factor: 2, max_delay_ms: 1000 })).toBe(200);
  });

  it('moves job into DLQ after max attempts exceeded', () => {
    const queue = createInMemoryQueueAdapter({
      max_attempts: 1,
      backoff_policy: { base_delay_ms: 50, factor: 2, max_delay_ms: 1000 },
    });

    queue.enqueue(buildEnvelope({ idempotency_key: 'idem-dlq-auto' }), { now: 4_000 });
    const claim1 = queue.claim({ now: 4_000 });
    const retry1 = queue.retry(claim1.lease_id, { now: 4_000, error: 'first-failure' });
    const claim2 = queue.claim({ now: retry1.available_at_ms });
    const retry2 = queue.retry(claim2.lease_id, { now: retry1.available_at_ms, error: 'second-failure' });

    expect(retry2.status).toBe('dlq');
    expect(retry2.reason).toBe('max_attempts_exceeded');
    expect(queue.stats().dlq).toBe(1);
    expect(queue.snapshot().dlq[0].envelope.stage).toBe('dlq');
  });

  it('supports manual to_dlq action', () => {
    const queue = createInMemoryQueueAdapter({ max_attempts: 2 });
    queue.enqueue(buildEnvelope({ idempotency_key: 'idem-dlq-manual' }), { now: 5_000 });

    const claim = queue.claim({ now: 5_000 });
    const dlqResult = queue.to_dlq(claim.lease_id, {
      now: 5_005,
      reason: 'poison_payload',
      error: 'schema mismatch',
    });

    expect(dlqResult).toEqual(
      expect.objectContaining({
        status: 'dlq',
        reason: 'poison_payload',
      }),
    );
    expect(queue.stats()).toEqual({ pending: 0, in_flight: 0, dlq: 1 });
    expect(queue.snapshot().dlq[0]).toEqual(
      expect.objectContaining({
        reason: 'poison_payload',
        error: 'schema mismatch',
      }),
    );
  });
});

