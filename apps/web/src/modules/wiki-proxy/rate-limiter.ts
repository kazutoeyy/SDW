/**
 * Token Bucket Rate Limiter
 * Kiem soat luong request gui toi Wikipedia API de tranh bi block IP
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens/giay

  constructor(maxTokens = 100, refillRate = 100) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  /**
   * Cho den khi co token kha dung, tra ve Promise resolve khi duoc phep gui request
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Tinh thoi gian can cho de co 1 token
    const waitTime = ((1 - this.tokens) / this.refillRate) * 1000;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    this.refill();
    this.tokens -= 1;
  }

  /** So token hien tai (dung cho testing/monitoring) */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}
