/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a similar distributed cache
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private records: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private windowMs: number = 60000) {
    // Cleanup expired records every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check if request should be rate limited
   * @param key - Unique identifier (e.g., user ID)
   * @param maxRequests - Maximum requests per window
   * @returns true if rate limit exceeded
   */
  isRateLimited(key: string, maxRequests: number): boolean {
    const now = Date.now();
    const record = this.records.get(key);

    if (!record || now > record.resetAt) {
      // No record or expired - allow and create new record
      this.records.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return false;
    }

    if (record.count >= maxRequests) {
      // Rate limit exceeded
      return true;
    }

    // Increment count
    record.count++;
    this.records.set(key, record);
    return false;
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string, maxRequests: number): number {
    const now = Date.now();
    const record = this.records.get(key);

    if (!record || now > record.resetAt) {
      return maxRequests;
    }

    return Math.max(0, maxRequests - record.count);
  }

  /**
   * Get time until reset (in seconds)
   */
  getResetTime(key: string): number {
    const now = Date.now();
    const record = this.records.get(key);

    if (!record || now > record.resetAt) {
      return 0;
    }

    return Math.ceil((record.resetAt - now) / 1000);
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.records.delete(key);
  }

  /**
   * Cleanup expired records
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now > record.resetAt) {
        this.records.delete(key);
      }
    }
  }

  /**
   * Clear all records (useful for testing)
   */
  clear(): void {
    this.records.clear();
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.records.clear();
  }
}

// Tenant switch rate limiter: 10 switches per minute
export const tenantSwitchLimiter = new RateLimiter(60000);

// API rate limiter: 100 requests per minute (general purpose)
export const apiRateLimiter = new RateLimiter(60000);

/**
 * Check if tenant switch is rate limited
 * @param userId - User ID
 * @returns true if rate limited
 */
export function isTenantSwitchRateLimited(userId: string): boolean {
  return tenantSwitchLimiter.isRateLimited(userId, 10);
}

/**
 * Get remaining tenant switches for user
 */
export function getRemainingTenantSwitches(userId: string): number {
  return tenantSwitchLimiter.getRemaining(userId, 10);
}

/**
 * Get time until tenant switch rate limit resets
 */
export function getTenantSwitchResetTime(userId: string): number {
  return tenantSwitchLimiter.getResetTime(userId);
}
