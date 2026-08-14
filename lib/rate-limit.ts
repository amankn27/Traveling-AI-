/**
 * Fixed-window rate limiter, in-process.
 *
 * Good enough for a single Node instance. Behind multiple instances or on a
 * serverless platform this needs a shared store (Redis/Upstash) — the limiter is
 * per-process, so N instances multiply the effective limit by N.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();
const MAX_KEYS = 10_000;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    // Opportunistic sweep so a long-running process can't grow unbounded.
    if (windows.size > MAX_KEYS) {
      for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
    }
    const fresh: Window = { count: 1, resetAt: now + windowMs };
    windows.set(key, fresh);
    return { ok: true, remaining: limit - 1, resetAt: fresh.resetAt, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);

  return {
    ok: existing.count <= limit,
    remaining,
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/** Best-effort client identity. Spoofable — pair with real auth in production. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
  return ip;
}

export function rateLimitHeaders(result: RateLimitResult, limit: number): HeadersInit {
  return {
    'RateLimit-Limit': String(limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
    ...(result.ok ? {} : { 'Retry-After': String(result.retryAfterSeconds) }),
  };
}
