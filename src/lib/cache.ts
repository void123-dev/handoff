type Entry<T> = { expires: number; value: T };

const store = new Map<string, Entry<unknown>>();
const TTL_MS = 12_000;

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key) as Entry<T> | undefined;
  if (!hit) return undefined;
  if (Date.now() > hit.expires) {
    store.delete(key);
    return undefined;
  }
  return hit.value;
}

export function cacheSet<T>(key: string, value: T, ttlMs = TTL_MS): T {
  store.set(key, { expires: Date.now() + ttlMs, value });
  return value;
}

export function cacheKey(parts: Array<string | number>): string {
  return parts.join("|");
}
