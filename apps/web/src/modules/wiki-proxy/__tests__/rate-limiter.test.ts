import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from '../rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(10, 10);
  });

  it('phai khoi tao voi so token bang max', () => {
    expect(limiter.getAvailableTokens()).toBe(10);
  });

  it('phai giam token sau khi acquire', async () => {
    await limiter.acquire();
    expect(limiter.getAvailableTokens()).toBeLessThanOrEqual(9);
  });

  it('phai cho phep acquire nhieu lan lien tiep khi con token', async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }
    expect(limiter.getAvailableTokens()).toBeLessThanOrEqual(5);
  });

  it('phai tu dong refill token theo thoi gian', async () => {
    // Tieu het token
    for (let i = 0; i < 10; i++) {
      await limiter.acquire();
    }
    expect(limiter.getAvailableTokens()).toBe(0);

    // Cho 200ms de refill (refillRate = 10 tokens/s => 200ms = 2 tokens)
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(limiter.getAvailableTokens()).toBeGreaterThanOrEqual(1);
  });

  it('khong duoc vuot qua maxTokens khi refill', async () => {
    // Cho 1 giay de dam bao refill day du
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(limiter.getAvailableTokens()).toBeLessThanOrEqual(10);
  });
});
