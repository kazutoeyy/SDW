import { redis } from '@/lib/redis';
import type { PathResult } from '@/types';

// TTL mac dinh: 7 ngay tinh bang giay
const DEFAULT_TTL = 7 * 24 * 60 * 60;

/**
 * CacheService - Redis wrapper de luu tru ket qua BFS Pathfinding
 * Moi path thanh cong duoc cache 7 ngay theo Project Context
 */
export class CacheService {
  /**
   * Tao cache key tu source, target va language
   */
  private buildKey(source: string, target: string, language: string): string {
    const normalized = [source, target]
      .map((s) => s.toLowerCase().trim().replace(/\s+/g, '_'))
      .sort()
      .join('::');
    return `path:${language}:${normalized}`;
  }

  /**
   * Tim kiem ket qua da cache tu Redis
   * Tra ve null neu khong co hoac da het han TTL
   */
  async getCachedPath(
    source: string,
    target: string,
    language: string,
  ): Promise<PathResult | null> {
    try {
      const key = this.buildKey(source, target, language);
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as PathResult;
    } catch (err) {
      console.error('Loi khi doc Redis cache:', err);
      return null;
    }
  }

  /**
   * Luu ket qua BFS thanh cong vao Redis voi TTL 7 ngay
   */
  async setCachedPath(
    source: string,
    target: string,
    language: string,
    result: PathResult,
    ttl = DEFAULT_TTL,
  ): Promise<void> {
    try {
      const key = this.buildKey(source, target, language);
      await redis.set(key, JSON.stringify(result), 'EX', ttl);
    } catch (err) {
      console.error('Loi khi ghi Redis cache:', err);
    }
  }

  /**
   * Xoa cache entry cu the
   */
  async invalidate(source: string, target: string, language: string): Promise<void> {
    try {
      const key = this.buildKey(source, target, language);
      await redis.del(key);
    } catch (err) {
      console.error('Loi khi xoa Redis cache:', err);
    }
  }

  /**
   * Kiem tra mot path co dang duoc cache hay khong
   */
  async exists(source: string, target: string, language: string): Promise<boolean> {
    try {
      const key = this.buildKey(source, target, language);
      return (await redis.exists(key)) === 1;
    } catch {
      return false;
    }
  }
}
