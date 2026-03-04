import type { CacheStore, SwrResult } from './CacheStore';

// Basit, opsiyonel Redis adaptörü.
// Not: Bu sınıf, dışarıdan verilen bir Redis client ile çalışacak şekilde tasarlandı.
// Böylece projeye zorunlu redis bağımlılığı eklenmemiş olur.

export interface SimpleRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { PX?: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

interface Entry<T = unknown> {
  value: T;
  expiresAt: number;
  staleUntil: number;
}

export class RedisCache implements CacheStore {
  constructor(
    private readonly client: SimpleRedisClient,
    private readonly prefix = 'cache:',
    private readonly jsonSpace = 0
  ) {}

  private key(k: string): string {
    return `${this.prefix}${k}`;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const raw = await this.client.get(this.key(key));
    if (!raw) return undefined;
    try {
      const entry = JSON.parse(raw) as Entry<T>;
      const now = Date.now();
      if (entry.expiresAt <= now && entry.staleUntil <= now) {
        await this.client.del(this.key(key));
        return undefined;
      }
      return entry.value;
    } catch {
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number, staleMs = ttlMs): Promise<void> {
    const now = Date.now();
    const entry: Entry<T> = {
      value,
      expiresAt: now + ttlMs,
      staleUntil: now + ttlMs + staleMs
    };
    const raw = JSON.stringify(entry, null, this.jsonSpace);
    await this.client.set(this.key(key), raw, { PX: ttlMs + staleMs });
  }

  async del(key: string): Promise<void> {
    await this.client.del(this.key(key));
  }

  async getOrSetSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number,
    staleMs: number
  ): Promise<SwrResult<T>> {
    const raw = await this.client.get(this.key(key));
    const now = Date.now();

    if (raw) {
      try {
        const entry = JSON.parse(raw) as Entry<T>;
        if (entry.expiresAt > now) {
          return { value: entry.value, isStale: false, fromCache: true };
        }
        if (entry.staleUntil > now) {
          // Stale-while-revalidate: entry'yi döndür ama arka planda refresh et.
          void this.refresh(key, fetcher, ttlMs, staleMs);
          return { value: entry.value, isStale: true, fromCache: true };
        }
      } catch {
        // parse hatası durumunda aşağıdaki fetch yoluna düşeriz
      }
    }

    const value = await fetcher();
    await this.set(key, value, ttlMs, staleMs);
    return { value, isStale: false, fromCache: false };
  }

  private async refresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number,
    staleMs: number
  ): Promise<void> {
    try {
      const fresh = await fetcher();
      await this.set(key, fresh, ttlMs, staleMs);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('RedisCache background refresh failed for key', key, error);
    }
  }
}

