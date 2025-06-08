// Rate Limiter for Bitkub Public API

import { RateLimitError } from '../types/mcp.js';

export class RateLimiter {
  private requestTimes: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequestsPerMinute = 100) {
    this.maxRequests = maxRequestsPerMinute;
    this.windowMs = 60 * 1000; // 1 minute
  }

  async checkLimit(): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Remove old requests outside the window
    this.requestTimes = this.requestTimes.filter((time) => time > windowStart);

    if (this.requestTimes.length >= this.maxRequests) {
      // Calculate how long to wait
      const oldestRequest = this.requestTimes[0];
      if (oldestRequest) {
        const waitTimeMs = oldestRequest + this.windowMs - now;
        const waitTimeSeconds = Math.ceil(waitTimeMs / 1000);

        throw new RateLimitError(waitTimeSeconds);
      }
    }

    // Record this request
    this.requestTimes.push(now);
  }

  getRemainingRequests(): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Clean up old requests
    this.requestTimes = this.requestTimes.filter((time) => time > windowStart);

    return Math.max(0, this.maxRequests - this.requestTimes.length);
  }

  getResetTime(): Date {
    if (this.requestTimes.length === 0) {
      return new Date();
    }

    const oldestRequest = this.requestTimes[0];
    return new Date((oldestRequest || 0) + this.windowMs);
  }
}
