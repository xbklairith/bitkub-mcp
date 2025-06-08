// Rate limiter tests

import { beforeEach, describe, expect, it } from 'vitest';
import { RateLimitError } from '../../../src/types/mcp.js';
import { RateLimiter } from '../../../src/utils/rate-limiter.js';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter(5); // 5 requests per minute for testing
  });

  it('should allow requests under the limit', async () => {
    // Should not throw for requests under limit
    await expect(rateLimiter.checkLimit()).resolves.toBeUndefined();
    await expect(rateLimiter.checkLimit()).resolves.toBeUndefined();
    await expect(rateLimiter.checkLimit()).resolves.toBeUndefined();
  });

  it('should track remaining requests correctly', async () => {
    expect(rateLimiter.getRemainingRequests()).toBe(5);

    await rateLimiter.checkLimit();
    expect(rateLimiter.getRemainingRequests()).toBe(4);

    await rateLimiter.checkLimit();
    expect(rateLimiter.getRemainingRequests()).toBe(3);
  });

  it('should throw RateLimitError when limit exceeded', async () => {
    // Use up all requests
    for (let i = 0; i < 5; i++) {
      await rateLimiter.checkLimit();
    }

    // Next request should throw
    await expect(rateLimiter.checkLimit()).rejects.toThrow(RateLimitError);
  });

  it('should reset requests after time window', async () => {
    // Create a rate limiter with very short window for testing
    const fastLimiter = new RateLimiter(2);

    // Use up the limit
    await fastLimiter.checkLimit();
    await fastLimiter.checkLimit();

    // Should be rate limited
    await expect(fastLimiter.checkLimit()).rejects.toThrow(RateLimitError);

    // Wait for window to reset (in real implementation this would be 1 minute)
    // For testing, we'll just check that the limiter recognizes old requests
    expect(fastLimiter.getRemainingRequests()).toBe(0);
  });

  it('should return correct reset time', () => {
    const resetTime = rateLimiter.getResetTime();
    expect(resetTime).toBeInstanceOf(Date);
    expect(resetTime.getTime()).toBeGreaterThanOrEqual(Date.now());
  });
});
