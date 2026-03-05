export class MemoryRateLimitStore {
  constructor() {
    this.store = new Map();
  }

  now() {
    return Date.now();
  }

  cleanup(key, windowMs) {
    const bucket = this.store.get(key);
    if (!bucket) return [];
    const cutoff = this.now() - windowMs;
    const filtered = bucket.filter((ts) => ts > cutoff);
    if (filtered.length === 0) {
      this.store.delete(key);
      return [];
    }
    this.store.set(key, filtered);
    return filtered;
  }

  async consume(key, { limit, windowMs }) {
    if (!key) {
      return {
        allowed: true,
        remaining: limit,
        retryAfterMs: 0,
        store: 'memory',
      };
    }

    const bucket = this.cleanup(key, windowMs);
    if (bucket.length >= limit) {
      const retryAfterMs = windowMs - (this.now() - bucket[0]);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(retryAfterMs, 0),
        store: 'memory',
      };
    }

    bucket.push(this.now());
    this.store.set(key, bucket);
    return {
      allowed: true,
      remaining: Math.max(limit - bucket.length, 0),
      retryAfterMs: 0,
      store: 'memory',
    };
  }

  async reset() {
    this.store.clear();
  }
}
