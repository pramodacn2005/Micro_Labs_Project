const buckets = new Map();

export function assertWithinRateLimit(key, { limit = 5, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const existing = buckets.get(key) || [];
  const filtered = existing.filter((timestamp) => timestamp > windowStart);
  if (filtered.length >= limit) {
    buckets.set(key, filtered);
    return false;
  }
  filtered.push(now);
  buckets.set(key, filtered);
  return true;
}









