// Small in-memory limiter to protect the free AI quota from repeated clicks or abuse.
// Per server instance only; production should use a shared store (e.g. the database).
const hits = new Map<string, number[]>();
export function allow(key: string, limit = 8, windowMs = 60_000) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter(t => now - t < windowMs);
  if (list.length >= limit) { hits.set(key, list); return false; }
  list.push(now); hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return true;
}
