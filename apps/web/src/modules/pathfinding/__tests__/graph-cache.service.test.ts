import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock SQL db module
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  getDbConnection: vi.fn(),
}));

import { GraphCacheService } from '../graph-cache.service';
import { query } from '@/lib/db';

const mockQuery = vi.mocked(query);

describe('GraphCacheService', () => {
  let service: GraphCacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GraphCacheService();
  });

  describe('savePath', () => {
    it('phai khong lam gi khi path co it hon 2 node', async () => {
      await service.savePath(['SingleNode'], 'en');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('phai goi query de insert Articles va Wikilinks', async () => {
      // Mock: khong co article nao ton tai san
      mockQuery.mockResolvedValue([] as any);

      await service.savePath(['A', 'B', 'C'], 'en');

      // Phai goi query nhieu lan:
      // 3 lan SELECT kiem tra Article ton tai + 3 lan INSERT Article
      // + 2 lan SELECT $node_id (moi cap) + 2 lan SELECT kiem tra Edge + 2 lan INSERT Edge
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('lookupCachedPath', () => {
    it('phai tra ve duong di khi SQL Graph co du lieu', async () => {
      mockQuery.mockResolvedValueOnce([
        { PathTitles: 'B|C|D' },
      ] as any);

      const result = await service.lookupCachedPath('A', 'D', 'en');
      expect(result).toEqual(['A', 'B', 'C', 'D']);
    });

    it('phai tra ve null khi SQL Graph khong co du lieu', async () => {
      mockQuery.mockResolvedValueOnce([] as any);

      const result = await service.lookupCachedPath('X', 'Y', 'en');
      expect(result).toBeNull();
    });

    it('phai tra ve null khi SQL query throw error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('SQL error'));

      const result = await service.lookupCachedPath('A', 'B', 'en');
      expect(result).toBeNull();
    });
  });
});
