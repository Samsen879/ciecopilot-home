import { randomUUID } from 'node:crypto';
import { calculateBackoffDelayMs, normalizeBackoffPolicy } from './backoff.js';
import { normalizeEnvelope } from './envelope.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowMs(value) {
  return Number.isFinite(value) ? value : Date.now();
}

export class InMemoryQueueAdapter {
  #pending;
  #inFlight;
  #dlq;
  #idempotencyIndex;
  #maxAttempts;
  #backoffPolicy;

  constructor(options = {}) {
    const maxAttempts = Number.isInteger(options.max_attempts) ? options.max_attempts : 3;
    if (maxAttempts < 0) {
      throw new Error('max_attempts must be >= 0');
    }

    this.#maxAttempts = maxAttempts;
    this.#backoffPolicy = normalizeBackoffPolicy(options.backoff_policy);
    this.#pending = [];
    this.#inFlight = new Map();
    this.#dlq = [];
    this.#idempotencyIndex = new Map();
  }

  enqueue(envelopeInput, options = {}) {
    const enqueueAt = nowMs(options.now);
    const envelope = normalizeEnvelope(envelopeInput);
    const activeJob = this.#idempotencyIndex.get(envelope.idempotency_key);

    if (activeJob) {
      return {
        status: 'duplicate',
        duplicate: true,
        job_id: activeJob.job_id,
      };
    }

    const record = {
      envelope,
      visible_at_ms: Number.isFinite(options.visible_at_ms) ? options.visible_at_ms : enqueueAt,
      enqueued_at_ms: enqueueAt,
    };

    this.#pending.push(record);
    this.#sortPending();
    this.#idempotencyIndex.set(envelope.idempotency_key, { job_id: envelope.job_id });

    return {
      status: 'enqueued',
      duplicate: false,
      job_id: envelope.job_id,
    };
  }

  claim(options = {}) {
    const claimAt = nowMs(options.now);
    const targetIndex = this.#pending.findIndex((record) => record.visible_at_ms <= claimAt);

    if (targetIndex < 0) {
      return null;
    }

    const [record] = this.#pending.splice(targetIndex, 1);
    const lease_id = `lease_${randomUUID()}`;
    const inFlightRecord = {
      lease_id,
      claimed_at_ms: claimAt,
      envelope: {
        ...record.envelope,
        stage: 'claimed',
      },
    };

    this.#inFlight.set(lease_id, inFlightRecord);
    return clone(inFlightRecord);
  }

  ack(leaseId, options = {}) {
    const inFlight = this.#inFlight.get(leaseId);
    if (!inFlight) {
      return {
        status: 'missing_lease',
        lease_id: leaseId,
      };
    }

    this.#inFlight.delete(leaseId);
    this.#idempotencyIndex.delete(inFlight.envelope.idempotency_key);

    return {
      status: 'acked',
      job_id: inFlight.envelope.job_id,
      acked_at_ms: nowMs(options.now),
    };
  }

  retry(leaseId, options = {}) {
    const inFlight = this.#inFlight.get(leaseId);
    if (!inFlight) {
      return {
        status: 'missing_lease',
        lease_id: leaseId,
      };
    }

    this.#inFlight.delete(leaseId);
    const retryAt = nowMs(options.now);
    const nextAttempt = inFlight.envelope.attempt + 1;

    if (nextAttempt > this.#maxAttempts) {
      return this.#moveToDlqRecord(inFlight, {
        moved_at_ms: retryAt,
        reason: 'max_attempts_exceeded',
        error: options.error,
      });
    }

    const delayMs = calculateBackoffDelayMs(nextAttempt, this.#backoffPolicy);
    const retriedEnvelope = {
      ...inFlight.envelope,
      attempt: nextAttempt,
      stage: 'retry_scheduled',
    };

    if (options.error != null) {
      retriedEnvelope.last_error = String(options.error);
    }

    this.#pending.push({
      envelope: retriedEnvelope,
      visible_at_ms: retryAt + delayMs,
      enqueued_at_ms: retryAt,
    });
    this.#sortPending();

    return {
      status: 'retried',
      job_id: retriedEnvelope.job_id,
      attempt: retriedEnvelope.attempt,
      delay_ms: delayMs,
      available_at_ms: retryAt + delayMs,
    };
  }

  to_dlq(leaseId, options = {}) {
    const inFlight = this.#inFlight.get(leaseId);
    if (!inFlight) {
      return {
        status: 'missing_lease',
        lease_id: leaseId,
      };
    }

    this.#inFlight.delete(leaseId);
    return this.#moveToDlqRecord(inFlight, {
      moved_at_ms: nowMs(options.now),
      reason: options.reason || 'manual_dlq',
      error: options.error,
    });
  }

  stats() {
    return {
      pending: this.#pending.length,
      in_flight: this.#inFlight.size,
      dlq: this.#dlq.length,
    };
  }

  snapshot() {
    return {
      pending: this.#pending.map((record) => clone(record)),
      in_flight: Array.from(this.#inFlight.values()).map((record) => clone(record)),
      dlq: this.#dlq.map((record) => clone(record)),
    };
  }

  #moveToDlqRecord(inFlightRecord, options) {
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

    this.#dlq.push(dlqRecord);
    this.#idempotencyIndex.delete(dlqRecord.envelope.idempotency_key);

    return {
      status: 'dlq',
      job_id: dlqRecord.envelope.job_id,
      reason: dlqRecord.reason,
      moved_at_ms: movedAt,
    };
  }

  #sortPending() {
    this.#pending.sort((a, b) => {
      if (a.visible_at_ms !== b.visible_at_ms) {
        return a.visible_at_ms - b.visible_at_ms;
      }
      return a.enqueued_at_ms - b.enqueued_at_ms;
    });
  }
}

export function createInMemoryQueueAdapter(options = {}) {
  return new InMemoryQueueAdapter(options);
}

