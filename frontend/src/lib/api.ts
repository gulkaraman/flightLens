import type { SearchParams, SearchResponse } from './types';
import { getEffectiveScrapeMode } from './scrapeMode';

const rawBase = import.meta.env.VITE_API_BASE_URL?.trim();
export const API_BASE = rawBase ? rawBase.replace(/\/+$/, '') : '';

export interface ApiError extends Error {
  status?: number;
  code?: string;
}

export interface SafeFetchResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: ApiError;
}

export async function safeFetch<T>(path: string, init?: RequestInit): Promise<SafeFetchResult<T>> {
  // Prod ortamında API base URL zorunluluğu:
  // Eğer hostname localhost/127.0.0.1/::1 değilse ve API_BASE boşsa, fetch denemeden net hata döndür.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalhost =
      host === 'localhost' || host === '127.0.0.1' || host === '::1';
    if (!isLocalhost && !API_BASE) {
      const apiErr: ApiError = new Error(
        'API adresi ayarlanmamış (VITE_API_BASE_URL).'
      ) as ApiError;
      apiErr.status = 0;
      apiErr.code = 'MISSING_API_BASE_URL';
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error(
          '[API] Missing VITE_API_BASE_URL in non-localhost environment; aborting fetch.'
        );
      }
      return { ok: false, status: 0, error: apiErr };
    }
  }

  const mode = getEffectiveScrapeMode();
  const url = `${API_BASE}${path}`;
  const requestInit: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(mode ? { 'x-scrape-mode': mode } : {}),
      ...(init?.headers ?? {})
    },
    ...init
  };

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[API] Request:', {
      url,
      method: requestInit.method ?? 'GET',
      body: requestInit.body
    });
  }

  let res: Response;
  try {
    res = await fetch(url, requestInit);
  } catch (error) {
    const err = error as Error;
    const apiErr: ApiError = new Error(
      "API'ye ulaşılamadı (backend çalışıyor mu?)"
    ) as ApiError;
    apiErr.status = 0;
    apiErr.code = 'NETWORK_ERROR';

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[API] Fetch failed:', {
        url,
        method: requestInit.method ?? 'GET',
        errorName: err.name,
        errorMessage: err.message
      });
    }

    return { ok: false, status: 0, error: apiErr };
  }

  const status = res.status;

  if (!res.ok) {
    const err: ApiError = new Error() as ApiError;
    err.status = status;
    let message = `İstek başarısız oldu (HTTP ${status})`;

    try {
      const body = (await res.json()) as { error?: string; message?: string; code?: string };
      if (body.error || body.message) {
        message = `${body.error ?? ''} ${body.message ?? ''}`.trim();
      }
      if (body.code) {
        err.code = body.code;
      }
    } catch {
      // body parse edilemezse default mesajı kullan
    }

    err.message = message;

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[API] HTTP error:', {
        url,
        status,
        message: err.message
      });
    }

    return { ok: false, status, error: err };
  }

  const data = (await res.json()) as T;
  return { ok: true, status, data };
}

export async function apiHealth(): Promise<{ ok: boolean }> {
  const res = await safeFetch<{ ok: boolean }>('/api/health');
  if (!res.ok || !res.data) {
    throw res.error ?? new Error('Sağlık kontrolü başarısız.');
  }
  return res.data;
}

export async function apiSearch(params: SearchParams): Promise<SearchResponse> {
  const res = await safeFetch<SearchResponse & { ok: boolean }>('/api/search', {
    method: 'POST',
    body: JSON.stringify(params)
  });
  if (!res.ok || !res.data) {
    throw res.error ?? new Error('Arama isteği başarısız.');
  }
  const body = res.data as SearchResponse & { ok: boolean; code?: string; message?: string };
  if (body.ok === false) {
    const err: ApiError = new Error(body.message ?? 'Arama isteği başarısız.') as ApiError;
    err.code = body.code;
    err.status = res.status;
    throw err;
  }
  // ok:true durumda ok alanını atıp yalnızca SearchResponse döndürüyoruz
  const { ok: _ok, ...rest } = body;
  return rest;
}

export async function apiLatest(): Promise<SearchResponse> {
  const res = await safeFetch<SearchResponse & { ok: boolean }>('/api/latest');
  if (!res.ok || !res.data) {
    throw res.error ?? new Error('Son arama getirilemedi.');
  }
  const body = res.data as SearchResponse & { ok: boolean; code?: string; message?: string };
  if (body.ok === false) {
    const err: ApiError = new Error(body.message ?? 'Son arama getirilemedi.') as ApiError;
    err.code = body.code;
    err.status = res.status;
    throw err;
  }
  const { ok: _ok, ...rest } = body;
  return rest;
}

