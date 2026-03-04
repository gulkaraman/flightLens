// Config yükleyici:
// - `backend/config/search.json` dosyasını okur
// - Zod ile doğrular ve type-safe `SearchParams` döndürür.
// Not: Config alanlarını değiştirirseniz README'deki config bölümünü de güncelleyin.

import fs from 'fs';
import path from 'path';
import { SearchParamsSchema } from './schema';
import type { SearchParams } from '../types';

export function normalizeCityInput(input: string): string {
  const trimmed = input.trim();
  const collapsedWhitespace = trimmed.replace(/\s+/g, ' ');
  return collapsedWhitespace;
}

export function validateDateLogic(params: SearchParams): void {
  if (params.tripType === 'roundTrip') {
    if (!params.returnDate) {
      throw new Error('returnDate is required for roundTrip searches');
    }

    if (params.returnDate < params.departDate) {
      throw new Error('returnDate must be on or after departDate for roundTrip searches');
    }
  }
}

export function loadConfig(relativeOrAbsolutePath: string): SearchParams {
  const resolvedPath = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(process.cwd(), relativeOrAbsolutePath);

  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  const json = JSON.parse(raw) as unknown;

  const normalizedBase =
    typeof json === 'object' && json !== null
      ? {
          ...(json as Record<string, unknown>),
          from: normalizeCityInput(String((json as any).from ?? '')),
          to: normalizeCityInput(String((json as any).to ?? ''))
        }
      : json;

  const parsed = SearchParamsSchema.parse(normalizedBase);
  validateDateLogic(parsed);
  return parsed;
}

