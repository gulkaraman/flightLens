export type ScrapeMode = 'auto' | 'live' | 'cache' | 'mock';

export const MODE_KEY = 'flightlens_scrape_mode';

export function getStoredScrapeMode(): ScrapeMode | null {
  if (typeof window === 'undefined') return null;
  const val = window.localStorage.getItem(MODE_KEY) as ScrapeMode | null;
  return val;
}

export function getEffectiveScrapeMode(): ScrapeMode {
  return getStoredScrapeMode() ?? 'live';
}

export function setScrapeMode(mode: ScrapeMode) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MODE_KEY, mode);
}

