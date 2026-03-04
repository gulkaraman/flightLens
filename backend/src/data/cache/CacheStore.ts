export interface SwrResult<T> {
  value: T;
  isStale: boolean;
  fromCache: boolean;
}

export interface CacheStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs: number, staleMs?: number): Promise<void>;
  del(key: string): Promise<void>;
  getOrSetSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number,
    staleMs: number
  ): Promise<SwrResult<T>>;
}

