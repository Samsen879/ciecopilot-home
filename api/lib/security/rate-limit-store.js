import { MemoryRateLimitStore } from './rate-limit-memory-store.js';
import { SharedRateLimitStore } from './rate-limit-shared-store.js';

let memoryStore = new MemoryRateLimitStore();
let sharedStore = null;
let forcedBackend = null;

function getPreferredBackend() {
  if (forcedBackend) return forcedBackend;
  if (process.env.NODE_ENV === 'test') return 'memory';
  return process.env.RATE_LIMIT_BACKEND || 'shared';
}

function allowDegrade() {
  return process.env.RATE_LIMIT_ALLOW_DEGRADE !== 'false';
}

function getSharedStore() {
  if (!sharedStore) {
    sharedStore = new SharedRateLimitStore();
  }
  return sharedStore;
}

export async function consumeRateLimitViaStore(key, policy) {
  const backend = getPreferredBackend();
  if (backend === 'memory') {
    return memoryStore.consume(key, policy);
  }

  try {
    return await getSharedStore().consume(key, policy);
  } catch (error) {
    if (!allowDegrade()) {
      throw error;
    }
    const fallback = await memoryStore.consume(key, policy);
    return {
      ...fallback,
      degraded: true,
      store: 'memory',
      degrade_reason: error?.message || String(error),
    };
  }
}

export async function resetRateLimitStoresForTest() {
  await memoryStore.reset();
  forcedBackend = 'memory';
}

export function setRateLimitBackendForTest(backend) {
  forcedBackend = backend;
}

export function clearRateLimitBackendOverrideForTest() {
  forcedBackend = null;
}
