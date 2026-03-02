const cache = new Map();

function pickExport(mod) {
  if (!mod) return null;
  if (typeof mod.default === 'function') return mod.default;
  if (typeof mod.handler === 'function') return mod.handler;
  if (typeof mod === 'function') return mod;
  return null;
}

function isExpressRouter(fn) {
  return (
    typeof fn === 'function' &&
    typeof fn.use === 'function' &&
    typeof fn.handle === 'function' &&
    Array.isArray(fn.stack)
  );
}

export async function loadHandler(importPath) {
  if (cache.has(importPath)) {
    return cache.get(importPath);
  }
  const mod = await import(importPath);
  const target = pickExport(mod);
  if (typeof target !== 'function') {
    throw new Error(`Invalid handler export from ${importPath}`);
  }

  const loaded = {
    handler: target,
    kind: isExpressRouter(target) ? 'express_router' : 'handler',
  };
  cache.set(importPath, loaded);
  return loaded;
}

export function _resetHandlerCacheForTest() {
  cache.clear();
}

