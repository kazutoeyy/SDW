/**
 * @repo/shared - Shared constants va utilities dung chung trong monorepo
 */

/** Cac Wikipedia domain duoc ho tro */
export const WIKI_DOMAINS = {
    vi: 'vi.wikipedia.org',
    en: 'en.wikipedia.org',
} as const;

/** Gioi han ket noi toi da cho Bidirectional BFS */
export const MAX_BFS_DEPTH = 6;

/** Thoi gian cache mac dinh (7 ngay tinh bang giay) */
export const DEFAULT_CACHE_TTL = 7 * 24 * 60 * 60;

/** Gioi han so request toi Wikipedia API (requests/giay) */
export const WIKI_RATE_LIMIT = 100;

/** So lan retry toi da khi gap loi 429 */
export const MAX_RETRY_ATTEMPTS = 3;
