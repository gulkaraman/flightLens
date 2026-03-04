import type { FlightSearchQuery, FlightSearchResponse } from '../obiletScraper';
import { searchObiletFlights } from '../obiletScraper';
import { InMemoryCache } from './cache/InMemoryCache';
import type { CacheStore } from './cache/CacheStore';
import { globalWorkQueue } from './queue/WorkQueue';

interface FlightsHotKeyMeta {
  query: FlightSearchQuery;
  lastSeenAt: number;
  lastRefreshAt?: number;
}

const cache: CacheStore = new InMemoryCache();

const flightsHotKeys = new Map<string, FlightsHotKeyMeta>();

// TTL/SWR ayarları (ms)
const FLIGHTS_TTL_MS =
  Number(process.env.FLIGHTS_TTL_MS ?? '') || 3 * 60 * 1000; // 3 dakika
const FLIGHTS_STALE_MS =
  Number(process.env.FLIGHTS_STALE_MS ?? '') || 10 * 60 * 1000; // 10 dakika

const FLIGHTS_REFRESH_INTERVAL_MS =
  Number(process.env.FLIGHTS_REFRESH_INTERVAL_MS ?? '') || 60 * 1000; // 60sn

function flightsKey(q: FlightSearchQuery): string {
  return [
    q.from,
    q.to,
    q.departDate,
    q.returnDate ?? '',
    q.adults,
    q.cabin ?? '',
    q.currency ?? ''
  ].join('|');
}

export async function getFlights(query: FlightSearchQuery): Promise<FlightSearchResponse> {
  const key = flightsKey(query);
  const now = Date.now();

  const meta = flightsHotKeys.get(key) ?? { query, lastSeenAt: now };
  meta.query = query;
  meta.lastSeenAt = now;
  flightsHotKeys.set(key, meta);

  const swr = await cache.getOrSetSWR<FlightSearchResponse>(
    `flights:${key}`,
    () => globalWorkQueue.add(() => searchObiletFlights(query)),
    FLIGHTS_TTL_MS,
    FLIGHTS_STALE_MS
  );

  if (!swr.fromCache) {
    const metaUpdated = flightsHotKeys.get(key);
    if (metaUpdated) {
      metaUpdated.lastRefreshAt = Date.now();
      flightsHotKeys.set(key, metaUpdated);
    }
  }

  return swr.value;
}

export interface CacheSnapshot {
  domain: 'flights';
  totalKeys: number;
  hotKeys: Array<{
    key: string;
    lastSeenAt: number;
    lastRefreshAt?: number;
  }>;
}

export function getCacheSnapshot(): CacheSnapshot {
  const hotKeys: CacheSnapshot['hotKeys'] = [];
  for (const [key, meta] of flightsHotKeys.entries()) {
    hotKeys.push({
      key,
      lastSeenAt: meta.lastSeenAt,
      lastRefreshAt: meta.lastRefreshAt
    });
  }
  return {
    domain: 'flights',
    totalKeys: flightsHotKeys.size,
    hotKeys
  };
}

export async function refreshFlightsKey(key: string): Promise<void> {
  const meta = flightsHotKeys.get(key);
  if (!meta) return;
  const query = meta.query;
  const now = Date.now();
  const value = await globalWorkQueue.add(() => searchObiletFlights(query));
  await cache.set<FlightSearchResponse>(`flights:${key}`, value, FLIGHTS_TTL_MS, FLIGHTS_STALE_MS);
  flightsHotKeys.set(key, { ...meta, lastRefreshAt: now });
}

export async function refreshFlightsHotKeys(): Promise<void> {
  const now = Date.now();
  const keys = Array.from(flightsHotKeys.entries())
    .filter(([_, meta]) => now - meta.lastSeenAt <= FLIGHTS_STALE_MS)
    .map(([key]) => key);

  await Promise.all(keys.map((k) => refreshFlightsKey(k)));
}

let schedulersStarted = false;

export function startDataServiceSchedulers(): void {
  if (schedulersStarted) return;
  schedulersStarted = true;

  const interval = FLIGHTS_REFRESH_INTERVAL_MS;
  if (interval <= 0) return;

  const timer = setInterval(() => {
    void refreshFlightsHotKeys().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('DataService scheduled refresh failed:', error);
    });
  }, interval);

  // Uygulama kapanışını engellemesin diye:
  timer.unref?.();
}

