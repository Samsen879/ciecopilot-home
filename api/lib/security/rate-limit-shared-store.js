import { getServiceClient } from '../supabase/client.js';

function normalizeRpcRow(row) {
  return {
    allowed: Boolean(row?.allowed),
    remaining: Number(row?.remaining ?? 0),
    retryAfterMs: Math.max(Number(row?.retry_after_ms ?? 0), 0),
    degraded: Boolean(row?.degraded),
    store: row?.store || 'shared',
  };
}

export class SharedRateLimitStore {
  constructor({ rpcName = 'consume_shared_rate_limit' } = {}) {
    this.rpcName = rpcName;
  }

  async consume(key, { limit, windowMs }) {
    const client = getServiceClient();
    const { data, error } = await client.rpc(this.rpcName, {
      p_scope_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });
    if (error) {
      throw error;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return normalizeRpcRow(row);
  }
}
