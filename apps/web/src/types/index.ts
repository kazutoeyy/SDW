/**
 * Global type definitions cho Six Degrees of Wikipedia
 * Cac interface chinh se duoc define tai day va su dung xuyen suot project
 */

/** Ngon ngu Wikipedia duoc ho tro */
export type WikiLanguage = 'vi' | 'en';

/** Bai viet Wikipedia - tuong ung NODE trong SQL Graph */
export interface WikiArticle {
    id: number;
    title: string;
    url: string;
    language: WikiLanguage;
}

/** Lien ket giua 2 bai viet - tuong ung EDGE trong SQL Graph */
export interface WikiLink {
    fromArticleId: number;
    toArticleId: number;
}

/** Ket qua tim duong di giua 2 bai viet */
export interface PathResult {
    source: WikiArticle;
    target: WikiArticle;
    path: WikiArticle[];
    degrees: number;
    searchTimeMs: number;
    cached: boolean;
}

/** Trang thai tim kiem real-time gui ve client */
export interface SearchProgress {
    status: 'searching' | 'found' | 'not_found' | 'error';
    currentDepth: number;
    nodesVisited: number;
    message: string;
}
