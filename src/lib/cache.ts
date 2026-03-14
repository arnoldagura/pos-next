import { Redis } from '@upstash/redis';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  UPSTASH_URL && UPSTASH_TOKEN ? new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN }) : undefined;

const DEFAULT_TTL = 300; // 5 minutes

/**
 * Get a cached value by key
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const value = await redis.get<T>(key);
    return value;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with optional TTL (seconds)
 */
export async function cacheSet<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttl });
  } catch {
    // Cache write failure is non-blocking
  }
}

/**
 * Invalidate cache keys matching a prefix pattern
 */
export async function cacheInvalidate(prefix: string): Promise<void> {
  if (!redis) return;
  try {
    let cur = 0;
    for (;;) {
      const result = await redis.scan(cur, {
        match: `${prefix}*`,
        count: 100,
      });
      const nextCursor = Number(result[0]);
      const keys = result[1] as string[];
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      if (nextCursor === 0) break;
      cur = nextCursor;
    }
  } catch {
    // Cache invalidation failure is non-blocking
  }
}

/**
 * Build a cache key for product catalog queries
 */
export function productCacheKey(tenantId: string, params: Record<string, string | null>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `cache:products:${tenantId}:${parts}`;
}

/**
 * Invalidate all product cache for a tenant
 */
export async function invalidateProductCache(tenantId: string): Promise<void> {
  await cacheInvalidate(`cache:products:${tenantId}`);
}

/**
 * Check if caching is available
 */
export function isCacheAvailable(): boolean {
  return !!redis;
}
