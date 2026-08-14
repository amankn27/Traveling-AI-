import { describe, expect, it, vi, afterEach } from 'vitest';
import { clientKey, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

afterEach(() => vi.useRealTimers());

let n = 0;
const freshKey = () => `test-${Date.now()}-${n++}`;

describe('rateLimit', () => {
  it('allows requests up to the limit', () => {
    const key = freshKey();
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
  });

  it('blocks the request that exceeds it', () => {
    const key = freshKey();
    for (let i = 0; i < 3; i += 1) rateLimit(key, 3, 60_000);
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('counts each key separately', () => {
    const a = freshKey();
    const b = freshKey();
    for (let i = 0; i < 3; i += 1) rateLimit(a, 3, 60_000);
    expect(rateLimit(a, 3, 60_000).ok).toBe(false);
    expect(rateLimit(b, 3, 60_000).ok).toBe(true);
  });

  it('reports remaining capacity as it is consumed', () => {
    const key = freshKey();
    expect(rateLimit(key, 3, 60_000).remaining).toBe(2);
    expect(rateLimit(key, 3, 60_000).remaining).toBe(1);
    expect(rateLimit(key, 3, 60_000).remaining).toBe(0);
  });

  it('opens a fresh window once the old one expires', () => {
    vi.useFakeTimers();
    const key = freshKey();
    for (let i = 0; i < 3; i += 1) rateLimit(key, 3, 1_000);
    expect(rateLimit(key, 3, 1_000).ok).toBe(false);

    vi.advanceTimersByTime(1_100);
    expect(rateLimit(key, 3, 1_000).ok).toBe(true);
  });
});

describe('clientKey', () => {
  it('uses the first hop of x-forwarded-for', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '203.0.113.7, 70.41.3.18' },
    });
    expect(clientKey(request)).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip, then to a local sentinel', () => {
    expect(clientKey(new Request('https://e.com', { headers: { 'x-real-ip': '198.51.100.4' } }))).toBe('198.51.100.4');
    expect(clientKey(new Request('https://e.com'))).toBe('local');
  });
});

describe('rateLimitHeaders', () => {
  it('omits Retry-After while under the limit', () => {
    const headers = rateLimitHeaders(rateLimit(freshKey(), 5, 60_000), 5) as Record<string, string>;
    expect(headers['RateLimit-Limit']).toBe('5');
    expect(headers['Retry-After']).toBeUndefined();
  });

  it('sets Retry-After once blocked', () => {
    const key = freshKey();
    for (let i = 0; i < 2; i += 1) rateLimit(key, 2, 60_000);
    const headers = rateLimitHeaders(rateLimit(key, 2, 60_000), 2) as Record<string, string>;
    expect(headers['Retry-After']).toBeDefined();
  });
});
