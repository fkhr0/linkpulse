// A small key-value cache with expiry: Redis when REDIS_URL is set (shared
// by every API copy), otherwise a Map in this process.
import { Redis } from "ioredis";

export interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  close(): Promise<void>;
}

export function redisCache(url: string): Cache {
  const redis = new Redis(url, { maxRetriesPerRequest: 2 });
  return {
    get: (key) => redis.get(key),
    set: async (key, value, ttl) => void (await redis.set(key, value, "EX", ttl)),
    del: async (key) => void (await redis.del(key)),
    close: async () => void (await redis.quit()),
  };
}

export function memoryCache(): Cache {
  const entries = new Map<string, { value: string; until: number }>();
  return {
    get: async (key) => {
      const entry = entries.get(key);
      if (!entry) return null;
      if (entry.until < Date.now()) {
        entries.delete(key);
        return null;
      }
      return entry.value;
    },
    set: async (key, value, ttl) => {
      entries.set(key, { value, until: Date.now() + ttl * 1000 });
    },
    del: async (key) => {
      entries.delete(key);
    },
    close: async () => entries.clear(),
  };
}
