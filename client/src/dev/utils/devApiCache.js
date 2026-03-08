const memoryCache = new Map();

const readSessionCache = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeSessionCache = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota and private mode failures
  }
};

export async function getCachedValue(key, ttlMs, fetcher) {
  const now = Date.now();

  const memoryEntry = memoryCache.get(key);
  if (memoryEntry && now - memoryEntry.timestamp < ttlMs) {
    return memoryEntry.data;
  }

  const sessionEntry = readSessionCache(key);
  if (sessionEntry && now - Number(sessionEntry.timestamp || 0) < ttlMs) {
    memoryCache.set(key, sessionEntry);
    return sessionEntry.data;
  }

  const data = await fetcher();
  const entry = { data, timestamp: now };
  memoryCache.set(key, entry);
  writeSessionCache(key, entry);
  return data;
}

export function invalidateCachedValue(key) {
  memoryCache.delete(key);
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

