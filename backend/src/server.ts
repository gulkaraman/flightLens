import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { SearchParamsSchema } from './config/schema';
import type { SearchParams } from './types';
import type { FlightResult } from './scraper/types';
import { readLatestFromCache, writeLatestToCache, type CachePayload } from './fallback/cache';
import { getResultsWithFallback, type SearchMeta } from './fallback/getResults';
import { searchObiletFlights, type FlightSearchQuery } from './obiletScraper';
import {
  getFlights,
  getCacheSnapshot,
  refreshFlightsHotKeys,
  refreshFlightsKey,
  startDataServiceSchedulers
} from './data/DataService';

function resolveMode(req: Request): string | undefined {
  const header = req.header('x-scrape-mode');
  if (header && typeof header === 'string') {
    return header;
  }
  const qp = req.query.mode;
  if (typeof qp === 'string') {
    return qp;
  }
  return undefined;
}

const app = express();
const port = Number(process.env.PORT) || 4000;

const corsOrigin =
  process.env.FRONTEND_ORIGIN && process.env.FRONTEND_ORIGIN.length > 0
    ? process.env.FRONTEND_ORIGIN.split(',').map((s) => s.trim())
    : [/^http:\/\/localhost:\d+$/];

app.use(
  cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-scrape-mode']
  })
);
app.use(express.json());

// Basit global error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get('/api/latest', (req: Request, res: Response) => {
  const cached = readLatestFromCache();
  if (!cached) {
    return res.status(404).json({
      ok: false,
      code: 'NO_CACHE',
      message: 'No latest scrape found. Run scraping first (CLI or /api/search).'
    });
  }

  const meta: SearchMeta = {
    runAtISO: cached.payload.runAtISO,
    source: 'cache',
    directOnlyRequested: cached.payload.params.directOnly ?? false
  };

  return res.json({
    ok: true,
    meta,
    results: cached.payload.results,
    runAtISO: meta.runAtISO,
    params: cached.payload.params
  });
});

async function handleSearch(req: Request, res: Response): Promise<Response> {
  const parseResult = SearchParamsSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'Invalid search parameters',
      details: parseResult.error.issues
    });
  }

  const params = parseResult.data;
  try {
    const mode = resolveMode(req);
    const { meta, results } = await getResultsWithFallback(params, mode);
    // AUTO/CACHE/MOCK modlarında buraya kadar gelmişsek ok:true garantisi var.
    // LIVE modunda getResultsWithFallback hata fırlatırsa catch bloğunda ok:false döneriz.

    const payload: CachePayload = {
      runAtISO: meta.runAtISO,
      params,
      results
    };
    writeLatestToCache(payload);

    return res.json({
      ok: true,
      meta,
      results,
      runAtISO: meta.runAtISO,
      params
    });
  } catch (error) {
    const err = error as Error & { code?: string };
    const message = err.message ?? 'Unknown error';
    const code = err.code ?? 'UPSTREAM_ERROR';
    // eslint-disable-next-line no-console
    console.error('Live search failed:', error);
    return res.status(502).json({
      ok: false,
      code,
      message
    });
  }
}

app.post('/api/search', (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  handleSearch(req, res);
});

app.post('/api/search/run', (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  handleSearch(req, res);
});

app.post('/api/capture', async (req: Request, res: Response) => {
  const parseResult = SearchParamsSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'Invalid search parameters',
      details: parseResult.error.issues
    });
  }

  const params = parseResult.data;
  const mode = (resolveMode(req) ?? 'live').toLowerCase();
  if (mode !== 'live') {
    // Capture her zaman live denemek için tasarlandı.
    // Diğer modlar için de çalışsın istiyorsak buraya genişletebiliriz.
  }

  // Basit capture: fallback motoru üzerinden live deneyip, başarısız olursa error döneriz.
  try {
    const { meta, results } = await getResultsWithFallback(params, 'live');
    const dataDir = path.resolve(process.cwd(), 'fixtures');
    fs.mkdirSync(dataDir, { recursive: true });
    const ts = meta.runAtISO.replace(/[:.]/g, '-');
    const safeFrom = params.from.replace(/\\s+/g, '_');
    const safeTo = params.to.replace(/\\s+/g, '_');
    const htmlPath = path.join(dataDir, `capture_${ts}_${safeFrom}_${safeTo}.json`);

    const payload: CachePayload = {
      runAtISO: meta.runAtISO,
      params,
      results: results as FlightResult[]
    };
    fs.writeFileSync(htmlPath, JSON.stringify(payload, null, 2), 'utf-8');

    return res.json({
      ok: true,
      savedHtml: path.relative(process.cwd(), htmlPath),
      note: 'Capture completed'
    });
  } catch (error) {
    const message = (error as Error).message ?? 'Unknown error';
    return res.status(502).json({
      ok: false,
      code: 'CAPTURE_FAILED',
      message
    });
  }
});

app.get('/api/flights/search', async (req: Request, res: Response) => {
  const { from, to, departDate, returnDate, adults, cabin, currency } = req.query;

  if (typeof from !== 'string' || from.trim().length === 0) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: '`from` parametresi zorunludur'
      }
    });
  }

  if (typeof to !== 'string' || to.trim().length === 0) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: '`to` parametresi zorunludur'
      }
    });
  }

  if (typeof departDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(departDate)) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: '`departDate` YYYY-MM-DD formatında zorunludur'
      }
    });
  }

  let adultsNumber = 1;
  if (typeof adults === 'string') {
    const parsed = Number(adults);
    if (!Number.isNaN(parsed) && parsed > 0) {
      adultsNumber = Math.floor(parsed);
    }
  }

  const q: FlightSearchQuery = {
    from: from.trim(),
    to: to.trim(),
    departDate,
    returnDate: typeof returnDate === 'string' && returnDate.length > 0 ? returnDate : undefined,
    adults: adultsNumber,
    cabin: typeof cabin === 'string' && cabin.length > 0 ? cabin : undefined,
    currency: typeof currency === 'string' && currency.length > 0 ? currency : undefined
  };

  try {
    const data = await getFlights(q);
    return res.json(data);
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : 'Unexpected error';
    // eslint-disable-next-line no-console
    console.error('GET /api/flights/search failed:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message
      }
    });
  }
});

function ensureAdmin(req: Request, res: Response): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    res.status(503).json({
      error: {
        code: 'ADMIN_DISABLED',
        message: 'ADMIN_TOKEN is not configured on the server.'
      }
    });
    return false;
  }

  const header = req.header('x-admin-token');
  if (!header || header !== expected) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid admin token'
      }
    });
    return false;
  }

  return true;
}

app.get('/api/admin/cache', (req: Request, res: Response) => {
  if (!ensureAdmin(req, res)) return;
  const flights = getCacheSnapshot();
  res.json({ flights });
});

app.post('/api/admin/refresh', async (req: Request, res: Response) => {
  if (!ensureAdmin(req, res)) return;

  const { domain, key, hotKeys } = req.body as {
    domain?: string;
    key?: string;
    hotKeys?: boolean;
  };

  if (domain !== 'flights') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Unsupported domain; currently only "flights" is supported'
      }
    });
  }

  try {
    if (key) {
      await refreshFlightsKey(key);
    } else if (hotKeys) {
      await refreshFlightsHotKeys();
    } else {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Either "key" or "hotKeys" must be provided'
        }
      });
    }

    return res.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : 'Unexpected error';
    // eslint-disable-next-line no-console
    console.error('POST /api/admin/refresh failed:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message
      }
    });
  }
});

app.use(errorHandler);

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled promise rejection:', reason);
});

app.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
  startDataServiceSchedulers();
});

