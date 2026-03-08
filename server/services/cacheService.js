export function createCacheService({ ttlMs = 30 * 1000 } = {}) {
  const cache = new Map();

  const get = (key) => {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    return entry.value;
  };

  const set = (key, value, itemTtlMs = ttlMs) => {
    cache.set(key, {
      value,
      expiresAt: Date.now() + Math.max(1000, Number(itemTtlMs) || ttlMs),
    });
  };

  const clear = () => {
    cache.clear();
    return true;
  };

  const buildKey = (prefix, schoolId, query = {}) =>
    `${prefix}:${String(schoolId || "none")}:${JSON.stringify(query || {})}`;

  return { get, set, clear, buildKey };
}

