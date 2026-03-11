import { query } from '@/lib/db';

interface SearchHistoryRow {
  HistoryId: number;
  SourceTitle: string;
  TargetTitle: string;
  Language: string;
  Degrees: number;
  SearchTimeMs: number;
  IsCachedResult: boolean;
  CreatedAt: Date;
}

/**
 * Lay lich su tim kiem cua user, sap xep theo thoi gian moi nhat
 */
export async function getUserSearchHistory(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<SearchHistoryRow[]> {
  return query<SearchHistoryRow>(
    `SELECT HistoryId, SourceTitle, TargetTitle, Language, Degrees,
            SearchTimeMs, IsCachedResult, CreatedAt
     FROM SearchHistory
     WHERE UserId = @userId
     ORDER BY CreatedAt DESC
     OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    { userId, limit, offset },
  );
}

/**
 * Luu ket qua tim kiem thanh cong vao lich su
 */
export async function saveSearchHistory(params: {
  userId: string;
  sourceTitle: string;
  targetTitle: string;
  language: string;
  degrees: number;
  searchTimeMs: number;
  isCached: boolean;
}): Promise<void> {
  await query(
    `INSERT INTO SearchHistory
       (UserId, SourceTitle, TargetTitle, Language, Degrees, SearchTimeMs, IsCachedResult)
     VALUES
       (@userId, @sourceTitle, @targetTitle, @language, @degrees, @searchTimeMs, @isCached)`,
    {
      userId: params.userId,
      sourceTitle: params.sourceTitle,
      targetTitle: params.targetTitle,
      language: params.language,
      degrees: params.degrees,
      searchTimeMs: params.searchTimeMs,
      isCached: params.isCached,
    },
  );
}

/**
 * Dem tong so luot tim kiem cua user
 */
export async function getUserSearchCount(userId: string): Promise<number> {
  const rows = await query<{ total: number }>(
    'SELECT COUNT(*) as total FROM SearchHistory WHERE UserId = @userId',
    { userId },
  );
  return rows[0]?.total ?? 0;
}
