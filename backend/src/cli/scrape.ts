import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config/loadConfig';
import { launchBrowser } from '../scraper/browser';
import { runSearch } from '../scraper/searchFlow';
import { applyDirectFilterAndParse } from '../scraper/resultsParser';
import type { SearchParams } from '../types';
import type { FlightResult } from '../scraper/types';

interface ScrapeOutput {
  runAtISO: string;
  params: SearchParams;
  results: FlightResult[];
}

async function main(): Promise<void> {
  const debug = process.env.DEBUG_SCRAPER === 'true';

  // Çalışma dizini backend kökü olacak şekilde varsayılıyor (npm run script'leri için doğal).
  const configPath = 'config/search.json';
  const params = loadConfig(configPath);

  const browser = await launchBrowser({ debug });
  const page = await browser.newPage();

  try {
    if (debug) {
      // eslint-disable-next-line no-console
      console.log('Starting search with params:', params);
    }

    await runSearch(page, params, debug);
    const results = await applyDirectFilterAndParse(page, params.directOnly ?? true);

    const payload: ScrapeOutput = {
      runAtISO: new Date().toISOString(),
      params,
      results
    };

    const dataDir = path.resolve(process.cwd(), 'data');
    fs.mkdirSync(dataDir, { recursive: true });

    const finalPath = path.join(dataDir, 'latest.json');
    const tmpPath = path.join(
      dataDir,
      `latest.${process.pid}.${Date.now()}.tmp.json`
    );

    fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
    fs.renameSync(tmpPath, finalPath);

    // eslint-disable-next-line no-console
    console.log(
      `Scrape completed. ${results.length} direct flights saved to ${path.relative(
        process.cwd(),
        finalPath
      )}`
    );
  } finally {
    await browser.close();
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Scrape CLI failed:', error);
  process.exitCode = 1;
});

