import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config/loadConfig';
import { getResultsWithFallback } from '../fallback/getResults';
import type { SearchParams } from '../types';
import type { FlightResult } from '../scraper/types';
import type { SearchMeta } from '../fallback/getResults';

interface ScrapeOutput {
  runAtISO: string;
  params: SearchParams;
  meta: Pick<SearchMeta, 'source' | 'warnings' | 'noResults' | 'directOnlyRequested'>;
  results: FlightResult[];
}

async function main(): Promise<void> {
  const debug = process.env.DEBUG_SCRAPER === 'true';

  const configPath = 'config/search.json';
  const params = loadConfig(configPath);

  if (debug) {
    // eslint-disable-next-line no-console
    console.log('Starting scrape CLI with params:', params);
  }

  const { meta, results } = await getResultsWithFallback(params, 'auto');

  const payload: ScrapeOutput = {
    runAtISO: meta.runAtISO,
    params,
    meta: {
      source: meta.source,
      warnings: meta.warnings,
      noResults: meta.noResults,
      directOnlyRequested: meta.directOnlyRequested
    },
    results
  };

  const dataDir = path.resolve(process.cwd(), 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  const finalPath = path.join(dataDir, 'latest.json');
  const tmpPath = path.join(dataDir, `latest.${process.pid}.${Date.now()}.tmp.json`);

  fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
  fs.renameSync(tmpPath, finalPath);

  // eslint-disable-next-line no-console
  console.log(
    `Scrape CLI finished with source=${meta.source}, results=${results.length}, saved to ${path.relative(
      process.cwd(),
      finalPath
    )}`
  );
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Scrape CLI encountered an unexpected error:', error);
  // Amaç: workflow'u olabildiğince fail ettirmemek; yine de boş bir latest.json yazmayı dene.
  try {
    const fallbackParamsPath = 'config/search.json';
    const params = loadConfig(fallbackParamsPath);
    const dataDir = path.resolve(process.cwd(), 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    const finalPath = path.join(dataDir, 'latest.json');
    const tmpPath = path.join(
      dataDir,
      `latest.${process.pid}.${Date.now()}.tmp.json`
    );
    const payload: ScrapeOutput = {
      runAtISO: new Date().toISOString(),
      params,
      meta: {
        source: 'mock',
        warnings: ['CLI_UNEXPECTED_ERROR_FALLBACK'],
        noResults: true,
        directOnlyRequested: params.directOnly ?? false
      },
      results: []
    };
    fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
    fs.renameSync(tmpPath, finalPath);
    // eslint-disable-next-line no-console
    console.log(
      'Wrote fallback latest.json after unexpected error; keeping exit code 0 to avoid failing workflow.'
    );
  } catch (innerError) {
    // eslint-disable-next-line no-console
    console.error('Also failed to write fallback latest.json:', innerError);
  }
  // Exit code 0 bırakarak GitHub Actions scraper job'unun kırılmasını engelliyoruz.
  process.exitCode = 0;
});

