import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import type { SearchParams } from './types';
import type { FlightResult } from './scraper/types';
import { getResultsWithFallback } from './fallback/getResults';

export interface FlightSearchQuery {
  from: string;
  to: string;
  departDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  adults: number;
  cabin?: string;
  currency?: string;
}

export interface FlightSearchResponse {
  query: FlightSearchQuery & { cabin?: string; currency?: string };
  fetchedAt: string; // ISO
  source: 'obilet';
  itineraries: Itinerary[];
}

export interface Itinerary {
  id: string;
  legs: Leg[];
  totalPrice: { amount: number; currency: string; rawText?: string };
  tags: string[];
}

export interface Leg {
  airline?: string;
  flightNumber?: string;
  from: { city?: string; airport?: string; code?: string };
  to: { city?: string; airport?: string; code?: string };
  departTime: string; // ISO
  arriveTime: string; // ISO
  durationMinutes?: number;
  stops: number;
  stopSummary?: string;
  cabin?: string;
  baggage?: string;
  price: { amount: number; currency: string; rawText?: string };
}

interface CacheEntry {
  response: FlightSearchResponse;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 3 * 60 * 1000;

export function parseTryAmount(priceText: string | undefined | null): number | null {
  if (!priceText) return null;
  const cleaned = priceText
    .replace(/[^\d.,]/g, '')
    .replace(/\s+/g, '')
    .trim();
  if (!cleaned) return null;

  // Türk Lirası formatı: 1.234,56 veya 1.234
  let normalized = cleaned;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma > lastDot) {
    // Virgülden sonrası ondalık, noktalar binlik ayraç
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // Noktadan sonrası ondalık, virgüller binlik
    normalized = cleaned.replace(/,/g, '');
  }

  const value = Number(normalized);
  if (Number.isNaN(value)) return null;
  return Math.round(value);
}

export function combineToISO(date: string, timeHHmm: string): string {
  const [hourStr, minuteStr] = timeHHmm.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    // Fallback: sadece tarih kullan
    return new Date(date).toISOString();
  }

  const d = new Date(Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    hour,
    minute,
    0,
  ));
  return d.toISOString();
}

export function ensureArrivalAfterDeparture(depISO: string, arrISO: string): string {
  const dep = new Date(depISO);
  const arr = new Date(arrISO);
  if (Number.isNaN(dep.getTime()) || Number.isNaN(arr.getTime())) {
    return arrISO;
  }
  if (arr > dep) return arrISO;
  const plusOneDay = new Date(arr.getTime());
  plusOneDay.setUTCDate(plusOneDay.getUTCDate() + 1);
  return plusOneDay.toISOString();
}

function buildCacheKey(q: FlightSearchQuery): string {
  return [
    q.from,
    q.to,
    q.departDate,
    q.returnDate ?? '',
    q.adults,
    q.cabin ?? '',
    q.currency ?? '',
  ].join('|');
}

function writeDebugArtifact(error: unknown, extraLines: string[] = []): void {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const baseDir = path.resolve(process.cwd(), 'debug', 'obilet', ts);
    fs.mkdirSync(baseDir, { recursive: true });

    const lines: string[] = [];
    lines.push(`[${new Date().toISOString()}] searchObiletFlights error`);
    if (error instanceof Error) {
      lines.push(`name=${error.name}`);
      lines.push(`message=${error.message}`);
      if (error.stack) lines.push(error.stack);
    } else {
      lines.push(`non-Error: ${String(error)}`);
    }
    if (extraLines.length) {
      lines.push('--- extra ---');
      lines.push(...extraLines);
    }

    fs.writeFileSync(path.join(baseDir, 'logs.txt'), lines.join('\n'), 'utf-8');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to write Obilet debug artifact:', e);
  }
}

function mapFlightResultToItinerary(
  fr: FlightResult,
  query: FlightSearchQuery,
  legTag: 'OUTBOUND' | 'RETURN' | undefined,
  baseDate: string,
): Itinerary {
  const departTimeText = fr.departTime;
  const arriveTimeText = fr.arriveTime ?? fr.departTime;

  const depISO = combineToISO(baseDate, departTimeText);
  const rawArrISO = combineToISO(baseDate, arriveTimeText);
  const arrISO = ensureArrivalAfterDeparture(depISO, rawArrISO);

  const isDirect =
    typeof fr.isDirect === 'boolean'
      ? fr.isDirect
      : fr.stopsCount != null
        ? fr.stopsCount === 0
        : undefined;

  let stops: number;
  if (isDirect === true) {
    stops = 0;
  } else if (isDirect === false) {
    stops = fr.stopsCount ?? 1;
  } else {
    stops = fr.stopsCount ?? 0;
  }

  const stopSummaryParts: string[] = [];
  if (fr.stopLabel) stopSummaryParts.push(fr.stopLabel);
  if (fr.stopoverCode) stopSummaryParts.push(fr.stopoverCode);
  const stopSummary = stopSummaryParts.length ? stopSummaryParts.join(' • ') : undefined;

  const amountFromTry = fr.priceTry ?? parseTryAmount(fr.priceText);
  const amount = amountFromTry ?? 0;
  const currency = query.currency ?? 'TRY';

  const price = {
    amount,
    currency,
    rawText: fr.priceText,
  };

  const fromCode = fr.departAirportCode ?? query.from;
  const toCode = fr.arriveAirportCode ?? query.to;

  const leg: Leg = {
    airline: fr.airline,
    from: {
      city: undefined,
      airport: fr.departAirportName,
      code: fromCode,
    },
    to: {
      city: undefined,
      airport: fr.arriveAirportName,
      code: toCode,
    },
    departTime: depISO,
    arriveTime: arrISO,
    durationMinutes: fr.durationMin,
    stops,
    stopSummary,
    cabin: query.cabin,
    baggage: undefined,
    price,
  };

  const tags: string[] = [];
  if (stops === 0) tags.push('DIRECT');
  else if (stops === 1) tags.push('1_STOP');
  else if (stops >= 2) tags.push(`${stops}_STOPS`);
  if (legTag === 'OUTBOUND') tags.push('OUTBOUND');
  if (legTag === 'RETURN') tags.push('RETURN');

  const idSource = [
    fr.airline ?? '',
    fromCode ?? '',
    toCode ?? '',
    depISO,
    arrISO,
    String(price.amount),
  ].join('|');
  const id = createHash('sha1').update(idSource).digest('hex').slice(0, 16);

  return {
    id,
    legs: [leg],
    totalPrice: price,
    tags,
  };
}

export async function searchObiletFlights(
  query: FlightSearchQuery,
): Promise<FlightSearchResponse> {
  const cacheKey = buildCacheKey(query);
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.response;
  }

  // Network-first JSON yakalama için mevcut pipeline'da Page nesnesine
  // doğrudan erişim yok. Bu nedenle şimdilik mevcut DOM/scraper
  // pipeline'ına dayalı fallback yolunu kullanıyoruz.

  const itineraries: Itinerary[] = [];

  const baseParams: SearchParams = {
    tripType: query.returnDate ? 'roundTrip' : 'oneWay',
    from: query.from,
    to: query.to,
    departDate: query.departDate,
    returnDate: query.returnDate,
    passengers: {
      adults: query.adults,
      children: 0,
    },
    directOnly: false,
  };

  try {
    if (query.returnDate) {
      // Öncelik: mevcut pipeline roundTrip için outbound+return döndürüyorsa onu kullan.
      const roundTripResult = await getResultsWithFallback(baseParams);
      const roundTripFlights = roundTripResult.results;

      const hasLegInfo = roundTripFlights.some((r) => r.leg === 'return');

      if (hasLegInfo) {
        const outboundFlights = roundTripFlights.filter(
          (r) => !r.leg || r.leg === 'outbound',
        );
        const returnFlights = roundTripFlights.filter((r) => r.leg === 'return');

        outboundFlights.forEach((fr) => {
          itineraries.push(
            mapFlightResultToItinerary(fr, query, 'OUTBOUND', query.departDate),
          );
        });
        returnFlights.forEach((fr) => {
          itineraries.push(
            mapFlightResultToItinerary(fr, query, 'RETURN', query.returnDate!),
          );
        });
      } else {
        // Pipeline yalnız tek yön döndürüyor gibi görünüyor: iki ayrı çağrı yap.
        const outboundParams: SearchParams = {
          ...baseParams,
          tripType: 'oneWay',
          returnDate: undefined,
        };
        const returnParams: SearchParams = {
          ...baseParams,
          tripType: 'oneWay',
          from: query.to,
          to: query.from,
          departDate: query.returnDate,
          returnDate: undefined,
        };

        const [outboundRes, returnRes] = await Promise.all([
          getResultsWithFallback(outboundParams),
          getResultsWithFallback(returnParams),
        ]);

        outboundRes.results.forEach((fr) => {
          itineraries.push(
            mapFlightResultToItinerary(fr, query, 'OUTBOUND', query.departDate),
          );
        });
        returnRes.results.forEach((fr) => {
          itineraries.push(
            mapFlightResultToItinerary(fr, query, 'RETURN', query.returnDate!),
          );
        });
      }
    } else {
      // Tek yön
      const { results } = await getResultsWithFallback(baseParams);
      results.forEach((fr) => {
        itineraries.push(
          mapFlightResultToItinerary(fr, query, 'OUTBOUND', query.departDate),
        );
      });
    }
  } catch (error) {
    writeDebugArtifact(error);
    throw error;
  }

  const response: FlightSearchResponse = {
    query,
    fetchedAt: new Date().toISOString(),
    source: 'obilet',
    itineraries,
  };

  cache.set(cacheKey, {
    response,
    expiresAt: now + TTL_MS,
  });

  return response;
}

