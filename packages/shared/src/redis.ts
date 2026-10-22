import { Redis } from '@upstash/redis';

export interface JsonStateStore {
  setJsonWithTtl(key: string, value: unknown, ttlMs: number): Promise<void>;
  getJson<T>(key: string): Promise<T | null>;
  del(key: string): Promise<void>;
  acquireLock(key: string, ttlMs: number): Promise<boolean>;
  isReplay(key: string, ttlSec: number): Promise<boolean>;
}

let redisClient: Redis | null = null;

export function isRedisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set');
    }
    redisClient = new Redis({ url, token });
  }
  return redisClient;
}

interface MemEntry {
  value: string;
  expiresAt: number;
}

class MemoryStateStore implements JsonStateStore {
  private mem = new Map<string, MemEntry>();

  private read(key: string): string | null {
    const entry = this.mem.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.mem.delete(key);
      return null;
    }
    return entry.value;
  }

  private write(key: string, value: string, ttlMs: number): void {
    this.mem.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async setJsonWithTtl(key: string, value: unknown, ttlMs: number): Promise<void> {
    this.write(key, JSON.stringify(value), ttlMs);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = this.read(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  }

  async del(key: string): Promise<void> {
    this.mem.delete(key);
  }

  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    if (this.read(key) !== null) return false;
    this.write(key, '1', ttlMs);
    return true;
  }

  async isReplay(key: string, ttlSec: number): Promise<boolean> {
    if (this.read(key) !== null) return true;
    this.write(key, '1', ttlSec * 1000);
    return false;
  }
}

class RedisStateStore implements JsonStateStore {
  private redis: Redis;
  private fallbackMem: MemoryStateStore = new MemoryStateStore();

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async setJsonWithTtl(key: string, value: unknown, ttlMs: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), { px: ttlMs });
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production' && !process.env.CLOUDFLARE_WORKER) throw err;
      return this.fallbackMem.setJsonWithTtl(key, value, ttlMs);
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (raw === null || raw === undefined) return null;
      if (typeof raw === 'object') return raw as T;
      return JSON.parse(raw as string) as T;
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production' && !process.env.CLOUDFLARE_WORKER) throw err;
      return this.fallbackMem.getJson<T>(key);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production' && !process.env.CLOUDFLARE_WORKER) throw err;
      return this.fallbackMem.del(key);
    }
  }

  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    try {
      const result = await this.redis.set(key, '1', { px: ttlMs, nx: true });
      return result !== null;
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production' && !process.env.CLOUDFLARE_WORKER) throw err;
      return this.fallbackMem.acquireLock(key, ttlMs);
    }
  }

  async isReplay(key: string, ttlSec: number): Promise<boolean> {
    try {
      const result = await this.redis.set(key, '1', { ex: ttlSec, nx: true });
      return result === null;
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production' && !process.env.CLOUDFLARE_WORKER) throw err;
      return this.fallbackMem.isReplay(key, ttlSec);
    }
  }
}

class DynamicStateStore implements JsonStateStore {
  private mem = new MemoryStateStore();
  private redisStore: RedisStateStore | null = null;

  private getStore(): JsonStateStore {
    if (process.env.NODE_ENV === 'production' && !isRedisConfigured() && !process.env.CLOUDFLARE_WORKER) {
      throw new Error('Redis is required in production. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
    }
    if (isRedisConfigured()) {
      try {
        if (!this.redisStore) {
          this.redisStore = new RedisStateStore(getRedis());
        }
        return this.redisStore;
      } catch {
        return this.mem;
      }
    }
    return this.mem;
  }

  async setJsonWithTtl(key: string, value: unknown, ttlMs: number): Promise<void> {
    return this.getStore().setJsonWithTtl(key, value, ttlMs);
  }

  async getJson<T>(key: string): Promise<T | null> {
    return this.getStore().getJson<T>(key);
  }

  async del(key: string): Promise<void> {
    return this.getStore().del(key);
  }

  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    return this.getStore().acquireLock(key, ttlMs);
  }

  async isReplay(key: string, ttlSec: number): Promise<boolean> {
    return this.getStore().isReplay(key, ttlSec);
  }
}

let dynamicStore: DynamicStateStore | null = null;

export function getStateStore(): JsonStateStore {
  if (!dynamicStore) {
    // The production Redis requirement is enforced lazily in DynamicStateStore.getStore(),
    // because this is called at module load (before Worker secrets/env are available).
    dynamicStore = new DynamicStateStore();
  }
  return dynamicStore;
}
