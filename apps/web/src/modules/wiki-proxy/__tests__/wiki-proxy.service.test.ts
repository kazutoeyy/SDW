import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WikiProxyService } from '../wiki-proxy.service';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('WikiProxyService', () => {
  let service: WikiProxyService;

  beforeEach(() => {
    service = new WikiProxyService(1000); // Rate limit cao de khong bi chan trong test
    mockFetch.mockReset();
  });

  describe('getArticleInfo', () => {
    it('phai tra ve thong tin bai viet khi ton tai', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            query: {
              pages: {
                '12345': { pageid: 12345, title: 'Vietnam', ns: 0 },
              },
            },
          }),
      });

      const result = await service.getArticleInfo('Vietnam', 'en');
      expect(result.exists).toBe(true);
      expect(result.pageid).toBe(12345);
      expect(result.title).toBe('Vietnam');
    });

    it('phai tra ve exists=false khi bai viet khong ton tai', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            query: {
              pages: {
                '-1': { pageid: -1, title: 'NonExistentArticle', missing: true },
              },
            },
          }),
      });

      const result = await service.getArticleInfo('NonExistentArticle', 'en');
      expect(result.exists).toBe(false);
    });
  });

  describe('getWikiLinks', () => {
    it('phai tra ve danh sach wikilinks tu bai viet', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            query: {
              pages: {
                '12345': {
                  pageid: 12345,
                  title: 'Vietnam',
                  links: [
                    { ns: 0, title: 'Hanoi' },
                    { ns: 0, title: 'Ho Chi Minh City' },
                    { ns: 0, title: 'Southeast Asia' },
                  ],
                },
              },
            },
          }),
      });

      const links = await service.getWikiLinks('Vietnam', 'en');
      expect(links).toHaveLength(3);
      expect(links).toContain('Hanoi');
      expect(links).toContain('Ho Chi Minh City');
    });
  });

  describe('searchArticles', () => {
    it('phai tra ve danh sach ket qua Autocomplete', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            query: {
              search: [
                { title: 'Vietnam', pageid: 12345, snippet: 'Country in...' },
                { title: 'Vietnamese language', pageid: 67890, snippet: 'Language of...' },
              ],
            },
          }),
      });

      const results = await service.searchArticles('Viet', 'en', 5);
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Vietnam');
    });
  });

  describe('Exponential Backoff', () => {
    it('phai retry khi nhan 429 va thanh cong sau lan thu 2', async () => {
      // Lan 1: 429
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });
      // Lan 2: thanh cong
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            query: {
              pages: {
                '1': { pageid: 1, title: 'Test', ns: 0 },
              },
            },
          }),
      });

      const result = await service.getArticleInfo('Test', 'en');
      expect(result.exists).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, 10000); // Timeout 10s cho backoff delay
  });
});
