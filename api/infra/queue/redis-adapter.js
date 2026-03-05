import { randomUUID } from 'node:crypto';
import { calculateBackoffDelayMs, normalizeBackoffPolicy } from './backoff.js';
import { normalizeEnvelope } from './envelope.js';

function nowMs(value) {
  return Number.isFinite(value) ? value : Date.now();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeParseJson(raw) {
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

export class RedisQueueAdapter {
  #redis;
  #prefix;
  #maxAttempts;
  #backoffPolicy;

  constructor(options = {}) {
    if (!options.redis || typeof options.redis !== 'object') {
      throw new Error('redis adapter requires options.redis client');
    }

    const maxAttempts = Number.isInteger(options.max_attempts) ? options.max_attempts : 3;
    if (maxAttempts < 0) {
      throw new Error('max_attempts must be >= 0');
    }

    this.#redis = options.redis;
    this.#prefix = options.namespace || 'queue';
    this.#maxAttempts = maxAttempts;
    this.#backoffPolicy = normalizeBackoffPolicy(options.backoff_policy);
  }

  async enqueue(envelopeInput, options = {}) {
    const enqueueAt = nowMs(options.now);
    const envelope = normalizeEnvelope(envelopeInput);
    const idemKey = this.#idempotencyKey();

    const setResult = await this.#hSetNx(idemKey, envelope.idempotency_key, envelope.job_id);
    if (!setResult) {
      const activeJobId = await this.#redis.hGet(idemKey, envelope.idempotency_key);
      return {
        status: 'duplicate',
        duplicate: true,
        job_id: activeJobId || envelope.job_id,
      };
    }

    const record = {
      envelope,
      visible_at_ms: Number.isFinite(options.visible_at_ms) ? options.visible_at_ms : enqueueAt,
      enqueued_at_ms: enqueueAt,
    };

    try {
      await this.#redis.set(this.#jobKey(envelope.job_id), JSON.stringify(record));
      await this.#zAdd(this.#pendingKey(), record.visible_at_ms, envelope.job_id);
    } catch (error) {
      await this.#redis.hDel(idemKey, envelope.idempotency_key);
      throw error;
    }

    return {
      status: 'enqueued',
      duplicate: false,
      job_id: envelope.job_id,
    };
  }

  async claim(options = {}) {
    const claimAt = nowMs(options.now);

    // Retrying while-loop handles race when multiple workers pick same visible job id.
    for (let i = 0; i < 5; i += 1) {
      const candidates = await this.#zRangeByScore(this.#pendingKey(), '-inf', claimAt, 1);
      if (candidates.length === 0) {
        return null;
      }

      const jobId = candidates[0];
      const removed = await this.#redis.zRem(this.#pendingKey(), jobId);
      if (!removed) {
        continue;
      }

      const rawRecord = await this.#redis.get(this.#jobKey(jobId));
      const pendingRecord = safeParseJson(rawRecord);
      if (!pendingRecord || !pendingRecord.envelope) {
        continue;
      }

      const inFlightRecord = {
        lease_id: `lease_${randomUUID()}`,
        claimed_at_ms: claimAt,
        envelope: {
          ...pendingRecord.envelope,
          stage: 'claimed',
        },
      };

      await this.#redis.hSet(
        this.#inFlightKey(),
        inFlightRecord.lease_id,
        JSON.stringify(inFlightRecord),
      );

      return clone(inFlightRecord);
    }

    return null;
  }

  async ack(leaseId, options = {}) {
    const inFlightRecord = await this.#loadInFlight(leaseId);
    if (!inFlightRecord) {
      return {
        status: 'missing_lease',
        lease_id: leaseId,
      };
    }

    await this.#redis.hDel(this.#inFlightKey(), leaseId);
    await this.#finalizeTerminal(inFlightRecord.envelope);

    return {
      status: 'acked',
      job_id: inFlightRecord.envelope.job_id,
      acked_at_ms: nowMs(options.now),
    };
  }

  async retry(leaseId, options = {}) {
    const inFlightRecord = await this.#loadInFlight(leaseId);
    if (!inFlightRecord) {
      return {
        status: 'missing_lease',
        lease_id: leaseId,
      };
    }

    await this.#redis.hDel(this.#inFlightKey(), leaseId);
    const retryAt = nowMs(options.now);
    const nextAttempt = inFlightRecord.envelope.attempt + 1;

    if (nextAttempt > this.#maxAttempts) {
      return this.#moveToDlqRecord(inFlightRecord, {
        moved_at_ms: retryAt,
        reason: 'max_attempts_exceeded',
        error: options.error,
      });
    }

    const delayMs = calculateBackoffDelayMs(nextAttempt, this.#backoffPolicy);
    const retriedEnvelope = {
      ...inFlightRecord.envelope,
      attempt: nextAttempt,
      stage: 'retry_scheduled',
    };

    if (options.error != null) {
      retriedEnvelope.last_error = String(options.error);
    }

    const record = {
      envelope: retriedEnvelope,
      visible_at_ms: retryAt + delayMs,
      enqueued_at_ms: retryAt,
    };

    await this.#redis.set(this.#jobKey(retriedEnvelope.job_id), JSON.stringify(record));
    await this.#zAdd(this.#pendingKey(), record.visible_at_ms, retriedEnvelope.job_id);

    return {
      status: 'retried',
      job_id: retriedEnvelope.job_id,
      attempt: retriedEnvelope.attempt,
      delay_ms: delayMs,
      available_at_ms: record.visible_at_ms,
    };
  }

  async to_dlq(leaseId, options = {}) {
    const inFlightRecord = await this.#loadInFlight(leaseId);
    if (!inFlightRecord) {
      return {
        status: 'missing_lease',
        lease_id: leaseId,
      };
    }

    await this.#redis.hDel(this.#inFlightKey(), leaseId);
    return this.#moveToDlqRecord(inFlightRecord, {
      moved_at_ms: nowMs(options.now),
      reason: options.reason || 'manual_dlq',
      error: options.error,
    });
  }

  async stats() {
    const [pending, inFlight, dlq] = await Promise.all([
      this.#redis.zCard(this.#pendingKey()),
      this.#redis.hLen(this.#inFlightKey()),
      this.#redis.lLen(this.#dlqKey()),
    ]);

    return {
      pending: Number(pending || 0),
      in_flight: Number(inFlight || 0),
      dlq: Number(dlq || 0),
    };
  }

  async snapshot() {
    const [pendingIds, inFlightMap, dlqRaw] = await Promise.all([
      this.#zRangeByScore(this.#pendingKey(), '-inf', '+inf'),
      this.#hGetAll(this.#inFlightKey()),
      this.#lRange(this.#dlqKey(), 0, -1),
    ]);

    const pending = [];
    for (const jobId of pendingIds) {
      const rawRecord = await this.#redis.get(this.#jobKey(jobId));
      const record = safeParseJson(rawRecord);
      if (record) {
        pending.push(clone(record));
      }
    }

    const inFlight = Object.values(inFlightMap)
      .map((raw) => safeParseJson(raw))
      .filter(Boolean)
      .map((item) => clone(item));

    const dlq = normalizeList(dlqRaw)
      .map((raw) => safeParseJson(raw))
      .filter(Boolean)
      .map((item) => clone(item));

    return {
      pending,
      in_flight: inFlight,
      dlq,
    };
  }

  async #loadInFlight(leaseId) {
    const raw = await this.#redis.hGet(this.#inFlightKey(), leaseId);
    const parsed = safeParseJson(raw);
    if (!parsed || !parsed.envelope) {
      return null;
    }
    return parsed;
  }

  async #moveToDlqRecord(inFlightRecord, options = {}) {
    const movedAt = nowMs(options.moved_at_ms);
    const dlqRecord = {
      envelope: {
        ...inFlightRecord.envelope,
        stage: 'dlq',
      },
      moved_at_ms: movedAt,
      reason: options.reason || 'unknown',
      error: options.error != null ? String(options.error) : null,
    };

    await this.#redis.rPush(this.#dlqKey(), JSON.stringify(dlqRecord));
    await this.#finalizeTerminal(dlqRecord.envelope);

    return {
      status: 'dlq',
      job_id: dlqRecord.envelope.job_id,
      reason: dlqRecord.reason,
      moved_at_ms: movedAt,
    };
  }

  async #finalizeTerminal(envelope) {
    await Promise.all([
      this.#redis.hDel(this.#idempotencyKey(), envelope.idempotency_key),
      this.#redis.del(this.#jobKey(envelope.job_id)),
    ]);
  }

  async #hSetNx(key, field, value) {
    if (typeof this.#redis.hSetNX === 'function') {
      const result = await this.#redis.hSetNX(key, field, value);
      return Number(result) === 1;
    }

    const existing = await this.#redis.hGet(key, field);
    if (existing != null) return false;
    await this.#redis.hSet(key, field, value);
    return true;
  }

  async #zAdd(key, score, value) {
    return this.#redis.zAdd(key, [{ score, value }]);
  }

  async #zRangeByScore(key, min, max, limitCount = null) {
    const options = limitCount != null
      ? { LIMIT: { offset: 0, count: limitCount } }
      : undefined;
    return normalizeList(await this.#redis.zRangeByScore(key, min, max, options));
  }

  async #hGetAll(key) {
    if (typeof this.#redis.hGetAll === 'function') {
      return (await this.#redis.hGetAll(key)) || {};
    }
    return {};
  }

  async #lRange(key, start, stop) {
    if (typeof this.#redis.lRange === 'function') {
      return await this.#redis.lRange(key, start, stop);
    }
    return [];
  }

  #pendingKey() {
    return `${this.#prefix}:pending`;
  }

  #inFlightKey() {
    return `${this.#prefix}:inflight`;
  }

  #idempotencyKey() {
    return `${this.#prefix}:idempotency`;
  }

  #dlqKey() {
    return `${this.#prefix}:dlq`;
  }

  #jobKey(jobId) {
    return `${this.#prefix}:job:${jobId}`;
  }
}

export function createRedisQueueAdapter(options = {}) {
  return new RedisQueueAdapter(options);
}

