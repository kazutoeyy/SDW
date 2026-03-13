import { WikiProxyService } from '@/modules/wiki-proxy/wiki-proxy.service';
import { redis } from '@/lib/redis';
import type { WikiLanguage } from '@/types';

// Cache TTL cho ket qua search: 5 phut (tranh spam API khi user go lien tuc)
const SEARCH_CACHE_TTL = 5 * 60;

const wikiProxy = new WikiProxyService();

/**
 * SearchService -- Phuc vu Autocomplete tim bai viet Wikipedia
 * Ket hop WikiProxy + Redis cache de giam tai cho MediaWiki API
 */
export class SearchService {
  /**
   * Tim kiem bai viet Wikipedia voi cache layer
   * Uu tien tra ve ket qua tu Redis neu da co, neu khong se goi API va luu cache
   */
  async search(
    query: string,
    language: WikiLanguage,
    limit = 10,
  ): Promise<Array<{ title: string; pageid: number; snippet: string }>> {
    if (!query || query.trim().length < 2) return [];

    const cacheKey = `search:${language}:${query.toLowerCase().trim()}:${limit}`;

    try {
      // Kiem tra Redis cache truoc
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Redis khong kha dung -> bo qua cache, goi truc tiep API
    }

    // Goi Wikipedia API qua WikiProxyService
    const results = await wikiProxy.searchArticles(query, language, limit);

    // Luu ket qua vao Redis cache (TTL 5 phut)
    try {
      await redis.set(cacheKey, JSON.stringify(results), 'EX', SEARCH_CACHE_TTL);
    } catch {
      // Khong can xuat loi neu Redis khong kha dung
    }

    return results;
  }

  /**
   * Kiem tra bai viet co ton tai khong (dung khi user chon tu autocomplete)
   */
  async validateArticle(
    title: string,
    language: WikiLanguage,
  ): Promise<{ pageid: number; title: string; exists: boolean }> {
    return wikiProxy.getArticleInfo(title, language);
  }
}
