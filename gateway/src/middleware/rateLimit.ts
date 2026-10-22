import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import type { Store, IncrementResponse } from 'express-rate-limit';
import { getRedis, isRedisConfigured } from '@playsole-one/shared';
import { config } from '../config';

type KeyPrefix = 'global' | 'auth' | 'token' | 'api';

function keyGenerator(prefix: KeyPrefix) {
  return (req: Request): string => {
    if (req.userId) return `user:${req.userId}:${prefix}`;
    if (req.tenantId) return `tenant:${req.tenantId}:${prefix}`;
    return `ip:${req.ip}:${prefix}`;
  };
}

class WorkerSafeRateLimitStore implements Store {
  localKeys = false;
  private windowMs: number;
  private memoryHits = new Map<string, { totalHits: number; resetTime: number }>();

  constructor(windowMs: number) {
    this.windowMs = windowMs;
  }

  init(_options: any): void {
    // Cloudflare Workers disallows setInterval/setTimeout in global scope.
    // In-memory fallback entries are evicted lazily on access.
  }

  async increment(key: string): Promise<IncrementResponse> {
    if (isRedisConfigured()) {
      try {
        const windowSecs = Math.max(1, Math.ceil(this.windowMs / 1000));
        const [totalHits] = await getRedis()
          .multi()
          .incr(`rl:${key}`)
          .expire(`rl:${key}`, windowSecs, 'NX')
          .exec<[number, number]>();
        return { totalHits, resetTime: new Date(Date.now() + this.windowMs) };
      } catch (err) {
        if (process.env.NODE_ENV === 'production' && !process.env.CLOUDFLARE_WORKER) throw err;
      }
    }

    if (process.env.NODE_ENV === 'production' && !process.env.CLOUDFLARE_WORKER) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in production for rate limiting.');
    }

    const now = Date.now();
    const entry = this.memoryHits.get(key);
    if (!entry || now >= entry.resetTime) {
      const resetTime = now + this.windowMs;
      this.memoryHits.set(key, { totalHits: 1, resetTime });
      return { totalHits: 1, resetTime: new Date(resetTime) };
    }

    entry.totalHits += 1;
    return { totalHits: entry.totalHits, resetTime: new Date(entry.resetTime) };
  }

  async get(key: string): Promise<IncrementResponse | undefined> {
    if (isRedisConfigured()) {
      try {
        const totalHits = Number((await getRedis().get(`rl:${key}`)) ?? 0);
        return { totalHits, resetTime: undefined };
      } catch (err) {
        if (process.env.NODE_ENV === 'production' && !process.env.CLOUDFLARE_WORKER) throw err;
      }
    }

    const now = Date.now();
    const entry = this.memoryHits.get(key);
    if (!entry || now >= entry.resetTime) {
      this.memoryHits.delete(key);
      return undefined;
    }
    return { totalHits: entry.totalHits, resetTime: new Date(entry.resetTime) };
  }

  async resetKey(key: string): Promise<void> {
    if (isRedisConfigured()) {
      try {
        await getRedis().del(`rl:${key}`);
        return;
      } catch (err) {
        if (process.env.NODE_ENV === 'production' && !process.env.CLOUDFLARE_WORKER) throw err;
      }
    }
    this.memoryHits.delete(key);
  }

  async resetAll(): Promise<void> {
    this.memoryHits.clear();
  }

  async decrement(key: string): Promise<void> {
    if (isRedisConfigured()) {
      try {
        await getRedis().decr(`rl:${key}`);
        return;
      } catch (err) {
        if (process.env.NODE_ENV === 'production' && !process.env.CLOUDFLARE_WORKER) throw err;
      }
    }
    const entry = this.memoryHits.get(key);
    if (entry && entry.totalHits > 0) {
      entry.totalHits -= 1;
    }
  }
}

function createStore(windowMs: number): Store {
  return new WorkerSafeRateLimitStore(windowMs);
}

export const globalRateLimit = rateLimit({
  windowMs: config.rateLimit.global.windowMs,
  max: config.rateLimit.global.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGenerator('global'),
  store: createStore(config.rateLimit.global.windowMs),
  message: { error: 'Too many requests, please try again later.' },
});

export const authRateLimit = rateLimit({
  windowMs: config.rateLimit.auth.windowMs,
  max: config.rateLimit.auth.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGenerator('auth'),
  store: createStore(config.rateLimit.auth.windowMs),
  message: { error: 'Too many authentication attempts, please try again later.' },
});

export const tokenRateLimit = rateLimit({
  windowMs: config.rateLimit.token.windowMs,
  max: config.rateLimit.token.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGenerator('token'),
  store: createStore(config.rateLimit.token.windowMs),
  message: { error: 'Too many token requests, please try again later.' },
});

export const apiRateLimit = rateLimit({
  windowMs: config.rateLimit.api.windowMs,
  max: config.rateLimit.api.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGenerator('api'),
  store: createStore(config.rateLimit.api.windowMs),
  message: { error: 'Too many API requests, please try again later.' },
});
