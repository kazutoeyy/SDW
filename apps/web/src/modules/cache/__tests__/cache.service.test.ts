import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis truoc khi import CacheService
vi.mock('@/lib/redis', () => {
  const store = new Map<string, { value: string; ttl?: number }>();
  return {
    redis: {
      get: vi.fn((key: string) => Promise.resolve(store.get(key)?.value ?? null)),
      set: vi.fn((key: string, value: string, _ex: string, ttl: number) => {
        store.set(key, { value, ttl });
        return Promise.resolve('OK');
      }),
      del: vi.fn((key: string) => {
        store.delete(key);
        return Promise.resolve(1);
      }),
      exists: vi.fn((key: string) => Promise.resolve(store.has(key) ? 1 : 0)),
    },
  };
});

import { CacheService } from '../cache.service';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService();
    vi.clearAllMocks();
  });

  it('phai tra ve null khi chua co cache', async () => {
    const result = await cache.getCachedPath('Article A', 'Article B', 'en');
    expect(result).toBeNull();
  });

  it('phai luu va doc lai duoc ket qua path', async () => {
    const mockPath = {
      source: { id: 1, title: 'A', url: 'http://a', language: 'en' as const },
      target: { id: 2, title: 'B', url: 'http://b', language: 'en' as const },
      path: [],
      degrees: 3,
      searchTimeMs: 1500,
      cached: false,
    };

    await cache.setCachedPath('Article A', 'Article B', 'en', mockPath);
    const result = await cache.getCachedPath('Article A', 'Article B', 'en');
    expect(result).toBeTruthy();
    expect(result?.degrees).toBe(3);
  });

  it('phai tra ve true khi kiem tra exists cho entry da cache', async () => {
    const mockPath = {
      source: { id: 1, title: 'X', url: 'http://x', language: 'vi' as const },
      target: { id: 2, title: 'Y', url: 'http://y', language: 'vi' as const },
      path: [],
      degrees: 2,
      searchTimeMs: 800,
      cached: false,
    };

    await cache.setCachedPath('X', 'Y', 'vi', mockPath);
    const exists = await cache.exists('X', 'Y', 'vi');
    expect(exists).toBe(true);
  });

  it('phai xoa duoc cache entry', async () => {
    const mockPath = {
      source: { id: 1, title: 'M', url: 'http://m', language: 'en' as const },
      target: { id: 2, title: 'N', url: 'http://n', language: 'en' as const },
      path: [],
      degrees: 1,
      searchTimeMs: 500,
      cached: false,
    };

    await cache.setCachedPath('M', 'N', 'en', mockPath);
    await cache.invalidate('M', 'N', 'en');
    const result = await cache.getCachedPath('M', 'N', 'en');
    expect(result).toBeNull();
  });
});
