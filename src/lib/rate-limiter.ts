import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Use Upstash Redis in production, in-memory fallback for local dev
const redis =
  UPSTASH_URL && UPSTASH_TOKEN ? new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN }) : undefined;

// Tenant switch: 10 requests per 60s sliding window
const tenantSwitchRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      prefix: 'ratelimit:tenant-switch',
    })
  : null;

// General API: 100 requests per 60s sliding window
const apiRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '60 s'),
      prefix: 'ratelimit:api',
    })
  : null;

// In-memory fallback for local dev (no Upstash configured)
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function inMemoryCheck(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: maxRequests - 1, reset: Math.ceil(windowMs / 1000) };
  }

  if (record.count >= maxRequests) {
    return {
      limited: true,
      remaining: 0,
      reset: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count++;
  return {
    limited: false,
    remaining: maxRequests - record.count,
    reset: Math.ceil((record.resetAt - now) / 1000),
  };
}

export async function isTenantSwitchRateLimited(userId: string): Promise<boolean> {
  if (tenantSwitchRateLimit) {
    const { success } = await tenantSwitchRateLimit.limit(userId);
    return !success;
  }
  return inMemoryCheck(`tenant-switch:${userId}`, 10, 60000).limited;
}

export async function getRemainingTenantSwitches(userId: string): Promise<number> {
  if (tenantSwitchRateLimit) {
    const { remaining } = await tenantSwitchRateLimit.limit(userId);
    return remaining;
  }
  return inMemoryCheck(`tenant-switch:${userId}`, 10, 60000).remaining;
}

export async function getTenantSwitchResetTime(userId: string): Promise<number> {
  if (tenantSwitchRateLimit) {
    const { reset } = await tenantSwitchRateLimit.limit(userId);
    return Math.ceil((reset - Date.now()) / 1000);
  }
  return inMemoryCheck(`tenant-switch:${userId}`, 10, 60000).reset;
}

export async function isApiRateLimited(key: string): Promise<boolean> {
  if (apiRateLimit) {
    const { success } = await apiRateLimit.limit(key);
    return !success;
  }
  return inMemoryCheck(`api:${key}`, 100, 60000).limited;
}
