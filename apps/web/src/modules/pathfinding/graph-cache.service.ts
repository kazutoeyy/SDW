import { query } from '@/lib/db';
import type { WikiLanguage, WikiArticle } from '@/types';

/**
 * GraphCacheService -- Luu tru va truy xuat duong di da tim thanh cong trong SQL Server 2019 Graph
 * Su dung bang NODE (Articles) va EDGE (Wikilinks) de luu cache dang Graph va truy van lai bang SHORTEST_PATH
 */
export class GraphCacheService {
  /**
   * Luu toan bo cac Node va Edge cua mot duong di thanh cong vao SQL Graph
   * Pipeline: Upsert Articles (NODE) -> Insert Wikilinks (EDGE) giua cac cap lien tiep
   */
  async savePath(pathTitles: string[], language: WikiLanguage): Promise<void> {
    if (pathTitles.length < 2) return;

    try {
      // Buoc 1: Upsert tung Article vao bang NODE
      for (const title of pathTitles) {
        const url = this.buildWikiUrl(title, language);
        // Kiem tra da ton tai chua
        const existing = await query<{ ArticleId: number }>(
          'SELECT ArticleId FROM Articles WHERE Title = @title AND Language = @language',
          { title, language },
        );

        if (existing.length === 0) {
          // Lay PageID tu Wikipedia (hoac dung hash tam thoi)
          const articleId = this.generateArticleId(title, language);
          await query(
            `INSERT INTO Articles (ArticleId, Title, Url, Language)
             VALUES (@articleId, @title, @url, @language)`,
            { articleId, title, url, language },
          );
        }
      }

      // Buoc 2: Insert cac Edge giua cac cap lien tiep trong path
      for (let i = 0; i < pathTitles.length - 1; i++) {
        const fromTitle = pathTitles[i];
        const toTitle = pathTitles[i + 1];

        // Lay $node_id cua ca 2 node
        const fromNode = await query<{ $node_id: string }>(
          'SELECT $node_id FROM Articles WHERE Title = @title AND Language = @language',
          { title: fromTitle, language },
        );

        const toNode = await query<{ $node_id: string }>(
          'SELECT $node_id FROM Articles WHERE Title = @title AND Language = @language',
          { title: toTitle, language },
        );

        if (fromNode.length > 0 && toNode.length > 0) {
          // Kiem tra Edge da ton tai chua (tranh duplicate)
          const existingEdge = await query(
            `SELECT COUNT(*) as cnt FROM Wikilinks
             WHERE $from_id = @fromId AND $to_id = @toId`,
            { fromId: fromNode[0].$node_id, toId: toNode[0].$node_id },
          );

          if (!existingEdge[0] || existingEdge[0].cnt === 0) {
            await query(
              `INSERT INTO Wikilinks ($from_id, $to_id, Weight)
               VALUES (@fromId, @toId, 1)`,
              { fromId: fromNode[0].$node_id, toId: toNode[0].$node_id },
            );
          }
        }
      }
    } catch (err) {
      // Loi SQL Graph khong nen lam crash BFS chinh
      console.error('Loi khi luu duong di vao SQL Graph:', err);
    }
  }

  /**
   * Truy van SHORTEST_PATH tu SQL Server 2019 Graph
   * Tim duong di da luu giua 2 bai viet ma khong can goi Wikipedia API
   */
  async lookupCachedPath(
    sourceTitle: string,
    targetTitle: string,
    language: WikiLanguage,
  ): Promise<string[] | null> {
    try {
      const result = await query<{ PathTitles: string }>(
        `SELECT STRING_AGG(A2.Title, '|') WITHIN GROUP (GRAPH PATH) AS PathTitles
         FROM Articles AS A1,
              Wikilinks FOR PATH AS WL,
              Articles FOR PATH AS A2
         WHERE MATCH(SHORTEST_PATH(A1(-(WL)->A2)+))
           AND A1.Title = @sourceTitle
           AND A1.Language = @language
           AND LAST_NODE(A2).Title = @targetTitle`,
        { sourceTitle, targetTitle, language },
      );

      if (result.length > 0 && result[0].PathTitles) {
        const pathTitles = result[0].PathTitles.split('|');
        // Them source vao dau (SHORTEST_PATH tra ve tu node tieu ke)
        return [sourceTitle, ...pathTitles];
      }

      return null;
    } catch (err) {
      // SQL Graph query co the that bai neu chua co du lieu hoac cu phap khac phien ban
      console.error('Loi khi truy van SHORTEST_PATH:', err);
      return null;
    }
  }

  /**
   * Tao URL Wikipedia tu title va language
   */
  private buildWikiUrl(title: string, language: WikiLanguage): string {
    const domain = language === 'vi' ? 'vi.wikipedia.org' : 'en.wikipedia.org';
    return `https://${domain}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  }

  /**
   * Sinh ArticleId dang hash tu title + language (dung khi chua co PageID tu API)
   * Su dung simple hash de dam bao tinh nhat quan
   */
  private generateArticleId(title: string, language: WikiLanguage): number {
    const str = `${language}:${title}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Chuyen ve 32-bit integer
    }
    return Math.abs(hash);
  }
}
