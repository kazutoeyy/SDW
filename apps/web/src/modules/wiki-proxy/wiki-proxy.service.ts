import { RateLimiter } from './rate-limiter';
import type { WikiLanguage } from '@/types';

// Cac hang so cau hinh
const MAX_RETRY_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1000;

interface WikiPageLinksResponse {
  query?: {
    pages?: Record<
      string,
      {
        pageid: number;
        title: string;
        links?: Array<{ ns: number; title: string }>;
      }
    >;
  };
  continue?: {
    plcontinue: string;
  };
}

interface WikiSearchResponse {
  query?: {
    search?: Array<{
      ns: number;
      title: string;
      pageid: number;
      snippet: string;
    }>;
  };
}

/**
 * WikiProxyService - Giao tiep voi MediaWiki API
 * Ho tro Rate Limiting va Exponential Backoff theo yeu cau Project Context
 */
export class WikiProxyService {
  private rateLimiter: RateLimiter;

  constructor(rateLimit = 100) {
    this.rateLimiter = new RateLimiter(rateLimit, rateLimit);
  }

  /** Tao base URL cho Wikipedia API theo ngon ngu */
  private getApiUrl(language: WikiLanguage): string {
    const domain = language === 'vi' ? 'vi.wikipedia.org' : 'en.wikipedia.org';
    return `https://${domain}/w/api.php`;
  }

  /**
   * Thuc hien fetch voi Exponential Backoff
   * Tu dong retry khi gap loi 429 (Too Many Requests) hoac loi mang
   */
  private async fetchWithBackoff<T>(url: string, attempt = 0): Promise<T> {
    await this.rateLimiter.acquire();

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SixDegreesOfWikipedia/1.0 (portfolio project)',
          Accept: 'application/json',
        },
      });

      if (response.status === 429) {
        if (attempt >= MAX_RETRY_ATTEMPTS) {
          throw new Error('Vuot qua gioi han retry. Wikipedia API tu choi phuc vu.');
        }
        const delay = BASE_BACKOFF_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchWithBackoff<T>(url, attempt + 1);
      }

      if (!response.ok) {
        throw new Error(`Wikipedia API loi: ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    } catch (err) {
      if (attempt < MAX_RETRY_ATTEMPTS && (err as Error).message?.includes('fetch')) {
        const delay = BASE_BACKOFF_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchWithBackoff<T>(url, attempt + 1);
      }
      throw err;
    }
  }

  /**
   * Lay danh sach tat ca wikilinks tu mot bai viet Wikipedia
   * Tu dong phan trang (pagination) de lay du toan bo links
   */
  async getWikiLinks(title: string, language: WikiLanguage): Promise<string[]> {
    const links: string[] = [];
    let plcontinue: string | undefined;

    do {
      const params = new URLSearchParams({
        action: 'query',
        titles: title,
        prop: 'links',
        pllimit: '500',
        plnamespace: '0', // Chi lay bai viet chinh (namespace 0)
        format: 'json',
        formatversion: '2',
      });

      if (plcontinue) {
        params.set('plcontinue', plcontinue);
      }

      const url = `${this.getApiUrl(language)}?${params.toString()}`;
      const data = await this.fetchWithBackoff<WikiPageLinksResponse>(url);

      if (data.query?.pages) {
        const pages = Object.values(data.query.pages);
        for (const page of pages) {
          if (page.links) {
            for (const link of page.links) {
              if (link.ns === 0) {
                links.push(link.title);
              }
            }
          }
        }
      }

      plcontinue = data.continue?.plcontinue;
    } while (plcontinue);

    return links;
  }

  /**
   * Kiem tra bai viet co ton tai tren Wikipedia khong va tra ve thong tin co ban
   */
  async getArticleInfo(
    title: string,
    language: WikiLanguage,
  ): Promise<{ pageid: number; title: string; exists: boolean }> {
    const params = new URLSearchParams({
      action: 'query',
      titles: title,
      format: 'json',
      formatversion: '2',
    });

    const url = `${this.getApiUrl(language)}?${params.toString()}`;
    const data = await this.fetchWithBackoff<WikiPageLinksResponse>(url);

    if (data.query?.pages) {
      const pages = Object.values(data.query.pages);
      const page = pages[0];
      if (page && page.pageid > 0) {
        return { pageid: page.pageid, title: page.title, exists: true };
      }
    }

    return { pageid: -1, title, exists: false };
  }

  /**
   * Tim kiem bai viet Wikipedia qua OpenSearch API (Autocomplete)
   */
  async searchArticles(
    searchTerm: string,
    language: WikiLanguage,
    limit = 10,
  ): Promise<Array<{ title: string; pageid: number; snippet: string }>> {
    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: searchTerm,
      srlimit: limit.toString(),
      srnamespace: '0',
      format: 'json',
      formatversion: '2',
    });

    const url = `${this.getApiUrl(language)}?${params.toString()}`;
    const data = await this.fetchWithBackoff<WikiSearchResponse>(url);

    return (
      data.query?.search?.map((item) => ({
        title: item.title,
        pageid: item.pageid,
        snippet: item.snippet,
      })) ?? []
    );
  }
}
