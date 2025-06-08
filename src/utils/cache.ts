// Response Cache Implementation

interface CachedResponse<T = any> {
  data: T;
  expiry: number;
}

export class ResponseCache {
  private cache: Map<string, CachedResponse> = new Map();

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data as T;
    }

    // Clean up expired entry
    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  set<T>(key: string, data: T, ttlSeconds = 10): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (cached.expiry <= now) {
        this.cache.delete(key);
      }
    }
  }
}
