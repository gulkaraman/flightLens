import { launchBrowser } from '../scraper/browser';
import { runSearch } from '../scraper/searchFlow';
import { applyDirectFilterAndParse, parseFlightsFromHtml, NoResultsError } from '../scraper/resultsParser';
import type { SearchParams } from '../types';
import type { FlightResult } from '../scraper/types';
import { generateMockFlights } from './mock';
import { readLatestFromCache, writeLatestToCache, type CachePayload } from './cache';

export type DataSource = 'live' | 'cache' | 'mock';

export interface SearchMeta {
  runAtISO: string;
  source: DataSource;
  directOnlyRequested: boolean;
  directOnlyAppliedByUI?: boolean;
  warnings?: string[];
  noResults?: boolean;
}

interface LiveResult {
  ok: boolean;
  code?: string;
  message?: string;
  payload?: CachePayload;
  noResults?: boolean;
}

async function runLiveScrape(params: SearchParams): Promise<LiveResult> {
  const debug = process.env.DEBUG_SCRAPER === 'true';

  try {
    const browser = await launchBrowser({ debug });
    const page = await browser.newPage();

    let allResults: FlightResult[] = [];

    try {
      // Gidiş araması
      await runSearch(page, params, debug);
      try {
        let outbound = await applyDirectFilterAndParse(page, params.directOnly ?? false);
        outbound = outbound.map((r) => ({ ...r, leg: 'outbound' as const }));
        allResults = allResults.concat(outbound);
      } catch (primaryError) {
          if (primaryError instanceof NoResultsError) {
            throw primaryError;
          }
        // eslint-disable-next-line no-console
        console.warn(
          'Live scrape primary parsing failed for outbound, falling back to HTML-only parser:',
          (primaryError as Error).message
        );
        const html = await page.content();
        let outbound = parseFlightsFromHtml(html, false);
        outbound = outbound.map((r) => ({ ...r, leg: 'outbound' as const }));
        allResults = allResults.concat(outbound);
      }

      // RoundTrip ise ve returnDate varsa ters yönde ikinci bir arama dene
      if (params.tripType === 'roundTrip' && params.returnDate) {
        const returnParams: SearchParams = {
          ...params,
          tripType: 'oneWay',
          from: params.to,
          to: params.from,
          departDate: params.returnDate
        };

        try {
          await runSearch(page, returnParams, debug);
          let ret = await applyDirectFilterAndParse(page, returnParams.directOnly ?? false);
          ret = ret.map((r) => ({ ...r, leg: 'return' as const }));
          allResults = allResults.concat(ret);
        } catch (secondaryError) {
          // eslint-disable-next-line no-console
          console.warn(
            'Live scrape return search failed, falling back to mock return flights:',
            (secondaryError as Error).message
          );
          const mockReturn = generateMockFlights(returnParams, 5).map((r) => ({
            ...r,
            leg: 'return' as const
          }));
          allResults = allResults.concat(mockReturn);
        }
      }
    } finally {
      await browser.close();
    }

    const payload: CachePayload = {
      runAtISO: new Date().toISOString(),
      params,
      results: allResults
    };

    return { ok: true, payload };
  } catch (error) {
    if (error instanceof NoResultsError) {
      const payload: CachePayload = {
        runAtISO: new Date().toISOString(),
        params,
        results: []
      };
      return { ok: true, payload, noResults: true };
    }

    const message = (error as Error).message ?? 'Unknown error';
    let code = 'LIVE_FAILED';
    if (message.includes('PARSE_FAILED_NO_CARDS')) {
      code = 'PARSE_FAILED_NO_CARDS';
    } else if (message.includes('timeout')) {
      code = 'UPSTREAM_TIMEOUT';
    }
    return { ok: false, code, message };
  }
}

export async function getResultsWithFallback(
  params: SearchParams,
  modeOverride?: string
): Promise<{ meta: SearchMeta; results: FlightResult[] }> {
  const modeRaw = modeOverride ?? process.env.SCRAPE_MODE ?? 'auto';
  const mode = modeRaw.toLowerCase() as 'live' | 'cache' | 'mock' | 'auto';
  const maxAge = Number(process.env.CACHE_MAX_AGE_HOURS ?? '168');
  const directOnlyRequested = params.directOnly ?? false;

  if (mode === 'mock') {
    const results = generateMockFlights(params);
    const meta: SearchMeta = {
      runAtISO: new Date().toISOString(),
      source: 'mock',
      directOnlyRequested
    };
    return { meta, results };
  }

  if (mode === 'cache') {
    const cached = readLatestFromCache();
    if (cached) {
      const cacheWantsDirectOnly = cached.payload.params.directOnly === true;
      const requestWantsMixed = directOnlyRequested === false;
      if (requestWantsMixed && cacheWantsDirectOnly) {
        const results = generateMockFlights(params);
        const meta: SearchMeta = {
          runAtISO: new Date().toISOString(),
          source: 'mock',
          directOnlyRequested,
          warnings: ['CACHE_DIRECT_ONLY_SKIPPED_MIXED_REQUEST']
        };
        return { meta, results };
      }
      const warnings: string[] = [];
      if (cached.ageHours > maxAge) warnings.push('CACHE_STALE');
      const meta: SearchMeta = {
        runAtISO: cached.payload.runAtISO,
        source: 'cache',
        directOnlyRequested,
        warnings: warnings.length ? warnings : undefined
      };
      return { meta, results: cached.payload.results };
    }
    const results = generateMockFlights(params);
    const meta: SearchMeta = {
      runAtISO: new Date().toISOString(),
      source: 'mock',
      directOnlyRequested,
      warnings: ['FALLBACK_TO_MOCK_NO_CACHE']
    };
    return { meta, results };
  }

  if (mode === 'live') {
    const live = await runLiveScrape(params);
    if (!live.ok || !live.payload) {
      const err = new Error(live.message ?? 'Live scrape failed') as Error & {
        code?: string;
      };
      if (live.code) {
        err.code = live.code;
      }
      throw err;
    }
    writeLatestToCache(live.payload);
    const meta: SearchMeta = {
      runAtISO: live.payload.runAtISO,
      source: 'live',
      directOnlyRequested,
      noResults: live.payload.results.length === 0 ? true : undefined
    };
    return { meta, results: live.payload.results };
  }

  // auto mode
  const warnings: string[] = [];
  const live = await runLiveScrape(params);
  if (live.ok && live.payload) {
    writeLatestToCache(live.payload);
    const meta: SearchMeta = {
      runAtISO: live.payload.runAtISO,
      source: 'live',
      directOnlyRequested,
      noResults: live.payload.results.length === 0 ? true : undefined
    };
    return { meta, results: live.payload.results };
  }

  if (!live.ok && live.code) {
    warnings.push(`LIVE_FAILED_${live.code}`);
  }

  const cached = readLatestFromCache();
  if (cached) {
    const cacheWantsDirectOnly = cached.payload.params.directOnly === true;
    const requestWantsMixed = directOnlyRequested === false;
    if (requestWantsMixed && cacheWantsDirectOnly) {
      const results = generateMockFlights(params);
      warnings.push('FALLBACK_TO_MOCK_CACHE_WAS_DIRECT_ONLY');
      const meta: SearchMeta = {
        runAtISO: new Date().toISOString(),
        source: 'mock',
        directOnlyRequested,
        warnings
      };
      return { meta, results };
    }
    if (cached.ageHours > maxAge) warnings.push('CACHE_STALE');
    const meta: SearchMeta = {
      runAtISO: cached.payload.runAtISO,
      source: 'cache',
      directOnlyRequested,
      warnings: warnings.length ? warnings : undefined
    };
    return { meta, results: cached.payload.results };
  }

  const results = generateMockFlights(params);
  warnings.push('FALLBACK_TO_MOCK_NO_CACHE');
  const meta: SearchMeta = {
    runAtISO: new Date().toISOString(),
    source: 'mock',
    directOnlyRequested,
    warnings
  };
  return { meta, results };
}

