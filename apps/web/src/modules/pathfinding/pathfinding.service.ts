import { WikiProxyService } from '@/modules/wiki-proxy/wiki-proxy.service';
import { CacheService } from '@/modules/cache/cache.service';
import { GraphCacheService } from './graph-cache.service';
import type { WikiLanguage, WikiArticle, PathResult } from '@/types';

// Gioi han do sau BFS (ly thuyet Six Degrees = toi da 6 buoc)
const MAX_BFS_DEPTH = 6;
// Gioi han tong so node da duyet de tranh tran bo nho
const MAX_TOTAL_NODES = 10000;
// So luong request dong thoi toi da moi batch (tranh spam Wikipedia)
const CONCURRENCY_LIMIT = 5;

const wikiProxy = new WikiProxyService();
const cacheService = new CacheService();
const graphCacheService = new GraphCacheService();

/**
 * Chia mang thanh cac batch nho de xu ly dong thoi co kiem soat
 */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Tao URL cua bai viet Wikipedia tu title va language
 */
function buildWikiUrl(title: string, language: WikiLanguage): string {
  const domain = language === 'vi' ? 'vi.wikipedia.org' : 'en.wikipedia.org';
  return `https://${domain}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

/**
 * PathfindingService -- Co che tim duong Bidirectional BFS
 * Cache pipeline 3 tang: Redis -> SQL Graph (SHORTEST_PATH) -> Live BFS
 */
export class PathfindingService {
  /**
   * Tim duong ngan nhat giua 2 bai viet Wikipedia
   * Pipeline: Redis Cache -> SQL Graph SHORTEST_PATH -> Live BFS
   */
  async findPath(
    sourceTitle: string,
    targetTitle: string,
    language: WikiLanguage,
  ): Promise<PathResult> {
    const startTime = Date.now();

    // Tang 1: Kiem tra Redis cache
    const redisCached = await cacheService.getCachedPath(sourceTitle, targetTitle, language);
    if (redisCached) {
      return { ...redisCached, cached: true, searchTimeMs: Date.now() - startTime };
    }

    // Tang 2: Kiem tra SQL Graph (SHORTEST_PATH)
    try {
      const sqlPath = await graphCacheService.lookupCachedPath(sourceTitle, targetTitle, language);
      if (sqlPath && sqlPath.length >= 2) {
        const pathResult: PathResult = {
          source: {
            id: 0, title: sqlPath[0],
            url: buildWikiUrl(sqlPath[0], language), language,
          },
          target: {
            id: 0, title: sqlPath[sqlPath.length - 1],
            url: buildWikiUrl(sqlPath[sqlPath.length - 1], language), language,
          },
          path: sqlPath.map((t) => ({
            id: 0, title: t, url: buildWikiUrl(t, language), language,
          })),
          degrees: sqlPath.length - 1,
          searchTimeMs: Date.now() - startTime,
          cached: true,
        };
        // Dong bo nguoc len Redis de lan sau tra nhanh hon
        await cacheService.setCachedPath(sourceTitle, targetTitle, language, pathResult);
        return pathResult;
      }
    } catch {
      // SQL Graph khong kha dung -> bo qua, tiep tuc Live BFS
    }

    // Tang 3: Live BFS qua Wikipedia API
    // Xac minh ca 2 bai viet deu ton tai
    const [sourceInfo, targetInfo] = await Promise.all([
      wikiProxy.getArticleInfo(sourceTitle, language),
      wikiProxy.getArticleInfo(targetTitle, language),
    ]);

    if (!sourceInfo.exists) {
      throw new Error(`Bai viet "${sourceTitle}" khong ton tai tren Wikipedia (${language}).`);
    }
    if (!targetInfo.exists) {
      throw new Error(`Bai viet "${targetTitle}" khong ton tai tren Wikipedia (${language}).`);
    }

    // Truong hop dac biet: source va target cung 1 bai
    if (sourceInfo.title === targetInfo.title) {
      const article: WikiArticle = {
        id: sourceInfo.pageid, title: sourceInfo.title,
        url: buildWikiUrl(sourceInfo.title, language), language,
      };
      return {
        source: article, target: article, path: [article],
        degrees: 0, searchTimeMs: Date.now() - startTime, cached: false,
      };
    }

    // Chay Bidirectional BFS
    const bfsResult = await this.bidirectionalBFS(
      sourceInfo.title, targetInfo.title,
      sourceInfo.pageid, targetInfo.pageid, language,
    );

    const pathResult: PathResult = {
      source: {
        id: sourceInfo.pageid, title: sourceInfo.title,
        url: buildWikiUrl(sourceInfo.title, language), language,
      },
      target: {
        id: targetInfo.pageid, title: targetInfo.title,
        url: buildWikiUrl(targetInfo.title, language), language,
      },
      path: bfsResult.map((title) => ({
        id: 0, title, url: buildWikiUrl(title, language), language,
      })),
      degrees: bfsResult.length - 1,
      searchTimeMs: Date.now() - startTime,
      cached: false,
    };

    // Luu ket qua thanh cong vao ca Redis va SQL Graph (song song)
    await Promise.all([
      cacheService.setCachedPath(sourceTitle, targetTitle, language, pathResult),
      graphCacheService.savePath(bfsResult, language),
    ]);

    return pathResult;
  }

  /**
   * Bidirectional BFS -- Tim kiem 2 chieu dong thoi
   * Forward: Mo rong tu Source -> ra ngoai
   * Backward: Mo rong tu Target -> ra ngoai
   * Khi 2 tap visited giao nhau -> back-trace duong di
   */
  private async bidirectionalBFS(
    sourceTitle: string,
    targetTitle: string,
    sourceId: number,
    targetId: number,
    language: WikiLanguage,
  ): Promise<string[]> {
    // Map luu title -> title cha (de back-trace duong di)
    const forwardParent = new Map<string, string | null>();
    const backwardParent = new Map<string, string | null>();

    // Khoi tao: source va target la 2 root node
    forwardParent.set(sourceTitle, null);
    backwardParent.set(targetTitle, null);

    // Hang doi chua cac node can mo rong o buoc tiep theo
    let forwardFrontier: string[] = [sourceTitle];
    let backwardFrontier: string[] = [targetTitle];

    let totalNodesVisited = 2;

    for (let depth = 0; depth < MAX_BFS_DEPTH; depth++) {
      if (forwardFrontier.length === 0 && backwardFrontier.length === 0) {
        throw new Error(
          `Khong tim thay duong di giua "${sourceTitle}" va "${targetTitle}" trong ${MAX_BFS_DEPTH} buoc.`,
        );
      }

      // Chon phia co hang doi nho hon de mo rong truoc (toi uu hieu nang)
      const expandForward = forwardFrontier.length <= backwardFrontier.length;

      if (expandForward && forwardFrontier.length > 0) {
        const result = await this.expandFrontier(
          forwardFrontier,
          forwardParent,
          backwardParent,
          language,
          totalNodesVisited,
        );

        totalNodesVisited = result.totalNodes;
        forwardFrontier = result.newFrontier;

        if (result.meetingPoint) {
          return this.buildPath(result.meetingPoint, forwardParent, backwardParent);
        }
      } else if (!expandForward && backwardFrontier.length > 0) {
        const result = await this.expandFrontier(
          backwardFrontier,
          backwardParent,
          forwardParent,
          language,
          totalNodesVisited,
        );

        totalNodesVisited = result.totalNodes;
        backwardFrontier = result.newFrontier;

        if (result.meetingPoint) {
          return this.buildPath(result.meetingPoint, forwardParent, backwardParent);
        }
      }

      // Kiem tra gioi han tong so node
      if (totalNodesVisited >= MAX_TOTAL_NODES) {
        throw new Error(
          `Da duyet ${totalNodesVisited} node ma chua tim thay duong di. Dung de tranh qua tai.`,
        );
      }
    }

    throw new Error(
      `Khong tim thay duong di giua "${sourceTitle}" va "${targetTitle}" trong ${MAX_BFS_DEPTH} buoc.`,
    );
  }

  /**
   * Mo rong mot tang cua BFS
   * Lay links cua tung node trong frontier, kiem tra giao nhau voi phia doi dien
   */
  private async expandFrontier(
    frontier: string[],
    currentParent: Map<string, string | null>,
    oppositeParent: Map<string, string | null>,
    language: WikiLanguage,
    totalNodes: number,
  ): Promise<{
    newFrontier: string[];
    meetingPoint: string | null;
    totalNodes: number;
  }> {
    const newFrontier: string[] = [];
    let meetingPoint: string | null = null;

    // Chia frontier thanh cac batch de xu ly dong thoi co kiem soat
    const batches = chunkArray(frontier, CONCURRENCY_LIMIT);

    for (const batch of batches) {
      // Kiem tra early exit truoc moi batch
      if (meetingPoint) break;
      if (totalNodes >= MAX_TOTAL_NODES) break;

      // Goi WikiProxy cho toan bo batch cung luc (Promise.all)
      const batchResults = await Promise.all(
        batch.map(async (nodeTitle) => {
          try {
            return {
              parent: nodeTitle,
              links: await wikiProxy.getWikiLinks(nodeTitle, language),
            };
          } catch {
            // Bo qua loi cho tung node rieng le (vi du: trang chet tren Wikipedia)
            return { parent: nodeTitle, links: [] };
          }
        }),
      );

      // Xu ly ket qua cua batch
      for (const { parent, links } of batchResults) {
        if (meetingPoint) break;

        for (const linkTitle of links) {
          if (totalNodes >= MAX_TOTAL_NODES) break;

          // Bo qua neu da visit roi (trong cung phia)
          if (currentParent.has(linkTitle)) continue;

          // Ghi nhan parent cho node moi
          currentParent.set(linkTitle, parent);
          totalNodes++;

          // ** KIEM TRA GIAO NHAU ** (early exit)
          if (oppositeParent.has(linkTitle)) {
            meetingPoint = linkTitle;
            break;
          }

          newFrontier.push(linkTitle);
        }
      }
    }

    return { newFrontier, meetingPoint, totalNodes };
  }

  /**
   * Back-trace duong di tu meetingPoint ve ca 2 phia (source va target)
   * Ket qua: mang cac title theo thu tu tu source -> target
   */
  private buildPath(
    meetingPoint: string,
    forwardParent: Map<string, string | null>,
    backwardParent: Map<string, string | null>,
  ): string[] {
    // Trace nguoc tu meetingPoint ve source
    const forwardPath: string[] = [];
    let current: string | null = meetingPoint;
    while (current !== null) {
      forwardPath.unshift(current);
      current = forwardParent.get(current) ?? null;
    }

    // Trace xuoi tu meetingPoint ve target
    const backwardPath: string[] = [];
    current = backwardParent.get(meetingPoint) ?? null;
    while (current !== null) {
      backwardPath.push(current);
      current = backwardParent.get(current) ?? null;
    }

    return [...forwardPath, ...backwardPath];
  }
}
