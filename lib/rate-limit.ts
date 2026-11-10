type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Basic in-memory brute-force protection (per process). */
export function rateLimit(key: string, limit = 8, windowMs = 10 * 60 * 1000): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  existing.count += 1;
  if (existing.count > limit) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
