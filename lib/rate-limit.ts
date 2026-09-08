interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Best-effort fixed-window rate limiter kept in memory — same design and
 * same honest limitation as the sibling projects: this is scoped to a
 * single server instance, not distributed. Enough to stop a runaway client
 * on a single-instance/demo deployment; not a substitute for a real store
 * (Upstash/Redis) in front of production traffic.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): boolean {
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

export function resetRateLimits(): void {
  buckets.clear();
}
