// Cache utility tests

import { beforeEach, describe, expect, it } from 'vitest';
import { ResponseCache } from '../../../src/utils/cache.js';

describe('ResponseCache', () => {
  let cache: ResponseCache;

  beforeEach(() => {
    cache = new ResponseCache();
  });

  it('should store and retrieve cached data', () => {
    const testData = { test: 'value' };
    cache.set('test-key', testData, 10);

    const retrieved = cache.get('test-key');
    expect(retrieved).toEqual(testData);
  });

  it('should return null for non-existent keys', () => {
    const result = cache.get('non-existent');
    expect(result).toBeNull();
  });

  it('should expire cached data after TTL', async () => {
    const testData = { test: 'value' };
    cache.set('test-key', testData, 0.1); // 100ms TTL

    // Should be available immediately
    expect(cache.get('test-key')).toEqual(testData);

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should be null after expiration
    expect(cache.get('test-key')).toBeNull();
  });

  it('should clear all cached data', () => {
    cache.set('key1', 'value1', 10);
    cache.set('key2', 'value2', 10);

    expect(cache.size()).toBe(2);

    cache.clear();

    expect(cache.size()).toBe(0);
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });

  it('should cleanup expired entries', async () => {
    cache.set('persistent', 'value', 10);
    cache.set('expiring', 'value', 0.1); // 100ms TTL

    expect(cache.size()).toBe(2);

    // Wait for one to expire
    await new Promise((resolve) => setTimeout(resolve, 150));

    cache.cleanup();

    expect(cache.size()).toBe(1);
    expect(cache.get('persistent')).toBe('value');
    expect(cache.get('expiring')).toBeNull();
  });
});
