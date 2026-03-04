import type { CacheStore, SwrResult } from './CacheStore';

interface Entry<T = unknown> {
  value: T;
  expiresAt: number;
  staleUntil: number;
}

export class InMemoryCache implements CacheStore {
  private store = new Map<string, Entry>();

  private inflight = new Map<string, Promise<unknown>>();

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now() && entry.staleUntil <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number, staleMs = ttlMs): Promise<void> {
    const now = Date.now();
    this.store.set(key, {
      value,
      expiresAt: now + ttlMs,
      staleUntil: now + ttlMs + staleMs
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getOrSetSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number,
    staleMs: number
  ): Promise<SwrResult<T>> {
    const now = Date.now();
    const existing = this.store.get(key) as Entry<T> | undefined;

    if (existing && existing.expiresAt > now) {
      return { value: existing.value, isStale: false, fromCache: true };
    }

    if (existing && existing.staleUntil > now) {
      // Stale-while-revalidate: eski değeri döndür, arka planda refresh.
      this.triggerBackgroundRefresh(key, fetcher, ttlMs, staleMs).catch(() => {
        // arka plan hataları sadece loglanır
      });
      return { value: existing.value, isStale: true, fromCache: true };
    }

    // Hiç yoksa veya tamamen süresi dolduysa, inflight ile tek fetch'e indir.
    const inflightExisting = this.inflight.get(key) as Promise<T> | undefined;
    if (inflightExisting) {
      const value = await inflightExisting;
      return { value, isStale: false, fromCache: true };
    }

    const p = (async () => {
      try {
        const fresh = await fetcher();
        const nowInner = Date.now();
        this.store.set(key, {
          value: fresh,
          expiresAt: nowInner + ttlMs,
          staleUntil: nowInner + ttlMs + staleMs
        });
        return fresh;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, p);
    const fresh = await p;
    return { value: fresh, isStale: false, fromCache: false };
  }

  private async triggerBackgroundRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number,
    staleMs: number
  ): Promise<void> {
    if (this.inflight.has(key)) return;
    const p = (async () => {
      try {
        const fresh = await fetcher();
        const now = Date.now();
        this.store.set(key, {
          value: fresh,
          expiresAt: now + ttlMs,
          staleUntil: now + ttlMs + staleMs
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('InMemoryCache background refresh failed for key', key, error);
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, p);
  }
}

