import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock cac dependency -- phai mock dung constructor pattern (class)
vi.mock('@/modules/wiki-proxy/wiki-proxy.service', () => {
  const mockGetArticleInfo = vi.fn();
  const mockGetWikiLinks = vi.fn();
  const mockSearchArticles = vi.fn();
  return {
    WikiProxyService: class {
      getArticleInfo = mockGetArticleInfo;
      getWikiLinks = mockGetWikiLinks;
      searchArticles = mockSearchArticles;
    },
    __mockGetArticleInfo: mockGetArticleInfo,
    __mockGetWikiLinks: mockGetWikiLinks,
  };
});

vi.mock('@/modules/cache/cache.service', () => {
  const mockGetCachedPath = vi.fn().mockResolvedValue(null);
  const mockSetCachedPath = vi.fn().mockResolvedValue(undefined);
  return {
    CacheService: class {
      getCachedPath = mockGetCachedPath;
      setCachedPath = mockSetCachedPath;
    },
    __mockGetCachedPath: mockGetCachedPath,
  };
});

vi.mock('./graph-cache.service', () => {
  return {
    GraphCacheService: class {
      lookupCachedPath = vi.fn().mockResolvedValue(null);
      savePath = vi.fn().mockResolvedValue(undefined);
    },
  };
});

vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
  },
}));

import { PathfindingService } from '../pathfinding.service';

describe('PathfindingService', () => {
  let service: PathfindingService;
  let mockGetArticleInfo: ReturnType<typeof vi.fn>;
  let mockGetWikiLinks: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Lay mock functions tu module da mock
    const wikiModule = await import('@/modules/wiki-proxy/wiki-proxy.service') as any;
    mockGetArticleInfo = wikiModule.__mockGetArticleInfo;
    mockGetWikiLinks = wikiModule.__mockGetWikiLinks;

    service = new PathfindingService();
  });

  it('phai throw loi khi source khong ton tai tren Wikipedia', async () => {
    mockGetArticleInfo
      .mockResolvedValueOnce({ pageid: -1, title: 'NonExistent', exists: false })
      .mockResolvedValueOnce({ pageid: 1, title: 'Target', exists: true });

    await expect(service.findPath('NonExistent', 'Target', 'en')).rejects.toThrow(
      'khong ton tai',
    );
  });

  it('phai throw loi khi target khong ton tai tren Wikipedia', async () => {
    mockGetArticleInfo
      .mockResolvedValueOnce({ pageid: 1, title: 'Source', exists: true })
      .mockResolvedValueOnce({ pageid: -1, title: 'NonExistent', exists: false });

    await expect(service.findPath('Source', 'NonExistent', 'en')).rejects.toThrow(
      'khong ton tai',
    );
  });

  it('phai tra ve degrees = 0 khi source va target la cung 1 bai viet', async () => {
    mockGetArticleInfo
      .mockResolvedValueOnce({ pageid: 100, title: 'Vietnam', exists: true })
      .mockResolvedValueOnce({ pageid: 100, title: 'Vietnam', exists: true });

    const result = await service.findPath('Vietnam', 'Vietnam', 'en');
    expect(result.degrees).toBe(0);
    expect(result.path).toHaveLength(1);
    expect(result.path[0].title).toBe('Vietnam');
    expect(result.cached).toBe(false);
  });

  it('phai tim duoc duong di truc tiep khi 2 bai viet co link lien ket (1 degree)', async () => {
    mockGetArticleInfo
      .mockResolvedValueOnce({ pageid: 1, title: 'A', exists: true })
      .mockResolvedValueOnce({ pageid: 2, title: 'B', exists: true });

    // Forward: A co link den B (giao ngay voi backward visited)
    mockGetWikiLinks.mockResolvedValueOnce(['B', 'C', 'D']);

    const result = await service.findPath('A', 'B', 'en');

    // Phai tim thay duong di (it nhat 1 degree)
    expect(result.degrees).toBeGreaterThanOrEqual(1);
    expect(result.path.length).toBeGreaterThanOrEqual(2);
    expect(result.cached).toBe(false);
    expect(result.searchTimeMs).toBeGreaterThanOrEqual(0);
  });
});
