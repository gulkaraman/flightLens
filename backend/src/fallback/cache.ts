import fs from 'fs';
import path from 'path';
import type { SearchParams } from '../types';
import type { FlightResult } from '../scraper/types';

export interface CachePayload {
  runAtISO: string;
  params: SearchParams;
  results: FlightResult[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const LATEST_PATH = path.join(DATA_DIR, 'latest.json');

export function readLatestFromCache(): { payload: CachePayload; ageHours: number } | null {
  if (!fs.existsSync(LATEST_PATH)) return null;

  try {
    const raw = fs.readFileSync(LATEST_PATH, 'utf-8');
    const payload = JSON.parse(raw) as CachePayload;
    const runAt = new Date(payload.runAtISO);
    const now = new Date();
    const ageMs = now.getTime() - runAt.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    return { payload, ageHours };
  } catch {
    return null;
  }
}

export function writeLatestToCache(payload: CachePayload): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const tmpPath = path.join(
    DATA_DIR,
    `latest.${process.pid}.${Date.now()}.tmp.json`
  );

  fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
  fs.renameSync(tmpPath, LATEST_PATH);
}

