export function createCacheService({ ttlMs = 30 * 1000, maxEntries = 1000 } = {}) {
  const cache = new Map();

  const get = (key) => {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    // LRU touch: move key to the end of insertion order when read.
    cache.delete(key);
    cache.set(key, entry);
    return entry.value;
  };

  const set = (key, value, itemTtlMs = ttlMs) => {
    if (cache.has(key)) cache.delete(key);
    cache.set(key, {
      value,
      expiresAt: Date.now() + Math.max(1000, Number(itemTtlMs) || ttlMs),
    });
    while (cache.size > Math.max(100, Number(maxEntries) || 1000)) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
  };

  const clear = () => {
    cache.clear();
    return true;
  };

  const buildKey = (prefix, schoolId, query = {}) =>
    `${prefix}:${String(schoolId || "none")}:${JSON.stringify(query || {})}`;

  return { get, set, clear, buildKey };
}
